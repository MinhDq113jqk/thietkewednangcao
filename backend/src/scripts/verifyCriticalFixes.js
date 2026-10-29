const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Runs exclusively inside verify:db's owned disposable database.
async function verifyCriticalFixes({ client, baseUrl, jwtSecret, passed }) {
  assert.match((await client.query('SELECT current_database() AS name')).rows[0].name, /^souvenirshop_verify_[a-z0-9_]+$/);
  const request = async (route, { token, cookie, body, method = 'GET', status = 200 } = {}) => {
    const response = await fetch(`${baseUrl}/api/${route}`, {
      method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(cookie ? { Cookie: cookie } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000),
    });
    assert.equal(response.status, status, `${method} ${route}`);
    return { data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0],
      cleared: /Max-Age=0/.test(response.headers.get('set-cookie') || '') };
  };
  const tokenFor = (id) => jwt.sign({ id }, jwtSecret, { expiresIn: '10m' });
  const waitBlocked = async (id, count = 1) => {
    const deadline = Date.now() + 3500;
    while (Date.now() < deadline) {
      await client.query('SELECT pg_stat_clear_snapshot()');
      const result = await client.query("SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND wait_event_type='Lock'");
      if (result.rows[0].n >= count) return;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw new Error(`Expected ${count} concurrent database locks were not reached for fixture ${id}`);
  };
  // A disposable trigger pauses the first writer while it holds the real row lock.
  const gatedWrite = async (table, id, first, second) => {
    assert.ok(['users', 'orders'].includes(table));
    assert.match(id, /^[a-f0-9-]{36}$/);
    const key = crypto.randomInt(100000, 2000000000);
    await client.query(`CREATE FUNCTION critical_write_gate() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.id='${id}'::uuid THEN PERFORM pg_advisory_xact_lock(${key}); END IF; RETURN NEW; END $$;
      CREATE TRIGGER critical_write_gate BEFORE UPDATE ON ${table} FOR EACH ROW EXECUTE FUNCTION critical_write_gate()`);
    let a; let b;
    await client.query('SELECT pg_advisory_lock($1)', [key]);
    try {
      try {
        a = first(); a.catch(() => {});
        await waitBlocked(id);
        b = second(); b.catch(() => {});
        await waitBlocked(id, 2);
      } finally { await client.query('SELECT pg_advisory_unlock($1)', [key]); }
      return await Promise.all([a, b]);
    } finally {
      await Promise.allSettled([a, b].filter(Boolean));
      await client.query(`DROP TRIGGER critical_write_gate ON ${table}; DROP FUNCTION critical_write_gate()`);
    }
  };

  const buyer = crypto.randomUUID(); const seller = crypto.randomUUID(); const admin = crypto.randomUUID();
  const shop = crypto.randomUUID(); const product = crypto.randomUUID();
  for (const [id, role] of [[buyer, 'buyer'], [seller, 'seller'], [admin, 'admin']]) {
    await client.query('INSERT INTO users (id,name,email,password,role) VALUES ($1,$2,$3,$4,$5)', [id, 'Critical fixture', `${id}@example.test`, 'not-a-login-hash', role]);
  }
  await client.query('INSERT INTO shops (id,"ownerId",name,slug,status) VALUES ($1,$2,$3,$4,$5)', [shop, seller, 'Critical fixture', `critical-${shop}`, 'active']);
  await client.query('INSERT INTO products (id,"shopId",name,price,stock,sold,category) VALUES ($1,$2,$3,100000,9,1,$4)', [product, shop, 'Critical product', 'Gốm sứ']);
  const newOrder = async (status) => {
    const id = crypto.randomUUID();
    await client.query('UPDATE products SET stock=9,sold=1 WHERE id=$1', [product]);
    await client.query('INSERT INTO orders (id,"buyerId","shopId",total,status,"paymentMethod","paymentStatus","trackingHistory") VALUES ($1,$2,$3,100000,$4,$5,$6,$7)', [id, buyer, shop, status, 'cod', 'unpaid', JSON.stringify([{ status }])]);
    await client.query('INSERT INTO order_items ("orderId","productId",name,price,quantity) VALUES ($1,$2,$3,100000,1)', [id, product, 'Critical product']);
    await require('./fixtureInventory')(client, id);
    return id;
  };
  const orderRow = async (id) => (await client.query('SELECT status,"trackingHistory" FROM orders WHERE id=$1', [id])).rows[0];
  const stock = async () => (await client.query('SELECT stock,sold FROM products WHERE id=$1', [product])).rows[0];
  for (const [action, initial] of [['confirm', 'pending'], ['pack', 'pending'], ['ship', 'confirmed']]) {
    const id = await newOrder(initial);
    const cancel = (status = 200) => request(action === 'ship' ? `admin/orders/${id}/status` : `orders/${id}/cancel`, {
      method: 'PUT', token: tokenFor(action === 'ship' ? admin : buyer), body: { status: 'cancelled' }, status,
    });
    const advance = (status) => request(`seller/orders/${id}/${action}`, { method: 'PUT', token: tokenFor(seller),
      body: { carrier: 'Fixture', trackingCode: 'FIXTURE', currentLocation: 'Warehouse' }, status });
    // Cancellation owns the order lock but is paused on inventory; the seller must reread after it commits.
    await client.query('BEGIN');
    await client.query('SELECT id FROM products WHERE id=$1 FOR UPDATE', [product]);
    let cancelling; let advancing;
    try {
      cancelling = cancel(); cancelling.catch(() => {});
      await waitBlocked(product);
      advancing = advance(400); advancing.catch(() => {});
      await waitBlocked(id, 2);
    } finally { await client.query('COMMIT'); }
    await Promise.all([cancelling, advancing]);
    assert.equal((await orderRow(id)).status, 'cancelled');
    assert.deepEqual(await stock(), { stock: 10, sold: 0 });
    await cancel(409);
    assert.deepEqual(await stock(), { stock: 10, sold: 0 });

    const next = await newOrder(initial);
    await gatedWrite('orders', next,
      () => request(`seller/orders/${next}/${action}`, { method: 'PUT', token: tokenFor(seller), body: { carrier: 'Fixture', trackingCode: 'FIXTURE', currentLocation: 'Warehouse' } }),
      () => request(action === 'ship' ? `admin/orders/${next}/status` : `orders/${next}/cancel`, { method: 'PUT', token: tokenFor(action === 'ship' ? admin : buyer), body: { status: 'cancelled' }, status: 409 }));
    assert.equal((await orderRow(next)).status, { confirm: 'confirmed', pack: 'packing', ship: 'shipping' }[action]);
    assert.deepEqual(await stock(), { stock: 9, sold: 1 });
  }
  passed('Cancel versus confirm/pack/ship is serialized in both directions; stock restores only once');
  const tracking = await newOrder('shipping');
  await gatedWrite('orders', tracking,
    () => request(`seller/orders/${tracking}/tracking`, { method: 'PUT', token: tokenFor(seller), body: { currentLocation: 'Transit' } }),
    () => request(`seller/orders/${tracking}/deliver`, { method: 'PUT', token: tokenFor(seller), body: { currentLocation: 'Recipient' } }));
  const delivered = await orderRow(tracking);
  assert.equal(delivered.status, 'delivered');
  assert.deepEqual(delivered.trackingHistory.map((event) => event.status), ['shipping', 'shipping', 'delivered']);
  await request(`seller/orders/${tracking}/tracking`, { method: 'PUT', token: tokenFor(seller), body: { currentLocation: 'Stale transit' }, status: 400 });
  const payment = (await client.query('SELECT status FROM payment_transactions WHERE "orderId"=$1', [tracking])).rows;
  assert.deepEqual(payment, []);
  await request(`seller/orders/${tracking}/confirm`, { method: 'PUT', token: tokenFor(buyer), status: 403 });
  passed('Concurrent tracking and delivery retain history, terminal state, payment and role enforcement');

  const createAccount = async () => {
    const id = crypto.randomUUID(); const email = `${id}@example.test`;
    const password = crypto.randomBytes(24).toString('base64url');
    const nextPassword = crypto.randomBytes(24).toString('base64url');
    await client.query('INSERT INTO users (id,name,email,password) VALUES ($1,$2,$3,$4)', [id, 'Auth fixture', email, await bcrypt.hash(password, 10)]);
    const login = (status = 200, value = password) => request('auth/login', { method: 'POST', body: { email, password: value }, status });
    const session = await login();
    const change = (status = 200, currentPassword = password) => request('users/password', { method: 'PUT', token: session.data.token, body: { currentPassword, newPassword: nextPassword }, status });
    return { id, email, password, nextPassword, login, change, session };
  };
  const account = await createAccount();
  const authState = async (id) => (await client.query('SELECT password,"refreshToken","authVersion" FROM users WHERE id=$1', [id])).rows[0];
  const before = await authState(account.id);
  await account.change(400, 'wrong-password');
  await request('users/password', { method: 'PUT', token: account.session.data.token, body: { currentPassword: account.password, newPassword: 'short' }, status: 400 });
  assert.ok(JSON.stringify(await authState(account.id)) === JSON.stringify(before), 'rejected changes must retain the session');
  await request('auth/me', { token: account.session.data.token });
  await request('users/profile', { method: 'PUT', token: account.session.data.token, body: { name: 'Updated auth fixture' } });
  await request('auth/me', { token: account.session.data.token });
  const changed = await account.change();
  assert.ok(changed.cleared);
  const after = await authState(account.id);
  assert.equal(after.authVersion, 1); assert.equal(after.refreshToken, null);
  await request('auth/me', { token: account.session.data.token, status: 401 });
  await request('users/addresses', { token: tokenFor(account.id), status: 401 });
  await request('auth/refresh', { method: 'POST', cookie: account.session.cookie, status: 401 });
  await account.login(401);
  const fresh = await account.login(200, account.nextPassword);
  await request('auth/me', { token: fresh.data.token });
  const rotated = await request('auth/refresh', { method: 'POST', cookie: fresh.cookie });
  assert.ok(rotated.cookie !== fresh.cookie);
  await request('auth/refresh', { method: 'POST', cookie: fresh.cookie, status: 401 });
  await request('auth/logout', { method: 'POST', cookie: fresh.cookie });
  await request('auth/refresh', { method: 'POST', cookie: rotated.cookie });
  await request('auth/me', { token: tokenFor(buyer) });
  passed('Password change revokes access/legacy/refresh, clears cookie; new login and rotation work, failed changes preserve sessions');

  for (const operation of ['refresh', 'login']) {
    for (const passwordFirst of [true, false]) {
      const concurrent = await createAccount();
      const sessionRequest = () => operation === 'refresh'
        ? request('auth/refresh', { method: 'POST', cookie: concurrent.session.cookie, status: passwordFirst ? 401 : 200 })
        : concurrent.login(passwordFirst ? 401 : 200);
      const results = await gatedWrite('users', concurrent.id,
        passwordFirst ? () => concurrent.change() : sessionRequest,
        passwordFirst ? sessionRequest : () => concurrent.change());
      const state = await authState(concurrent.id);
      assert.equal(state.authVersion, 1); assert.equal(state.refreshToken, null);
      await request('auth/me', { token: concurrent.session.data.token, status: 401 });
      if (!passwordFirst) {
        await request('auth/me', { token: results[0].data.token, status: 401 });
        await request('auth/refresh', { method: 'POST', cookie: results[0].cookie, status: 401 });
      }
      await concurrent.login(200, concurrent.nextPassword);
    }
  }
  passed('Password change versus login/refresh in both lock orders cannot restore an old session');
  const doubleChange = await createAccount();
  await gatedWrite('users', doubleChange.id, () => doubleChange.change(), () => doubleChange.change(401));
  assert.equal((await authState(doubleChange.id)).authVersion, 1);
  const doubleRefresh = await createAccount();
  await gatedWrite('users', doubleRefresh.id,
    () => request('auth/refresh', { method: 'POST', cookie: doubleRefresh.session.cookie }),
    () => request('auth/refresh', { method: 'POST', cookie: doubleRefresh.session.cookie, status: 401 }));
  const logoutRace = await createAccount();
  const [newLogin] = await gatedWrite('users', logoutRace.id, () => logoutRace.login(),
    () => request('auth/logout', { method: 'POST', cookie: logoutRace.session.cookie }));
  await request('auth/refresh', { method: 'POST', cookie: newLogin.cookie });
  passed('Concurrent password changes, refresh reuse and stale logout respect the current session');
}

module.exports = { verifyCriticalFixes };

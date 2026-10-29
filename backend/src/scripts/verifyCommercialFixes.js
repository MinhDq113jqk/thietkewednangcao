const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');

async function verifyCommercialFixes({ client, baseUrl, jwtSecret, passed, migrate }) {
  assert.match((await client.query('SELECT current_database() AS name')).rows[0].name, /^souvenirshop_verify_[a-z0-9_]+$/);
  const users = Object.fromEntries(['buyer', 'admin', 'seller0', 'seller5', 'seller10'].map(role => [role, crypto.randomUUID()]));
  const shops = {};
  for (const [role, id] of Object.entries(users)) {
    await client.query('INSERT INTO users(id,name,email,password,role) VALUES($1,$2,$3,$4,$5)', [id, 'T9-11 fixture', `${id}@example.test`, 'not-a-login-hash', role.startsWith('seller') ? 'seller' : role]);
    if (role.startsWith('seller')) {
      shops[role] = crypto.randomUUID();
      await client.query('INSERT INTO shops(id,"ownerId",name,slug,status) VALUES($1,$2,$3,$4,$5)', [shops[role], id, `T9-11 ${role}`, `fix-${id}`, 'active']);
    }
  }
  const request = async (route, { method = 'GET', body, role = 'seller0', status = 200, headers = {} } = {}) => {
    const response = await fetch(`${baseUrl}/api/${route}`, { method, headers: {
      ...(role ? { Authorization: `Bearer ${jwt.sign({ id: users[role] }, jwtSecret, { expiresIn: '15m' })}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000) });
    const data = await response.json();
    assert.ok((Array.isArray(status) ? status : [status]).includes(response.status), `${method} ${route}: ${response.status} ${data.error?.code || ''}`);
    return { data, status: response.status };
  };
  const put = (route, body, options = {}) => request(route, { method: 'PUT', body, ...options });
  const post = async (route, body, options = {}) => (await request(route, { method: 'POST', body, status: 201, ...options })).data;
  const product = (await post('seller/products', { name: 'ReviewPriceFixture Cup', price: 200000, salePrice: 100000, stock: 10, category: 'Gốm sứ' }));
  const stockRoute = `seller/products/${product.id}/stock`;
  const stock = async () => (await client.query('SELECT stock,"stockVersion" FROM products WHERE id=$1', [product.id])).rows[0];
  const checkout = async quantity => {
    const items = [{ productId: product.id, quantity }];
    const quote = await post('shipping/estimate', { city: 'Hà Nội', items }, { status: 200 });
    return post('orders', { items, shippingAddress: { name: 'Fixture recipient', phone: '0900000000', address: '1 Test Street', city: 'Hà Nội' },
      paymentMethod: 'cod', quoteFingerprint: quote.fingerprint }, { role: 'buyer', headers: { 'Idempotency-Key': crypto.randomUUID() } });
  };
  await checkout(2);
  await put(`seller/products/${product.id}`, { name: 'ReviewPriceFixture Cup Edited' });
  assert.deepEqual(await stock(), { stock: 8, stockVersion: 1 });
  await put(`seller/products/${product.id}`, { stock: 10 }, { status: 400 });
  const command = { stock: 12, expectedVersion: 1, requestKey: crypto.randomUUID(), reason: 'Verified physical stock count' };
  for (const [role, status] of [[null, 401], ['buyer', 403], ['seller5', 404]]) await put(stockRoute, command, { role, status });
  for (const invalid of [-1, 1.5, true, null, '12', 1000000001]) await put(stockRoute, { ...command, stock: invalid }, { status: 400 });
  const commands = [command, { ...command, stock: 13, requestKey: crypto.randomUUID() }];
  const concurrent = await Promise.all(commands.map(body => put(stockRoute, body, { status: [200, 409] })));
  assert.deepEqual(concurrent.map(row => row.status).sort(), [200, 409]);
  const winner = commands[concurrent.findIndex(row => row.status === 200)];
  assert.equal((await stock()).stock, winner.stock);
  await checkout(1);
  const beforeRetry = await stock();
  const replay = await put(stockRoute, winner);
  assert.ok(replay.data.idempotentReplay);
  assert.deepEqual(await stock(), beforeRetry);
  await put(stockRoute, { ...winner, stock: 99 }, { status: 409 });
  await put(stockRoute, { ...winner, requestKey: crypto.randomUUID() }, { status: 409 });
  const receipts = await client.query('SELECT count(*)::int AS n FROM product_stock_updates WHERE "productId"=$1', [product.id]);
  assert.equal(receipts.rows[0].n, 1);
  // An ABA stock cycle still changes the revision, so an old form cannot overwrite it.
  await client.query('UPDATE products SET stock=stock+1 WHERE id=$1', [product.id]);
  await client.query('UPDATE products SET stock=stock-1 WHERE id=$1', [product.id]);
  await put(stockRoute, { ...command, expectedVersion: beforeRetry.stockVersion, requestKey: crypto.randomUUID() }, { status: 409 });
  const beforeMigration = await stock();
  await migrate();
  assert.deepEqual(await stock(), beforeMigration);
  assert.ok((await put(stockRoute, winner)).data.idempotentReplay);
  passed('T9: real checkout, stale forms, concurrent stock commands, ownership, ABA revisions and lost-response retries preserve stock across migration');

  for (const [name, price, salePrice] of [['ReviewPriceFixture Bowl', 120000, null], ['ReviewPriceFixture Vase', 300000, 100000]]) {
    await post('seller/products', { name, price, salePrice, stock: 10, category: 'Gốm sứ' });
  }
  for (const path of ['products?search=ReviewPriceFixture', 'products/search?q=ReviewPriceFixture']) {
    const filtered = (await request(`${path}&maxPrice=110000&sort=price_asc`)).data;
    assert.equal(filtered.total, 2);
    assert.ok(filtered.items.every(row => Number(row.salePrice ?? row.price) === 100000));
    const expected = filtered.items.map(row => row.id).sort();
    assert.deepEqual(filtered.items.map(row => row.id), expected);
    const pages = [];
    for (const page of [1, 2]) pages.push((await request(`${path}&maxPrice=110000&sort=price_asc&limit=1&page=${page}`)).data.items[0].id);
    assert.deepEqual(pages, expected);
    const descending = (await request(`${path}&sort=price_desc`)).data.items;
    assert.deepEqual(descending.map(row => Number(row.salePrice ?? row.price)), [120000, 100000, 100000]);
    for (const query of ['minPrice=-1', 'maxPrice=abc', 'minPrice=1.5', 'maxPrice=1000000000000000', 'minPrice=200&maxPrice=100', 'maxPrice=0&maxPrice=100']) {
      await request(`${path}&${query}`, { status: 400 });
    }
    assert.equal((await request(`${path}&maxPrice=0`)).data.total, 0);
  }
  await put(`seller/products/${product.id}`, { salePrice: 150000 });
  assert.equal((await request('products/search?q=ReviewPriceFixture&maxPrice=110000')).data.total, 1);
  await put(`seller/products/${product.id}`, { salePrice: 100000 });
  assert.equal((await post('shipping/estimate', { city: 'Hà Nội', items: [{ productId: product.id, quantity: 1 }] }, { status: 200 })).subtotal, 100000);
  passed('T11: list/search/filter/sort/pagination and checkout use effective prices with strict ranges and stable ties');

  const targets = [];
  for (const [role, bps] of [['seller0', 0], ['seller5', 500], ['seller10', 1000]]) {
    const shopId = shops[role];
    const id = crypto.randomUUID(), itemId = crypto.randomUUID();
    await client.query(`INSERT INTO orders(id,"buyerId","shopId",total,"shippingFee",status,"paymentMethod","paymentExpiresAt") VALUES($1,$2,$3,100000,25000,'pending','bank_transfer',CURRENT_TIMESTAMP+INTERVAL '30 minutes')`, [id, users.buyer, shopId]);
    const ownProduct = await post('seller/products', { name: 'Revenue fixture', price: 100000, stock: 10, category: 'Gốm sứ' }, { role });
    await client.query('INSERT INTO order_items(id,"orderId","productId",name,price,quantity) VALUES($1,$2,$3,$4,100000,1)', [itemId, id, ownProduct.id, 'Revenue fixture']);
    const { receipt } = await post('admin/payments/receipts', { orderId: id, reference: `FIX-IN-${crypto.randomUUID()}`, amount: 125000,
      receivedAt: new Date().toISOString(), transferContent: 'Verified fixture funding', evidence: 'Synthetic verified receipt evidence' }, { role: 'admin' });
    await post(`admin/payments/receipts/${receipt.id}/allocate`, { orderId: id, note: 'Verified fixture allocation' }, { role: 'admin', status: 200 });
    await client.query(`UPDATE orders SET status='delivered',"deliveredAt"=CURRENT_TIMESTAMP-$2::int*INTERVAL '1 day' WHERE id=$1`, [id, role === 'seller10' ? 0 : 8]);
    const unposted = (await request('seller/orders/stats', { role })).data.revenue;
    assert.equal(unposted.unpostedGross, 100000); assert.equal(unposted.net, 0); assert.equal(unposted.available, 0);
    const route = `admin/settlements/shops/${shopId}`;
    await post(`${route}/policy`, { commissionBps: bps, note: 'Verified fixture shop commission agreement' }, { role: 'admin' });
    await post(`${route}/sync`, {}, { role: 'admin', status: 200 });
    const stats = (await request('seller/orders/stats', { role })).data.revenue;
    assert.equal(stats.commission, bps * 10); assert.equal(stats.net, 100000 - bps * 10); assert.equal(stats.unpostedGross, 0);
    assert.equal(stats.pipelineGross, role === 'seller0' ? 300000 : 0);
    const statement = (await request(route, { role: 'admin' })).data;
    for (const key of Object.keys(statement.summary)) assert.equal(stats[key], statement.summary[key]);
    targets.push({ id, itemId, receiptId: receipt.id, role, route });
  }
  const partial = targets[2];
  const { claim } = await post(`after-sales/orders/${partial.id}`, { requestKey: crypto.randomUUID(), kind: 'complaint',
    reason: 'Verified fixture partial refund', evidence: ['Synthetic fixture evidence'], lines: [{ orderItemId: partial.itemId, quantity: 1 }], requestedAmount: 20000 }, { role: 'buyer' });
  await put(`admin/after-sales/${claim.id}`, { action: 'approve', approvedAmount: 20000, note: 'Verified fixture complaint approval' }, { role: 'admin' });
  await post(`${partial.route}/policy`, { commissionBps: 2500, note: 'New policy must not change old sales' }, { role: 'admin' });
  await post('admin/after-sales/refunds', { source: 'bank_order', orderId: partial.id, receiptId: partial.receiptId, caseId: claim.id,
    amount: 20000, reference: `FIX-OUT-${crypto.randomUUID()}`, occurredAt: new Date().toISOString(), evidence: 'Synthetic refund evidence', note: 'Verified completed fixture refund' }, { role: 'admin' });
  const afterRefund = (await request('seller/orders/stats', { role: partial.role })).data.revenue;
  assert.equal(afterRefund.commission, 8000); assert.equal(afterRefund.postedGross, 80000); assert.equal(afterRefund.net, 72000);
  const { period } = await post(`${targets[1].route}/periods`, { requestKey: crypto.randomUUID(), cutoffAt: new Date().toISOString(), note: 'Verified fixture settlement period' }, { role: 'admin' });
  await post(`admin/settlements/periods/${period.id}/payout`, { amount: 95000, reference: `FIX-PAY-${crypto.randomUUID()}`, occurredAt: new Date().toISOString(),
    evidence: 'Synthetic payout evidence', note: 'Verified fixture seller payout', beneficiary: 'Synthetic verified beneficiary' }, { role: 'admin' });
  const paid = (await request('seller/orders/stats', { role: 'seller5' })).data.revenue;
  assert.equal(paid.paidAmount, 95000); assert.equal(paid.available, 0); assert.equal(paid.outstanding, 0);
  const legacyId = crypto.randomUUID();
  await client.query(`INSERT INTO orders(id,"buyerId","shopId",total,status,"paymentMethod","paymentStatus") VALUES($1,$2,$3,999999,'delivered','bank_transfer','paid')`, [legacyId, users.buyer, shops.seller5]);
  assert.equal((await request('seller/orders/stats', { role: 'seller5' })).data.revenue.gross, 100000);
  const adminStats = (await request('admin/stats', { role: 'admin' })).data.revenue;
  const ledgerTotals = (await client.query(`SELECT
    -coalesce(sum(amount) FILTER(WHERE kind IN('commission','commission_refund')),0) AS commission,
    -coalesce(sum(amount) FILTER(WHERE kind='carrier_fee'),0) AS "carrierFee",
    coalesce(sum(amount) FILTER(WHERE kind='adjustment'),0) AS adjustments,
    coalesce(sum(amount),0) AS net FROM seller_ledger`)).rows[0];
  for (const [key, value] of Object.entries(ledgerTotals)) assert.equal(adminStats[key], Number(value));
  passed('T10: 0/5/10 percent policies, unposted funds, historical rates, partial refunds, held funds, payouts and legacy flags agree with settlement statements');
}

module.exports = { verifyCommercialFixes };

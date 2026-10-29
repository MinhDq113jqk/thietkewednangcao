const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');

// This suite owns synthetic data only, inside verify:db's disposable database.
async function verifyCommerce({ client, baseUrl, jwtSecret, passed, migrate, withExpiryWorker }) {
  assert.match((await client.query('SELECT current_database() AS name')).rows[0].name, /^souvenirshop_verify_[a-z0-9_]+$/);
  const ids = Object.fromEntries(['buyer', 'other', 'seller', 'admin', 'shop'].map((name) => [name, crypto.randomUUID()]));
  for (const role of ['buyer', 'other', 'seller', 'admin']) {
    await client.query('INSERT INTO users(id,name,email,password,role) VALUES($1,$2,$3,$4,$5)',
      [ids[role], `Commerce ${role}`, `${ids[role]}@example.test`, 'not-a-login-hash', role === 'other' ? 'buyer' : role]);
  }
  await client.query('INSERT INTO shops(id,"ownerId",name,slug,status) VALUES($1,$2,$3,$4,$5)',
    [ids.shop, ids.seller, 'Commerce fixture', `commerce-${ids.shop}`, 'active']);
  const request = async (route, { method = 'GET', body, role = 'admin', status = 200 } = {}) => {
    const response = await fetch(`${baseUrl}/api/${route}`, { method,
      headers: { ...(role ? { Authorization: `Bearer ${jwt.sign({ id: ids[role] }, jwtSecret, { expiresIn: '10m' })}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000) });
    const value = await response.json();
    assert.ok([status].flat().includes(response.status), `${method} ${route}: ${response.status} (${value.code || value.message || ''})`);
    return value;
  };
  const newOrder = async (overrides = {}) => {
    const id = crypto.randomUUID(); const productId = crypto.randomUUID();
    await client.query('INSERT INTO products(id,"shopId",name,category,price,stock,sold) VALUES($1,$2,$3,$4,100000,4,1)',
      [productId, ids.shop, 'Commerce product', 'Gốm sứ']);
    await client.query(`INSERT INTO orders(id,"buyerId","shopId",total,"shippingFee","paymentMethod","paymentStatus",status,"paymentExpiresAt")
      VALUES($1,$2,$3,100000,25000,$4,$5,$6,$7)`, [id, ids.buyer, ids.shop,
      overrides.paymentMethod || 'bank_transfer', overrides.paymentStatus || 'unpaid', overrides.status || 'pending',
      overrides.deadline === null ? null : new Date(Date.now() + (overrides.deadline ?? 600000))]);
    await client.query('INSERT INTO order_items("orderId","productId",name,price,quantity) VALUES($1,$2,$3,100000,1)', [id, productId, 'Commerce product']);
    await require('./fixtureInventory')(client, id);
    return { id, productId };
  };
  const state = async (order) => (await client.query(`SELECT o.status,o."paymentStatus",o."expiredAt",o."paymentExpiresAt",o."trackingHistory",p.stock,p.sold
    FROM orders o JOIN products p ON p.id=$2 WHERE o.id=$1`, [order.id, order.productId])).rows[0];
  const receiptBody = (order, amount = 125000, overrides = {}) => ({
    reference: `BANK-${crypto.randomUUID()}`, amount, receivedAt: new Date().toISOString(),
    transferContent: `DH ${order.id.slice(0, 12)}`, evidence: 'Synthetic fixture statement: credited to receiving account',
    orderId: order.id, ...overrides,
  });
  const record = async (order, amount, overrides) => (await request('admin/payments/receipts', {
    method: 'POST', body: receiptBody(order, amount, overrides), status: 201 })).receipt;
  const allocate = (receipt, order, overrides) => request(`admin/payments/receipts/${receipt.id}/allocate`, {
    method: 'POST', body: { orderId: order.id, note: 'Verified bank statement and ownership of transfer', ...overrides } });
  const balance = (order) => request(`admin/payments/orders/${order.id}`);
  const expire = () => request('admin/payments/expire', { method: 'POST' });
  const receiptsForReview = () => request('admin/payments/receipts?reviewOnly=true&limit=100');

  for (const [role, status] of [[null, 401], ['buyer', 403], ['seller', 403]]) {
    await request('admin/payments/receipts', { role, status });
    await request('admin/payments/receipts', { method: 'POST', body: {}, role, status });
    await request('admin/payments/expire', { method: 'POST', role, status });
    await request(`admin/payments/orders/${crypto.randomUUID()}`, { role, status });
    await request(`admin/payments/receipts/${crypto.randomUUID()}/allocate`, { method: 'POST', body: {}, role, status });
  }
  passed('Payment receipt, allocation, balance and expiry routes require an active admin');

  const order = await newOrder();
  const validBody = receiptBody(order);
  for (const invalid of [{ amount: true }, { amount: [] }, { amount: 1.5 }, { amount: '1e5' }, { amount: 0 },
    { reference: 'a b' }, { evidence: '' }, { receivedAt: 'not-a-date' }, { receivedAt: '2026-01-01T00:00:00' },
    { receivedAt: new Date(Date.now() + 600000).toISOString() }, { receivedAt: '2026-02-30T00:00:00Z' },
    { receivedAt: '2026-01-01T24:00:00Z' }, { orderId: 'invalid' }, { orderId: false }, { transferContent: {} }]) {
    await request('admin/payments/receipts', { method: 'POST', body: { ...validBody, ...invalid }, status: 400 });
  }
  assert.equal((await client.query('SELECT count(*)::int n FROM bank_receipts WHERE "orderId"=$1', [order.id])).rows[0].n, 0);
  passed('Receipt validation rejects invalid money, evidence, references, dates and object coercions without writes');

  const body = receiptBody(order, 50000);
  const duplicates = await Promise.all([201, 200].map(() => request('admin/payments/receipts', { method: 'POST', body, status: [200, 201] })));
  assert.equal(duplicates[0].receipt.id, duplicates[1].receipt.id);
  assert.equal(duplicates.filter((value) => value.idempotentReplay).length, 1);
  await request('admin/payments/receipts', { method: 'POST', body: { ...body, amount: 60000 }, status: 409 });
  assert.equal((await balance(order)).allocatedAmount, 0);
  assert.equal((await state(order)).paymentStatus, 'unpaid');
  const first = duplicates[0].receipt;
  await request(`admin/payments/receipts/${first.id}/allocate`, { method: 'POST', body: { orderId: order.id, note: 'short' }, status: 400 });
  await request(`admin/orders/${order.id}/payment`, { method: 'PUT', body: { status: 'paid' }, status: 409 });
  passed('Concurrent bank-reference replay is idempotent; altered data and legacy paid-status bypass are rejected');

  let qr = await request(`payment/vietqr/${order.id}`, { method: 'POST', body: {}, role: 'buyer' });
  assert.equal(qr.amount, 125000); assert.equal((await state(order)).paymentStatus, 'unpaid');
  await allocate(first, order);
  assert.equal((await balance(order)).outstandingAmount, 75000);
  assert.equal((await state(order)).paymentStatus, 'unpaid');
  qr = await request(`payment/vietqr/${order.id}`, { method: 'POST', body: {}, role: 'buyer' });
  assert.equal(qr.amount, 75000);
  const second = await record(order, 100000);
  const settled = await allocate(second, order);
  assert.equal(settled.receipt.allocatedAmount, 75000);
  assert.equal(settled.receipt.unappliedAmount, 25000);
  assert.equal((await balance(order)).allocatedAmount, 125000);
  assert.equal((await state(order)).paymentStatus, 'paid');
  await request(`payment/vietqr/${order.id}`, { method: 'POST', body: {}, role: 'buyer', status: 409 });
  assert.ok((await receiptsForReview()).items.some((row) => row.id === second.id));
  assert.equal((await allocate(first, order)).idempotentReplay, true);
  assert.equal((await allocate(second, order)).idempotentReplay, true);
  await expire(); assert.equal((await state(order)).stock, 4);
  await request(`orders/${order.id}/cancel`, { method: 'PUT', role: 'buyer', status: 409 });
  passed('QR is not payment proof; partial receipts reduce QR balance, full allocation marks paid and excess stays in review');

  const corrected = await newOrder();
  const wrong = await record(corrected, 125000, { transferContent: 'WRONG CONTENT', orderId: null });
  assert.equal(wrong.reason, 'unmatched');
  const correctedResult = await allocate(wrong, corrected);
  assert.equal(correctedResult.allocated, true, `Unexpected review reason: ${correctedResult.reason}`);
  assert.equal(correctedResult.receipt.allocation.note, 'Verified bank statement and ownership of transfer');
  assert.equal((await state(corrected)).paymentStatus, 'paid');
  passed('An unmatched or wrong-content receipt can be allocated by an admin with a retained audit explanation');

  const earlier = await newOrder();
  const oldReceipt = await record(earlier, 125000, { receivedAt: new Date(Date.now() - 60000).toISOString() });
  const oldResult = await allocate(oldReceipt, earlier);
  assert.equal(oldResult.allocated, false); assert.equal(oldResult.reason, 'predates_order');
  const legacy = await newOrder({ paymentStatus: 'paid' }); const legacyReceipt = await record(legacy);
  assert.equal((await allocate(legacyReceipt, legacy)).reason, 'legacy_payment');
  assert.equal((await balance(legacy)).allocatedAmount, 0);
  passed('Pre-order transfers and already-paid legacy orders retain incoming money for review without creating allocations');

  const concurrent = await newOrder();
  const parallelReceipts = await Promise.all([record(concurrent, 80000), record(concurrent, 80000)]);
  await Promise.all(parallelReceipts.map((receipt) => allocate(receipt, concurrent)));
  assert.equal((await balance(concurrent)).allocatedAmount, 125000);
  assert.equal((await client.query('SELECT sum(amount)::int n FROM payment_allocations WHERE "orderId"=$1', [concurrent.id])).rows[0].n, 125000);
  const otherOrder = await newOrder(); const sameReceipt = await record(otherOrder);
  const competitor = await newOrder();
  const attempts = await Promise.all([otherOrder, competitor].map((target) => request(`admin/payments/receipts/${sameReceipt.id}/allocate`, {
    method: 'POST', body: { orderId: target.id, note: 'Verified bank statement and ownership of transfer' }, status: [200, 409] })));
  assert.equal(attempts.filter((value) => value.allocated).length, 1);
  assert.equal((await client.query('SELECT count(*)::int n FROM payment_allocations WHERE "receiptId"=$1', [sameReceipt.id])).rows[0].n, 1);
  passed('Concurrent receipts cannot over-allocate an order, and one receipt cannot fund two orders');

  for (const table of ['bank_receipts', 'payment_allocations']) {
    const id = table === 'bank_receipts' ? first.id : settled.receipt.allocation.id;
    await assert.rejects(client.query(`UPDATE ${table} SET amount=1 WHERE id=$1`, [id]), (error) => error.code === '23514');
  }
  const malicious = await record(otherOrder, 1);
  await assert.rejects(client.query('INSERT INTO payment_allocations("receiptId","orderId",amount,note,"allocatedBy") VALUES($1,$2,125001,$3,$4)',
    [malicious.id, otherOrder.id, 'Invalid direct allocation fixture', ids.admin]), (error) => error.code === '23514');
  passed('PostgreSQL rejects edits to financial facts and allocations beyond receipt/order limits');

  const expired = await newOrder({ deadline: -5000 });
  await Promise.all([expire(), expire()]);
  const expiredState = await state(expired);
  assert.equal(expiredState.status, 'cancelled'); assert.ok(expiredState.expiredAt);
  assert.equal(expiredState.stock, 5); assert.equal(expiredState.sold, 0);
  assert.equal(expiredState.trackingHistory.filter((event) => event.status === 'cancelled').length, 1);
  await expire(); assert.equal((await state(expired)).stock, 5);
  const late = await record(expired);
  assert.equal((await allocate(late, expired)).allocated, false);
  assert.equal((await state(expired)).paymentStatus, 'unpaid');
  await request(`payment/vietqr/${expired.id}`, { method: 'POST', body: {}, role: 'buyer', status: 409 });
  passed('Two expiry workers cancel and restore inventory once; late transfers never resurrect expired orders');

  const partial = await newOrder(); const partialReceipt = await record(partial, 25000);
  await allocate(partialReceipt, partial);
  await client.query('UPDATE orders SET "paymentExpiresAt"=NOW()-INTERVAL \'1 second\' WHERE id=$1', [partial.id]);
  await expire();
  const review = (await receiptsForReview()).items.find((row) => row.id === partialReceipt.id);
  assert.equal(review.heldForReviewAmount, 25000); assert.equal(review.reason, 'expired');
  assert.equal((await state(partial)).stock, 5);
  passed('Expired partially paid orders release stock while retaining their received money in the review queue');

  const unattended = await newOrder({ deadline: -1000 }); const unattendedReceipt = await record(unattended);
  assert.equal((await allocate(unattendedReceipt, unattended)).allocated, false);
  assert.equal((await state(unattended)).stock, 5);
  assert.ok((await state(unattended)).expiredAt);
  const cod = await newOrder({ paymentMethod: 'cod', deadline: -1000 });
  const shipped = await newOrder({ status: 'shipping', deadline: -1000 });
  await expire();
  assert.equal((await state(cod)).status, 'pending');
  assert.equal((await state(shipped)).status, 'shipping');
  const unpaid = await newOrder();
  for (const action of ['confirm', 'pack', 'ship']) await request(`seller/orders/${unpaid.id}/${action}`, { method: 'PUT', role: 'seller', body: {}, status: 400 });
  await request(`admin/orders/${unpaid.id}/status`, { method: 'PUT', body: { status: 'confirmed' }, status: 409 });
  passed('Allocation enforces expiry even before the worker runs; COD and shipped orders are preserved and unpaid transfers cannot advance');

  // Force expiry to own the order lock and wait on inventory, then queue payment.
  const race = await newOrder(); const raceReceipt = await record(race);
  await client.query('UPDATE orders SET "paymentExpiresAt"=NOW()-INTERVAL \'1 second\' WHERE id=$1', [race.id]);
  const waitForLocks = async (count) => {
    const deadline = Date.now() + 4000;
    while (Date.now() < deadline) {
      await client.query('SELECT pg_stat_clear_snapshot()');
      const result = await client.query("SELECT count(*)::int n FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND wait_event_type='Lock'");
      if (result.rows[0].n >= count) return;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw new Error('Commerce concurrency fixture did not reach the expected database lock');
  };
  await client.query('BEGIN');
  await client.query('SELECT id FROM products WHERE id=$1 FOR UPDATE', [race.productId]);
  let expiryRequest; let allocationRequest;
  try {
    expiryRequest = expire(); expiryRequest.catch(() => {}); await waitForLocks(1);
    allocationRequest = allocate(raceReceipt, race); allocationRequest.catch(() => {}); await waitForLocks(2);
  } finally { await client.query('COMMIT'); }
  await expiryRequest;
  assert.equal((await allocationRequest).allocated, false);
  assert.equal((await state(race)).stock, 5);
  assert.equal((await state(race)).paymentStatus, 'unpaid');
  passed('Expiry versus incoming allocation is serialized on the same order lock without lost money or double restock');

  // The successful allocation owns the order lock before expiry becomes due.
  const paidFirst = await newOrder(); const paidReceipt = await record(paidFirst);
  const gate = crypto.randomInt(200000, 1000000000);
  await client.query(`CREATE FUNCTION commerce_paid_gate() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
    IF NEW.id='${paidFirst.id}'::uuid AND NEW."paymentStatus"='paid' THEN PERFORM pg_advisory_xact_lock(${gate}); END IF;
    RETURN NEW; END $$;
    CREATE TRIGGER commerce_paid_gate BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION commerce_paid_gate()`);
  await client.query('UPDATE orders SET "paymentExpiresAt"=NOW()+INTERVAL \'2 seconds\' WHERE id=$1', [paidFirst.id]);
  await client.query('SELECT pg_advisory_lock($1)', [gate]);
  let paidRequest;
  try {
    paidRequest = allocate(paidReceipt, paidFirst); paidRequest.catch(() => {});
    await waitForLocks(1);
    const deadline = (await state(paidFirst)).paymentExpiresAt.getTime();
    while (Date.now() <= deadline + 50) await new Promise((resolve) => setTimeout(resolve, 25));
    await expire();
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [gate]);
    if (paidRequest) await paidRequest;
    await client.query('DROP TRIGGER commerce_paid_gate ON orders; DROP FUNCTION commerce_paid_gate()');
  }
  assert.equal((await state(paidFirst)).paymentStatus, 'paid');
  assert.equal((await state(paidFirst)).stock, 4);
  await expire(); assert.equal((await state(paidFirst)).status, 'pending');
  passed('A valid allocation that owns the order lock before expiry completes without cancellation or inventory release');

  const preserved = (await client.query('SELECT reference,amount,evidence FROM bank_receipts ORDER BY id')).rows;
  const originalDeadline = (await state(unpaid)).paymentExpiresAt.getTime();
  migrate();
  assert.deepEqual((await client.query('SELECT reference,amount,evidence FROM bank_receipts ORDER BY id')).rows, preserved);
  assert.equal((await state(unpaid)).paymentExpiresAt.getTime(), originalDeadline);
  passed('Repeated migration preserves bank receipts, allocations and existing payment deadlines');

  await client.query('ALTER TABLE orders DROP COLUMN "paymentExpiresAt"');
  migrate();
  const upgradedDeadline = (await state(unpaid)).paymentExpiresAt.getTime();
  assert.ok(upgradedDeadline > Date.now() + 29 * 60000 && upgradedDeadline < Date.now() + 31 * 60000);
  migrate(); assert.equal((await state(unpaid)).paymentExpiresAt.getTime(), upgradedDeadline);
  assert.equal((await state(shipped)).paymentExpiresAt, null);
  assert.equal((await state(cod)).paymentExpiresAt, null);
  passed('Legacy unpaid reservations get one grace period; repeated upgrades do not extend it or affect COD/shipped orders');

  const automatic = await newOrder({ deadline: -1000 });
  await withExpiryWorker(async () => {
    const timeout = Date.now() + 20000;
    while ((await state(automatic)).status !== 'cancelled' && Date.now() < timeout) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.equal((await state(automatic)).stock, 5);
    assert.ok((await state(automatic)).expiredAt);
  });
  passed('The Nest background expiry worker releases overdue stock without an HTTP/manual trigger and shuts down cleanly');
}

module.exports = { verifyCommerce };

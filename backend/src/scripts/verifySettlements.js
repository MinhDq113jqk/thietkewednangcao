const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');

async function verifySettlements({ client, baseUrl, jwtSecret, passed, migrate }) {
  assert.match((await client.query('SELECT current_database() AS name')).rows[0].name, /^souvenirshop_verify_[a-z0-9_]+$/);
  const ids = Object.fromEntries(['buyer', 'seller', 'otherSeller', 'admin', 'shop'].map((key) => [key, crypto.randomUUID()]));
  for (const role of ['buyer', 'seller', 'otherSeller', 'admin']) await client.query('INSERT INTO users(id,name,email,password,role) VALUES($1,$2,$3,$4,$5)', [ids[role], `Settlement ${role}`, `${ids[role]}@example.test`, 'not-a-login-hash', role === 'otherSeller' ? 'seller' : role]);
  await client.query('INSERT INTO shops(id,"ownerId",name,slug,status) VALUES($1,$2,$3,$4,$5)', [ids.shop, ids.seller, 'Settlement fixture', `settlement-${ids.shop}`, 'active']);
  const request = async (route, { body, method = 'GET', status = 200, role = 'admin' } = {}) => {
    const response = await fetch(`${baseUrl}/api/${route}`, { method, headers: {
      ...(role ? { Authorization: `Bearer ${jwt.sign({ id: ids[role] }, jwtSecret, { expiresIn: '10m' })}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20000) });
    const value = await response.json();
    assert.ok([status].flat().includes(response.status), `${method} ${route}: ${response.status} (${value.code || value.message || ''})`);
    return value;
  };
  const post = (route, body, status = 201, role = 'admin') => request(route, { body, status, role, method: 'POST' });
  const shopRoute = `admin/settlements/shops/${ids.shop}`;
  const statement = (query = '') => request(`${shopRoute}${query}`);
  const sync = () => post(`${shopRoute}/sync`, {}, 200);
  const fact = (amount, overrides = {}) => ({ amount, reference: `SET-${crypto.randomUUID()}`, occurredAt: new Date().toISOString(), evidence: 'Synthetic verified bank evidence', note: 'Synthetic verified financial operation', ...overrides });
  const order = async ({ method = 'bank_transfer', total = 100000, funded = true, matured = true } = {}) => {
    const id = crypto.randomUUID(); const productId = crypto.randomUUID(); const itemId = crypto.randomUUID();
    await client.query('INSERT INTO products(id,"shopId",name,price,stock,sold) VALUES($1,$2,$3,$4,9,1)', [productId, ids.shop, 'Settlement product', total]);
    await client.query(`INSERT INTO orders(id,"buyerId","shopId",total,"shippingFee",status,"paymentMethod","paymentExpiresAt",carrier,"trackingCode") VALUES($1,$2,$3,$4,25000,'pending',$5,CURRENT_TIMESTAMP+INTERVAL '30 minutes','Fixture carrier',$6)`, [id, ids.buyer, ids.shop, total, method, `TRACK-${id}`]);
    await client.query('INSERT INTO order_items(id,"orderId","productId",name,price,quantity) VALUES($1,$2,$3,$4,$5,1)', [itemId, id, productId, 'Settlement product', total]);
    let receiptId;
    if (method === 'bank_transfer' && funded) {
      const { receipt } = await post('admin/payments/receipts', { orderId: id, reference: `IN-${crypto.randomUUID()}`, amount: total + 25000, receivedAt: new Date().toISOString(), transferContent: 'Verified settlement fixture', evidence: 'Synthetic incoming evidence' });
      receiptId = receipt.id;
      await post(`admin/payments/receipts/${receipt.id}/allocate`, { orderId: id, note: 'Verified settlement fixture allocation' }, 200);
    }
    await client.query(`UPDATE orders SET status='delivered',"deliveredAt"=CURRENT_TIMESTAMP - $2::int * INTERVAL '1 day' WHERE id=$1`, [id, matured ? 8 : 0]);
    return { id, itemId, receiptId, total };
  };
  const newClaim = async (target, requestedAmount) => (await post(`after-sales/orders/${target.id}`, {
    requestKey: crypto.randomUUID(), kind: 'complaint', reason: 'Synthetic settlement complaint evidence', evidence: ['Synthetic private evidence'], lines: [{ orderItemId: target.itemId, quantity: 1 }], requestedAmount,
  }, 201, 'buyer')).claim;
  const approve = (claim, amount) => request(`admin/after-sales/${claim.id}`, { method: 'PUT', body: { action: 'approve', approvedAmount: amount, note: 'Verified approved complaint amount' } });
  const resolve = (claim) => request(`admin/after-sales/${claim.id}`, { method: 'PUT', body: { action: 'resolve', note: 'Verified complaint completed with refund' } });
  const refund = (target, claim, amount, overrides = {}, status = 201) => post('admin/after-sales/refunds', fact(amount, { source: target.receiptId ? 'bank_order' : 'cod_order', orderId: target.id, receiptId: target.receiptId, caseId: claim.id, ...overrides }), status);
  const periodBody = () => ({ requestKey: crypto.randomUUID(), cutoffAt: new Date().toISOString(), note: 'Verified seller settlement period' });
  const period = (body = periodBody(), status = 201) => post(`${shopRoute}/periods`, body, status);
  const payout = (p, body = fact(Number(p.amount), { beneficiary: 'Synthetic shop verified beneficiary' }), status = 201) => post(`admin/settlements/periods/${p.id}/payout`, body, status);
  const cancel = (p) => post(`admin/settlements/periods/${p.id}/cancel`, { note: 'Rebuild after settlement conditions changed' }, 200);

  for (const [role, status] of [[null, 401], ['buyer', 403], ['seller', 403]]) {
    for (const [route, method] of [['admin/settlements/shops', 'GET'], [shopRoute, 'GET'], [`${shopRoute}/policy`, 'POST'], [`${shopRoute}/sync`, 'POST'], [`${shopRoute}/periods`, 'POST'], [`${shopRoute}/adjustments`, 'POST'], [`admin/settlements/periods/${crypto.randomUUID()}/payout`, 'POST']]) await request(route, { role, method, status, body: method === 'POST' ? {} : undefined });
  }
  await request('seller/settlements', { role: 'buyer', status: 403 });
  passed('Settlement routes enforce admin writes, seller reads and authentication');

  const bank = await order({ matured: false });
  await post(`${shopRoute}/sync`, {}, 409);
  for (const invalid of [true, 1.5, -1, 10001, '1000']) await post(`${shopRoute}/policy`, { commissionBps: invalid, note: 'Fixture commission agreement' }, 400);
  await post(`${shopRoute}/policy`, { commissionBps: 1000, note: 'Fixture commission agreement' });
  await Promise.all([sync(), sync()]);
  let s = await statement();
  assert.equal(s.ledger.total, 2); assert.equal(s.summary.outstanding, 90000); assert.equal(s.summary.available, 0); assert.equal(s.summary.heldAmount, 90000);
  await period(periodBody(), 409);
  // Age only the delivered fixture, then recreate its ledger in another order for
  // mature eligibility; immutable availability is never edited by a migration.
  const mature = await order(); const unverified = await order({ funded: false });
  const skipped = await sync(); assert.equal(skipped.skipped.unverified, 1);
  s = await statement(); assert.equal(s.summary.available, 90000);
  assert.ok(s.ledger.items.every((entry) => entry.orderId !== unverified.id));
  passed('Explicit commission policy, verified funding, immutable hold deadline and legacy unverified exclusion determine eligibility');

  const requestBody = periodBody();
  const concurrent = await Promise.all([period(requestBody, [200, 201]), period(requestBody, [200, 201])]);
  assert.equal(concurrent[0].period.id, concurrent[1].period.id);
  const firstPeriod = concurrent[0].period;
  assert.equal(Number(firstPeriod.amount), 90000);
  await period({ ...requestBody, note: 'Changed request contents should be rejected' }, 409);
  await period(periodBody(), 409);
  await request(`seller/settlements/periods/${firstPeriod.id}`, { role: 'otherSeller', status: 404 });
  const sellerDetail = await request(`seller/settlements/periods/${firstPeriod.id}`, { role: 'seller' });
  assert.equal(sellerDetail.total, 2);
  assert.ok(sellerDetail.items.every((entry) => entry.orderId === mature.id));
  await payout(firstPeriod, fact(90001, { beneficiary: 'Synthetic shop beneficiary' }), 409);
  const paymentBody = fact(90000, { beneficiary: 'Synthetic shop verified beneficiary' });
  const paid = await Promise.all([payout(firstPeriod, paymentBody, [200, 201]), payout(firstPeriod, paymentBody, [200, 201])]);
  assert.equal(paid[0].payout.id, paid[1].payout.id);
  await payout(firstPeriod, { ...paymentBody, note: 'Changed payout details should be rejected' }, 409);
  assert.equal((await statement()).summary.paidAmount, 90000);
  await cancel(firstPeriod).then(() => assert.fail('Paid period cannot cancel'), (error) => assert.match(error.message, /409/));
  passed('Concurrent period creation and payout replay reserve/pay each entry once; seller can trace its own period to orders');

  // The original delivered fixture is within its return window. Its open claim
  // holds funds; the mature paid order receives an admin-approved legacy claim.
  const heldClaim = await newClaim(bank, 20000); await approve(heldClaim, 20000);
  const paidClaimId = crypto.randomUUID();
  await client.query(`INSERT INTO return_cases(id,"orderId","buyerId","requestKey","requestHash",kind,status,reason,evidence,"requestedAmount","approvedAmount") VALUES($1,$2,$3,$4,$5,'complaint','approved','Fixture approved complaint','["Fixture evidence"]',20000,20000)`, [paidClaimId, mature.id, ids.buyer, crypto.randomUUID(), '0'.repeat(64)]);
  const refundFact = fact(20000);
  await refund(mature, { id: paidClaimId }, 20000, refundFact);
  await refund(mature, { id: paidClaimId }, 20000, refundFact, 200);
  s = await statement(); assert.equal(s.summary.carryDebt, 18000); assert.equal(s.summary.paidAmount, 90000);
  assert.equal(s.ledger.items.filter((entry) => entry.refundId).length, 2);
  assert.equal(s.ledger.items.find((entry) => entry.kind === 'commission_refund').amount, '2000');
  await post(`${shopRoute}/policy`, { commissionBps: 2000, note: 'New rate applies only to unposted sales' });
  await sync(); assert.equal((await statement()).ledger.total, s.ledger.total);
  const nextOrder = await order(); await sync();
  const next = (await period()).period;
  assert.equal(Number(next.amount), 62000); // 80,000 new entitlement - 18,000 old refund debt.
  const debit = fact(1000, { orderId: nextOrder.id, direction: 'debit' });
  await post(`${shopRoute}/adjustments`, debit);
  await post(`${shopRoute}/adjustments`, debit, 200);
  await payout(next, undefined, 409);
  await cancel(next);
  const rebuilt = (await period()).period;
  assert.equal(Number(rebuilt.amount), 61000);
  await payout(rebuilt);
  passed('Refunds after payout atomically debit seller and restore original commission; debts and adjustments carry into later periods and invalidate stale drafts');

  const cod = await order({ method: 'cod' });
  const collection = fact(125000, { kind: 'collection', fee: 0 });
  await post(`admin/after-sales/cod/${cod.id}`, collection);
  await post(`admin/after-sales/cod/${cod.id}`, fact(50000, { kind: 'remittance', fee: 10000 }));
  await sync(); assert.ok(!(await statement()).ledger.items.some((entry) => entry.orderId === cod.id));
  await post(`admin/after-sales/cod/${cod.id}`, fact(40000, { kind: 'remittance', fee: 25000 }));
  await sync();
  s = await statement(); assert.equal(s.summary.available, 70000); // 100k -20k commission -10k extra carrier fee.
  const codPeriod = (await period()).period; assert.equal(Number(codPeriod.amount), 70000);
  await payout(codPeriod, fact(70000, { beneficiary: 'Synthetic shop beneficiary', reference: refundFact.reference }), 409);
  await cancel(codPeriod);
  const shortCod = await order({ method: 'cod' });
  await post(`admin/after-sales/cod/${shortCod.id}`, fact(120000, { kind: 'collection', fee: 0 }));
  await post(`admin/after-sales/cod/${shortCod.id}`, fact(95000, { kind: 'remittance', fee: 25000 }));
  await sync();
  assert.ok(!(await client.query('SELECT id FROM seller_ledger WHERE "orderId"=$1', [shortCod.id])).rowCount);
  passed('COD must be fully reconciled with zero collection difference; extra carrier costs reduce entitlement and a bank debit cannot fund both refund and seller payout');

  // Opening a claim after draft creation is serialized by the same order lock.
  await resolve(heldClaim).then(() => assert.fail('Unfunded approved complaint cannot resolve'), (error) => assert.match(error.message, /409/));
  const holdDraft = (await period()).period;
  const codClaimId = crypto.randomUUID();
  await client.query(`INSERT INTO return_cases(id,"orderId","buyerId","requestKey","requestHash",kind,status,reason,evidence) VALUES($1,$2,$3,$4,$5,'complaint','requested','Fixture new complaint','["Fixture evidence"]')`, [codClaimId, cod.id, ids.buyer, crypto.randomUUID(), '0'.repeat(64)]);
  await payout(holdDraft, undefined, 409); await cancel(holdDraft);
  await period(periodBody(), 409);
  passed('New active claims block an existing payout draft and exclude held orders from newly built periods');

  for (const table of ['settlement_policies', 'seller_ledger', 'settlement_items', 'seller_payouts']) {
    const row = (await client.query(`SELECT id FROM ${table} ORDER BY id LIMIT 1`)).rows[0];
    await assert.rejects(client.query(`UPDATE ${table} SET id=id WHERE id=$1`, [row.id]), (error) => error.code === '23514');
    await assert.rejects(client.query(`DELETE FROM ${table} WHERE id=$1`, [row.id]), (error) => error.code === '23514');
  }
  await assert.rejects(client.query('UPDATE settlement_periods SET amount=1 WHERE id=$1', [firstPeriod.id]), (error) => error.code === '23514');
  const digest = async () => {
    const values = {};
    for (const table of ['settlement_policies', 'seller_ledger', 'settlement_periods', 'settlement_items', 'seller_payouts']) values[table] = (await client.query(`SELECT md5(coalesce(string_agg(row_to_json(t)::text,chr(10) ORDER BY id),'')) AS digest FROM ${table} t`)).rows[0].digest;
    return values;
  };
  const before = await digest(); migrate(); assert.deepEqual(await digest(), before);
  assert.equal((await request('seller/settlements?ledgerPage=2&limit=2', { role: 'seller' })).ledger.items.length, 2);
  passed('Settlement facts resist update/delete, reads paginate and repeat migration preserves all ledger, policy, period and payout history');
}
module.exports = { verifySettlements };

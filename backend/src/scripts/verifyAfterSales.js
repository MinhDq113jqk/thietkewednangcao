const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');

async function verifyAfterSales({ client, baseUrl, jwtSecret, passed, migrate }) {
  assert.match((await client.query('SELECT current_database() AS name')).rows[0].name, /^souvenirshop_verify_[a-z0-9_]+$/);
  const ids = Object.fromEntries(['buyer', 'other', 'seller', 'otherSeller', 'admin', 'shop'].map((key) => [key, crypto.randomUUID()]));
  for (const role of ['buyer', 'other', 'seller', 'otherSeller', 'admin']) await client.query('INSERT INTO users(id,name,email,password,role) VALUES($1,$2,$3,$4,$5)', [ids[role], `After sales ${role}`, `${ids[role]}@example.test`, 'not-a-login-hash', role.includes('Seller') ? 'seller' : role === 'other' ? 'buyer' : role]);
  await client.query('INSERT INTO shops(id,"ownerId",name,slug,status) VALUES($1,$2,$3,$4,$5)', [ids.shop, ids.seller, 'After sales fixture', `after-sales-${ids.shop}`, 'active']);
  const request = async (route, { method = 'GET', role = 'admin', body, status = 200 } = {}) => {
    const response = await fetch(`${baseUrl}/api/${route}`, { method, headers: {
      ...(role ? { Authorization: `Bearer ${jwt.sign({ id: ids[role] }, jwtSecret, { expiresIn: '10m' })}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000) });
    const value = await response.json();
    assert.ok([status].flat().includes(response.status), `${method} ${route}: ${response.status} (${value.code || value.message || ''})`);
    return value;
  };
  const post = (route, body, status = 201, role = 'admin') => request(route, { body, status, role, method: 'POST' });
  const newOrder = async ({ method = 'bank_transfer', status = 'pending', quantity = 3 } = {}) => {
    const id = crypto.randomUUID(); const productId = crypto.randomUUID(); const itemId = crypto.randomUUID();
    await client.query('INSERT INTO products(id,"shopId",name,price,stock,sold,"isActive") VALUES($1,$2,$3,100000,7,$4,true)', [productId, ids.shop, 'Return fixture', quantity]);
    await client.query(`INSERT INTO orders(id,"buyerId","shopId",total,"shippingFee",status,"paymentMethod","paymentExpiresAt",carrier,"trackingCode","deliveredAt") VALUES($1,$2,$3,$4,25000,$5,$6,$7,'Fixture carrier',$8,$9)`, [id, ids.buyer, ids.shop, quantity * 100000, status, method, new Date(Date.now() + 600000), `TRACK-${id}`, status === 'delivered' ? new Date(Date.now() - 60000) : null]);
    await client.query('INSERT INTO order_items(id,"orderId","productId",name,price,quantity) VALUES($1,$2,$3,$4,100000,$5)', [itemId, id, productId, 'Return fixture', quantity]);
    await require('./fixtureInventory')(client, id);
    return { id, productId, itemId, quantity, amount: quantity * 100000 + 25000 };
  };
  const state = async (order) => (await client.query('SELECT o.status,o."paymentStatus",p.stock,p.sold FROM orders o JOIN products p ON p.id=$2 WHERE o.id=$1', [order.id, order.productId])).rows[0];
  const receiptFor = async (order, amount = order.amount, allocate = true) => {
    const { receipt } = await post('admin/payments/receipts', { orderId: order.id, amount, reference: `IN-${crypto.randomUUID()}`, receivedAt: new Date().toISOString(), transferContent: 'Verified order by fixture', evidence: 'Synthetic incoming bank statement evidence' });
    if (allocate) await post(`admin/payments/receipts/${receipt.id}/allocate`, { orderId: order.id, note: 'Verified owner and order reference in fixture' }, 200);
    return receipt;
  };
  const newClaim = (order, overrides = {}) => ({ requestKey: crypto.randomUUID(), kind: 'return_refund', reason: 'Synthetic product has wrong finish', evidence: ['Private fixture evidence reference'], lines: [{ orderItemId: order.itemId, quantity: 1 }], requestedAmount: 100000, ...overrides });
  const create = (order, body = newClaim(order), status = 201, role = 'buyer') => post(`after-sales/orders/${order.id}`, body, status, role);
  const action = (claim, action, extra = {}, status = 200, role = 'seller') => request(`${role === 'admin' ? 'admin' : 'seller'}/after-sales/${claim.id}`, { method: 'PUT', role, body: { action, note: 'Synthetic inspected and verified handling', ...extra }, status });
  const refundBody = (order, receipt, amount, overrides = {}) => ({ source: 'bank_order', orderId: order.id, receiptId: receipt?.id, amount, reference: `OUT-${crypto.randomUUID()}`, occurredAt: new Date().toISOString(), evidence: 'Synthetic outgoing bank statement evidence', note: 'Verified completed payment back to customer', ...overrides });
  const refund = (body, status = 201) => post('admin/after-sales/refunds', body, status);
  const cod = (order, kind, amount, fee = 0, overrides = {}) => ({ kind, amount, fee, reference: `COD-${crypto.randomUUID()}`, occurredAt: new Date().toISOString(), evidence: 'Synthetic carrier/bank statement evidence', note: 'Verified transport and bank statement details', ...overrides });
  const codRecord = (order, body, status = 201) => post(`admin/after-sales/cod/${order.id}`, body, status);

  for (const [role, status] of [[null, 401], ['buyer', 403], ['seller', 403]]) {
    for (const [route, method] of [['admin/after-sales', 'GET'], ['admin/after-sales/cod', 'GET'], ['admin/after-sales/refunds', 'POST'], [`admin/after-sales/finance/${crypto.randomUUID()}`, 'GET']]) await request(route, { role, method, body: method === 'POST' ? {} : undefined, status });
  }
  passed('After-sales finance/refund/COD routes require admin; money evidence is never public');

  const bank = await newOrder(); const bankReceipt = await receiptFor(bank);
  await request(`admin/orders/${bank.id}/payment`, { method: 'PUT', body: { status: 'refunded', reference: 'BYPASS', note: 'Legacy refund bypass blocked' }, status: 409 });
  await client.query('UPDATE orders SET status=$2,"deliveredAt"=CURRENT_TIMESTAMP WHERE id=$1', [bank.id, 'delivered']);
  await create(bank, newClaim(bank), 404, 'other');
  for (const patch of [{ lines: [] }, { evidence: [] }, { requestedAmount: true }, { requestedAmount: 100001 }, { lines: [{ orderItemId: bank.itemId, quantity: 4 }] }]) await create(bank, newClaim(bank, patch), [400, 409]);
  const claimBody = newClaim(bank);
  const claims = await Promise.all([create(bank, claimBody, [200, 201]), create(bank, claimBody, [200, 201])]);
  assert.equal(claims[0].claim.id, claims[1].claim.id);
  assert.equal(claims.filter((row) => row.idempotentReplay).length, 1);
  const claim = claims[0].claim;
  await create(bank, { ...claimBody, reason: 'Changed content for replayed fixture' }, 409);
  assert.equal((await request('after-sales', { role: 'other' })).total, 0);
  await action(claim, 'approve', { approvedAmount: 100000 }, 404, 'otherSeller');
  passed('Return requests enforce ownership, private history, quantities, value ceilings and concurrent idempotent replay');

  await action(claim, 'approve', { approvedAmount: 100001 }, 400);
  await action(claim, 'approve', { approvedAmount: 100000 });
  await refund(refundBody(bank, bankReceipt, 1, { caseId: claim.id }), 409);
  const received = await Promise.all([200, 409].map(() => action(claim, 'receive', { lines: [{ orderItemId: bank.itemId, restock: true }] }, [200, 409])));
  assert.equal(received.filter((row) => row.claim).length, 1);
  assert.deepEqual(await state(bank), { status: 'delivered', paymentStatus: 'paid', stock: 8, sold: 2 });
  await create(bank, newClaim(bank, { lines: [{ orderItemId: bank.itemId, quantity: 3 }], requestedAmount: 300000 }), 409);
  const firstRefund = refundBody(bank, bankReceipt, 40000, { caseId: claim.id });
  const replayRefund = await Promise.all([refund(firstRefund, [200, 201]), refund(firstRefund, [200, 201])]);
  assert.equal(replayRefund[0].refund.id, replayRefund[1].refund.id);
  await refund({ ...firstRefund, amount: 50000 }, 409);
  await action(claim, 'resolve', {}, 409);
  await refund(refundBody(bank, bankReceipt, 60001, { caseId: claim.id }), 409);
  const remainingRefunds = await Promise.all([1, 2].map(() => refund(refundBody(bank, bankReceipt, 60000, { caseId: claim.id }), [201, 409])));
  assert.equal(remainingRefunds.filter((row) => row.refund).length, 1);
  await action(claim, 'resolve');
  await refund(refundBody(bank, bankReceipt, 1, { caseId: claim.id }), 409);
  assert.equal((await request(`admin/after-sales/finance/${bank.id}`)).sources[0].refundableAmount, 225000);
  passed('Concurrent return receipt restores exact inventory once; partial refunds/replay obey approval and source caps');

  const rest = (await create(bank, newClaim(bank, { lines: [{ orderItemId: bank.itemId, quantity: 2 }], requestedAmount: 200000 }))).claim;
  await action(rest, 'approve', { approvedAmount: 225000 }, 400); // Selected partial merchandise excludes original shipping fee.
  await action(rest, 'approve', { approvedAmount: 200000 });
  await action(rest, 'receive', { lines: [{ orderItemId: bank.itemId, restock: false }] });
  assert.deepEqual(await state(bank), { status: 'returned', paymentStatus: 'paid', stock: 8, sold: 0 });
  await refund(refundBody(bank, bankReceipt, 200000, { caseId: rest.id }));
  const shippingClaim = (await create(bank, newClaim(bank, { kind: 'complaint', requestedAmount: 25000 }))).claim;
  await action(shippingClaim, 'approve', { approvedAmount: 25000 });
  await refund(refundBody(bank, bankReceipt, 25000, { caseId: shippingClaim.id }));
  assert.equal((await state(bank)).paymentStatus, 'refunded');
  passed('Damaged returned items reduce sold quantity without adding sellable stock; full returned order is tracked separately from cash');

  const exchangeOrder = await newOrder({ method: 'cod', status: 'delivered', quantity: 1 });
  const exchange = (await create(exchangeOrder, newClaim(exchangeOrder, { kind: 'exchange', requestedAmount: 0 }))).claim;
  await action(exchange, 'approve');
  await action(exchange, 'resolve', { carrier: 'Fixture', trackingCode: 'REPLACEMENT' }, 409);
  await action(exchange, 'receive', { lines: [{ orderItemId: exchangeOrder.itemId, restock: false }] });
  const exchangeStock = await state(exchangeOrder);
  await client.query('UPDATE products SET stock=0 WHERE id=$1', [exchangeOrder.productId]);
  await action(exchange, 'resolve', { carrier: 'Fixture', trackingCode: 'REPLACEMENT' }, 409);
  await client.query('UPDATE products SET stock=$2 WHERE id=$1', [exchangeOrder.productId, exchangeStock.stock]);
  await action(exchange, 'resolve', { carrier: 'Fixture', trackingCode: 'REPLACEMENT' });
  await action(exchange, 'resolve', { carrier: 'Fixture', trackingCode: 'REPLACEMENT' }, 409);
  assert.equal((await state(exchangeOrder)).stock, exchangeStock.stock - 1);
  passed('Exchange requires received goods and available replacement stock; separate tracking dispatch consumes inventory only once');

  const complaint = (await create(exchangeOrder, newClaim(exchangeOrder, { kind: 'complaint', requestedAmount: 0 }))).claim;
  const complaintStock = await state(exchangeOrder);
  await action(complaint, 'approve'); await action(complaint, 'receive', { lines: [] }, 409); await action(complaint, 'resolve');
  assert.deepEqual(await state(exchangeOrder), complaintStock);
  const rejected = (await create(bank, newClaim(bank, { kind: 'complaint', requestedAmount: 0 }))).claim;
  await action(rejected, 'reject');
  await action(rejected, 'approve', {}, 409);
  const old = await newOrder({ method: 'cod', status: 'delivered' });
  await client.query('UPDATE orders SET "deliveredAt"=CURRENT_TIMESTAMP-INTERVAL \'8 days\' WHERE id=$1', [old.id]);
  await create(old, newClaim(old), 409);
  passed('Complaints, rejection and configured return window work without unintended stock changes');

  const excessOrder = await newOrder(); const excessReceipt = await receiptFor(excessOrder, 400000);
  const excessBody = refundBody(excessOrder, excessReceipt, 75000, { source: 'receipt_excess', orderId: undefined });
  await refund({ ...excessBody, amount: 75001 }, 409); await refund(excessBody);
  await refund({ ...excessBody, reference: `OUT-${crypto.randomUUID()}`, amount: 1 }, 409);
  assert.equal((await state(excessOrder)).paymentStatus, 'paid');
  const pending = await newOrder(); const partial = await receiptFor(pending, 50000);
  await refund(refundBody(pending, partial, 50000));
  assert.deepEqual(await state(pending), { status: 'cancelled', paymentStatus: 'refunded', stock: 10, sold: 0 });
  await request(`orders/${pending.id}/cancel`, { role: 'buyer', method: 'PUT', status: 409 });
  const unmatched = await newOrder(); const unmatchedReceipt = await receiptFor(unmatched, 50000, false);
  await refund(refundBody(unmatched, unmatchedReceipt, 20000, { source: 'receipt_excess', orderId: undefined }));
  await post(`admin/payments/receipts/${unmatchedReceipt.id}/allocate`, { orderId: unmatched.id, note: 'Only remaining unreturned money can be allocated' }, 200);
  assert.equal((await request(`admin/payments/orders/${unmatched.id}`)).allocatedAmount, 30000);
  passed('Excess/unmatched funds are refunded independently; partial pre-shipping refund closes reservation; returned funds cannot be allocated again');

  const bankLegacy = await newOrder();
  await client.query('UPDATE orders SET "paymentStatus"=$2,status=$3,"deliveredAt"=CURRENT_TIMESTAMP WHERE id=$1', [bankLegacy.id, 'paid', 'delivered']);
  const legacyReceipt = await receiptFor(bankLegacy, bankLegacy.amount, false);
  const legacyAllocation = await post(`admin/payments/receipts/${legacyReceipt.id}/allocate`, { orderId: bankLegacy.id,
    note: 'Explicit verification of original bank statement for legacy order', verifyLegacy: true }, 200);
  assert.ok(legacyAllocation.allocated); assert.ok(legacyAllocation.receipt.allocation.legacyVerification);
  assert.equal((await state(bankLegacy)).status, 'delivered');
  const legacyClaim = (await create(bankLegacy, newClaim(bankLegacy, { kind: 'complaint', requestedAmount: bankLegacy.amount,
    lines: [{ orderItemId: bankLegacy.itemId, quantity: 3 }] }))).claim;
  await action(legacyClaim, 'approve', { approvedAmount: bankLegacy.amount });
  await refund(refundBody(bankLegacy, legacyReceipt, bankLegacy.amount, { caseId: legacyClaim.id }));
  assert.equal((await state(bankLegacy)).paymentStatus, 'refunded');
  passed('Legacy bank payments require explicit full-statement verification before their funds can enter the refund ledger');

  const codOrder = await newOrder({ method: 'cod', status: 'shipping' });
  await codRecord(codOrder, cod(codOrder, 'collection', codOrder.amount), 409);
  await request(`seller/orders/${codOrder.id}/deliver`, { role: 'seller', method: 'PUT', body: {} });
  assert.equal((await state(codOrder)).paymentStatus, 'unpaid');
  const collection = cod(codOrder, 'collection', codOrder.amount);
  for (const invalid of [{ amount: true }, { amount: -1 }, { amount: 0 }, { amount: 1.5 }, { occurredAt: '2026-02-30T00:00:00Z' }, { evidence: '' }, { fee: 10 }]) await codRecord(codOrder, { ...collection, ...invalid }, 400);
  await codRecord(codOrder, cod(codOrder, 'remittance', 300000, 25000), 409);
  const collectionRows = await Promise.all([codRecord(codOrder, collection, [200, 201]), codRecord(codOrder, collection, [200, 201])]);
  assert.equal(collectionRows[0].entry.id, collectionRows[1].entry.id);
  await codRecord(codOrder, { ...collection, amount: 10 }, 409);
  const codClaim = (await create(codOrder, newClaim(codOrder))).claim;
  await action(codClaim, 'approve', { approvedAmount: 100000 });
  await action(codClaim, 'receive', { lines: [{ orderItemId: codOrder.itemId, restock: true }] });
  await refund(refundBody(codOrder, null, 100000, { source: 'cod_order', receiptId: undefined, caseId: codClaim.id }), 409);
  const remittance = cod(codOrder, 'remittance', 100000, 10000);
  await codRecord(codOrder, remittance); await codRecord(codOrder, remittance, 200);
  await post('admin/payments/receipts', { orderId: bank.id, amount: 100000, reference: remittance.reference,
    receivedAt: new Date().toISOString(), transferContent: 'Duplicate bank credit fixture', evidence: 'Synthetic statement already used in COD ledger' }, 409);
  await codRecord(codOrder, cod(codOrder, 'remittance', 1, 0, { reference: bankReceipt.reference }), 409);
  await codRecord(codOrder, cod(codOrder, 'remittance', 215001), 409);
  await codRecord(codOrder, cod(codOrder, 'remittance', 200000, 15000));
  const codFinance = await request(`admin/after-sales/finance/${codOrder.id}`);
  assert.equal(codFinance.cod.remittedAmount, 300000); assert.equal(codFinance.cod.carrierFee, 25000); assert.equal(codFinance.cod.pendingRemittance, 0);
  await refund(refundBody(codOrder, null, 100000, { source: 'cod_order', receiptId: undefined, caseId: codClaim.id }));
  passed('COD delivery, collection and bank remittance stay separate; duplicate/invalid/over-remittance and unfunded refunds are blocked');

  const difference = await newOrder({ method: 'cod', status: 'delivered' });
  await codRecord(difference, cod(difference, 'collection', 300000));
  const summary = await codRecord(difference, cod(difference, 'remittance', 275000, 25000));
  assert.equal(summary.summary.collectionDifference, -25000); assert.equal(summary.summary.status, 'reconciled');
  assert.equal((await state(difference)).paymentStatus, 'unpaid');
  const legacy = await newOrder({ method: 'cod', status: 'delivered' });
  await client.query('UPDATE orders SET "paymentStatus"=$2 WHERE id=$1', [legacy.id, 'paid']);
  const legacySummary = await request(`admin/after-sales/finance/${legacy.id}`);
  assert.ok(legacySummary.cod.legacyUnverified); assert.equal(legacySummary.cod.remittedAmount, 0); assert.equal(legacySummary.cod.refundableAmount, 0);
  assert.ok((await request('seller/after-sales/cod', { role: 'seller' })).items.every((row) => !Object.hasOwn(row, 'evidence')));
  const revenue = await request('seller/orders/stats', { role: 'seller' });
  assert.equal(revenue.revenue.gross, 200000);
  assert.equal(revenue.revenue.settledOrders, 1);
  const missingShipment = await newOrder({ method: 'cod', status: 'delivered' });
  await client.query('UPDATE orders SET carrier=NULL,"trackingCode"=NULL WHERE id=$1', [missingShipment.id]);
  await codRecord(missingShipment, cod(missingShipment, 'collection', missingShipment.amount), 400);
  await codRecord(missingShipment, cod(missingShipment, 'collection', missingShipment.amount, 0,
    { carrier: 'Verified historical carrier', trackingCode: 'VERIFIED-LEGACY-SHIPMENT' }));
  const sellerOrders = await request('seller/orders', { role: 'seller' });
  assert.equal(sellerOrders.items.find((row) => row.id === missingShipment.id).recognizedRevenue, 0);
  passed('COD shortages remain visible after settlement; legacy paid flags never imply verified remittance or refundable cash');

  for (const [table, id] of [['refunds', firstRefund.reference], ['cod_entries', collection.reference]]) {
    await assert.rejects(client.query(`UPDATE ${table} SET amount=1 WHERE reference=upper($1)`, [id]), (error) => error.code === '23514');
  }
  await assert.rejects(client.query(`INSERT INTO refunds("orderId","receiptId",source,reference,amount,"occurredAt",evidence,note,"recordedBy") VALUES($1,$2,'bank_order',$3,999999,CURRENT_TIMESTAMP,'Fixture evidence','Fixture direct DB bypass',$4)`, [bank.id, bankReceipt.id, `BYPASS-${crypto.randomUUID()}`, ids.admin]), (error) => error.code === '23514');
  passed('PostgreSQL enforces immutable refund/COD facts and rejects direct inserts above source balances');
  const digest = async () => {
    const values = {};
    for (const table of ['return_cases', 'return_lines', 'cod_entries', 'refunds', 'orders', 'products', 'bank_receipts', 'payment_allocations']) {
      values[table] = (await client.query(`SELECT md5(coalesce(string_agg(row_to_json(t)::text,chr(10) ORDER BY id),'')) AS digest FROM ${table} t`)).rows[0].digest;
    }
    return values;
  };
  const before = await digest(); migrate();
  assert.deepEqual(await digest(), before);
  passed('Repeated migration preserves return history, inspection, replacement, refunds, COD evidence and existing inventory');
}
module.exports = { verifyAfterSales };

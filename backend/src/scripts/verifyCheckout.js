const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');

// Only invoked with verify:db's owned disposable PostgreSQL database.
const verifyCheckout = async ({ client, baseUrl, jwtSecret, passed }) => {
  assert.match((await client.query('SELECT current_database() AS name')).rows[0].name,
    /^souvenirshop_verify_[a-z0-9_]+$/);
  const buyerId = crypto.randomUUID();
  const sellerIds = [crypto.randomUUID(), crypto.randomUUID()];
  const shopIds = [crypto.randomUUID(), crypto.randomUUID()];
  const productIds = [crypto.randomUUID(), crypto.randomUUID()];
  const userIds = [buyerId, ...sellerIds];
  const token = jwt.sign({ id: buyerId }, jwtSecret, { expiresIn: '5m' });
  const shippingAddress = { name: 'Checkout fixture', phone: '0900000000', address: '1 Test Street', city: 'Hà Nội' };
  const items = productIds.map((productId) => ({ productId, quantity: 1 }));
  const request = async (route, { body, key, status = 200 } = {}) => {
    const response = await fetch(`${baseUrl}/api/${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`,
        ...(key ? { 'Idempotency-Key': key } : {}) },
      body: JSON.stringify(body), signal: AbortSignal.timeout(15000),
    });
    const data = await response.json();
    if (Array.isArray(status)) assert.ok(status.includes(response.status), `${route}: HTTP ${response.status}`);
    else assert.equal(response.status, status, `${route}: ${data.error?.code || 'unexpected status'}`);
    return { status: response.status, data };
  };
  const estimate = async (body = { city: shippingAddress.city, items }, status = 200) =>
    (await request('shipping/estimate', { body, status })).data;
  const submit = (quote, { key = `checkout_${crypto.randomUUID()}`, cart = items, status = 201, ...extra } = {}) =>
    request('orders', { key, status, body: {
      items: cart, shippingAddress, paymentMethod: 'cod', quoteFingerprint: quote?.fingerprint, ...extra,
    } });
  const state = async () => ({
    counts: (await client.query(`SELECT
      (SELECT count(*)::int FROM orders WHERE "buyerId"=$1) AS orders,
      (SELECT count(*)::int FROM checkout_attempts WHERE "buyerId"=$1) AS attempts,
      (SELECT count(*)::int FROM order_items WHERE "productId"=ANY($2::uuid[])) AS lines`, [buyerId, productIds])).rows[0],
    products: (await client.query('SELECT id,stock,sold FROM products WHERE id=ANY($1::uuid[]) ORDER BY id', [productIds])).rows,
  });
  const assertStoredTotals = async (orders, quote) => {
    const rows = (await client.query('SELECT id,"shopId",total,"shippingFee" FROM orders WHERE id=ANY($1::uuid[])', [orders.map((order) => order.id)])).rows;
    assert.equal(rows.length, quote.shops.length);
    assert.equal(rows.reduce((sum, row) => sum + Number(row.total) + Number(row.shippingFee), 0), quote.total);
    for (const row of rows) {
      const shop = quote.shops.find((shop) => shop.shopId === row.shopId);
      assert.equal(Number(row.total), shop.subtotal);
      assert.equal(Number(row.shippingFee), shop.fee);
    }
  };

  try {
    for (const [index, id] of userIds.entries()) {
      await client.query('INSERT INTO users (id,name,email,password,role) VALUES ($1,$2,$3,$4,$5)',
        [id, 'Checkout fixture', `checkout-${id}@example.test`, 'fixture-not-a-login-hash', index ? 'seller' : 'buyer']);
    }
    for (let index = 0; index < 2; index += 1) {
      await client.query('INSERT INTO shops (id,"ownerId",name,slug,status) VALUES ($1,$2,$3,$4,$5)',
        [shopIds[index], sellerIds[index], `Checkout shop ${index + 1}`, `checkout-${shopIds[index]}`, 'active']);
      await client.query('INSERT INTO products (id,"shopId",name,price,stock,category,"dataSource") VALUES ($1,$2,$3,300000,10,$4,$5)',
        [productIds[index], shopIds[index], `Checkout product ${index + 1}`, 'Gốm sứ', 'seller']);
    }
    const empty = await state();
    for (const body of [{ city: 'Hà Nội', subtotal: 600000 }, { items }, { city: 'Hà Nội', items: null },
      { city: 'Hà Nội', items: {} }, { city: 'Hà Nội', items: [null] },
      { city: 'Hà Nội', items: [{ productId: 'bad-id', quantity: 1 }] },
      { city: 'Hà Nội', items: [{ productId: productIds[0], quantity: 1.5 }] }]) {
      await estimate(body, 400);
    }
    await submit(null, { status: 400 });
    assert.deepEqual(await state(), empty);
    passed('Checkout rejects missing quotes and malformed carts without changing orders or stock');

    const quote = await estimate({ city: 'Hà Nội', items, subtotal: 9999999, shippingFee: 0 });
    for (const address of [null, [], 'street', { ...shippingAddress, phone: 'abc' },
      { ...shippingAddress, name: {} }, { ...shippingAddress, name: [] },
      { ...shippingAddress, name: 'x'.repeat(101) }, { ...shippingAddress, address: 'x'.repeat(301) },
      { ...shippingAddress, city: 'x'.repeat(101) }, { ...shippingAddress, district: true }]) {
      const invalid = await submit(quote, { shippingAddress: address, status: 400 });
      assert.ok(invalid.data.error.details);
      assert.deepEqual(await state(), empty);
    }
    passed('Checkout rejects malformed addresses before any order, attempt or inventory write');
    assert.equal(quote.subtotal, 600000);
    assert.equal(quote.fee, 50000);
    assert.equal(quote.total, 650000);
    assert.deepEqual(quote.shops.map((shop) => shop.fee), [25000, 25000]);
    assert.equal((await estimate({ city: 'TP. Hồ Chí Minh', items })).total, 660000);
    assert.equal((await estimate({ city: 'Đà Nẵng', items })).total, 680000);
    assert.deepEqual(await state(), empty);
    passed('Real PostgreSQL quote charges each shop separately and ignores client price/fee overrides');

    await client.query('UPDATE products SET price=CASE WHEN id=$1 THEN 400000 ELSE 200000 END WHERE id=ANY($2::uuid[])', [productIds[0], productIds]);
    const equalTotal = await estimate();
    assert.equal(equalTotal.total, quote.total);
    assert.notEqual(equalTotal.fingerprint, quote.fingerprint);
    assert.equal((await submit(quote, { status: 409 })).data.error.code, 'CHECKOUT_QUOTE_CHANGED');
    assert.deepEqual(await state(), empty);
    await client.query('UPDATE products SET price=300000 WHERE id=ANY($1::uuid[])', [productIds]);
    await client.query('UPDATE products SET "salePrice"=100000 WHERE id=$1', [productIds[0]]);
    assert.equal((await submit(quote, { status: 409 })).data.error.code, 'CHECKOUT_QUOTE_CHANGED');
    await client.query('UPDATE products SET "salePrice"=NULL WHERE id=$1', [productIds[0]]);
    passed('Price and sale-price changes invalidate a quote and roll back the checkout attempt');

    await client.query('UPDATE products SET stock=0 WHERE id=$1', [productIds[1]]);
    const noStock = await state();
    assert.equal((await submit(quote, { status: 409 })).data.error.code, 'INSUFFICIENT_STOCK');
    assert.deepEqual(await state(), noStock);
    await client.query('UPDATE products SET stock=10,"isActive"=false WHERE id=$1', [productIds[1]]);
    assert.equal((await estimate(undefined, 409)).error.code, 'PRODUCT_UNAVAILABLE');
    assert.equal((await submit(quote, { status: 409 })).data.error.code, 'PRODUCT_UNAVAILABLE');
    await client.query('UPDATE products SET "isActive"=true WHERE id=$1', [productIds[1]]);
    await client.query("UPDATE shops SET status='suspended' WHERE id=$1", [shopIds[1]]);
    assert.equal((await estimate(undefined, 409)).error.code, 'SHOP_NOT_ACTIVE');
    assert.equal((await submit(quote, { status: 409 })).data.error.code, 'SHOP_NOT_ACTIVE');
    await client.query("UPDATE shops SET status='active' WHERE id=$1", [shopIds[1]]);
    assert.deepEqual(await state(), empty);
    passed('Checkout rechecks stock, product availability and shop status atomically before creating any order');

    const key = `checkout_${crypto.randomUUID()}`;
    const concurrent = await Promise.all([submit(quote, { key, status: [200, 201], shippingFee: 0 }),
      submit(quote, { key, status: [200, 201], shippingFee: 0 })]);
    assert.deepEqual(concurrent.map((response) => response.status).sort(), [200, 201]);
    assert.deepEqual(concurrent.map((response) => response.data.orders.map((order) => order.id).sort())[0],
      concurrent.map((response) => response.data.orders.map((order) => order.id).sort())[1]);
    await assertStoredTotals(concurrent[0].data.orders, quote);
    const completed = await state();
    assert.deepEqual(completed.counts, { orders: 2, attempts: 1, lines: 2 });
    assert.ok(completed.products.every((product) => product.stock === 9 && product.sold === 1));
    passed('Two concurrent identical submissions persist exactly two shop orders totalling 650000 and deduct stock once');

    await client.query('UPDATE products SET price=999999,stock=0 WHERE id=ANY($1::uuid[])', [productIds]);
    await client.query("UPDATE shops SET status='suspended' WHERE id=ANY($1::uuid[])", [shopIds]);
    const beforeReplay = await state();
    const replay = await submit(quote, { key, status: 200 });
    assert.equal(replay.data.idempotentReplay, true);
    await assertStoredTotals(replay.data.orders, quote);
    assert.equal((await submit(quote, { key, status: 409, note: 'Different request' })).data.error.code, 'IDEMPOTENCY_KEY_REUSED');
    assert.equal((await submit(equalTotal, { key, status: 409 })).data.error.code, 'IDEMPOTENCY_KEY_REUSED');
    assert.deepEqual(await state(), beforeReplay);
    await client.query('UPDATE products SET price=300000,stock=10 WHERE id=ANY($1::uuid[])', [productIds]);
    await client.query("UPDATE shops SET status='active' WHERE id=ANY($1::uuid[])", [shopIds]);
    passed('Retry recovers the original orders after prices/stock/shop status change; changed payloads cannot reuse the key');

    for (const [price, expectedFee] of [[499999, 25000], [500000, 0]]) {
      await client.query('UPDATE products SET price=$2 WHERE id=$1', [productIds[0], price]);
      assert.equal((await estimate({ city: 'Hà Nội', items: [items[0]] })).fee, expectedFee);
    }
    await client.query('UPDATE products SET price=300000 WHERE id=$1', [productIds[0]]);
    const duplicateCart = [items[0], items[0], items[1]];
    const duplicateQuote = await estimate({ city: 'Hà Nội', items: duplicateCart });
    assert.equal(duplicateQuote.subtotal, 900000);
    assert.equal(duplicateQuote.fee, 25000);
    assert.equal(duplicateQuote.total, 925000);
    const merged = await submit(duplicateQuote, { cart: duplicateCart });
    await assertStoredTotals(merged.data.orders, duplicateQuote);
    const storedLines = (await client.query('SELECT "productId",quantity,price FROM order_items WHERE "orderId"=ANY($1::uuid[])', [merged.data.orders.map((order) => order.id)])).rows;
    assert.equal(storedLines.length, 2);
    assert.equal(storedLines.find((line) => line.productId === productIds[0]).quantity, 2);
    passed('Exact 500000 thresholds and duplicate product rows preserve per-shop totals and quantities');

    await client.query('UPDATE products SET stock=1,price=1000 WHERE id=$1', [productIds[0]]);
    const lastItemQuote = await estimate({ city: 'Hà Nội', items: [items[0]] });
    const beforeRace = await state();
    const races = await Promise.all([submit(lastItemQuote, { cart: [items[0]], status: [201, 409] }),
      submit(lastItemQuote, { cart: [items[0]], status: [201, 409] })]);
    assert.deepEqual(races.map((response) => response.status).sort(), [201, 409]);
    assert.equal(races.find((response) => response.status === 409).data.error.code, 'INSUFFICIENT_STOCK');
    const afterRace = await state();
    assert.equal(afterRace.counts.orders, beforeRace.counts.orders + 1);
    assert.equal(afterRace.counts.attempts, beforeRace.counts.attempts + 1);
    assert.equal(afterRace.products.find((product) => product.id === productIds[0]).stock, 0);
    assert.equal(afterRace.products.find((product) => product.id === productIds[0]).sold,
      beforeRace.products.find((product) => product.id === productIds[0]).sold + 1);
    passed('Competing checkout keys for the last item cannot oversell or leave a failed checkout attempt');

    await client.query('UPDATE products SET stock=10 WHERE id=ANY($1::uuid[])', [productIds]);
    const formatted = { ...shippingAddress, phone: '+84 (912) 345-678' };
    const legacyKey = `checkout_${crypto.randomUUID()}`;
    const currentQuote = await estimate();
    const saved = await submit(currentQuote, { key: legacyKey, shippingAddress: formatted });
    assert.ok(saved.data.orders.every((order) => order.shippingAddress.phone === '+84912345678'));
    // Recreate the historical hash independently, as stored by the previous release.
    const historicalHash = crypto.createHash('sha256').update(JSON.stringify({
      items: [...items].sort((a, b) => a.productId.localeCompare(b.productId)),
      shippingAddress: { name: formatted.name, phone: '+84(912)345-678', address: formatted.address, district: '', city: formatted.city },
      paymentMethod: 'cod', note: '', quoteFingerprint: currentQuote.fingerprint,
    })).digest('hex');
    await client.query('UPDATE checkout_attempts SET "requestHash"=$1 WHERE "buyerId"=$2 AND "idempotencyKey"=$3', [historicalHash, buyerId, legacyKey]);
    const beforeLegacyReplay = await state();
    const legacyReplay = await submit(currentQuote, { key: legacyKey, shippingAddress: formatted, status: 200 });
    assert.deepEqual(legacyReplay.data.orders.map((order) => order.id).sort(), saved.data.orders.map((order) => order.id).sort());
    await submit(currentQuote, { key: legacyKey, shippingAddress: { ...formatted, address: 'Different Street' }, status: 409 });
    assert.deepEqual(await state(), beforeLegacyReplay);
    passed('Normalized phone values persist and pre-upgrade checkout retries recover without duplicate orders');
  } finally {
    await client.query('DELETE FROM notification_outbox WHERE "userId"=ANY($1::uuid[])', [userIds]);
    await client.query('DELETE FROM checkout_attempts WHERE "buyerId"=$1', [buyerId]);
    await client.query('DELETE FROM inventory_movements WHERE "shopId"=ANY($1::uuid[])', [shopIds]);
    await client.query('DELETE FROM order_items WHERE "productId"=ANY($1::uuid[])', [productIds]);
    await client.query('DELETE FROM orders WHERE "buyerId"=$1', [buyerId]);
    await client.query('DELETE FROM products WHERE id=ANY($1::uuid[])', [productIds]);
    await client.query('DELETE FROM shops WHERE id=ANY($1::uuid[])', [shopIds]);
    await client.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [userIds]);
  }
};

module.exports = { verifyCheckout };

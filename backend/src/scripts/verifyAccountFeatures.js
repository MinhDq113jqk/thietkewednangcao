const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');

// Called only by verify:db using its disposable PostgreSQL database.
async function verifyAccountFeatures({ client, baseUrl, jwtSecret, passed }) {
  const database = (await client.query('SELECT current_database() AS name')).rows[0].name;
  assert.match(database, /^souvenirshop_verify_[a-z0-9_]+$/);
  const buyer = crypto.randomUUID();
  const other = crypto.randomUUID();
  const seller = crypto.randomUUID();
  const shop = crypto.randomUUID();
  for (const [id, role] of [[buyer, 'buyer'], [other, 'buyer'], [seller, 'seller']]) await client.query('INSERT INTO users (id,name,email,password,role) VALUES ($1,$2,$3,$4,$5)', [id, 'Feature fixture', `${id}@example.test`, 'not-a-login-hash', role]);
  await client.query('INSERT INTO shops (id,"ownerId",name,slug,status) VALUES ($1,$2,$3,$4,$5)', [shop, seller, 'Feature fixture shop', `fixture-${shop}`, 'active']);
  const token = (id) => jwt.sign({ id }, jwtSecret, { expiresIn: '10m' });
  const request = async (route, { user = buyer, body, method = 'GET', status = 200 } = {}) => {
    const response = await fetch(`${baseUrl}/api/${route}`, { method, headers: { Authorization: `Bearer ${token(user)}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000) });
    assert.equal(response.status, status, `${method} ${route}`);
    return response.json();
  };
  const productInput = { name: 'Feature product', category: 'Gốm sứ', price: 100000, stock: 10, images: ['/uploads/first.png', '/uploads/second.png'] };
  for (const patch of [{ price: true }, { salePrice: 'abc' }, { stock: [] }, { stock: null }]) await request('seller/products', { method: 'POST', user: seller, body: { ...productInput, ...patch }, status: 400 });
  const product = await request('seller/products', { method: 'POST', user: seller, body: productInput, status: 201 });
  const edited = await request(`seller/products/${product.id}`, { method: 'PUT', user: seller, body: { name: 'Edited feature product' } });
  assert.deepEqual(edited.images, productInput.images);
  await request(`seller/products/${product.id}`, { method: 'PUT', user: seller, body: { images: Array(9).fill('/uploads/first.png') }, status: 400 });
  passed('Product HTTP validation rejects coercion and partial updates preserve multiple images');

  const addressInput = { name: 'Feature recipient', phone: '0912345678', detail: '12 Fixture Street', city: 'Hà Nội', isDefault: false };
  for (const patch of [{ phone: 'wrong' }, { city: '' }, { name: [] }, { isDefault: 'false' }]) await request('users/addresses', { method: 'POST', body: { ...addressInput, ...patch }, status: 400 });
  const first = await request('users/addresses', { method: 'POST', body: addressInput, status: 201 });
  assert.equal(first.isDefault, true);
  await Promise.all(Array.from({ length: 8 }, (_, index) => request('users/addresses', { method: 'POST', body: { ...addressInput, name: `Concurrent recipient ${index}`, isDefault: true }, status: 201 })));
  let addresses = await request('users/addresses');
  assert.equal(addresses.filter((row) => row.isDefault).length, 1);
  const current = addresses.find((row) => row.isDefault);
  assert.equal((await request(`users/addresses/${current.id}`, { method: 'PUT', body: { ...addressInput, isDefault: true } })).isDefault, true);
  await request(`users/addresses/${current.id}`, { user: other, method: 'PUT', body: addressInput, status: 404 });
  await assert.rejects(client.query('UPDATE addresses SET "isDefault"=true WHERE "userId"=$1', [buyer]), { code: '23505' });
  passed('Address ownership, validation, concurrent defaults and database uniqueness hold');

  await client.query(`CREATE FUNCTION fail_feature_address() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.name='Forced address failure' THEN RAISE EXCEPTION 'synthetic address failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER fail_feature_address BEFORE INSERT ON addresses FOR EACH ROW EXECUTE FUNCTION fail_feature_address()`);
  try {
    await request('users/addresses', { method: 'POST', body: { ...addressInput, name: 'Forced address failure', isDefault: true }, status: 500 });
    addresses = await request('users/addresses');
    assert.deepEqual(addresses.filter((row) => row.isDefault).map((row) => row.id), [current.id]);
  } finally { await client.query('DROP TRIGGER fail_feature_address ON addresses; DROP FUNCTION fail_feature_address()'); }
  await request(`users/addresses/${current.id}`, { method: 'DELETE' });
  addresses = await request('users/addresses');
  assert.equal(addresses.filter((row) => row.isDefault).length, 1);
  passed('A failed address save rolls back the old default and deleting it elects a replacement');

  const orders = [];
  for (let index = 0; index < 8; index++) {
    const orderId = crypto.randomUUID(); orders.push(orderId);
    await client.query('INSERT INTO orders (id,"buyerId","shopId",total,status) VALUES ($1,$2,$3,100000,$4)', [orderId, buyer, shop, index === 7 ? 'pending' : 'delivered']);
    await client.query('INSERT INTO order_items ("orderId","productId",name,price,quantity) VALUES ($1,$2,$3,100000,1)', [orderId, product.id, productInput.name]);
  }
  const body = { productId: product.id, rating: 5, comment: 'Useful fixture review' };
  await request(`orders/${orders[0]}/reviews`, { user: other, method: 'POST', body, status: 404 });
  await request(`orders/${orders[7]}/reviews`, { method: 'POST', body, status: 409 });
  await request(`orders/${orders[0]}/reviews`, { method: 'POST', body: { ...body, productId: crypto.randomUUID() }, status: 400 });
  for (const rating of [0, 6, 1.5, true, '5']) await request(`orders/${orders[0]}/reviews`, { method: 'POST', body: { ...body, rating }, status: 400 });
  const duplicate = await Promise.all([1, 2].map(async () => (await fetch(`${baseUrl}/api/orders/${orders[0]}/reviews`, { method: 'POST', headers: { Authorization: `Bearer ${token(buyer)}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).status));
  assert.deepEqual(duplicate.sort(), [201, 409]);
  for (let index = 1; index < 7; index++) await request(`orders/${orders[index]}/reviews`, { method: 'POST', body: { ...body, rating: index % 2 ? 1 : 5 }, status: 201 });
  await assert.rejects(client.query('INSERT INTO reviews ("orderId","productId","userId",rating) VALUES ($1,$2,$3,5)', [orders[0], product.id, buyer]), { code: '23505' });
  const reviews = await request(`products/${product.id}/reviews?page=2&limit=5`);
  assert.equal(reviews.total, 7); assert.equal(reviews.items.length, 2); assert.equal(reviews.totalPages, 2);
  assert.equal(reviews.averageRating, 3.29);
  assert.ok(reviews.items.every((review) => !review.orderId && !review.userId && !review.user.email));
  const aggregate = (await client.query('SELECT rating,"reviewCount" FROM shops WHERE id=$1', [shop])).rows[0];
  assert.equal(aggregate.reviewCount, 7); assert.ok(Math.abs(Number(aggregate.rating) - 23 / 7) < 0.001);
  assert.equal((await request(`orders/${orders[0]}/reviews`)).length, 1);
  await request(`orders/${orders[0]}/reviews`, { user: other, status: 404 });
  await request(`products/${product.id}/reviews?page=abc`, { status: 400 });
  passed('Verified-purchase reviews enforce ownership, delivery, membership, ratings, concurrent duplicates and pagination');
}
module.exports = { verifyAccountFeatures };

const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { productCategories, getProductImageLabel } = require('../shared/productCatalog.mjs');

// Called by verify:db against its disposable database; no real catalog is modified.
const verifyProductCatalog = async ({ client, baseUrl, jwtSecret, migrate, passed }) => {
  const database = (await client.query('SELECT current_database() AS name')).rows[0].name;
  assert.match(database, /^souvenirshop_verify_[a-z0-9_]+$/);
  const originals = (await client.query('SELECT * FROM products ORDER BY id')).rows;
  const createdIds = [];
  let stockChangedId;
  const request = async (route, { query = {}, body, token, method = 'GET', status = 200 } = {}) => {
    const response = await fetch(`${baseUrl}/api/${route}?${new URLSearchParams(query)}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(response.status, status, `${method} ${route}: unexpected HTTP status`);
    return response.json();
  };
  const ids = (payload) => payload.items.map((product) => product.id).sort();

  try {
    const seeded = await request('products');
    assert.equal(seeded.total, 8);
    assert.ok(seeded.items.every((product) => product.dataSource === 'demo'
      && productCategories.includes(product.category)));
    passed('Demo seed persists canonical categories and explicit demo provenance');

    const ceramics = originals.filter((product) => product.category === 'Gốm sứ')
      .sort((left, right) => Number(left.price) - Number(right.price));
    assert.equal(ceramics.length, 2);
    await client.query('UPDATE products SET category=$2 WHERE id=$1', [ceramics[0].id, 'Gốm']);
    await client.query('UPDATE products SET category=$2 WHERE id=$1', [ceramics[1].id, ' gỐm SỨ ']);
    const expectedIds = ceramics.map((product) => product.id).sort();
    for (const category of ['Gốm', 'Gốm sứ', ' gỐm SỨ ']) {
      const list = await request('products', { query: { category } });
      assert.deepEqual(ids(list), expectedIds);
      assert.equal(list.total, 2);
      assert.ok(list.items.every((product) => product.category === 'Gốm sứ'));
      const search = await request('products/search', { query: { q: 'Gốm sứ', category } });
      assert.deepEqual(ids(search), expectedIds);
    }
    assert.deepEqual(ids(await request('products/search', { query: { q: 'Gốm sứ' } })), expectedIds);
    assert.equal((await request('products', { query: { category: "Gốm' OR 1=1 --" } })).total, 0);
    passed('List and full-text search match mixed legacy categories and old/new category URLs');

    const page = await request('products', { query: { category: 'Gốm', sort: 'price_asc', limit: 1, page: 2 } });
    assert.equal(page.items[0].id, ceramics[1].id);
    assert.equal(page.totalPages, 2);
    const priced = await request('products/search', {
      query: { q: 'Gốm sứ', category: 'Gốm', minPrice: 100000, maxPrice: 200000, sort: 'price_desc' },
    });
    assert.deepEqual(ids(priced), [ceramics[1].id]);
    for (const category of productCategories) {
      const list = await request('products', { query: { category } });
      assert.ok(list.items.every((product) => product.category === category));
      assert.equal(list.total, list.items.length);
    }
    passed('Shared categories, price filters, sorting and pagination use real PostgreSQL results');

    const seller = (await client.query("SELECT id FROM users WHERE email='seller-test@example.com'")).rows[0];
    const token = jwt.sign({ id: seller.id }, jwtSecret, { expiresIn: '5m' });
    const body = {
      name: 'Catalog verification fixture', category: 'Gốm', price: 1000, stock: 1,
      images: ['https://placehold.co/600x600?text=Seller+Fixture'], dataSource: 'demo',
    };
    const product = await request('seller/products', { method: 'POST', token, body, status: 201 });
    createdIds.push(product.id);
    assert.equal(product.category, 'Gốm sứ');
    assert.equal(product.dataSource, 'seller');
    assert.equal(getProductImageLabel(product.images[0]), 'Ảnh minh họa');
    for (const category of productCategories) {
      const edited = await request(`seller/products/${product.id}`, { method: 'PUT', token, body: { category, dataSource: 'demo' } });
      assert.equal(edited.category, category);
      assert.equal(edited.dataSource, 'seller');
      const stored = (await client.query('SELECT category,"dataSource" FROM products WHERE id=$1', [product.id])).rows[0];
      assert.deepEqual(stored, { category, dataSource: 'seller' });
    }
    await request(`seller/products/${product.id}`, { method: 'PUT', token, body: { category: 'Invalid fixture category' }, status: 400 });
    await request('seller/products', { method: 'POST', token, body: { name: 'Missing category', price: 1000, stock: 1 }, status: 400 });
    const sellerList = await request('seller/products', { token });
    assert.equal(sellerList.items.find((item) => item.id === product.id).dataSource, 'seller');
    passed('Seller create/update persist every shared category, reject unknown values and protect provenance');

    const villageId = (await client.query("SELECT id FROM craft_villages WHERE slug='gom-bat-trang'")).rows[0].id;
    await client.query('UPDATE products SET category=$2,"craftVillageId"=$3 WHERE id=$1', [product.id, 'Gốm', villageId]);
    const detail = await request(`products/${product.id}`);
    assert.equal(detail.category, 'Gốm sứ');
    assert.equal(detail.dataSource, 'seller');
    const recommendations = await request('products/recommendations', { query: { categories: 'Gốm', limit: 24 } });
    assert.equal(recommendations.items.find((item) => item.id === product.id).category, 'Gốm sứ');
    const shopProducts = await request('shops/gom-bat-trang-test/products');
    assert.equal(shopProducts.items.find((item) => item.id === product.id).dataSource, 'seller');
    const region = await request('culture/regions/ha-noi');
    assert.equal(region.products.find((item) => item.id === product.id).category, 'Gốm sứ');
    const culture = await request('culture/products', { query: { craftVillageId: villageId } });
    assert.equal(culture.items.find((item) => item.id === product.id).dataSource, 'seller');
    const assistant = await request('assistant/chat', { method: 'POST', body: { message: 'Giá gốm sứ' } });
    assert.ok(assistant.products.length > 0);
    assert.ok(assistant.products.every((item) => item.category === 'Gốm sứ'
      && ['demo', 'seller'].includes(item.dataSource)));
    assert.equal(assistant.products.length, 3);
    passed('Detail, recommendations, shops, culture and assistant return consistent categories and sources');

    const sample = ceramics[0];
    stockChangedId = sample.id;
    await client.query('UPDATE products SET "dataSource"=$2,price=price+1,stock=stock+1 WHERE id=$1', [sample.id, 'legacy']);
    migrate();
    let migrated = (await client.query('SELECT * FROM products WHERE id=$1', [sample.id])).rows[0];
    assert.equal(migrated.dataSource, 'demo');
    assert.equal(Number(migrated.price), Number(sample.price) + 1);
    assert.equal(migrated.stock, sample.stock + 1);
    assert.equal(migrated.category, 'Gốm');
    assert.deepEqual(migrated.updatedAt, sample.updatedAt);

    const duplicate = (await client.query(`
      INSERT INTO products ("shopId",name,price,stock,images,category)
      SELECT "shopId",name,price,stock,images,category FROM products WHERE id=$1 RETURNING id
    `, [sample.id])).rows[0].id;
    createdIds.push(duplicate);
    await client.query('UPDATE products SET "dataSource"=$2 WHERE id=$1', [sample.id, 'legacy']);
    migrate();
    const ambiguous = (await client.query('SELECT "dataSource" FROM products WHERE id=ANY($1::uuid[])', [[sample.id, duplicate]])).rows;
    assert.ok(ambiguous.every((item) => item.dataSource === 'legacy'));
    await client.query('DELETE FROM products WHERE id=$1', [duplicate]);
    await client.query('UPDATE products SET images=$2 WHERE id=$1', [sample.id, ['/uploads/custom-fixture.jpg']]);
    migrate();
    migrated = (await client.query('SELECT "dataSource" FROM products WHERE id=$1', [sample.id])).rows[0];
    assert.equal(migrated.dataSource, 'legacy');
    assert.equal((await client.query('SELECT "dataSource" FROM products WHERE id=$1', [product.id])).rows[0].dataSource, 'seller');
    passed('Source upgrade preserves business data and leaves ambiguous/edited legacy products unclassified');

    await assert.rejects(client.query('UPDATE products SET "dataSource"=$2 WHERE id=$1', [product.id, 'invalid']), { code: '23514' });
    passed('PostgreSQL enforces the product source constraint');
  } finally {
    if (createdIds.length) await client.query('DELETE FROM products WHERE id=ANY($1::uuid[])', [createdIds]);
    for (const product of originals) {
      await client.query('UPDATE products SET category=$2,price=$3,stock=$4,images=$5,"dataSource"=$6 WHERE id=$1',
        [product.id, product.category, product.price, product.stock, product.images, product.dataSource]);
    }
  }
  assert.deepEqual((await client.query('SELECT * FROM products ORDER BY id')).rows,
    originals.map(product => ({ ...product, stockVersion: product.stockVersion + (product.id === stockChangedId ? 2 : 0) })));
  passed('Catalog verification restores disposable business data and preserves monotonic stock revisions');
};

module.exports = { verifyProductCatalog };

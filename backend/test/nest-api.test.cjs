const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { test, after } = require('node:test');

// Routing/guard tests use synthetic repositories and never connect to PostgreSQL.
process.env.DATABASE_URL =
  'postgresql://test:test@127.0.0.1:5432/nest_contract_test';
process.env.JWT_SECRET = crypto.randomBytes(48).toString('base64url');
process.env.JWT_REFRESH_SECRET = crypto.randomBytes(48).toString('base64url');
process.env.REDIS_URL = '';
process.env.NODE_ENV = 'test';
require('reflect-metadata');

const { Module, RequestMethod } = require('@nestjs/common');
const { NestFactory } = require('@nestjs/core');
const {
  PATH_METADATA,
  METHOD_METADATA,
  GUARDS_METADATA,
} = require('@nestjs/common/constants');
const { AppModule } = require('../dist/app.module');
const {
  ProductsService,
} = require('../dist/modules/products/products.service');
const {
  SellerProductsController,
} = require('../dist/modules/products/seller-products.controller');
const {
  AuthGuard,
  OptionalAuthGuard,
} = require('../dist/common/guards/auth.guard');
const { RolesGuard } = require('../dist/common/guards/roles.guard');
const { ROLES_KEY } = require('../dist/common/decorators/roles.decorator');
const {
  ApiExceptionFilter,
} = require('../dist/common/filters/api-exception.filter');
const { DATABASE_MODELS } = require('../dist/database/database.module');
const {
  PRODUCT_REPOSITORY,
  SHOP_REPOSITORY,
  ORDER_ITEM_REPOSITORY,
  REVIEW_REPOSITORY,
} = require('../dist/modules/products/products.providers');
const { sequelize } = require('../dist/database/connection');
const jwt = require('jsonwebtoken');

after(async () => sequelize.close());

test('Nest preserves existing endpoints and declares review authentication requirements', () => {
  const actual = [];
  const seen = new Set();
  const visit = (module) => {
    if (seen.has(module)) return;
    seen.add(module);
    for (const imported of Reflect.getMetadata('imports', module) || [])
      visit(imported);
    for (const controller of Reflect.getMetadata('controllers', module) || []) {
      const prefix = Reflect.getMetadata(PATH_METADATA, controller);
      for (const name of Object.getOwnPropertyNames(controller.prototype)) {
        const handler = controller.prototype[name];
        if (
          name === 'constructor' ||
          !Reflect.hasMetadata(METHOD_METADATA, handler)
        )
          continue;
        const path = [prefix, Reflect.getMetadata(PATH_METADATA, handler)]
          .filter(Boolean)
          .join('/')
          .replace(/\/+$/, '');
        const guards = [
          ...(Reflect.getMetadata(GUARDS_METADATA, controller) || []),
          ...(Reflect.getMetadata(GUARDS_METADATA, handler) || []),
        ];
        const roles =
          Reflect.getMetadata(ROLES_KEY, handler) ||
          Reflect.getMetadata(ROLES_KEY, controller) ||
          [];
        assert.ok(
          !roles.length || guards.includes(RolesGuard),
          `${path} must enforce its role metadata`,
        );
        actual.push({
          method: RequestMethod[Reflect.getMetadata(METHOD_METADATA, handler)],
          path,
          auth: guards.includes(AuthGuard),
          optionalAuth: guards.includes(OptionalAuthGuard),
          roles,
        });
      }
    }
  };
  visit(AppModule);
  const sort = (rows) =>
    rows.sort((a, b) =>
      `${a.method}:${a.path}`.localeCompare(`${b.method}:${b.path}`),
    );
  assert.deepEqual(sort(actual), sort(require('./api-contract.json')));
});

test('Product CRUD runs through Nest controllers, injected providers, guards and exception filters', async (t) => {
  const sellerId = crypto.randomUUID();
  const buyerId = crypto.randomUUID();
  const otherSellerId = crypto.randomUUID();
  const shopId = crypto.randomUUID();
  const otherShopId = crypto.randomUUID();
  const rows = new Map();
  let historyCount = 0;
  let movementCount = 0;
  t.mock.method(require('../dist/models').InventoryMovement, 'count', async () => movementCount);
  let shopStatus = 'active';
  const users = new Map([
    [sellerId, { id: sellerId, role: 'seller', isActive: true }],
    [buyerId, { id: buyerId, role: 'buyer', isActive: true }],
    [otherSellerId, { id: otherSellerId, role: 'seller', isActive: true }],
  ]);
  const products = {
    async create(values) {
      const row = { id: crypto.randomUUID(), variantCount: 1, ...values };
      Object.defineProperties(row, {
        toJSON: { value: () => ({ ...row }) },
        update: { value: async (changes) => Object.assign(row, changes) },
        destroy: { value: async () => rows.delete(row.id) },
      });
      rows.set(row.id, row);
      return row;
    },
    async findOne({ where }) {
      const row = rows.get(where.id);
      return row?.shopId === where.shopId ? row : null;
    },
    async findAll({ where }) {
      return [...rows.values()].filter((row) => row.shopId === where.shopId);
    },
    async findAndCountAll({ where, limit, offset }) {
      const matched = [...rows.values()].filter(row => row.shopId === where.shopId);
      return { rows: matched.slice(offset, offset + limit), count: matched.length };
    },
  };
  const shops = {
    async findOne({ where }) {
      if (where.ownerId === sellerId) return { id: shopId, status: shopStatus };
      if (where.ownerId === otherSellerId)
        return { id: otherShopId, status: 'active' };
      return null;
    },
  };
  const history = {
    async count() {
      return historyCount;
    },
    async findAll() {
      return [];
    },
  };
  class TestApplication {}
  Module({
    controllers: [SellerProductsController],
    providers: [
      ProductsService,
      AuthGuard,
      RolesGuard,
      {
        provide: DATABASE_MODELS,
        useValue: {
          User: {
            async findByPk(id) {
              return users.get(id);
            },
          },
        },
      },
      { provide: PRODUCT_REPOSITORY, useValue: products },
      { provide: SHOP_REPOSITORY, useValue: shops },
      { provide: ORDER_ITEM_REPOSITORY, useValue: history },
      { provide: REVIEW_REPOSITORY, useValue: history },
    ],
  })(TestApplication);
  const app = await NestFactory.create(TestApplication, { logger: false });
  app.useGlobalFilters(new ApiExceptionFilter());
  await app.listen(0, '127.0.0.1');
  const base = `http://127.0.0.1:${app.getHttpServer().address().port}/api/seller/products`;
  const request = async (
    method,
    path = '',
    body,
    userId = sellerId,
    status = 200,
  ) => {
    const headers = { 'Content-Type': 'application/json' };
    if (userId)
      headers.Authorization = `Bearer ${jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '5m' })}`;
    const response = await fetch(`${base}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    const payload = await response.json();
    assert.equal(
      response.status,
      status,
      `${method} ${path}: ${payload.message || ''}`,
    );
    return payload;
  };
  let id;
  try {
    await t.test(
      'guards reject missing authentication, wrong roles and inactive users',
      async () => {
        const missing = await request('GET', '', undefined, null, 401);
        assert.equal(missing.error.status, 401);
        await request('GET', '', undefined, buyerId, 403);
        users.get(sellerId).isActive = false;
        await request('GET', '', undefined, sellerId, 401);
        users.get(sellerId).isActive = true;
      },
    );
    await t.test(
      'Create validates input, enforces shop status and records seller provenance',
      async () => {
        await request(
          'POST',
          '',
          { name: 'Missing category', price: 1000 },
          sellerId,
          400,
        );
        shopStatus = 'suspended';
        await request(
          'POST',
          '',
          { name: 'Test', category: 'Gốm', price: 1000 },
          sellerId,
          403,
        );
        shopStatus = 'active';
        const product = await request(
          'POST',
          '',
          {
            name: 'Test',
            category: 'Gốm',
            price: 1000,
            stock: 2,
            dataSource: 'demo',
          },
          sellerId,
          201,
        );
        id = product.id;
        assert.equal(product.category, 'Gốm sứ');
        assert.equal(product.dataSource, 'seller');
        assert.equal(product.shopId, shopId);
      },
    );
    await t.test(
      'Read lists products belonging to the authenticated seller',
      async () => {
        const listed = await request('GET');
        assert.deepEqual(
          listed.items.map((row) => row.id),
          [id],
        );
        assert.equal(listed.items[0].canDeletePermanently, true);
        assert.equal(listed.total, 1);
        assert.deepEqual(
          (await request('GET', '', undefined, otherSellerId)).items,
          [],
        );
      },
    );
    await t.test(
      'Update validates UUID, ownership, price and immutable provenance',
      async () => {
        await request('PUT', '/not-a-uuid', { price: 1500 }, sellerId, 400);
        await request('PUT', `/${id}`, { price: 1500 }, otherSellerId, 404);
        await request('PUT', `/${id}`, { stock: -1 }, sellerId, 400);
        const updated = await request('PUT', `/${id}`, {
          price: 1500,
          dataSource: 'demo',
          shopId: otherShopId,
        });
        assert.equal(updated.price, 1500);
        assert.equal(updated.dataSource, 'seller');
        assert.equal(updated.shopId, shopId);
      },
    );
    await t.test(
      'Delete hides products, restores them and protects order/review history',
      async () => {
        await request('DELETE', `/${id}`, undefined, otherSellerId, 404);
        await request('DELETE', `/${id}`);
        assert.equal(rows.get(id).isActive, false);
        await request('PUT', `/${id}/restore`, {});
        assert.equal(rows.get(id).isActive, true);
        historyCount = 1;
        await request('DELETE', `/${id}/permanent`, undefined, sellerId, 409);
        assert.ok(rows.has(id));
        historyCount = 0;
        movementCount = 1;
        await request('DELETE', `/${id}/permanent`, undefined, sellerId, 409);
        assert.ok(rows.has(id));
        movementCount = 0;
        await request('DELETE', `/${id}/permanent`);
        assert.equal(rows.has(id), false);
      },
    );
    await t.test(
      'unknown routes return a structured 404 from the Nest filter',
      async () => {
        const result = await request(
          'GET',
          '/missing-route/unknown',
          undefined,
          sellerId,
          404,
        );
        assert.equal(result.error.status, 404);
        assert.equal(result.error.method, 'GET');
      },
    );
  } finally {
    await app.close();
  }
});

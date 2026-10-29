const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { Client } = require('pg');
require('pg').defaults.parseInputDatesAsUTC = true;
require('pg').types.setTypeParser(1114, value => new Date(`${value}Z`));
const { initLocalEnv } = require('./initLocalEnv');
const { verifyProductCatalog } = require('./verifyProductCatalog');
const { verifyCheckout } = require('./verifyCheckout');
const { verifyAccountFeatures } = require('./verifyAccountFeatures');
const { verifyCriticalFixes } = require('./verifyCriticalFixes');
const { verifyCommerce } = require('./verifyCommerce');
const { verifyAfterSales } = require('./verifyAfterSales');
const { verifySettlements } = require('./verifySettlements');
const { verifyOperations } = require('./verifyOperations');
const { verifyCommercialFixes } = require('./verifyCommercialFixes');

const backendDir = path.resolve(__dirname, '../..');
require('../config/loadEnv')();

let checks = 0;
const passed = (name) => {
  checks += 1;
  console.log(`PASS ${name}`);
};
const childEnv = {
  ...process.env,
  NODE_ENV: 'test',
  JWT_SECRET: crypto.randomBytes(48).toString('base64url'),
  JWT_REFRESH_SECRET: crypto.randomBytes(48).toString('base64url'),
  SEED_ACCOUNT_PASSWORD: crypto.randomBytes(24).toString('base64url'),
  REDIS_URL: '',
  SMTP_HOST: '',
  SMTP_USER: '',
  SMTP_PASS: '',
  PAYMENT_EXPIRY_WORKER_ENABLED: 'false',
  NOTIFICATION_WORKER_ENABLED: 'false',
};
const runCli = (file, env, expectedCode = 0, preload) => {
  const result = spawnSync(process.execPath, [...(preload ? ['--require', preload] : []), file], {
    cwd: backendDir,
    env: { ...childEnv, ...env },
    encoding: 'utf8',
    timeout: 90000,
  });
  const errorCode = result.error?.code || result.stderr?.match(/["']code["']\s*:\s*["']([A-Z0-9_]+)["']/)?.[1];
  assert.ok(!result.error && result.status === expectedCode,
    `${file}: exit ${result.status}, expected ${expectedCode}${errorCode ? ` (${errorCode})` : ''}`);
  return `${result.stdout}${result.stderr}`;
};
const connect = async (url) => {
  const client = new Client({ connectionString: url, connectionTimeoutMillis: 5000, statement_timeout: 10000, options: '-c timezone=UTC' });
  await client.connect();
  return client;
};
const schema = async (client) => {
  const columns = await client.query("SELECT table_name,column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,column_name");
  const constraints = await client.query("SELECT conrelid::regclass::text AS table_name,conname,pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE connamespace='public'::regnamespace ORDER BY table_name,conname");
  const indexes = await client.query("SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY tablename,indexname");
  return { columns: columns.rows, constraints: constraints.rows, indexes: indexes.rows };
};
const snapshot = async (client) => {
  const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name");
  const result = {};
  for (const { table_name: table } of tables.rows) {
    const quoted = `"${table.replaceAll('"', '""')}"`;
    result[table] = (await client.query(`SELECT count(*)::int AS count,md5(coalesce(string_agg(row_to_json(t)::text,chr(10) ORDER BY row_to_json(t)::text),'')) AS digest FROM public.${quoted} AS t`)).rows[0];
  }
  return result;
};
const startApi = (env) => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ['--require', path.join(backendDir, 'test/offline-integrations.cjs'), 'dist/main.js'], { cwd: backendDir, env: { ...childEnv, ...env, PORT: '0' }, windowsHide: true });
  let output = '';
  const timer = setTimeout(() => {
    child.kill();
    reject(new Error('API startup timed out'));
  }, 90000);
  child.once('error', (error) => { clearTimeout(timer); reject(error); });
  child.once('exit', () => { clearTimeout(timer); reject(new Error('API exited before listening')); });
  child.stderr.on('data', () => {});
  child.stdout.on('data', (chunk) => {
    output += chunk.toString();
    const ready = output.match(/Server running on port (\d+)/);
    if (ready) {
      clearTimeout(timer);
      resolve({ child, baseUrl: `http://127.0.0.1:${ready[1]}` });
    }
  });
});
const stopApi = async (child) => {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const stopped = new Promise((resolve) => child.once('exit', resolve));
  child.kill();
  await stopped;
};
const health = async (baseUrl, expectedStatus) => {
  const response = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, expectedStatus);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  return response.json();
};

const run = async () => {
  const target = new URL(process.env.DATABASE_URL);
  assert.ok(['postgres:', 'postgresql:'].includes(target.protocol), 'DATABASE_URL must use PostgreSQL');
  assert.ok(['localhost', '127.0.0.1', '::1', '[::1]'].includes(target.hostname), 'verify:db only runs against local PostgreSQL');
  fs.accessSync(path.resolve(backendDir, '../docs/database/schema.sql'), fs.constants.R_OK);
  passed('Canonical SQL schema is available at docs/database/schema.sql');

  const envDir = fs.mkdtempSync(path.join(os.tmpdir(), 'souvenirshop-env-'));
  try {
    fs.copyFileSync(path.join(backendDir, '.env.example'), path.join(envDir, '.env.example'));
    assert.ok(initLocalEnv(envDir));
    const first = fs.readFileSync(path.join(envDir, '.env'), 'utf8');
    const config = require('dotenv').parse(first);
    assert.ok(config.JWT_SECRET.length >= 32 && config.JWT_REFRESH_SECRET.length >= 32);
    assert.ok(config.JWT_SECRET !== config.JWT_REFRESH_SECRET && config.SEED_ACCOUNT_PASSWORD.length >= 32);
    assert.ok(!initLocalEnv(envDir));
    assert.ok(fs.readFileSync(path.join(envDir, '.env'), 'utf8') === first);
    passed('Local env initializes secrets once and preserves existing configuration');
  } finally {
    assert.ok(path.dirname(path.resolve(envDir)) === path.resolve(os.tmpdir()));
    assert.ok(path.basename(envDir).startsWith('souvenirshop-env-'));
    fs.rmSync(envDir, { recursive: true, force: true });
  }

  const prefix = `souvenirshop_verify_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const names = [prefix, `${prefix}_sql`, `${prefix}_flows`];
  const created = new Set();
  const urls = names.map((name) => { const url = new URL(target); url.pathname = `/${name}`; return url.toString(); });
  const admin = await connect(target.toString());
  let client;
  let sqlClient;
  let api;
  const dropTestDatabase = async (name) => {
    assert.ok(created.has(name) && names.includes(name) && /^souvenirshop_verify_[a-z0-9_]+$/.test(name));
    assert.ok(name !== target.pathname.slice(1));
    await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
    created.delete(name);
  };

  try {
    for (const name of names) {
      await admin.query(`CREATE DATABASE "${name}"`);
      created.add(name);
    }
    const env = { DATABASE_URL: urls[0] };
    assert.ok(runCli('dist/main.js', env, 1).includes('DB_SCHEMA_MISSING'));
    passed('Startup rejects an empty database without creating tables or demo data');

    runCli('src/database/migrate.js', env);
    client = await connect(urls[0]);
    const cleanSchema = await schema(client);
    const empty = await snapshot(client);
    assert.equal(Object.keys(empty).length, 35);
    assert.ok(Object.values(empty).every((table) => table.count === 0));
    assert.equal(cleanSchema.constraints.filter((constraint) => constraint.definition.startsWith('FOREIGN KEY')).length, 69);
    runCli('src/database/migrate.js', env);
    assert.deepEqual(await schema(client), cleanSchema);
    assert.deepEqual(await snapshot(client), empty);
    assert.ok(runCli('src/database/check.js', env).includes('"schema":"ready"'));
    passed('Fresh and repeated migrations produce 35 empty tables, 69 foreign keys and a ready schema');

    sqlClient = await connect(urls[1]);
    await sqlClient.query('BEGIN');
    await sqlClient.query(fs.readFileSync(path.resolve(backendDir, '../docs/database/schema.sql'), 'utf8'));
    await sqlClient.query('COMMIT');
    assert.deepEqual(await schema(sqlClient), cleanSchema);
    assert.ok(Object.values(await snapshot(sqlClient)).every((table) => table.count === 0));
    passed('Canonical SQL bootstrap creates the same schema and never inserts demo data');

    api = await startApi(env);
    const ready = await health(api.baseUrl, 200);
    assert.equal(ready.database, 'connected');
    assert.equal(ready.schema, 'ready');
    const products = await fetch(`${api.baseUrl}/api/products`, { signal: AbortSignal.timeout(10000) });
    assert.equal(products.status, 200);
    assert.equal((await products.json()).total, 0);
    assert.deepEqual(await snapshot(client), empty);
    passed('API startup and health use the real DB and leave the empty catalog unchanged');

    runCli('src/database/seed.js', env);
    assert.equal((await snapshot(client)).products.count, 8);
    await verifyProductCatalog({
      client, baseUrl: api.baseUrl, jwtSecret: childEnv.JWT_SECRET,
      migrate: () => runCli('src/database/migrate.js', env), passed,
    });
    await verifyCheckout({ client, baseUrl: api.baseUrl, jwtSecret: childEnv.JWT_SECRET, passed });
    await client.query("UPDATE users SET name='Edited local fixture',role='seller',\"isActive\"=false,password='edited-fixture-hash' WHERE email='buyer-test@example.com'");
    await client.query("UPDATE shops SET name='Edited shop',status='suspended',rating=1,\"reviewCount\"=0");
    await client.query("UPDATE products SET stock=2,sold=43,\"isActive\"=false");
    await client.query("UPDATE regions SET history='Edited region fixture'");
    await client.query("UPDATE craft_villages SET summary='Edited village fixture'");
    await client.query('INSERT INTO products ("shopId",name,price,stock) SELECT "shopId",name,price,1 FROM products LIMIT 1');
    const order = await client.query("INSERT INTO orders (\"buyerId\",\"shopId\",total) SELECT users.id,shops.id,100 FROM users CROSS JOIN shops LIMIT 1 RETURNING id");
    await client.query('INSERT INTO order_items ("orderId","productId",name,price,quantity) SELECT $1,id,name,100,1 FROM products LIMIT 1', [order.rows[0].id]);
    const edited = await snapshot(client);
    runCli('src/database/migrate.js', env);
    runCli('src/database/seed.js', env);
    runCli('src/database/seedCulture.js', env);
    assert.deepEqual(await snapshot(client), edited);
    passed('Migration and both seed commands preserve edited accounts, stock, duplicate products and order history');

    let foreignKeyRejected = false;
    try {
      await client.query('INSERT INTO orders ("buyerId","shopId",total) SELECT $1,id,1 FROM shops LIMIT 1', [crypto.randomUUID()]);
    } catch (error) {
      foreignKeyRejected = error.code === '23503';
    }
    assert.ok(foreignKeyRejected);
    passed('PostgreSQL rejects an order referencing a nonexistent buyer');

    const sqlEnv = { DATABASE_URL: urls[1] };
    runCli('src/database/seed.js', sqlEnv);
    // Prepare a legacy-invalid fixture without the new SKU compatibility trigger
    // rejecting it before the migration under test starts. Re-enable immediately.
    await sqlClient.query('DROP TABLE chat_messages; ALTER TABLE orders DROP COLUMN "trackingCode"; ALTER TABLE products DROP CONSTRAINT products_stock_nonnegative; ALTER TABLE products DISABLE TRIGGER products_inventory_compat; UPDATE products SET stock=-1; ALTER TABLE products ENABLE TRIGGER products_inventory_compat');
    const beforeFailure = await schema(sqlClient);
    const beforeFailureRows = await snapshot(sqlClient);
    assert.ok(runCli('src/database/migrate.js', sqlEnv, 1).includes('23514'));
    assert.deepEqual(await schema(sqlClient), beforeFailure);
    assert.deepEqual(await snapshot(sqlClient), beforeFailureRows);
    passed('Failed migration rolls back earlier DDL and preserves all existing rows');
    await sqlClient.query('UPDATE products SET stock=3');
    runCli('src/database/migrate.js', sqlEnv);
    assert.deepEqual(await schema(sqlClient), cleanSchema);
    passed('Migration upgrades missing tables and columns after invalid fixture data is corrected');

    await client.query('ALTER TABLE orders DROP COLUMN "trackingCode"');
    const incomplete = await health(api.baseUrl, 503);
    assert.equal(incomplete.error.code, 'INTERNAL_SERVER_ERROR');
    assert.equal(incomplete.error.details, undefined);
    assert.ok(runCli('src/database/check.js', env, 1).includes('DB_SCHEMA_MISSING'));
    runCli('src/database/migrate.js', env);
    await health(api.baseUrl, 200);
    passed('Health detects schema drift with 503 and recovers after migration');

    for (const index of ['addresses_one_default_per_user', 'reviews_one_per_order_product_user',
      'bank_receipts_reference_unique', 'payment_allocations_receipt_unique', 'orders_payment_expiry_due']) {
      await client.query(`DROP INDEX "${index}"`);
      const missingIndex = await health(api.baseUrl, 503);
      assert.equal(missingIndex.error.code, 'INTERNAL_SERVER_ERROR');
      assert.equal(missingIndex.error.details, undefined);
      assert.ok(runCli('src/database/check.js', env, 1).includes(index));
      runCli('src/database/migrate.js', env);
      await health(api.baseUrl, 200);
    }
    passed('Health rejects missing address/review/payment/expiry indexes and recovers after migration');
    await client.query('DROP TRIGGER bank_receipts_immutable ON bank_receipts');
    const missingTrigger = await health(api.baseUrl, 503);
    assert.equal(missingTrigger.error.details, undefined);
    assert.ok(runCli('src/database/check.js', env, 1).includes('bank_receipts_immutable'));
    runCli('src/database/migrate.js', env);
    await health(api.baseUrl, 200);
    passed('Health rejects a missing financial immutability trigger and recovers after migration');

    await client.end();
    client = null;
    await dropTestDatabase(names[0]);
    const offline = await health(api.baseUrl, 503);
    assert.equal(offline.error.code, 'INTERNAL_SERVER_ERROR');
    await stopApi(api.child);
    api = null;
    passed('A running API returns 503 when its disposable database disappears');

    const portProbe = net.createServer();
    await new Promise((resolve) => portProbe.listen(0, '127.0.0.1', resolve));
    const closedPort = portProbe.address().port;
    await new Promise((resolve) => portProbe.close(resolve));
    const unavailable = new URL(target);
    unavailable.hostname = '127.0.0.1';
    unavailable.port = String(closedPort);
    assert.ok(runCli('dist/main.js', { DATABASE_URL: unavailable.toString() }, 1).includes('DATABASE_UNAVAILABLE'));
    assert.ok(runCli('dist/main.js', { DATABASE_URL: '' }, 1).includes('DATABASE_URL'));
    passed('Startup fails clearly for an unreachable DB or missing DATABASE_URL');

    // Full application flows run against a third disposable DB, with synthetic accounts.
    const flowEnv = { DATABASE_URL: urls[2], RATE_LIMIT_MAX: '10000', AUTH_RATE_LIMIT_MAX: '1000',
      SMTP_HOST: '', SMTP_USER: '', SMTP_PASS: '', CLOUDINARY_CLOUD_NAME: '',
      CLOUDINARY_API_KEY: '', CLOUDINARY_API_SECRET: '', VIETQR_CLIENT_ID: 'synthetic-test-client',
      VIETQR_API_KEY: 'synthetic-test-key', BANK_ACCOUNT_NO: '0000000000',
      BANK_ACCOUNT_NAME: 'TEST FIXTURE', BANK_ACQ_ID: '970436',
      SMOKE_BUYER_EMAIL: 'buyer-test@example.com', SMOKE_BUYER_PASSWORD: childEnv.SEED_ACCOUNT_PASSWORD };
    runCli('src/database/migrate.js', flowEnv);
    runCli('src/database/seed.js', flowEnv);
    const featureApi = await startApi(flowEnv);
    const featureClient = await connect(urls[2]);
    try {
      await verifyAccountFeatures({ client: featureClient, baseUrl: featureApi.baseUrl, jwtSecret: childEnv.JWT_SECRET, passed });
      await verifyCriticalFixes({ client: featureClient, baseUrl: featureApi.baseUrl, jwtSecret: childEnv.JWT_SECRET, passed });
      await verifyCommerce({ client: featureClient, baseUrl: featureApi.baseUrl, jwtSecret: childEnv.JWT_SECRET, passed,
        migrate: () => runCli('src/database/migrate.js', flowEnv),
        withExpiryWorker: async (verify) => {
          const workerApi = await startApi({ ...flowEnv, PAYMENT_EXPIRY_WORKER_ENABLED: 'true' });
          try { await verify(); } finally { await stopApi(workerApi.child); }
        } });
      await verifyAfterSales({ client: featureClient, baseUrl: featureApi.baseUrl, jwtSecret: childEnv.JWT_SECRET, passed,
        migrate: () => runCli('src/database/migrate.js', flowEnv) });
      await verifySettlements({ client: featureClient, baseUrl: featureApi.baseUrl, jwtSecret: childEnv.JWT_SECRET, passed,
        migrate: () => runCli('src/database/migrate.js', flowEnv) });
      await verifyCommercialFixes({ client: featureClient, baseUrl: featureApi.baseUrl, jwtSecret: childEnv.JWT_SECRET, passed,
        migrate: () => runCli('src/database/migrate.js', flowEnv) });
      await verifyOperations({ client: featureClient, baseUrl: featureApi.baseUrl, jwtSecret: childEnv.JWT_SECRET,
        refreshSecret: childEnv.JWT_REFRESH_SECRET, passed,
        dispatch: () => { assert.ok(runCli('src/scripts/verifyNotificationDispatch.js', flowEnv).includes('PASS Concurrent outbox'));
          passed('Outbox concurrency, failure backoff, retry exhaustion and missing SMTP verified without sending mail'); } });
    }
    finally { await stopApi(featureApi.child); await featureClient.end(); }
    const preload = path.join(backendDir, 'test/offline-integrations.cjs');
    assert.ok(runCli('src/scripts/smokeCoreFlows.js', flowEnv, 0, preload).includes('Core smoke passed'));
    passed('Nest core flows: auth, uploads, shop approval, products, checkout, tracking and payments');
    assert.ok(runCli('src/scripts/smokeVietqrCheckout.js', flowEnv, 0, preload).includes('"ok": true'));
    passed('Nest VietQR checkout runs locally with a synthetic provider response');
  } finally {
    if (api) await stopApi(api.child);
    if (client) await client.end();
    if (sqlClient) await sqlClient.end();
    try {
      for (const name of [...created]) await dropTestDatabase(name);
    } finally {
      await admin.end();
    }
  }
  console.log(JSON.stringify({ status: 'passed', checks, disposableDatabasesRemoved: true }));
};

run().catch((error) => {
  console.error(`Database verification failed: ${error.message}`);
  process.exitCode = 1;
});

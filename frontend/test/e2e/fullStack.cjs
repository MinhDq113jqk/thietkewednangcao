const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn, spawnSync } = require('node:child_process');
const { chromium } = require('playwright');
const { verifyCommerceUI } = require('./commerce.cjs');
const { verifyAfterSalesUI } = require('./afterSales.cjs');
const { verifyOperationsUI } = require('./operations.cjs');
const { verifySettlementsUI } = require('./settlements.cjs');
const { verifyCommercialFixesUI } = require('./commercialFixes.cjs');
const { verifyRoutes } = require('./routes.cjs');
const { verifyUsability } = require('./usability.cjs');
const backend = path.resolve(__dirname, '../../../backend');
const { Client } = require(path.join(backend, 'node_modules/pg'));
require(path.join(backend, 'node_modules/pg')).defaults.parseInputDatesAsUTC = true;
require(path.join(backend, 'node_modules/pg')).types.setTypeParser(1114, value => new Date(`${value}Z`));
const bcrypt = require(path.join(backend, 'node_modules/bcryptjs'));
require(path.join(backend, 'node_modules/dotenv')).config({ path: path.join(backend, '.env') });
const source = path.resolve(__dirname, '../..');
const commercialScope = process.env.E2E_SCOPE === 'commercial-fixes' || process.argv.includes('--commercial-fixes');
const artifacts = process.env.E2E_ARTIFACTS_DIR || path.join(source, 'artifacts/full-stack', commercialScope ? 'commercial-fixes' : process.argv.includes('--routes') ? 'routes' : process.argv.includes('--usability') ? 'usability' : '');
const children = [];
let step = 'setup';
let checks = 0;
const passed = (name) => { checks++; console.log(`PASS ${name}`); };
const stop = async (child) => {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const done = new Promise((resolve) => child.once('exit', resolve));
  child.kill();
  await done;
};
const freePort = () => new Promise((resolve) => {
  const server = net.createServer();
  server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(() => resolve(port)); });
});
const start = (args, cwd, env, ready) => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, args, { cwd, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  children.push(child);
  let output = '';
  let errorOutput = '';
  const timer = setTimeout(() => reject(new Error(`${path.basename(cwd)} test server startup timeout`)), Number(process.env.E2E_STARTUP_TIMEOUT_MS || 45000));
  child.once('error', (error) => { clearTimeout(timer); reject(error); });
  child.once('exit', (code) => { clearTimeout(timer); const reason = errorOutput.match(/(?:Error:|code:)[^\n]+/g)?.slice(0, 3).join(' ') || 'no diagnostic code'; reject(new Error(`${path.basename(cwd)} test server exited (${code}) before readiness: ${reason}`)); });
  child.stderr.on('data', (chunk) => { errorOutput += chunk.toString(); });
  child.stdout.on('data', (chunk) => { output += chunk.toString(); const match = output.match(ready); if (match) { clearTimeout(timer); resolve(match); } });
});

async function run() {
  const target = new URL(process.env.DATABASE_URL);
  assert.ok(['postgres:', 'postgresql:'].includes(target.protocol));
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(target.hostname), 'E2E only uses local PostgreSQL');
  const name = `souvenirshop_e2e_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const databaseUrl = new URL(target); databaseUrl.pathname = `/${name}`;
  const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'souvenirshop-e2e-uploads-'));
  fs.mkdirSync(artifacts, { recursive: true });
  for (const file of ['failure.json', 'failure.png']) fs.rmSync(path.join(artifacts, file), { force: true });
  const env = { ...process.env, DATABASE_URL: databaseUrl.toString(), NODE_ENV: 'test',
    JWT_SECRET: crypto.randomBytes(48).toString('base64url'), JWT_REFRESH_SECRET: crypto.randomBytes(48).toString('base64url'),
    REDIS_URL: '', UPLOAD_PROVIDER: 'local', UPLOAD_DIRECTORY: uploads,
    SMTP_HOST: '', SMTP_USER: '', SMTP_PASS: '', CLOUDINARY_CLOUD_NAME: '', CLOUDINARY_API_KEY: '', CLOUDINARY_API_SECRET: '',
    VIETQR_CLIENT_ID: 'synthetic-client', VIETQR_API_KEY: 'synthetic-key', BANK_ACCOUNT_NO: '0000000000',
    BANK_ACCOUNT_NAME: 'TEST FIXTURE', BANK_ACQ_ID: '970436', PAYMENT_WINDOW_MINUTES: '30',
    PAYMENT_EXPIRY_WORKER_ENABLED: 'false', NOTIFICATION_WORKER_ENABLED: 'false', RATE_LIMIT_MAX: '10000', AUTH_RATE_LIMIT_MAX: '1000' };
  const admin = new Client({ connectionString: target.toString(), connectionTimeoutMillis: 5000 });
  let database;
  let browser;
  let page;
  let created = false;
  let failure;
  try {
    await admin.connect();
    await admin.query(`CREATE DATABASE "${name}"`); created = true;
    const migration = spawnSync(process.execPath, ['src/database/migrate.js'], { cwd: backend, env, encoding: 'utf8', windowsHide: true, timeout: 45000 });
    assert.equal(migration.status, 0, 'Disposable database migration failed');
    database = new Client({ connectionString: databaseUrl.toString(), options: '-c timezone=UTC' }); await database.connect();
    const password = crypto.randomBytes(24).toString('base64url');
    const passwordHash = await bcrypt.hash(password, 10);
    const accounts = {};
    for (const role of ['buyer', 'other', 'seller', 'admin']) {
      const id = crypto.randomUUID(); const email = `${role}-${id}@example.test`;
      await database.query('INSERT INTO users (id,name,email,password,role) VALUES ($1,$2,$3,$4,$5)', [id, `E2E ${role}`, email, passwordHash, role === 'other' ? 'buyer' : role]);
      accounts[role] = { id, email };
    }
    const shopId = crypto.randomUUID();
    await database.query('INSERT INTO shops (id,"ownerId",name,slug,status) VALUES ($1,$2,$3,$4,$5)', [shopId, accounts.seller.id, 'E2E Craft Shop', `e2e-${shopId}`, 'active']);
    for (let i = 1; i <= 3; i++) fs.writeFileSync(path.join(uploads, `image-${i}.png`), Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aVn8AAAAASUVORK5CYII=', 'base64'));
    const frontendPort = await freePort();
    env.CORS_ORIGINS = `http://127.0.0.1:${frontendPort}`;
    const apiReady = await start(['--require', './test/offline-integrations.cjs', 'dist/main.js'], backend, { ...env, PORT: '0' }, /Server running on port (\d+)/);
    const apiUrl = `http://127.0.0.1:${apiReady[1]}`;
    await start(['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(frontendPort), '--strictPort'], source, { ...env, API_PROXY_TARGET: apiUrl }, /Local:\s+http/);
    const base = `http://127.0.0.1:${frontendPort}`;
    browser = await chromium.launch({ headless: true,
      ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    // Real API requests always reach NestJS; only network failures/delays are injected below.
    await context.route('**/*', (route) => {
      const url = new URL(route.request().url());
      return ['127.0.0.1', 'localhost'].includes(url.hostname) ? route.continue() : route.abort();
    });
    page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    const goto = async (route) => { await page.goto(`${base}${route}`); await page.waitForLoadState('networkidle'); };
    const screenshot = async (name) => {
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.screenshot({ path: path.join(artifacts, name), fullPage: true, animations: 'disabled' });
    };
    const login = async (account) => {
      if (!page.url().startsWith(base)) await goto('/login');
      else { await page.getByRole('link', { name: 'Đăng nhập', exact: true }).first().click(); await page.waitForURL(`${base}/login`); await page.waitForLoadState('networkidle'); }
      await page.locator('form input[name=email]').waitFor({ state: 'visible' });
      await page.locator('form input[name=password]').waitFor({ state: 'visible' });
      const names = await page.locator('form input').evaluateAll((inputs) => inputs.map((input) => input.name));
      assert.ok(names.includes('email') && names.includes('password'));
      await page.locator('input[name=email]').fill(account.email);
      await page.locator('input[name=password]').fill(password);
      await page.getByRole('button', { name: 'Đăng nhập an toàn', exact: true }).click();
      await page.waitForURL((url) => url.pathname !== '/login');
      await page.waitForLoadState('networkidle');
    };
    const logout = async () => {
      await page.locator('button[aria-haspopup=menu]').click();
      await page.getByRole('menuitem', { name: 'Đăng xuất', exact: true }).click();
      await page.waitForURL(`${base}/`);
      await page.waitForLoadState('networkidle');
    };
    const openProfile = async () => {
      await page.locator('button[aria-haspopup=menu]').click();
      await page.getByRole('menuitem', { name: 'Hồ sơ cá nhân', exact: true }).click();
      await page.waitForURL(`${base}/profile`);
      await page.waitForLoadState('networkidle');
    };
    const bearer = async (account) => {
      const response = await context.request.post(`${apiUrl}/api/auth/login`, { data: { email: account.email, password } });
      assert.equal(response.status(), 200); return (await response.json()).token;
    };
    if (process.argv.includes('--completion')) {
      step = 'completion API contracts and moderation regression';
      await require('./completion.cjs').verifyCompletion({page,context,database,apiUrl,accounts,shopId,bearer,goto,screenshot,passed});
      assert.deepEqual(pageErrors, []);
      await context.close();
      return;
    }
    if (process.argv.includes('--usability')) {
      step = 'usability';
      await verifyUsability({ page, context, database, apiUrl, accounts, shopId, password, base, passed });
      assert.deepEqual(pageErrors, []);
      await context.close();
      return;
    }
    if (process.argv.includes('--routes')) {
      step = 'route layouts';
      await verifyRoutes({ page, context, database, apiUrl, accounts, shopId, password, base, passed, interactionsOnly: process.argv.includes('--interactions-only') });
      await context.close();
      return;
    }
    if (commercialScope) {
      step = 'tasks 9-11 browser workflows';
      await verifyCommercialFixesUI({ page, database, context, apiUrl, accounts, shopId, goto, login, logout, bearer, screenshot, passed });
      assert.deepEqual(pageErrors, []);
      await context.close();
      return;
    }
    if (process.env.E2E_SCOPE === 'operations') {
      step = 'focused operations workflows';
      const productId = crypto.randomUUID();
      await database.query('INSERT INTO products(id,"shopId",name,price,stock) VALUES($1,$2,$3,100000,100)', [productId,shopId,'Operations UI product']);
      await login(accounts.buyer);
      await verifyOperationsUI({ page, database, apiUrl, accounts, product:{id:productId}, goto, login, logout, screenshot, passed, refreshSecret:env.JWT_REFRESH_SECRET, password });
      assert.deepEqual(pageErrors,[]);
      await context.close();
      return;
    }
    const sellerToken = await bearer(accounts.seller);
    const sellerRequest = async (route, data) => {
      const response = await context.request.put(`${apiUrl}/api/seller/orders/${route}`, { headers: { Authorization: `Bearer ${sellerToken}` }, data });
      assert.equal(response.status(), 200, `Seller operation ${route}`);
    };

    step = 'product CRUD and multiple images';
    await login(accounts.seller);
    await goto('/seller/products/new');
    await page.locator('input[name=name]').fill('E2E Ceramic Cup');
    await page.locator('input[name=price]').fill('abc');
    await page.locator('input[name=stock]').fill('10');
    await page.getByRole('button', { name: 'Lưu sản phẩm', exact: true }).click();
    await page.locator('#product-price-error').waitFor({ state: 'visible' });
    await page.locator('input[name=price]').fill('120000');
    for (let i = 1; i <= 2; i++) { await page.getByLabel('URL ảnh mới', { exact: true }).fill(`/uploads/image-${i}.png`); await page.getByRole('button', { name: 'Thêm ảnh', exact: true }).click(); }
    await page.getByRole('button', { name: 'Lưu sản phẩm', exact: true }).click();
    await page.waitForURL(`${base}/seller/products`);
    const product = (await database.query('SELECT id,images FROM products WHERE "shopId"=$1', [shopId])).rows[0];
    assert.equal(product.images.length, 2);
    await goto(`/seller/products/${product.id}/edit`);
    await page.locator('input[name=name]').fill('E2E Ceramic Cup Edited');
    await page.getByRole('button', { name: 'Chuyển ảnh 2 sang trước' }).click();
    await page.getByRole('button', { name: 'Lưu sản phẩm', exact: true }).click();
    await page.waitForURL(`${base}/seller/products`);
    assert.deepEqual((await database.query('SELECT images FROM products WHERE id=$1', [product.id])).rows[0].images, ['/uploads/image-2.png', '/uploads/image-1.png']);
    await goto(`/seller/products/${product.id}/edit`);
    await page.locator('input[name=name]').fill('E2E Ceramic Cup Final');
    await page.getByRole('button', { name: 'Lưu sản phẩm', exact: true }).click(); await page.waitForURL(`${base}/seller/products`);
    assert.equal((await database.query('SELECT images FROM products WHERE id=$1', [product.id])).rows[0].images.length, 2);
    await goto(`/seller/products/${product.id}/edit`);
    await page.getByRole('button', { name: 'Xóa ảnh 2', exact: true }).click();
    await page.getByLabel('Tải ảnh sản phẩm').setInputFiles({ name: 'image-3.png', mimeType: 'image/png', buffer: fs.readFileSync(path.join(uploads, 'image-3.png')) });
    await page.getByText('Ảnh sản phẩm (2/8)', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Lưu sản phẩm', exact: true }).click(); await page.waitForURL(`${base}/seller/products`);
    await page.getByRole('table').waitFor();
    await page.getByRole('button', { name: 'Ẩn bán sản phẩm', exact: true }).click();
    await page.getByRole('button', { name: 'Khôi phục bán lại', exact: true }).click();
    await page.getByRole('button', { name: 'Ẩn bán sản phẩm', exact: true }).waitFor();
    assert.equal((await database.query('SELECT "isActive" FROM products WHERE id=$1', [product.id])).rows[0].isActive, true);
    await screenshot('seller-products.png');
    passed('Browser Product CRUD: inline errors, add/upload/reorder/remove images and preserve images on ordinary edits');

    step = 'address forms and account switching';
    await logout(); await login(accounts.buyer); await openProfile();
    await page.getByRole('button', { name: 'Địa chỉ giao hàng', exact: true }).click();
    await page.getByRole('button', { name: 'Thêm địa chỉ', exact: true }).click();
    await page.getByRole('button', { name: 'Lưu địa chỉ', exact: true }).click();
    await page.getByText('Số điện thoại cần từ 9 đến 15 chữ số', { exact: true }).waitFor();
    await page.getByLabel('Tên người nhận', { exact: true }).fill('E2E Buyer Recipient');
    await page.getByLabel('Số điện thoại', { exact: true }).fill('0912345678');
    await page.getByLabel('Địa chỉ chi tiết', { exact: true }).fill('12 E2E Street');
    await page.getByLabel('Tỉnh / Thành', { exact: true }).fill('Hà Nội');
    await page.getByRole('button', { name: 'Lưu địa chỉ', exact: true }).click();
    await page.getByRole('heading', { name: 'E2E Buyer Recipient · 0912345678', exact: true }).waitFor();
    assert.equal((await database.query('SELECT count(*)::int AS count FROM addresses WHERE "userId"=$1 AND "isDefault"=true', [accounts.buyer.id])).rows[0].count, 1);
    await page.getByRole('button', { name: 'Thêm địa chỉ', exact: true }).click();
    await page.getByLabel('Tên người nhận', { exact: true }).fill('E2E Second Recipient');
    await page.getByLabel('Số điện thoại', { exact: true }).fill('0987654321');
    await page.getByLabel('Địa chỉ chi tiết', { exact: true }).fill('34 E2E Street');
    await page.getByLabel('Tỉnh / Thành', { exact: true }).fill('Hà Nội');
    await page.getByLabel('Đặt làm địa chỉ mặc định', { exact: true }).check();
    await page.getByRole('button', { name: 'Lưu địa chỉ', exact: true }).click();
    const secondAddress = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'E2E Second Recipient · 0987654321', exact: true }) });
    await secondAddress.getByText('Mặc định', { exact: true }).waitFor();
    page.once('dialog', (dialog) => dialog.accept());
    await secondAddress.getByRole('button', { name: 'Xóa địa chỉ', exact: true }).click();
    await page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'E2E Buyer Recipient · 0912345678', exact: true }) }).getByText('Mặc định', { exact: true }).waitFor();
    let refreshStarted;
    const refreshPending = new Promise((resolve) => { refreshStarted = resolve; });
    await page.route('**/api/auth/refresh', async (route) => {
      refreshStarted();
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.continue().catch(() => {});
    });
    await page.evaluate(async () => {
      const { refreshAuthSession } = await import('/src/services/axiosInstance.js');
      window.__lateRefreshOutcome = 'pending';
      void refreshAuthSession().then(() => { window.__lateRefreshOutcome = 'resolved'; }, (error) => { window.__lateRefreshOutcome = error.name; });
    });
    await refreshPending;
    await logout();
    await page.waitForFunction(() => window.__lateRefreshOutcome === 'CanceledError');
    await page.unroute('**/api/auth/refresh');
    await login(accounts.other);
    await page.route('**/api/users/addresses', async (route) => { await new Promise((resolve) => setTimeout(resolve, 600)); await route.continue(); });
    await openProfile(); await page.getByRole('button', { name: 'Địa chỉ giao hàng', exact: true }).click();
    assert.equal(await page.getByRole('heading', { name: 'E2E Buyer Recipient · 0912345678', exact: true }).count(), 0);
    await page.getByText('Bạn chưa có địa chỉ giao hàng.', { exact: true }).waitFor();
    await page.unroute('**/api/users/addresses');
    await page.reload(); await page.waitForLoadState('networkidle');
    await page.getByRole('heading', { name: 'Tài khoản của tôi', exact: true }).waitFor();
    passed('Browser address errors/default and account switching/reload keep personal data separate');

    step = 'checkout errors, lost response, retry and delivery';
    await logout(); await login(accounts.buyer);
    await goto(`/products/${product.id}`); await page.getByRole('button', { name: 'Mua ngay', exact: true }).click();
    await page.waitForURL(`${base}/checkout`);
    await page.getByRole('button', { name: 'Đặt hàng an toàn', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Đặt hàng an toàn', exact: true }).isDisabled(), true);
    await page.locator('input[name=name]').fill('E2E Buyer Recipient');
    await page.locator('input[name=phone]').fill('0912345678');
    await page.locator('input[name=address]').fill('12 E2E Street');
    let quoteCalls = 0;
    await page.route('**/api/shipping/estimate', async (route) => { quoteCalls++; if (quoteCalls === 1) await route.abort('failed'); else { await new Promise((resolve) => setTimeout(resolve, 400)); await route.continue(); } });
    await page.locator('input[name=city]').fill('Hà Nội');
    await page.getByRole('button', { name: 'Báo phí lại', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Đặt hàng an toàn', exact: true }).isDisabled(), true);
    await page.getByRole('button', { name: 'Báo phí lại', exact: true }).click();
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some((button) => button.textContent.includes('Đặt hàng an toàn') && !button.disabled));
    let lost = false;
    await page.route('**/api/orders', async (route) => { if (route.request().method() === 'POST' && !lost) { lost = true; await route.fetch(); await route.abort('failed'); } else await route.continue(); });
    await page.getByRole('button', { name: 'Đặt hàng an toàn', exact: true }).click();
    await page.getByRole('button', { name: 'Kiểm tra lại đơn hàng', exact: true }).waitFor();
    await page.reload(); await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Kiểm tra lại đơn hàng', exact: true }).click();
    await page.getByRole('heading', { name: 'Đặt hàng thành công', exact: true }).waitFor();
    const orders = (await database.query('SELECT id FROM orders WHERE "buyerId"=$1', [accounts.buyer.id])).rows;
    assert.equal(orders.length, 1);
    const orderId = orders[0].id;
    assert.equal((await database.query('SELECT stock FROM products WHERE id=$1', [product.id])).rows[0].stock, 9);
    await sellerRequest(`${orderId}/confirm`);
    await sellerRequest(`${orderId}/pack`);
    await sellerRequest(`${orderId}/ship`, { carrier: 'E2E carrier', trackingCode: 'E2E-001', currentLocation: 'E2E warehouse' });
    await sellerRequest(`${orderId}/deliver`, { currentLocation: 'Hà Nội' });
    passed('Browser checkout loading/error states and lost-response reload/retry create exactly one real order');

    step = 'post-purchase review and pagination';
    await goto(`/orders/${orderId}`);
    await page.getByText('145.000₫', { exact: true }).waitFor();
    const reviewForm = page.getByRole('form', { name: 'Đánh giá E2E Ceramic Cup Final', exact: true });
    await reviewForm.getByLabel('Số sao', { exact: true }).selectOption('5');
    await reviewForm.getByLabel('Nhận xét', { exact: true }).fill('Sản phẩm đúng mô tả, đóng gói cẩn thận.');
    await reviewForm.getByRole('button', { name: 'Gửi đánh giá', exact: true }).click();
    await page.getByText(/Đã đánh giá E2E Ceramic Cup Final: 5\/5 sao/).waitFor();
    assert.equal((await database.query('SELECT count(*)::int AS count FROM reviews WHERE "orderId"=$1', [orderId])).rows[0].count, 1);
    await goto(`/products/${product.id}`);
    await page.getByRole('region', { name: 'Đánh giá sản phẩm', exact: true }).getByText('Sản phẩm đúng mô tả, đóng gói cẩn thận.', { exact: true }).waitFor();
    const buyerToken = await bearer(accounts.buyer);
    for (let index = 0; index < 5; index++) {
      const extraOrder = crypto.randomUUID();
      await database.query('INSERT INTO orders (id,"buyerId","shopId",total,status) VALUES ($1,$2,$3,120000,$4)', [extraOrder, accounts.buyer.id, shopId, 'delivered']);
      await database.query('INSERT INTO order_items ("orderId","productId",name,price,quantity) VALUES ($1,$2,$3,120000,1)', [extraOrder, product.id, 'E2E Ceramic Cup Final']);
      const response = await context.request.post(`${apiUrl}/api/orders/${extraOrder}/reviews`, { headers: { Authorization: `Bearer ${buyerToken}` }, data: { productId: product.id, rating: 4, comment: `Pagination review ${index}` } });
      assert.equal(response.status(), 201);
    }
    await page.reload(); await page.waitForLoadState('networkidle');
    const reviewsRegion = page.getByRole('region', { name: 'Đánh giá sản phẩm', exact: true });
    await reviewsRegion.getByText('6 nhận xét · 4.17/5 sao', { exact: true }).waitFor();
    await reviewsRegion.getByRole('button', { name: 'Sau', exact: true }).click();
    await reviewsRegion.getByText('Sản phẩm đúng mô tả, đóng gói cẩn thận.', { exact: true }).waitFor();
    await screenshot('product-review.png');
    await context.request.get(`${apiUrl}/health`).then((response) => assert.equal(response.status(), 200));
    await page.setViewportSize({ width: 390, height: 844 }); await page.reload(); await page.waitForLoadState('networkidle');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await screenshot('product-mobile.png');
    assert.deepEqual(pageErrors, []);
    passed('Browser review, aggregate rating, pagination, shipping totals and mobile layout reflect PostgreSQL data');

    step = 'browser order cancellation';
    await page.setViewportSize({ width: 1440, height: 1000 });
    await goto(`/products/${product.id}`); await page.getByRole('button', { name: 'Mua ngay', exact: true }).click();
    await page.waitForURL(`${base}/checkout`);
    for (const [field, value] of Object.entries({ name: 'E2E Buyer Recipient', phone: '0912345678', address: '12 E2E Street', city: 'Hà Nội' })) await page.locator(`input[name=${field}]`).fill(value);
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some((button) => button.textContent.includes('Đặt hàng an toàn') && !button.disabled));
    await page.getByRole('button', { name: 'Đặt hàng an toàn', exact: true }).click();
    await page.getByRole('heading', { name: 'Đặt hàng thành công', exact: true }).waitFor();
    const pendingOrder = (await database.query('SELECT id FROM orders WHERE "buyerId"=$1 AND status=$2', [accounts.buyer.id, 'pending'])).rows[0];
    await goto(`/orders/${pendingOrder.id}`); await page.getByRole('button', { name: 'Hủy đơn', exact: true }).click();
    await page.getByText('Đã hủy', { exact: true }).first().waitFor();
    assert.equal((await database.query('SELECT stock FROM products WHERE id=$1', [product.id])).rows[0].stock, 9);
    assert.deepEqual(pageErrors, []);
    passed('Browser cancellation restores stock without changing delivered orders');

    step = 'bank receipt reconciliation and payment expiry';
    await verifyCommerceUI({ page, database, context, apiUrl, accounts, product, goto, login, logout, bearer, screenshot, passed });

    step = 'return, refund and COD browser workflows';
    await verifyAfterSalesUI({ page, database, context, apiUrl, accounts, product, goto, login, logout, bearer, screenshot, passed });

    step = 'seller settlements and payout browser workflows';
    await verifySettlementsUI({ page, database, context, apiUrl, accounts, product, goto, login, logout, bearer, screenshot, passed });

    step = 'account security, support, moderation and order pagination';
    await verifyOperationsUI({ page, database, apiUrl, accounts, product, goto, login, logout, screenshot, passed, refreshSecret: env.JWT_REFRESH_SECRET, password });

    step = 'checkout field validation and password session revocation';
    const beforeInvalidCheckout = (await database.query('SELECT count(*)::int AS count FROM orders WHERE "buyerId"=$1', [accounts.buyer.id])).rows[0].count;
    await goto(`/products/${product.id}`); await page.getByRole('button', { name: 'Mua ngay', exact: true }).click();
    await page.waitForURL(`${base}/checkout`);
    for (const [field, value] of Object.entries({ name: 'E2E Buyer Recipient', phone: 'invalid', address: '12 E2E Street', city: 'Hà Nội' })) await page.locator(`input[name=${field}]`).fill(value);
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some((button) => button.textContent.includes('Đặt hàng an toàn') && !button.disabled));
    await page.getByRole('button', { name: 'Đặt hàng an toàn', exact: true }).click();
    await page.locator('#checkout-phone-error').waitFor();
    assert.equal(await page.locator('input[name=phone]').getAttribute('aria-invalid'), 'true');
    assert.equal((await database.query('SELECT count(*)::int AS count FROM orders WHERE "buyerId"=$1', [accounts.buyer.id])).rows[0].count, beforeInvalidCheckout);
    await openProfile(); await page.getByLabel('Thiết lập tài khoản').getByRole('button', { name: 'Đổi mật khẩu', exact: true }).click();
    const nextPassword = crypto.randomBytes(24).toString('base64url');
    await page.getByLabel('Mật khẩu hiện tại', { exact: true }).fill(password);
    await page.getByLabel('Mật khẩu mới', { exact: true }).fill(nextPassword);
    await page.getByLabel('Xác nhận mật khẩu', { exact: true }).fill(nextPassword);
    await page.locator('form').getByRole('button', { name: 'Đổi mật khẩu', exact: true }).click();
    await page.waitForURL(`${base}/login`);
    const authCleared = await page.evaluate(async () => {
      const { default: store } = await import('/src/features/auth/store/authStore.js');
      return !store.getState().token && !store.getState().user;
    });
    assert.ok(authCleared);
    assert.equal((await context.cookies()).filter((cookie) => cookie.name === 'souvenir_refresh').length, 0);
    await page.reload(); await page.waitForLoadState('networkidle');
    assert.equal(new URL(page.url()).pathname, '/login');
    await page.locator('input[name=email]').fill(accounts.buyer.email);
    await page.locator('input[name=password]').fill(nextPassword);
    await page.getByRole('button', { name: 'Đăng nhập an toàn', exact: true }).click();
    await page.waitForURL((url) => url.pathname !== '/login');
    await page.waitForLoadState('networkidle');
    assert.deepEqual(pageErrors, []);
    passed('Browser checkout shows field errors; password change logs out, clears cookie and allows the new password');
    await context.close();
  } catch (error) {
    failure = error;
    if (page) await page.screenshot({ path: path.join(artifacts, 'failure.png'), fullPage: true }).catch(() => {});
    // Store no request headers, authentication state, password, token, or traces.
    fs.writeFileSync(path.join(artifacts, 'failure.json'), JSON.stringify({ step, error: String(error.message).replace(/(?:password|token|authorization)[^\n]*/gi, '[REDACTED]') }, null, 2));
    console.error(`FAIL ${step}: see artifacts/full-stack/failure.json`);
  } finally {
    if (browser) await browser.close();
    for (const child of children.reverse()) await stop(child);
    if (database) await database.end();
    if (created) {
      assert.match(name, /^souvenirshop_e2e_[a-z0-9_]+$/); assert.notEqual(name, target.pathname.slice(1));
      await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
    }
    await admin.end();
    assert.equal(path.dirname(path.resolve(uploads)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(uploads).startsWith('souvenirshop-e2e-uploads-'));
    fs.rmSync(uploads, { recursive: true, force: true });
    fs.writeFileSync(path.join(artifacts, 'result.json'), JSON.stringify({ status: failure ? 'failed' : 'passed', checks, disposableDatabaseRemoved: created, uploadsRemoved: true }, null, 2));
  }
  if (failure) process.exitCode = 1;
}
run().catch(() => { console.error(`E2E setup/cleanup failed at ${step}; no credentials are logged.`); process.exitCode = 1; });

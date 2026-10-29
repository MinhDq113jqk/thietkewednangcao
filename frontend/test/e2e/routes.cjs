const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { parse } = require('@babel/parser');

function routeDeclarations() {
  const ast = parse(fs.readFileSync(path.resolve(__dirname, '../../src/app/App.jsx'), 'utf8'), { sourceType: 'module', plugins: ['jsx'] });
  const rows = [];
  function visit(node, parent = '') {
    if (!node || typeof node !== 'object') return;
    let prefix = parent;
    if (node.type === 'JSXElement' && node.openingElement.name.name === 'Route') {
      const attrs = node.openingElement.attributes;
      const relative = attrs.find(a => a.name?.name === 'path')?.value?.value || '';
      prefix = relative.startsWith('/') ? relative : `${parent}/${relative}`.replace(/\/$/, '') || '/';
      rows.push({ declaration: rows.length + 1, route: prefix, index: attrs.some(a => a.name?.name === 'index') });
    }
    for (const [key, value] of Object.entries(node)) {
      if (['loc', 'start', 'end', 'extra'].includes(key)) continue;
      if (Array.isArray(value)) value.forEach(child => visit(child, prefix)); else if (value && typeof value === 'object') visit(value, prefix);
    }
  }
  visit(ast);
  return rows;
}

exports.verifyRoutes = async ({ page, context, database, apiUrl, accounts, shopId, password, base, passed, interactionsOnly = false }) => {
  const output = process.env.ROUTE_EVIDENCE_DIR || path.resolve(__dirname, '../../artifacts/routes');
  const widths = process.env.ROUTE_VIEWPORTS ? process.env.ROUTE_VIEWPORTS.split(',').map(Number) : [1440, 390, 320];
  fs.mkdirSync(output, { recursive: true });
  const authenticate = async role => {
    const response = await context.request.post(`${apiUrl}/api/auth/login`, { data: { email: accounts[role].email, password } });
    assert.equal(response.status(), 200);
    return (await response.json()).token;
  };
  const sellerToken = await authenticate('seller');
  const created = await context.request.post(`${apiUrl}/api/seller/products`, { headers: { Authorization: `Bearer ${sellerToken}` }, data: { name: 'Bình gốm kiểm thử bố cục', price: 150000, stock: 20, category: 'Gốm sứ', description: 'Sản phẩm giả phục vụ kiểm thử bố cục ngày 24.', images: [] } });
  assert.equal(created.status(), 201);
  const response = await created.json();
  const productId = response.id || response.product?.id;
  assert.ok(productId);
  const orderId = crypto.randomUUID();
  await database.query('INSERT INTO orders(id,"buyerId","shopId",total,"shippingFee",status,"paymentMethod","shippingAddress") VALUES($1,$2,$3,150000,25000,\'pending\',\'cod\',$4)', [orderId, accounts.buyer.id, shopId, JSON.stringify({ name: 'Người nhận kiểm thử', phone: '0900000000', address: 'Địa chỉ giả', city: 'Hà Nội' })]);
  await database.query('INSERT INTO order_items("orderId","productId",name,price,quantity) VALUES($1,$2,$3,150000,1)', [orderId, productId, 'Bình gốm kiểm thử bố cục']);
  for (let index = 0; index < 5; index++) await database.query('INSERT INTO regions(id,name,slug,"shortDescription","centerLat","centerLng","mapX","mapY") VALUES($1,$2,$3,$4,21,105,$5,$6)', [crypto.randomUUID(), `Vùng kiểm thử ${index + 1}`, `vung-kiem-thu-${index + 1}`, 'Dữ liệu giả để kiểm tra hàng và cột.', 35 + index * 5, 20 + index * 12]);
  const records = routeDeclarations();
  assert.equal(records.length, 51, 'Route inventory changed: review the milestone checklist');
  const prior = interactionsOnly ? JSON.parse(fs.readFileSync(path.join(output, 'progress.json'), 'utf8')) : null;
  if (prior) { assert.equal(prior.checks.length, records.length * widths.length); assert.deepEqual(prior.failures, []); }
  const errors = [], failures = prior?.failures || [], checks = prior?.checks || [];
  page.on('pageerror', error => errors.push(error.message));
  const imageRoutes = new Set(['/', '/products', '/products/:id', '/shop/:slug', '/explore', '/culture/:slug', '/cart', '/checkout', '/profile', '/login', '/seller/products', '/seller/products/:id/edit', '/seller/inventory', '/admin/users', '/support', '/messages']);
  for (const role of interactionsOnly ? [] : ['buyer', 'seller', 'admin']) {
    await authenticate(role);
    const group = records.filter(row => row.route.startsWith('/admin') ? role === 'admin' : row.route.startsWith('/seller') && row.route !== '/seller/register' ? role === 'seller' : role === 'buyer');
    for (const row of group) {
      const route = row.route.replace(':slug', row.route.includes('/shop') ? `e2e-${shopId}` : 'vung-kiem-thu-1').replace(':id', row.route.startsWith('/orders') ? orderId : productId).replace('*', 'page-not-found-test');
      for (const width of widths) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(base);
        // Let refresh finish before navigation so its rotating cookie is received.
        await page.waitForLoadState('networkidle');
        await page.evaluate(product => localStorage.setItem('cart-storage', JSON.stringify({ state: { items: [{ id: product, variantId: product, name: 'Bình gốm kiểm thử bố cục', price: 150000, quantity: 1, stock: 20 }] }, version: 0 })), productId);
        await page.goto(`${base}${route}`);
        await page.waitForLoadState('networkidle');
        await page.locator('main, .booking-workspace-content, form').first().waitFor();
        const state = await page.evaluate(() => ({
          width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
          heading: document.querySelector('h1')?.textContent || document.querySelector('h2')?.textContent || '',
          overflow: [...document.querySelectorAll('main *, .booking-workspace-content *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > innerWidth + 2 && !e.closest('.table-responsive, .overflow-x-auto, nav, .booking-workspace-nav'); }).slice(0, 8).map(e => ({ tag: e.tagName, className: String(e.className).slice(0, 150) })),
        }));
        const actualPath = new URL(page.url()).pathname;
        const result = { ...row, role, viewport: width, actualPath: row.route.includes(':') ? row.route : actualPath, heading: state.heading, overflow: state.scrollWidth > width + 1, pageErrors: errors.splice(0) };
        if (actualPath !== route || result.overflow || result.pageErrors.length) failures.push({ ...result, offenders: state.overflow });
        checks.push(result);
        fs.writeFileSync(path.join(output, 'progress.json'), JSON.stringify({ declarations: records.length, checks, failures }, null, 2));
        if ((imageRoutes.has(row.route) && width !== 320 && !row.index) || result.overflow) await page.screenshot({ path: path.join(output, `route-${row.declaration}-${width}.png`), fullPage: true, animations: 'disabled' });
      }
      console.log(`LAYOUT ${row.declaration}/51 ${row.route}`);
    }
  }
  // Client route guards: verify no seller/admin UI is rendered for a buyer.
  await authenticate('buyer');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/profile`); await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Địa chỉ giao hàng', exact: true }).click();
  const opener = page.getByRole('button', { name: 'Thêm địa chỉ', exact: true });
  await opener.click();
  const dialog = page.getByRole('dialog', { name: 'Thêm địa chỉ mới' });
  await dialog.waitFor();
  await page.waitForFunction(() => { const e = document.querySelector('.modal.show'); return e && getComputedStyle(e).opacity === '1'; });
  assert.equal(await dialog.evaluate(e => getComputedStyle(e).position), 'fixed');
  assert.equal(await dialog.evaluate(e => getComputedStyle(e).backgroundColor), 'rgba(0, 0, 0, 0)');
  assert.equal(await page.locator('.modal-backdrop').evaluate(e => getComputedStyle(e).position), 'fixed');
  assert.equal(await page.locator('.modal-backdrop').evaluate(e => getComputedStyle(e).backgroundColor), 'rgb(0, 0, 0)');
  await page.getByLabel('Tên người nhận', { exact: true }).focus();
  for (let index = 0; index < 12; index++) {
    await page.keyboard.press('Tab');
    // React-Bootstrap enforces focus in a scheduled document-focus callback.
    try { await page.waitForFunction(() => document.querySelector('.modal')?.contains(document.activeElement), null, { timeout: 2000 }); }
    catch { const focus = await page.evaluate(() => ({documentFocused:document.hasFocus(),tag:document.activeElement?.tagName,role:document.activeElement?.getAttribute('role')}));throw new Error(`Modal Tab ${index+1} escaped: ${JSON.stringify(focus)}`); }
  }
  await page.screenshot({ path: path.join(output, 'modal-mobile.png'), fullPage: true, animations: 'disabled' });
  await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' });
  await page.waitForFunction(() => document.activeElement?.textContent.includes('Thêm địa chỉ'));
  await page.goto(`${base}/products`); await page.waitForLoadState('networkidle');
  const filterToggle = page.getByRole('button', { name: 'Bộ lọc sản phẩm', exact: true });
  assert.equal(await filterToggle.getAttribute('aria-expanded'), 'false');
  await filterToggle.click(); await page.getByLabel('Từ khóa', { exact: true }).fill('Bình gốm');
  await page.getByRole('button', { name: 'Áp dụng', exact: true }).click();
  await page.waitForURL('**/products?**');
  assert.equal(new URL(page.url()).searchParams.get('search'), 'Bình gốm');
  for (const route of ['/admin/users', '/seller/products']) {
    await page.goto(`${base}${route}`); await page.waitForLoadState('networkidle');
    assert.notEqual(new URL(page.url()).pathname, route);
  }
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ scope: 'Real NestJS + disposable PostgreSQL; synthetic fixtures; route rendering/responsive and client guards, not every mutation', interactionsRerun: interactionsOnly, declarations: records.length, checks, failures, guardChecks: 2, interactionChecks: ['Modal fixed overlay/backdrop, keyboard focus trap, Escape and focus restoration', 'Mobile collapsed filters open and submit search to URL'] }, null, 2));
  assert.deepEqual(failures, [], `Route layout failures: see frontend/artifacts/routes/results.json (${failures.length})`);
  passed(`All ${records.length} route declarations rendered at ${widths.join(', ')} px; buyer route guards verified`);
};

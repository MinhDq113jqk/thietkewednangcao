const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const artifacts = path.resolve(process.env.FRONTEND_STATES_ARTIFACTS || path.join(__dirname, '../../artifacts/frontend-states'));
const base = process.env.FRONTEND_BASE_URL || 'http://127.0.0.1:5178';

(async () => {
  fs.mkdirSync(artifacts, { recursive: true });
  const server = process.env.FRONTEND_BASE_URL ? null : spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5178', '--strictPort'], { cwd: path.resolve(__dirname, '../..'), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  if (server) await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { server.kill(); reject(new Error('Vite startup timeout')); }, 30000);
    server.stdout.on('data', data => { if (data.toString().includes('Local:')) { clearTimeout(timer); resolve(); } });
    server.once('error', error => { clearTimeout(timer); reject(error); });
    server.once('exit', code => { clearTimeout(timer); reject(new Error(`Vite exited ${code}`)); });
  });
  const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  const checks = [];
  page.on('pageerror', e => errors.push(e.message));
  const products = [{ id: 'fixture-product', name: 'Bình gốm Bát Tràng', price: 150000, stock: 12, variantCount: 1, category: 'Gốm sứ', dataSource: 'demo', images: [], shop: { name: 'Xưởng gốm Việt', slug: 'xuong-gom' } }];
  const regions = Array.from({length:5},(_,index)=>({id:`fixture-region-${index}`,slug:`fixture-region-${index}`,name:`Vùng kiểm thử ${index+1}`,shortDescription:'Dữ liệu giả kiểm tra bố cục'}));
  let mode = 'success';
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith('/api/')) return route.continue();
    if (url.pathname.includes('/auth/')) return route.fulfill({ status: 401, json: { message: 'Unauthenticated fixture' } });
    if (url.pathname.endsWith('/culture/regions')) return route.fulfill({json:{items:regions}});
    if (url.pathname.includes('/products')) {
      if (mode === 'loading') await new Promise(resolve => setTimeout(resolve, 1600));
      if (mode === 'error') return route.fulfill({ status: 503, json: { message: 'Fixture service unavailable' } });
      return route.fulfill({ json: { items: mode === 'empty' ? [] : products, total: 1, page: 1, totalPages: 1 } });
    }
    return route.fulfill({ json: { items: [] } });
  });
  const shot = name => page.screenshot({ path: path.join(artifacts, name), fullPage: true, animations: 'disabled' });
  try {
    await page.goto(base);
    await page.getByRole('heading', { name: 'Mỗi món quà, một hành trình' }).waitFor();
    await page.locator('.booking-product-card').first().waitFor();
    assert.equal(await page.locator('.booking-header .booking-top').evaluate(e => getComputedStyle(e).display), 'flex');
    assert.equal(await page.locator('.booking-search').evaluate(e => getComputedStyle(e).gridTemplateColumns.split(' ').length), 4);
    await page.locator('.booking-destination').first().waitFor();
    assert.equal(await page.locator('.booking-destination strong').first().evaluate(e=>getComputedStyle(e).color),'rgb(255, 255, 255)');
    const destinationBoxes=await page.locator('.booking-destination').evaluateAll(nodes=>nodes.map(node=>({top:node.getBoundingClientRect().top,width:node.getBoundingClientRect().width})));
    assert.equal(destinationBoxes[0].top,destinationBoxes[1].top);
    assert.ok(destinationBoxes[2].top>destinationBoxes[0].top);
    assert.equal(destinationBoxes[2].top,destinationBoxes[4].top);
    await page.locator('.booking-destinations').screenshot({path:path.join(artifacts,'regions-desktop.png')});
    await shot('home-desktop.png');
    checks.push('Desktop header, four-column search, Bootstrap cards render');
    await page.getByLabel('Bạn đang tìm món quà nào?').fill('Bình gốm');
    await page.getByLabel('Danh mục', { exact: true }).selectOption('Gốm sứ');
    await page.getByLabel('Ngân sách', { exact: true }).selectOption('300000');
    await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
    await page.waitForURL('**/products?**');
    const query = new URL(page.url()).searchParams;
    assert.equal(query.get('search'), 'Bình gốm');
    assert.equal(query.get('category'), 'Gốm sứ');
    assert.equal(query.get('maxPrice'), '300000');
    checks.push('Search submits all three supported API filter fields');
    const resultCard = page.locator('.booking-result-card').first();
    await resultCard.waitFor();
    const imageBox = await resultCard.locator('.booking-product-image').boundingBox();
    const bodyBox = await resultCard.locator('.card-body').boundingBox();
    assert.ok(imageBox.x + imageBox.width <= bodyBox.x, 'Result image must not overlap product text');
    await shot('results-desktop.png');
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.getByRole('button', { name: 'Bộ lọc sản phẩm', exact: true }).getAttribute('aria-expanded'), 'false');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await shot('results-mobile.png');
    checks.push('Result image/text do not overlap; mobile result stacks with collapsed filters');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(base);
    await page.locator('.booking-product-card').first().getByRole('button').click();
    await page.getByRole('link', { name: 'Giỏ hàng có 1 sản phẩm' }).waitFor();
    checks.push('Card adds product and shared cart badge updates');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Mở menu' }).click();
    await page.locator('#mobile-menu').getByRole('link', { name: 'Đăng nhập / Đăng ký' }).waitFor();
    await page.getByRole('button', { name: 'Đóng menu' }).click();
    await page.locator('#mobile-menu').waitFor({ state: 'hidden' });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.equal(await page.locator('.booking-search').evaluate(e => getComputedStyle(e).gridTemplateColumns.split(' ').length), 1);
    await shot('home-mobile.png');
    checks.push('Mobile menu opens/closes, stacked search, no page overflow');
    await page.getByLabel('Bạn đang tìm món quà nào?').focus();
    await page.keyboard.press('Tab');
    assert.equal(await page.getByLabel('Danh mục', { exact: true }).evaluate(e => e === document.activeElement), true);
    checks.push('Keyboard follows search field order');
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => localStorage.setItem('cart-storage', JSON.stringify({ state: { items: [
        { id: 'same-product', variantId: 'red', variantName: 'Đỏ', sku: 'SKU-RED', name: 'Quà thử nghiệm', price: 10000, quantity: 1, stock: 10 },
        { id: 'same-product', variantId: 'blue', variantName: 'Xanh', sku: 'SKU-BLUE', name: 'Quà thử nghiệm', price: 20000, quantity: 2, stock: 10 },
      ] }, version: 0 })));
      await page.goto(`${base}/cart`);
      const red = page.locator('article').filter({ hasText: 'SKU-RED' });
      await red.getByRole('button', { name: 'Tăng số lượng Quà thử nghiệm' }).click();
      let items = await page.evaluate(() => JSON.parse(localStorage.getItem('cart-storage')).state.items);
      assert.deepEqual(items.map(item => item.quantity), [2, 2]);
      await red.getByRole('button', { name: width === 390 ? 'Xóa Quà thử nghiệm' : 'Xóa', exact: true }).click();
      items = await page.evaluate(() => JSON.parse(localStorage.getItem('cart-storage')).state.items);
      assert.deepEqual(items.map(item => [item.variantId, item.quantity]), [['blue', 2]]);
      await shot(`cart-variants-${width}.png`);
    }
    checks.push('Cart increases/removes only the selected SKU on desktop and mobile, with persisted state');
    await page.setViewportSize({ width: 390, height: 844 });
    for (mode of ['loading', 'empty', 'error']) {
      await page.goto(base);
      await page.getByRole('heading', { name: 'Mỗi món quà, một hành trình' }).waitFor();
      if (mode !== 'loading') await page.waitForTimeout(6500);
      if (mode === 'empty') await page.getByRole('status').filter({ hasText: 'Chưa có sản phẩm phù hợp' }).waitFor();
      if (mode === 'error') await page.getByRole('alert').filter({ hasText: 'Chưa tải được sản phẩm' }).waitFor();
      if (mode === 'loading') assert.ok(await page.locator('.skeleton').count() > 0);
      await shot(`home-${mode}.png`);
      assert.equal(await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).isEnabled(), true);
      checks.push(`Shared header/search usable during ${mode} API fixture`);
    }
    assert.deepEqual(errors, []);
    if (fs.existsSync(path.join(artifacts, 'foundation-failure.png'))) fs.unlinkSync(path.join(artifacts, 'foundation-failure.png'));
    fs.writeFileSync(path.join(artifacts, 'foundation-results.json'), JSON.stringify({ date: new Date().toISOString(), scope: 'Browser UI with synthetic API fixtures; not DB/E2E evidence', checks, pageErrors: errors }, null, 2));
    console.log(JSON.stringify({ passed: checks.length, checks }));
  } catch (error) {
    await shot('foundation-failure.png');
    console.error(JSON.stringify({ pageErrors: errors }));
    throw error;
  } finally { await browser.close(); if (server) server.kill(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

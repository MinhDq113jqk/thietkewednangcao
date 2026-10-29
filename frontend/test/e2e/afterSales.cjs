const assert = require('node:assert/strict');
const crypto = require('node:crypto');

async function verifyAfterSalesUI({ page, database, context, apiUrl, accounts, product, goto, login, logout, bearer, screenshot, passed }) {
  // Continue the bank order created by the real browser checkout/reconciliation suite.
  const order = (await database.query('SELECT id FROM orders WHERE "buyerId"=$1 AND "paymentMethod"=$2 AND "paymentStatus"=$3 AND status=$4 ORDER BY "createdAt" DESC LIMIT 1', [accounts.buyer.id, 'bank_transfer', 'paid', 'pending'])).rows[0];
  assert.ok(order);
  const productName = (await database.query('SELECT name FROM products WHERE id=$1', [product.id])).rows[0].name;
  const sellerToken = await bearer(accounts.seller);
  for (const [action, data] of [['confirm', {}], ['pack', {}], ['ship', { carrier: 'UI carrier', trackingCode: 'UI-RETURN-001', currentLocation: 'UI warehouse' }], ['deliver', {}]]) {
    const response = await context.request.put(`${apiUrl}/api/seller/orders/${order.id}/${action}`, { headers: { Authorization: `Bearer ${sellerToken}` }, data });
    assert.equal(response.status(), 200);
  }
  // The shared request context receives login cookies, so restore the browser's buyer session.
  await logout(); await login(accounts.buyer);
  await goto(`/orders/${order.id}`);
  const requestForm = page.locator('form').filter({ has: page.getByRole('button', { name: 'Gửi yêu cầu', exact: true }) });
  await requestForm.getByLabel('Loại yêu cầu', { exact: true }).selectOption('return_refund');
  await requestForm.getByLabel(`Số lượng ${productName}`, { exact: true }).fill('1');
  await requestForm.getByLabel('Số tiền đề nghị hoàn (VND)', { exact: true }).fill('145000');
  await requestForm.getByLabel('Lý do', { exact: true }).fill('UI fixture: sản phẩm sai màu như mô tả.');
  await requestForm.getByLabel('Bằng chứng (mỗi dòng một mô tả hoặc mã tham chiếu)').fill('PRIVATE-RETURN-EVIDENCE: fixture inspection reference');
  await requestForm.getByRole('button', { name: 'Gửi yêu cầu', exact: true }).click();
  await page.getByRole('article').getByText('Chờ duyệt', { exact: true }).waitFor();
  const claim = (await database.query('SELECT id FROM return_cases WHERE "orderId"=$1', [order.id])).rows[0];
  assert.ok(claim);
  await screenshot('return-request.png');
  await logout(); await login(accounts.other); await goto(`/orders/${order.id}`);
  await page.getByRole('heading', { name: 'Không tìm thấy đơn hàng', exact: true }).waitFor();
  assert.equal(await page.getByText('PRIVATE-RETURN-EVIDENCE', { exact: false }).count(), 0);
  passed('Browser buyer creates a return with private evidence; another account cannot read the order or claim');

  await logout(); await login(accounts.seller); await goto(`/seller/returns?orderId=${order.id}`);
  const card = page.getByRole('article', { name: `Yêu cầu ${claim.id.slice(0, 8)}`, exact: true });
  await card.getByRole('button', { name: 'Duyệt yêu cầu', exact: true }).click();
  await card.getByLabel('Số tiền duyệt hoàn (VND)', { exact: true }).fill('145000');
  await card.getByLabel('Ghi chú xử lý', { exact: true }).fill('Đã kiểm tra bằng chứng và đồng ý nhận hàng hoàn.');
  await card.getByRole('button', { name: 'Lưu xử lý', exact: true }).click();
  await card.getByText('Đã duyệt', { exact: true }).waitFor();
  await card.getByRole('button', { name: 'Nhận hàng hoàn', exact: true }).click();
  await card.locator('form select').selectOption('yes');
  await card.getByLabel('Ghi chú xử lý', { exact: true }).fill('Đã nhận và kiểm tra hàng có thể bán lại.');
  const stockBefore = (await database.query('SELECT stock FROM products WHERE id=$1', [product.id])).rows[0].stock;
  await card.getByRole('button', { name: 'Lưu xử lý', exact: true }).click();
  await card.getByText('Đã nhận hàng hoàn', { exact: true }).waitFor();
  assert.equal((await database.query('SELECT stock FROM products WHERE id=$1', [product.id])).rows[0].stock, stockBefore + 1);
  await page.reload(); await page.waitForLoadState('networkidle');
  assert.equal(await card.getByRole('button', { name: 'Nhận hàng hoàn', exact: true }).count(), 0);
  await screenshot('seller-return-received.png');
  passed('Browser seller approves the requested amount and receives goods with one persisted inventory restoration');

  await logout(); await login(accounts.admin); await goto(`/admin/returns?orderId=${order.id}`);
  await page.getByRole('link', { name: 'Ghi nhận hoàn tiền', exact: true }).click();
  await page.getByRole('heading', { name: 'Ghi nhận hoàn tiền', exact: true }).waitFor();
  const source = (await database.query('SELECT "receiptId" FROM payment_allocations WHERE "orderId"=$1', [order.id])).rows[0].receiptId;
  await page.getByLabel('Chứng từ nhận tiền dùng để hoàn', { exact: true }).selectOption(source);
  const reference = `UI-REFUND-${crypto.randomUUID()}`.toUpperCase();
  const fillFact = async (ref, amount) => {
    await page.getByLabel('Mã giao dịch trên chứng từ', { exact: true }).fill(ref);
    await page.getByLabel('Số tiền thực tế (VND)', { exact: true }).fill(String(amount));
    await page.getByLabel('Bằng chứng đã kiểm tra', { exact: true }).fill('Synthetic outgoing bank statement verified by UI fixture');
    await page.getByLabel('Ghi chú xử lý', { exact: true }).fill('Verified refund already returned to the original customer');
  };
  await fillFact(reference, 45000);
  let loseResponse = true;
  await page.route('**/api/admin/after-sales/refunds', async (route) => {
    if (!loseResponse) return route.continue();
    loseResponse = false;
    const response = await route.fetch(); assert.equal(response.status(), 201);
    await route.abort('failed');
  });
  await page.getByRole('button', { name: 'Lưu chứng từ hoàn tiền', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Chưa xác định kết quả.' }).waitFor();
  await page.getByRole('button', { name: 'Lưu chứng từ hoàn tiền', exact: true }).click();
  await page.getByText(`${reference} · 45.000₫`, { exact: true }).waitFor();
  await page.unroute('**/api/admin/after-sales/refunds');
  assert.equal((await database.query('SELECT count(*)::int n FROM refunds WHERE reference=$1', [reference])).rows[0].n, 1);
  await fillFact(`UI-REFUND-${crypto.randomUUID()}`.toUpperCase(), 100000);
  await page.getByRole('button', { name: 'Lưu chứng từ hoàn tiền', exact: true }).click();
  await page.getByText(/· 100.000₫/, { exact: false }).waitFor();
  assert.equal((await database.query('SELECT sum(amount)::int n FROM refunds WHERE "caseId"=$1', [claim.id])).rows[0].n, 145000);
  await screenshot('admin-refund-ledger.png');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await screenshot('refund-mobile.png');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await goto(`/admin/returns?orderId=${order.id}`);
  await card.getByRole('button', { name: 'Kết thúc xử lý', exact: true }).click();
  await card.getByLabel('Ghi chú xử lý', { exact: true }).fill('Đã nhận đủ hàng và hoàn tiền theo chứng từ.');
  await card.getByRole('button', { name: 'Lưu xử lý', exact: true }).click();
  await card.getByText('Đã xử lý xong', { exact: true }).waitFor();
  passed('Browser admin records two partial refunds, recovers a lost response without duplication, and closes the fully refunded claim');

  const codOrder = (await database.query('SELECT id,total,"shippingFee" FROM orders WHERE "buyerId"=$1 AND "paymentMethod"=$2 AND status=$3 ORDER BY "createdAt" LIMIT 1', [accounts.buyer.id, 'cod', 'delivered'])).rows[0];
  assert.ok(codOrder);
  await goto('/admin/cod');
  await page.getByLabel('Mã đơn hàng đầy đủ', { exact: true }).fill(codOrder.id);
  await page.getByText('Tiền còn ở đơn vị vận chuyển:', { exact: false }).waitFor();
  const codAmount = Number(codOrder.total) + Number(codOrder.shippingFee);
  const collectionReference = `UI-COD-${crypto.randomUUID()}`.toUpperCase();
  await fillFact(collectionReference, codAmount);
  await page.getByRole('button', { name: 'Lưu chứng từ COD', exact: true }).click();
  await page.getByText(`Tiền còn ở đơn vị vận chuyển: ${codAmount.toLocaleString('vi-VN')}₫`, { exact: true }).waitFor();
  assert.equal((await database.query('SELECT count(*)::int n FROM cod_entries WHERE "orderId"=$1', [codOrder.id])).rows[0].n, 1);
  await page.getByLabel('Loại chứng từ', { exact: true }).selectOption('remittance');
  await fillFact(`UI-REMIT-${crypto.randomUUID()}`.toUpperCase(), codAmount - 25000);
  await page.getByLabel('Phí đơn vị vận chuyển giữ lại (VND)', { exact: true }).fill('25000');
  await page.getByRole('button', { name: 'Lưu chứng từ COD', exact: true }).click();
  await page.getByText('Tiền còn ở đơn vị vận chuyển: 0₫', { exact: true }).waitFor();
  const entries = (await database.query('SELECT kind,amount::int,fee::int FROM cod_entries WHERE "orderId"=$1 ORDER BY "createdAt"', [codOrder.id])).rows;
  assert.deepEqual(entries, [{ kind: 'collection', amount: codAmount, fee: 0 }, { kind: 'remittance', amount: codAmount - 25000, fee: 25000 }]);
  await screenshot('cod-reconciliation.png');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await screenshot('cod-mobile.png');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await logout(); await login(accounts.seller); await goto('/seller/cod');
  await page.getByText('Đã đối soát đủ', { exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Lưu chứng từ COD', exact: true }).count(), 0);
  passed('Browser COD collection and remittance retain separate amounts and fees; seller has read access and mobile pages fit the screen');
  await logout(); await login(accounts.buyer);
}
module.exports = { verifyAfterSalesUI };

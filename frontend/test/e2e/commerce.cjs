const assert = require('node:assert/strict');
const crypto = require('node:crypto');

async function verifyCommerceUI({ page, database, context, apiUrl, accounts, product, goto, login, logout, bearer, screenshot, passed }) {
  const bankCheckout = async () => {
    await goto(`/products/${product.id}`);
    await page.getByRole('button', { name: 'Mua ngay', exact: true }).click();
    await page.getByRole('heading', { name: 'Thanh toán an toàn', exact: true }).waitFor();
    for (const [field, value] of Object.entries({ name: 'E2E Bank Recipient', phone: '0912345678', address: '12 E2E Street', city: 'Hà Nội' })) {
      await page.locator(`input[name=${field}]`).fill(value);
    }
    await page.getByText('Chuyển khoản VietQR', { exact: true }).click();
    const submit = page.getByRole('button', { name: 'Tạo đơn và mã VietQR', exact: true });
    await submit.waitFor();
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some((button) => button.textContent.includes('Tạo đơn và mã VietQR') && !button.disabled));
    await submit.click();
    await page.getByRole('heading', { name: 'Đặt hàng thành công', exact: true }).waitFor();
    const order = (await database.query('SELECT id,total,"shippingFee","paymentExpiresAt" FROM orders WHERE "buyerId"=$1 AND "paymentMethod"=$2 ORDER BY "createdAt" DESC LIMIT 1', [accounts.buyer.id, 'bank_transfer'])).rows[0];
    assert.ok(order.paymentExpiresAt.getTime() > Date.now() + 29 * 60000);
    await page.getByText(/Hạn thanh toán:/).waitFor();
    return order;
  };
  const order = await bankCheckout();
  await goto(`/orders/${order.id}`);
  await page.getByRole('button', { name: 'Hiển thị mã VietQR', exact: true }).click();
  await page.getByRole('img', { name: `Mã VietQR cho đơn ${order.id.slice(0, 8)}` }).waitFor();
  assert.equal((await database.query('SELECT "paymentStatus" FROM orders WHERE id=$1', [order.id])).rows[0].paymentStatus, 'unpaid');
  passed('Browser bank checkout persists a 30-minute deadline and displays QR without claiming payment');

  await logout(); await login(accounts.admin);
  let failLedger = true;
  await page.route('**/api/admin/payments/receipts?**', (route) => failLedger ? route.abort('failed') : route.continue());
  await goto(`/admin/payments?orderId=${order.id}`);
  await page.getByText('Không thể tải giao dịch.', { exact: false }).waitFor();
  failLedger = false;
  await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await page.getByText('Không có giao dịch phù hợp.', { exact: true }).waitFor();
  await page.unroute('**/api/admin/payments/receipts?**');
  // Inspect the rendered form before operating it; no auth state is captured.
  const receiptForm = page.locator('form').filter({ has: page.getByRole('button', { name: 'Lưu giao dịch nhận tiền', exact: true }) });
  assert.deepEqual(await receiptForm.locator('input').evaluateAll((inputs) => inputs.map((input) => input.name)),
    ['reference', 'amount', 'receivedAt', 'transferContent', 'orderId']);
  const firstReference = `UI-${crypto.randomUUID()}`.toUpperCase();
  await page.locator('input[name=reference]').fill(firstReference);
  await page.locator('input[name=amount]').fill('50000');
  await page.locator('input[name=transferContent]').fill(`DH ${order.id.slice(0, 12)}`);
  await page.locator('textarea[name=evidence]').fill('Synthetic bank statement confirms incoming money');
  await page.getByRole('button', { name: 'Lưu giao dịch nhận tiền', exact: true }).click();
  const allocation = page.getByRole('region', { name: 'Phân bổ giao dịch', exact: true });
  await allocation.waitFor();
  await allocation.getByLabel('Lý do và kết quả kiểm tra').fill('Verified sender and fixture statement for this order');
  await allocation.getByRole('button', { name: 'Xác nhận phân bổ tiền', exact: true }).click();
  await allocation.waitFor({ state: 'detached' });
  assert.equal((await database.query('SELECT sum(amount)::int n FROM payment_allocations WHERE "orderId"=$1', [order.id])).rows[0].n, 50000);
  // Same immutable payload can be retried from the form after a lost response.
  await page.getByRole('button', { name: 'Lưu giao dịch nhận tiền', exact: true }).click();
  await allocation.waitFor();
  assert.equal((await database.query('SELECT count(*)::int n FROM bank_receipts WHERE reference=$1', [firstReference])).rows[0].n, 1);
  await allocation.getByRole('button', { name: 'Đóng', exact: true }).click();
  await screenshot('payment-reconciliation.png');
  await logout(); await login(accounts.buyer); await goto(`/orders/${order.id}`);
  await page.getByText(/Đã đối soát/).waitFor();
  await page.getByRole('button', { name: 'Hiển thị mã VietQR', exact: true }).click();
  await page.getByRole('img', { name: `Mã VietQR cho đơn ${order.id.slice(0, 8)}` }).waitFor();
  const payment = (await database.query('SELECT metadata FROM payment_transactions WHERE "orderId"=$1', [order.id])).rows[0];
  assert.equal(payment.metadata.allocatedAmount, 50000);
  passed('Browser admin form recovers ledger errors, saves evidence, allocates partial money and safely replays a receipt');

  // Browser countdown must remove a cached QR immediately at the deadline.
  await database.query('UPDATE orders SET "paymentExpiresAt"=NOW()+INTERVAL \'10 seconds\' WHERE id=$1', [order.id]);
  await page.reload(); await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Hiển thị mã VietQR', exact: true }).click();
  await page.getByRole('img', { name: `Mã VietQR cho đơn ${order.id.slice(0, 8)}` }).waitFor();
  await page.getByText(/Đơn đã hết hạn thanh toán\. Vui lòng đặt đơn mới/).waitFor();
  assert.equal(await page.getByRole('img', { name: `Mã VietQR cho đơn ${order.id.slice(0, 8)}` }).count(), 0);
  await screenshot('payment-expired.png');
  await logout(); await login(accounts.admin); await goto('/admin/payments');
  await page.getByRole('button', { name: 'Xử lý đơn quá hạn', exact: true }).click();
  await page.getByLabel('Chỉ khoản cần xử lý').check();
  await page.getByText(/Tiền cần xử lý do đơn đã đóng:/).waitFor();
  const expired = (await database.query('SELECT status,"expiredAt" FROM orders WHERE id=$1', [order.id])).rows[0];
  assert.equal(expired.status, 'cancelled'); assert.ok(expired.expiredAt);
  assert.equal((await database.query('SELECT stock FROM products WHERE id=$1', [product.id])).rows[0].stock, 9);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await screenshot('payment-mobile.png');
  await page.setViewportSize({ width: 1440, height: 1000 });
  passed('Browser expiry hides stale QR, releases stock once and retains partial money in the mobile review queue');

  await logout(); await login(accounts.buyer);
  const paidOrder = await bankCheckout();
  await logout(); await login(accounts.admin); await goto(`/admin/payments?orderId=${paidOrder.id}`);
  const overReference = `UI-EXCESS-${crypto.randomUUID()}`.toUpperCase();
  await page.locator('input[name=reference]').fill(overReference);
  await page.locator('input[name=amount]').fill('175000');
  await page.locator('input[name=transferContent]').fill('Incorrect customer transfer description');
  await page.locator('textarea[name=evidence]').fill('Synthetic statement and sender identity verified');
  await page.getByRole('button', { name: 'Lưu giao dịch nhận tiền', exact: true }).click();
  await allocation.waitFor();
  await allocation.getByLabel('Lý do và kết quả kiểm tra').fill('Sender verified against order despite incorrect transfer description');
  await allocation.getByRole('button', { name: 'Xác nhận phân bổ tiền', exact: true }).click();
  await allocation.waitFor({ state: 'detached' });
  const excessCard = page.locator('article').filter({ has: page.getByRole('heading', { name: overReference, exact: true }) });
  await excessCard.getByText('Thừa tiền, cần xử lý', { exact: true }).waitFor();
  const receipts = await context.request.get(`${apiUrl}/api/admin/payments/receipts?reviewOnly=true`, { headers: { Authorization: `Bearer ${await bearer(accounts.admin)}` } });
  const recorded = (await receipts.json()).items.find((value) => value.reference === overReference);
  assert.equal(recorded.unappliedAmount, 30000);
  assert.equal(recorded.allocatedAmount, 145000);
  assert.equal((await database.query('SELECT "paymentStatus" FROM orders WHERE id=$1', [paidOrder.id])).rows[0].paymentStatus, 'paid');
  await logout(); await login(accounts.buyer); await goto(`/orders/${paidOrder.id}`);
  assert.equal(await page.getByRole('button', { name: 'Hiển thị mã VietQR', exact: true }).count(), 0);
  passed('Browser wrong-content reconciliation retains its explanation and leaves excess money unallocated after settling the order');
}

module.exports = { verifyCommerceUI };

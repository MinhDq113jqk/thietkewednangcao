const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { createApplication } = require('../../dist/bootstrap');
let nestApp;
const { sequelize } = require('../database/connection');
const {
  Order,
  PaymentTransaction,
  Product,
  Shop,
  User,
} = require('../models');

const runId = Date.now();
const smokeEmail = `codex-smoke-${runId}@example.test`;
const smokeSellerEmail = `codex-smoke-seller-${runId}@example.test`;
const smokeAdminEmail = `codex-smoke-admin-${runId}@example.test`;
let smokeSellerPassword = null;
let smokeAdminId = null;
let smokeAdminPassword = null;
let smokeShopId = null;
let server = null;

const parseResponse = async (response) => {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
};

const expectStatus = async (response, expected, label) => {
  const body = await parseResponse(response);
  if (!expected.includes(response.status)) {
    throw new Error(`${label} returned ${response.status}: ${JSON.stringify(body).slice(0, 300)}`);
  }
  return body;
};

const createCatalogFixture = async () => {
  smokeSellerPassword = `Seller-${crypto.randomBytes(12).toString('hex')}`;
  const seller = await User.create({
    name: 'Core Flow Seller',
    email: smokeSellerEmail,
    password: await bcrypt.hash(smokeSellerPassword, 10),
    role: 'seller',
  });

  smokeAdminPassword = `Admin-${crypto.randomBytes(12).toString('hex')}`;
  const admin = await User.create({
    name: 'Core Flow Admin',
    email: smokeAdminEmail,
    password: await bcrypt.hash(smokeAdminPassword, 10),
    role: 'admin',
  });
  smokeAdminId = admin.id;

  const shop = await Shop.create({
    ownerId: seller.id,
    name: 'Core Flow Craft',
    slug: `core-flow-craft-${runId}`,
    description: 'Temporary automated smoke fixture',
    location: 'Ha Noi',
    status: 'active',
  });
  smokeShopId = shop.id;

  const product = await Product.create({
    shopId: shop.id,
    name: `Core Flow Souvenir ${runId}`,
    description: 'Temporary automated smoke fixture',
    price: 125000,
    stock: 5,
    category: 'Smoke Test',
    isActive: true,
  });
  return product;
};

const run = async () => {
  const [database] = await sequelize.query('SELECT current_database() AS name');
  if (!/^souvenirshop_verify_[a-z0-9_]+$/.test(database[0].name) || process.env.NODE_ENV !== 'test') {
    throw new Error('Core smoke requires a disposable verification database; use npm run verify:db.');
  }
  const fixtureProduct = await createCatalogFixture();
  nestApp = await createApplication();
  await nestApp.listen(0, '127.0.0.1');
  server = nestApp.getHttpServer();

  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  const password = `Smoke-${crypto.randomBytes(12).toString('hex')}`;

  const health = await fetch(`${baseUrl}/health`);
  await expectStatus(health, [200], 'health');

  const unauthorizedResponse = await fetch(`${baseUrl}/api/orders`);
  const unauthorized = await expectStatus(unauthorizedResponse, [401], 'protected route');
  if (unauthorized.error?.status !== 401 || !unauthorized.error?.requestId) {
    throw new Error('Protected route did not return the standard error envelope');
  }

  const missingResponse = await fetch(`${baseUrl}/api/definitely-missing`);
  const missing = await expectStatus(missingResponse, [404], 'missing route');
  if (missing.error?.status !== 404 || !missing.error?.requestId) {
    throw new Error('Missing route did not return the standard error envelope');
  }

  const register = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Core Flow Smoke',
      email: smokeEmail,
      password,
    }),
  });
  const registration = await expectStatus(register, [201], 'register');
  const authorization = `Bearer ${registration.token}`;

  const sellerLoginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: smokeSellerEmail,
      password: smokeSellerPassword,
    }),
  });
  const sellerLogin = await expectStatus(sellerLoginResponse, [200], 'seller login');
  const sellerAuthorization = `Bearer ${sellerLogin.token}`;

  const adminLoginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: smokeAdminEmail,
      password: smokeAdminPassword,
    }),
  });
  const adminLogin = await expectStatus(adminLoginResponse, [200], 'admin login');
  const adminAuthorization = `Bearer ${adminLogin.token}`;

  const productResponse = await fetch(
    `${baseUrl}/api/products?limit=24&category=${encodeURIComponent('Smoke Test')}&fixture=${runId}`
  );
  const productList = await expectStatus(productResponse, [200], 'products');
  const product = productList.items?.find((item) => item.id === fixtureProduct.id);
  if (!product) throw new Error('Smoke test needs at least one active product with stock');

  const invalidProductResponse = await fetch(`${baseUrl}/api/seller/products/${product.id}`, {
    method: 'PUT',
    headers: {
      Authorization: sellerAuthorization,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ price: -1, stock: -1 }),
  });
  await expectStatus(invalidProductResponse, [400], 'invalid product values');

  const spoofedImage = new FormData();
  spoofedImage.append(
    'image',
    new Blob([Buffer.from('<html><script>alert(1)</script></html>')], { type: 'image/png' }),
    'not-an-image.png',
  );
  const spoofedUploadResponse = await fetch(`${baseUrl}/api/uploads/image`, {
    method: 'POST',
    headers: { Authorization: sellerAuthorization },
    body: spoofedImage,
  });
  await expectStatus(spoofedUploadResponse, [400], 'spoofed image upload');

  const buyerUpload = new FormData();
  buyerUpload.append(
    'image',
    new Blob([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], { type: 'image/png' }),
    'buyer.png',
  );
  const buyerUploadResponse = await fetch(`${baseUrl}/api/uploads/image`, {
    method: 'POST',
    headers: { Authorization: authorization },
    body: buyerUpload,
  });
  await expectStatus(buyerUploadResponse, [403], 'buyer image upload');

  const recommendationResponse = await fetch(
    `${baseUrl}/api/products/recommendations?limit=4&productId=${encodeURIComponent(product.id)}`,
    { headers: { Authorization: authorization } }
  );
  const recommendations = await expectStatus(recommendationResponse, [200], 'recommendations');
  if (!Array.isArray(recommendations.items)) {
    throw new Error('Recommendation response does not contain an items array');
  }

  const key = `smoke_${crypto.randomUUID()}`;
  const orderPayload = {
    items: [{ productId: product.id, quantity: 1 }],
    shippingAddress: {
      name: 'Core Flow Smoke',
      phone: '0900000000',
      address: '1 Duong Kiem Thu',
      city: 'Ha Noi',
    },
    paymentMethod: 'cod',
    note: 'automated smoke test',
  };
  const orderHeaders = {
    Authorization: authorization,
    'Content-Type': 'application/json',
    'Idempotency-Key': key,
  };
  const quoteResponse = await fetch(`${baseUrl}/api/shipping/estimate`, {
    method: 'POST', headers: orderHeaders,
    body: JSON.stringify({ city: orderPayload.shippingAddress.city, items: orderPayload.items }),
  });
  const quote = await expectStatus(quoteResponse, [200], 'checkout quote');
  orderPayload.quoteFingerprint = quote.fingerprint;

  const suspendResponse = await fetch(`${baseUrl}/api/admin/shops/${smokeShopId}/suspend`, {
    method: 'PUT',
    headers: { Authorization: adminAuthorization, 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: 'Synthetic shop moderation verification' }),
  });
  await expectStatus(suspendResponse, [200], 'suspend shop');

  const suspendedProductResponse = await fetch(
    `${baseUrl}/api/products?limit=24&category=${encodeURIComponent('Smoke Test')}&fixture=${runId}`,
  );
  const suspendedProducts = await expectStatus(suspendedProductResponse, [200], 'suspended product list');
  if (suspendedProducts.items?.some((item) => item.id === product.id)) {
    throw new Error('Suspended shop product remained visible in the public catalog');
  }

  const suspendedCheckoutResponse = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: {
      ...orderHeaders,
      'Idempotency-Key': `suspended_${crypto.randomUUID()}`,
    },
    body: JSON.stringify(orderPayload),
  });
  await expectStatus(suspendedCheckoutResponse, [409], 'suspended shop checkout');

  const approveResponse = await fetch(`${baseUrl}/api/admin/shops/${smokeShopId}/approve`, {
    method: 'PUT',
    headers: { Authorization: adminAuthorization, 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: 'Synthetic shop moderation verification' }),
  });
  await expectStatus(approveResponse, [200], 'reactivate shop');

  const checkoutResponses = await Promise.all([
    fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: orderHeaders,
      body: JSON.stringify(orderPayload),
    }),
    fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: orderHeaders,
      body: JSON.stringify(orderPayload),
    }),
  ]);
  const checkoutResults = await Promise.all(
    checkoutResponses.map(async (response, index) => ({
      status: response.status,
      body: await expectStatus(response, [200, 201], `concurrent checkout ${index + 1}`),
    }))
  );
  const statuses = checkoutResults.map((result) => result.status).sort().join(',');
  if (statuses !== '200,201') {
    throw new Error(`Concurrent checkout returned unexpected statuses: ${statuses}`);
  }
  const firstOrder = checkoutResults.find((result) => !result.body.idempotentReplay)?.body;
  const replay = checkoutResults.find((result) => result.body.idempotentReplay)?.body;
  if (!firstOrder || !replay) {
    throw new Error('Concurrent checkout did not produce one creation and one replay');
  }
  const orderIds = firstOrder.orders?.map((order) => order.id) || [];
  if (!orderIds.length || firstOrder.idempotentReplay !== false) {
    throw new Error('First checkout did not create an order');
  }

  if (!replay.idempotentReplay) throw new Error('Repeated checkout was not marked as a replay');
  if (replay.orders?.map((order) => order.id).join(',') !== orderIds.join(',')) {
    throw new Error('Repeated checkout returned different order ids');
  }

  const conflictingResponse = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: orderHeaders,
    body: JSON.stringify({ ...orderPayload, note: 'changed request' }),
  });
  const conflict = await expectStatus(conflictingResponse, [409], 'idempotency conflict');
  if ((conflict.code || conflict.error?.code) !== 'IDEMPOTENCY_KEY_REUSED') {
    throw new Error('Changed checkout did not return the expected idempotency error');
  }

  const sellerUpdate = async (path, payload, label) => {
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'PUT',
      headers: {
        Authorization: sellerAuthorization,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload || {}),
    });
    return expectStatus(response, [200], label);
  };

  for (const orderId of orderIds) {
    await sellerUpdate(`/api/seller/orders/${orderId}/confirm`, {}, 'confirm order');
    await sellerUpdate(`/api/seller/orders/${orderId}/pack`, {}, 'pack order');
    await sellerUpdate(`/api/seller/orders/${orderId}/ship`, {
      carrier: 'Smoke Express',
      trackingCode: `SMOKE-${runId}`,
      currentLocation: 'Ha Noi',
      estimatedDeliveryAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    }, 'ship order');
    await sellerUpdate(`/api/seller/orders/${orderId}/tracking`, {
      currentLocation: 'Trung tam phan loai',
      note: 'Da den diem trung chuyen',
    }, 'update tracking');

    const detailResponse = await fetch(`${baseUrl}/api/orders/${orderId}`, {
      headers: { Authorization: authorization },
    });
    const detail = await expectStatus(detailResponse, [200], 'order detail');
    if (
      detail.status !== 'shipping'
      || detail.currentLocation !== 'Trung tam phan loai'
      || !Array.isArray(detail.trackingHistory)
      || detail.trackingHistory.length < 5
    ) {
      throw new Error('Order detail is missing the seller tracking updates');
    }

    await sellerUpdate(`/api/seller/orders/${orderId}/deliver`, {
      currentLocation: 'Dia chi nguoi nhan',
      note: 'Nguoi nhan da nhan hang',
    }, 'deliver order');

    const deliveredResponse = await fetch(`${baseUrl}/api/orders/${orderId}`, {
      headers: { Authorization: authorization },
    });
    const delivered = await expectStatus(deliveredResponse, [200], 'delivered order detail');
    if (
      delivered.status !== 'delivered'
      || delivered.paymentStatus !== 'unpaid'
      || delivered.trackingHistory?.at(-1)?.status !== 'delivered'
    ) {
      throw new Error('Delivered COD order must retain unpaid state until collection evidence');
    }
  }

  const cancellationResponse = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: {
      ...orderHeaders,
      'Idempotency-Key': `cancel_${crypto.randomUUID()}`,
    },
    body: JSON.stringify({ ...orderPayload, note: 'cancellation smoke test' }),
  });
  const cancellation = await expectStatus(cancellationResponse, [201], 'cancellation checkout');
  const cancellationOrderIds = cancellation.orders?.map((order) => order.id) || [];
  if (!cancellationOrderIds.length) throw new Error('Cancellation checkout did not create an order');

  for (const orderId of cancellationOrderIds) {
    const cancelResponse = await fetch(`${baseUrl}/api/orders/${orderId}/cancel`, {
      method: 'PUT',
      headers: { Authorization: authorization },
    });
    await expectStatus(cancelResponse, [200], 'cancel order');
  }

  const stockBeforePaymentFlow = Number((await Product.findByPk(product.id)).stock);
  const transferResponse = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: {
      ...orderHeaders,
      'Idempotency-Key': `payment_${crypto.randomUUID()}`,
    },
    body: JSON.stringify({
      ...orderPayload,
      paymentMethod: 'bank_transfer',
      note: 'manual payment reconciliation smoke test',
    }),
  });
  const transferCheckout = await expectStatus(transferResponse, [201], 'bank transfer checkout');
  const transferOrder = transferCheckout.orders?.[0];
  if (!transferOrder) throw new Error('Bank transfer checkout did not create an order');

  const invalidTransitionResponse = await fetch(`${baseUrl}/api/admin/orders/${transferOrder.id}/status`, {
    method: 'PUT',
    headers: {
      Authorization: adminAuthorization,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: 'delivered' }),
  });
  await expectStatus(invalidTransitionResponse, [409], 'invalid admin order transition');

  const receiptResponse = await fetch(`${baseUrl}/api/admin/payments/receipts`, {
    method: 'POST', headers: { Authorization: adminAuthorization, 'Content-Type': 'application/json' },
    body: JSON.stringify({ reference: `SMOKE-${runId}`, amount: Number(transferOrder.total) + Number(transferOrder.shippingFee),
      receivedAt: new Date().toISOString(), transferContent: `DH ${transferOrder.id.slice(0, 12)}`, orderId: transferOrder.id,
      evidence: 'Synthetic incoming transfer verified against fixture bank statement' }),
  });
  const receipt = await expectStatus(receiptResponse, [201], 'record incoming bank receipt');
  const allocateResponse = await fetch(`${baseUrl}/api/admin/payments/receipts/${receipt.receipt.id}/allocate`, {
    method: 'POST', headers: { Authorization: adminAuthorization, 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId: transferOrder.id, note: 'Synthetic bank statement matched to order' }),
  });
  const allocation = await expectStatus(allocateResponse, [200], 'allocate bank receipt');
  const paid = { order: await Order.findByPk(transferOrder.id), payment: await PaymentTransaction.findOne({ where: { orderId: transferOrder.id } }) };
  if (!allocation.allocated) throw new Error('Receipt was not allocated');
  if (
    paid.order?.paymentStatus !== 'paid'
    || paid.payment?.status !== 'paid'
    || Number(paid.payment?.amount) <= 0
    || paid.payment?.confirmedBy !== smokeAdminId
  ) {
    throw new Error('Manual payment confirmation is missing audit data');
  }

  const paidCancelResponse = await fetch(`${baseUrl}/api/orders/${transferOrder.id}/cancel`, {
    method: 'PUT',
    headers: { Authorization: authorization },
  });
  await expectStatus(paidCancelResponse, [409], 'cancel paid order before refund');

  await expectStatus(await fetch(`${baseUrl}/api/admin/after-sales/refunds`, {
    method: 'POST', headers: { Authorization: adminAuthorization, 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: 'bank_order', orderId: transferOrder.id, receiptId: receipt.receipt.id,
      amount: Number(transferOrder.total) + Number(transferOrder.shippingFee), reference: `SMOKE-REFUND-${runId}`,
      occurredAt: new Date().toISOString(), evidence: 'Synthetic outgoing refund verified against fixture bank statement',
      note: 'Pre-fulfilment refund closes order with one inventory restoration' }),
  }), [201], 'record refund ledger');
  const adminCancelResponse = await fetch(`${baseUrl}/api/admin/orders/${transferOrder.id}/status`, {
    method: 'PUT',
    headers: {
      Authorization: adminAuthorization,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: 'cancelled' }),
  });
  await expectStatus(adminCancelResponse, [409], 'cannot cancel an already closed refunded order');
  const stockAfterPaymentFlow = Number((await Product.findByPk(product.id)).stock);
  if (stockAfterPaymentFlow !== stockBeforePaymentFlow) {
    throw new Error('Cancelled refunded order did not restore stock exactly once');
  }

  console.log(`Core smoke passed: health, auth, upload hardening, catalog suspension, product validation, idempotency, tracking, delivery, cancellation and payment reconciliation (${orderIds.length + cancellationOrderIds.length + 1} orders)`);
};

run()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    // The parent verifier drops its entire disposable database, including immutable history.
    if (server) {
      await nestApp.close();
    }
    await sequelize.close();
  });

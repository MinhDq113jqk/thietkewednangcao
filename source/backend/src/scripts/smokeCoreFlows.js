const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const app = require('../app');
const { sequelize } = require('../config/db');
const {
  Address,
  CheckoutAttempt,
  Order,
  OrderItem,
  PaymentTransaction,
  Product,
  Review,
  Shop,
  User,
} = require('../models');

const runId = Date.now();
const smokeEmail = `codex-smoke-${runId}@example.test`;
const smokeSellerEmail = `codex-smoke-seller-${runId}@example.test`;
const smokeAdminEmail = `codex-smoke-admin-${runId}@example.test`;
let smokeUserId = null;
let smokeSellerId = null;
let smokeSellerPassword = null;
let smokeAdminId = null;
let smokeAdminPassword = null;
let smokeShopId = null;
let smokeProductId = null;
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

const cleanupStaleFixtures = async () => {
  const users = await User.findAll({
    where: { email: { [Op.like]: 'codex-smoke-%@example.test' } },
    attributes: ['id'],
  });
  const userIds = users.map((user) => user.id);
  if (!userIds.length) return;

  await sequelize.transaction(async (transaction) => {
    const shops = await Shop.findAll({
      where: { ownerId: { [Op.in]: userIds } },
      attributes: ['id'],
      transaction,
    });
    const shopIds = shops.map((shop) => shop.id);
    const orderWhere = shopIds.length
      ? {
          [Op.or]: [
            { buyerId: { [Op.in]: userIds } },
            { shopId: { [Op.in]: shopIds } },
          ],
        }
      : { buyerId: { [Op.in]: userIds } };
    const orders = await Order.findAll({ where: orderWhere, attributes: ['id'], transaction });
    const orderIds = orders.map((order) => order.id);

    if (orderIds.length) {
      await PaymentTransaction.destroy({ where: { orderId: { [Op.in]: orderIds } }, transaction });
      await OrderItem.destroy({ where: { orderId: { [Op.in]: orderIds } }, transaction });
      await Order.destroy({ where: { id: { [Op.in]: orderIds } }, transaction });
    }
    await CheckoutAttempt.destroy({ where: { buyerId: { [Op.in]: userIds } }, transaction });
    await Address.destroy({ where: { userId: { [Op.in]: userIds } }, transaction });
    await Review.destroy({ where: { userId: { [Op.in]: userIds } }, transaction });
    if (shopIds.length) {
      await Product.destroy({ where: { shopId: { [Op.in]: shopIds } }, transaction });
      await Shop.destroy({ where: { id: { [Op.in]: shopIds } }, transaction });
    }
    await User.destroy({ where: { id: { [Op.in]: userIds } }, transaction });
  });
};

const cleanup = async () => {
  const user = smokeUserId
    ? await User.findByPk(smokeUserId)
    : await User.findOne({ where: { email: smokeEmail } });

  if (user) await sequelize.transaction(async (transaction) => {
    const orders = await Order.findAll({
      where: { buyerId: user.id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    for (const order of orders) {
      const items = await OrderItem.findAll({
        where: { orderId: order.id },
        transaction,
      });
      if (order.status !== 'cancelled') {
        for (const item of items) {
          const product = await Product.findByPk(item.productId, {
            transaction,
            lock: transaction.LOCK.UPDATE,
          });
          if (product) {
            await product.update({
              stock: Number(product.stock) + Number(item.quantity),
              sold: Math.max(0, Number(product.sold || 0) - Number(item.quantity)),
            }, { transaction });
          }
        }
      }
    }

    const orderIds = orders.map((order) => order.id);
    if (orderIds.length) {
      await PaymentTransaction.destroy({ where: { orderId: { [Op.in]: orderIds } }, transaction });
      await OrderItem.destroy({ where: { orderId: { [Op.in]: orderIds } }, transaction });
      await Order.destroy({ where: { id: { [Op.in]: orderIds } }, transaction });
    }
    await CheckoutAttempt.destroy({ where: { buyerId: user.id }, transaction });
    await Address.destroy({ where: { userId: user.id }, transaction });
    await Review.destroy({ where: { userId: user.id }, transaction });
    await User.destroy({ where: { id: user.id }, transaction });
  });

  if (smokeProductId) await Product.destroy({ where: { id: smokeProductId } });
  if (smokeShopId) await Shop.destroy({ where: { id: smokeShopId } });
  if (smokeSellerId) await User.destroy({ where: { id: smokeSellerId } });
  if (smokeAdminId) await User.destroy({ where: { id: smokeAdminId } });
};

const createCatalogFixture = async () => {
  smokeSellerPassword = `Seller-${crypto.randomBytes(12).toString('hex')}`;
  const seller = await User.create({
    name: 'Core Flow Seller',
    email: smokeSellerEmail,
    password: await bcrypt.hash(smokeSellerPassword, 10),
    role: 'seller',
  });
  smokeSellerId = seller.id;

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
  smokeProductId = product.id;
  return product;
};

const run = async () => {
  await cleanupStaleFixtures();
  const fixtureProduct = await createCatalogFixture();
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

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
  smokeUserId = registration.user?.id;
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

  const suspendResponse = await fetch(`${baseUrl}/api/admin/shops/${smokeShopId}/suspend`, {
    method: 'PUT',
    headers: { Authorization: adminAuthorization },
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
    headers: { Authorization: adminAuthorization },
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
      || delivered.paymentStatus !== 'paid'
      || delivered.trackingHistory?.at(-1)?.status !== 'delivered'
    ) {
      throw new Error('Delivered order did not finish payment and tracking state');
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

  const updatePayment = async (status, label) => {
    const response = await fetch(`${baseUrl}/api/admin/orders/${transferOrder.id}/payment`, {
      method: 'PUT',
      headers: {
        Authorization: adminAuthorization,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status, reference: `SMOKE-${runId}` }),
    });
    return expectStatus(response, [200], label);
  };

  const paid = await updatePayment('paid', 'confirm manual payment');
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

  await updatePayment('refunded', 'refund manual payment');
  const adminCancelResponse = await fetch(`${baseUrl}/api/admin/orders/${transferOrder.id}/status`, {
    method: 'PUT',
    headers: {
      Authorization: adminAuthorization,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: 'cancelled' }),
  });
  await expectStatus(adminCancelResponse, [200], 'cancel refunded order');
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
    try {
      await cleanup();
    } catch (error) {
      console.error(`Smoke cleanup failed: ${error.message}`);
      process.exitCode = 1;
    }

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await sequelize.close();
  });

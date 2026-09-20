require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const { randomUUID } = require('crypto');
const app = require('../app');
const { sequelize } = require('../config/db');

const buyerCredentials = {
  email: process.env.SMOKE_BUYER_EMAIL,
  password: process.env.SMOKE_BUYER_PASSWORD,
};

if (!buyerCredentials.email || !buyerCredentials.password) {
  throw new Error('Set SMOKE_BUYER_EMAIL and SMOKE_BUYER_PASSWORD before running this smoke test');
}

const shippingAddress = {
  name: 'Buyer Smoke Test',
  phone: '0900000000',
  address: '1 Nguyen Trai',
  city: 'Ha Noi',
  district: 'Thanh Xuan',
};

const readJson = async (response) => {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
};

const request = async (baseUrl, path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const body = await readJson(response);

  if (!response.ok) {
    const message = body.message || body.error?.message || response.statusText;
    throw new Error(`${options.method || 'GET'} ${path} failed (${response.status}): ${message}`);
  }

  return body;
};

const listen = () => new Promise((resolve) => {
  const server = app.listen(0, () => resolve(server));
});

const run = async () => {
  const server = await listen();
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  let authHeaders;
  let createdOrderId;
  let cleanupStatus = 'not-needed';

  try {
    const login = await request(baseUrl, '/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(buyerCredentials),
    });

    authHeaders = { Authorization: `Bearer ${login.token}` };
    const products = await request(baseUrl, '/api/products?limit=1');
    const product = products.items?.find((item) => Number(item.stock || 0) > 0);
    if (!product) throw new Error('No active product with stock was found for checkout smoke test');

    const orderPayload = {
      items: [{ productId: product.id, quantity: 1 }],
      shippingAddress,
      paymentMethod: 'bank_transfer',
      note: `Smoke VietQR ${new Date().toISOString()}`,
    };

    const orderResponse = await request(baseUrl, '/api/orders', {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Idempotency-Key': `checkout_${randomUUID()}`,
      },
      body: JSON.stringify(orderPayload),
    });

    const order = orderResponse.orders?.[0];
    if (!order?.id) throw new Error('Order API did not return a created order');
    createdOrderId = order.id;

    const payment = await request(baseUrl, `/api/payment/vietqr/${createdOrderId}`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({}),
    });

    if (!payment.qrDataURL?.startsWith('data:image/png;base64,')) {
      throw new Error('VietQR response did not include a PNG data URL');
    }

    if (!payment.bank?.accountNo || !payment.bank?.acqId || !payment.addInfo) {
      throw new Error('VietQR response is missing bank.accountNo, bank.acqId, or addInfo');
    }

    await request(baseUrl, `/api/orders/${createdOrderId}/cancel`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({}),
    });
    cleanupStatus = 'order-cancelled';

    console.log(JSON.stringify({
      ok: true,
      orderId: createdOrderId,
      productId: product.id,
      paymentMethod: 'bank_transfer',
      paymentStatus: payment.paymentStatus,
      qrDataURLPrefix: payment.qrDataURL.slice(0, 22),
      qrCodeLength: String(payment.qrCode || '').length,
      addInfo: payment.addInfo,
      amount: payment.amount,
      acqId: payment.bank.acqId,
      accountNo: payment.bank.accountNo,
      cleanup: cleanupStatus,
    }, null, 2));
  } catch (err) {
    if (createdOrderId && authHeaders && cleanupStatus !== 'order-cancelled') {
      try {
        await request(baseUrl, `/api/orders/${createdOrderId}/cancel`, {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify({}),
        });
        cleanupStatus = 'order-cancelled-after-error';
      } catch (cleanupErr) {
        cleanupStatus = `cleanup-failed: ${cleanupErr.message}`;
      }
    }

    console.error(err.message);
    if (createdOrderId) console.error(`cleanup=${cleanupStatus}`);
    process.exitCode = 1;
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await sequelize.close();
  }
};

run();

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';

const require = createRequire(import.meta.url);
const {
  getOrderPaymentAmount,
  validateManualPaymentStatus,
  validateVietQrOrder,
} = require('../backend/src/services/paymentState.service.js');

describe('payment state rules', () => {
  const order = {
    total: 120000,
    shippingFee: 30000,
    status: 'pending',
    paymentMethod: 'bank_transfer',
    paymentStatus: 'unpaid',
  };

  it('calculates the server-side payable amount', () => {
    assert.equal(getOrderPaymentAmount(order), 150000);
  });

  it('allows VietQR only for active unpaid bank transfer orders', () => {
    assert.equal(validateVietQrOrder(order), null);
    assert.ok(validateVietQrOrder({ ...order, paymentMethod: 'cod' }));
    assert.ok(validateVietQrOrder({ ...order, status: 'cancelled' }));
    assert.ok(validateVietQrOrder({ ...order, paymentStatus: 'paid' }));
  });

  it('requires a paid transfer before refunding', () => {
    assert.ok(validateManualPaymentStatus(order, 'refunded'));
    assert.equal(validateManualPaymentStatus({ ...order, paymentStatus: 'paid' }, 'refunded'), null);
  });
});

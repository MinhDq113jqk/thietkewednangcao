import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';

const require = createRequire(import.meta.url);
const {
  createCheckoutRequestHash,
  isValidIdempotencyKey,
  normalizeCartItems,
  normalizeShippingAddress,
} = require('../backend/src/services/checkoutIdempotency.service.js');

describe('checkout idempotency', () => {
  it('merges duplicate cart rows before stock validation', () => {
    assert.deepEqual(normalizeCartItems([
      { productId: 'product-b', quantity: 1 },
      { productId: 'product-a', quantity: 2 },
      { productId: 'product-a', quantity: 3 },
      { productId: '', quantity: 9 },
    ]), [
      { productId: 'product-a', quantity: 5 },
      { productId: 'product-b', quantity: 1 },
    ]);
  });

  it('normalizes shipping input without keeping extra fields', () => {
    assert.deepEqual(normalizeShippingAddress({
      name: '  Minh  ',
      phone: '090 000 0000',
      address: ' 1 Pho Hue ',
      district: ' Hai Ba Trung ',
      city: ' Ha Noi ',
      internalNote: 'must not leak',
    }), {
      name: 'Minh',
      phone: '0900000000',
      address: '1 Pho Hue',
      district: 'Hai Ba Trung',
      city: 'Ha Noi',
    });
  });

  it('creates the same hash for equivalent carts in different row order', () => {
    const common = {
      shippingAddress: {
        name: 'Minh',
        phone: '0900000000',
        address: '1 Pho Hue',
        city: 'Ha Noi',
      },
      paymentMethod: 'cod',
      note: '',
    };

    const first = createCheckoutRequestHash({
      ...common,
      items: [
        { productId: 'product-b', quantity: 1 },
        { productId: 'product-a', quantity: 2 },
      ],
    });
    const second = createCheckoutRequestHash({
      ...common,
      items: [
        { productId: 'product-a', quantity: 2 },
        { productId: 'product-b', quantity: 1 },
      ],
    });

    assert.equal(first, second);
    assert.equal(first.length, 64);
  });

  it('accepts only bounded opaque keys', () => {
    assert.equal(isValidIdempotencyKey('checkout_1234567890abcdef'), true);
    assert.equal(isValidIdempotencyKey('short'), false);
    assert.equal(isValidIdempotencyKey('contains spaces 123456'), false);
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  clearCheckoutKey,
  createCheckoutKey,
  getOrCreateCheckoutKey,
} from '../src/utils/checkoutSession.js';

const createStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
};

describe('checkout session key', () => {
  it('creates a stable key until checkout succeeds', () => {
    const storage = createStorage();
    const cryptoObject = { randomUUID: () => '12345678-1234-1234-1234-123456789abc' };

    const first = getOrCreateCheckoutKey(storage, cryptoObject);
    const second = getOrCreateCheckoutKey(storage, { randomUUID: () => 'different' });

    assert.equal(first, 'checkout_12345678-1234-1234-1234-123456789abc');
    assert.equal(second, first);

    clearCheckoutKey(storage);
    assert.equal(storage.getItem('souvenir-checkout-key'), null);
  });

  it('uses the browser UUID generator when available', () => {
    assert.equal(
      createCheckoutKey({ randomUUID: () => 'uuid-value-123456' }),
      'checkout_uuid-value-123456'
    );
  });
});

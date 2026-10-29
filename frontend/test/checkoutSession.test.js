import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  clearCheckoutKey,
  createCheckoutKey,
  getOrCreateCheckoutKey,
  getCheckoutAttempt,
  saveCheckoutAttempt,
  clearCheckoutAttempt,
  accountCheckoutStorage,
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
  it('keeps pending shipping details separate per account while preserving same-account retries', () => {
    const storage = createStorage();
    const first = accountCheckoutStorage(storage, 'buyer-a');
    const other = accountCheckoutStorage(storage, 'buyer-b');
    const attempt = { idempotencyKey: 'checkout-fixture', payload: { items: [{ productId: 'p1', quantity: 1 }], shippingAddress: { name: 'Buyer A' } }, items: [{ id: 'p1' }], quote: { fingerprint: 'fixture' } };
    saveCheckoutAttempt(attempt, first);
    assert.equal(getCheckoutAttempt(other), null);
    assert.deepEqual(getCheckoutAttempt(accountCheckoutStorage(storage, 'buyer-a')), attempt);
    clearCheckoutKey(other);
    assert.deepEqual(getCheckoutAttempt(first), attempt);
  });
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

  it('restores the exact pending payload after reload and clears it only on a known result', () => {
    const storage = createStorage();
    const attempt = {
      idempotencyKey: getOrCreateCheckoutKey(storage),
      payload: { items: [{ productId: 'p1', quantity: 2 }], quoteFingerprint: 'a'.repeat(64) },
      quote: { fingerprint: 'a'.repeat(64), total: 650000 },
      items: [{ id: 'p1', quantity: 2 }],
    };
    saveCheckoutAttempt(attempt, storage);
    assert.deepEqual(getCheckoutAttempt(storage), attempt);
    clearCheckoutAttempt(storage);
    assert.equal(getCheckoutAttempt(storage), null);
    assert.equal(getOrCreateCheckoutKey(storage), attempt.idempotencyKey);
    saveCheckoutAttempt(attempt, storage);
    clearCheckoutKey(storage);
    assert.equal(getCheckoutAttempt(storage), null);
    assert.equal(storage.getItem('souvenir-checkout-key'), null);
    storage.setItem('souvenir-checkout-attempt', 'invalid-json');
    assert.equal(getCheckoutAttempt(storage), null);
  });

  it('uses the browser UUID generator when available', () => {
    assert.equal(
      createCheckoutKey({ randomUUID: () => 'uuid-value-123456' }),
      'checkout_uuid-value-123456'
    );
  });
});

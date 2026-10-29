import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateAddress, validateShippingAddress } from '../../backend/src/shared/addressValidation.mjs';

test('address validation rejects malformed values and normalizes valid input', () => {
  const good = { name: ' Người nhận ', phone: '+84 912 345 678', detail: ' 12 Phố A ', city: ' Hà Nội ', isDefault: true };
  assert.deepEqual(validateAddress(good).value, { name: 'Người nhận', phone: '+84912345678', detail: '12 Phố A', city: 'Hà Nội', district: '', isDefault: true });
  for (const patch of [{ phone: 'abc' }, { name: [] }, { detail: '' }, { city: 'x'.repeat(101) }, { isDefault: 'false' }]) assert.equal(validateAddress({ ...good, ...patch }).valid, false);
});

test('checkout uses address-book rules without coercing raw input', () => {
  const good = { name: ' Người nhận ', phone: '+84 (912) 345-678', address: ' 12 Phố A ', city: ' Hà Nội ' };
  assert.deepEqual(validateShippingAddress(good).value, {
    name: 'Người nhận', phone: '+84912345678', address: '12 Phố A', district: '', city: 'Hà Nội',
  });
  for (const patch of [{ phone: 'abc' }, { phone: 912345678 }, { name: {} }, { name: [] },
    { name: 'x'.repeat(101) }, { address: 'x'.repeat(301) }, { address: true },
    { city: '' }, { city: 'x'.repeat(101) }, { district: [] }]) {
    const checkout = validateShippingAddress({ ...good, ...patch });
    const address = { ...good, ...patch };
    assert.equal(checkout.valid, false);
    assert.equal(checkout.valid, validateAddress({ ...address, detail: address.address }).valid);
  }
  for (const malformed of [null, undefined, [], 'address', 42]) assert.equal(validateShippingAddress(malformed).valid, false);
  assert.ok(validateShippingAddress({ ...good, address: '' }).errors.address);
});

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';

const require = createRequire(import.meta.url);
const {
  canAdminTransitionOrder,
  getAdminOrderTransitions,
} = require('../backend/src/services/orderState.service.js');

describe('admin order state rules', () => {
  it('allows only forward operational transitions and safe cancellation', () => {
    assert.equal(canAdminTransitionOrder('pending', 'confirmed'), true);
    assert.equal(canAdminTransitionOrder('confirmed', 'packing'), true);
    assert.equal(canAdminTransitionOrder('packing', 'cancelled'), true);
    assert.equal(canAdminTransitionOrder('cancelled', 'shipping'), false);
    assert.equal(canAdminTransitionOrder('delivered', 'pending'), false);
  });

  it('returns no editable status for terminal orders', () => {
    assert.deepEqual(getAdminOrderTransitions('delivered'), []);
    assert.deepEqual(getAdminOrderTransitions('cancelled'), []);
  });
});

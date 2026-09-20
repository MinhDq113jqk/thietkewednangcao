import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getStepState } from '../src/components/ui/steps.helpers.js';

describe('checkout step state', () => {
  it('derives completed, current and upcoming from activeStep only', () => {
    assert.equal(getStepState(0, 2), 'completed');
    assert.equal(getStepState(1, 2), 'completed');
    assert.equal(getStepState(2, 2), 'current');
    assert.equal(getStepState(3, 2), 'upcoming');
  });
});

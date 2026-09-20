import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  sellerRegisterInitialForm,
  updateSellerRegisterForm,
} from '../src/hooks/sellerRegister.helpers.js';

describe('seller register hook helpers', () => {
  it('updates seller register form fields immutably', () => {
    const nextForm = updateSellerRegisterForm(sellerRegisterInitialForm, 'name', 'Gian hang Viet');

    assert.equal(sellerRegisterInitialForm.name, '');
    assert.equal(nextForm.name, 'Gian hang Viet');
    assert.deepEqual(Object.keys(nextForm).sort(), ['description', 'location', 'name']);
  });
});

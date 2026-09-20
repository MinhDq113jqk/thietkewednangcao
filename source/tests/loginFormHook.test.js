import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createAuthRequest,
  loginInitialForm,
  loginRequiredMessage,
  registerNameRequiredMessage,
  passwordLengthMessage,
  getSafeRedirectPath,
  updateLoginForm,
  validateLoginForm,
} from '../src/hooks/loginForm.helpers.js';

describe('login form helpers', () => {
  it('updates login form fields immutably', () => {
    const nextForm = updateLoginForm(loginInitialForm, 'email', 'buyer@example.com');

    assert.equal(loginInitialForm.email, '');
    assert.equal(nextForm.email, 'buyer@example.com');
  });

  it('validates login and register required fields', () => {
    assert.equal(validateLoginForm({ form: loginInitialForm, isLogin: true }), loginRequiredMessage);
    assert.equal(validateLoginForm({
      form: { email: 'a@b.com', password: '123456', name: '' },
      isLogin: false,
    }), registerNameRequiredMessage);
    assert.equal(validateLoginForm({
      form: { email: 'a@b.com', password: '12345678', name: 'Minh' },
      isLogin: false,
    }), '');
    assert.equal(validateLoginForm({
      form: { email: 'a@b.com', password: '123456', name: 'Minh' },
      isLogin: false,
    }), passwordLengthMessage);
  });

  it('creates auth request endpoint and payload', () => {
    assert.deepEqual(createAuthRequest({
      form: { email: 'buyer@example.com', password: '123456', name: 'Buyer' },
      isLogin: true,
    }), {
      endpoint: '/auth/login',
      payload: { email: 'buyer@example.com', password: '123456' },
    });

    assert.deepEqual(createAuthRequest({
      form: { email: 'buyer@example.com', password: '123456', name: 'Buyer' },
      isLogin: false,
    }), {
      endpoint: '/auth/register',
      payload: { name: 'Buyer', email: 'buyer@example.com', password: '123456' },
    });
  });

  it('accepts only local redirect paths', () => {
    assert.equal(getSafeRedirectPath('/checkout'), '/checkout');
    assert.equal(getSafeRedirectPath('//evil.example'), '/');
    assert.equal(getSafeRedirectPath('https://evil.example'), '/');
    assert.equal(getSafeRedirectPath('/\\evil.example'), '/');
  });
});

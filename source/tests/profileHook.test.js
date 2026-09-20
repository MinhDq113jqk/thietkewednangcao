import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createAddressPayload,
  createAddressForm,
  createPasswordPayload,
  createProfileInitialForm,
  initialAddressForm,
  initialPasswordForm,
  updateFormField,
  validatePasswordForm,
} from '../src/hooks/profile.helpers.js';

describe('profile hook helpers', () => {
  it('creates profile form from current user', () => {
    assert.deepEqual(createProfileInitialForm({ name: 'Minh', phone: '0900' }), {
      name: 'Minh',
      phone: '0900',
    });
    assert.deepEqual(createProfileInitialForm(null), { name: '', phone: '' });
  });

  it('updates generic form fields immutably', () => {
    const nextForm = updateFormField(initialAddressForm, 'city', 'Ha Noi');

    assert.equal(initialAddressForm.city, '');
    assert.equal(nextForm.city, 'Ha Noi');
  });

  it('creates address form and API payload', () => {
    const address = {
      id: 1,
      name: 'A',
      phone: '1',
      detail: 'D',
      district: 'Q',
      city: 'C',
      isDefault: true,
    };

    assert.deepEqual(createAddressForm(address), address);
    assert.deepEqual(createAddressPayload(address), {
      name: 'A',
      phone: '1',
      detail: 'D',
      district: 'Q',
      city: 'C',
      isDefault: true,
    });
  });

  it('validates password form', () => {
    assert.deepEqual(validatePasswordForm(initialPasswordForm), {
      current: 'Nhập mật khẩu hiện tại',
      next: 'Tối thiểu 8 ký tự',
    });
    assert.deepEqual(validatePasswordForm({
      current: 'oldpass',
      next: '12345678',
      confirm: '87654321',
    }), {
      confirm: 'Mật khẩu xác nhận không khớp',
    });
    assert.deepEqual(validatePasswordForm({
      current: 'oldpass',
      next: '12345678',
      confirm: '12345678',
    }), {});
    assert.deepEqual(createPasswordPayload({
      current: 'oldpass',
      next: '12345678',
      confirm: '12345678',
    }), {
      currentPassword: 'oldpass',
      newPassword: '12345678',
    });
  });
});

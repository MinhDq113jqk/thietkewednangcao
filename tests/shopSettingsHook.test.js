import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createShopSettingsPayload,
  setUploadedShopImageUrl,
} from '../src/hooks/shopSettings.helpers.js';

const createFormData = (entries) => {
  const formData = new FormData();
  Object.entries(entries).forEach(([key, value]) => formData.set(key, value));
  return formData;
};

describe('shop settings hook helpers', () => {
  it('creates shop settings payload from form data', () => {
    assert.deepEqual(createShopSettingsPayload(createFormData({
      banner: '/uploads/banner.jpg',
      description: 'Hang thu cong',
      location: 'Ha Noi',
      logo: '/uploads/logo.jpg',
      name: 'Gian hang Viet',
    })), {
      banner: '/uploads/banner.jpg',
      description: 'Hang thu cong',
      location: 'Ha Noi',
      logo: '/uploads/logo.jpg',
      name: 'Gian hang Viet',
    });
  });

  it('sets uploaded logo or banner URL into the requested field', () => {
    const form = {
      elements: {
        banner: { value: '' },
        logo: { value: '' },
      },
    };

    setUploadedShopImageUrl({ form, fieldName: 'logo', url: '/uploads/logo.jpg' });
    setUploadedShopImageUrl({ form, fieldName: 'banner', url: '/uploads/banner.jpg' });

    assert.equal(form.elements.logo.value, '/uploads/logo.jpg');
    assert.equal(form.elements.banner.value, '/uploads/banner.jpg');
  });
});

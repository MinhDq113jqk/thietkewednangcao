import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createSellerProductPayload,
  findSellerProductById,
  sellerProductCategories,
  setUploadedImageUrl,
} from '../src/hooks/sellerProductForm.helpers.js';

const createFormData = (entries) => {
  const formData = new FormData();
  Object.entries(entries).forEach(([key, value]) => formData.set(key, value));
  return formData;
};

describe('seller product form helpers', () => {
  it('finds the edited product by id', () => {
    const products = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }];

    assert.deepEqual(findSellerProductById(products, 'b'), { id: 'b', name: 'B' });
    assert.equal(findSellerProductById(products, 'missing'), undefined);
  });

  it('creates product payload from form data', () => {
    assert.deepEqual(createSellerProductPayload(createFormData({
      category: 'Gốm',
      description: 'Ly gom xanh',
      image: '/uploads/ly.jpg',
      name: 'Ly gốm',
      price: '120000',
      salePrice: '99000',
      stock: '7',
    })), {
      category: 'Gốm',
      description: 'Ly gom xanh',
      images: ['/uploads/ly.jpg'],
      name: 'Ly gốm',
      price: 120000,
      salePrice: 99000,
      stock: 7,
    });
  });

  it('creates empty optional product fields safely', () => {
    assert.deepEqual(createSellerProductPayload(createFormData({
      category: 'Nón',
      description: '',
      image: '',
      name: 'Nón lá',
      price: '65000',
      salePrice: '',
      stock: '3',
    })).images, []);
    assert.equal(createSellerProductPayload(createFormData({
      category: 'Nón',
      description: '',
      image: '',
      name: 'Nón lá',
      price: '65000',
      salePrice: '',
      stock: '3',
    })).salePrice, null);
  });

  it('sets uploaded image URL into a form field', () => {
    const form = { elements: { image: { value: '' } } };

    setUploadedImageUrl({ form, url: '/uploads/new.jpg' });
    assert.equal(form.elements.image.value, '/uploads/new.jpg');
    assert.equal(sellerProductCategories.includes('Gốm'), true);
  });
});

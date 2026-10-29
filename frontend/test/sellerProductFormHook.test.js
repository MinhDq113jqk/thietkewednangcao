import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createSellerProductPayload,
  findSellerProductById,
  sellerProductCategories,
  setUploadedImageUrl,
  validateSellerProductForm,
} from '../src/features/seller/hooks/sellerProductForm.helpers.js';

const createFormData = (entries) => {
  const formData = new FormData();
  Object.entries(entries).forEach(([key, value]) => formData.set(key, value));
  return formData;
};

describe('seller product form helpers', () => {
  it('does not submit or validate stock when saving an existing product without a stock field', () => {
    const form = createFormData({ name: 'Updated name', category: 'Gốm sứ', price: '120000' });
    assert.equal(Object.hasOwn(createSellerProductPayload(form), 'stock'), false);
    assert.deepEqual(validateSellerProductForm(form), {});
  });
  it('preserves all existing images when editing unrelated fields, including ordering and removal', () => {
    const form = createFormData({ name: 'Edited name', price: '120000', stock: '0' });
    const images = ['/uploads/third.jpg', '/uploads/first.jpg'];
    assert.deepEqual(createSellerProductPayload(form, { images }).images, images);
    assert.deepEqual(createSellerProductPayload(form, { images: [] }).images, []);
    assert.ok(validateSellerProductForm(createFormData({ name: 'A', category: 'Gốm sứ', price: 'abc', stock: '-1', salePrice: 'nan' })).price);
  });
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
      category: 'Gốm sứ',
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
    assert.equal(sellerProductCategories.includes('Gốm sứ'), true);
  });
});

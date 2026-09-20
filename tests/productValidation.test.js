import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';

const require = createRequire(import.meta.url);
const { validateProductInput } = require('../backend/src/services/productValidation.service.js');

describe('product validation', () => {
  it('rejects negative price and stock values', () => {
    const result = validateProductInput({ name: 'Test', price: -1000, stock: -5 });

    assert.equal(result.valid, false);
    assert.match(result.errors.price, /dương/);
    assert.match(result.errors.stock, /không âm/);
  });

  it('rejects a sale price above the original price on partial update', () => {
    const result = validateProductInput(
      { price: 90000 },
      { current: { name: 'Test', price: 120000, salePrice: 100000, stock: 2 }, partial: true }
    );

    assert.equal(result.valid, false);
    assert.ok(result.errors.salePrice);
  });

  it('normalizes valid product input', () => {
    const result = validateProductInput({
      name: '  Bình gốm  ',
      price: '120000',
      salePrice: '99000',
      stock: '3',
      images: [' https://example.com/gom.jpg '],
    });

    assert.equal(result.valid, true);
    assert.deepEqual(result.value, {
      name: 'Bình gốm',
      price: 120000,
      salePrice: 99000,
      stock: 3,
      images: ['https://example.com/gom.jpg'],
    });
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  calculateLineTotal,
  calculateOrderTotal,
  formatStatusLabel,
  formatVnd,
  getProductPrice,
  toNumber,
} from '../src/utils/format.js';

describe('format utilities', () => {
  it('converts values to finite numbers with fallback', () => {
    assert.equal(toNumber('120000'), 120000);
    assert.equal(toNumber(undefined), 0);
    assert.equal(toNumber('not-a-number', 99), 99);
  });

  it('formats VND values consistently', () => {
    assert.equal(formatVnd(35000), '35.000₫');
    assert.equal(formatVnd('120000.7'), '120.001₫');
    assert.equal(formatVnd('bad'), '0₫');
  });

  it('prefers salePrice over price for product price', () => {
    assert.equal(getProductPrice({ price: 120000, salePrice: 99000 }), 99000);
    assert.equal(getProductPrice({ price: '75000' }), 75000);
    assert.equal(getProductPrice(null), 0);
  });

  it('calculates cart line totals', () => {
    assert.equal(calculateLineTotal({ price: 35000, quantity: 2 }), 70000);
    assert.equal(calculateLineTotal({ price: 100000, salePrice: 80000, quantity: 3 }), 240000);
  });

  it('calculates order total from explicit total or item fallback', () => {
    assert.equal(calculateOrderTotal({ total: '150000', items: [] }), 150000);
    assert.equal(calculateOrderTotal({
      items: [
        { price: 35000, quantity: 2 },
        { price: 55000, quantity: 1 },
      ],
    }), 125000);
  });

  it('formats status labels with fallback', () => {
    const labels = { pending: 'Chờ xác nhận' };

    assert.equal(formatStatusLabel('pending', labels), 'Chờ xác nhận');
    assert.equal(formatStatusLabel('shipping', labels), 'shipping');
    assert.equal(formatStatusLabel('', labels), 'Không rõ');
  });
});

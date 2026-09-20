import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  filterSellerProducts,
  getSellerProductCategories,
} from '../src/hooks/sellerProducts.helpers.js';

const products = [
  { id: '1', name: 'Ly gom xanh', description: 'Qua tang', category: 'Gốm', isActive: true },
  { id: '2', name: 'Non la', description: 'Truyen thong', category: 'Nón', isActive: false },
  { id: '3', name: 'Tranh dong ho', description: 'Tranh dan gian', category: 'Tranh', isActive: true },
  { id: '4', name: 'Bo ly gom', description: 'Gom su', category: 'Gốm', isActive: false },
];

describe('seller products hook helpers', () => {
  it('extracts unique sorted categories', () => {
    assert.deepEqual(getSellerProductCategories(products), ['Gốm', 'Nón', 'Tranh']);
  });

  it('filters seller products by status, category and keyword', () => {
    assert.deepEqual(
      filterSellerProducts({ products, search: 'gom', status: 'all', category: 'all' }).map((item) => item.id),
      ['1', '4'],
    );

    assert.deepEqual(
      filterSellerProducts({ products, search: '', status: 'hidden', category: 'Gốm' }).map((item) => item.id),
      ['4'],
    );

    assert.deepEqual(
      filterSellerProducts({ products, search: 'tranh', status: 'active', category: 'all' }).map((item) => item.id),
      ['3'],
    );
  });
});

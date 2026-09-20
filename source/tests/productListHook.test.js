import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyProductParams,
  createProductQueryParams,
  toPositivePage,
} from '../src/hooks/productList.helpers.js';

describe('product list hook helpers', () => {
  it('normalizes page numbers from URL params', () => {
    assert.equal(toPositivePage('3'), 3);
    assert.equal(toPositivePage('0'), 1);
    assert.equal(toPositivePage('bad'), 1);
    assert.equal(toPositivePage(null), 1);
  });

  it('creates API params from selected filters', () => {
    assert.deepEqual(createProductQueryParams({
      selected: 'Tất cả',
      searchFromUrl: '',
      minPrice: '',
      maxPrice: '',
      sort: 'newest',
      page: 1,
      limit: 12,
    }), {
      category: undefined,
      search: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      sort: 'newest',
      page: 1,
      limit: 12,
    });

    assert.deepEqual(createProductQueryParams({
      selected: 'Gốm',
      searchFromUrl: 'ly',
      minPrice: '10000',
      maxPrice: '200000',
      sort: 'price_asc',
      page: 2,
      limit: 12,
    }), {
      category: 'Gốm',
      search: 'ly',
      minPrice: '10000',
      maxPrice: '200000',
      sort: 'price_asc',
      page: 2,
      limit: 12,
    });
  });

  it('updates URL params and resets page when filters change', () => {
    const currentParams = new URLSearchParams('page=4&sort=price_desc');
    const nextParams = applyProductParams({
      currentParams,
      next: { category: 'Gốm', sort: 'newest' },
    });

    assert.equal(nextParams.get('category'), 'Gốm');
    assert.equal(nextParams.has('sort'), false);
    assert.equal(nextParams.has('page'), false);
  });
});

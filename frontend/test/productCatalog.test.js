import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';
import {
  getCategoryAliases,
  getProductImageLabel,
  getProductSourceLabel,
  isKnownCategory,
  normalizeCategory,
  normalizeProduct,
  productCategories,
} from '../../backend/src/shared/productCatalog.mjs';
import { productCategories as filters, createProductQueryParams } from '../src/features/products/hooks/productList.helpers.js';
import { sellerProductCategories } from '../src/features/seller/hooks/sellerProductForm.helpers.js';
import { getPreferredCategories, rememberCategory } from '../src/utils/recommendationPreferences.js';

const require = createRequire(import.meta.url);
const { validateProductInput } = require('../../backend/src/services/productValidation.service.js');
const { parsePreferenceCategories, scoreRecommendation } = require('../../backend/src/services/recommendation.service.js');

describe('shared product catalog', () => {
  it('keeps seller choices and product filters on the same taxonomy', () => {
    assert.deepEqual(filters.slice(1), productCategories);
    assert.deepEqual(sellerProductCategories, productCategories);
    for (const category of productCategories) {
      assert.equal(validateProductInput({ name: 'Fixture', price: 1000, stock: 1, category }).valid, true);
    }
  });

  it('normalizes old deep links, casing, whitespace and decomposed Vietnamese', () => {
    for (const category of ['Gốm', ' gỐm SỨ ', 'Gốm sứ'.normalize('NFD')]) {
      assert.equal(normalizeCategory(category), 'Gốm sứ');
      assert.deepEqual(getCategoryAliases(category), ['gốm sứ', 'gốm']);
      assert.equal(createProductQueryParams({ selected: category }).category, 'Gốm sứ');
    }
    assert.equal(normalizeCategory('Nón'), 'Nón lá');
    assert.equal(normalizeCategory('Tranh thêu'), 'Tranh');
    assert.equal(normalizeCategory('Tranh dân gian'), 'Tranh');
  });

  it('rejects new unknown categories but lets sellers retain an existing legacy value', () => {
    const input = { name: 'Fixture', price: 1000, stock: 1, category: 'Danh mục riêng' };
    assert.equal(isKnownCategory(input.category), false);
    assert.equal(validateProductInput(input).valid, false);
    assert.equal(validateProductInput({ name: 'Fixture', price: 1000, stock: 1 }).valid, false);
    assert.equal(validateProductInput({ category: input.category }, {
      current: input, partial: true,
    }).valid, true);
    assert.equal(validateProductInput({ category: 'Giá trị khác' }, {
      current: input, partial: true,
    }).valid, false);
    assert.equal(normalizeProduct(input).category, input.category);
  });

  it('uses explicit provenance independently of placeholder images', () => {
    const seller = normalizeProduct({ category: 'Gốm', dataSource: 'seller', images: ['https://placehold.co/600x600'] });
    assert.equal(seller.category, 'Gốm sứ');
    assert.equal(getProductSourceLabel(seller.dataSource), 'Người bán nhập');
    assert.equal(getProductImageLabel(seller.images[0]), 'Ảnh minh họa');
    assert.equal(normalizeProduct({ images: seller.images }).dataSource, 'legacy');
    assert.equal(getProductSourceLabel('demo'), 'Dữ liệu mẫu');
    assert.equal(getProductImageLabel('/uploads/photo.jpg'), '');
    assert.equal(getProductImageLabel('https://example.com/placehold.co.jpg'), '');
    assert.equal(getProductImageLabel('https://placehold.co.example.com/image'), '');
    assert.equal(getProductImageLabel(null), 'Chưa có ảnh');
  });

  it('normalizes mixed legacy categories in recommendation scoring and stored interests', () => {
    assert.deepEqual(parsePreferenceCategories({ categories: 'Gốm,Gốm sứ,Nón' }), ['Gốm sứ', 'Nón lá']);
    const product = { category: 'Gốm', price: 1000, createdAt: new Date().toISOString() };
    const preferred = scoreRecommendation({ product, preferredCategories: ['Gốm sứ'] });
    assert.equal(preferred.reason, 'Hợp sở thích Gốm sứ');
    assert.equal(scoreRecommendation({ product, reference: { category: 'Gốm sứ' } }).reason, 'Cùng dòng Gốm sứ');
    let value = JSON.stringify([{ category: 'Gốm', count: 2 }, { category: 'Gốm sứ', count: 3 }]);
    const storage = { getItem: () => value, setItem: (_key, next) => { value = next; } };
    assert.deepEqual(getPreferredCategories(4, storage), ['Gốm sứ']);
    rememberCategory('Gốm', storage);
    assert.equal(JSON.parse(value)[0].count, 6);
    assert.equal(JSON.parse(value).length, 1);
  });
});

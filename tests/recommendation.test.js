import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';

const require = createRequire(import.meta.url);
const {
  parsePreferenceCategories,
  scoreRecommendation,
} = require('../backend/src/services/recommendation.service.js');

describe('recommendation scoring', () => {
  const now = new Date('2026-07-25T00:00:00.000Z').getTime();

  it('deduplicates explicit category preferences', () => {
    assert.deepEqual(
      parsePreferenceCategories({ categories: 'Gốm sứ, Tranh, Gốm sứ' }),
      ['Gốm sứ', 'Tranh']
    );
  });

  it('prioritizes same-category products near the reference price', () => {
    const reference = {
      category: 'Gốm sứ',
      shopId: 'shop-a',
      price: 300000,
    };
    const closeMatch = scoreRecommendation({
      product: {
        category: 'Gốm sứ',
        shopId: 'shop-a',
        price: 320000,
        sold: 10,
        createdAt: '2026-07-10T00:00:00.000Z',
        shop: { rating: 4.8 },
      },
      reference,
      preferredCategories: [],
      now,
    });
    const unrelated = scoreRecommendation({
      product: {
        category: 'Móc khóa',
        shopId: 'shop-b',
        price: 50000,
        sold: 10,
        createdAt: '2026-07-10T00:00:00.000Z',
        shop: { rating: 4.8 },
      },
      reference,
      preferredCategories: [],
      now,
    });

    assert.ok(closeMatch.score > unrelated.score);
    assert.match(closeMatch.reason, /Gốm sứ/);
  });

  it('uses declared interests when there is no reference product', () => {
    const preferred = scoreRecommendation({
      product: {
        category: 'Tranh',
        price: 200000,
        sold: 0,
        createdAt: '2026-01-01T00:00:00.000Z',
        shop: { rating: 0 },
      },
      preferredCategories: ['Tranh'],
      now,
    });

    assert.equal(preferred.reason, 'Hợp sở thích Tranh');
    assert.ok(preferred.score >= 60);
  });
});

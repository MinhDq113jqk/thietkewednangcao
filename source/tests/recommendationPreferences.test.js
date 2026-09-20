import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getPreferredCategories,
  rememberCategory,
} from '../src/utils/recommendationPreferences.js';

const createStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
  };
};

describe('recommendation preferences', () => {
  it('stores only anonymous category interest counts', () => {
    const storage = createStorage();
    rememberCategory('Tranh', storage);
    rememberCategory('Gốm sứ', storage);
    rememberCategory('Tranh', storage);

    assert.deepEqual(getPreferredCategories(2, storage), ['Tranh', 'Gốm sứ']);
  });

  it('ignores empty categories and malformed storage', () => {
    const storage = createStorage();
    storage.setItem('souvenir-category-preferences', '{bad json');
    rememberCategory('', storage);

    assert.deepEqual(getPreferredCategories(4, storage), []);
  });
});

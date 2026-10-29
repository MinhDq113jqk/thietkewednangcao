import { normalizeCategory } from '../../../backend/src/shared/productCatalog.mjs';

const PREFERENCE_KEY = 'souvenir-category-preferences';
const MAX_CATEGORIES = 8;

const readPreferences = (storage = globalThis.localStorage) => {
  try {
    const parsed = JSON.parse(storage?.getItem?.(PREFERENCE_KEY) || '[]');
    return Array.isArray(parsed)
      ? parsed.filter((item) => item && typeof item.category === 'string')
          .map((item) => ({ ...item, category: normalizeCategory(item.category) }))
      : [];
  } catch {
    return [];
  }
};

export const rememberCategory = (category, storage = globalThis.localStorage) => {
  const normalized = normalizeCategory(category);
  if (!normalized) return;

  const current = readPreferences(storage);
  const count = current.filter((item) => item.category === normalized)
    .reduce((sum, item) => sum + Number(item.count || 0), 0);
  const next = [
    {
      category: normalized,
      count: count + 1,
      viewedAt: Date.now(),
    },
    ...current.filter((item) => item.category !== normalized),
  ]
    .sort((left, right) => right.count - left.count || right.viewedAt - left.viewedAt)
    .slice(0, MAX_CATEGORIES);

  storage?.setItem?.(PREFERENCE_KEY, JSON.stringify(next));
};

export const getPreferredCategories = (
  limit = 4,
  storage = globalThis.localStorage
) => [...new Set(readPreferences(storage).map((item) => item.category))].slice(0, limit);

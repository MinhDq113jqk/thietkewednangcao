const PREFERENCE_KEY = 'souvenir-category-preferences';
const MAX_CATEGORIES = 8;

const readPreferences = (storage = globalThis.localStorage) => {
  try {
    const parsed = JSON.parse(storage?.getItem?.(PREFERENCE_KEY) || '[]');
    return Array.isArray(parsed)
      ? parsed.filter((item) => item && typeof item.category === 'string')
      : [];
  } catch {
    return [];
  }
};

export const rememberCategory = (category, storage = globalThis.localStorage) => {
  const normalized = String(category || '').trim();
  if (!normalized) return;

  const current = readPreferences(storage);
  const existing = current.find((item) => item.category === normalized);
  const next = [
    {
      category: normalized,
      count: Number(existing?.count || 0) + 1,
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
) => readPreferences(storage).slice(0, limit).map((item) => item.category);

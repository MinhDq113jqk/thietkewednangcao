import { normalizeCategory, productCategories as catalogCategories } from '../../../../../backend/src/shared/productCatalog.mjs';

export const productCategories = ['Tất cả', ...catalogCategories];

export const productSortOptions = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'sold_desc', label: 'Bán chạy' },
  { value: 'price_asc', label: 'Giá thấp đến cao' },
  { value: 'price_desc', label: 'Giá cao đến thấp' },
];

export const toPositivePage = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

export const createProductQueryParams = ({ selected, searchFromUrl, minPrice, maxPrice, sort, page, limit }) => ({
  category: selected === 'Tất cả' ? undefined : normalizeCategory(selected),
  search: searchFromUrl || undefined,
  minPrice: minPrice || undefined,
  maxPrice: maxPrice || undefined,
  sort,
  page,
  limit,
});

export const applyProductParams = ({ currentParams, next }) => {
  const params = new URLSearchParams(currentParams);

  Object.entries(next).forEach(([key, value]) => {
    if (!value || value === 'Tất cả' || value === 'newest') params.delete(key);
    else params.set(key, key === 'category' ? normalizeCategory(value) : String(value));
  });

  const changesPageFilter = Object.keys(next).some((key) => key !== 'page');
  if (changesPageFilter) params.delete('page');

  return params;
};

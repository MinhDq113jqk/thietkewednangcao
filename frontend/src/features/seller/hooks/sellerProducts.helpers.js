import { normalizeCategory } from '../../../../../backend/src/shared/productCatalog.mjs';

export const getSellerProductCategories = (products) => {
  const names = products
    .map((product) => normalizeCategory(product.category))
    .filter(Boolean)
    .map((name) => String(name).trim())
    .filter(Boolean);

  return [...new Set(names)].sort((a, b) => a.localeCompare(b, 'vi'));
};

export const filterSellerProducts = ({ products, search, status, category }) => {
  const keyword = search.trim().toLowerCase();

  return products.filter((product) => {
    const matchesSearch = !keyword
      || product.name?.toLowerCase().includes(keyword)
      || product.description?.toLowerCase().includes(keyword)
      || normalizeCategory(product.category).toLowerCase().includes(keyword);
    const matchesStatus = status === 'all'
      || (status === 'active' && product.isActive)
      || (status === 'hidden' && !product.isActive);
    const matchesCategory = category === 'all' || normalizeCategory(product.category) === normalizeCategory(category);

    return matchesSearch && matchesStatus && matchesCategory;
  });
};

// Browser and API share this catalog. Node.js 24 can require this module from CommonJS.
const catalog = [
  { name: 'Móc khóa', aliases: [] },
  { name: 'Nón lá', aliases: ['Nón'] },
  { name: 'Tranh', aliases: ['Tranh dân gian', 'Tranh thêu'] },
  { name: 'Gốm sứ', aliases: ['Gốm'] },
  { name: 'Vòng tay', aliases: [] },
  { name: 'Mây tre', aliases: [] },
  { name: 'Lụa thêu', aliases: [] },
  { name: 'Đồ gỗ', aliases: [] },
  { name: 'Đồ đồng', aliases: [] },
];

const categoryKey = (value) => String(value || '').trim().normalize('NFC').toLocaleLowerCase('vi');
const categoryByKey = new Map(catalog.flatMap((entry) =>
  [entry.name, ...entry.aliases].map((name) => [categoryKey(name), entry])
));

export const productCategories = catalog.map((entry) => entry.name);
export const getEffectivePrice = (product) => Number(product?.salePrice ?? product?.price ?? 0);
// Aliases come from query code, never from request parameters.
export const effectivePriceSql = (alias) => `COALESCE("${alias}"."salePrice", "${alias}"."price")`;
export const isKnownCategory = (value) => categoryByKey.has(categoryKey(value));
export const normalizeCategory = (value) =>
  categoryByKey.get(categoryKey(value))?.name || String(value || '').trim();

// Match legacy rows without rewriting their category or other business data.
export const getCategoryAliases = (value) => {
  const entry = categoryByKey.get(categoryKey(value));
  return entry
    ? [...new Set([entry.name, ...entry.aliases].map(categoryKey))]
    : [categoryKey(value)];
};

export const productDataSources = ['demo', 'seller', 'legacy'];
export const normalizeProduct = (product) => {
  const value = product.toJSON ? product.toJSON() : product;
  return {
    ...value,
    category: normalizeCategory(value.category) || null,
    dataSource: productDataSources.includes(value.dataSource) ? value.dataSource : 'legacy',
  };
};

export const getProductSourceLabel = (source) => ({
  demo: 'Dữ liệu mẫu',
  seller: 'Người bán nhập',
  legacy: 'Chưa xác định nguồn',
}[source] || 'Chưa xác định nguồn');

export const getProductSourceNotice = (source) => ({
  demo: 'Sản phẩm mẫu để trải nghiệm tính năng. Giá, tồn kho và số bán có thể là số liệu mô phỏng.',
  seller: 'Thông tin sản phẩm do người bán cung cấp.',
  legacy: 'Dữ liệu đã có từ trước; nguồn nhập chưa được xác định.',
}[source] || 'Nguồn nhập của dữ liệu này chưa được xác định.');

export const getProductImages = (product) => {
  if (Array.isArray(product.images) && product.images.some(Boolean)) return product.images.filter(Boolean);
  return product.image ? [product.image] : [];
};

export const getProductImageLabel = (image) => {
  if (!image) return 'Chưa có ảnh';
  try {
    const host = new URL(image).hostname.toLowerCase();
    if (['placehold.co', 'placehold.it', 'via.placeholder.com', 'placeholder.com'].includes(host)) {
      return 'Ảnh minh họa';
    }
  } catch {
    // Uploaded images use relative URLs such as /uploads/product.jpg.
  }
  return '';
};

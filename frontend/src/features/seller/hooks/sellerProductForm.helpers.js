import { normalizeCategory } from '../../../../../backend/src/shared/productCatalog.mjs';
export { productCategories as sellerProductCategories } from '../../../../../backend/src/shared/productCatalog.mjs';

export const findSellerProductById = (products, id) =>
  products.find((item) => item.id === id);

export const createSellerProductPayload = (formData, { images } = {}) => {
  const image = String(formData.get('image') || '');
  const salePrice = String(formData.get('salePrice') ?? '').trim();

  return {
    category: normalizeCategory(formData.get('category')),
    description: String(formData.get('description') || ''),
    images: images ?? (image ? [image] : []),
    name: String(formData.get('name') || ''),
    price: Number(formData.get('price')),
    salePrice: salePrice ? Number(salePrice) : null,
    ...(formData.has('stock') ? { stock: Number(formData.get('stock')) } : {}),
  };
};

export const validateSellerProductForm = (formData) => {
  const errors = {};
  const price = String(formData.get('price') ?? '').trim();
  const stock = String(formData.get('stock') ?? '').trim();
  const salePrice = String(formData.get('salePrice') ?? '').trim();
  const integer = (value) => /^\d+$/.test(value) && Number.isSafeInteger(Number(value));
  const name = String(formData.get('name') || '').trim();
  if (!name || name.length > 200) errors.name = 'Tên sản phẩm cần từ 1 đến 200 ký tự';
  if (!integer(price) || Number(price) <= 0 || Number(price) > 999_999_999_999_999) errors.price = 'Giá phải là số nguyên dương hợp lệ';
  if (formData.has('stock') && (!integer(stock) || Number(stock) > 1_000_000_000)) errors.stock = 'Tồn kho phải là số nguyên không âm hợp lệ';
  if (salePrice && (!integer(salePrice) || Number(salePrice) <= 0 || Number(salePrice) > Number(price))) errors.salePrice = 'Giá khuyến mãi phải lớn hơn 0 và không vượt giá gốc';
  if (!formData.get('category')) errors.category = 'Chọn danh mục sản phẩm';
  if (String(formData.get('description') || '').length > 5000) errors.description = 'Mô tả tối đa 5000 ký tự';
  return errors;
};

export const setUploadedImageUrl = ({ form, fieldName = 'image', url }) => {
  if (form?.elements?.[fieldName]) {
    form.elements[fieldName].value = url;
  }
};

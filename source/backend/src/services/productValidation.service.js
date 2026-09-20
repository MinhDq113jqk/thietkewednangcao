const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

const MAX_PRICE = 999_999_999_999_999;
const MAX_STOCK = 1_000_000_000;

const parseInteger = (value) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
};

const validateProductInput = (input = {}, { current = {}, partial = false } = {}) => {
  const value = {};
  const errors = {};

  if (!partial || hasOwn(input, 'name')) {
    const name = String(input.name ?? current.name ?? '').trim();
    if (!name) errors.name = 'Tên sản phẩm là bắt buộc';
    else if (name.length > 200) errors.name = 'Tên sản phẩm tối đa 200 ký tự';
    else value.name = name;
  }

  const effectivePrice = hasOwn(input, 'price') ? input.price : current.price;
  const parsedPrice = parseInteger(effectivePrice);
  if (!partial || hasOwn(input, 'price')) {
    if (parsedPrice === null || parsedPrice <= 0 || parsedPrice > MAX_PRICE) {
      errors.price = 'Giá sản phẩm phải là số nguyên dương hợp lệ';
    } else {
      value.price = parsedPrice;
    }
  }

  const effectiveSalePrice = hasOwn(input, 'salePrice') ? input.salePrice : current.salePrice;
  const normalizedSalePrice = effectiveSalePrice === '' || effectiveSalePrice === null
    || effectiveSalePrice === undefined
    ? null
    : parseInteger(effectiveSalePrice);
  if (!partial || hasOwn(input, 'salePrice') || hasOwn(input, 'price')) {
    if (normalizedSalePrice !== null && (
      normalizedSalePrice <= 0
      || normalizedSalePrice > MAX_PRICE
      || parsedPrice === null
      || normalizedSalePrice > parsedPrice
    )) {
      errors.salePrice = 'Giá khuyến mãi phải lớn hơn 0 và không vượt quá giá gốc';
    } else if (hasOwn(input, 'salePrice')) {
      value.salePrice = normalizedSalePrice;
    }
  }

  if (!partial || hasOwn(input, 'stock')) {
    const stock = parseInteger(input.stock ?? current.stock ?? 0);
    if (stock === null || stock < 0 || stock > MAX_STOCK) {
      errors.stock = 'Tồn kho phải là số nguyên không âm hợp lệ';
    } else {
      value.stock = stock;
    }
  }

  if (hasOwn(input, 'description')) {
    const description = String(input.description || '').trim();
    if (description.length > 5000) errors.description = 'Mô tả tối đa 5000 ký tự';
    else value.description = description || null;
  }

  if (hasOwn(input, 'category')) {
    const category = String(input.category || '').trim();
    if (category.length > 100) errors.category = 'Danh mục tối đa 100 ký tự';
    else value.category = category || null;
  }

  if (hasOwn(input, 'images')) {
    if (!Array.isArray(input.images) || input.images.length > 8
      || input.images.some((image) => typeof image !== 'string' || image.length > 2000)) {
      errors.images = 'Sản phẩm được dùng tối đa 8 URL ảnh hợp lệ';
    } else {
      value.images = input.images.map((image) => image.trim()).filter(Boolean);
    }
  }

  ['isActive', 'isFlashSale'].forEach((key) => {
    if (!hasOwn(input, key)) return;
    if (typeof input[key] !== 'boolean') errors[key] = `${key} phải là giá trị boolean`;
    else value[key] = input[key];
  });

  return { errors, value, valid: Object.keys(errors).length === 0 };
};

module.exports = {
  MAX_PRICE,
  MAX_STOCK,
  validateProductInput,
};

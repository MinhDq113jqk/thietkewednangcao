import { getEffectivePrice } from '../../../backend/src/shared/productCatalog.mjs';

export const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const formatVnd = (value) => `${Math.round(toNumber(value)).toLocaleString('vi-VN')}₫`;

export const getProductPrice = (product) => toNumber(getEffectivePrice(product));

export const calculateLineTotal = (item) => getProductPrice(item) * toNumber(item?.quantity);

export const calculateOrderTotal = (order) => {
  const explicitTotal = Number(order?.total);
  const shippingFee = toNumber(order?.shippingFee);
  if (Number.isFinite(explicitTotal) && explicitTotal > 0) return explicitTotal + shippingFee;

  const subtotal = Array.isArray(order?.items)
    ? order.items.reduce((sum, item) => sum + calculateLineTotal(item), 0)
    : 0;
  return subtotal + shippingFee;
};

export const formatStatusLabel = (status, labels, fallback = 'Không rõ') => {
  if (!status) return fallback;
  return labels?.[status] || status;
};

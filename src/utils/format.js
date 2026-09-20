export const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const formatVnd = (value) => `${Math.round(toNumber(value)).toLocaleString('vi-VN')}₫`;

export const getProductPrice = (product) => toNumber(product?.salePrice ?? product?.price);

export const calculateLineTotal = (item) => getProductPrice(item) * toNumber(item?.quantity);

export const calculateOrderTotal = (order) => {
  const explicitTotal = Number(order?.total);
  if (Number.isFinite(explicitTotal) && explicitTotal > 0) return explicitTotal;

  return Array.isArray(order?.items)
    ? order.items.reduce((sum, item) => sum + calculateLineTotal(item), 0)
    : 0;
};

export const formatStatusLabel = (status, labels, fallback = 'Không rõ') => {
  if (!status) return fallback;
  return labels?.[status] || status;
};

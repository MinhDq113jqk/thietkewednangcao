const crypto = require('crypto');

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9:_-]{16,128}$/;

const getIdempotencyKey = (req) =>
  String(req.get('Idempotency-Key') || '').trim();

const isValidIdempotencyKey = (key) =>
  IDEMPOTENCY_KEY_PATTERN.test(String(key || ''));

const normalizeShippingAddress = (address = {}) => ({
  name: String(address.name || '').trim(),
  phone: String(address.phone || '').replace(/\s+/g, ''),
  address: String(address.address || '').trim(),
  district: String(address.district || '').trim(),
  city: String(address.city || '').trim(),
});

const normalizeCartItems = (items = []) => {
  const quantities = new Map();

  items.forEach((item) => {
    const productId = String(item.productId || item.id || '').trim();
    const quantity = Number.parseInt(item.quantity, 10);
    if (!productId || !Number.isFinite(quantity) || quantity < 1) return;
    quantities.set(productId, (quantities.get(productId) || 0) + quantity);
  });

  return [...quantities.entries()]
    .map(([productId, quantity]) => ({ productId, quantity }))
    .sort((left, right) => left.productId.localeCompare(right.productId));
};

const createCheckoutRequestHash = ({
  items,
  shippingAddress,
  paymentMethod,
  note,
}) => {
  const canonicalPayload = {
    items: normalizeCartItems(items),
    shippingAddress: normalizeShippingAddress(shippingAddress),
    paymentMethod: String(paymentMethod || 'cod'),
    note: String(note || '').trim(),
  };

  return crypto
    .createHash('sha256')
    .update(JSON.stringify(canonicalPayload))
    .digest('hex');
};

module.exports = {
  createCheckoutRequestHash,
  getIdempotencyKey,
  isValidIdempotencyKey,
  normalizeCartItems,
  normalizeShippingAddress,
};

const crypto = require('crypto');
const { validateShippingAddress } = require('../shared/addressValidation.mjs');

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9:_-]{16,128}$/;

const getIdempotencyKey = (req) =>
  String(req.get('Idempotency-Key') || '').trim();

const isValidIdempotencyKey = (key) =>
  IDEMPOTENCY_KEY_PATTERN.test(String(key || ''));

const normalizeShippingAddress = (address) => validateShippingAddress(address).value;

const normalizeCartItems = (items = []) => {
  const invalidCart = () => Object.assign(new Error('Giỏ hàng hoặc số lượng sản phẩm không hợp lệ'), {
    status: 400, code: 'CART_INVALID',
  });
  if (!Array.isArray(items)) throw invalidCart();
  const quantities = new Map();

  items.forEach((item) => {
    const productId = String(item?.productId || item?.id || '').trim();
    const variantId = item?.variantId ? String(item.variantId).trim().toLowerCase() : '';
    if (variantId && !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(variantId)) throw invalidCart();
    const identity = variantId && variantId !== productId ? `${productId}:${variantId}` : productId;
    const quantity = Number(item?.quantity);
    const combinedQuantity = (quantities.get(identity) || 0) + quantity;
    if (!productId || !Number.isSafeInteger(quantity) || quantity < 1
      || !Number.isSafeInteger(combinedQuantity) || combinedQuantity > 2147483647) throw invalidCart();
    quantities.set(identity, combinedQuantity);
  });

  return [...quantities.entries()]
    .map(([identity, quantity]) => { const [productId, variantId] = identity.split(':'); return { productId, ...(variantId ? { variantId } : {}), quantity }; })
    .sort((left, right) => left.productId.localeCompare(right.productId) || String(left.variantId || '').localeCompare(String(right.variantId || '')));
};

const createCheckoutRequestHash = ({
  items,
  shippingAddress,
  paymentMethod,
  note,
  quoteFingerprint,
}, { legacyPhoneFormatting = false } = {}) => {
  const canonicalPayload = {
    items: normalizeCartItems(items),
    shippingAddress: normalizeShippingAddress(shippingAddress),
    paymentMethod: String(paymentMethod || 'cod'),
    note: String(note || '').trim(),
    ...(quoteFingerprint ? { quoteFingerprint: String(quoteFingerprint) } : {}),
  };
  // Existing attempts used whitespace-only phone normalization before address validation was shared.
  if (legacyPhoneFormatting && typeof shippingAddress?.phone === 'string') {
    canonicalPayload.shippingAddress.phone = shippingAddress.phone.replace(/\s+/g, '');
  }

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

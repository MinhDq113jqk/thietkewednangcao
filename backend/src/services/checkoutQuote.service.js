const crypto = require('node:crypto');
const { estimateShippingFee } = require('./shipping.service');
const { normalizeCartItems } = require('./checkoutIdempotency.service');
const { getEffectivePrice } = require('../shared/productCatalog.mjs');

const checkoutError = (message, code, status = 409) =>
  Object.assign(new Error(message), { status, code });

// Both the public quote and the locked checkout use this calculation.
const calculateCheckoutQuote = ({ cartItems, products, shops, variants = products, city }) => {
  const productMap = new Map(products.map((product) => [product.id, product]));
  const shopMap = new Map(shops.map((shop) => [shop.id, shop]));
  const groupedByShop = new Map();
  for (const item of cartItems) {
    const product = productMap.get(item.productId);
    if (!product || !product.isActive || product.moderationHidden) {
      throw checkoutError('Một số sản phẩm không còn được bán', 'PRODUCT_UNAVAILABLE');
    }
    const shop = shopMap.get(product.shopId);
    if (!shop || shop.status !== 'active') {
      throw checkoutError('Một số gian hàng đang tạm ngừng hoặc chưa được duyệt', 'SHOP_NOT_ACTIVE');
    }
    const variant = variants.find(v => v.id === (item.variantId || product.id) && (v.productId || v.id) === product.id);
    if (!variant || variant.isActive === false) throw checkoutError('Biến thể không còn được bán', 'VARIANT_UNAVAILABLE');
    if (Number(variant.stock) < item.quantity) {
      throw checkoutError(`Sản phẩm "${product.name}" không đủ tồn kho`, 'INSUFFICIENT_STOCK');
    }
    const price = getEffectivePrice(variant);
    if (!Number.isSafeInteger(price) || price < 0 || !Number.isSafeInteger(price * item.quantity)) {
      throw checkoutError('Giá sản phẩm chưa hợp lệ, vui lòng liên hệ gian hàng', 'PRODUCT_PRICE_INVALID');
    }
    const group = groupedByShop.get(product.shopId) || [];
    group.push({ product, variant, quantity: item.quantity, price });
    groupedByShop.set(product.shopId, group);
  }

  const shopQuotes = [...groupedByShop.keys()].sort().map((shopId) => {
    const items = groupedByShop.get(shopId).map(({ product, variant, quantity, price }) => ({
      productId: product.id, variantId: variant.id, sku: variant.sku, variantName: variant.name, name: product.name, quantity, price, lineTotal: price * quantity,
    }));
    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const shipping = estimateShippingFee({ city, subtotal });
    return { shopId, shopName: shopMap.get(shopId).name, subtotal, ...shipping, items };
  });
  const subtotal = shopQuotes.reduce((sum, shop) => sum + shop.subtotal, 0);
  const fee = shopQuotes.reduce((sum, shop) => sum + shop.fee, 0);
  const total = subtotal + fee;
  if (!Number.isSafeInteger(total)) throw checkoutError('Tổng đơn hàng vượt giới hạn', 'CART_INVALID', 400);
  const fingerprint = crypto.createHash('sha256').update(JSON.stringify({
    city: String(city).trim(),
    shops: shopQuotes.map(({ shopId, subtotal, fee, items }) => ({
      shopId, subtotal, fee, items: items.map(({ productId, variantId, quantity, price }) => ({ productId, variantId, quantity, price })),
    })),
  })).digest('hex');

  return {
    groupedByShop,
    quote: {
      provider: 'internal-estimator', subtotal, fee, total, fingerprint, shops: shopQuotes,
      note: 'Miễn phí vận chuyển cho từng shop có tiền hàng từ 500.000đ.',
    },
  };
};

const loadCheckoutQuote = async ({ items, city, transaction }) => {
  const cartItems = normalizeCartItems(items);
  if (!cartItems.length || cartItems.some(({ productId }) =>
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId))) {
    throw checkoutError('Giỏ hàng không hợp lệ', 'CART_INVALID', 400);
  }
  if (!String(city || '').trim()) throw checkoutError('Vui lòng nhập tỉnh / thành phố', 'CITY_REQUIRED', 400);
  const { Op } = require('sequelize');
  const { Product, Shop, ProductVariant } = require('../models');
  const lockOptions = transaction ? { transaction, lock: transaction.LOCK.UPDATE } : {};
  const products = await Product.findAll({
    where: { id: { [Op.in]: cartItems.map((item) => item.productId) }, isActive: true, moderationHidden: false },
    order: [['id', 'ASC']], ...lockOptions,
  });
  const shopIds = [...new Set(products.map((product) => product.shopId))].sort();
  const shops = await Shop.findAll({
    where: { id: { [Op.in]: shopIds } },
    attributes: ['id', 'name', 'status'], order: [['id', 'ASC']], ...lockOptions,
  });
  const variants = await ProductVariant.findAll({ where: { productId: { [Op.in]: products.map(p => p.id) } }, order: [['id','ASC']], ...lockOptions });
  return calculateCheckoutQuote({ cartItems, products, shops, variants, city });
};

module.exports = { calculateCheckoutQuote, loadCheckoutQuote };

const { sequelize } = require('../database/connection');
const { Product, Shop, ProductStockUpdate, AuditEvent, ProductVariant } = require('../models');
const { fail, text } = require('./commerceValidation');
const { MAX_STOCK } = require('./productValidation.service');
const { normalizeProduct } = require('../shared/productCatalog.mjs');
const { deleteByPattern } = require('../config/redis');

const updateStock = async (userId, productId, body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail('Nội dung điều chỉnh tồn kho không hợp lệ');
  const { stock, expectedVersion, requestKey } = body;
  if (!Number.isInteger(stock) || stock < 0 || stock > MAX_STOCK) fail('Tồn kho phải là số nguyên từ 0 đến 1.000.000.000');
  if (!Number.isInteger(expectedVersion) || expectedVersion < 0 || expectedVersion > 2147483647) fail('Thiếu phiên bản tồn kho hợp lệ. Vui lòng tải lại.');
  if (typeof requestKey !== 'string' || !/^[a-z0-9._:-]{8,120}$/i.test(requestKey)) fail('Khóa điều chỉnh tồn kho không hợp lệ');
  const reason = text(body.reason, 'Lý do điều chỉnh', 5, 1000);
  const shop = await Shop.findOne({ where: { ownerId: userId } });
  if (!shop) fail('Bạn chưa có gian hàng', 404);
  const result = await sequelize.transaction(async (transaction) => {
    const product = await Product.findOne({ where: { id: productId, shopId: shop.id }, transaction, lock: transaction.LOCK.UPDATE });
    if (!product) fail('Không tìm thấy sản phẩm', 404);
    const previous = await ProductStockUpdate.findOne({ where: { productId, requestKey }, transaction });
    if (previous) {
      if (previous.recordedBy !== userId || previous.stockAfter !== stock || previous.fromVersion !== expectedVersion || previous.reason !== reason) {
        fail('Khóa điều chỉnh đã dùng cho nội dung khác', 409, 'STOCK_REQUEST_REUSED');
      }
      return { product: normalizeProduct(product), change: previous, idempotentReplay: true };
    }
    if (product.stockVersion !== expectedVersion) {
      fail('Tồn kho đã thay đổi. Tải lại tồn kho rồi kiểm tra số lượng trước khi lưu.', 409, 'STOCK_VERSION_CONFLICT');
    }
    const stockBefore = Number(product.stock);
    const variants = await ProductVariant.findAll({ where: { productId }, transaction });
    if (variants.length !== 1 || variants[0].id !== productId) fail('Sản phẩm có nhiều SKU. Điều chỉnh từng SKU trong sổ kho.', 409, 'USE_VARIANT_STOCK');
    await require('./inventory.service').change({ variantId: variants[0].id, availableDelta: stock - stockBefore,
      kind: 'adjustment', sourceKey: `legacy:${requestKey}`, actorId: userId, reason }, transaction);
    await product.reload({ transaction });
    const change = await ProductStockUpdate.create({ productId, recordedBy: userId, requestKey,
      fromVersion: expectedVersion, toVersion: product.stockVersion, stockBefore, stockAfter: stock, reason }, { transaction });
    await AuditEvent.create({ actorId: userId, action: 'product.stock', resourceType: 'products', resourceId: productId,
      details: { stockBefore, stockAfter: stock, reason, changeId: change.id } }, { transaction });
    return { product: normalizeProduct(product), change, idempotentReplay: false };
  });
  await deleteByPattern('products:*');
  return result;
};

module.exports = { updateStock };

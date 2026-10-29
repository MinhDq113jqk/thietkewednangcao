const crypto = require('node:crypto');
const { Op, QueryTypes } = require('sequelize');
const { sequelize } = require('../database/connection');
const { Product, ProductVariant, InventoryMovement, OrderItem, Shop } = require('../models');
const { fail, uuid, text, money, paging, recheck } = require('./commerceValidation');
const { deleteByPattern } = require('../config/redis');
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const requestKey = value => {
  if (typeof value !== 'string' || !/^[a-z0-9._:-]{8,120}$/i.test(value)) fail('Khóa yêu cầu không hợp lệ');
  return value;
};
const integer = (value, name) => {
  if (!Number.isInteger(value) || value < 0 || value > 1000000000) fail(`${name} phải là số nguyên từ 0 đến 1.000.000.000`);
  return value;
};
const ownProduct = async (userId, id, transaction) => {
  const shop = await Shop.findOne({ where: { ownerId: userId }, transaction });
  const product = shop && await Product.findOne({ where: { id: uuid(id), shopId: shop.id }, transaction, lock: transaction.LOCK.UPDATE });
  if (!product) fail('Không tìm thấy sản phẩm', 404);
  return product;
};
const invalidate = transaction => transaction.afterCommit(() => deleteByPattern('products:*').catch(() => {}));

// Caller holds product locks in stable order before touching variants. This keeps
// checkout, cancellation, returns, stock editors and trigger rollups serialized.
const change = async ({ variantId, availableDelta = 0, heldDelta = 0, kind, sourceKey, actorId = null,
  orderId = null, reason, requestHash = null }, transaction) => {
  const variant = await ProductVariant.findByPk(variantId, { transaction, lock: transaction.LOCK.UPDATE });
  if (!variant) fail('Không tìm thấy SKU', 409);
  const old = await InventoryMovement.findOne({ where: { variantId, sourceKey }, transaction });
  if (old) {
    if (old.kind !== kind || old.availableDelta !== availableDelta || old.heldDelta !== heldDelta
      || old.actorId !== actorId || old.orderId !== orderId || old.requestHash !== requestHash || old.reason !== reason) fail('Nguồn kho đã dùng cho nội dung khác', 409, 'INVENTORY_SOURCE_REUSED');
    return { variant, movement: old, idempotentReplay: true };
  }
  const stock = Number(variant.stock) + availableDelta, held = Number(variant.held) + heldDelta;
  if (![stock, held].every(value => Number.isInteger(value) && value >= 0 && value <= 1000000000)) fail('Không đủ tồn kho hoặc lượng giữ không hợp lệ', 409, 'INSUFFICIENT_STOCK');
  await variant.update({ stock, held }, { transaction });
  await variant.reload({ transaction });
  const movement = await InventoryMovement.create({ variantId, shopId: variant.shopId, orderId, actorId,
    kind, sourceKey, availableDelta, heldDelta, availableAfter: stock, heldAfter: held, reason, requestHash }, { transaction });
  return { variant, movement, idempotentReplay: false };
};

const variantInput = body => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail('Biến thể không hợp lệ');
  const sku = text(body.sku, 'SKU', 1, 100).toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9._/-]*$/.test(sku)) fail('SKU chỉ dùng chữ Latin, số, dấu chấm, gạch ngang, gạch dưới hoặc /');
  const value = { sku, name: text(body.name, 'Tên biến thể', 1, 200), price: money(body.price),
    salePrice: body.salePrice === '' || body.salePrice == null ? null : money(body.salePrice),
    lowStockThreshold: integer(body.lowStockThreshold ?? 5, 'Ngưỡng tồn thấp') };
  if (value.salePrice !== null && value.salePrice > value.price) fail('Giá giảm không được vượt giá gốc');
  for (const field of ['color', 'size', 'material', 'image']) value[field] = body[field] ? text(body[field], field, 1, field === 'image' ? 2000 : 100) : null;
  if (value.image && !/^(https?:\/\/|\/uploads\/)/i.test(value.image)) fail('Ảnh SKU phải là URL http(s) hoặc ảnh đã tải lên');
  if (typeof body.isActive !== 'boolean') fail('Trạng thái SKU không hợp lệ');
  value.isActive = body.isActive;
  return value;
};
const saveVariant = async (userId, productId, variantId, body) => {
  const input = variantInput(body);
  return sequelize.transaction(async transaction => {
    const product = await ownProduct(userId, productId, transaction);
    let variant;
    if (variantId) {
      if (Object.hasOwn(body, 'stock')) fail('Dùng điều chỉnh kho riêng', 400, 'USE_STOCK_UPDATE');
      variant = await ProductVariant.findOne({ where: { id: uuid(variantId), productId: product.id }, transaction, lock: transaction.LOCK.UPDATE });
      if (!variant) fail('Không tìm thấy SKU', 404);
      await variant.update(input, { transaction });
    } else {
      const sourceKey = `create:${requestKey(body.requestKey)}`;
      const stock = integer(body.stock ?? 0, 'Tồn đầu');
      const requestHash = hash({ productId, input, stock });
      const old = await InventoryMovement.findOne({ where: { shopId: product.shopId, sourceKey }, transaction });
      if (old) {
        if (old.actorId !== userId || old.requestHash !== requestHash) fail('Khóa tạo SKU đã dùng cho nội dung khác', 409);
        return { variant: await ProductVariant.findByPk(old.variantId, { transaction }), idempotentReplay: true };
      }
      variant = await ProductVariant.create({ ...input, productId: product.id, shopId: product.shopId, stock: 0 }, { transaction });
      ({ variant } = await change({ variantId: variant.id, availableDelta: stock, kind: 'receipt', sourceKey,
        actorId: userId, reason: 'Nhập tồn ban đầu khi tạo SKU', requestHash }, transaction));
    }
    invalidate(transaction);
    return { variant, idempotentReplay: false };
  }).catch(recheck);
};
const updateVariantStock = async (userId, productId, variantId, body) => {
  if (!['receipt', 'adjustment'].includes(body?.kind)) fail('Chọn nhập hàng hoặc điều chỉnh');
  const amount = integer(body.quantity, 'Số lượng');
  if (body.kind === 'receipt' && amount === 0) fail('Lượng nhập phải lớn hơn 0');
  const expectedVersion = integer(body.expectedVersion, 'Phiên bản');
  const reason = text(body.reason, 'Lý do', 5, 1000);
  const sourceKey = `manual:${requestKey(body.requestKey)}`;
  const requestHash = hash({ kind: body.kind, amount, expectedVersion, reason, userId });
  return sequelize.transaction(async transaction => {
    const product = await ownProduct(userId, productId, transaction);
    const variant = await ProductVariant.findOne({ where: { id: uuid(variantId), productId: product.id }, transaction, lock: transaction.LOCK.UPDATE });
    if (!variant) fail('Không tìm thấy SKU', 404);
    const old = await InventoryMovement.findOne({ where: { variantId: variant.id, sourceKey }, transaction });
    if (old) {
      if (old.requestHash !== requestHash) fail('Khóa kho đã dùng cho nội dung khác', 409, 'INVENTORY_SOURCE_REUSED');
      return { variant, movement: old, idempotentReplay: true };
    }
    if (variant.stockVersion !== expectedVersion) fail('Tồn SKU đã thay đổi. Tải lại rồi kiểm tra số lượng.', 409, 'STOCK_VERSION_CONFLICT');
    const result = await change({ variantId: variant.id, availableDelta: body.kind === 'receipt' ? amount : amount - Number(variant.stock),
      kind: body.kind, sourceKey, actorId: userId, reason, requestHash }, transaction);
    invalidate(transaction);
    return result;
  }).catch(recheck);
};

const orderMovements = async (order, transaction, kind, actorId = null, reason = '') => {
  const items = await OrderItem.findAll({ where: { orderId: order.id }, order: [['productId', 'ASC'], ['variantId', 'ASC']], transaction });
  const ids = [...new Set(items.map(item => item.productId))].sort();
  const products = await Product.findAll({ where: { id: { [Op.in]: ids } }, order: [['id', 'ASC']], transaction, lock: transaction.LOCK.UPDATE });
  const quantities = new Map();
  for (const item of items) quantities.set(item.variantId, (quantities.get(item.variantId) || 0) + item.quantity);
  for (const [variantId, quantity] of [...quantities].sort(([a], [b]) => a.localeCompare(b))) {
    await change({ variantId, kind, sourceKey: `${kind}:${order.id}`, orderId: order.id, actorId,
      availableDelta: kind === 'release' ? quantity : 0, heldDelta: -quantity, reason }, transaction);
  }
  if (kind === 'release') for (const product of products) {
    const quantity = items.filter(item => item.productId === product.id).reduce((sum, item) => sum + item.quantity, 0);
    await product.update({ sold: Math.max(0, Number(product.sold) - quantity) }, { transaction });
  }
  invalidate(transaction);
};

const readInventory = async (userId, query = {}) => {
  const shop = await Shop.findOne({ where: { ownerId: userId } });
  if (!shop) fail('Không tìm thấy shop', 404);
  const { page, limit, offset } = paging(query);
  const where = { shopId: shop.id };
  if (query.sku) where.sku = { [Op.iLike]: `%${String(query.sku).slice(0, 100)}%` };
  if (query.lowStock === 'true') where[Op.and] = sequelize.where(sequelize.col('ProductVariant.stock'), Op.lte, sequelize.col('ProductVariant.lowStockThreshold'));
  const variants = await ProductVariant.findAndCountAll({ where, include: [{ model: Product, as: 'product', attributes: ['id', 'name'] }], order: [['sku', 'ASC'], ['id', 'ASC']], limit, offset });
  const movementWhere = { shopId: shop.id };
  if (query.variantId) movementWhere.variantId = uuid(query.variantId);
  const date = value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) fail('Ngày không hợp lệ');
    const parsed = new Date(`${value}T00:00:00+07:00`);
    if (!Number.isFinite(parsed.getTime()) || new Date(parsed.getTime() + 7*3600000).toISOString().slice(0,10) !== value) fail('Ngày không hợp lệ');
    return parsed;
  };
  if (query.from || query.to) {
    const from = query.from ? date(query.from) : null, to = query.to ? date(query.to) : null;
    if (from && to && from > to) fail('Ngày bắt đầu vượt ngày kết thúc');
    movementWhere.createdAt = { ...(from ? { [Op.gte]: from } : {}), ...(to ? { [Op.lt]: new Date(to.getTime() + 86400000) } : {}) };
  }
  const mp = paging({ ...query, page: query.movementPage });
  const movements = await InventoryMovement.findAndCountAll({ where: movementWhere,
    include: [{ model: ProductVariant, as: 'variant', attributes: ['id', 'sku', 'name'], ...(query.sku ? { where: { sku: where.sku } } : {}) },
      { model: require('../models').User, as: 'actor', attributes: ['id', 'name'] }],
    order: [['createdAt', 'DESC'], ['id', 'DESC']], limit: mp.limit, offset: mp.offset });
  const [summary] = await sequelize.query(`SELECT count(*)::int "skuCount", coalesce(sum(stock),0) available, coalesce(sum(held),0) held,
    count(*) FILTER (WHERE stock<="lowStockThreshold")::int "lowStock",
    count(*) FILTER (WHERE stock<>coalesce(m.a,0) OR held<>coalesce(m.h,0))::int mismatches
    FROM product_variants v LEFT JOIN (SELECT "variantId",sum("availableDelta") a,sum("heldDelta") h FROM inventory_movements GROUP BY "variantId") m ON m."variantId"=v.id
    WHERE v."shopId"=:shopId`, { replacements: { shopId: shop.id }, type: QueryTypes.SELECT });
  const payload = (result, p) => ({ items: result.rows, total: result.count, page: p, totalPages: Math.max(1, Math.ceil(result.count / limit)) });
  return { summary, variants: payload(variants, page), movements: payload(movements, mp.page) };
};
module.exports = { change, saveVariant, updateVariantStock, orderMovements, readInventory };

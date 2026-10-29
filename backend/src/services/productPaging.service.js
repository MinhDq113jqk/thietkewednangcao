const { Op } = require('sequelize');
const { sequelize } = require('../database/connection');
const { fail } = require('./commerceValidation');
const { normalizeProduct, normalizeCategory } = require('../shared/productCatalog.mjs');

const productPaging = (query = {}, shopId, seller = false) => {
  const integer = (value, fallback, max) => {
    if (value === undefined || value === '') return fallback;
    if (!/^\d+$/.test(String(value)) || Number(value) < 1 || Number(value) > max) fail('Trang hoặc số lượng không hợp lệ');
    return Number(value);
  };
  const page = integer(query.page, 1, 1000000), limit = integer(query.limit, 12, 50);
  const where = { shopId, ...(!seller ? { isActive: true, moderationHidden: false } : {}) };
  if (seller && query.status && query.status !== 'all') {
    if (!['active', 'hidden'].includes(query.status)) fail('Trạng thái không hợp lệ');
    where.isActive = query.status === 'active';
  }
  if (query.search) where.name = { [Op.iLike]: `%${String(query.search).slice(0, 200)}%` };
  if (query.category && query.category !== 'all') where.category = normalizeCategory(query.category);
  return { page, limit, offset: (page - 1) * limit, where, order: [['createdAt', 'DESC'], ['id', 'ASC']] };
};
const pagedProducts = async (Product, options) => {
  const { rows, count } = await Product.findAndCountAll(options);
  return { items: rows.map(normalizeProduct), total: count, page: options.page, limit: options.limit,
    totalPages: Math.max(1, Math.ceil(count / options.limit)) };
};
const productCounts = async (shopId, transaction) => {
  const [rows] = await sequelize.query(`SELECT count(*)::int total,
    count(*) FILTER (WHERE "isActive")::int active, count(*) FILTER (WHERE NOT "isActive")::int hidden,
    count(*) FILTER (WHERE stock<=5)::int "lowStock" FROM products WHERE (:shopId::uuid IS NULL OR "shopId"=:shopId::uuid)`,
  { replacements: { shopId: shopId || null }, transaction });
  return rows[0];
};
module.exports = { productPaging, pagedProducts, productCounts };

const { Op } = require('sequelize');
const { sequelize } = require('../database/connection');
const { Order } = require('../models');
const { fail } = require('./commerceValidation');
const parseOrderQuery = (query) => {
  const integer = (value, fallback, max) => {
    if (value === undefined || value === '') return fallback;
    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value) || Number(value) > max) fail('Phân trang không hợp lệ');
    return Number(value);
  };
  const page = integer(query.page, 1, 100000), limit = integer(query.limit, 20, 100);
  const where = {};
  if (query.status && query.status !== 'all') {
    if (!['pending','confirmed','packing','shipping','delivered','cancelled','returned'].includes(query.status)) fail('Trạng thái đơn hàng không hợp lệ');
    where.status = query.status;
  }
  const dates = {};
  for (const key of ['from','to']) {
    if (!query[key]) continue;
    const value = query[key];
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value))
      || new Date(value).toISOString().slice(0, 10) !== value) fail('Ngày lọc không hợp lệ');
    dates[key] = new Date(`${value}T00:00:00+07:00`);
  }
  if (dates.from && dates.to && dates.from > dates.to) fail('Ngày bắt đầu phải trước ngày kết thúc');
  if (dates.from || dates.to) where.createdAt = { ...(dates.from ? { [Op.gte]: dates.from } : {}),
    ...(dates.to ? { [Op.lt]: new Date(dates.to.getTime() + 86400000) } : {}) };
  if (query.sort && !['newest','oldest'].includes(query.sort)) fail('Thứ tự sắp xếp không hợp lệ');
  if (query.search) {
    if (typeof query.search !== 'string' || query.search.length > 120) fail('Từ khóa tối đa 120 ký tự');
    const keyword = `%${query.search.trim().replace(/[\\%_]/g, '\\$&')}%`;
    const pattern = sequelize.escape(keyword);
    where[Op.and] = sequelize.literal(`(CAST("Order".id AS TEXT) ILIKE ${pattern}
      OR "Order"."trackingCode" ILIKE ${pattern}
      OR "Order"."shippingAddress"->>'name' ILIKE ${pattern}
      OR "Order"."shippingAddress"->>'phone' ILIKE ${pattern}
      OR EXISTS(SELECT 1 FROM order_items oi WHERE oi."orderId"="Order".id AND oi.name ILIKE ${pattern})
      OR EXISTS(SELECT 1 FROM users bu WHERE bu.id="Order"."buyerId" AND (bu.name ILIKE ${pattern} OR bu.email ILIKE ${pattern})))`);
  }
  const direction = query.sort === 'oldest' ? 'ASC' : 'DESC';
  return { where, page, limit, offset: (page - 1) * limit, order: [['createdAt', direction], ['id', direction]] };
};
const listOrders = (scope, query, include, summarize) => {
  const { where, page, limit, offset, order } = parseOrderQuery(query);
  return sequelize.transaction({ isolationLevel: 'REPEATABLE READ' }, async (transaction) => {
    const { count, rows } = await Order.findAndCountAll({ where: { ...scope, ...where }, include, distinct: true,
      order, limit, offset, transaction });
    const items = await Promise.all(rows.map((row) => summarize(row, transaction)));
    return { items, total: count, page, limit, totalPages: Math.ceil(count / limit) };
  });
};
module.exports = { parseOrderQuery, listOrders };

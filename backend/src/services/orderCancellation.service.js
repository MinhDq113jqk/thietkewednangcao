const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { Order, OrderItem, Product } = require('../models');
const { appendTrackingEvent } = require('./orderTracking.service');

const createOrderError = (message, status, code) => {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
};

const cancelOrderWithRestock = async ({
  orderId,
  buyerId,
  allowedStatuses,
  note,
}) => sequelize.transaction(async (transaction) => {
  const where = { id: orderId };
  if (buyerId) where.buyerId = buyerId;

  const order = await Order.findOne({
    where,
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!order) throw createOrderError('Không tìm thấy đơn hàng', 404, 'ORDER_NOT_FOUND');
  if (!allowedStatuses.includes(order.status)) {
    throw createOrderError(
      'Trạng thái hiện tại không cho phép hủy đơn',
      409,
      'ORDER_CANNOT_BE_CANCELLED',
    );
  }
  if (order.paymentStatus === 'paid') {
    throw createOrderError(
      'Đơn đã thanh toán cần hoàn tiền trước khi hủy',
      409,
      'PAYMENT_REFUND_REQUIRED',
    );
  }

  const items = await OrderItem.findAll({
    where: { orderId: order.id },
    attributes: ['productId', 'quantity'],
    transaction,
  });
  const quantityByProduct = items.reduce((result, item) => {
    result.set(item.productId, (result.get(item.productId) || 0) + Number(item.quantity));
    return result;
  }, new Map());
  const productIds = [...quantityByProduct.keys()].sort();
  const products = productIds.length
    ? await Product.findAll({
        where: { id: { [Op.in]: productIds } },
        order: [['id', 'ASC']],
        transaction,
        lock: transaction.LOCK.UPDATE,
      })
    : [];

  for (const product of products) {
    const quantity = quantityByProduct.get(product.id);
    await product.update({
      stock: Number(product.stock) + quantity,
      sold: Math.max(0, Number(product.sold || 0) - quantity),
    }, { transaction });
  }

  await order.update({
    status: 'cancelled',
    trackingHistory: appendTrackingEvent(order, {
      status: 'cancelled',
      note,
    }),
  }, { transaction });

  return order;
});

module.exports = { cancelOrderWithRestock };

const { sequelize } = require('../database/connection');
const { Order } = require('../models');
const { appendTrackingEvent } = require('./orderTracking.service');
const { deleteByPattern } = require('../config/redis');

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

  return restockLockedOrder(order, transaction, note);
});

const restockLockedOrder = async (order, transaction, note, extra = {}) => {
  if (order.status === 'cancelled') return order;
  await require('./inventory.service').orderMovements(order, transaction, 'release', extra.actorId || null, note || 'Giải phóng giữ hàng');

  await order.update({
    ...Object.fromEntries(Object.entries(extra).filter(([key]) => key !== 'actorId')),
    status: 'cancelled',
    trackingHistory: appendTrackingEvent(order, {
      status: 'cancelled',
      note,
    }),
  }, { transaction });
  transaction.afterCommit(() => deleteByPattern('products:*').catch(() => {}));

  return order;
};

module.exports = { cancelOrderWithRestock, restockLockedOrder };

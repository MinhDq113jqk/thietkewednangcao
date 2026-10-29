const { Op } = require('sequelize');
const { sequelize } = require('../database/connection');
const { Order } = require('../models');
const { restockLockedOrder } = require('./orderCancellation.service');

const EXPIRABLE_STATUSES = ['pending', 'confirmed', 'packing'];
const paymentWindowMinutes = () => {
  const value = Number(process.env.PAYMENT_WINDOW_MINUTES || 30);
  if (!Number.isInteger(value) || value < 1 || value > 10080) {
    throw new Error('PAYMENT_WINDOW_MINUTES phải là số nguyên từ 1 đến 10080');
  }
  return value;
};
const paymentDeadline = () => new Date(Date.now() + paymentWindowMinutes() * 60000);
const isPaymentOverdue = (order, now = new Date()) => Boolean(
  order?.paymentMethod === 'bank_transfer' && order.paymentStatus === 'unpaid'
  && order.paymentExpiresAt && new Date(order.paymentExpiresAt) <= now
);

// Caller owns the Order row lock. Payment confirmation uses this same lock.
const expireLockedOrder = async (order, transaction, now = new Date()) => {
  if (!isPaymentOverdue(order, now) || !EXPIRABLE_STATUSES.includes(order.status)) return false;
  await restockLockedOrder(order, transaction, 'Đơn hết hạn thanh toán; đã giải phóng tồn kho', { expiredAt: now });
  return true;
};

const expireUnpaidOrders = async (limit = 100) => {
  let expired = 0;
  // One transaction per order limits lock duration and supports multiple workers.
  for (let i = 0; i < limit; i++) {
    const found = await sequelize.transaction(async (transaction) => {
      const order = await Order.findOne({
        where: { paymentMethod: 'bank_transfer', paymentStatus: 'unpaid',
          status: { [Op.in]: EXPIRABLE_STATUSES }, paymentExpiresAt: { [Op.lte]: new Date() } },
        order: [['paymentExpiresAt', 'ASC'], ['id', 'ASC']],
        transaction, lock: transaction.LOCK.UPDATE, skipLocked: true,
      });
      if (!order) return false;
      return expireLockedOrder(order, transaction);
    });
    if (!found) break;
    expired++;
  }
  return expired;
};

module.exports = { paymentDeadline, paymentWindowMinutes, isPaymentOverdue, expireLockedOrder, expireUnpaidOrders };

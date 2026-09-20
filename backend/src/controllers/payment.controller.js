const { sequelize } = require('../config/db');
const { Order, PaymentTransaction, Shop } = require('../models');
const { buildOrderTransferInfo, generateVietQr } = require('../services/vietqr.service');
const {
  getOrderPaymentAmount,
  validateVietQrOrder,
} = require('../services/paymentState.service');

exports.generateOrderQr = async (req, res, next) => {
  try {
    const order = await Order.findByPk(req.body.orderId || req.params.orderId, {
      include: [{ model: Shop, as: 'shop', attributes: ['id', 'name'] }],
    });

    if (!order) return res.status(404).json({ message: 'Khong tim thay don hang' });
    if (req.user.role !== 'admin' && order.buyerId !== req.user.id) {
      return res.status(403).json({ message: 'Khong co quyen tao QR cho don hang nay' });
    }

    const validationError = validateVietQrOrder(order);
    if (validationError) return res.status(409).json({ message: validationError });

    const amount = getOrderPaymentAmount(order);
    const addInfo = buildOrderTransferInfo(order.id);
    const qr = await generateVietQr({ amount, addInfo });

    await sequelize.transaction(async (transaction) => {
      const lockedOrder = await Order.findByPk(order.id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      const lockedValidationError = validateVietQrOrder(lockedOrder);
      if (lockedValidationError) {
        throw Object.assign(new Error(lockedValidationError), { status: 409 });
      }

      const payment = await PaymentTransaction.findOne({
        where: { orderId: order.id },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      const paymentData = {
        provider: 'vietqr',
        status: 'pending',
        amount,
        reference: addInfo,
        metadata: { qrGeneratedAt: new Date().toISOString() },
      };

      if (payment) await payment.update(paymentData, { transaction });
      else await PaymentTransaction.create({ orderId: order.id, ...paymentData }, { transaction });
    });

    res.json({
      orderId: order.id,
      shopName: order.shop?.name,
      paymentStatus: order.paymentStatus,
      ...qr,
    });
  } catch (err) {
    next(err);
  }
};

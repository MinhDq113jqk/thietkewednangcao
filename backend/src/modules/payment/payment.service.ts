import { Injectable } from '@nestjs/common';
import type { Response } from 'express';
import type { AppRequest } from '../../common/types/app-request';

const { sequelize } = require('../../database/connection');
const { Order, PaymentTransaction, Shop } = require('../../models');
const {
  buildOrderTransferInfo,
  generateVietQr,
} = require('../../services/vietqr.service');
const {
  getOrderPaymentAmount,
  validateVietQrOrder,
} = require('../../services/paymentState.service');
const { orderPaymentSummary } = require('../../services/paymentReconciliation.service');

@Injectable()
export class PaymentService {
  async generateOrderQr(req: AppRequest, res: Response) {
    try {
      const order = await Order.findByPk(
        req.body.orderId || req.params.orderId,
        {
          include: [{ model: Shop, as: 'shop', attributes: ['id', 'name'] }],
        },
      );

      if (!order)
        return res.status(404).json({ message: 'Khong tim thay don hang' });
      if (req.user.role !== 'admin' && order.buyerId !== req.user.id) {
        return res
          .status(403)
          .json({ message: 'Khong co quyen tao QR cho don hang nay' });
      }

      const validationError = validateVietQrOrder(order);
      if (validationError)
        return res.status(409).json({ message: validationError });

      const summary = await orderPaymentSummary(order);
      const amount = summary.outstandingAmount;
      const addInfo = buildOrderTransferInfo(order.id);
      const qr = await generateVietQr({ amount, addInfo });

      await sequelize.transaction(async (transaction) => {
        const lockedOrder = await Order.findByPk(order.id, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        const lockedValidationError = validateVietQrOrder(lockedOrder);
        if (lockedValidationError) {
          throw Object.assign(new Error(lockedValidationError), {
            status: 409,
          });
        }
        const lockedSummary = await orderPaymentSummary(lockedOrder, transaction);
        if (lockedSummary.outstandingAmount !== amount) {
          throw Object.assign(new Error('Số tiền còn thiếu đã thay đổi. Vui lòng tải lại mã QR.'), { status: 409 });
        }

        const payment = await PaymentTransaction.findOne({
          where: { orderId: order.id },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        const paymentData = {
          provider: 'vietqr',
          status: 'pending',
          amount: getOrderPaymentAmount(lockedOrder),
          reference: addInfo,
          metadata: { ...(payment?.metadata || {}), qrGeneratedAt: new Date().toISOString() },
        };

        if (payment) await payment.update(paymentData, { transaction });
        else
          await PaymentTransaction.create(
            { orderId: order.id, ...paymentData },
            { transaction },
          );
      });

      res.json({
        orderId: order.id,
        shopName: order.shop?.name,
        paymentStatus: order.paymentStatus,
        paymentExpiresAt: order.paymentExpiresAt,
        ...qr,
      });
    } catch (err) {
      throw err;
    }
  }
}

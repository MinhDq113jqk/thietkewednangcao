import { Injectable } from '@nestjs/common';
import type { Response } from 'express';
import type { AppRequest } from '../../common/types/app-request';

const { Op } = require('sequelize');
const { sequelize } = require('../../database/connection');
const {
  Order,
  OrderItem,
  PaymentTransaction,
  Product,
  Shop,
  User,
} = require('../../models');
const { deleteByPattern } = require('../../config/redis');
const { moderate } = require('../../services/operations.service');
const {
  cancelOrderWithRestock,
} = require('../../services/orderCancellation.service');
const {
  canAdminTransitionOrder,
  getAdminOrderTransitions,
} = require('../../services/orderState.service');
const { appendTrackingEvent } = require('../../services/orderTracking.service');
const { orderPaymentSummary } = require('../../services/paymentReconciliation.service');
const { counts, dashboardRevenue } = require('../../services/dashboard.service');
const { productCounts } = require('../../services/productPaging.service');

const orderStatuses = [
  'pending',
  'confirmed',
  'packing',
  'shipping',
  'delivered',
  'cancelled',
  'returned',
];

const toPositiveInt = (value, fallback, max = 100) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
};

const readPaging = (query) => {
  const page = toPositiveInt(query.page, 1);
  const limit = toPositiveInt(query.limit, 20, 100);
  return { page, limit, offset: (page - 1) * limit };
};

const buildPagedPayload = ({ rows, count, page, limit }) => ({
  items: rows,
  total: count,
  page,
  limit,
  totalPages: Math.max(1, Math.ceil(count / limit)),
});

@Injectable()
export class AdminService {
  async getStats(_req: AppRequest, res: Response) {
    try {
      const data = await sequelize.transaction({ isolationLevel: 'REPEATABLE READ' }, async (transaction) => {
        const [roles, active, shops, products, orders, revenue] = await Promise.all([
          counts('users','role',null,transaction), counts('users','isActive',null,transaction),
          counts('shops','status',null,transaction), productCounts(null,transaction),
          counts('orders','status',null,transaction), dashboardRevenue(null,transaction),
        ]);
        const total = rows => Object.values(rows).reduce((sum: number, n: any) => sum+n, 0);
        return {
          users: { total: total(roles), active: active.true || 0, inactive: active.false || 0, byRole: roles },
          shops: { total: total(shops), byStatus: shops, pending: shops.pending || 0 }, products,
          orders: { total: total(orders), byStatus: orders },
          revenue: { ...revenue, gmv: revenue.gross, pipelineValue: revenue.pipelineGross },
        };
      });
      res.json(data);
    } catch (err) {
      throw err;
    }
  }

  async listShops(req: AppRequest, res: Response) {
    try {
      const { page, limit, offset } = readPaging(req.query);
      const where: Record<PropertyKey, any> = {};

      if (req.query.status) where.status = req.query.status;
      if (req.query.search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${req.query.search}%` } },
          { slug: { [Op.iLike]: `%${req.query.search}%` } },
          { location: { [Op.iLike]: `%${req.query.search}%` } },
        ];
      }

      const result = await Shop.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'owner',
            attributes: ['id', 'name', 'email', 'isActive'],
          },
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset,
      });

      res.json(buildPagedPayload({ ...result, page, limit }));
    } catch (err) {
      throw err;
    }
  }

  async approveShop(req: AppRequest, res: Response) {
    await moderate(req.user.id, 'shop', req.params.id, { action: 'approve', reason: req.body.reason });
    res.json(await Shop.findByPk(req.params.id));
  }

  async suspendShop(req: AppRequest, res: Response) {
    await moderate(req.user.id, 'shop', req.params.id, { action: 'hide', reason: req.body.reason });
    res.json(await Shop.findByPk(req.params.id));
  }

  async listUsers(req: AppRequest, res: Response) {
    try {
      const { page, limit, offset } = readPaging(req.query);
      const where: Record<PropertyKey, any> = {};

      if (req.query.role) where.role = req.query.role;
      if (req.query.status === 'active') where.isActive = true;
      if (req.query.status === 'inactive') where.isActive = false;
      if (req.query.search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${req.query.search}%` } },
          { email: { [Op.iLike]: `%${req.query.search}%` } },
          { phone: { [Op.iLike]: `%${req.query.search}%` } },
        ];
      }

      const result = await User.findAndCountAll({
        where,
        attributes: [
          'id',
          'name',
          'email',
          'phone',
          'avatar',
          'role',
          'isActive',
          'createdAt',
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset,
      });

      res.json(buildPagedPayload({ ...result, page, limit }));
    } catch (err) {
      throw err;
    }
  }

  async updateUserStatus(req: AppRequest, res: Response) {
    try {
      const user = await User.findByPk(req.params.id, {
        attributes: ['id', 'name', 'email', 'role', 'isActive'],
      });

      if (!user)
        return res.status(404).json({ message: 'Khong tim thay nguoi dung' });
      if (user.id === req.user.id && req.body.isActive === false) {
        return res
          .status(400)
          .json({ message: 'Admin khong the tu khoa tai khoan cua minh' });
      }

      await user.update({ isActive: req.body.isActive !== false });
      res.json(user);
    } catch (err) {
      throw err;
    }
  }

  async listOrders(req: AppRequest, res: Response) {
    try {
      const { page, limit, offset } = readPaging(req.query);
      const where: Record<PropertyKey, any> = {};

      if (req.query.status) where.status = req.query.status;

      const result = await Order.findAndCountAll({
        where,
        include: [
          { model: OrderItem, as: 'items' },
          {
            model: User,
            as: 'buyer',
            attributes: ['id', 'name', 'email', 'phone'],
          },
          {
            model: Shop,
            as: 'shop',
            attributes: ['id', 'name', 'slug', 'status'],
          },
          { model: PaymentTransaction, as: 'payment' },
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset,
      });

      const payload = buildPagedPayload({ ...result, page, limit });
      payload.items = await Promise.all(payload.items.map(async (order) => ({
        ...order.toJSON(),
        paymentSummary: await orderPaymentSummary(order),
        allowedStatusTransitions: getAdminOrderTransitions(order.status).filter((status) =>
          status === 'cancelled' || order.paymentMethod !== 'bank_transfer' || order.paymentStatus === 'paid'),
      })));
      res.json(payload);
    } catch (err) {
      throw err;
    }
  }

  async updateOrderStatus(req: AppRequest, res: Response) {
    try {
      const { status } = req.body;
      if (!orderStatuses.includes(status)) {
        return res
          .status(400)
          .json({ message: 'Trang thai don hang khong hop le' });
      }

      let order;
      if (status === 'cancelled') {
        order = await cancelOrderWithRestock({
          orderId: req.params.id,
          allowedStatuses: ['pending', 'confirmed', 'packing'],
          note: 'Quản trị viên đã hủy đơn',
        });
      } else {
        order = await sequelize.transaction(async (transaction) => {
          const lockedOrder = await Order.findByPk(req.params.id, {
            transaction,
            lock: transaction.LOCK.UPDATE,
          });
          if (!lockedOrder) return null;
          if (!canAdminTransitionOrder(lockedOrder.status, status)) {
            throw Object.assign(
              new Error('Không thể chuyển sang trạng thái đơn hàng này'),
              {
                status: 409,
                code: 'INVALID_ORDER_TRANSITION',
              },
            );
          }
          if (lockedOrder.status === status) return lockedOrder;
          if (lockedOrder.paymentMethod === 'bank_transfer' && lockedOrder.paymentStatus !== 'paid') {
            throw Object.assign(new Error('Đơn chuyển khoản cần được đối soát đủ tiền trước khi xử lý'), { status: 409 });
          }

          if (status === 'shipping') await require('../../services/inventory.service').orderMovements(lockedOrder, transaction, 'ship', req.user.id, 'Quản trị viên bàn giao hàng');
          await lockedOrder.update(
            {
              status,
              trackingHistory: appendTrackingEvent(lockedOrder, {
                status,
                note: 'Quản trị viên cập nhật trạng thái',
              }),
            },
            { transaction },
          );
          return lockedOrder;
        });
        if (!order)
          return res.status(404).json({ message: 'Khong tim thay don hang' });
      }

      res.json(order);
    } catch (err) {
      throw err;
    }
  }

  async updateOrderPayment(req: AppRequest, res: Response) {
    const paid = req.body.status === 'paid';
    return res.status(409).json({ code: paid ? 'PAYMENT_RECEIPT_REQUIRED' : 'REFUND_LEDGER_REQUIRED',
      message: paid ? 'Ghi nhận chứng từ tại màn hình đối soát thanh toán hoặc COD'
        : 'Ghi nhận từng khoản hoàn tiền tại màn hình Đổi trả và hoàn tiền' });
  }
}

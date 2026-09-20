const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const {
  Order,
  OrderItem,
  PaymentTransaction,
  Product,
  Shop,
  User,
} = require('../models');
const { deleteByPattern } = require('../config/redis');
const { sendOrderStatusEmail } = require('../services/email.service');
const { cancelOrderWithRestock } = require('../services/orderCancellation.service');
const {
  canAdminTransitionOrder,
  getAdminOrderTransitions,
} = require('../services/orderState.service');
const { appendTrackingEvent } = require('../services/orderTracking.service');
const {
  getOrderPaymentAmount,
  validateManualPaymentStatus,
} = require('../services/paymentState.service');

const orderStatuses = ['pending', 'confirmed', 'packing', 'shipping', 'delivered', 'cancelled', 'returned'];

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

exports.getStats = async (_req, res, next) => {
  try {
    const [users, shops, products, orders] = await Promise.all([
      User.findAll({ attributes: ['id', 'role', 'isActive'] }),
      Shop.findAll({ attributes: ['id', 'status'] }),
      Product.findAll({ attributes: ['id', 'isActive'] }),
      Order.findAll({ attributes: ['id', 'status', 'paymentStatus', 'total'] }),
    ]);

    const pipelineValue = orders
      .filter((order) => !['cancelled', 'returned'].includes(order.status))
      .reduce((sum, order) => sum + Number(order.total || 0), 0);
    const grossMerchandiseValue = orders
      .filter((order) => order.status === 'delivered' && order.paymentStatus === 'paid')
      .reduce((sum, order) => sum + Number(order.total || 0), 0);

    const countBy = (items, key) => items.reduce((result, item) => {
      const value = item[key] ?? 'unknown';
      result[value] = (result[value] || 0) + 1;
      return result;
    }, {});

    res.json({
      users: {
        total: users.length,
        active: users.filter((user) => user.isActive).length,
        inactive: users.filter((user) => !user.isActive).length,
        byRole: countBy(users, 'role'),
      },
      shops: {
        total: shops.length,
        byStatus: countBy(shops, 'status'),
        pending: shops.filter((shop) => shop.status === 'pending').length,
      },
      products: {
        total: products.length,
        active: products.filter((product) => product.isActive).length,
        hidden: products.filter((product) => !product.isActive).length,
      },
      orders: {
        total: orders.length,
        byStatus: countBy(orders, 'status'),
      },
      revenue: {
        gmv: grossMerchandiseValue,
        pipelineValue,
        estimatedCommission: grossMerchandiseValue * 0.1,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.listShops = async (req, res, next) => {
  try {
    const { page, limit, offset } = readPaging(req.query);
    const where = {};

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
      include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'email', 'isActive'] }],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    res.json(buildPagedPayload({ ...result, page, limit }));
  } catch (err) {
    next(err);
  }
};

exports.approveShop = async (req, res, next) => {
  try {
    const shop = await Shop.findByPk(req.params.id, {
      include: [{ model: User, as: 'owner', attributes: ['id', 'role'] }],
    });

    if (!shop) return res.status(404).json({ message: 'Khong tim thay gian hang' });
    await shop.update({ status: 'active' });
    if (shop.owner && shop.owner.role === 'buyer') await shop.owner.update({ role: 'seller' });
    await deleteByPattern('products:*');

    res.json(shop);
  } catch (err) {
    next(err);
  }
};

exports.suspendShop = async (req, res, next) => {
  try {
    const shop = await Shop.findByPk(req.params.id);
    if (!shop) return res.status(404).json({ message: 'Khong tim thay gian hang' });

    await shop.update({ status: 'suspended' });
    await deleteByPattern('products:*');
    res.json(shop);
  } catch (err) {
    next(err);
  }
};

exports.listUsers = async (req, res, next) => {
  try {
    const { page, limit, offset } = readPaging(req.query);
    const where = {};

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
      attributes: ['id', 'name', 'email', 'phone', 'avatar', 'role', 'isActive', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    res.json(buildPagedPayload({ ...result, page, limit }));
  } catch (err) {
    next(err);
  }
};

exports.updateUserStatus = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: ['id', 'name', 'email', 'role', 'isActive'],
    });

    if (!user) return res.status(404).json({ message: 'Khong tim thay nguoi dung' });
    if (user.id === req.user.id && req.body.isActive === false) {
      return res.status(400).json({ message: 'Admin khong the tu khoa tai khoan cua minh' });
    }

    await user.update({ isActive: req.body.isActive !== false });
    res.json(user);
  } catch (err) {
    next(err);
  }
};

exports.listOrders = async (req, res, next) => {
  try {
    const { page, limit, offset } = readPaging(req.query);
    const where = {};

    if (req.query.status) where.status = req.query.status;

    const result = await Order.findAndCountAll({
      where,
      include: [
        { model: OrderItem, as: 'items' },
        { model: User, as: 'buyer', attributes: ['id', 'name', 'email', 'phone'] },
        { model: Shop, as: 'shop', attributes: ['id', 'name', 'slug', 'status'] },
        { model: PaymentTransaction, as: 'payment' },
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    const payload = buildPagedPayload({ ...result, page, limit });
    payload.items = payload.items.map((order) => ({
      ...order.toJSON(),
      allowedStatusTransitions: getAdminOrderTransitions(order.status),
    }));
    res.json(payload);
  } catch (err) {
    next(err);
  }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!orderStatuses.includes(status)) {
      return res.status(400).json({ message: 'Trang thai don hang khong hop le' });
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
          throw Object.assign(new Error('Không thể chuyển sang trạng thái đơn hàng này'), {
            status: 409,
            code: 'INVALID_ORDER_TRANSITION',
          });
        }
        if (lockedOrder.status === status) return lockedOrder;

        await lockedOrder.update({
          status,
          trackingHistory: appendTrackingEvent(lockedOrder, {
            status,
            note: 'Quản trị viên cập nhật trạng thái',
          }),
        }, { transaction });
        return lockedOrder;
      });
      if (!order) return res.status(404).json({ message: 'Khong tim thay don hang' });
    }

    const buyer = await User.findByPk(order.buyerId, { attributes: ['id', 'name', 'email'] });
    sendOrderStatusEmail(buyer, order).catch((err) => {
      console.error('Order status email failed:', err.message);
    });
    res.json(order);
  } catch (err) {
    next(err);
  }
};

exports.updateOrderPayment = async (req, res, next) => {
  try {
    const nextStatus = String(req.body.status || '').trim();
    const result = await sequelize.transaction(async (transaction) => {
      const order = await Order.findByPk(req.params.id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!order) return null;

      const validationError = validateManualPaymentStatus(order, nextStatus);
      if (validationError) {
        throw Object.assign(new Error(validationError), {
          status: 409,
          code: 'INVALID_PAYMENT_TRANSITION',
        });
      }

      const existingPayment = await PaymentTransaction.findOne({
        where: { orderId: order.id },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      const reference = String(req.body.reference || existingPayment?.reference || '').trim().slice(0, 120) || null;
      const note = String(req.body.note || '').trim().slice(0, 500);
      const paymentData = {
        provider: existingPayment?.provider || 'manual',
        status: nextStatus,
        amount: getOrderPaymentAmount(order),
        reference,
        confirmedAt: new Date(),
        confirmedBy: req.user.id,
        metadata: {
          ...(existingPayment?.metadata || {}),
          ...(note ? { reconciliationNote: note } : {}),
        },
      };

      const payment = existingPayment
        ? await existingPayment.update(paymentData, { transaction })
        : await PaymentTransaction.create({ orderId: order.id, ...paymentData }, { transaction });
      await order.update({ paymentStatus: nextStatus }, { transaction });
      return { order, payment };
    });

    if (!result) return res.status(404).json({ message: 'Khong tim thay don hang' });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
};

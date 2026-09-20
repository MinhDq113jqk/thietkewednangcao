const { Op, UniqueConstraintError } = require('sequelize');
const { sequelize } = require('../config/db');
const {
  CheckoutAttempt,
  Order,
  OrderItem,
  PaymentTransaction,
  Product,
  Shop,
  User,
} = require('../models');
const { sendOrderCreatedEmail, sendOrderStatusEmail } = require('../services/email.service');
const { estimateShippingFee } = require('../services/shipping.service');
const {
  createCheckoutRequestHash,
  getIdempotencyKey,
  isValidIdempotencyKey,
  normalizeCartItems,
  normalizeShippingAddress,
} = require('../services/checkoutIdempotency.service');
const {
  appendTrackingEvent,
  createTrackingEvent,
} = require('../services/orderTracking.service');
const { cancelOrderWithRestock } = require('../services/orderCancellation.service');
const { getOrderPaymentAmount } = require('../services/paymentState.service');

const includeOrderDetails = [
  {
    model: OrderItem,
    as: 'items',
    include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'images', 'category'] }],
  },
  { model: Shop, as: 'shop', attributes: ['id', 'name', 'slug', 'logo', 'location'] },
];

const getDetailedOrders = (orderIds) =>
  Order.findAll({
    where: { id: { [Op.in]: orderIds } },
    include: includeOrderDetails,
    order: [['createdAt', 'DESC']],
  });

const getSellerShop = (userId) =>
  Shop.findOne({ where: { ownerId: userId } });

const getSellerOrder = (shopId, orderId, include = []) =>
  Order.findOne({ where: { id: orderId, shopId }, include });

const notifyOrderStatus = async (order) => {
  const buyer = await User.findByPk(order.buyerId, {
    attributes: ['id', 'name', 'email'],
  });

  sendOrderStatusEmail(buyer, order).catch((error) => {
    console.error('Order status email failed:', error.message);
  });
};

const replayCheckout = async ({ buyerId, idempotencyKey, requestHash, res }) => {
  const existing = await CheckoutAttempt.findOne({
    where: { buyerId, idempotencyKey },
  });

  if (!existing) return false;
  if (existing.requestHash !== requestHash) {
    res.status(409).json({
      message: 'Khóa thanh toán đã được dùng cho một nội dung giỏ hàng khác',
      code: 'IDEMPOTENCY_KEY_REUSED',
    });
    return true;
  }

  if (existing.status !== 'completed' || !Array.isArray(existing.orderIds)) {
    res.setHeader('Retry-After', '1');
    res.status(409).json({
      message: 'Đơn hàng đang được xử lý, vui lòng giữ nguyên trang và thử lại sau giây lát',
      code: 'ORDER_IN_PROGRESS',
    });
    return true;
  }

  const orders = await getDetailedOrders(existing.orderIds);
  res.status(200).json({
    orders,
    idempotencyKey,
    idempotentReplay: true,
  });
  return true;
};

exports.createOrder = async (req, res, next) => {
  const idempotencyKey = getIdempotencyKey(req);
  res.setHeader('Idempotency-Key', idempotencyKey);

  try {
    if (!isValidIdempotencyKey(idempotencyKey)) {
      return res.status(400).json({
        message: 'Thiếu hoặc sai định dạng Idempotency-Key',
        code: 'IDEMPOTENCY_KEY_REQUIRED',
      });
    }

    const cartItems = normalizeCartItems(req.body.items);
    if (cartItems.length === 0) {
      return res.status(400).json({ message: 'Giỏ hàng không hợp lệ' });
    }

    const shippingAddress = normalizeShippingAddress(
      req.body.shippingAddress || req.body.address
    );
    if (
      !shippingAddress.name ||
      !shippingAddress.phone ||
      !shippingAddress.address ||
      !shippingAddress.city
    ) {
      return res.status(400).json({ message: 'Thông tin giao hàng chưa đầy đủ' });
    }

    const paymentMethod = String(req.body.paymentMethod || 'cod');
    if (!['cod', 'bank_transfer'].includes(paymentMethod)) {
      return res.status(400).json({ message: 'Phương thức thanh toán không hợp lệ' });
    }

    const requestHash = createCheckoutRequestHash({
      items: cartItems,
      shippingAddress,
      paymentMethod,
      note: req.body.note,
    });

    let createdOrders;
    try {
      createdOrders = await sequelize.transaction(async (transaction) => {
        const attempt = await CheckoutAttempt.create({
          buyerId: req.user.id,
          idempotencyKey,
          requestHash,
          status: 'processing',
          orderIds: [],
        }, { transaction });

        const productIds = cartItems.map((item) => item.productId);
        const products = await Product.findAll({
          where: { id: { [Op.in]: productIds }, isActive: true },
          order: [['id', 'ASC']],
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        const productMap = new Map(products.map((product) => [product.id, product]));
        if (products.length !== productIds.length) {
          throw Object.assign(new Error('Một số sản phẩm không còn tồn tại'), { status: 400 });
        }

        const shopIds = [...new Set(products.map((product) => product.shopId))].sort();
        const activeShops = await Shop.findAll({
          where: { id: { [Op.in]: shopIds }, status: 'active' },
          attributes: ['id'],
          order: [['id', 'ASC']],
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (activeShops.length !== shopIds.length) {
          throw Object.assign(
            new Error('Mot so gian hang dang tam ngung hoac chua duoc duyet'),
            { status: 409, code: 'SHOP_NOT_ACTIVE' },
          );
        }

        for (const item of cartItems) {
          const product = productMap.get(item.productId);
          if (Number(product.stock) < item.quantity) {
            throw Object.assign(
              new Error(`Sản phẩm "${product.name}" không đủ tồn kho`),
              { status: 400 }
            );
          }
        }

        const groupedByShop = cartItems.reduce((groups, item) => {
          const product = productMap.get(item.productId);
          const current = groups.get(product.shopId) || [];
          current.push({ product, quantity: item.quantity });
          groups.set(product.shopId, current);
          return groups;
        }, new Map());

        const orders = [];
        for (const [shopId, items] of groupedByShop.entries()) {
          const total = items.reduce((sum, item) => {
            const price = Number(item.product.salePrice || item.product.price || 0);
            return sum + price * item.quantity;
          }, 0);
          const shipping = estimateShippingFee({ city: shippingAddress.city, subtotal: total });

          const order = await Order.create({
            buyerId: req.user.id,
            shopId,
            total,
            shippingFee: shipping.fee,
            paymentMethod,
            paymentStatus: 'unpaid',
            shippingAddress,
            note: String(req.body.note || '').trim() || null,
            trackingHistory: [
              createTrackingEvent({
                status: 'pending',
                note: 'Đơn hàng đang chờ gian hàng xác nhận',
              }),
            ],
          }, { transaction });

          await OrderItem.bulkCreate(items.map(({ product, quantity }) => ({
            orderId: order.id,
            productId: product.id,
            name: product.name,
            image: Array.isArray(product.images) ? product.images[0] : null,
            price: Number(product.salePrice || product.price || 0),
            quantity,
          })), { transaction });

          for (const { product, quantity } of items) {
            await product.update({
              stock: Number(product.stock) - quantity,
              sold: Number(product.sold || 0) + quantity,
            }, { transaction });
          }

          orders.push(order);
        }

        await attempt.update({
          status: 'completed',
          orderIds: orders.map((order) => order.id),
        }, { transaction });

        return orders;
      });
    } catch (error) {
      if (error instanceof UniqueConstraintError || error.name === 'SequelizeUniqueConstraintError') {
        const handled = await replayCheckout({
          buyerId: req.user.id,
          idempotencyKey,
          requestHash,
          res,
        });
        if (handled) return;
      }
      throw error;
    }

    const detailedOrders = await getDetailedOrders(
      createdOrders.map((order) => order.id)
    );

    sendOrderCreatedEmail(req.user, detailedOrders).catch((error) => {
      console.error('Order email failed:', error.message);
    });

    res.status(201).json({
      orders: detailedOrders,
      idempotencyKey,
      idempotentReplay: false,
    });
  } catch (error) {
    next(error);
  }
};

exports.listMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.findAll({
      where: { buyerId: req.user.id },
      include: includeOrderDetails,
      order: [['createdAt', 'DESC']],
    });
    res.json(orders);
  } catch (error) {
    next(error);
  }
};

exports.getMyOrderById = async (req, res, next) => {
  try {
    const order = await Order.findOne({
      where: { id: req.params.id, buyerId: req.user.id },
      include: includeOrderDetails,
    });

    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    res.json(order);
  } catch (error) {
    next(error);
  }
};

exports.cancelMyOrder = async (req, res, next) => {
  try {
    await cancelOrderWithRestock({
      orderId: req.params.id,
      buyerId: req.user.id,
      allowedStatuses: ['pending'],
      note: 'Người mua đã hủy đơn',
    });

    res.json({ message: 'Đã hủy đơn hàng' });
  } catch (error) {
    next(error);
  }
};

exports.listSellerOrders = async (req, res, next) => {
  try {
    const shop = await getSellerShop(req.user.id);
    if (!shop) return res.status(404).json({ message: 'Bạn chưa có gian hàng' });

    const orders = await Order.findAll({
      where: { shopId: shop.id },
      include: [
        { model: OrderItem, as: 'items' },
        { model: User, as: 'buyer', attributes: ['id', 'name', 'email', 'phone'] },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json(orders);
  } catch (error) {
    next(error);
  }
};

exports.getSellerOrderStats = async (req, res, next) => {
  try {
    const shop = await getSellerShop(req.user.id);
    if (!shop) return res.status(404).json({ message: 'Bạn chưa có gian hàng' });

    const [orders, products] = await Promise.all([
      Order.findAll({
        where: { shopId: shop.id },
        include: [
          { model: OrderItem, as: 'items' },
          { model: User, as: 'buyer', attributes: ['id', 'name', 'email', 'phone'] },
        ],
        order: [['createdAt', 'DESC']],
      }),
      Product.findAll({
        where: { shopId: shop.id },
        attributes: ['id', 'name', 'price', 'salePrice', 'stock', 'sold', 'isActive', 'images'],
        order: [['sold', 'DESC'], ['createdAt', 'DESC']],
      }),
    ]);

    const countByStatus = orders.reduce((result, order) => {
      result[order.status] = (result[order.status] || 0) + 1;
      return result;
    }, {});
    const pipelineOrders = orders.filter((order) => !['cancelled', 'returned'].includes(order.status));
    const settledOrders = orders.filter((order) => (
      order.status === 'delivered' && order.paymentStatus === 'paid'
    ));
    const pipelineGross = pipelineOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const grossRevenue = settledOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const commissionRate = 0.1;
    const commission = grossRevenue * commissionRate;

    res.json({
      shop: { id: shop.id, name: shop.name, slug: shop.slug, status: shop.status },
      orders: {
        total: orders.length,
        pending: countByStatus.pending || 0,
        confirmed: countByStatus.confirmed || 0,
        packing: countByStatus.packing || 0,
        shipping: countByStatus.shipping || 0,
        delivered: countByStatus.delivered || 0,
        cancelled: countByStatus.cancelled || 0,
        returned: countByStatus.returned || 0,
        byStatus: countByStatus,
      },
      products: {
        total: products.length,
        active: products.filter((product) => product.isActive).length,
        hidden: products.filter((product) => !product.isActive).length,
        lowStock: products.filter((product) => Number(product.stock || 0) <= 5).length,
        topSelling: products.slice(0, 5),
      },
      revenue: {
        gross: grossRevenue,
        pipelineGross,
        settledOrders: settledOrders.length,
        awaitingPayment: pipelineOrders.filter((order) => order.paymentStatus === 'unpaid').length,
        commissionRate,
        commission,
        net: grossRevenue - commission,
      },
      recentOrders: orders.slice(0, 5),
    });
  } catch (error) {
    next(error);
  }
};

exports.confirmSellerOrder = async (req, res, next) => {
  try {
    const shop = await getSellerShop(req.user.id);
    if (!shop) return res.status(404).json({ message: 'Bạn chưa có gian hàng' });

    const order = await getSellerOrder(shop.id, req.params.id);
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    if (order.status !== 'pending') {
      return res.status(400).json({ message: 'Đơn hàng không ở trạng thái chờ xác nhận' });
    }

    await order.update({
      status: 'confirmed',
      trackingHistory: appendTrackingEvent(order, { status: 'confirmed' }),
    });
    await notifyOrderStatus(order);
    res.json(order);
  } catch (error) {
    next(error);
  }
};

exports.packSellerOrder = async (req, res, next) => {
  try {
    const shop = await getSellerShop(req.user.id);
    if (!shop) return res.status(404).json({ message: 'Bạn chưa có gian hàng' });

    const order = await getSellerOrder(shop.id, req.params.id);
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({ message: 'Đơn hàng không thể chuyển sang đóng gói' });
    }

    await order.update({
      status: 'packing',
      trackingHistory: appendTrackingEvent(order, { status: 'packing' }),
    });
    await notifyOrderStatus(order);
    res.json(order);
  } catch (error) {
    next(error);
  }
};

exports.shipSellerOrder = async (req, res, next) => {
  try {
    const shop = await getSellerShop(req.user.id);
    if (!shop) return res.status(404).json({ message: 'Bạn chưa có gian hàng' });

    const order = await getSellerOrder(shop.id, req.params.id);
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    if (!['confirmed', 'packing'].includes(order.status)) {
      return res.status(400).json({ message: 'Đơn hàng chưa sẵn sàng để giao' });
    }

    const carrier = String(req.body.carrier || '').trim();
    const trackingCode = String(req.body.trackingCode || '').trim();
    const currentLocation = String(req.body.currentLocation || shop.location || '').trim();
    if (!carrier || !trackingCode || !currentLocation) {
      return res.status(400).json({
        message: 'Cần nhập đơn vị vận chuyển, mã vận đơn và vị trí lấy hàng',
      });
    }

    const estimatedDeliveryAt = req.body.estimatedDeliveryAt
      ? new Date(req.body.estimatedDeliveryAt)
      : new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    if (Number.isNaN(estimatedDeliveryAt.getTime())) {
      return res.status(400).json({ message: 'Ngày dự kiến giao không hợp lệ' });
    }

    await order.update({
      carrier,
      trackingCode,
      currentLocation,
      estimatedDeliveryAt,
      shippedAt: new Date(),
      status: 'shipping',
      trackingHistory: appendTrackingEvent(order, {
        status: 'shipping',
        location: currentLocation,
        note: `Đã bàn giao cho ${carrier}`,
      }),
    });
    await notifyOrderStatus(order);
    res.json(order);
  } catch (error) {
    next(error);
  }
};

exports.updateSellerTracking = async (req, res, next) => {
  try {
    const shop = await getSellerShop(req.user.id);
    if (!shop) return res.status(404).json({ message: 'Bạn chưa có gian hàng' });

    const order = await getSellerOrder(shop.id, req.params.id);
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    if (order.status !== 'shipping') {
      return res.status(400).json({ message: 'Chỉ cập nhật vị trí cho đơn đang giao' });
    }

    const currentLocation = String(req.body.currentLocation || '').trim();
    if (!currentLocation) {
      return res.status(400).json({ message: 'Vui lòng nhập vị trí hiện tại của đơn' });
    }

    await order.update({
      currentLocation,
      trackingHistory: appendTrackingEvent(order, {
        status: 'shipping',
        location: currentLocation,
        note: req.body.note || 'Đơn hàng đã đến điểm trung chuyển mới',
      }),
    });
    res.json(order);
  } catch (error) {
    next(error);
  }
};

exports.deliverSellerOrder = async (req, res, next) => {
  try {
    const shop = await getSellerShop(req.user.id);
    if (!shop) return res.status(404).json({ message: 'Bạn chưa có gian hàng' });

    const order = await sequelize.transaction(async (transaction) => {
      const lockedOrder = await Order.findOne({
        where: { id: req.params.id, shopId: shop.id },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!lockedOrder) return null;
      if (lockedOrder.status !== 'shipping') {
        throw Object.assign(new Error('Chỉ hoàn tất đơn đang giao'), { status: 409 });
      }

      const currentLocation = String(
        req.body.currentLocation
          || lockedOrder.shippingAddress?.city
          || 'Đã giao cho người nhận',
      ).trim();
      await lockedOrder.update({
        currentLocation,
        deliveredAt: new Date(),
        paymentStatus: lockedOrder.paymentMethod === 'cod' ? 'paid' : lockedOrder.paymentStatus,
        status: 'delivered',
        trackingHistory: appendTrackingEvent(lockedOrder, {
          status: 'delivered',
          location: currentLocation,
          note: req.body.note || 'Người nhận đã nhận hàng',
        }),
      }, { transaction });

      if (lockedOrder.paymentMethod === 'cod') {
        const payment = await PaymentTransaction.findOne({
          where: { orderId: lockedOrder.id },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        const paymentData = {
          provider: 'cod',
          status: 'paid',
          amount: getOrderPaymentAmount(lockedOrder),
          reference: `COD-${lockedOrder.id.slice(0, 8).toUpperCase()}`,
          confirmedAt: new Date(),
          metadata: { source: 'seller_delivery_confirmation' },
        };
        if (payment) await payment.update(paymentData, { transaction });
        else await PaymentTransaction.create({
          orderId: lockedOrder.id,
          ...paymentData,
        }, { transaction });
      }

      return lockedOrder;
    });
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

    await notifyOrderStatus(order);
    res.json(order);
  } catch (error) {
    next(error);
  }
};

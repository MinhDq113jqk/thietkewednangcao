import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import type { AppRequest } from '../../common/types/app-request';

const { Op, UniqueConstraintError } = require('sequelize');
const { sequelize } = require('../../database/connection');
const {
  CheckoutAttempt,
  Order,
  OrderItem,
  Product,
  Shop,
  User,
} = require('../../models');
const { listOrders } = require('../../services/orderList.service');
const { loadCheckoutQuote } = require('../../services/checkoutQuote.service');
const {
  createCheckoutRequestHash,
  getIdempotencyKey,
  isValidIdempotencyKey,
  normalizeCartItems,
} = require('../../services/checkoutIdempotency.service');
const { validateShippingAddress } = require('../../shared/addressValidation.mjs');
const {
  appendTrackingEvent,
  createTrackingEvent,
} = require('../../services/orderTracking.service');
const {
  cancelOrderWithRestock,
} = require('../../services/orderCancellation.service');
const { paymentDeadline, isPaymentOverdue } = require('../../services/paymentExpiry.service');
const { orderPaymentSummary } = require('../../services/paymentReconciliation.service');
const { recognizedRevenue } = require('../../services/recognizedRevenue.service');
const { counts, dashboardRevenue } = require('../../services/dashboard.service');
const { productCounts } = require('../../services/productPaging.service');
const { change, orderMovements } = require('../../services/inventory.service');

const includeOrderDetails = [
  {
    model: OrderItem,
    as: 'items',
    include: [
      {
        model: Product,
        as: 'product',
        attributes: ['id', 'name', 'images', 'category'],
      },
    ],
  },
  {
    model: Shop,
    as: 'shop',
    attributes: ['id', 'name', 'slug', 'logo', 'location'],
  },
];

const getDetailedOrders = async (orderIds) => {
  const orders = await Order.findAll({
    where: { id: { [Op.in]: orderIds } },
    include: includeOrderDetails,
    order: [['createdAt', 'DESC']],
  });
  return Promise.all(orders.map(async (order) => ({ ...order.toJSON(),
    paymentSummary: await orderPaymentSummary(order) })));
};

const getSellerShop = (userId) => Shop.findOne({ where: { ownerId: userId } });

const getSellerOrder = (shopId, orderId, include = []) =>
  Order.findOne({ where: { id: orderId, shopId }, include });

const updateLockedSellerOrder = (shopId, orderId, update) =>
  sequelize.transaction(async (transaction) => {
    const order = await Order.findOne({
      where: { id: orderId, shopId }, transaction, lock: transaction.LOCK.UPDATE,
    });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    if (order.paymentMethod === 'bank_transfer' && ['pending', 'confirmed', 'packing'].includes(order.status)
      && (order.paymentStatus !== 'paid' || isPaymentOverdue(order))) {
      throw new BadRequestException('Đơn chuyển khoản cần được đối soát đủ tiền trước khi xử lý');
    }
    const values = update(order);
    if (values.status === 'shipping' && order.status !== 'shipping') await orderMovements(order, transaction, 'ship', null, 'Bàn giao hàng cho đơn vị vận chuyển');
    return order.update(values, { transaction });
  });

const replayCheckout = async ({
  buyerId,
  idempotencyKey,
  requestHash,
  legacyRequestHash,
  res,
}) => {
  const existing = await CheckoutAttempt.findOne({
    where: { buyerId, idempotencyKey },
  });

  if (!existing) return false;
  if (existing.requestHash !== requestHash && existing.requestHash !== legacyRequestHash) {
    res.status(409).json({
      message: 'Khóa thanh toán đã được dùng cho một nội dung giỏ hàng khác',
      code: 'IDEMPOTENCY_KEY_REUSED',
    });
    return true;
  }

  if (existing.status !== 'completed' || !Array.isArray(existing.orderIds)) {
    res.setHeader('Retry-After', '1');
    res.status(409).json({
      message:
        'Đơn hàng đang được xử lý, vui lòng giữ nguyên trang và thử lại sau giây lát',
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

@Injectable()
export class OrdersService {
  async createOrder(req: AppRequest, res: Response) {
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

      const rawShippingAddress = req.body.shippingAddress ?? req.body.address;
      const validation = validateShippingAddress(rawShippingAddress);
      if (!validation.valid) {
        throw new BadRequestException({ message: 'Địa chỉ giao hàng không hợp lệ', details: validation.errors });
      }
      const shippingAddress = validation.value;

      const paymentMethod = String(req.body.paymentMethod || 'cod');
      if (!['cod', 'bank_transfer'].includes(paymentMethod)) {
        return res
          .status(400)
          .json({ message: 'Phương thức thanh toán không hợp lệ' });
      }

      const hashInput = {
        items: cartItems,
        shippingAddress,
        paymentMethod,
        note: req.body.note,
        quoteFingerprint: req.body.quoteFingerprint,
      };
      const requestHash = createCheckoutRequestHash(hashInput);
      const legacyRequestHash = createCheckoutRequestHash({
        ...hashInput, shippingAddress: rawShippingAddress,
      }, { legacyPhoneFormatting: true });

      if (!/^[a-f0-9]{64}$/.test(String(req.body.quoteFingerprint || ''))) {
        return res.status(400).json({
          message: 'Vui lòng báo lại giá và phí vận chuyển trước khi đặt hàng',
          code: 'CHECKOUT_QUOTE_REQUIRED',
        });
      }

      let createdOrders;
      try {
        createdOrders = await sequelize.transaction(async (transaction) => {
          const attempt = await CheckoutAttempt.create(
            {
              buyerId: req.user.id,
              idempotencyKey,
              requestHash,
              status: 'processing',
              orderIds: [],
            },
            { transaction },
          );

          const { quote, groupedByShop } = await loadCheckoutQuote({
            items: cartItems,
            city: shippingAddress.city,
            transaction,
          });
          if (quote.fingerprint !== req.body.quoteFingerprint) {
            throw Object.assign(
              new Error(
                'Giá hoặc phí vận chuyển đã thay đổi. Vui lòng xem lại tổng tiền trước khi đặt hàng.',
              ),
              {
                status: 409,
                code: 'CHECKOUT_QUOTE_CHANGED',
              },
            );
          }

          const orders = [];
          for (const shipping of quote.shops) {
            const { shopId, subtotal: total } = shipping;
            const items = groupedByShop.get(shopId);

            const order = await Order.create(
              {
                buyerId: req.user.id,
                shopId,
                total,
                shippingFee: shipping.fee,
                paymentMethod,
                paymentStatus: 'unpaid',
                paymentExpiresAt: paymentMethod === 'bank_transfer' ? paymentDeadline() : null,
                shippingAddress,
                note: String(req.body.note || '').trim() || null,
                trackingHistory: [
                  createTrackingEvent({
                    status: 'pending',
                    note: 'Đơn hàng đang chờ gian hàng xác nhận',
                  }),
                ],
              },
              { transaction },
            );

            await OrderItem.bulkCreate(
              items.map(({ product, variant, quantity, price }) => ({
                orderId: order.id,
                productId: product.id,
                variantId: variant.id, sku: variant.sku, variantName: variant.name,
                name: product.name,
                image: variant.image || (Array.isArray(product.images) ? product.images[0] : null),
                price,
                quantity,
              })),
              { transaction },
            );

            for (const { product, variant, quantity } of items) {
              await change({ variantId: variant.id, availableDelta: -quantity, heldDelta: quantity,
                kind: 'reserve', sourceKey: 'reserve:' + order.id, actorId: req.user.id, orderId: order.id,
                reason: 'Giữ hàng khi tạo đơn' }, transaction);
              await product.increment('sold', { by: quantity, transaction });
            }

            orders.push(order);
          }

          await attempt.update(
            {
              status: 'completed',
              orderIds: orders.map((order) => order.id),
            },
            { transaction },
          );

          return orders;
        });
      } catch (error) {
        if (
          error instanceof UniqueConstraintError ||
          error.name === 'SequelizeUniqueConstraintError'
        ) {
          const handled = await replayCheckout({
            buyerId: req.user.id,
            idempotencyKey,
            requestHash,
            legacyRequestHash,
            res,
          });
          if (handled) return;
        }
        throw error;
      }

      const detailedOrders = await getDetailedOrders(
        createdOrders.map((order) => order.id),
      );


      res.status(201).json({
        orders: detailedOrders,
        idempotencyKey,
        idempotentReplay: false,
      });
    } catch (error) {
      throw error;
    }
  }

  async listMyOrders(req: AppRequest, res: Response) {
    try {
      res.json(await listOrders({ buyerId: req.user.id }, req.query, includeOrderDetails,
        async (order, transaction) => ({ ...order.toJSON(), paymentSummary: await orderPaymentSummary(order, transaction) })));
    } catch (error) {
      throw error;
    }
  }

  async getMyOrderById(req: AppRequest, res: Response) {
    try {
      const order = await Order.findOne({
        where: { id: req.params.id, buyerId: req.user.id },
        include: includeOrderDetails,
      });

      if (!order)
        return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
      res.json({ ...order.toJSON(), paymentSummary: await orderPaymentSummary(order) });
    } catch (error) {
      throw error;
    }
  }

  async cancelMyOrder(req: AppRequest, res: Response) {
    try {
      await cancelOrderWithRestock({
        orderId: req.params.id,
        buyerId: req.user.id,
        allowedStatuses: ['pending'],
        note: 'Người mua đã hủy đơn',
      });

      res.json({ message: 'Đã hủy đơn hàng' });
    } catch (error) {
      throw error;
    }
  }

  async listSellerOrders(req: AppRequest, res: Response) {
    try {
      const shop = await getSellerShop(req.user.id);
      if (!shop)
        return res.status(404).json({ message: 'Bạn chưa có gian hàng' });

      res.json(await listOrders({ shopId: shop.id }, req.query, [
          { model: OrderItem, as: 'items' },
          {
            model: User,
            as: 'buyer',
            attributes: ['id', 'name', 'email', 'phone'],
          },
        ], async (order, transaction) => ({ ...order.toJSON(),
          recognizedRevenue: await recognizedRevenue(order, transaction), paymentSummary: await orderPaymentSummary(order, transaction) })));
    } catch (error) {
      throw error;
    }
  }

  async getSellerOrderStats(req: AppRequest, res: Response) {
    try {
      const shop = await getSellerShop(req.user.id);
      if (!shop)
        return res.status(404).json({ message: 'Bạn chưa có gian hàng' });

      const data = await sequelize.transaction({ isolationLevel: 'REPEATABLE READ' }, async (transaction) => {
        const [countByStatus, productSummary, products, orders, revenue] = await Promise.all([
          counts('orders', 'status', shop.id, transaction), productCounts(shop.id, transaction),
          Product.findAll({ where: { shopId: shop.id }, order: [['sold', 'DESC'], ['id', 'ASC']], limit: 5, transaction }),
          Order.findAll({ where: { shopId: shop.id }, include: [{ model: OrderItem, as: 'items' }, { model: User, as: 'buyer', attributes: ['id', 'name', 'email', 'phone'] }], order: [['createdAt','DESC'], ['id','ASC']], limit: 5, transaction }),
          dashboardRevenue(shop.id, transaction),
        ]);
        return {
          shop: {
            id: shop.id,
            name: shop.name,
            slug: shop.slug,
            status: shop.status,
          },
          orders: {
            total: Object.values(countByStatus).reduce((sum: number, n: any) => sum + n, 0),
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
            ...productSummary,
            topSelling: products.slice(0, 5),
          },
          revenue,
          recentOrders: orders.slice(0, 5),
        };
      });
      res.json(data);
    } catch (error) {
      throw error;
    }
  }

  async confirmSellerOrder(req: AppRequest, res: Response) {
    try {
      const shop = await getSellerShop(req.user.id);
      if (!shop)
        return res.status(404).json({ message: 'Bạn chưa có gian hàng' });

      const order = await updateLockedSellerOrder(shop.id, req.params.id, (lockedOrder) => {
        if (lockedOrder.status !== 'pending') {
          throw new BadRequestException('Đơn hàng không ở trạng thái chờ xác nhận');
        }
        return {
          status: 'confirmed',
          trackingHistory: appendTrackingEvent(lockedOrder, { status: 'confirmed' }),
        };
      });
      res.json(order);
    } catch (error) {
      throw error;
    }
  }

  async packSellerOrder(req: AppRequest, res: Response) {
    try {
      const shop = await getSellerShop(req.user.id);
      if (!shop)
        return res.status(404).json({ message: 'Bạn chưa có gian hàng' });

      const order = await updateLockedSellerOrder(shop.id, req.params.id, (lockedOrder) => {
        if (!['pending', 'confirmed'].includes(lockedOrder.status)) {
          throw new BadRequestException('Đơn hàng không thể chuyển sang đóng gói');
        }
        return {
          status: 'packing',
          trackingHistory: appendTrackingEvent(lockedOrder, { status: 'packing' }),
        };
      });
      res.json(order);
    } catch (error) {
      throw error;
    }
  }

  async shipSellerOrder(req: AppRequest, res: Response) {
    try {
      const shop = await getSellerShop(req.user.id);
      if (!shop)
        return res.status(404).json({ message: 'Bạn chưa có gian hàng' });

      const order = await updateLockedSellerOrder(shop.id, req.params.id, (lockedOrder) => {
        if (!['confirmed', 'packing'].includes(lockedOrder.status)) {
          throw new BadRequestException('Đơn hàng chưa sẵn sàng để giao');
        }
        const carrier = String(req.body.carrier || '').trim();
        const trackingCode = String(req.body.trackingCode || '').trim();
        const currentLocation = String(
          req.body.currentLocation || shop.location || '',
        ).trim();
        if (!carrier || !trackingCode || !currentLocation) {
          throw new BadRequestException('Cần nhập đơn vị vận chuyển, mã vận đơn và vị trí lấy hàng');
        }

        const estimatedDeliveryAt = req.body.estimatedDeliveryAt
          ? new Date(req.body.estimatedDeliveryAt)
          : new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
        if (Number.isNaN(estimatedDeliveryAt.getTime())) {
          throw new BadRequestException('Ngày dự kiến giao không hợp lệ');
        }

        return {
          carrier,
          trackingCode,
          currentLocation,
          estimatedDeliveryAt,
          shippedAt: new Date(),
          status: 'shipping',
          trackingHistory: appendTrackingEvent(lockedOrder, {
            status: 'shipping',
            location: currentLocation,
            note: `Đã bàn giao cho ${carrier}`,
          }),
        };
      });
      res.json(order);
    } catch (error) {
      throw error;
    }
  }

  async updateSellerTracking(req: AppRequest, res: Response) {
    try {
      const shop = await getSellerShop(req.user.id);
      if (!shop)
        return res.status(404).json({ message: 'Bạn chưa có gian hàng' });

      const order = await updateLockedSellerOrder(shop.id, req.params.id, (lockedOrder) => {
        if (lockedOrder.status !== 'shipping') {
          throw new BadRequestException('Chỉ cập nhật vị trí cho đơn đang giao');
        }

        const currentLocation = String(req.body.currentLocation || '').trim();
        if (!currentLocation) {
          throw new BadRequestException('Vui lòng nhập vị trí hiện tại của đơn');
        }

        return {
          currentLocation,
          trackingHistory: appendTrackingEvent(lockedOrder, {
            status: 'shipping',
            location: currentLocation,
            note: req.body.note || 'Đơn hàng đã đến điểm trung chuyển mới',
          }),
        };
      });
      res.json(order);
    } catch (error) {
      throw error;
    }
  }

  async deliverSellerOrder(req: AppRequest, res: Response) {
    try {
      const shop = await getSellerShop(req.user.id);
      if (!shop)
        return res.status(404).json({ message: 'Bạn chưa có gian hàng' });

      const order = await sequelize.transaction(async (transaction) => {
        const lockedOrder = await Order.findOne({
          where: { id: req.params.id, shopId: shop.id },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (!lockedOrder) return null;
        if (lockedOrder.status !== 'shipping') {
          throw Object.assign(new Error('Chỉ hoàn tất đơn đang giao'), {
            status: 409,
          });
        }

        const currentLocation = String(
          req.body.currentLocation ||
            lockedOrder.shippingAddress?.city ||
            'Đã giao cho người nhận',
        ).trim();
        await lockedOrder.update(
          {
            currentLocation,
            deliveredAt: new Date(),
            status: 'delivered',
            trackingHistory: appendTrackingEvent(lockedOrder, {
              status: 'delivered',
              location: currentLocation,
              note: req.body.note || 'Người nhận đã nhận hàng',
            }),
          },
          { transaction },
        );

        return lockedOrder;
      });
      if (!order)
        return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

      res.json(order);
    } catch (error) {
      throw error;
    }
  }
}

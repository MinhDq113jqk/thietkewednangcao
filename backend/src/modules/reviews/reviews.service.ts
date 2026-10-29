import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

const { sequelize } = require('../../database/connection');
const { Order, OrderItem, Review, Product, Shop, User } = require('../../models');
const { deleteByPattern } = require('../../config/redis');

const pageNumber = (value: unknown, fallback: number, max: number) => {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value) || Number(value) < 1 || Number(value) > max) throw new BadRequestException('Phân trang không hợp lệ');
  return Number(value);
};

@Injectable()
export class ReviewsService {
  async listProductReviews(productId: string, query: Record<string, unknown>) {
    const page = pageNumber(query.page, 1, 100000);
    const limit = pageNumber(query.limit, 5, 20);
    const product = await Product.findOne({ where: { id: productId, isActive: true, moderationHidden: false }, include: [{ model: Shop, as: 'shop', where: { status: 'active' }, attributes: ['id'] }] });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');
    return sequelize.transaction({ isolationLevel: 'REPEATABLE READ' }, async (transaction) => {
      const where = { productId, moderationHidden: false };
      const { rows, count } = await Review.findAndCountAll({
        where, attributes: ['id', 'rating', 'comment', 'createdAt'],
        include: [{ model: User, as: 'user', attributes: ['name', 'avatar'] }],
        order: [['createdAt', 'DESC'], ['id', 'DESC']], limit, offset: (page - 1) * limit, transaction,
      });
      const average = await Review.findOne({ where, attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'average']], raw: true, transaction });
      return { items: rows, total: count, page, limit, totalPages: Math.ceil(count / limit), averageRating: Number(Number(average?.average || 0).toFixed(2)) };
    });
  }

  async listOrderReviews(userId: string, orderId: string) {
    const order = await Order.findOne({ where: { id: orderId, buyerId: userId } });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    return Review.findAll({ where: { orderId, userId }, attributes: ['id', 'productId', 'rating', 'comment', 'createdAt'] });
  }

  async createReview(userId: string, orderId: string, input: unknown) {
    const body = input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : {};
    const errors: Record<string, string> = {};
    if (typeof body.productId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.productId)) errors.productId = 'Sản phẩm không hợp lệ';
    if (typeof body.rating !== 'number' || !Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5) errors.rating = 'Chọn số sao từ 1 đến 5';
    if (body.comment !== undefined && (typeof body.comment !== 'string' || body.comment.length > 2000)) errors.comment = 'Nhận xét tối đa 2000 ký tự';
    if (Object.keys(errors).length) throw new BadRequestException({ message: 'Đánh giá không hợp lệ', details: errors });
    try {
      const review = await sequelize.transaction(async (transaction) => {
        const order = await Order.findOne({ where: { id: orderId, buyerId: userId }, transaction, lock: transaction.LOCK.UPDATE });
        if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
        if (order.status !== 'delivered') throw new ConflictException('Chỉ được đánh giá sau khi đơn đã giao');
        const item = await OrderItem.findOne({ where: { orderId, productId: body.productId }, transaction });
        if (!item) throw new BadRequestException('Sản phẩm không thuộc đơn hàng này');
        const shop = await Shop.findByPk(order.shopId, { transaction, lock: transaction.LOCK.UPDATE });
        const where = { orderId, productId: body.productId, userId };
        if (await Review.findOne({ where, transaction })) throw new ConflictException('Bạn đã đánh giá sản phẩm này trong đơn hàng');
        const created = await Review.create({ ...where, rating: body.rating, comment: typeof body.comment === 'string' ? body.comment.trim() : '', images: [] }, { transaction });
        const aggregate = await Review.findOne({
          where: { moderationHidden: false },
          attributes: [[sequelize.fn('AVG', sequelize.col('Review.rating')), 'average'], [sequelize.fn('COUNT', sequelize.col('Review.id')), 'count']],
          include: [{ model: Product, as: 'product', attributes: [], where: { shopId: order.shopId } }], raw: true, transaction,
        });
        await shop.update({ rating: Number(aggregate.average), reviewCount: Number(aggregate.count) }, { transaction });
        return { id: created.id, productId: created.productId, rating: created.rating, comment: created.comment, createdAt: created.createdAt };
      });
      await deleteByPattern('products:*');
      return review;
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') throw new ConflictException('Bạn đã đánh giá sản phẩm này trong đơn hàng');
      throw error;
    }
  }
}

import type { CreateProductDto } from './dto/create-product.dto';
import type { UpdateProductDto } from './dto/update-product.dto';
import {
  PRODUCT_REPOSITORY,
  SHOP_REPOSITORY,
  ORDER_ITEM_REPOSITORY,
  REVIEW_REPOSITORY,
} from './products.providers';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import type { AppRequest } from '../../common/types/app-request';

const { Op, QueryTypes } = require('sequelize');
const { sequelize } = require('../../database/connection');
const { deleteByPattern, getJson, setJson } = require('../../config/redis');
const {
  CraftVillage,
  Order,
  OrderItem,
  Product,
  Region,
  Review,
  Shop,
  User,
} = require('../../models');
const {
  parsePreferenceCategories,
  scoreRecommendation,
} = require('../../services/recommendation.service');
const {
  validateProductInput,
} = require('../../services/productValidation.service');
const {
  getCategoryAliases,
  normalizeCategory,
  normalizeProduct,
  effectivePriceSql,
} = require('../../shared/productCatalog.mjs');
const { MAX_PRICE } = require('../../services/productValidation.service');
const { productPaging } = require('../../services/productPaging.service');
const priceExpression = sequelize.literal(effectivePriceSql('Product'));

const readPriceRange = (query) => {
  const read = (value) => {
    if (value === undefined || value === '') return null;
    if (!['string', 'number'].includes(typeof value) || !/^\d+$/.test(String(value))
      || !Number.isSafeInteger(Number(value)) || Number(value) > MAX_PRICE) {
      throw new BadRequestException('Giá lọc phải là số nguyên không âm hợp lệ');
    }
    return Number(value);
  };
  const minPrice = read(query.minPrice), maxPrice = read(query.maxPrice);
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) throw new BadRequestException('Giá tối thiểu không được lớn hơn giá tối đa');
  return { minPrice, maxPrice };
};

const categoryCondition = (category) =>
  sequelize.where(
    sequelize.fn(
      'lower',
      sequelize.fn('btrim', sequelize.col('Product.category')),
    ),
    { [Op.in]: getCategoryAliases(category) },
  );

const toPositiveInt = (value, fallback, max = 100) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
};

const parseProductQuery = (query) => {
  const page = toPositiveInt(query.page, 1);
  const limit = toPositiveInt(query.limit, 12, 50);
  const where: Record<PropertyKey, any> = { isActive: true, moderationHidden: false };

  if (query.category) where[Op.and] = [categoryCondition(query.category)];
  if (query.search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${query.search}%` } },
      { description: { [Op.iLike]: `%${query.search}%` } },
      { category: { [Op.iLike]: `%${query.search}%` } },
      categoryCondition(query.search),
    ];
  }

  const { minPrice, maxPrice } = readPriceRange(query);
  if (minPrice !== null || maxPrice !== null) {
    where[Op.and] = [...(where[Op.and] || []), sequelize.where(priceExpression, {
      ...(minPrice !== null ? { [Op.gte]: minPrice } : {}),
      ...(maxPrice !== null ? { [Op.lte]: maxPrice } : {}),
    })];
  }

  const orderMap = {
    price_asc: [[priceExpression, 'ASC']],
    price_desc: [[priceExpression, 'DESC']],
    sold_desc: [['sold', 'DESC']],
    newest: [['createdAt', 'DESC']],
  };

  return {
    page,
    limit,
    offset: (page - 1) * limit,
    where,
    order: [...(orderMap[query.sort] || orderMap.newest), ['id', 'ASC']],
  };
};

const normalizeProductQuery = (query) => {
  const parsed = parseProductQuery(query);
  return {
    category: normalizeCategory(query.category),
    ...readPriceRange(query),
    page: parsed.page,
    limit: parsed.limit,
    search: query.search || query.q || '',
    sort: query.sort || 'default',
  };
};

const productCacheKey = (prefix, query) => {
  const normalized = normalizeProductQuery(query);
  return `${prefix}:${JSON.stringify(normalized)}`;
};

const publicShopInclude = {
  model: Shop,
  as: 'shop',
  attributes: [
    'id',
    'name',
    'slug',
    'logo',
    'rating',
    'reviewCount',
    'location',
    'status',
  ],
  where: { status: 'active' },
  required: true,
};

const publicCultureInclude = {
  model: CraftVillage,
  as: 'craftVillage',
  attributes: ['id', 'name', 'slug', 'summary', 'crafts'],
  required: false,
  include: [
    {
      model: Region,
      as: 'region',
      attributes: ['id', 'name', 'slug', 'shortDescription', 'theme'],
      required: true,
    },
  ],
};

const getBuyerCategoryPreferences = async (buyerId) => {
  if (!buyerId) return [];

  const recentOrders = await Order.findAll({
    where: { buyerId, status: { [Op.notIn]: ['cancelled', 'returned'] } },
    attributes: ['id'],
    order: [['createdAt', 'DESC']],
    limit: 20,
  });
  const orderIds = recentOrders.map((order) => order.id);
  if (!orderIds.length) return [];

  const items = await OrderItem.findAll({
    where: { orderId: { [Op.in]: orderIds } },
    attributes: ['quantity'],
    include: [
      {
        model: Product,
        as: 'product',
        attributes: ['category'],
        required: true,
      },
    ],
  });

  const categoryWeights = items.reduce((weights, item) => {
    const category = normalizeCategory(item.product?.category);
    if (!category) return weights;
    weights.set(
      category,
      (weights.get(category) || 0) + Number(item.quantity || 1),
    );
    return weights;
  }, new Map());

  return [...categoryWeights.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([category]) => category)
    .slice(0, 4);
};

@Injectable()
export class ProductsService {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: any,
    @Inject(SHOP_REPOSITORY) private readonly shops: any,
    @Inject(ORDER_ITEM_REPOSITORY) private readonly orderItems: any,
    @Inject(REVIEW_REPOSITORY) private readonly reviews: any,
  ) {}

  async listSellerProducts(userId: string, query: any = {}) {
    try {
      const shop = await this.shops.findOne({ where: { ownerId: userId } });
      if (!shop)
        throw new NotFoundException({ message: 'Ban chua co gian hang' });

      const options = productPaging(query, shop.id, true);
      const { rows: products, count } = await this.products.findAndCountAll(options);
      const categories = await this.products.findAll({ where: { shopId: shop.id }, attributes: ['category'], group: ['category'], raw: true });

      const productIds = products.map((product) => product.id);
      const [orderCounts, reviewCounts] = await Promise.all([
        productIds.length
          ? this.orderItems.findAll({
              attributes: [
                'productId',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
              ],
              where: { productId: { [Op.in]: productIds } },
              group: ['productId'],
              raw: true,
            })
          : [],
        productIds.length
          ? this.reviews.findAll({
              attributes: [
                'productId',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
              ],
              where: { productId: { [Op.in]: productIds } },
              group: ['productId'],
              raw: true,
            })
          : [],
      ]);

      const orderCountByProduct = new Map<string, number>(
        orderCounts.map((item) => [item.productId, Number(item.count) || 0]),
      );
      const reviewCountByProduct = new Map<string, number>(
        reviewCounts.map((item) => [item.productId, Number(item.count) || 0]),
      );

      const items = products.map((product) => {
        const orderItemCount = orderCountByProduct.get(product.id) || 0;
        const reviewCount = reviewCountByProduct.get(product.id) || 0;

        return {
          ...normalizeProduct(product),
          orderItemCount,
          reviewCount,
          canDeletePermanently: orderItemCount === 0 && reviewCount === 0,
        };
      });
      return { items, total: count, page: options.page, limit: options.limit, totalPages: Math.max(1, Math.ceil(count / options.limit)), categories: categories.map(row => row.category).filter(Boolean) };
    } catch (err) { throw err; }
  }

  async getSellerProduct(userId: string, productId: string) {
    const shop = await this.shops.findOne({ where: { ownerId: userId } });
    const product = shop && await this.products.findOne({ where: { id: productId, shopId: shop.id }, include: [{ association: 'variants' }] });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');
    return normalizeProduct(product);
  }

  async createSellerProduct(userId: string, input: CreateProductDto) {
    try {
      const shop = await this.shops.findOne({ where: { ownerId: userId } });
      if (!shop)
        throw new NotFoundException({ message: 'Ban chua co gian hang' });
      if (shop.status !== 'active') {
        throw new ForbiddenException({
          message: 'Gian hang can duoc duyet truoc khi dang san pham',
        });
      }

      const validation = validateProductInput(input);
      if (!validation.valid) {
        throw new BadRequestException({
          message: 'Du lieu san pham khong hop le',
          details: validation.errors,
        });
      }

      const product = await this.products.create({
        shopId: shop.id,
        ...validation.value,
        salePrice: validation.value.salePrice ?? null,
        images: validation.value.images || [],
        isFlashSale: validation.value.isFlashSale || false,
        isActive: true,
        dataSource: 'seller',
      });

      await deleteByPattern('products:*');
      return normalizeProduct(product);
    } catch (err) {
      throw err;
    }
  }

  async updateSellerProduct(
    userId: string,
    productId: string,
    input: UpdateProductDto,
  ) {
    try {
      if (Object.prototype.hasOwnProperty.call(input, 'stock')) {
        throw new BadRequestException({ message: 'Điều chỉnh tồn kho bằng chức năng riêng để tránh ghi đè số lượng mới.', code: 'USE_STOCK_UPDATE' });
      }
      const shop = await this.shops.findOne({ where: { ownerId: userId } });
      if (!shop)
        throw new NotFoundException({ message: 'Ban chua co gian hang' });

      const product = await this.products.findOne({
        where: { id: productId, shopId: shop.id },
      });
      if (!product)
        throw new NotFoundException({ message: 'Khong tim thay san pham' });

      const validation = validateProductInput(input, {
        current: product.toJSON(),
        partial: true,
      });
      if (!validation.valid) {
        throw new BadRequestException({
          message: 'Du lieu san pham khong hop le',
          details: validation.errors,
        });
      }

      if (Number(product.variantCount) !== 1) { delete validation.value.price; delete validation.value.salePrice; }
      await product.update(validation.value);
      await deleteByPattern('products:*');
      return normalizeProduct(product);
    } catch (err) {
      throw err;
    }
  }

  async deleteSellerProduct(userId: string, productId: string) {
    try {
      const shop = await this.shops.findOne({ where: { ownerId: userId } });
      if (!shop)
        throw new NotFoundException({ message: 'Ban chua co gian hang' });

      const product = await this.products.findOne({
        where: { id: productId, shopId: shop.id },
      });
      if (!product)
        throw new NotFoundException({ message: 'Khong tim thay san pham' });
      await product.update({ isActive: false });
      await deleteByPattern('products:*');
      return { message: 'Da an san pham' };
    } catch (err) {
      throw err;
    }
  }

  async restoreSellerProduct(userId: string, productId: string) {
    try {
      const shop = await this.shops.findOne({ where: { ownerId: userId } });
      if (!shop)
        throw new NotFoundException({ message: 'Ban chua co gian hang' });

      const product = await this.products.findOne({
        where: { id: productId, shopId: shop.id },
      });
      if (!product)
        throw new NotFoundException({ message: 'Khong tim thay san pham' });
      if (shop.status !== 'active') {
        throw new ForbiddenException({
          message: 'Gian hang dang bi tam ngung hoat dong',
        });
      }

      await product.update({ isActive: true });
      await deleteByPattern('products:*');
      return {
        message: 'Da khoi phuc san pham',
        product: normalizeProduct(product),
      };
    } catch (err) {
      throw err;
    }
  }

  async permanentDeleteSellerProduct(userId: string, productId: string) {
    try {
      const shop = await this.shops.findOne({ where: { ownerId: userId } });
      if (!shop)
        throw new NotFoundException({ message: 'Ban chua co gian hang' });

      const product = await this.products.findOne({
        where: { id: productId, shopId: shop.id },
      });
      if (!product)
        throw new NotFoundException({ message: 'Khong tim thay san pham' });

      const [orderItemCount, reviewCount] = await Promise.all([
        this.orderItems.count({ where: { productId: product.id } }),
        this.reviews.count({ where: { productId: product.id } }),
      ]);

      if (orderItemCount > 0 || reviewCount > 0) {
        throw new ConflictException({
          message:
            'San pham da co lich su don hang hoac danh gia, chi co the an san pham',
          details: { orderItemCount, reviewCount },
        });
      }

      const movements = await require('../../models').InventoryMovement.count({ include: [{ association: 'variant', where: { productId }, attributes: [] }], where: { kind: { [Op.ne]: 'opening' } } });
      if (movements) throw new ConflictException('Sản phẩm có lịch sử kho, chỉ có thể ẩn');
      await product.destroy();
      await deleteByPattern('products:*');
      return { message: 'Da xoa vinh vien san pham' };
    } catch (err) {
      throw err;
    }
  }

  async listProducts(req: AppRequest, res: Response) {
    try {
      const cacheKey = productCacheKey('products:v3:list', req.query);
      const cached = await getJson(cacheKey);
      if (cached) return res.json({ ...cached, cached: true });

      const { page, limit, offset, where, order } = parseProductQuery(
        req.query,
      );
      const { rows, count } = await Product.findAndCountAll({
        where,
        include: [publicShopInclude],
        order,
        limit,
        offset,
      });

      const payload = {
        items: rows.map(normalizeProduct),
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
        cached: false,
      };

      await setJson(cacheKey, payload, 60);
      res.json(payload);
    } catch (err) {
      throw err;
    }
  }

  async searchProducts(req: AppRequest, res: Response) {
    try {
      const term = String(req.query.q || req.query.search || '').trim();
      if (!term) return this.listProducts(req, res);

      const cacheKey = productCacheKey('products:v3:search', {
        ...req.query,
        search: term,
      });
      const cached = await getJson(cacheKey);
      if (cached) return res.json({ ...cached, cached: true });

      const { page, limit, offset } = parseProductQuery(req.query);
      const replacements = {
        hasCategory: Boolean(req.query.category),
        categories: getCategoryAliases(req.query.category),
        searchCategories: getCategoryAliases(term),
        limit,
        ...readPriceRange(req.query),
        offset,
        term,
      };

      const searchVector = `
      to_tsvector(
        'simple',
        coalesce(p.name, '') || ' ' || coalesce(p.description, '') || ' ' || coalesce(p.category, '')
      )
    `;
      const searchQuery = `plainto_tsquery('simple', :term)`;
      const filters = `
      p."isActive" = true AND p."moderationHidden" = false
      AND (
        ${searchVector} @@ ${searchQuery}
        OR p.name ILIKE '%' || :term || '%'
        OR p.description ILIKE '%' || :term || '%'
        OR p.category ILIKE '%' || :term || '%'
        OR lower(btrim(p.category)) IN (:searchCategories)
      )
      AND (:hasCategory = false OR lower(btrim(p.category)) IN (:categories))
      AND (:minPrice IS NULL OR ${effectivePriceSql('p')} >= :minPrice)
      AND (:maxPrice IS NULL OR ${effectivePriceSql('p')} <= :maxPrice)
    `;
      const orderSql =
        {
          price_asc: `${effectivePriceSql('p')} ASC`,
          price_desc: `${effectivePriceSql('p')} DESC`,
          sold_desc: 'p.sold DESC',
          newest: 'p."createdAt" DESC',
        }[String(req.query.sort || '')] || 'rank DESC, p."createdAt" DESC';

      const rows = await sequelize.query(
        `
      SELECT
        p.*,
        ts_rank(${searchVector}, ${searchQuery}) AS rank,
        s.id AS "shop.id",
        s.name AS "shop.name",
        s.slug AS "shop.slug",
        s.logo AS "shop.logo",
        s.rating AS "shop.rating",
        s."reviewCount" AS "shop.reviewCount",
        s.location AS "shop.location",
        s.status AS "shop.status"
      FROM products p
      INNER JOIN shops s ON s.id = p."shopId" AND s.status = 'active'
      WHERE ${filters}
      ORDER BY ${orderSql}, p.id ASC
      LIMIT :limit OFFSET :offset
    `,
        { replacements, nest: true, type: QueryTypes.SELECT },
      );

      const countRows = await sequelize.query(
        `
      SELECT COUNT(*)::integer AS total
      FROM products p
      INNER JOIN shops s ON s.id = p."shopId" AND s.status = 'active'
      WHERE ${filters}
    `,
        { replacements, type: QueryTypes.SELECT },
      );

      const total = countRows[0]?.total || 0;
      const payload = {
        items: rows.map(normalizeProduct),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        cached: false,
      };

      await setJson(cacheKey, payload, 60);
      res.json(payload);
    } catch (err) {
      throw err;
    }
  }

  async getRecommendations(req: AppRequest, res: Response) {
    try {
      const limit = toPositiveInt(req.query.limit, 8, 24);
      const reference = req.query.productId
        ? await Product.findOne({
            where: { id: req.query.productId, isActive: true, moderationHidden: false },
            attributes: ['id', 'shopId', 'category', 'price', 'salePrice'],
            include: [{ ...publicShopInclude, attributes: [] }],
          })
        : null;
      const [buyerCategories, queryCategories] = await Promise.all([
        getBuyerCategoryPreferences(req.user?.id),
        Promise.resolve(parsePreferenceCategories(req.query)),
      ]);
      const preferredCategories = [
        ...new Set([...queryCategories, ...buyerCategories]),
      ].slice(0, 6);

      const where: Record<PropertyKey, any> = {
        isActive: true,
        moderationHidden: false,
        stock: { [Op.gt]: 0 },
      };
      if (reference) where.id = { [Op.ne]: reference.id };

      const candidates = await Product.findAll({
        where,
        include: [publicShopInclude],
        order: [
          ['sold', 'DESC'],
          ['createdAt', 'DESC'],
        ],
        limit: 80,
      });

      const items = candidates
        .map((product) => {
          const { reason, score } = scoreRecommendation({
            product,
            reference,
            preferredCategories,
          });
          return {
            ...normalizeProduct(product),
            recommendationReason: reason,
            recommendationScore: Number(score.toFixed(2)),
          };
        })
        .sort(
          (left, right) => right.recommendationScore - left.recommendationScore,
        )
        .slice(0, limit)
        .map(({ recommendationScore: _score, ...product }) => product);

      res.json({
        items,
        strategy: reference
          ? 'contextual'
          : preferredCategories.length
            ? 'personalized'
            : 'popular',
      });
    } catch (err) {
      throw err;
    }
  }

  async getProductById(req: AppRequest, res: Response) {
    try {
      const product = await Product.findOne({
        where: { id: req.params.id, isActive: true, moderationHidden: false },
        include: [
          { association: 'variants', where: { isActive: true }, required: false },
          publicShopInclude,
          publicCultureInclude,
          {
            model: Review,
            as: 'reviews',
            where: { moderationHidden: false },
            required: false,
            separate: true,
            limit: 3,
            order: [['createdAt', 'DESC'], ['id', 'DESC']],
            attributes: ['id', 'rating', 'comment', 'images', 'createdAt'],
            include: [
              { model: User, as: 'user', attributes: ['id', 'name', 'avatar'] },
            ],
          },
        ],
      });

      if (!product)
        return res.status(404).json({ message: 'Khong tim thay san pham' });
      const summary = await Review.findOne({ where: { productId: product.id, moderationHidden: false }, attributes: [[sequelize.fn('COUNT', sequelize.col('id')), 'total'], [sequelize.fn('AVG', sequelize.col('rating')), 'average']], raw: true });
      res.json({ ...normalizeProduct(product), reviewSummary: { total: Number(summary.total), averageRating: Number(Number(summary.average || 0).toFixed(2)) } });
    } catch (err) {
      throw err;
    }
  }
}

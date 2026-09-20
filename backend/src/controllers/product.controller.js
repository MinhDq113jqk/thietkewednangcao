const { Op, QueryTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { deleteByPattern, getJson, setJson } = require('../config/redis');
const {
  CraftVillage,
  Order,
  OrderItem,
  Product,
  Region,
  Review,
  Shop,
  User,
} = require('../models');
const {
  parsePreferenceCategories,
  scoreRecommendation,
} = require('../services/recommendation.service');
const { validateProductInput } = require('../services/productValidation.service');

const toPositiveInt = (value, fallback, max = 100) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
};

const parseProductQuery = (query) => {
  const page = toPositiveInt(query.page, 1);
  const limit = toPositiveInt(query.limit, 12, 50);
  const where = { isActive: true };

  if (query.category) where.category = query.category;
  if (query.search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${query.search}%` } },
      { description: { [Op.iLike]: `%${query.search}%` } },
      { category: { [Op.iLike]: `%${query.search}%` } },
    ];
  }

  if (query.minPrice || query.maxPrice) {
    where.price = {};
    if (query.minPrice) where.price[Op.gte] = Number(query.minPrice);
    if (query.maxPrice) where.price[Op.lte] = Number(query.maxPrice);
  }

  const orderMap = {
    price_asc: [['price', 'ASC']],
    price_desc: [['price', 'DESC']],
    sold_desc: [['sold', 'DESC']],
    newest: [['createdAt', 'DESC']],
  };

  return {
    page,
    limit,
    offset: (page - 1) * limit,
    where,
    order: orderMap[query.sort] || orderMap.newest,
  };
};

const normalizeProductQuery = (query) => {
  const parsed = parseProductQuery(query);
  return {
    category: query.category || '',
    maxPrice: query.maxPrice || '',
    minPrice: query.minPrice || '',
    page: parsed.page,
    limit: parsed.limit,
    search: query.search || query.q || '',
    sort: query.sort || 'newest',
  };
};

const productCacheKey = (prefix, query) => {
  const normalized = normalizeProductQuery(query);
  return `${prefix}:${JSON.stringify(normalized)}`;
};

const publicShopInclude = {
  model: Shop,
  as: 'shop',
  attributes: ['id', 'name', 'slug', 'logo', 'rating', 'reviewCount', 'location', 'status'],
  where: { status: 'active' },
  required: true,
};

const publicCultureInclude = {
  model: CraftVillage,
  as: 'craftVillage',
  attributes: ['id', 'name', 'slug', 'summary', 'crafts'],
  required: false,
  include: [{
    model: Region,
    as: 'region',
    attributes: ['id', 'name', 'slug', 'shortDescription', 'theme'],
    required: true,
  }],
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
    include: [{
      model: Product,
      as: 'product',
      attributes: ['category'],
      required: true,
    }],
  });

  const categoryWeights = items.reduce((weights, item) => {
    const category = item.product?.category;
    if (!category) return weights;
    weights.set(category, (weights.get(category) || 0) + Number(item.quantity || 1));
    return weights;
  }, new Map());

  return [...categoryWeights.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([category]) => category)
    .slice(0, 4);
};

exports.listProducts = async (req, res, next) => {
  try {
    const cacheKey = productCacheKey('products:list', req.query);
    const cached = await getJson(cacheKey);
    if (cached) return res.json({ ...cached, cached: true });

    const { page, limit, offset, where, order } = parseProductQuery(req.query);
    const { rows, count } = await Product.findAndCountAll({
      where,
      include: [publicShopInclude],
      order,
      limit,
      offset,
    });

    const payload = {
      items: rows,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      cached: false,
    };

    await setJson(cacheKey, payload, 60);
    res.json(payload);
  } catch (err) {
    next(err);
  }
};

exports.searchProducts = async (req, res, next) => {
  try {
    const term = String(req.query.q || req.query.search || '').trim();
    if (!term) return exports.listProducts(req, res, next);

    const cacheKey = productCacheKey('products:search', { ...req.query, search: term });
    const cached = await getJson(cacheKey);
    if (cached) return res.json({ ...cached, cached: true });

    const { page, limit, offset } = parseProductQuery(req.query);
    const replacements = {
      category: req.query.category || null,
      limit,
      maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : null,
      minPrice: req.query.minPrice ? Number(req.query.minPrice) : null,
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
      p."isActive" = true
      AND (
        ${searchVector} @@ ${searchQuery}
        OR p.name ILIKE '%' || :term || '%'
        OR p.description ILIKE '%' || :term || '%'
        OR p.category ILIKE '%' || :term || '%'
      )
      AND (:category IS NULL OR p.category = :category)
      AND (:minPrice IS NULL OR p.price >= :minPrice)
      AND (:maxPrice IS NULL OR p.price <= :maxPrice)
    `;
    const orderSql = {
      price_asc: 'p.price ASC',
      price_desc: 'p.price DESC',
      sold_desc: 'p.sold DESC',
      newest: 'p."createdAt" DESC',
    }[req.query.sort] || 'rank DESC, p."createdAt" DESC';

    const rows = await sequelize.query(`
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
      ORDER BY ${orderSql}
      LIMIT :limit OFFSET :offset
    `, { replacements, nest: true, type: QueryTypes.SELECT });

    const countRows = await sequelize.query(`
      SELECT COUNT(*)::integer AS total
      FROM products p
      INNER JOIN shops s ON s.id = p."shopId" AND s.status = 'active'
      WHERE ${filters}
    `, { replacements, type: QueryTypes.SELECT });

    const total = countRows[0]?.total || 0;
    const payload = {
      items: rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      cached: false,
    };

    await setJson(cacheKey, payload, 60);
    res.json(payload);
  } catch (err) {
    next(err);
  }
};

exports.getRecommendations = async (req, res, next) => {
  try {
    const limit = toPositiveInt(req.query.limit, 8, 24);
    const reference = req.query.productId
      ? await Product.findOne({
          where: { id: req.query.productId, isActive: true },
          attributes: ['id', 'shopId', 'category', 'price', 'salePrice'],
          include: [{ ...publicShopInclude, attributes: [] }],
        })
      : null;
    const [buyerCategories, queryCategories] = await Promise.all([
      getBuyerCategoryPreferences(req.user?.id),
      Promise.resolve(parsePreferenceCategories(req.query)),
    ]);
    const preferredCategories = [...new Set([...queryCategories, ...buyerCategories])].slice(0, 6);

    const where = {
      isActive: true,
      stock: { [Op.gt]: 0 },
    };
    if (reference) where.id = { [Op.ne]: reference.id };

    const candidates = await Product.findAll({
      where,
      include: [publicShopInclude],
      order: [['sold', 'DESC'], ['createdAt', 'DESC']],
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
          ...product.toJSON(),
          recommendationReason: reason,
          recommendationScore: Number(score.toFixed(2)),
        };
      })
      .sort((left, right) => right.recommendationScore - left.recommendationScore)
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
    next(err);
  }
};

exports.getProductById = async (req, res, next) => {
  try {
    const product = await Product.findOne({
      where: { id: req.params.id, isActive: true },
      include: [
        publicShopInclude,
        publicCultureInclude,
        {
          model: Review,
          as: 'reviews',
          attributes: ['id', 'rating', 'comment', 'images', 'createdAt'],
          include: [{ model: User, as: 'user', attributes: ['id', 'name', 'avatar'] }],
        },
      ],
    });

    if (!product) return res.status(404).json({ message: 'Khong tim thay san pham' });
    res.json(product);
  } catch (err) {
    next(err);
  }
};

exports.listSellerProducts = async (req, res, next) => {
  try {
    const shop = await Shop.findOne({ where: { ownerId: req.user.id } });
    if (!shop) return res.status(404).json({ message: 'Ban chua co gian hang' });

    const products = await Product.findAll({
      where: { shopId: shop.id },
      order: [['createdAt', 'DESC']],
    });

    const productIds = products.map((product) => product.id);
    const [orderCounts, reviewCounts] = await Promise.all([
      productIds.length
        ? OrderItem.findAll({
            attributes: ['productId', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            where: { productId: { [Op.in]: productIds } },
            group: ['productId'],
            raw: true,
          })
        : [],
      productIds.length
        ? Review.findAll({
            attributes: ['productId', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            where: { productId: { [Op.in]: productIds } },
            group: ['productId'],
            raw: true,
          })
        : [],
    ]);

    const orderCountByProduct = new Map(orderCounts.map((item) => [item.productId, Number(item.count) || 0]));
    const reviewCountByProduct = new Map(reviewCounts.map((item) => [item.productId, Number(item.count) || 0]));

    res.json(products.map((product) => {
      const orderItemCount = orderCountByProduct.get(product.id) || 0;
      const reviewCount = reviewCountByProduct.get(product.id) || 0;

      return {
        ...product.toJSON(),
        orderItemCount,
        reviewCount,
        canDeletePermanently: orderItemCount === 0 && reviewCount === 0,
      };
    }));
  } catch (err) {
    next(err);
  }
};

exports.createSellerProduct = async (req, res, next) => {
  try {
    const shop = await Shop.findOne({ where: { ownerId: req.user.id } });
    if (!shop) return res.status(404).json({ message: 'Ban chua co gian hang' });
    if (shop.status !== 'active') {
      return res.status(403).json({ message: 'Gian hang can duoc duyet truoc khi dang san pham' });
    }

    const validation = validateProductInput(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        message: 'Du lieu san pham khong hop le',
        details: validation.errors,
      });
    }

    const product = await Product.create({
      shopId: shop.id,
      ...validation.value,
      salePrice: validation.value.salePrice ?? null,
      images: validation.value.images || [],
      isFlashSale: validation.value.isFlashSale || false,
      isActive: true,
    });

    await deleteByPattern('products:*');
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
};

exports.updateSellerProduct = async (req, res, next) => {
  try {
    const shop = await Shop.findOne({ where: { ownerId: req.user.id } });
    if (!shop) return res.status(404).json({ message: 'Ban chua co gian hang' });

    const product = await Product.findOne({ where: { id: req.params.id, shopId: shop.id } });
    if (!product) return res.status(404).json({ message: 'Khong tim thay san pham' });

    const validation = validateProductInput(req.body, {
      current: product.toJSON(),
      partial: true,
    });
    if (!validation.valid) {
      return res.status(400).json({
        message: 'Du lieu san pham khong hop le',
        details: validation.errors,
      });
    }

    await product.update(validation.value);
    await deleteByPattern('products:*');
    res.json(product);
  } catch (err) {
    next(err);
  }
};

exports.deleteSellerProduct = async (req, res, next) => {
  try {
    const shop = await Shop.findOne({ where: { ownerId: req.user.id } });
    if (!shop) return res.status(404).json({ message: 'Ban chua co gian hang' });

    const product = await Product.findOne({ where: { id: req.params.id, shopId: shop.id } });
    if (!product) return res.status(404).json({ message: 'Khong tim thay san pham' });
    await product.update({ isActive: false });
    await deleteByPattern('products:*');
    res.json({ message: 'Da an san pham' });
  } catch (err) {
    next(err);
  }
};

exports.restoreSellerProduct = async (req, res, next) => {
  try {
    const shop = await Shop.findOne({ where: { ownerId: req.user.id } });
    if (!shop) return res.status(404).json({ message: 'Ban chua co gian hang' });

    const product = await Product.findOne({ where: { id: req.params.id, shopId: shop.id } });
    if (!product) return res.status(404).json({ message: 'Khong tim thay san pham' });
    if (shop.status !== 'active') {
      return res.status(403).json({ message: 'Gian hang dang bi tam ngung hoat dong' });
    }

    await product.update({ isActive: true });
    await deleteByPattern('products:*');
    res.json({ message: 'Da khoi phuc san pham', product });
  } catch (err) {
    next(err);
  }
};

exports.permanentDeleteSellerProduct = async (req, res, next) => {
  try {
    const shop = await Shop.findOne({ where: { ownerId: req.user.id } });
    if (!shop) return res.status(404).json({ message: 'Ban chua co gian hang' });

    const product = await Product.findOne({ where: { id: req.params.id, shopId: shop.id } });
    if (!product) return res.status(404).json({ message: 'Khong tim thay san pham' });

    const [orderItemCount, reviewCount] = await Promise.all([
      OrderItem.count({ where: { productId: product.id } }),
      Review.count({ where: { productId: product.id } }),
    ]);

    if (orderItemCount > 0 || reviewCount > 0) {
      return res.status(409).json({
        message: 'San pham da co lich su don hang hoac danh gia, chi co the an san pham',
        details: { orderItemCount, reviewCount },
      });
    }

    await product.destroy();
    await deleteByPattern('products:*');
    res.json({ message: 'Da xoa vinh vien san pham' });
  } catch (err) {
    next(err);
  }
};

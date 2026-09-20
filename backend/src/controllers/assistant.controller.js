const { Op } = require('sequelize');
const { Product, Shop } = require('../models');
const {
  buildProductReply,
  detectAssistantIntent,
  extractProductQuery,
  getStaticResponse,
  normalizeText,
} = require('../services/assistant.service');

const publicShopInclude = {
  model: Shop,
  as: 'shop',
  attributes: ['id', 'name', 'slug'],
  required: true,
  where: { status: 'active' },
};

const toPublicProduct = (product) => {
  const value = product.toJSON ? product.toJSON() : product;
  return {
    id: value.id,
    name: value.name,
    price: value.price,
    salePrice: value.salePrice,
    stock: value.stock,
    image: Array.isArray(value.images) ? value.images[0] || null : null,
    category: value.category,
    shop: value.shop
      ? { name: value.shop.name, slug: value.shop.slug }
      : null,
  };
};

const findProducts = async (query) => {
  const directMatches = await Product.findAll({
    where: {
      isActive: true,
      stock: { [Op.gt]: 0 },
      [Op.or]: [
        { name: { [Op.iLike]: `%${query}%` } },
        { description: { [Op.iLike]: `%${query}%` } },
        { category: { [Op.iLike]: `%${query}%` } },
      ],
    },
    include: [publicShopInclude],
    order: [['sold', 'DESC'], ['createdAt', 'DESC']],
    limit: 4,
  });

  if (directMatches.length) return directMatches.map(toPublicProduct);

  const normalizedQuery = normalizeText(query);
  const queryTokens = normalizedQuery.split(' ').filter((token) => token.length > 1);
  const candidates = await Product.findAll({
    where: {
      isActive: true,
      stock: { [Op.gt]: 0 },
    },
    include: [publicShopInclude],
    order: [['sold', 'DESC'], ['createdAt', 'DESC']],
    limit: 100,
  });

  return candidates
    .filter((product) => {
      const searchable = normalizeText([
        product.name,
        product.category,
        product.description,
      ].filter(Boolean).join(' '));
      return searchable.includes(normalizedQuery)
        || queryTokens.every((token) => searchable.includes(token));
    })
    .slice(0, 4)
    .map(toPublicProduct);
};

exports.chat = async (req, res, next) => {
  try {
    const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';

    if (!message) {
      return res.status(400).json({ message: 'Vui lòng nhập câu hỏi' });
    }
    if (message.length > 300) {
      return res.status(400).json({ message: 'Câu hỏi tối đa 300 ký tự' });
    }

    const intent = detectAssistantIntent(message);
    if (intent !== 'product') {
      return res.json({ intent, products: [], ...getStaticResponse(intent) });
    }

    const query = extractProductQuery(message);
    if (!query) {
      return res.json({
        intent,
        products: [],
        reply: 'Bạn muốn hỏi giá sản phẩm nào? Hãy nhập tên như “tượng gốm Bát Tràng” hoặc “tranh thêu hoa sen”.',
        suggestions: ['Tượng gốm Bát Tràng', 'Tranh thêu hoa sen', 'Nón lá'],
      });
    }

    const products = await findProducts(query);
    const response = buildProductReply(products, query);

    return res.json({
      intent,
      products,
      actions: products.length
        ? [{ label: 'Xem tất cả kết quả', href: `/products?search=${encodeURIComponent(query)}` }]
        : [{ label: 'Khám phá sản phẩm', href: '/products' }],
      ...response,
    });
  } catch (error) {
    return next(error);
  }
};

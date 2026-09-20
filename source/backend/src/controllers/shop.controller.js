const { Product, Shop } = require('../models');
const { sendShopRegistrationEmail } = require('../services/email.service');

const slugify = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 150);

const uniqueSlug = async (name) => {
  const base = slugify(name) || `shop-${Date.now()}`;
  let slug = base;
  let suffix = 1;

  while (await Shop.findOne({ where: { slug } })) {
    slug = `${base}-${suffix++}`;
  }

  return slug;
};

exports.registerShop = async (req, res, next) => {
  try {
    const existing = await Shop.findOne({ where: { ownerId: req.user.id } });
    if (existing) return res.status(409).json({ message: 'Tai khoan da co gian hang' });

    const { name, description, logo, banner, location } = req.body;
    if (!name) return res.status(400).json({ message: 'Ten gian hang la bat buoc' });

    const shop = await Shop.create({
      ownerId: req.user.id,
      name,
      slug: await uniqueSlug(name),
      description,
      logo,
      banner,
      location,
      status: 'pending',
    });

    if (req.user.role === 'buyer') await req.user.update({ role: 'seller' });

    sendShopRegistrationEmail(req.user, shop).catch((err) => {
      console.error('Shop registration email failed:', err.message);
    });

    res.status(201).json(shop);
  } catch (err) {
    next(err);
  }
};

exports.getShopBySlug = async (req, res, next) => {
  try {
    const shop = await Shop.findOne({ where: { slug: req.params.slug } });
    if (!shop || shop.status !== 'active') {
      return res.status(404).json({ message: 'Khong tim thay gian hang' });
    }

    res.json(shop);
  } catch (err) {
    next(err);
  }
};

exports.getShopProducts = async (req, res, next) => {
  try {
    const shop = await Shop.findOne({ where: { slug: req.params.slug } });
    if (!shop || shop.status !== 'active') {
      return res.status(404).json({ message: 'Khong tim thay gian hang' });
    }

    const products = await Product.findAll({
      where: { shopId: shop.id, isActive: true },
      order: [['createdAt', 'DESC']],
    });

    res.json(products);
  } catch (err) {
    next(err);
  }
};

exports.getMyShop = async (req, res, next) => {
  try {
    const shop = await Shop.findOne({ where: { ownerId: req.user.id } });
    if (!shop) return res.status(404).json({ message: 'Ban chua co gian hang' });

    res.json(shop);
  } catch (err) {
    next(err);
  }
};

exports.updateMyShop = async (req, res, next) => {
  try {
    const shop = await Shop.findOne({ where: { ownerId: req.user.id } });
    if (!shop) return res.status(404).json({ message: 'Ban chua co gian hang' });

    const allowed = ['name', 'description', 'logo', 'banner', 'location'];
    const payload = {};
    allowed.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) payload[key] = req.body[key];
    });

    if (payload.name && payload.name !== shop.name) {
      payload.slug = await uniqueSlug(payload.name);
    }

    await shop.update(payload);
    res.json(shop);
  } catch (err) {
    next(err);
  }
};

const { Op, fn, col } = require('sequelize');
const { sequelize } = require('../config/db');
const {
  ChatMessage,
  Conversation,
  Product,
  Shop,
  User,
} = require('../models');
const {
  isConversationParticipant,
  validateChatBody,
} = require('../services/chat.service');

const conversationIncludes = [
  {
    model: User,
    as: 'buyer',
    attributes: ['id', 'name', 'avatar'],
  },
  {
    model: Shop,
    as: 'shop',
    attributes: ['id', 'ownerId', 'name', 'slug', 'logo', 'status'],
    required: true,
  },
  {
    model: Product,
    as: 'product',
    attributes: ['id', 'name', 'images', 'price', 'salePrice', 'isActive'],
    required: false,
  },
];

const serializeConversation = (conversation, userId, unreadCount = 0) => {
  const value = conversation.toJSON ? conversation.toJSON() : conversation;
  const perspective = String(value.buyerId) === String(userId) ? 'buyer' : 'seller';

  return {
    id: value.id,
    buyerId: value.buyerId,
    shopId: value.shopId,
    productId: value.productId,
    lastMessage: value.lastMessage,
    lastMessageAt: value.lastMessageAt,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    unreadCount: Number(unreadCount) || 0,
    perspective,
    buyer: value.buyer
      ? { id: value.buyer.id, name: value.buyer.name, avatar: value.buyer.avatar }
      : null,
    shop: value.shop
      ? {
          id: value.shop.id,
          name: value.shop.name,
          slug: value.shop.slug,
          logo: value.shop.logo,
          status: value.shop.status,
        }
      : null,
    product: value.product
      ? {
          id: value.product.id,
          name: value.product.name,
          image: Array.isArray(value.product.images) ? value.product.images[0] || null : null,
          price: value.product.price,
          salePrice: value.product.salePrice,
          isActive: value.product.isActive,
        }
      : null,
  };
};

const serializeMessage = (message, userId) => {
  const value = message.toJSON ? message.toJSON() : message;
  return {
    id: value.id,
    conversationId: value.conversationId,
    senderId: value.senderId,
    body: value.body,
    readAt: value.readAt,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    isMine: String(value.senderId) === String(userId),
    sender: value.sender
      ? { id: value.sender.id, name: value.sender.name, avatar: value.sender.avatar }
      : null,
  };
};

const loadConversationForUser = async (conversationId, userId, transaction) => {
  const conversation = await Conversation.findByPk(conversationId, {
    include: conversationIncludes,
    transaction,
  });

  if (!conversation || !isConversationParticipant({
    buyerId: conversation.buyerId,
    shopOwnerId: conversation.shop?.ownerId,
    userId,
  })) {
    const error = new Error('Không tìm thấy cuộc trò chuyện');
    error.status = 404;
    throw error;
  }

  return conversation;
};

exports.startConversation = async (req, res, next) => {
  try {
    const { shopId, productId } = req.body;
    if (!shopId) return res.status(400).json({ message: 'Thiếu thông tin gian hàng' });

    const shop = await Shop.findOne({ where: { id: shopId, status: 'active' } });
    if (!shop) return res.status(404).json({ message: 'Không tìm thấy gian hàng' });
    if (String(shop.ownerId) === String(req.user.id)) {
      return res.status(400).json({ message: 'Bạn không thể tự nhắn tin cho gian hàng của mình' });
    }

    if (productId) {
      const product = await Product.findOne({
        where: { id: productId, shopId: shop.id, isActive: true },
        attributes: ['id'],
      });
      if (!product) {
        return res.status(400).json({ message: 'Sản phẩm không thuộc gian hàng này' });
      }
    }

    const [conversation, created] = await Conversation.findOrCreate({
      where: { buyerId: req.user.id, shopId: shop.id },
      defaults: { productId: productId || null },
    });

    if (!created && productId && String(conversation.productId || '') !== String(productId)) {
      await conversation.update({ productId });
    }

    const result = await loadConversationForUser(conversation.id, req.user.id);
    return res.status(created ? 201 : 200).json(serializeConversation(result, req.user.id));
  } catch (error) {
    return next(error);
  }
};

exports.listConversations = async (req, res, next) => {
  try {
    const conversations = await Conversation.findAll({
      where: {
        [Op.or]: [
          { buyerId: req.user.id },
          { '$shop.ownerId$': req.user.id },
        ],
      },
      include: conversationIncludes,
      order: [
        [sequelize.literal('"lastMessageAt" DESC NULLS LAST')],
        ['updatedAt', 'DESC'],
      ],
      subQuery: false,
    });

    const conversationIds = conversations.map((conversation) => conversation.id);
    const unreadRows = conversationIds.length
      ? await ChatMessage.findAll({
          attributes: [
            'conversationId',
            [fn('COUNT', col('id')), 'count'],
          ],
          where: {
            conversationId: { [Op.in]: conversationIds },
            senderId: { [Op.ne]: req.user.id },
            readAt: null,
          },
          group: ['conversationId'],
          raw: true,
        })
      : [];
    const unreadByConversation = new Map(
      unreadRows.map((row) => [String(row.conversationId), Number(row.count) || 0])
    );

    return res.json(conversations.map((conversation) => (
      serializeConversation(
        conversation,
        req.user.id,
        unreadByConversation.get(String(conversation.id)) || 0
      )
    )));
  } catch (error) {
    return next(error);
  }
};

exports.listMessages = async (req, res, next) => {
  try {
    await loadConversationForUser(req.params.id, req.user.id);

    const messages = await ChatMessage.findAll({
      where: { conversationId: req.params.id },
      include: [{
        model: User,
        as: 'sender',
        attributes: ['id', 'name', 'avatar'],
      }],
      order: [['createdAt', 'DESC']],
      limit: 100,
    });

    return res.json(messages.reverse().map((message) => serializeMessage(message, req.user.id)));
  } catch (error) {
    return next(error);
  }
};

exports.sendMessage = async (req, res, next) => {
  const { body, error } = validateChatBody(req.body.body);
  if (error) return res.status(400).json({ message: error });

  try {
    const message = await sequelize.transaction(async (transaction) => {
      const conversation = await loadConversationForUser(
        req.params.id,
        req.user.id,
        transaction
      );
      const created = await ChatMessage.create({
        conversationId: conversation.id,
        senderId: req.user.id,
        body,
      }, { transaction });

      await conversation.update({
        lastMessage: body.slice(0, 500),
        lastMessageAt: created.createdAt,
      }, { transaction });

      return created;
    });

    const result = await ChatMessage.findByPk(message.id, {
      include: [{
        model: User,
        as: 'sender',
        attributes: ['id', 'name', 'avatar'],
      }],
    });

    return res.status(201).json(serializeMessage(result, req.user.id));
  } catch (caughtError) {
    return next(caughtError);
  }
};

exports.markConversationRead = async (req, res, next) => {
  try {
    await loadConversationForUser(req.params.id, req.user.id);
    const [updated] = await ChatMessage.update({
      readAt: new Date(),
    }, {
      where: {
        conversationId: req.params.id,
        senderId: { [Op.ne]: req.user.id },
        readAt: null,
      },
    });

    return res.json({ updated });
  } catch (error) {
    return next(error);
  }
};

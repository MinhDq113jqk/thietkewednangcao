const User = require('./User');
const Shop = require('./Shop');
const Product = require('./Product');
const Order = require('./Order').Order;
const OrderItem = require('./OrderItem');
const Address = require('./Address');
const Review = require('./Review');
const CheckoutAttempt = require('./CheckoutAttempt');
const Conversation = require('./Conversation');
const ChatMessage = require('./ChatMessage');
const PaymentTransaction = require('./PaymentTransaction');
const Region = require('./Region');
const CraftVillage = require('./CraftVillage');

const restrictHistory = {
  constraints: true,
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
};

const cascadeDependent = {
  constraints: true,
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
};

User.hasMany(Shop, { foreignKey: 'ownerId', as: 'shops', ...restrictHistory });
Shop.belongsTo(User, { foreignKey: 'ownerId', as: 'owner', ...restrictHistory });

Shop.hasMany(Product, { foreignKey: 'shopId', as: 'products', ...restrictHistory });
Product.belongsTo(Shop, { foreignKey: 'shopId', as: 'shop', ...restrictHistory });

Region.hasMany(CraftVillage, { foreignKey: 'regionId', as: 'villages', ...restrictHistory });
CraftVillage.belongsTo(Region, { foreignKey: 'regionId', as: 'region', ...restrictHistory });
CraftVillage.hasMany(Product, {
  foreignKey: 'craftVillageId',
  as: 'products',
  constraints: true,
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE',
});
Product.belongsTo(CraftVillage, {
  foreignKey: 'craftVillageId',
  as: 'craftVillage',
  constraints: true,
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE',
});

User.hasMany(Address, { foreignKey: 'userId', as: 'addresses', ...cascadeDependent });
Address.belongsTo(User, { foreignKey: 'userId', as: 'user', ...cascadeDependent });

User.hasMany(Order, { foreignKey: 'buyerId', as: 'orders', ...restrictHistory });
Order.belongsTo(User, { foreignKey: 'buyerId', as: 'buyer', ...restrictHistory });
User.hasMany(CheckoutAttempt, {
  foreignKey: 'buyerId',
  as: 'checkoutAttempts',
  ...cascadeDependent,
});
CheckoutAttempt.belongsTo(User, {
  foreignKey: 'buyerId',
  as: 'buyer',
  ...cascadeDependent,
});

Shop.hasMany(Order, { foreignKey: 'shopId', as: 'orders', ...restrictHistory });
Order.belongsTo(Shop, { foreignKey: 'shopId', as: 'shop', ...restrictHistory });

Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items', ...cascadeDependent });
OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order', ...cascadeDependent });

Product.hasMany(OrderItem, { foreignKey: 'productId', as: 'orderItems', ...restrictHistory });
OrderItem.belongsTo(Product, { foreignKey: 'productId', as: 'product', ...restrictHistory });

Product.hasMany(Review, { foreignKey: 'productId', as: 'reviews', ...restrictHistory });
Review.belongsTo(Product, { foreignKey: 'productId', as: 'product', ...restrictHistory });
User.hasMany(Review, { foreignKey: 'userId', as: 'reviews', ...restrictHistory });
Review.belongsTo(User, { foreignKey: 'userId', as: 'user', ...restrictHistory });
Order.hasMany(Review, { foreignKey: 'orderId', as: 'reviews', ...restrictHistory });
Review.belongsTo(Order, { foreignKey: 'orderId', as: 'order', ...restrictHistory });

Order.hasOne(PaymentTransaction, {
  foreignKey: 'orderId',
  as: 'payment',
  ...cascadeDependent,
});
PaymentTransaction.belongsTo(Order, {
  foreignKey: 'orderId',
  as: 'order',
  ...cascadeDependent,
});
User.hasMany(PaymentTransaction, {
  foreignKey: 'confirmedBy',
  as: 'confirmedPayments',
  constraints: true,
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE',
});
PaymentTransaction.belongsTo(User, {
  foreignKey: 'confirmedBy',
  as: 'confirmedByUser',
  constraints: true,
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE',
});

User.hasMany(Conversation, {
  foreignKey: 'buyerId',
  as: 'buyerConversations',
  ...restrictHistory,
});
Conversation.belongsTo(User, {
  foreignKey: 'buyerId',
  as: 'buyer',
  ...restrictHistory,
});
Shop.hasMany(Conversation, {
  foreignKey: 'shopId',
  as: 'conversations',
  ...restrictHistory,
});
Conversation.belongsTo(Shop, {
  foreignKey: 'shopId',
  as: 'shop',
  ...restrictHistory,
});
Product.hasMany(Conversation, {
  foreignKey: 'productId',
  as: 'conversations',
  constraints: true,
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE',
});
Conversation.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product',
  constraints: true,
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE',
});
Conversation.hasMany(ChatMessage, {
  foreignKey: 'conversationId',
  as: 'messages',
  ...cascadeDependent,
});
ChatMessage.belongsTo(Conversation, {
  foreignKey: 'conversationId',
  as: 'conversation',
  ...cascadeDependent,
});
User.hasMany(ChatMessage, {
  foreignKey: 'senderId',
  as: 'sentMessages',
  ...restrictHistory,
});
ChatMessage.belongsTo(User, {
  foreignKey: 'senderId',
  as: 'sender',
  ...restrictHistory,
});

module.exports = {
  User,
  Shop,
  Product,
  Order,
  OrderItem,
  Address,
  Review,
  CheckoutAttempt,
  Conversation,
  ChatMessage,
  PaymentTransaction,
  Region,
  CraftVillage,
};

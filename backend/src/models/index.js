const User = require('./User');
const Shop = require('./Shop');
const Product = require('../modules/products/product.entity');
const ProductStockUpdate = require('./ProductStockUpdate');
const { ProductVariant, InventoryMovement } = require('./Inventory');
const Order = require('./Order').Order;
const OrderItem = require('./OrderItem');
const Address = require('./Address');
const Review = require('./Review');
const CheckoutAttempt = require('./CheckoutAttempt');
const Conversation = require('./Conversation');
const ChatMessage = require('./ChatMessage');
const PaymentTransaction = require('./PaymentTransaction');
const { BankReceipt, PaymentAllocation } = require('./BankReceipt');
const { ReturnCase, ReturnLine, Refund, CodEntry } = require('./AfterSales');
const { SettlementPolicy, SellerLedger, SettlementPeriod, SettlementItem, SellerPayout } = require('./Settlement');
const Region = require('./Region');
const CraftVillage = require('./CraftVillage');
const operations = require('./Operations');
const { AuthSession, AuthActionToken, Notification, SupportTicket, SupportMessage, AuditEvent, ModerationAction } = operations;

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
Product.hasMany(ProductVariant, { foreignKey: 'productId', as: 'variants', ...cascadeDependent });
ProductVariant.belongsTo(Product, { foreignKey: 'productId', as: 'product', ...cascadeDependent });
ProductVariant.belongsTo(Shop, { foreignKey: 'shopId', as: 'shop', ...restrictHistory });
OrderItem.belongsTo(ProductVariant, { foreignKey: 'variantId', as: 'variant', ...restrictHistory });
InventoryMovement.belongsTo(ProductVariant, { foreignKey: 'variantId', as: 'variant', ...cascadeDependent });
InventoryMovement.belongsTo(Shop, { foreignKey: 'shopId', as: 'shop', ...restrictHistory });
InventoryMovement.belongsTo(Order, { foreignKey: 'orderId', as: 'order', ...restrictHistory });
InventoryMovement.belongsTo(User, { foreignKey: 'actorId', as: 'actor', ...restrictHistory });
ProductStockUpdate.belongsTo(Product, { foreignKey: 'productId', as: 'product', ...cascadeDependent });
ProductStockUpdate.belongsTo(User, { foreignKey: 'recordedBy', as: 'recorder', ...restrictHistory });

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

BankReceipt.hasOne(PaymentAllocation, { foreignKey: 'receiptId', as: 'allocation', ...restrictHistory });
PaymentAllocation.belongsTo(BankReceipt, { foreignKey: 'receiptId', as: 'receipt', ...restrictHistory });
Order.hasMany(BankReceipt, { foreignKey: 'orderId', as: 'receipts', ...restrictHistory });
BankReceipt.belongsTo(Order, { foreignKey: 'orderId', as: 'order', ...restrictHistory });
Order.hasMany(PaymentAllocation, { foreignKey: 'orderId', as: 'allocations', ...restrictHistory });
PaymentAllocation.belongsTo(Order, { foreignKey: 'orderId', as: 'order', ...restrictHistory });
BankReceipt.belongsTo(User, { foreignKey: 'recordedBy', as: 'recorder', ...restrictHistory });
PaymentAllocation.belongsTo(User, { foreignKey: 'allocatedBy', as: 'allocator', ...restrictHistory });

ReturnCase.belongsTo(Order, { foreignKey: 'orderId', as: 'order', ...restrictHistory });
ReturnCase.belongsTo(User, { foreignKey: 'buyerId', as: 'buyer', ...restrictHistory });
ReturnCase.hasMany(ReturnLine, { foreignKey: 'caseId', as: 'lines', ...restrictHistory });
ReturnLine.belongsTo(ReturnCase, { foreignKey: 'caseId', as: 'case', ...restrictHistory });
ReturnLine.belongsTo(OrderItem, { foreignKey: 'orderItemId', as: 'item', ...restrictHistory });
Refund.belongsTo(Order, { foreignKey: 'orderId', as: 'order', ...restrictHistory });
Refund.belongsTo(BankReceipt, { foreignKey: 'receiptId', as: 'receipt', ...restrictHistory });
Refund.belongsTo(ReturnCase, { foreignKey: 'caseId', as: 'case', ...restrictHistory });
Refund.belongsTo(User, { foreignKey: 'recordedBy', as: 'recorder', ...restrictHistory });
CodEntry.belongsTo(Order, { foreignKey: 'orderId', as: 'order', ...restrictHistory });
CodEntry.belongsTo(User, { foreignKey: 'recordedBy', as: 'recorder', ...restrictHistory });

SettlementPolicy.belongsTo(Shop, { foreignKey: 'shopId', as: 'shop', ...restrictHistory });
SettlementPolicy.belongsTo(User, { foreignKey: 'recordedBy', as: 'recorder', ...restrictHistory });
SellerLedger.belongsTo(Shop, { foreignKey: 'shopId', as: 'shop', ...restrictHistory });
SellerLedger.belongsTo(Order, { foreignKey: 'orderId', as: 'order', ...restrictHistory });
SellerLedger.belongsTo(SettlementPolicy, { foreignKey: 'policyId', as: 'policy', ...restrictHistory });
SellerLedger.belongsTo(Refund, { foreignKey: 'refundId', as: 'refund', ...restrictHistory });
SellerLedger.belongsTo(User, { foreignKey: 'recordedBy', as: 'recorder', ...restrictHistory });
SettlementPeriod.belongsTo(Shop, { foreignKey: 'shopId', as: 'shop', ...restrictHistory });
SettlementPeriod.belongsTo(User, { foreignKey: 'createdBy', as: 'creator', ...restrictHistory });
SettlementPeriod.belongsTo(User, { foreignKey: 'closedBy', as: 'closer', ...restrictHistory });
SettlementItem.belongsTo(SettlementPeriod, { foreignKey: 'periodId', as: 'period', ...restrictHistory });
SettlementItem.belongsTo(SellerLedger, { foreignKey: 'entryId', as: 'entry', ...restrictHistory });
SellerPayout.belongsTo(SettlementPeriod, { foreignKey: 'periodId', as: 'period', ...restrictHistory });
SellerPayout.belongsTo(Shop, { foreignKey: 'shopId', as: 'shop', ...restrictHistory });
SellerPayout.belongsTo(User, { foreignKey: 'recordedBy', as: 'recorder', ...restrictHistory });

module.exports = {
  ...operations,
  SettlementPolicy, SellerLedger, SettlementPeriod, SettlementItem, SellerPayout,
  User,
  Shop,
  Product,
  ProductStockUpdate,
  ProductVariant, InventoryMovement,
  Order,
  OrderItem,
  Address,
  Review,
  CheckoutAttempt,
  Conversation,
  ChatMessage,
  PaymentTransaction,
  BankReceipt,
  PaymentAllocation,
  Region,
  CraftVillage,
  ReturnCase,
  ReturnLine,
  Refund,
  CodEntry,
};

for (const [model, field] of [[AuthSession, 'userId'], [AuthActionToken, 'userId'], [Notification, 'userId'],
  [SupportTicket, 'requesterId'], [SupportTicket, 'assignedTo'], [SupportMessage, 'authorId'],
  [AuditEvent, 'actorId'], [ModerationAction, 'actorId']]) {
  model.belongsTo(User, { foreignKey: field, as: field + 'User', ...restrictHistory });
}
SupportTicket.belongsTo(Order, { foreignKey: 'orderId', as: 'order', ...restrictHistory });
SupportTicket.hasMany(SupportMessage, { foreignKey: 'ticketId', as: 'messages', ...restrictHistory });
SupportMessage.belongsTo(SupportTicket, { foreignKey: 'ticketId', as: 'ticket', ...restrictHistory });

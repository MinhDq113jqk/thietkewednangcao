const { DataTypes } = require('sequelize');
const { sequelize }  = require('../config/db');

/* ─── Order ─────────────────────────────────────────────── */
const Order = sequelize.define('Order', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  buyerId:      { type: DataTypes.UUID, allowNull: false },
  shopId:       { type: DataTypes.UUID, allowNull: false },
  total:        { type: DataTypes.DECIMAL(15, 0), allowNull: false },
  shippingFee:  { type: DataTypes.DECIMAL(15, 0), defaultValue: 0 },
  status: {
    type: DataTypes.ENUM('pending','confirmed','packing','shipping','delivered','cancelled','returned'),
    defaultValue: 'pending',
  },
  paymentMethod: { type: DataTypes.STRING(50) },
  paymentStatus: { type: DataTypes.ENUM('unpaid','paid','refunded'), defaultValue: 'unpaid' },
  shippingAddress: { type: DataTypes.JSONB },
  note:          { type: DataTypes.TEXT },
  carrier:       { type: DataTypes.STRING(100) },
  trackingCode:  { type: DataTypes.STRING(120) },
  currentLocation: { type: DataTypes.STRING(250) },
  trackingHistory: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  estimatedDeliveryAt: { type: DataTypes.DATE },
  shippedAt:     { type: DataTypes.DATE },
  deliveredAt:   { type: DataTypes.DATE },
}, { tableName: 'orders', timestamps: true });

/* ─── OrderItem ─────────────────────────────────────────── */
const OrderItem = sequelize.define('OrderItem', {
  id:         { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  orderId:    { type: DataTypes.UUID, allowNull: false },
  productId:  { type: DataTypes.UUID, allowNull: false },
  name:       { type: DataTypes.STRING(200), allowNull: false },
  image:      { type: DataTypes.TEXT },
  price:      { type: DataTypes.DECIMAL(15, 0), allowNull: false },
  quantity:   { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: 'order_items', timestamps: false });

/* ─── Address ───────────────────────────────────────────── */
const Address = sequelize.define('Address', {
  id:        { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId:    { type: DataTypes.UUID, allowNull: false },
  name:      { type: DataTypes.STRING(100), allowNull: false },
  phone:     { type: DataTypes.STRING(20),  allowNull: false },
  detail:    { type: DataTypes.STRING(300), allowNull: false },
  district:  { type: DataTypes.STRING(100) },
  city:      { type: DataTypes.STRING(100) },
  isDefault: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'addresses', timestamps: true });

/* ─── Review ────────────────────────────────────────────── */
const Review = sequelize.define('Review', {
  id:        { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  productId: { type: DataTypes.UUID, allowNull: false },
  userId:    { type: DataTypes.UUID, allowNull: false },
  orderId:   { type: DataTypes.UUID, allowNull: false },
  rating:    { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 5 } },
  comment:   { type: DataTypes.TEXT },
  images:    { type: DataTypes.ARRAY(DataTypes.TEXT), defaultValue: [] },
}, { tableName: 'reviews', timestamps: true });

module.exports = { Order, OrderItem, Address, Review };

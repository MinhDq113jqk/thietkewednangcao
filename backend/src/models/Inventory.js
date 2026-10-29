const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');
const ProductVariant = sequelize.define('ProductVariant', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  productId: { type: DataTypes.UUID, allowNull: false },
  shopId: { type: DataTypes.UUID, allowNull: false },
  sku: { type: DataTypes.STRING(100), allowNull: false },
  name: { type: DataTypes.STRING(200), allowNull: false, defaultValue: 'Mặc định' },
  color: DataTypes.STRING(100), size: DataTypes.STRING(100), material: DataTypes.STRING(100),
  price: { type: DataTypes.DECIMAL(15, 0), allowNull: false }, salePrice: DataTypes.DECIMAL(15, 0),
  image: DataTypes.TEXT,
  stock: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  held: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  stockVersion: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  lowStockThreshold: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, { tableName: 'product_variants', timestamps: true });
const InventoryMovement = sequelize.define('InventoryMovement', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  variantId: { type: DataTypes.UUID, allowNull: false }, shopId: { type: DataTypes.UUID, allowNull: false },
  orderId: DataTypes.UUID, actorId: DataTypes.UUID,
  kind: { type: DataTypes.STRING(30), allowNull: false }, sourceKey: { type: DataTypes.STRING(180), allowNull: false },
  availableDelta: { type: DataTypes.INTEGER, allowNull: false }, heldDelta: { type: DataTypes.INTEGER, allowNull: false },
  availableAfter: { type: DataTypes.INTEGER, allowNull: false }, heldAfter: { type: DataTypes.INTEGER, allowNull: false },
  requestHash: DataTypes.STRING(64), reason: { type: DataTypes.STRING(1000), allowNull: false },
}, { tableName: 'inventory_movements', timestamps: true, updatedAt: false });
module.exports = { ProductVariant, InventoryMovement };

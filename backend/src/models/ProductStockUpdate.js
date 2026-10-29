const { DataTypes: D } = require('sequelize');
const { sequelize } = require('../database/connection');

// Command receipts allow a lost response to be retried without setting stock twice.
module.exports = sequelize.define('ProductStockUpdate', {
  id: { type: D.UUID, defaultValue: D.UUIDV4, primaryKey: true },
  productId: { type: D.UUID, allowNull: false },
  recordedBy: { type: D.UUID, allowNull: false },
  requestKey: { type: D.STRING(120), allowNull: false },
  fromVersion: { type: D.INTEGER, allowNull: false },
  toVersion: { type: D.INTEGER, allowNull: false },
  stockBefore: { type: D.INTEGER, allowNull: false },
  stockAfter: { type: D.INTEGER, allowNull: false },
  reason: { type: D.STRING(1000), allowNull: false },
}, { tableName: 'product_stock_updates', timestamps: true, updatedAt: false });

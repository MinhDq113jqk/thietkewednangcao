const { DataTypes: D } = require('sequelize');
const { sequelize } = require('../database/connection');
const id = () => ({ type: D.UUID, defaultValue: D.UUIDV4, primaryKey: true });
const ReturnCase = sequelize.define('ReturnCase', {
  id: id(), orderId: { type: D.UUID, allowNull: false }, buyerId: { type: D.UUID, allowNull: false },
  requestKey: { type: D.STRING(120), allowNull: false }, requestHash: { type: D.STRING(64), allowNull: false },
  kind: { type: D.STRING(30), allowNull: false }, status: { type: D.STRING(30), allowNull: false, defaultValue: 'requested' },
  reason: { type: D.STRING(2000), allowNull: false }, evidence: { type: D.JSONB, allowNull: false, defaultValue: [] },
  requestedAmount: { type: D.DECIMAL(15, 0), allowNull: false, defaultValue: 0 },
  approvedAmount: { type: D.DECIMAL(15, 0), allowNull: false, defaultValue: 0 },
  history: { type: D.JSONB, allowNull: false, defaultValue: [] },
  replacement: { type: D.JSONB },
}, { tableName: 'return_cases', timestamps: true });
const ReturnLine = sequelize.define('ReturnLine', {
  id: id(), caseId: { type: D.UUID, allowNull: false }, orderItemId: { type: D.UUID, allowNull: false },
  quantity: { type: D.INTEGER, allowNull: false }, restock: { type: D.BOOLEAN },
}, { tableName: 'return_lines', timestamps: false });
const Refund = sequelize.define('Refund', {
  id: id(), orderId: { type: D.UUID }, receiptId: { type: D.UUID }, caseId: { type: D.UUID },
  source: { type: D.STRING(30), allowNull: false }, reference: { type: D.STRING(120), allowNull: false },
  amount: { type: D.DECIMAL(15, 0), allowNull: false }, occurredAt: { type: D.DATE, allowNull: false },
  evidence: { type: D.STRING(1000), allowNull: false }, note: { type: D.STRING(1000), allowNull: false },
  recordedBy: { type: D.UUID, allowNull: false },
}, { tableName: 'refunds', timestamps: true, updatedAt: false });
const CodEntry = sequelize.define('CodEntry', {
  id: id(), orderId: { type: D.UUID, allowNull: false }, kind: { type: D.STRING(30), allowNull: false },
  reference: { type: D.STRING(120), allowNull: false }, amount: { type: D.DECIMAL(15, 0), allowNull: false },
  fee: { type: D.DECIMAL(15, 0), allowNull: false, defaultValue: 0 }, occurredAt: { type: D.DATE, allowNull: false },
  evidence: { type: D.STRING(1000), allowNull: false }, note: { type: D.STRING(1000), allowNull: false },
  recordedBy: { type: D.UUID, allowNull: false },
}, { tableName: 'cod_entries', timestamps: true, updatedAt: false });
module.exports = { ReturnCase, ReturnLine, Refund, CodEntry };

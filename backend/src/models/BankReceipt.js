const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

// Bank facts are append-only; an allocation is a separate, audited decision.
const BankReceipt = sequelize.define('BankReceipt', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  reference: { type: DataTypes.STRING(120), allowNull: false },
  amount: { type: DataTypes.DECIMAL(15, 0), allowNull: false },
  receivedAt: { type: DataTypes.DATE, allowNull: false },
  transferContent: { type: DataTypes.STRING(500), allowNull: false },
  evidence: { type: DataTypes.STRING(1000), allowNull: false },
  orderId: { type: DataTypes.UUID },
  recordedBy: { type: DataTypes.UUID, allowNull: false },
}, { tableName: 'bank_receipts', timestamps: true, updatedAt: false });

const PaymentAllocation = sequelize.define('PaymentAllocation', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  receiptId: { type: DataTypes.UUID, allowNull: false },
  orderId: { type: DataTypes.UUID, allowNull: false },
  amount: { type: DataTypes.DECIMAL(15, 0), allowNull: false },
  note: { type: DataTypes.STRING(1000), allowNull: false },
  allocatedBy: { type: DataTypes.UUID, allowNull: false },
  legacyVerification: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, { tableName: 'payment_allocations', timestamps: true, updatedAt: false });

module.exports = { BankReceipt, PaymentAllocation };

const { DataTypes: D } = require('sequelize');
const { sequelize } = require('../database/connection');
const id = () => ({ type: D.UUID, defaultValue: D.UUIDV4, primaryKey: true });
const required = (type) => ({ type, allowNull: false });
const immutable = (tableName) => ({ tableName, timestamps: true, updatedAt: false });
const SettlementPolicy = sequelize.define('SettlementPolicy', {
  id: id(), shopId: required(D.UUID), commissionBps: required(D.INTEGER),
  note: required(D.STRING(1000)), recordedBy: required(D.UUID),
}, immutable('settlement_policies'));
const SellerLedger = sequelize.define('SellerLedger', {
  id: id(), shopId: required(D.UUID), orderId: required(D.UUID), policyId: required(D.UUID),
  refundId: { type: D.UUID }, sourceKey: required(D.STRING(180)), kind: required(D.STRING(30)),
  amount: required(D.DECIMAL(15, 0)), effectiveAt: required(D.DATE), availableAt: required(D.DATE),
  note: required(D.STRING(1000)), evidence: { type: D.STRING(1000) }, recordedBy: { type: D.UUID },
  metadata: { type: D.JSONB, allowNull: false, defaultValue: {} },
}, immutable('seller_ledger'));
const SettlementPeriod = sequelize.define('SettlementPeriod', {
  id: id(), shopId: required(D.UUID), requestKey: required(D.STRING(120)), requestHash: required(D.STRING(64)),
  cutoffAt: required(D.DATE), amount: required(D.DECIMAL(15, 0)), note: required(D.STRING(1000)),
  status: { type: D.STRING(20), allowNull: false, defaultValue: 'draft' },
  createdBy: required(D.UUID), closedBy: { type: D.UUID }, closedAt: { type: D.DATE }, closeNote: { type: D.STRING(1000) },
}, { tableName: 'settlement_periods', timestamps: true });
const SettlementItem = sequelize.define('SettlementItem', {
  id: id(), periodId: required(D.UUID), entryId: required(D.UUID),
}, immutable('settlement_items'));
const SellerPayout = sequelize.define('SellerPayout', {
  id: id(), periodId: required(D.UUID), shopId: required(D.UUID), amount: required(D.DECIMAL(15, 0)),
  reference: required(D.STRING(120)), occurredAt: required(D.DATE), beneficiary: required(D.STRING(200)),
  evidence: required(D.STRING(1000)), note: required(D.STRING(1000)), recordedBy: required(D.UUID),
}, immutable('seller_payouts'));
module.exports = { SettlementPolicy, SellerLedger, SettlementPeriod, SettlementItem, SellerPayout };

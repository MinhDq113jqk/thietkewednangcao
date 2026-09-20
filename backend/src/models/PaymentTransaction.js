const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const PaymentTransaction = sequelize.define('PaymentTransaction', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  orderId: { type: DataTypes.UUID, allowNull: false, unique: true },
  provider: {
    type: DataTypes.STRING(30),
    allowNull: false,
    validate: { isIn: [['vietqr', 'cod', 'manual']] },
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'pending',
    validate: { isIn: [['pending', 'paid', 'refunded', 'failed']] },
  },
  amount: { type: DataTypes.DECIMAL(15, 0), allowNull: false },
  reference: { type: DataTypes.STRING(120) },
  confirmedAt: { type: DataTypes.DATE },
  confirmedBy: { type: DataTypes.UUID },
  metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
}, { tableName: 'payment_transactions', timestamps: true });

module.exports = PaymentTransaction;

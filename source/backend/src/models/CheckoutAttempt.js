const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const CheckoutAttempt = sequelize.define('CheckoutAttempt', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  buyerId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  idempotencyKey: {
    type: DataTypes.STRING(128),
    allowNull: false,
  },
  requestHash: {
    type: DataTypes.STRING(64),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('processing', 'completed'),
    allowNull: false,
    defaultValue: 'processing',
  },
  orderIds: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
  },
}, {
  tableName: 'checkout_attempts',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['buyerId', 'idempotencyKey'],
      name: 'checkout_attempts_buyer_key_unique',
    },
  ],
});

module.exports = CheckoutAttempt;

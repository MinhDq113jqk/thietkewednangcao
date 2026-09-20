const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Conversation = sequelize.define('Conversation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  buyerId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  shopId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  lastMessage: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  lastMessageAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'conversations',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['buyerId', 'shopId'],
      name: 'conversations_buyer_shop_unique',
    },
  ],
});

module.exports = Conversation;

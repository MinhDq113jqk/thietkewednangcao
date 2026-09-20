const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ChatMessage = sequelize.define('ChatMessage', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  conversationId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  senderId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  body: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: [1, 2000],
    },
  },
  readAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'chat_messages',
  timestamps: true,
  indexes: [
    {
      fields: ['conversationId', 'createdAt'],
      name: 'chat_messages_conversation_created_at',
    },
  ],
});

module.exports = ChatMessage;

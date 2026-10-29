const { DataTypes } = require('sequelize');
const { sequelize }  = require('../database/connection');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING(20),
  },
  avatar: {
    type: DataTypes.TEXT,
  },
  role: {
    type: DataTypes.ENUM('buyer', 'seller', 'admin'),
    defaultValue: 'buyer',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  refreshToken: {
    type: DataTypes.TEXT,
  },
  authVersion: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  requireSession: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  emailVerifiedAt: { type: DataTypes.DATE },
}, {
  tableName: 'users',
  timestamps: true,
});

module.exports = User;

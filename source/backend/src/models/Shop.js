const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Shop = sequelize.define('Shop', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  ownerId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  slug: {
    type: DataTypes.STRING(160),
    allowNull: false,
    unique: true,
  },
  description: {
    type: DataTypes.TEXT,
  },
  logo: {
    type: DataTypes.TEXT,
  },
  banner: {
    type: DataTypes.TEXT,
  },
  location: {
    type: DataTypes.STRING(200),
  },
  rating: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  reviewCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM('pending', 'active', 'suspended', 'rejected'),
    defaultValue: 'pending',
  },
}, {
  tableName: 'shops',
  timestamps: true,
});

module.exports = Shop;

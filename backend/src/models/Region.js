const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Region = sequelize.define('Region', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  slug: {
    type: DataTypes.STRING(120),
    allowNull: false,
    unique: true,
  },
  shortDescription: {
    type: DataTypes.TEXT,
  },
  history: {
    type: DataTypes.TEXT,
  },
  centerLat: {
    type: DataTypes.DECIMAL(9, 6),
    allowNull: false,
  },
  centerLng: {
    type: DataTypes.DECIMAL(9, 6),
    allowNull: false,
  },
  mapX: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
  },
  mapY: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
  },
  heroMedia: {
    type: DataTypes.TEXT,
  },
  theme: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
  isFeatured: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
}, {
  tableName: 'regions',
  timestamps: true,
});

module.exports = Region;

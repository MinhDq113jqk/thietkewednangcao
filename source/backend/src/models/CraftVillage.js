const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const CraftVillage = sequelize.define('CraftVillage', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  regionId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING(160),
    allowNull: false,
  },
  slug: {
    type: DataTypes.STRING(180),
    allowNull: false,
    unique: true,
  },
  summary: {
    type: DataTypes.TEXT,
  },
  foundedYear: {
    type: DataTypes.INTEGER,
  },
  latitude: {
    type: DataTypes.DECIMAL(9, 6),
    allowNull: false,
  },
  longitude: {
    type: DataTypes.DECIMAL(9, 6),
    allowNull: false,
  },
  previewMedia: {
    type: DataTypes.TEXT,
  },
  crafts: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: false,
    defaultValue: [],
  },
  artisans: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
  },
  isFeatured: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
}, {
  tableName: 'craft_villages',
  timestamps: true,
});

module.exports = CraftVillage;

const { DataTypes } = require('sequelize');
const { sequelize }  = require('../config/db');

const Product = sequelize.define('Product', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  shopId:      { type: DataTypes.UUID, allowNull: false },
  craftVillageId: { type: DataTypes.UUID },
  name:        { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT },
  price:       { type: DataTypes.DECIMAL(15, 0), allowNull: false },
  salePrice:   { type: DataTypes.DECIMAL(15, 0) },
  stock:       { type: DataTypes.INTEGER, defaultValue: 0 },
  images:      { type: DataTypes.ARRAY(DataTypes.TEXT), defaultValue: [] },
  category:    { type: DataTypes.STRING(100) },
  isActive:    { type: DataTypes.BOOLEAN, defaultValue: true },
  isFlashSale: { type: DataTypes.BOOLEAN, defaultValue: false },
  sold:        { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'products', timestamps: true });

module.exports = Product;

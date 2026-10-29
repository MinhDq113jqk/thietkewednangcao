const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../database/connection');

class Product extends Model {}

Product.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    shopId: { type: DataTypes.UUID, allowNull: false },
    craftVillageId: { type: DataTypes.UUID },
    name: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT },
    price: { type: DataTypes.DECIMAL(15, 0), allowNull: false },
    salePrice: { type: DataTypes.DECIMAL(15, 0) },
    stock: { type: DataTypes.INTEGER, defaultValue: 0 },
    stockVersion: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    variantCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    images: { type: DataTypes.ARRAY(DataTypes.TEXT), defaultValue: [] },
    category: { type: DataTypes.STRING(100) },
    dataSource: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'legacy',
    },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    moderationHidden: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    isFlashSale: { type: DataTypes.BOOLEAN, defaultValue: false },
    sold: { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  { sequelize, modelName: 'Product', tableName: 'products', timestamps: true },
);

module.exports = Product;

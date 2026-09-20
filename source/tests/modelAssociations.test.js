import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';

const require = createRequire(import.meta.url);
const models = require('../backend/src/models');

describe('database associations', () => {
  it('enables constraints for every Sequelize association', () => {
    for (const [modelName, model] of Object.entries(models)) {
      for (const [associationName, association] of Object.entries(model.associations)) {
        assert.equal(
          association.options.constraints,
          true,
          `${modelName}.${associationName} must enforce its foreign key`
        );
        assert.equal(association.options.onUpdate, 'CASCADE');
      }
    }
  });

  it('protects commerce history while cascading dependent records', () => {
    assert.equal(models.User.associations.orders.options.onDelete, 'RESTRICT');
    assert.equal(models.Shop.associations.products.options.onDelete, 'RESTRICT');
    assert.equal(models.Product.associations.orderItems.options.onDelete, 'RESTRICT');
    assert.equal(models.User.associations.addresses.options.onDelete, 'CASCADE');
    assert.equal(models.Order.associations.items.options.onDelete, 'CASCADE');
    assert.equal(models.CheckoutAttempt.associations.buyer.options.onDelete, 'CASCADE');
    assert.equal(models.Conversation.associations.messages.options.onDelete, 'CASCADE');
    assert.equal(models.ChatMessage.associations.sender.options.onDelete, 'RESTRICT');
    assert.equal(models.Conversation.associations.product.options.onDelete, 'SET NULL');
    assert.equal(models.Order.associations.payment.options.onDelete, 'CASCADE');
    assert.equal(models.PaymentTransaction.associations.confirmedByUser.options.onDelete, 'SET NULL');
    assert.equal(models.Region.associations.villages.options.onDelete, 'RESTRICT');
    assert.equal(models.CraftVillage.associations.products.options.onDelete, 'SET NULL');
    assert.equal(models.Product.associations.craftVillage.options.onDelete, 'SET NULL');
  });

  it('connects reviews to the product, buyer, and originating order', () => {
    assert.equal(models.Review.associations.product.foreignKey, 'productId');
    assert.equal(models.Review.associations.user.foreignKey, 'userId');
    assert.equal(models.Review.associations.order.foreignKey, 'orderId');
  });

  it('connects cultural regions, craft villages, and products', () => {
    assert.equal(models.CraftVillage.associations.region.foreignKey, 'regionId');
    assert.equal(models.Product.associations.craftVillage.foreignKey, 'craftVillageId');
    assert.equal(models.CraftVillage.associations.products.foreignKey, 'craftVillageId');
  });
});

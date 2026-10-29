const { sequelize } = require('./connection');
const { sampleProducts, legacyDemoImageUrls } = require('./demoProducts');

// Recognize old seed rows using their shop, owner, unique name and seed image set.
// A placeholder URL alone does not establish where a product came from.
const backfillProductSources = async (transaction) => {
  for (const product of sampleProducts) {
    await sequelize.query(`
      UPDATE products p SET "dataSource" = 'demo'
      FROM shops s INNER JOIN users u ON u.id = s."ownerId"
      WHERE p."shopId" = s.id AND s.slug = 'gom-bat-trang-test'
        AND u.email = 'seller-test@example.com'
        AND p."dataSource" = 'legacy'
        AND p.name = $name
        AND (p.images = $images::text[] OR p.images = $legacyImages::text[])
        AND (SELECT count(*) FROM products other
             WHERE other."shopId" = p."shopId" AND other.name = p.name) = 1
    `, {
      bind: { name: product.name, images: product.images, legacyImages: [legacyDemoImageUrls[product.name]] },
      transaction,
      logging: false,
    });
  }
};

module.exports = { backfillProductSources };

require('../config/loadEnv')();

const bcrypt = require('bcryptjs');
const { sampleProducts } = require('./demoProducts');
const { normalizeCategory } = require('../shared/productCatalog.mjs');
const crypto = require('crypto');
const { sequelize } = require('./connection');
const { checkDatabase, databaseFailure } = require('./check');
const {
  CraftVillage,
  Product,
  Region,
  Shop,
  User,
} = require('../models');

const cultureSeeds = [
  {
    region: {
      name: 'Hà Nội',
      slug: 'ha-noi',
      shortDescription: 'Nơi lớp men gốm, tơ lụa và nhịp phố cũ gặp nhau.',
      history: 'Hà Nội lưu giữ một mạng lưới làng nghề lâu đời bao quanh đô thị. Mỗi sản phẩm đi vào phố mang theo dấu tay, chất đất và nhịp sống của cộng đồng làm nghề.',
      centerLat: 21.027764,
      centerLng: 105.834160,
      mapX: 35,
      mapY: 14,
      theme: { primary: '#174C45', accent: '#D89A3D', paper: '#F2E6C9', ink: '#17201D', wash: '#DCEBE5' },
    },
    villages: [{
      name: 'Làng gốm Bát Tràng',
      slug: 'gom-bat-trang',
      summary: 'Một điểm dừng bên sông Hồng, nơi đất được tạo hình, phủ men và nung thành đồ dùng lẫn quà lưu niệm.',
      foundedYear: 1400,
      latitude: 20.976116,
      longitude: 105.913017,
      crafts: ['Gốm', 'Men thủ công', 'Tạo hình đất'],
      artisans: [{ name: 'Nhóm tạo tác Bát Tràng', craft: 'Tạo hình và men gốm', note: 'Hồ sơ mẫu cho MVP' }],
    }],
  },
  {
    region: {
      name: 'Huế',
      slug: 'hue',
      shortDescription: 'Sắc trầm cung đình đi cùng nón lá, tranh làng và hương thơm.',
      history: 'Không gian nghề ở Huế chịu ảnh hưởng của nhịp sống kinh đô và các làng ven sông. Vật liệu mộc mạc được xử lý bằng bảng màu tiết chế, đường nét thanh và nhiều công đoạn thủ công.',
      centerLat: 16.463713,
      centerLng: 107.590866,
      mapX: 46,
      mapY: 44,
      theme: { primary: '#5A416C', accent: '#C49A45', paper: '#F2E9DD', ink: '#281F2D', wash: '#E8DDED' },
    },
    villages: [{
      name: 'Làng nón Tây Hồ',
      slug: 'non-tay-ho',
      summary: 'Những lớp lá mỏng được chọn, là và khâu thành chiếc nón nhẹ, bền và mang nét riêng của xứ Huế.',
      latitude: 16.398200,
      longitude: 107.664800,
      crafts: ['Nón lá', 'Khâu tay', 'Trang trí'],
      artisans: [{ name: 'Nhóm thợ nón Tây Hồ', craft: 'Chằm nón', note: 'Hồ sơ mẫu cho MVP' }],
    }],
  },
  {
    region: {
      name: 'Hội An',
      slug: 'hoi-an',
      shortDescription: 'Từ phố cảng, những câu chuyện gỗ, gốm và đèn lồng tiếp tục lên đường.',
      history: 'Hội An từng là điểm gặp gỡ của thuyền buôn và thợ nghề. Quanh phố cổ, các cộng đồng làm mộc, gốm và thủ công vẫn gìn giữ kỹ thuật qua nhiều thế hệ, đồng thời tạo ra sản phẩm phù hợp với đời sống hôm nay.',
      centerLat: 15.880058,
      centerLng: 108.338047,
      mapX: 50,
      mapY: 53,
      theme: { primary: '#8B4A2F', accent: '#E3A62F', paper: '#F4E2B8', ink: '#2D2119', wash: '#EAD1A2' },
    },
    villages: [{
      name: 'Làng mộc Kim Bồng',
      slug: 'moc-kim-bong',
      summary: 'Hơn bốn thế kỷ làm nghề bên sông, từ đóng thuyền và dựng nhà đến chạm khắc những vật phẩm nhỏ.',
      foundedYear: 1590,
      latitude: 15.866772,
      longitude: 108.329088,
      crafts: ['Mộc', 'Chạm khắc', 'Đóng thuyền'],
      artisans: [{ name: 'Nhóm thợ mộc Kim Bồng', craft: 'Mộc và chạm khắc', note: 'Hồ sơ mẫu cho MVP' }],
    }],
  },
  {
    region: {
      name: 'Đà Lạt',
      slug: 'da-lat',
      shortDescription: 'Cao nguyên mát lành, nơi sợi dệt và vật liệu tự nhiên mang nhịp sống mới.',
      history: 'Không gian văn hóa quanh Đà Lạt kết nối đô thị cao nguyên với cộng đồng bản địa và vùng sản xuất lân cận. Màu sắc, hoa văn và chất liệu đều phản ánh khí hậu cùng đời sống trên đất cao.',
      centerLat: 11.940419,
      centerLng: 108.458313,
      mapX: 58,
      mapY: 73,
      theme: { primary: '#315E4B', accent: '#D88462', paper: '#E9E5D4', ink: '#1F2D27', wash: '#D7E3D7' },
    },
    villages: [{
      name: "Không gian dệt K'Ho",
      slug: 'det-kho-cao-nguyen',
      summary: 'Một hồ sơ khám phá chất liệu dệt, nhịp hoa văn và câu chuyện cộng đồng trên cao nguyên Lâm Đồng.',
      latitude: 11.936500,
      longitude: 108.429000,
      crafts: ['Dệt', 'Thổ cẩm', 'Nhuộm sợi'],
      artisans: [{ name: "Nhóm nghệ nhân dệt K'Ho", craft: 'Dệt và phối màu', note: 'Hồ sơ mẫu cho MVP' }],
    }],
  },
];

const villageByProductName = {
  'Tuong gom Bat Trang': 'gom-bat-trang',
  'Bo ly gom xanh': 'gom-bat-trang',
  'Non la mini trang tri': 'non-tay-ho',
  'Non la theu hoa': 'non-tay-ho',
};

const seedCultureRecords = async (transaction) => {
  const craftVillages = new Map();

  for (const { region: regionInput, villages } of cultureSeeds) {
    const [region] = await Region.findOrCreate({
      where: { slug: regionInput.slug },
      defaults: regionInput,
      transaction,
    });

    for (const villageInput of villages) {
      const [village] = await CraftVillage.findOrCreate({
        where: { slug: villageInput.slug },
        defaults: { ...villageInput, regionId: region.id },
        transaction,
      });
      craftVillages.set(village.slug, village);
    }
  }

  return craftVillages;
};


const seed = async () => {
  try {
    await checkDatabase();
    await sequelize.transaction(async (transaction) => {
      const craftVillages = await seedCultureRecords(transaction);

      if (process.env.CULTURE_ONLY === 'true') {
        console.log(`Culture seed completed: ${cultureSeeds.length} regions, ${craftVillages.size} craft villages. Existing records preserved.`);
        return;
      }

      const seedPassword = process.env.SEED_ACCOUNT_PASSWORD || crypto.randomBytes(12).toString('base64url');
      const password = await bcrypt.hash(seedPassword, 12);
      const [, buyerCreated] = await User.findOrCreate({
        where: { email: 'buyer-test@example.com' },
        defaults: {
          name: 'Buyer Test',
          email: 'buyer-test@example.com',
          password,
          role: 'buyer',
          isActive: true,
        },
        transaction,
      });

      const [, adminCreated] = await User.findOrCreate({
        where: { email: 'admin-test@example.com' },
        defaults: {
          name: 'Admin Test',
          email: 'admin-test@example.com',
          password,
          role: 'admin',
          isActive: true,
        },
        transaction,
      });

      const [seller, sellerCreated] = await User.findOrCreate({
        where: { email: 'seller-test@example.com' },
        defaults: {
          name: 'Seller Test',
          email: 'seller-test@example.com',
          password,
          role: 'seller',
          isActive: true,
        },
        transaction,
      });

      const [shop] = await Shop.findOrCreate({
        where: { slug: 'gom-bat-trang-test' },
        defaults: {
          ownerId: seller.id,
          name: 'Gom Bat Trang Test',
          slug: 'gom-bat-trang-test',
          description: 'Gian hang mau de kiem tra luong mua hang SouvenirShop.',
          status: 'active',
          location: 'Ha Noi',
          rating: 4.8,
          reviewCount: 32,
        },
        transaction,
      });

      for (const product of sampleProducts) {
        const craftVillage = craftVillages.get(villageByProductName[product.name]);
        await Product.findOrCreate({
          where: { shopId: shop.id, name: product.name },
          defaults: {
            shopId: shop.id,
            ...product,
            category: normalizeCategory(product.category),
            dataSource: 'demo',
            craftVillageId: craftVillage?.id || null,
            isActive: true,
          },
          transaction,
        });
      }

      console.log(`Seed completed: ${sampleProducts.length} sample products checked. Existing accounts, shops and products preserved.`);
      if (!process.env.SEED_ACCOUNT_PASSWORD && (buyerCreated || adminCreated || sellerCreated)) {
        console.log(`Password for newly created demo accounts: ${seedPassword}`);
      }
    });
  } catch (err) {
    console.error(JSON.stringify(databaseFailure(err)));
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
};

seed();

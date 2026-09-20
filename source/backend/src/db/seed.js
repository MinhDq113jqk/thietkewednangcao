require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sequelize } = require('../config/db');
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

const seedCultureRecords = async () => {
  const craftVillages = new Map();

  for (const { region: regionInput, villages } of cultureSeeds) {
    const [region] = await Region.findOrCreate({
      where: { slug: regionInput.slug },
      defaults: regionInput,
    });
    await region.update({ ...regionInput, isFeatured: true });

    for (const villageInput of villages) {
      const [village] = await CraftVillage.findOrCreate({
        where: { slug: villageInput.slug },
        defaults: { ...villageInput, regionId: region.id },
      });
      await village.update({ ...villageInput, regionId: region.id, isFeatured: true });
      craftVillages.set(village.slug, village);
    }
  }

  return craftVillages;
};

const sampleProducts = [
  {
    name: 'Moc khoa Ha Noi test',
    description: 'Moc khoa chu de Ha Noi, phu hop lam qua luu niem nho gon.',
    price: 35000,
    stock: 30,
    category: 'Móc khóa',
    images: ['https://placehold.co/600x600?text=Moc+Khoa+Ha+Noi'],
    sold: 12,
  },
  {
    name: 'Non la mini trang tri',
    description: 'Non la mini thu cong de trang tri ban lam viec hoac goc qua tang.',
    price: 55000,
    stock: 18,
    category: 'Nón',
    images: ['https://placehold.co/600x600?text=Non+La+Mini'],
    sold: 24,
  },
  {
    name: 'Tranh theu tay hoa sen',
    description: 'Tranh theu tay hoa sen voi khung go nho, mang sac thai Viet Nam.',
    price: 120000,
    salePrice: 99000,
    stock: 14,
    category: 'Tranh',
    images: ['https://placehold.co/600x600?text=Tranh+Theu+Hoa+Sen'],
    isFlashSale: true,
    sold: 8,
  },
  {
    name: 'Tuong gom Bat Trang',
    description: 'Tuong gom men ngoc nung nhiet cao, san pham thu cong tu Bat Trang.',
    price: 95000,
    stock: 22,
    category: 'Gốm',
    images: ['https://placehold.co/600x600?text=Gom+Bat+Trang'],
    sold: 17,
  },
  {
    name: 'Vong tay tram huong',
    description: 'Vong tay tram huong thom nhe, dong goi hop qua tang lich su.',
    price: 75000,
    stock: 26,
    category: 'Vòng tay',
    images: ['https://placehold.co/600x600?text=Vong+Tay+Tram+Huong'],
    sold: 31,
  },
  {
    name: 'Non la theu hoa',
    description: 'Non la theu hoa van tinh te, ket hop truyen thong va hien dai.',
    price: 65000,
    stock: 16,
    category: 'Nón',
    images: ['https://placehold.co/600x600?text=Non+La+Theu+Hoa'],
    sold: 10,
  },
  {
    name: 'Bo ly gom xanh',
    description: 'Bo ly gom men xanh dung tra hoac trang tri, gom 2 ly va dia lot.',
    price: 180000,
    salePrice: 150000,
    stock: 11,
    category: 'Gốm',
    images: ['https://placehold.co/600x600?text=Bo+Ly+Gom+Xanh'],
    isFlashSale: true,
    sold: 6,
  },
  {
    name: 'Tranh dong ho dan gian',
    description: 'Ban in tranh Dong Ho kich thuoc nho, dong khung gon gang.',
    price: 135000,
    stock: 9,
    category: 'Tranh',
    images: ['https://placehold.co/600x600?text=Tranh+Dong+Ho'],
    sold: 15,
  },
];

const seed = async () => {
  try {
    await sequelize.authenticate();
    const craftVillages = await seedCultureRecords();

    if (process.env.CULTURE_ONLY === 'true') {
      let linkedProducts = 0;
      for (const [productName, villageSlug] of Object.entries(villageByProductName)) {
        const village = craftVillages.get(villageSlug);
        const [updatedRows] = await Product.update(
          { craftVillageId: village.id },
          { where: { name: productName, craftVillageId: null } }
        );
        linkedProducts += updatedRows;
      }
      console.log(`Culture seed completed: ${cultureSeeds.length} regions, ${craftVillages.size} craft villages, ${linkedProducts} products linked.`);
      process.exit(0);
    }

    const seedPassword = process.env.SEED_ACCOUNT_PASSWORD || crypto.randomBytes(12).toString('base64url');
    const password = await bcrypt.hash(seedPassword, 12);
    const [buyer] = await User.findOrCreate({
      where: { email: 'buyer-test@example.com' },
      defaults: {
        name: 'Buyer Test',
        email: 'buyer-test@example.com',
        password,
        role: 'buyer',
        isActive: true,
      },
    });

    await buyer.update({ password, role: 'buyer', isActive: true });

    const [admin] = await User.findOrCreate({
      where: { email: 'admin-test@example.com' },
      defaults: {
        name: 'Admin Test',
        email: 'admin-test@example.com',
        password,
        role: 'admin',
        isActive: true,
      },
    });

    await admin.update({ password, role: 'admin', isActive: true });

    const [seller] = await User.findOrCreate({
      where: { email: 'seller-test@example.com' },
      defaults: {
        name: 'Seller Test',
        email: 'seller-test@example.com',
        password,
        role: 'seller',
        isActive: true,
      },
    });

    await seller.update({ password, role: 'seller', isActive: true });

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
    });

    await shop.update({
      ownerId: seller.id,
      name: 'Gom Bat Trang Test',
      status: 'active',
      location: 'Ha Noi',
      rating: 4.8,
      reviewCount: 32,
    });

    for (const product of sampleProducts) {
      const craftVillage = craftVillages.get(villageByProductName[product.name]);
      const [existing] = await Product.findOrCreate({
        where: { shopId: shop.id, name: product.name },
        defaults: {
          shopId: shop.id,
          ...product,
          craftVillageId: craftVillage?.id || null,
          isActive: true,
        },
      });

      await existing.update({
        ...product,
        craftVillageId: craftVillage?.id || null,
        isActive: true,
      });

      const duplicates = await Product.findAll({
        where: { shopId: shop.id, name: product.name },
        order: [['createdAt', 'ASC']],
      });

      if (duplicates.length > 1) {
        await Product.destroy({
          where: {
            id: duplicates.slice(1).map((item) => item.id),
          },
        });
      }
    }

    console.log(`Seed completed: ${sampleProducts.length} products and ${craftVillages.size} craft villages are ready.`);
    console.log(`Seed account password for this run: ${seedPassword}`);
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
};

seed();

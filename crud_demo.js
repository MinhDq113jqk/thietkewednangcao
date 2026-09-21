/**
 * ===================================================================
 * SOUVENIRSHOP - THỰC THI KIỂM THỬ CRUD (crud_demo.js)
 *
 * Cách chạy:
 *   node crud_demo.js         (Thực thi CRUD tất cả đối tượng)
 *   node crud_demo.js --sv1   (hoặc --product: CRUD Product)
 *   node crud_demo.js --sv2   (hoặc --user: CRUD User)
 *   node crud_demo.js --sv3   (hoặc --shop: CRUD Shop)
 *   node crud_demo.js --sv4   (hoặc --order: CRUD Order)
 * ===================================================================
 */

const path = require('path');
const fs = require('fs');

// 1. Tải module loader từ source/backend/node_modules
const backendModules = path.resolve(__dirname, 'source/backend/node_modules');
if (fs.existsSync(backendModules) && !module.paths.includes(backendModules)) {
  module.paths.unshift(backendModules);
}

// 2. Tải biến môi trường
const envPaths = [
  path.resolve(__dirname, 'source/backend/.env'),
  path.resolve(__dirname, '.env'),
  path.resolve(__dirname, '../source/backend/.env'),
];
for (const p of envPaths) {
  if (fs.existsSync(p)) {
    try {
      require('dotenv').config({ path: p });
    } catch (e) {
      const content = fs.readFileSync(p, 'utf8');
      content.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || '';
          if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
          if (!process.env[key]) process.env[key] = value.trim();
        }
      });
    }
    break;
  }
}

const { Sequelize, QueryTypes } = require('sequelize');
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/souvenirshop';

const sequelize = new Sequelize(connectionString, {
  dialect: 'postgres',
  logging: false,
});

// Helper định dạng tiêu đề
function printHeader(title) {
  console.log('\n====================================================================');
  console.log(`   ${title}`);
  console.log('====================================================================');
}

// -------------------------------------------------------------------
// 1. CRUD ĐỐI TƯỢNG PRODUCT (SẢN PHẨM)
// -------------------------------------------------------------------
async function demoProductCRUD() {
  printHeader('CRUD: ĐỐI TƯỢNG PRODUCT (SẢN PHẨM)');

  // Tìm 1 shopId mẫu
  const [shop] = await sequelize.query('SELECT id FROM shops LIMIT 1;', { type: QueryTypes.SELECT });
  const shopId = shop ? shop.id : 'd0000000-0000-0000-0000-000000000001';

  // 1. CREATE (Tạo mới sản phẩm)
  console.log('\n1. [CREATE] Thêm mới sản phẩm:');
  const insertQuery = `
    INSERT INTO products (name, description, price, stock, category, "shopId", "isActive")
    VALUES ('Tranh thêu tay hoa sen Cố đô', 'Tranh thêu thủ công truyền thống tinh xảo', 450000, 25, 'Thủ công mỹ nghệ', :shopId, true)
    RETURNING id, name, price, stock, category;
  `;
  const [newProd] = await sequelize.query(insertQuery, {
    replacements: { shopId },
    type: QueryTypes.SELECT,
  });
  console.log('   [OK] Đã thêm sản phẩm thành công:', newProd);

  // 2. READ (Đọc sản phẩm)
  console.log('\n2. [READ] Lấy thông tin sản phẩm vừa tạo:');
  const [readProd] = await sequelize.query(
    'SELECT id, name, price, stock, category FROM products WHERE id = :id;',
    { replacements: { id: newProd.id }, type: QueryTypes.SELECT }
  );
  console.log('   [OK] Dữ liệu sản phẩm:', readProd);

  // 3. UPDATE (Cập nhật thông tin/giá)
  console.log('\n3. [UPDATE] Cập nhật giá bán (450.000 -> 480.000 đ) và giảm số lượng tồn (25 -> 20):');
  const [updatedProd] = await sequelize.query(
    `UPDATE products 
     SET price = 480000, stock = 20, "updatedAt" = NOW() 
     WHERE id = :id 
     RETURNING id, name, price, stock;`,
    { replacements: { id: newProd.id }, type: QueryTypes.SELECT }
  );
  console.log('   [OK] Đã cập nhật sản phẩm thành công:', updatedProd);

  // 4. DELETE (Xóa sản phẩm)
  console.log('\n4. [DELETE] Xóa sản phẩm khỏi hệ thống:');
  await sequelize.query('DELETE FROM products WHERE id = :id;', {
    replacements: { id: newProd.id },
  });
  console.log(`   [OK] Đã xóa sản phẩm có ID: ${newProd.id}`);
}

// -------------------------------------------------------------------
// 2. CRUD ĐỐI TƯỢNG USER (NGƯỜI DÙNG)
// -------------------------------------------------------------------
async function demoUserCRUD() {
  printHeader('CRUD: ĐỐI TƯỢNG USER (NGƯỜI DÙNG)');

  const demoEmail = `test.user.${Date.now()}@example.com`;

  // 1. CREATE
  console.log('\n1. [CREATE] Tạo người dùng mới:');
  const [newUser] = await sequelize.query(
    `INSERT INTO users (name, email, password, phone, role, "isActive")
     VALUES ('Trần Thị Lan', :email, 'hash_demo_123', '0912334455', 'buyer', true)
     RETURNING id, name, email, phone, role;`,
    { replacements: { email: demoEmail }, type: QueryTypes.SELECT }
  );
  console.log('   [OK] Đã tạo người dùng mới:', newUser);

  // 2. READ
  console.log('\n2. [READ] Tìm kiếm người dùng theo Email:');
  const [readUser] = await sequelize.query(
    'SELECT id, name, email, phone, role, "createdAt" FROM users WHERE id = :id;',
    { replacements: { id: newUser.id }, type: QueryTypes.SELECT }
  );
  console.log('   [OK] Thông tin người dùng:', readUser);

  // 3. UPDATE
  console.log('\n3. [UPDATE] Cập nhật số điện thoại và nâng quyền thành seller:');
  const [updatedUser] = await sequelize.query(
    `UPDATE users 
     SET phone = '0988990011', role = 'seller', "updatedAt" = NOW() 
     WHERE id = :id 
     RETURNING id, name, email, phone, role;`,
    { replacements: { id: newUser.id }, type: QueryTypes.SELECT }
  );
  console.log('   [OK] Đã cập nhật người dùng:', updatedUser);

  // 4. DELETE
  console.log('\n4. [DELETE] Xóa tài khoản người dùng khỏi hệ thống:');
  await sequelize.query('DELETE FROM users WHERE id = :id;', {
    replacements: { id: newUser.id },
  });
  console.log(`   [OK] Đã xóa người dùng có ID: ${newUser.id}`);
}

// -------------------------------------------------------------------
// 3. CRUD ĐỐI TƯỢNG SHOP (GIAN HÀNG)
// -------------------------------------------------------------------
async function demoShopCRUD() {
  printHeader('CRUD: ĐỐI TƯỢNG SHOP (GIAN HÀNG)');

  const [user] = await sequelize.query('SELECT id FROM users WHERE role = \'seller\' LIMIT 1;', { type: QueryTypes.SELECT });
  const ownerId = user ? user.id : 'a0000000-0000-0000-0000-000000000002';
  const slug = `shop-moc-kim-bong-${Date.now()}`;

  // 1. CREATE
  console.log('\n1. [CREATE] Đăng ký gian hàng mới:');
  const [newShop] = await sequelize.query(
    `INSERT INTO shops (name, slug, description, location, "ownerId", status)
     VALUES ('Xưởng Mộc Thủ Công Kim Bồng', :slug, 'Chuyên đồ gỗ chạm khắc Hội An tinh xảo', 'Hội An, Quảng Nam', :ownerId, 'approved')
     RETURNING id, name, slug, location, status;`,
    { replacements: { slug, ownerId }, type: QueryTypes.SELECT }
  );
  console.log('   [OK] Đã tạo gian hàng mới:', newShop);

  // 2. READ
  console.log('\n2. [READ] Xem chi tiết gian hàng theo Slug:');
  const [readShop] = await sequelize.query(
    'SELECT id, name, slug, description, location, status FROM shops WHERE id = :id;',
    { replacements: { id: newShop.id }, type: QueryTypes.SELECT }
  );
  console.log('   [OK] Thông tin gian hàng:', readShop);

  // 3. UPDATE
  console.log('\n3. [UPDATE] Cập nhật đánh giá và mô tả gian hàng:');
  const [updatedShop] = await sequelize.query(
    `UPDATE shops 
     SET rating = 5.0, description = 'Xưởng mộc 400 năm truyền thống xứ Quảng', "updatedAt" = NOW() 
     WHERE id = :id 
     RETURNING id, name, rating, description;`,
    { replacements: { id: newShop.id }, type: QueryTypes.SELECT }
  );
  console.log('   [OK] Đã cập nhật gian hàng:', updatedShop);

  // 4. DELETE
  console.log('\n4. [DELETE] Xóa gian hàng khỏi hệ thống:');
  await sequelize.query('DELETE FROM shops WHERE id = :id;', {
    replacements: { id: newShop.id },
  });
  console.log(`   [OK] Đã xóa gian hàng có ID: ${newShop.id}`);
}

// -------------------------------------------------------------------
// 4. CRUD ĐỐI TƯỢNG ORDER (ĐƠN HÀNG)
// -------------------------------------------------------------------
async function demoOrderCRUD() {
  printHeader('CRUD: ĐỐI TƯỢNG ORDER (ĐƠN HÀNG)');

  const [buyer] = await sequelize.query('SELECT id FROM users LIMIT 1;', { type: QueryTypes.SELECT });
  const [shop] = await sequelize.query('SELECT id FROM shops LIMIT 1;', { type: QueryTypes.SELECT });
  const buyerId = buyer ? buyer.id : 'a0000000-0000-0000-0000-000000000003';
  const shopId = shop ? shop.id : 'd0000000-0000-0000-0000-000000000001';

  // 1. CREATE
  console.log('\n1. [CREATE] Tạo đơn hàng mới:');
  const [newOrder] = await sequelize.query(
    `INSERT INTO orders ("buyerId", "shopId", total, "shippingFee", status, "paymentMethod", "paymentStatus", note)
     VALUES (:buyerId, :shopId, 329000, 30000, 'pending', 'COD', 'unpaid', 'Giao hàng giờ hành chính')
     RETURNING id, total, status, "paymentMethod", "paymentStatus";`,
    { replacements: { buyerId, shopId }, type: QueryTypes.SELECT }
  );
  console.log('   [OK] Đã tạo đơn hàng thành công:', newOrder);

  // 2. READ
  console.log('\n2. [READ] Tra cứu đơn hàng theo ID:');
  const [readOrder] = await sequelize.query(
    'SELECT id, total, status, "paymentMethod", "paymentStatus", "createdAt" FROM orders WHERE id = :id;',
    { replacements: { id: newOrder.id }, type: QueryTypes.SELECT }
  );
  console.log('   [OK] Dữ liệu đơn hàng:', readOrder);

  // 3. UPDATE
  console.log('\n3. [UPDATE] Cập nhật trạng thái đơn hàng sang Đang vận chuyển (shipped):');
  const [updatedOrder] = await sequelize.query(
    `UPDATE orders 
     SET status = 'shipped', carrier = 'Viettel Post', "trackingCode" = 'VTP998877', "updatedAt" = NOW() 
     WHERE id = :id 
     RETURNING id, status, carrier, "trackingCode";`,
    { replacements: { id: newOrder.id }, type: QueryTypes.SELECT }
  );
  console.log('   [OK] Đã cập nhật trạng thái đơn hàng:', updatedOrder);

  // 4. DELETE
  console.log('\n4. [DELETE] Xóa/Hủy đơn hàng khỏi hệ thống:');
  await sequelize.query('DELETE FROM orders WHERE id = :id;', {
    replacements: { id: newOrder.id },
  });
  console.log(`   [OK] Đã xóa đơn hàng có ID: ${newOrder.id}`);
}

// -------------------------------------------------------------------
// MAIN FUNCTION
// -------------------------------------------------------------------
async function main() {
  const args = process.argv.slice(2);
  try {
    await sequelize.authenticate();
    console.log('[INFO] Đã kết nối cơ sở dữ liệu thành công.');

    if (args.includes('--sv1') || args.includes('--product')) {
      await demoProductCRUD();
    } else if (args.includes('--sv2') || args.includes('--user')) {
      await demoUserCRUD();
    } else if (args.includes('--sv3') || args.includes('--shop')) {
      await demoShopCRUD();
    } else if (args.includes('--sv4') || args.includes('--order')) {
      await demoOrderCRUD();
    } else {
      // Chạy toàn bộ
      await demoProductCRUD();
      await demoUserCRUD();
      await demoShopCRUD();
      await demoOrderCRUD();
    }

    console.log('\n====================================================================\n');
  } catch (error) {
    console.error('\n[ERROR] Lỗi trong quá trình chạy CRUD demo:', error.message);
  } finally {
    await sequelize.close();
  }
}

main();

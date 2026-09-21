/**
 * ===================================================================
 * SOUVENIRSHOP - MODULE KẾT NỐI CƠ SỞ DỮ LIỆU (dbconnection.js)
 * Đáp ứng Yêu cầu 4 trong bài tập nhóm môn Thiết kế web nâng cao
 * ===================================================================
 */

const path = require('path');
const fs = require('fs');

// 1. Tải biến môi trường
const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
} else {
  require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
}

const { Sequelize } = require('sequelize');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/souvenirshop';

const sequelize = new Sequelize(connectionString, {
  dialect: 'postgres',
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

/**
 * Hàm kiểm tra kết nối CSDL và hiển thị thông tin phục vụ chụp ảnh minh chứng
 */
async function testConnection() {
  console.log('\n====================================================================');
  console.log('   SOUVENIRSHOP - KIỂM TRA KẾT NỐI CƠ SỞ DỮ LIỆU POSTGRESQL');
  console.log('====================================================================');

  try {
    await sequelize.authenticate();

    const [timeResult] = await sequelize.query("SELECT NOW() as current_time, current_database() as db_name;");
    const [tablesResult] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    const info = timeResult[0] || {};
    const tables = tablesResult.map(t => t.table_name);

    console.log(' [SUCCESS] Kết nối đến PostgreSQL Database THÀNH CÔNG!');
    console.log('--------------------------------------------------------------------');
    console.log(` - Tên Database:         ${info.db_name || 'souvenirshop'}`);
    console.log(` - Thời gian máy chủ DB: ${info.current_time}`);
    console.log(` - Tổng số bảng public:  ${tables.length} bảng`);
    if (tables.length > 0) {
      console.log(` - Danh sách bảng:       ${tables.join(', ')}`);
    }
    console.log('====================================================================\n');
    return true;
  } catch (error) {
    console.error('\n[ERROR] KẾT NỐI THẤT BẠI!');
    console.error(' - Chi tiết lỗi:', error.message);
    console.log('\nGợi ý khắc phục:');
    console.log(' 1. Đảm bảo PostgreSQL Server đã được khởi động trên máy (hoặc Docker).');
    console.log(' 2. Kiểm tra lại user/password trong file .env');
    console.log(' 3. Đảm bảo đã tạo database tên là "souvenirshop" và chạy file database.sql\n');
    return false;
  }
}

if (require.main === module) {
  testConnection().then((success) => {
    sequelize.close();
    process.exit(success ? 0 : 1);
  });
}

module.exports = {
  sequelize,
  testConnection,
};

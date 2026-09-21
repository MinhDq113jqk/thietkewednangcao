/**
 * ===================================================================
 * SOUVENIRSHOP - MODULE KẾT NỐI CƠ SỞ DỮ LIỆU (dbconnection.js)
 * Đáp ứng Yêu cầu 4 trong bài tập nhóm môn Thiết kế web nâng cao
 * ===================================================================
 */

const path = require('path');
const fs = require('fs');

// 1. Định cấu hình module loader để nạp packages từ source/backend/node_modules
const backendModules = path.resolve(__dirname, 'source/backend/node_modules');
if (fs.existsSync(backendModules) && !module.paths.includes(backendModules)) {
  module.paths.unshift(backendModules);
}

// 2. Tải biến môi trường từ source/backend/.env hoặc .env cục bộ
const envPaths = [
  path.resolve(__dirname, 'source/backend/.env'),
  path.resolve(__dirname, '.env'),
  path.resolve(__dirname, '../source/backend/.env'),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    try {
      require('dotenv').config({ path: envPath });
    } catch (e) {
      // Tự phân tích .env nếu dotenv chưa require được
      const content = fs.readFileSync(envPath, 'utf8');
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

// 3. Sử dụng Sequelize hoặc pg Pool để kết nối PostgreSQL
let Sequelize;
try {
  Sequelize = require('sequelize').Sequelize;
} catch (e) {
  try {
    Sequelize = require(path.resolve(backendModules, 'sequelize')).Sequelize;
  } catch (err) {
    console.error('Không tìm thấy thư viện sequelize. Vui lòng chạy npm install trong source/backend');
  }
}

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/souvenirshop';

let sequelize = null;
if (Sequelize) {
  sequelize = new Sequelize(connectionString, {
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  });
}

/**
 * Hàm kiểm tra kết nối CSDL và hiển thị thông tin phục vụ chụp ảnh minh chứng
 */
async function testConnection() {
  console.log('\n====================================================================');
  console.log('   SOUVENIRSHOP - KIỂM TRA KẾT NỐI CƠ SỞ DỮ LIỆU POSTGRESQL');
  console.log('====================================================================');

  if (!sequelize) {
    console.error('[ERROR] Không thể khởi tạo kết nối Sequelize.');
    return false;
  }

  try {
    await sequelize.authenticate();

    // Truy vấn thông tin server và danh sách bảng
    const [timeResult] = await sequelize.query("SELECT NOW() as current_time, current_database() as db_name, version() as version;");
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
    console.log(' 2. Kiểm tra lại user/password trong file source/backend/.env');
    console.log('    Ví dụ: DATABASE_URL=postgresql://postgres:MatKhauCuaBan@localhost:5432/souvenirshop');
    console.log(' 3. Đảm bảo đã tạo database tên là "souvenirshop" và chạy file database.sql\n');
    return false;
  }
}

// Nếu file được thực thi trực tiếp qua terminal: node dbconnection.js
if (require.main === module) {
  testConnection().then((success) => {
    if (sequelize) {
      sequelize.close();
    }
    process.exit(success ? 0 : 1);
  });
}

module.exports = {
  sequelize,
  testConnection,
};

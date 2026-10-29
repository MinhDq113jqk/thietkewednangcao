const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const initLocalEnv = (directory = path.resolve(__dirname, '../..')) => {
  const target = path.join(directory, '.env');
  if (fs.existsSync(target)) return false;

  let content = fs.readFileSync(path.join(directory, '.env.example'), 'utf8');
  for (const name of ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'SEED_ACCOUNT_PASSWORD']) {
    const value = crypto.randomBytes(48).toString('base64url');
    content = content.replace(new RegExp(`^${name}=.*$`, 'm'), `${name}=${value}`);
  }
  fs.writeFileSync(target, content, { flag: 'wx', mode: 0o600 });
  return true;
};

if (require.main === module) {
  const created = initLocalEnv();
  console.log(created
    ? 'Đã tạo backend/.env và sinh secrets local. Cập nhật DATABASE_URL theo PostgreSQL của bạn.'
    : 'backend/.env đã có; giữ nguyên cấu hình hiện tại.');
}

module.exports = { initLocalEnv };

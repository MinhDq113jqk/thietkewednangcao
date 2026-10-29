const fs = require('node:fs');
const path = require('node:path');
const { sequelize, connectDB } = require('./connection');
const { databaseFailure } = require('./check');
const { backfillProductSources } = require('./backfillProductSources');

const migrate = async () => {
  await connectDB();
  const sql = fs.readFileSync(path.resolve(__dirname, '../../../docs/database/schema.sql'), 'utf8');
  await sequelize.transaction(async (transaction) => {
    await sequelize.query("SET LOCAL statement_timeout = '60s'; SET LOCAL lock_timeout = '5s'", { transaction, logging: false });
    await sequelize.query(sql, { transaction, logging: false });
    await backfillProductSources(transaction);
  });
};

if (require.main === module) {
  migrate()
    .then(() => console.log('Migration hoàn thành. Schema và nguồn sản phẩm đã được cập nhật; dữ liệu nghiệp vụ hiện có được giữ nguyên.'))
    .catch((error) => {
      console.error(JSON.stringify({
        ...databaseFailure(error),
        code: error.original?.code || error.code || 'MIGRATION_FAILED',
        constraint: error.original?.constraint,
        message: 'Migration thất bại; các thay đổi schema trong lần chạy này đã rollback. Kiểm tra kết nối, quyền DB và ràng buộc dữ liệu.',
      }));
      process.exitCode = 1;
    })
    .finally(() => sequelize.close());
}

module.exports = { migrate };

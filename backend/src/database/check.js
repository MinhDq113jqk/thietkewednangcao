const { sequelize, connectDB } = require('./connection');
const models = require('../models');

const databaseFailure = (error) => {
  if (error.code === 'DB_SCHEMA_MISSING') {
    return { code: error.code, message: error.message, details: error.details };
  }

  const reason = error.original?.code || error.parent?.code || error.code;
  const messages = {
    '28P01': 'Thông tin đăng nhập PostgreSQL không đúng. Kiểm tra DATABASE_URL trong backend/.env.',
    '3D000': 'Database chưa tồn tại. Tạo database trước rồi chạy npm run migrate.',
    ECONNREFUSED: 'Không kết nối được PostgreSQL. Kiểm tra dịch vụ PostgreSQL và host/port trong DATABASE_URL.',
    ENOTFOUND: 'Không tìm thấy máy chủ PostgreSQL. Kiểm tra host trong DATABASE_URL.',
  };

  return {
    code: 'DATABASE_UNAVAILABLE',
    message: messages[reason] || 'PostgreSQL chưa sẵn sàng. Kiểm tra kết nối và DATABASE_URL trong backend/.env.',
  };
};

const checkDatabase = async () => {
  await connectDB();
  const [columns] = await sequelize.query(
    "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'",
    { logging: false }
  );
  const missingTables = [];
  const missingColumns = [];
  const [indexes] = await sequelize.query("SELECT indexname FROM pg_indexes WHERE schemaname='public'", { logging: false });
  const indexNames = new Set(indexes.map((index) => index.indexname));
  const missingIndexes = ['addresses_one_default_per_user', 'reviews_one_per_order_product_user',
    'bank_receipts_reference_unique', 'payment_allocations_receipt_unique', 'orders_payment_expiry_due',
    'return_cases_request_unique', 'return_lines_item_unique', 'refunds_reference_unique',
    'cod_entries_reference_unique', 'cod_entries_collection_unique', 'seller_ledger_source_unique',
    'settlement_periods_request_unique', 'settlement_periods_draft_unique', 'settlement_items_unique',
    'seller_payouts_period_unique', 'seller_payouts_reference_unique', 'auth_sessions_user_active',
    'auth_action_tokens_user', 'notification_outbox_due', 'notification_outbox_user', 'support_tickets_requester',
    'support_tickets_queue', 'support_messages_ticket', 'audit_events_resource', 'audit_events_created',
    'orders_buyer_page', 'orders_shop_page', 'orders_buyer_status_page', 'orders_shop_status_page', 'product_stock_updates_request_unique']
    .filter((name) => !indexNames.has(name));
  const [triggers] = await sequelize.query("SELECT tgname FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid WHERE NOT tgisinternal AND c.relnamespace = 'public'::regnamespace", { logging: false });
  const triggerNames = new Set(triggers.map((trigger) => trigger.tgname));
  const missingTriggers = ['bank_receipts_immutable', 'payment_allocations_immutable', 'payment_allocations_validate',
    'refunds_immutable', 'refunds_validate', 'cod_entries_immutable', 'cod_entries_validate',
    'bank_receipts_credit_reference', 'cod_entries_credit_reference', 'seller_ledger_validate',
    'settlement_items_validate', 'settlement_periods_close', 'settlement_periods_immutable',
    'seller_payouts_validate', 'refunds_debit_reference', 'seller_payouts_debit_reference',
    'settlement_policies_immutable', 'seller_ledger_immutable', 'settlement_items_immutable', 'seller_payouts_immutable',
    'orders_notify', 'shops_notify', 'audit_events_immutable', 'moderation_actions_immutable', 'support_messages_immutable',
    'bank_receipts_audit', 'payment_allocations_audit', 'refunds_audit', 'cod_entries_audit', 'settlement_policies_audit',
    'seller_ledger_audit', 'seller_payouts_audit', 'settlement_periods_audit', 'moderation_actions_audit',
    'products_stock_revision', 'product_stock_updates_immutable']
    .filter((name) => !triggerNames.has(name));

  for (const model of Object.values(models)) {
    const table = model.getTableName();
    const present = new Set(columns.filter((column) => column.table_name === table).map((column) => column.column_name));
    if (!present.size) {
      missingTables.push(table);
      continue;
    }
    for (const [attribute, definition] of Object.entries(model.getAttributes())) {
      const column = definition.field || attribute;
      if (!present.has(column)) missingColumns.push(`${table}.${column}`);
    }
  }

  if (missingTables.length || missingColumns.length || missingIndexes.length || missingTriggers.length) {
    throw Object.assign(new Error('Schema chưa đầy đủ. Chạy npm run migrate trong backend.'), {
      code: 'DB_SCHEMA_MISSING',
      details: { missingTables, missingColumns, missingIndexes, missingTriggers },
    });
  }

  return { status: 'ok', database: 'connected', schema: 'ready', tables: Object.keys(models).length };
};

if (require.main === module) {
  checkDatabase()
    .then((status) => console.log(JSON.stringify(status)))
    .catch((error) => {
      console.error(JSON.stringify(databaseFailure(error)));
      process.exitCode = 1;
    })
    .finally(() => sequelize.close());
}

module.exports = { checkDatabase, databaseFailure };

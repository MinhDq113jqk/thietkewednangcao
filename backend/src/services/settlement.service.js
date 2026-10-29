const crypto = require('node:crypto');
const { Op, Transaction } = require('sequelize');
const { sequelize } = require('../database/connection');
const { Shop, Order, PaymentAllocation, Refund, ReturnCase, SettlementPolicy, SellerLedger,
  SettlementPeriod, SettlementItem, SellerPayout } = require('../models');
const { codSummary } = require('./codReconciliation.service');
const { fail, uuid, text, money, occurredAt, fact, paging, recheck } = require('./commerceValidation');

const sum = (rows) => {
  const value = rows.reduce((total, row) => total + BigInt(row.amount), 0n);
  if (value > 999999999999999n || value < -999999999999999n) fail('Số dư vượt giới hạn xử lý. Cần đối chiếu thủ công.', 409);
  return Number(value);
};
const commission = (amount, bps) => Number((BigInt(amount) * BigInt(bps) + 5000n) / 10000n);
const key = (value) => {
  const result = text(value, 'Khóa yêu cầu', 8, 120);
  if (!/^[a-z0-9._:-]+$/i.test(result)) fail('Khóa yêu cầu không hợp lệ');
  return result;
};
const object = (body) => { if (!body || typeof body !== 'object' || Array.isArray(body)) fail('Nội dung không hợp lệ'); };
const shopFor = async (id, actor, transaction, lock = false) => {
  const shop = await Shop.findOne({ where: actor.role === 'admin' ? { id: uuid(id) } : { ownerId: actor.id },
    transaction, ...(lock ? { lock: transaction.LOCK.NO_KEY_UPDATE } : {}) });
  if (!shop) fail('Không tìm thấy gian hàng', 404);
  return shop;
};
const ordersFor = (shopId, transaction, lock = false) => Order.findAll({ where: { shopId }, order: [['id', 'ASC']],
  transaction, ...(lock ? { lock: transaction.LOCK.UPDATE } : {}) });
const latestPolicy = (shopId, transaction) => SettlementPolicy.findOne({ where: { shopId }, order: [['createdAt', 'DESC'], ['id', 'DESC']], transaction });
const ledgerFor = (shopId, transaction) => SellerLedger.findAll({ where: { shopId }, order: [['createdAt', 'ASC'], ['id', 'ASC']], transaction });

// Caller holds the order lock. Refund amounts are applied to merchandise first;
// shipping above merchandise does not reduce the seller's merchandise twice.
const syncPostedRefunds = async (order, transaction) => {
  const sale = await SellerLedger.findOne({ where: { orderId: order.id, kind: 'sale' }, transaction });
  if (!sale) return;
  const refunds = await Refund.findAll({ where: { orderId: order.id }, order: [['createdAt', 'ASC'], ['id', 'ASC']], transaction });
  const existing = new Set((await SellerLedger.findAll({ where: { orderId: order.id }, transaction })).map((row) => row.sourceKey));
  let returned = 0;
  const total = Number(sale.amount);
  const bps = sale.metadata.commissionBps;
  for (const refund of refunds) {
    const next = Math.min(total, returned + Number(refund.amount));
    const base = { shopId: order.shopId, orderId: order.id, policyId: sale.policyId, refundId: refund.id,
      effectiveAt: refund.occurredAt, availableAt: refund.createdAt, metadata: { reference: refund.reference },
      note: 'Hoàn tiền theo chứng từ đã ghi nhận' };
    for (const [kind, amount] of [['refund', -(next - returned)], ['commission_refund', commission(total - returned, bps) - commission(total - next, bps)]]) {
      const sourceKey = `${refund.id}:${kind}`;
      if (amount && !existing.has(sourceKey)) await SellerLedger.create({ ...base, kind, amount, sourceKey }, { transaction });
    }
    returned = next;
  }
};

const syncOrders = async (orders, policy, transaction) => {
  const skipped = { unverified: 0, undelivered: 0 };
  for (const order of orders) {
    const sale = await SellerLedger.findOne({ where: { orderId: order.id, kind: 'sale' }, transaction });
    if (!sale) {
      if (!['delivered', 'returned'].includes(order.status) || !order.deliveredAt) { skipped.undelivered++; continue; }
      const total = money(order.total, true);
      const shipping = money(order.shippingFee || 0, true);
      let extraCarrierFee = 0;
      let sources;
      if (order.paymentMethod === 'bank_transfer') {
        const allocations = await PaymentAllocation.findAll({ where: { orderId: order.id }, transaction });
        if (sum(allocations) !== total + shipping) { skipped.unverified++; continue; }
        sources = { allocationIds: allocations.map((row) => row.id) };
      } else if (order.paymentMethod === 'cod') {
        const cod = await codSummary(order, transaction);
        if (cod.status !== 'reconciled' || cod.collectionDifference !== 0) { skipped.unverified++; continue; }
        extraCarrierFee = Math.max(0, cod.carrierFee - shipping);
        sources = { collected: cod.collectedAmount, remitted: cod.remittedAmount, carrierFee: cod.carrierFee };
      } else { skipped.unverified++; continue; }
      if (!policy) fail('Cần xác nhận chính sách hoa hồng cho gian hàng trước khi ghi sổ', 409, 'SETTLEMENT_POLICY_REQUIRED');
      const days = require('./afterSales.service').returnWindowDays();
      const base = { shopId: order.shopId, orderId: order.id, policyId: policy.id, effectiveAt: order.deliveredAt,
        availableAt: new Date(new Date(order.deliveredAt).getTime() + days * 86400000),
        metadata: { commissionBps: policy.commissionBps, holdDays: days, ...sources } };
      for (const [kind, amount, note] of [['sale', total, 'Tiền hàng đã giao, có đủ chứng từ thu tiền'],
        ['commission', -commission(total, policy.commissionBps), 'Hoa hồng theo chính sách đã xác nhận'],
        ['carrier_fee', -extraCarrierFee, 'Phí COD vượt phí vận chuyển thu từ khách']]) {
        if (amount) await SellerLedger.create({ ...base, kind, amount, note, sourceKey: `${order.id}:${kind}` }, { transaction });
      }
    }
    await syncPostedRefunds(order, transaction);
  }
  return skipped;
};

// All mutations lock shop -> orders (stable UUID order). Existing finance and
// return writers already lock orders, so payout sees either side of their commit.
const mutateShop = (shopId, actor, callback) => sequelize.transaction(async (transaction) => {
  const shop = await shopFor(shopId, actor, transaction, true);
  const orders = await ordersFor(shop.id, transaction, true);
  return callback({ shop, orders, transaction });
}).catch(recheck);

const savePolicy = (shopId, body, actor) => {
  object(body);
  if (!Number.isInteger(body.commissionBps) || body.commissionBps < 0 || body.commissionBps > 10000) fail('Hoa hồng phải từ 0 đến 100%, tối đa hai chữ số thập phân');
  const note = text(body.note, 'Lý do chính sách');
  return mutateShop(shopId, actor, async ({ shop, transaction }) => {
    const current = await latestPolicy(shop.id, transaction);
    if (current?.commissionBps === body.commissionBps && current.note === note) return { policy: current, idempotentReplay: true };
    const policy = await SettlementPolicy.create({ shopId: shop.id, commissionBps: body.commissionBps, note, recordedBy: actor.id }, { transaction });
    return { policy, idempotentReplay: false };
  });
};
const synchronize = (shopId, actor) => mutateShop(shopId, actor, async ({ shop, orders, transaction }) => ({
  skipped: await syncOrders(orders, await latestPolicy(shop.id, transaction), transaction),
}));

const candidates = async (shopId, entries, orders, transaction, cutoff = new Date(), ownPeriodId) => {
  const reserved = await SettlementItem.findAll({ include: [{ model: SettlementPeriod, as: 'period',
    where: { shopId, status: { [Op.ne]: 'cancelled' }, ...(ownPeriodId ? { id: { [Op.ne]: ownPeriodId } } : {}) } }], transaction });
  const used = new Set(reserved.map((row) => row.entryId));
  const claims = await ReturnCase.findAll({ attributes: ['orderId'], include: [{ model: Order, as: 'order', attributes: [], where: { shopId } }],
    where: { status: { [Op.in]: ['requested', 'approved', 'received'] } }, transaction });
  const held = new Set(claims.map((row) => row.orderId));
  const grouped = new Map();
  for (const entry of entries) if (!used.has(entry.id)) {
    const rows = grouped.get(entry.orderId) || [];
    rows.push(entry); grouped.set(entry.orderId, rows);
  }
  const selected = [];
  let heldAmount = 0;
  for (const [orderId, rows] of grouped) {
    const amount = sum(rows);
    const order = orders.find((row) => row.id === orderId);
    // Debts cannot be skipped by choosing an earlier cutoff or by opening a claim.
    if (amount <= 0 || (!held.has(orderId) && ['delivered', 'returned'].includes(order?.status)
      && rows.every((row) => new Date(row.availableAt) <= new Date() && new Date(row.effectiveAt) <= cutoff))) selected.push(...rows);
    else heldAmount += amount;
  }
  return { entries: selected, amount: sum(selected), heldAmount };
};

const createPeriod = (shopId, body, actor) => {
  object(body);
  const requestKey = key(body.requestKey);
  const cutoffAt = occurredAt(body.cutoffAt);
  const note = text(body.note, 'Ghi chú kỳ quyết toán');
  const requestHash = crypto.createHash('sha256').update(JSON.stringify({ cutoffAt, note })).digest('hex');
  return mutateShop(shopId, actor, async ({ shop, orders, transaction }) => {
    const existing = await SettlementPeriod.findOne({ where: { shopId: shop.id, requestKey }, transaction });
    if (existing) {
      if (existing.requestHash !== requestHash) fail('Khóa yêu cầu đã dùng cho nội dung khác', 409);
      return { period: existing, idempotentReplay: true };
    }
    if (await SettlementPeriod.findOne({ where: { shopId: shop.id, status: 'draft' }, transaction })) fail('Cần chi trả hoặc hủy kỳ đang chờ trước khi lập kỳ mới', 409);
    await syncOrders(orders, await latestPolicy(shop.id, transaction), transaction);
    const selected = await candidates(shop.id, await ledgerFor(shop.id, transaction), orders, transaction, cutoffAt);
    if (selected.amount <= 0) fail('Chưa có số dư dương đủ điều kiện quyết toán', 409, 'NO_SETTLEMENT_BALANCE');
    const period = await SettlementPeriod.create({ shopId: shop.id, requestKey, requestHash, cutoffAt, note,
      amount: selected.amount, createdBy: actor.id }, { transaction });
    await SettlementItem.bulkCreate(selected.entries.map((entry) => ({ periodId: period.id, entryId: entry.id })), { transaction });
    return { period, idempotentReplay: false };
  });
};

const periodFor = async (id, actor) => {
  const period = await SettlementPeriod.findByPk(uuid(id));
  if (!period) fail('Không tìm thấy kỳ quyết toán', 404);
  const shop = await shopFor(period.shopId, actor);
  if (shop.id !== period.shopId) fail('Không tìm thấy kỳ quyết toán', 404);
  return period;
};
const cancelPeriod = async (id, body, actor) => {
  object(body);
  const note = text(body.note, 'Lý do hủy kỳ');
  const initial = await periodFor(id, actor);
  return mutateShop(initial.shopId, actor, async ({ transaction }) => {
    const period = await SettlementPeriod.findByPk(initial.id, { transaction, lock: transaction.LOCK.UPDATE });
    if (period.status === 'cancelled' && period.closeNote === note) return { period, idempotentReplay: true };
    if (period.status !== 'draft') fail('Chỉ hủy kỳ chưa chi trả', 409);
    await period.update({ status: 'cancelled', closedBy: actor.id, closedAt: new Date(), closeNote: note }, { transaction });
    return { period, idempotentReplay: false };
  });
};
const recordPayout = async (id, body, actor) => {
  object(body);
  const data = { ...fact({ ...body, kind: 'payout' }), beneficiary: text(body.beneficiary, 'Người nhận trên chứng từ', 5, 200) };
  const initial = await periodFor(id, actor);
  return mutateShop(initial.shopId, actor, async ({ shop, orders, transaction }) => {
    const period = await SettlementPeriod.findByPk(initial.id, { transaction, lock: transaction.LOCK.UPDATE });
    const existing = await SellerPayout.findOne({ where: { periodId: period.id }, transaction });
    if (existing) {
      if (!['reference', 'evidence', 'note', 'beneficiary'].every((field) => existing[field] === data[field])
        || Number(existing.amount) !== data.amount || new Date(existing.occurredAt).getTime() !== data.occurredAt.getTime()) fail('Kỳ đã có chứng từ chi trả khác', 409, 'PAYOUT_ALREADY_RECORDED');
      return { payout: existing, period, idempotentReplay: true };
    }
    if (period.status !== 'draft' || data.amount !== Number(period.amount)) fail('Số tiền phải khớp kỳ quyết toán đang chờ', 409);
    await syncOrders(orders, await latestPolicy(shop.id, transaction), transaction);
    const entries = await ledgerFor(shop.id, transaction);
    const selected = await candidates(shop.id, entries, orders, transaction, new Date(period.cutoffAt), period.id);
    const items = await SettlementItem.findAll({ where: { periodId: period.id }, transaction });
    const selectedIds = new Set(selected.entries.map((entry) => entry.id));
    if (items.length !== selectedIds.size || items.some((item) => !selectedIds.has(item.entryId)) || selected.amount !== data.amount) {
      fail('Số dư hoặc điều kiện đơn đã thay đổi. Hủy kỳ và lập lại trước khi ghi nhận chi trả.', 409, 'SETTLEMENT_STALE');
    }
    const payout = await SellerPayout.create({ ...data, shopId: shop.id, periodId: period.id, recordedBy: actor.id }, { transaction });
    await period.update({ status: 'paid', closedBy: actor.id, closedAt: new Date(), closeNote: data.note }, { transaction });
    return { payout, period, idempotentReplay: false };
  });
};

const recordAdjustment = (shopId, body, actor) => {
  object(body);
  if (!['credit', 'debit'].includes(body.direction)) fail('Chọn tăng hoặc giảm số dư');
  const data = fact({ ...body, kind: 'adjustment' });
  const orderId = uuid(body.orderId);
  const amount = data.amount * (body.direction === 'debit' ? -1 : 1);
  const sourceKey = `adjustment:${data.reference}`;
  return mutateShop(shopId, actor, async ({ shop, orders, transaction }) => {
    if (!orders.some((order) => order.id === orderId)) fail('Không tìm thấy đơn thuộc gian hàng', 404);
    const existing = await SellerLedger.findOne({ where: { sourceKey }, transaction });
    if (existing) {
      if (existing.shopId !== shop.id || existing.orderId !== orderId || Number(existing.amount) !== amount
        || existing.note !== data.note || existing.evidence !== data.evidence || new Date(existing.effectiveAt).getTime() !== data.occurredAt.getTime()) fail('Mã điều chỉnh đã dùng cho nội dung khác', 409);
      return { entry: existing, idempotentReplay: true };
    }
    await syncOrders(orders, await latestPolicy(shop.id, transaction), transaction);
    const sale = await SellerLedger.findOne({ where: { orderId, kind: 'sale' }, transaction });
    if (!sale) fail('Chỉ điều chỉnh đơn đã có tiền hàng trong sổ quyết toán', 409);
    const entry = await SellerLedger.create({ shopId: shop.id, orderId, policyId: sale.policyId, sourceKey, kind: 'adjustment',
      amount, effectiveAt: data.occurredAt, availableAt: amount > 0 ? sale.availableAt : new Date(),
      note: data.note, evidence: data.evidence, recordedBy: actor.id, metadata: { reference: data.reference } }, { transaction });
    return { entry, idempotentReplay: false };
  });
};

const listShops = async (query) => {
  const { page, limit, offset } = paging(query);
  const search = query.search ? text(query.search, 'Tên gian hàng', 1, 150) : '';
  const { rows, count } = await Shop.findAndCountAll({ attributes: ['id', 'name', 'status'],
    where: search ? { name: { [Op.iLike]: `%${search}%` } } : {}, order: [['name', 'ASC'], ['id', 'ASC']], limit, offset });
  return { items: rows, page, total: count, totalPages: Math.max(1, Math.ceil(count / limit)) };
};
const statementFigures = async (shopId, transaction) => {
  const [entries, orders, payouts, draft] = await Promise.all([
    ledgerFor(shopId, transaction), ordersFor(shopId, transaction),
    SellerPayout.findAll({ where: { shopId }, transaction }),
    SettlementPeriod.findOne({ where: { shopId, status: 'draft' }, transaction }),
  ]);
  const available = await candidates(shopId, entries, orders, transaction);
  const amountFor = kinds => sum(entries.filter(entry => kinds.includes(entry.kind)));
  return { entries, payouts,
    totals: { postedGross: amountFor(['sale', 'refund']), refunds: -amountFor(['refund']),
      commission: -amountFor(['commission', 'commission_refund']), carrierFee: -amountFor(['carrier_fee']),
      adjustments: amountFor(['adjustment']), net: sum(entries) },
    summary: { ledgerAmount: sum(entries), paidAmount: sum(payouts), outstanding: sum(entries) - sum(payouts),
      available: Math.max(0, available.amount), carryDebt: Math.max(0, -available.amount), heldAmount: available.heldAmount, reserved: Number(draft?.amount || 0) } };
};
const readStatement = (shopId, query, actor) => sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ }, async (transaction) => {
  const shop = await shopFor(shopId, actor, transaction);
  const { entries, payouts, summary } = await statementFigures(shop.id, transaction);
  const ledgerPaging = paging({ ...query, page: query.ledgerPage });
  const periodPaging = paging({ ...query, page: query.periodPage });
  const periods = await SettlementPeriod.findAndCountAll({ where: { shopId: shop.id }, order: [['createdAt', 'DESC'], ['id', 'ASC']],
    limit: periodPaging.limit, offset: periodPaging.offset, transaction });
  return { shop: { id: shop.id, name: shop.name }, policy: await latestPolicy(shop.id, transaction),
    summary,
    ledger: { items: entries.slice().reverse().slice(ledgerPaging.offset, ledgerPaging.offset + ledgerPaging.limit), page: ledgerPaging.page, total: entries.length, totalPages: Math.max(1, Math.ceil(entries.length / ledgerPaging.limit)) },
    periods: { items: periods.rows.map((period) => ({ ...period.toJSON(), payout: payouts.find((row) => row.periodId === period.id) || null })), page: periodPaging.page, total: periods.count, totalPages: Math.max(1, Math.ceil(periods.count / periodPaging.limit)) } };
});
const readPeriod = async (id, query, actor) => {
  const period = await periodFor(id, actor);
  const { page, limit, offset } = paging(query);
  const { rows, count } = await SettlementItem.findAndCountAll({ where: { periodId: period.id }, include: [{ model: SellerLedger, as: 'entry' }], order: [['id', 'ASC']], limit, offset });
  return { period, payout: await SellerPayout.findOne({ where: { periodId: period.id } }), items: rows.map((row) => row.entry), page, total: count, totalPages: Math.max(1, Math.ceil(count / limit)) };
};
module.exports = { savePolicy, synchronize, createPeriod, cancelPeriod, recordPayout, recordAdjustment,
  listShops, readStatement, readPeriod, syncPostedRefunds, commission, statementFigures };

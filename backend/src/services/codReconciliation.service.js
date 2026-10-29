const { UniqueConstraintError, Op } = require('sequelize');
const { sequelize } = require('../database/connection');
const { Order, CodEntry, Refund, PaymentTransaction, PaymentAllocation, BankReceipt, Shop } = require('../models');
const { getOrderPaymentAmount } = require('./paymentState.service');
const { fail, uuid, fact, money, text, paging, recheck } = require('./commerceValidation');

const codSummary = async (order, transaction) => {
  const entries = await CodEntry.findAll({ where: { orderId: order.id }, transaction, order: [['createdAt', 'ASC'], ['id', 'ASC']] });
  const collection = entries.find((entry) => entry.kind === 'collection');
  const collectedAmount = Number(collection?.amount || 0);
  const remittedAmount = entries.filter((entry) => entry.kind === 'remittance').reduce((sum, entry) => sum + Number(entry.amount), 0);
  const carrierFee = entries.reduce((sum, entry) => sum + Number(entry.fee), 0);
  const refundedAmount = Number(await Refund.sum('amount', { where: { orderId: order.id, source: 'cod_order' }, transaction }) || 0);
  const pendingRemittance = Math.max(0, collectedAmount - remittedAmount - carrierFee);
  const expectedAmount = getOrderPaymentAmount(order);
  return { expectedAmount, collectedAmount, remittedAmount, carrierFee, refundedAmount, pendingRemittance,
    collectionDifference: collection ? collectedAmount - expectedAmount : null,
    refundableAmount: Math.max(0, Math.min(collectedAmount, remittedAmount + carrierFee) - refundedAmount),
    legacyUnverified: !collection && order.paymentStatus === 'paid',
    status: !collection ? 'awaiting_collection' : pendingRemittance === 0 ? 'reconciled'
      : remittedAmount + carrierFee > 0 ? 'partially_remitted' : 'awaiting_remittance' };
};

const recordCodEntry = async (id, body, actorId) => {
  const orderId = uuid(id);
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail('Chứng từ COD không hợp lệ');
  if (!['collection', 'remittance'].includes(body.kind)) fail('Chọn ghi nhận thu hộ hoặc chuyển tiền về');
  const data = { ...fact(body), fee: money(body.fee ?? 0, true), kind: body.kind, orderId };
  if (data.kind === 'collection' && data.fee !== 0) fail('Phí vận chuyển được ghi khi đối soát tiền chuyển về');
  if (data.kind === 'remittance' && data.amount + data.fee <= 0) fail('Cần số tiền chuyển về hoặc phí');
  const same = (row) => ['reference', 'kind', 'orderId', 'evidence', 'note'].every((key) => row[key] === data[key])
    && Number(row.amount) === data.amount && Number(row.fee) === data.fee && new Date(row.occurredAt).getTime() === data.occurredAt.getTime();
  try {
    return await sequelize.transaction(async (transaction) => {
      const order = await Order.findByPk(orderId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!order) fail('Không tìm thấy đơn hàng', 404);
      const existing = await CodEntry.findOne({ where: { reference: data.reference }, transaction });
      if (existing) {
        if (!same(existing)) fail('Mã giao dịch COD đã được dùng với nội dung khác', 409, 'COD_REFERENCE_REUSED');
        return { entry: existing, summary: await codSummary(order, transaction), idempotentReplay: true };
      }
      if (order.paymentMethod !== 'cod' || !['delivered', 'returned'].includes(order.status)) fail('Chỉ ghi nhận COD cho đơn đã giao', 409);
      if (!order.carrier || !order.trackingCode) {
        await order.update({ carrier: order.carrier || text(body.carrier, 'Đơn vị vận chuyển trên chứng từ', 2, 100),
          trackingCode: order.trackingCode || text(body.trackingCode, 'Mã vận đơn trên chứng từ', 3, 120) }, { transaction });
      }
      const summary = await codSummary(order, transaction);
      if (data.kind === 'collection' && summary.status !== 'awaiting_collection') fail('Đơn đã có chứng từ thu hộ', 409);
      if (data.kind === 'remittance' && (summary.status === 'awaiting_collection' || data.amount + data.fee > summary.pendingRemittance)) fail('Tiền chuyển về và phí vượt số tiền còn ở đơn vị vận chuyển', 409);
      const entry = await CodEntry.create({ ...data, recordedBy: actorId }, { transaction });
      if (data.kind === 'collection') {
        const paid = data.amount >= summary.expectedAmount;
        const payment = await PaymentTransaction.findOne({ where: { orderId }, transaction, lock: transaction.LOCK.UPDATE });
        const values = { provider: 'cod', status: paid ? 'paid' : 'pending', amount: summary.expectedAmount,
          reference: data.reference, confirmedAt: paid ? data.occurredAt : null, confirmedBy: actorId,
          metadata: { ...(payment?.metadata || {}), source: 'cod_collection_evidence', collectedAmount: data.amount } };
        if (payment) await payment.update(values, { transaction });
        else await PaymentTransaction.create({ orderId, ...values }, { transaction });
        await order.update({ paymentStatus: paid ? 'paid' : 'unpaid' }, { transaction });
      }
      return { entry, summary: await codSummary(order, transaction), idempotentReplay: false };
    });
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      const row = await CodEntry.findOne({ where: { reference: data.reference } });
      if (row && same(row)) return { entry: row, summary: await codSummary(await Order.findByPk(orderId)), idempotentReplay: true };
      fail('Mã giao dịch hoặc chứng từ thu hộ đã tồn tại', 409, 'COD_REFERENCE_REUSED');
    }
    recheck(error);
  }
};

const listCodOrders = async (query, actor, sellerOnly = false) => {
  const { page, limit, offset } = paging(query);
  const where = { paymentMethod: 'cod', status: { [Op.in]: ['shipping', 'delivered', 'returned'] } };
  if (sellerOnly) {
    const shop = await Shop.findOne({ where: { ownerId: actor.id } });
    if (!shop) fail('Bạn chưa có gian hàng', 404);
    where.shopId = shop.id;
  }
  if (query.orderId) where.id = uuid(query.orderId);
  const { rows, count } = await Order.findAndCountAll({ where, order: [['createdAt', 'DESC'], ['id', 'ASC']], limit, offset });
  const items = await Promise.all(rows.map(async (order) => ({ id: order.id, deliveryStatus: order.status, carrier: order.carrier,
    trackingCode: order.trackingCode, deliveredAt: order.deliveredAt, ...await codSummary(order) })));
  return { items, total: count, page, totalPages: Math.max(1, Math.ceil(count / limit)) };
};

const getOrderFinance = async (id) => {
  const order = await Order.findByPk(uuid(id));
  if (!order) fail('Không tìm thấy đơn hàng', 404);
  const allocations = await PaymentAllocation.findAll({ where: { orderId: order.id }, include: [{ model: BankReceipt, as: 'receipt' }], order: [['createdAt', 'ASC']] });
  const refunds = await Refund.findAll({ where: { orderId: order.id }, order: [['createdAt', 'ASC']] });
  const sources = allocations.map((allocation) => ({ receiptId: allocation.receiptId, reference: allocation.receipt.reference,
    allocatedAmount: Number(allocation.amount), refundableAmount: Number(allocation.amount) - refunds.filter((row) => row.receiptId === allocation.receiptId).reduce((sum, row) => sum + Number(row.amount), 0) }));
  return { id: order.id, status: order.status, paymentStatus: order.paymentStatus, paymentMethod: order.paymentMethod,
    carrier: order.carrier, trackingCode: order.trackingCode,
    sources, refunds, cod: order.paymentMethod === 'cod' ? await codSummary(order) : null,
    codEntries: order.paymentMethod === 'cod' ? await CodEntry.findAll({ where: { orderId: order.id }, order: [['createdAt', 'ASC']] }) : [],
    legacyUnverified: order.paymentStatus === 'paid' && !allocations.length && order.paymentMethod === 'bank_transfer' };
};
module.exports = { codSummary, recordCodEntry, listCodOrders, getOrderFinance };

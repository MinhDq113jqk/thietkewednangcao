const { Op, UniqueConstraintError, literal } = require('sequelize');
const { sequelize } = require('../database/connection');
const { Order, BankReceipt, PaymentAllocation, PaymentTransaction, Refund } = require('../models');
const { buildOrderTransferInfo } = require('./vietqr.service');
const { getOrderPaymentAmount } = require('./paymentState.service');
const { expireLockedOrder, isPaymentOverdue } = require('./paymentExpiry.service');

const fail = (message, status = 400, code = 'INVALID_RECEIPT') => {
  throw Object.assign(new Error(message), { status, code });
};
const uuid = (value) => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
const textField = (value, name, min, max) => {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) {
    fail(`${name} phải có từ ${min} đến ${max} ký tự`);
  }
  return value.trim();
};
const normalizeContent = (value) => String(value || '').replace(/[^a-z0-9]/gi, '').toUpperCase();

const orderPaymentSummary = async (order, transaction) => {
  if (order.paymentMethod === 'cod') {
    const cod = await require('./codReconciliation.service').codSummary(order, transaction);
    return { expectedAmount: cod.expectedAmount, allocatedAmount: cod.collectedAmount,
      refundedAmount: cod.refundedAmount, outstandingAmount: Math.max(0, cod.expectedAmount - cod.collectedAmount), cod };
  }
  const allocatedAmount = Number(await PaymentAllocation.sum('amount', { where: { orderId: order.id }, transaction }) || 0);
  const refundedAmount = Number(await Refund.sum('amount', { where: { orderId: order.id }, transaction }) || 0);
  const expectedAmount = getOrderPaymentAmount(order);
  const legacyPayment = order.paymentStatus === 'paid' && allocatedAmount === 0;
  return { expectedAmount, allocatedAmount, refundedAmount, legacyPayment,
    outstandingAmount: order.paymentStatus === 'refunded' || legacyPayment ? 0 : Math.max(0, expectedAmount - allocatedAmount),
    transferReference: buildOrderTransferInfo(order.id) };
};

const reviewReason = (receipt, order, summary) => {
  if (!order) return 'unmatched';
  if (order.paymentMethod !== 'bank_transfer') return 'wrong_method';
  if (order.expiredAt) return 'expired';
  if (['cancelled', 'returned'].includes(order.status) || order.paymentStatus === 'refunded') return 'order_closed';
  if (isPaymentOverdue(order) || (order.paymentExpiresAt && new Date(receipt.receivedAt) > new Date(order.paymentExpiresAt))) return 'late_payment';
  // Bank statements may report whole seconds; allow that precision difference.
  if (new Date(receipt.receivedAt).getTime() + 1000 < new Date(order.createdAt).getTime()) return 'predates_order';
  if (summary.legacyPayment) return 'legacy_payment';
  if (summary.outstandingAmount === 0) return 'overpayment';
  if (!normalizeContent(receipt.transferContent).includes(normalizeContent(summary.transferReference))) return 'content_mismatch';
  return 'ready';
};

const serializeReceipt = async (receipt, transaction) => {
  const value = receipt.toJSON();
  const allocation = await PaymentAllocation.findOne({ where: { receiptId: receipt.id }, transaction });
  const orderId = allocation?.orderId || receipt.orderId;
  const order = orderId ? await Order.findByPk(orderId, { transaction }) : null;
  const summary = order ? await orderPaymentSummary(order, transaction) : null;
  const allocatedAmount = Number(allocation?.amount || 0);
  const refunds = await Refund.findAll({ where: { receiptId: receipt.id }, transaction });
  const refundedAmount = refunds.reduce((sum, row) => sum + Number(row.amount), 0);
  const refundedExcess = refunds.filter((row) => row.source === 'receipt_excess').reduce((sum, row) => sum + Number(row.amount), 0);
  const unappliedAmount = Number(receipt.amount) - allocatedAmount - refundedExcess;
  const allocatedRemaining = allocatedAmount - (refundedAmount - refundedExcess);
  const closedWithFunds = allocation && allocatedRemaining > 0
    && (order?.expiredAt || ['cancelled', 'returned'].includes(order?.status));
  return { ...value, allocation, allocatedAmount, refundedAmount, refunds, unappliedAmount,
    heldForReviewAmount: unappliedAmount + (closedWithFunds ? allocatedRemaining : 0),
    reason: refundedAmount >= Number(receipt.amount) ? 'fully_refunded' : closedWithFunds ? (order.expiredAt ? 'expired' : 'order_closed')
      : allocation ? (unappliedAmount > 0 ? 'overpayment' : 'matched') : reviewReason(receipt, order, summary),
    orderSummary: order ? { id: order.id, status: order.status, paymentStatus: order.paymentStatus, ...summary } : null };
};

const recordBankReceipt = async (body, actorId) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail('Nội dung giao dịch không hợp lệ');
  const reference = textField(body.reference, 'Mã giao dịch ngân hàng', 3, 120).toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9._:/-]{2,119}$/.test(reference)) fail('Mã giao dịch ngân hàng không hợp lệ');
  // Reject coercions such as booleans, exponent strings, arrays and fractional VND.
  if (!(typeof body.amount === 'number' || (typeof body.amount === 'string' && /^[1-9]\d{0,14}$/.test(body.amount)))) fail('Số tiền phải là số nguyên VND dương');
  const amount = Number(body.amount);
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 999999999999999) fail('Số tiền phải là số nguyên VND dương, tối đa 15 chữ số');
  if (typeof body.receivedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(body.receivedAt)) fail('Thời điểm nhận tiền phải có múi giờ');
  const receivedAt = new Date(body.receivedAt);
  const day = new Date(`${body.receivedAt.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(receivedAt.getTime()) || !Number.isFinite(day.getTime())
    || day.toISOString().slice(0, 10) !== body.receivedAt.slice(0, 10)
    || receivedAt.getTime() > Date.now() + 60000) fail('Thời điểm nhận tiền không hợp lệ hoặc vượt quá một phút trong tương lai');
  const transferContent = textField(body.transferContent, 'Nội dung chuyển khoản', 0, 500);
  const evidence = textField(body.evidence, 'Bằng chứng đối soát', 5, 1000);
  const suppliedOrderId = body.orderId === '' || body.orderId == null ? null : body.orderId;
  if (suppliedOrderId !== null && !uuid(suppliedOrderId)) fail('Mã đơn hàng không hợp lệ');
  const orderId = suppliedOrderId?.toLowerCase() || null;
  if (orderId && !await Order.findByPk(orderId)) fail('Không tìm thấy đơn hàng', 404, 'ORDER_NOT_FOUND');
  const data = { reference, amount, receivedAt, transferContent, evidence, orderId, recordedBy: actorId };
  let receipt;
  let replay = false;
  try { receipt = await BankReceipt.create(data); }
  catch (error) {
    if (error.original?.code === '23514') fail('Chứng từ không hợp lệ hoặc mã tiền vào đã dùng để đối soát COD', 409, 'BANK_CREDIT_REFERENCE_REUSED');
    if (!(error instanceof UniqueConstraintError)) throw error;
    receipt = await BankReceipt.findOne({ where: { reference } });
    if (!receipt || Number(receipt.amount) !== amount || new Date(receipt.receivedAt).getTime() !== receivedAt.getTime()
      || receipt.transferContent !== transferContent || receipt.evidence !== evidence || receipt.orderId !== orderId) {
      fail('Mã giao dịch đã tồn tại với nội dung khác; cần kiểm tra sao kê', 409, 'RECEIPT_REFERENCE_REUSED');
    }
    replay = true;
  }
  return { receipt: await serializeReceipt(receipt), idempotentReplay: replay };
};

const allocateBankReceipt = async (receiptId, body, actorId) => {
  if (!body || typeof body !== 'object') fail('Nội dung phân bổ không hợp lệ');
  if (!uuid(receiptId) || !uuid(body.orderId)) fail('Mã giao dịch hoặc mã đơn hàng không hợp lệ');
  const targetId = body.orderId.toLowerCase();
  const note = textField(body.note, 'Lý do đối soát', 10, 1000);
  if (body.verifyLegacy !== undefined && typeof body.verifyLegacy !== 'boolean') fail('Lựa chọn xác minh đơn cũ không hợp lệ');
  return sequelize.transaction(async (transaction) => {
    const receipt = await BankReceipt.findByPk(receiptId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!receipt) fail('Không tìm thấy giao dịch', 404, 'RECEIPT_NOT_FOUND');
    const existing = await PaymentAllocation.findOne({ where: { receiptId }, transaction });
    if (existing) {
      if (existing.orderId !== targetId) fail('Giao dịch đã được phân bổ cho đơn khác', 409, 'RECEIPT_ALREADY_ALLOCATED');
      return { receipt: await serializeReceipt(receipt, transaction), idempotentReplay: true, allocated: true };
    }
    const order = await Order.findByPk(targetId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!order) fail('Không tìm thấy đơn hàng', 404, 'ORDER_NOT_FOUND');
    await expireLockedOrder(order, transaction);
    const summary = await orderPaymentSummary(order, transaction);
    const reason = reviewReason(receipt, order, summary);
    const legacyVerification = body.verifyLegacy === true;
    if (legacyVerification && (order.paymentMethod !== 'bank_transfer' || !summary.legacyPayment || order.expiredAt
      || new Date(receipt.receivedAt).getTime() + 1000 < new Date(order.createdAt).getTime())) {
      fail('Chỉ xác minh chứng từ gốc cho đơn chuyển khoản cũ đã thanh toán, chưa có phân bổ', 409, 'LEGACY_VERIFICATION_INVALID');
    }
    if (!legacyVerification && !['ready', 'content_mismatch'].includes(reason)) {
      return { receipt: await serializeReceipt(receipt, transaction), allocated: false, reason,
        message: 'Khoản tiền được giữ trong hàng chờ xử lý; đơn không được khôi phục tự động' };
    }
    const returned = Number(await Refund.sum('amount', { where: { receiptId }, transaction }) || 0);
    if (legacyVerification && Number(receipt.amount) - returned < summary.expectedAmount) fail('Chứng từ gốc phải đủ toàn bộ tiền của đơn cũ', 409);
    const amount = legacyVerification ? summary.expectedAmount : Math.min(Number(receipt.amount) - returned, summary.outstandingAmount);
    if (amount <= 0) fail('Giao dịch đã được hoàn hết tiền', 409, 'RECEIPT_FULLY_REFUNDED');
    await PaymentAllocation.create({ receiptId, orderId: order.id, amount, note, allocatedBy: actorId, legacyVerification }, { transaction });
    const allocatedAmount = summary.allocatedAmount + amount;
    const status = allocatedAmount >= summary.expectedAmount ? 'paid' : 'pending';
    const payment = await PaymentTransaction.findOne({ where: { orderId: order.id }, transaction, lock: transaction.LOCK.UPDATE });
    const values = { provider: payment?.provider || 'manual', status, amount: summary.expectedAmount,
      reference: summary.transferReference, confirmedAt: status === 'paid' ? new Date() : null,
      confirmedBy: status === 'paid' ? actorId : null,
      metadata: { ...(payment?.metadata || {}), allocatedAmount, lastReceiptId: receipt.id } };
    if (payment) await payment.update(values, { transaction });
    else await PaymentTransaction.create({ orderId: order.id, ...values }, { transaction });
    if (status === 'paid') await order.update({ paymentStatus: 'paid' }, { transaction });
    return { receipt: await serializeReceipt(receipt, transaction), allocated: true, idempotentReplay: false };
  }).catch((error) => {
    if (error.original?.code === '23514') {
      fail('Số dư hoặc hạn thanh toán vừa thay đổi. Vui lòng tải lại và đối soát lại giao dịch.', 409, 'ALLOCATION_RECHECK_REQUIRED');
    }
    throw error;
  });
};

const listBankReceipts = async (query) => {
  const page = Math.max(1, Math.min(100000, Number.parseInt(query.page, 10) || 1));
  const limit = Math.max(1, Math.min(100, Number.parseInt(query.limit, 10) || 20));
  const where = query.reviewOnly === 'true'
    ? { [Op.and]: literal(`("BankReceipt"."amount" - coalesce("allocation"."amount", 0)
      - coalesce((SELECT sum(r.amount) FROM refunds r WHERE r."receiptId" = "BankReceipt".id AND r.source = 'receipt_excess'), 0) > 0
      OR ("allocation->order"."status" IN ('cancelled', 'returned') AND "allocation".amount
        - coalesce((SELECT sum(r.amount) FROM refunds r WHERE r."receiptId" = "BankReceipt".id AND r.source = 'bank_order'), 0) > 0))`) } : {};
  const { rows, count } = await BankReceipt.findAndCountAll({ where,
    include: [{ model: PaymentAllocation, as: 'allocation', include: [{ model: Order, as: 'order', attributes: [] }] }],
    order: [['createdAt', 'DESC'], ['id', 'ASC']], limit, offset: (page - 1) * limit });
  return { items: await Promise.all(rows.map((row) => serializeReceipt(row))), total: count, page, limit,
    totalPages: Math.max(1, Math.ceil(count / limit)) };
};

const getBankReceipt = async (id) => {
  if (!uuid(id)) fail('Mã giao dịch không hợp lệ');
  const receipt = await BankReceipt.findByPk(id);
  if (!receipt) fail('Không tìm thấy giao dịch', 404);
  return serializeReceipt(receipt);
};
module.exports = { orderPaymentSummary, recordBankReceipt, allocateBankReceipt, listBankReceipts, getBankReceipt };

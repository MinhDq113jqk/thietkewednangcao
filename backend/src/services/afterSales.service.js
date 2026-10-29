const crypto = require('crypto');
const { Op, UniqueConstraintError } = require('sequelize');
const { sequelize } = require('../database/connection');
const { Order, OrderItem, ReturnCase, ReturnLine, Refund, Product, Shop, BankReceipt, PaymentAllocation, PaymentTransaction } = require('../models');
const { deleteByPattern } = require('../config/redis');
const { restockLockedOrder } = require('./orderCancellation.service');
const { appendTrackingEvent } = require('./orderTracking.service');
const { codSummary } = require('./codReconciliation.service');
const { fail, uuid, text, money, fact, paging, recheck } = require('./commerceValidation');

const returnWindowDays = () => Math.max(1, Math.min(90, Number.parseInt(process.env.RETURN_WINDOW_DAYS, 10) || 7));
const history = (claim, action, actorId, note) => [...(claim?.history || []), { action, actorId, note, at: new Date().toISOString() }];
const includeCases = [
  { model: ReturnLine, as: 'lines', include: [{ model: OrderItem, as: 'item' }] },
  { model: Order, as: 'order', attributes: ['id', 'shopId', 'status', 'paymentMethod', 'carrier', 'trackingCode'] },
];
const assertOwner = async (order, actor, manage = false, transaction) => {
  if (actor.role === 'admin') return;
  if (!manage && order.buyerId === actor.id) return;
  if (actor.role === 'seller') {
    const shop = await Shop.findOne({ where: { id: order.shopId, ownerId: actor.id }, transaction });
    if (shop) return;
  }
  fail('Không tìm thấy yêu cầu hoặc đơn hàng', 404);
};
const serializeCase = async (claim, transaction) => ({ ...claim.toJSON(),
  refundedAmount: Number(await Refund.sum('amount', { where: { caseId: claim.id }, transaction }) || 0) });
const readCase = async (id, transaction) => serializeCase(await ReturnCase.findByPk(id, { include: includeCases, transaction }), transaction);

const createCase = async (id, body, actor) => {
  const orderId = uuid(id);
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail('Nội dung yêu cầu không hợp lệ');
  if (!['return_refund', 'exchange', 'complaint'].includes(body.kind)) fail('Loại yêu cầu không hợp lệ');
  const requestKey = text(body.requestKey, 'Khóa yêu cầu', 8, 120);
  if (!/^[a-z0-9._:-]+$/i.test(requestKey)) fail('Khóa yêu cầu không hợp lệ');
  const reason = text(body.reason, 'Lý do', 10, 2000);
  if (!Array.isArray(body.evidence) || body.evidence.length < 1 || body.evidence.length > 5) fail('Cần từ 1 đến 5 bằng chứng');
  // Private textual evidence/references; no public upload URL is created or fetched.
  const evidence = body.evidence.map((entry) => text(entry, 'Bằng chứng', 5, 1000));
  if (!Array.isArray(body.lines) || body.lines.length < 1 || body.lines.length > 100) fail('Cần chọn sản phẩm và số lượng');
  const lines = body.lines.map((line) => {
    if (!line || typeof line !== 'object' || Array.isArray(line)) fail('Sản phẩm yêu cầu không hợp lệ');
    const quantity = line.quantity;
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100000) fail('Số lượng yêu cầu không hợp lệ');
    return { orderItemId: uuid(line.orderItemId), quantity };
  }).sort((a, b) => a.orderItemId.localeCompare(b.orderItemId));
  if (new Set(lines.map((line) => line.orderItemId)).size !== lines.length) fail('Sản phẩm bị lặp');
  const requestedAmount = money(body.requestedAmount ?? 0, true);
  if (body.kind === 'exchange' && requestedAmount !== 0) fail('Yêu cầu đổi cùng sản phẩm không có khoản hoàn tiền');
  const requestHash = crypto.createHash('sha256').update(JSON.stringify({ orderId, kind: body.kind, reason, evidence, lines, requestedAmount })).digest('hex');
  const replay = async (transaction) => {
    const existing = await ReturnCase.findOne({ where: { buyerId: actor.id, requestKey }, transaction });
    if (!existing) return null;
    if (existing.requestHash !== requestHash) fail('Khóa yêu cầu đã dùng cho nội dung khác', 409, 'RETURN_KEY_REUSED');
    return { claim: await readCase(existing.id, transaction), idempotentReplay: true };
  };
  try {
    return await sequelize.transaction(async (transaction) => {
      const order = await Order.findOne({ where: { id: orderId, buyerId: actor.id }, transaction, lock: transaction.LOCK.UPDATE });
      if (!order) fail('Không tìm thấy đơn hàng', 404);
      const existing = await replay(transaction);
      if (existing) return existing;
      if (body.kind === 'complaint' ? !['shipping', 'delivered', 'returned'].includes(order.status) : order.status !== 'delivered') fail('Trạng thái đơn chưa cho phép yêu cầu này', 409);
      const deadline = new Date(order.deliveredAt || order.updatedAt).getTime() + returnWindowDays() * 86400000;
      if (order.status !== 'shipping' && Date.now() > deadline) fail(`Đã quá thời hạn ${returnWindowDays()} ngày gửi yêu cầu. Vui lòng liên hệ hỗ trợ.`, 409, 'RETURN_WINDOW_CLOSED');
      const items = await OrderItem.findAll({ where: { orderId }, transaction });
      const existingLines = await ReturnLine.findAll({ include: [{ model: ReturnCase, as: 'case', where: { orderId, status: { [Op.ne]: 'rejected' }, kind: { [Op.ne]: 'complaint' } } }], transaction });
      let ceiling = 0;
      for (const line of lines) {
        const item = items.find((entry) => entry.id === line.orderItemId);
        const reserved = body.kind === 'complaint' ? 0 : existingLines.filter((entry) => entry.orderItemId === line.orderItemId).reduce((sum, entry) => sum + entry.quantity, 0);
        if (!item || line.quantity + reserved > item.quantity) fail('Số lượng vượt số sản phẩm còn đủ điều kiện đổi trả', 409, 'RETURN_QUANTITY_EXCEEDED');
        ceiling += Number(item.price) * line.quantity;
      }
      if (lines.reduce((sum, line) => sum + line.quantity, 0) === items.reduce((sum, item) => sum + item.quantity, 0)) ceiling += Number(order.shippingFee || 0);
      if (requestedAmount > ceiling || (body.kind === 'return_refund' && requestedAmount === 0)) fail('Số tiền yêu cầu vượt giá trị sản phẩm đã chọn hoặc bằng 0');
      const claim = await ReturnCase.create({ orderId, buyerId: actor.id, requestKey, requestHash,
        kind: body.kind, reason, evidence, requestedAmount, history: history(null, 'requested', actor.id, reason) }, { transaction });
      await ReturnLine.bulkCreate(lines.map((line) => ({ ...line, caseId: claim.id })), { transaction });
      return { claim: await readCase(claim.id, transaction), idempotentReplay: false };
    });
  } catch (error) {
    if (error instanceof UniqueConstraintError) { const existing = await replay(); if (existing) return existing; }
    recheck(error);
  }
};

const listCases = async (query, actor, mode) => {
  const { page, limit, offset } = paging(query);
  const where = {};
  if (query.orderId) where.orderId = uuid(query.orderId);
  if (query.status) {
    if (!['requested', 'approved', 'rejected', 'received', 'resolved'].includes(query.status)) fail('Trạng thái yêu cầu không hợp lệ');
    where.status = query.status;
  }
  const include = [...includeCases];
  if (mode === 'buyer') where.buyerId = actor.id;
  if (mode === 'seller') {
    const shop = await Shop.findOne({ where: { ownerId: actor.id } });
    if (!shop) fail('Bạn chưa có gian hàng', 404);
    include[1] = { ...include[1], where: { shopId: shop.id } };
  }
  const { rows, count } = await ReturnCase.findAndCountAll({ where, include, distinct: true,
    limit, offset, order: [['createdAt', 'DESC'], ['id', 'ASC']] });
  return { items: await Promise.all(rows.map((row) => serializeCase(row))), total: count, page,
    totalPages: Math.max(1, Math.ceil(count / limit)), returnWindowDays: returnWindowDays() };
};

const transitionCase = async (id, body, actor) => {
  const caseId = uuid(id);
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail('Nội dung xử lý không hợp lệ');
  const note = text(body.note, 'Ghi chú xử lý');
  const unlocked = await ReturnCase.findByPk(caseId);
  if (!unlocked) fail('Không tìm thấy yêu cầu', 404);
  return sequelize.transaction(async (transaction) => {
    const order = await Order.findByPk(unlocked.orderId, { transaction, lock: transaction.LOCK.UPDATE });
    await assertOwner(order, actor, true, transaction);
    const claim = await ReturnCase.findByPk(caseId, { transaction, lock: transaction.LOCK.UPDATE });
    const lines = await ReturnLine.findAll({ where: { caseId }, include: [{ model: OrderItem, as: 'item' }], transaction });
    let values;
    if (body.action === 'approve' || body.action === 'reject') {
      if (claim.status !== 'requested') fail('Yêu cầu đã được xử lý. Tải lại trạng thái.', 409);
      const approvedAmount = body.action === 'approve' ? money(body.approvedAmount ?? 0, true) : 0;
      if (approvedAmount > Number(claim.requestedAmount) || (claim.kind === 'return_refund' && body.action === 'approve' && approvedAmount === 0)) fail('Số tiền duyệt không hợp lệ');
      values = { status: body.action === 'approve' ? 'approved' : 'rejected', approvedAmount };
    } else if (body.action === 'receive') {
      if (claim.status !== 'approved' || claim.kind === 'complaint') fail('Chỉ nhận hàng hoàn đã được duyệt', 409);
      if (!Array.isArray(body.lines) || body.lines.length !== lines.length || body.lines.some((line) => !line || typeof line !== 'object') || new Set(body.lines.map((line) => line.orderItemId)).size !== lines.length) fail('Cần kết quả kiểm hàng cho từng sản phẩm');
      const products = await Product.findAll({ where: { id: { [Op.in]: [...new Set(lines.map((line) => line.item.productId))] } }, order: [['id', 'ASC']], transaction, lock: transaction.LOCK.UPDATE });
      for (const line of lines) {
        const inspection = body.lines.find((entry) => entry.orderItemId === line.orderItemId);
        if (!inspection || typeof inspection.restock !== 'boolean') fail('Chọn rõ hàng có thể bán lại cho từng sản phẩm');
        const product = products.find((entry) => entry.id === line.item.productId);
        if (!product) fail('Không tìm thấy sản phẩm để cập nhật tồn', 409);
        if (inspection.restock) await require('./inventory.service').change({ variantId: line.item.variantId, availableDelta: line.quantity,
          kind: 'return', sourceKey: `return:${caseId}:${line.id}`, actorId: actor.id, orderId: order.id, reason: note }, transaction);
        await product.update({ sold: Math.max(0, Number(product.sold) - line.quantity) }, { transaction });
        await line.update({ restock: inspection.restock }, { transaction });
      }
      values = { status: 'received' };
      if (claim.kind === 'return_refund') {
        const [result] = await sequelize.query(`SELECT coalesce(sum(l.quantity), 0)::int AS quantity FROM return_lines l JOIN return_cases c ON c.id = l."caseId" WHERE c."orderId" = :orderId AND c.kind = 'return_refund' AND (c.status IN ('received', 'resolved') OR c.id = :caseId)`, { replacements: { orderId: order.id, caseId }, transaction });
        const totalQty = Number(await OrderItem.sum('quantity', { where: { orderId: order.id }, transaction }));
        if (result[0].quantity >= totalQty) await order.update({ status: 'returned', trackingHistory: appendTrackingEvent(order, { status: 'returned', note: 'Đã nhận đủ hàng trả về' }) }, { transaction });
      }
      transaction.afterCommit(() => deleteByPattern('products:*').catch(() => {}));
    } else if (body.action === 'resolve') {
      if (claim.kind === 'exchange') {
        if (claim.status !== 'received') fail('Cần nhận hàng hoàn trước khi gửi hàng đổi', 409);
        const replacement = { carrier: text(body.carrier, 'Đơn vị vận chuyển', 2, 100), trackingCode: text(body.trackingCode, 'Mã vận đơn hàng đổi', 3, 120), shippedAt: new Date().toISOString() };
        const products = await Product.findAll({ where: { id: { [Op.in]: [...new Set(lines.map((line) => line.item.productId))] } }, order: [['id', 'ASC']], transaction, lock: transaction.LOCK.UPDATE });
        for (const line of lines) {
          const product = products.find((entry) => entry.id === line.item.productId);
          if (!product || !product.isActive || product.moderationHidden) fail('Không đủ tồn kho để gửi hàng đổi cùng sản phẩm', 409);
          await require('./inventory.service').change({ variantId: line.item.variantId, availableDelta: -line.quantity,
            kind: 'exchange', sourceKey: `exchange:${caseId}:${line.id}`, actorId: actor.id, orderId: order.id, reason: note }, transaction);
          await product.increment('sold', { by: line.quantity, transaction });
        }
        values = { status: 'resolved', replacement };
        transaction.afterCommit(() => deleteByPattern('products:*').catch(() => {}));
      } else {
        const requiredStatus = claim.kind === 'complaint' ? 'approved' : 'received';
        if (claim.status !== requiredStatus) fail('Yêu cầu chưa đủ điều kiện kết thúc', 409);
        const refunded = Number(await Refund.sum('amount', { where: { caseId }, transaction }) || 0);
        if (refunded < Number(claim.approvedAmount)) fail('Cần ghi nhận đủ khoản hoàn tiền đã duyệt trước khi kết thúc', 409);
        values = { status: 'resolved' };
      }
    } else fail('Thao tác xử lý không hợp lệ');
    await claim.update({ ...values, history: history(claim, body.action, actor.id, note) }, { transaction });
    return { claim: await readCase(caseId, transaction) };
  }).catch(recheck);
};

const recordRefund = async (body, actorId) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail('Chứng từ hoàn tiền không hợp lệ');
  if (!['receipt_excess', 'bank_order', 'cod_order'].includes(body.source)) fail('Nguồn hoàn tiền không hợp lệ');
  const data = { ...fact({ ...body, kind: 'refund' }), source: body.source,
    receiptId: body.source === 'cod_order' ? null : uuid(body.receiptId),
    orderId: body.source === 'receipt_excess' ? null : uuid(body.orderId),
    caseId: body.caseId ? uuid(body.caseId) : null };
  if (data.source === 'receipt_excess' && data.caseId) fail('Hoàn tiền chưa phân bổ không gắn yêu cầu đổi trả');
  const same = (row) => ['reference', 'source', 'orderId', 'receiptId', 'caseId', 'evidence', 'note'].every((key) => row[key] === data[key])
    && Number(row.amount) === data.amount && new Date(row.occurredAt).getTime() === data.occurredAt.getTime();
  try {
    return await sequelize.transaction(async (transaction) => {
      if (data.receiptId && !await BankReceipt.findByPk(data.receiptId, { transaction, lock: transaction.LOCK.UPDATE })) fail('Không tìm thấy giao dịch gốc', 404);
      const order = data.orderId ? await Order.findByPk(data.orderId, { transaction, lock: transaction.LOCK.UPDATE }) : null;
      if (data.orderId && !order) fail('Không tìm thấy đơn hàng', 404);
      const existing = await Refund.findOne({ where: { reference: data.reference }, transaction });
      if (existing) {
        if (!same(existing)) fail('Mã giao dịch hoàn tiền đã dùng cho nội dung khác', 409, 'REFUND_REFERENCE_REUSED');
        return { refund: existing, idempotentReplay: true };
      }
      // A pre-fulfilment refund closes the reservation atomically, including partially funded orders.
      if (order && !data.caseId && ['pending', 'confirmed', 'packing'].includes(order.status)) await restockLockedOrder(order, transaction, 'Hủy đơn để hoàn tiền theo chứng từ');
      const refund = await Refund.create({ ...data, recordedBy: actorId }, { transaction });
      if (order) {
        const refunded = Number(await Refund.sum('amount', { where: { orderId: order.id }, transaction }) || 0);
        const collected = order.paymentMethod === 'cod' ? (await codSummary(order, transaction)).collectedAmount
          : Number(await PaymentAllocation.sum('amount', { where: { orderId: order.id }, transaction }) || 0);
        if (collected > 0 && refunded >= collected) {
          await order.update({ paymentStatus: 'refunded' }, { transaction });
          const payment = await PaymentTransaction.findOne({ where: { orderId: order.id }, transaction, lock: transaction.LOCK.UPDATE });
          if (payment) await payment.update({ status: 'refunded', metadata: { ...payment.metadata, refundedAmount: refunded } }, { transaction });
        }
        if (data.caseId) {
          const claim = await ReturnCase.findByPk(data.caseId, { transaction, lock: transaction.LOCK.UPDATE });
          await claim.update({ history: history(claim, 'refund_recorded', actorId, `Ghi nhận hoàn ${data.amount} VND. ${data.note}`) }, { transaction });
        }
      }
      if (order) await require('./settlement.service').syncPostedRefunds(order, transaction);
      return { refund, idempotentReplay: false };
    });
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      const row = await Refund.findOne({ where: { reference: data.reference } });
      if (row && same(row)) return { refund: row, idempotentReplay: true };
      fail('Mã giao dịch hoàn tiền đã tồn tại', 409, 'REFUND_REFERENCE_REUSED');
    }
    recheck(error);
  }
};
module.exports = { createCase, listCases, transitionCase, recordRefund, returnWindowDays };

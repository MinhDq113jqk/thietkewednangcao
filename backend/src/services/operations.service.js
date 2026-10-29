const { sequelize } = require('../database/connection');
const { User, Shop, Product, Review, Order, Notification, SupportTicket, SupportMessage, AuditEvent, ModerationAction } = require('../models');
const { fail, uuid, text, paging } = require('./commerceValidation');
const { enqueue, publicFields } = require('./notification.service');
const { deleteByPattern } = require('../config/redis');
const page = async (model, where, query, extra = {}) => {
  const { page, limit, offset } = paging(query);
  const { rows, count } = await model.findAndCountAll({ where, ...extra, order: [['createdAt', 'DESC'], ['id', 'DESC']], limit, offset });
  return { items: rows, total: count, page, limit, totalPages: Math.ceil(count / limit) };
};
const audit = (actorId, action, resourceType, resourceId, details, transaction) =>
  AuditEvent.create({ actorId, action, resourceType, resourceId, details }, { transaction });
const ticketWhere = (userId, admin, id) => ({ ...(id ? { id: uuid(id) } : {}), ...(!admin ? { requesterId: userId } : {}) });
const listTickets = (userId, admin, query) => {
  const where = ticketWhere(userId, admin);
  if (query.status) {
    if (!['open', 'in_progress', 'resolved', 'closed'].includes(query.status)) fail('Trạng thái hỗ trợ không hợp lệ');
    where.status = query.status;
  }
  if (admin && query.assignedTo) where.assignedTo = uuid(query.assignedTo);
  return page(SupportTicket, where, query);
};
const getTicket = async (userId, admin, id, query) => {
  const ticket = await SupportTicket.findOne({ where: ticketWhere(userId, admin, id) });
  if (!ticket) fail('Không tìm thấy yêu cầu hỗ trợ', 404);
  const messages = await page(SupportMessage, { ticketId: ticket.id }, query, {
    include: [{ model: User, as: 'authorIdUser', attributes: ['id', 'name', 'role'] }],
  });
  return { ...ticket.toJSON(), messages };
};
const createTicket = (userId, body) => sequelize.transaction(async (transaction) => {
  const subject = text(body.subject, 'Tiêu đề', 5, 200);
  const message = text(body.message, 'Nội dung', 10, 2000);
  let orderId = null;
  if (body.orderId) {
    const order = await Order.findByPk(uuid(body.orderId), { transaction });
    const shop = order && await Shop.findByPk(order.shopId, { transaction });
    if (!order || (order.buyerId !== userId && shop.ownerId !== userId)) fail('Không tìm thấy đơn hàng', 404);
    orderId = order.id;
  }
  const ticket = await SupportTicket.create({ requesterId: userId, orderId, subject }, { transaction });
  await SupportMessage.create({ ticketId: ticket.id, authorId: userId, body: message }, { transaction });
  await audit(userId, 'support.create', 'support_tickets', ticket.id, { orderId }, transaction);
  await enqueue(userId, 'Đã tiếp nhận hỗ trợ', subject, `/support?ticket=${ticket.id}`, transaction);
  return ticket;
});
const reply = (userId, admin, id, body) => sequelize.transaction(async (transaction) => {
  const ticket = await SupportTicket.findOne({ where: ticketWhere(userId, admin, id), transaction, lock: transaction.LOCK.UPDATE });
  if (!ticket) fail('Không tìm thấy yêu cầu hỗ trợ', 404);
  if (ticket.status === 'closed') fail('Yêu cầu đã đóng. Vui lòng tạo yêu cầu mới.', 409);
  const message = await SupportMessage.create({ ticketId: ticket.id, authorId: userId,
    body: text(body.message, 'Nội dung', 1, 2000) }, { transaction });
  await ticket.update({ updatedAt: new Date(), ...(ticket.status === 'resolved' && !admin ? { status: 'open' } : {}) }, { transaction });
  await audit(userId, 'support.reply', 'support_tickets', ticket.id, { messageId: message.id }, transaction);
  const recipient = admin ? ticket.requesterId : ticket.assignedTo;
  if (recipient && recipient !== userId) await enqueue(recipient, 'Phản hồi hỗ trợ mới', ticket.subject,
    `${admin ? '/support' : '/admin/support'}?ticket=${ticket.id}`, transaction);
  return message;
});
const updateTicket = (userId, id, body) => sequelize.transaction(async (transaction) => {
  const ticket = await SupportTicket.findByPk(uuid(id), { transaction, lock: transaction.LOCK.UPDATE });
  if (!ticket) fail('Không tìm thấy yêu cầu hỗ trợ', 404);
  const values = {};
  if (body.assignedTo !== undefined) {
    if (body.assignedTo !== null) {
      const assignee = await User.findOne({ where: { id: uuid(body.assignedTo), role: 'admin', isActive: true }, transaction });
      if (!assignee) fail('Người phụ trách phải là quản trị viên đang hoạt động');
    }
    values.assignedTo = body.assignedTo;
  }
  if (body.status !== undefined) {
    const transitions = { open: ['in_progress', 'closed'], in_progress: ['open', 'resolved', 'closed'], resolved: ['open', 'closed'], closed: ['open'] };
    if (body.status !== ticket.status && !transitions[ticket.status].includes(body.status)) fail('Chuyển trạng thái hỗ trợ không hợp lệ', 409);
    values.status = body.status;
    if (['in_progress','resolved'].includes(body.status) && !(values.assignedTo ?? ticket.assignedTo)) fail('Cần chọn người phụ trách trước khi xử lý');
  }
  if (!Object.keys(values).length) fail('Thiếu thay đổi yêu cầu hỗ trợ');
  if (['in_progress', 'resolved'].includes(values.status || ticket.status)
    && !(values.assignedTo === undefined ? ticket.assignedTo : values.assignedTo)) fail('Cần chọn người phụ trách trước khi xử lý');
  const reason = text(body.reason, 'Lý do cập nhật', 5, 1000);
  const before = { status: ticket.status, assignedTo: ticket.assignedTo };
  await ticket.update(values, { transaction });
  await audit(userId, 'support.update', 'support_tickets', ticket.id, { before, after: values, reason }, transaction);
  await enqueue(ticket.requesterId, 'Cập nhật hỗ trợ', `${ticket.subject}: ${ticket.status}`, `/support?ticket=${ticket.id}`, transaction);
  return ticket;
});
const listNotifications = (userId, query, admin = false) => {
  const where = admin ? {} : { userId };
  if (admin && query.state) {
    if (!['pending','failed','sent','expired'].includes(query.state)) fail('Trạng thái gửi không hợp lệ');
    where.state = query.state;
  }
  return page(Notification, where, query, { attributes: publicFields });
};
const readNotification = async (userId, id) => {
  const [count] = await Notification.update({ readAt: new Date() }, { where: { id: uuid(id), userId } });
  if (!count) fail('Không tìm thấy thông báo', 404);
};
const retryNotification = (actorId, id) => sequelize.transaction(async (transaction) => {
  const row = await Notification.findByPk(uuid(id), { transaction, lock: transaction.LOCK.UPDATE });
  if (!row) fail('Không tìm thấy thông báo', 404);
  if (row.state !== 'failed') fail('Chỉ thử lại thông báo gửi thất bại', 409);
  await row.update({ state: 'pending', attempts: 0, nextAttemptAt: new Date(), lastError: null }, { transaction });
  await audit(actorId, 'notification.retry', 'notification_outbox', row.id, {}, transaction);
});
const moderate = async (actorId, type, id, body) => {
  if (!['shop','product','review'].includes(type)) fail('Loại nội dung không hợp lệ');
  if (!['approve','hide'].includes(body.action)) fail('Thao tác kiểm duyệt không hợp lệ');
  const reason = text(body.reason, 'Lý do kiểm duyệt', 5, 1000);
  const result = await sequelize.transaction(async (transaction) => {
    const model = { shop: Shop, product: Product, review: Review }[type];
    const row = await model.findByPk(uuid(id), { transaction, lock: transaction.LOCK.UPDATE });
    if (!row) fail('Không tìm thấy nội dung', 404);
    const hide = body.action === 'hide';
    const previous = type === 'shop' ? row.status : String(row.moderationHidden);
    await row.update(type === 'shop' ? { status: hide ? 'suspended' : 'active' } : { moderationHidden: hide }, { transaction });
    if (type === 'shop' && !hide) {
      await User.update({ role: 'seller' }, { where: { id: row.ownerId, role: 'buyer' }, transaction });
    }
    if (type === 'review') {
      const product = await Product.findByPk(row.productId, { transaction });
      const shop = await Shop.findByPk(product.shopId, { transaction, lock: transaction.LOCK.UPDATE });
      const [ratings] = await sequelize.query(`SELECT COALESCE(avg(r.rating),0) AS rating, count(*) AS count FROM reviews r
        JOIN products p ON p.id=r."productId" WHERE p."shopId"=:shopId AND r."moderationHidden"=false`,
      { replacements: { shopId: shop.id }, transaction });
      await shop.update({ rating: ratings[0].rating, reviewCount: Number(ratings[0].count) }, { transaction });
    }
    const action = await ModerationAction.create({ actorId, resourceType: type, resourceId: row.id,
      action: body.action, reason, previous, next: type === 'shop' ? row.status : String(row.moderationHidden) }, { transaction });
    const ownerId = type === 'shop' ? row.ownerId : type === 'review' ? row.userId : (await Shop.findByPk(row.shopId, { transaction })).ownerId;
    await enqueue(ownerId, 'Kết quả kiểm duyệt', `${hide ? 'Nội dung đã bị ẩn' : 'Nội dung đã được duyệt'}. Lý do: ${reason}`,
      type === 'review' ? '/orders' : '/seller', transaction);
    return action;
  });
  await deleteByPattern('products:*');
  return result;
};
const listContent = (type, query) => {
  if (!['shop','product','review'].includes(type)) fail('Loại nội dung không hợp lệ');
  const model = { shop: Shop, product: Product, review: Review }[type];
  const fields = { shop: ['id','name','status','ownerId','createdAt'], product: ['id','name','isActive','moderationHidden','shopId','createdAt'],
    review: ['id','comment','rating','moderationHidden','productId','createdAt'] }[type];
  return page(model, {}, query, { attributes: fields });
};
const listAudit = (query) => {
  const where = {};
  if (query.resourceType) where.resourceType = text(query.resourceType, 'Loại dữ liệu', 1, 60);
  if (query.resourceId) where.resourceId = uuid(query.resourceId);
  return page(AuditEvent, where, query);
};
const listModeration = (query) => page(ModerationAction, {}, query);
module.exports = { listTickets, getTicket, createTicket, reply, updateTicket, listNotifications, readNotification, retryNotification,
  moderate, listContent, listAudit, listModeration };

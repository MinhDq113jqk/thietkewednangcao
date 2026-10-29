const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { sequelize } = require('../database/connection');
const { User, AuthSession, AuthActionToken } = require('../models');
const { hashToken, signAccessToken, signRefreshToken, publicUser } = require('../utils/authTokens');
const { enqueue } = require('./notification.service');
const { fail, uuid } = require('./commerceValidation');

const validSession = async (models, payload, user) => {
  if (!payload.sid) return !user.requireSession;
  if (typeof payload.sid !== 'string' || !/^[0-9a-f-]{36}$/i.test(payload.sid)) return false;
  return Boolean(await models.AuthSession.findOne({ where: { id: payload.sid, userId: user.id,
    revokedAt: null, expiresAt: { [Op.gt]: new Date() } } }));
};
const issueSession = async (user, transaction, req, existing) => {
  const sid = existing?.id || crypto.randomUUID();
  const token = signAccessToken(user.id, user.authVersion, sid);
  const refreshToken = signRefreshToken(user.id, user.authVersion, sid);
  const expiresAt = new Date(jwt.decode(refreshToken).exp * 1000);
  const values = { tokenHash: hashToken(refreshToken), expiresAt, lastSeenAt: new Date() };
  if (existing) await existing.update(values, { transaction });
  else await AuthSession.create({ id: sid, userId: user.id, ...values,
    label: String(req.headers['user-agent'] || 'Thiết bị không xác định').replace(/[^\x20-\x7e]/g, '').slice(0, 200) }, { transaction });
  await user.update({ refreshToken: hashToken(refreshToken), requireSession: true }, { transaction });
  return { data: { token, user: publicUser(user) }, refreshToken };
};
const revokeAll = async (user, transaction, password) => {
  await user.update({ ...(password ? { password } : {}), refreshToken: null, requireSession: true,
    authVersion: user.authVersion + 1 }, { transaction });
  await AuthSession.update({ revokedAt: new Date() }, { where: { userId: user.id, revokedAt: null }, transaction });
  await AuthActionToken.update({ usedAt: new Date() }, { where: { userId: user.id, purpose: 'reset', usedAt: null }, transaction });
};
const consumeRate = async (scope, value, maximum, windowMs) => {
  const key = crypto.createHmac('sha256', process.env.JWT_REFRESH_SECRET).update(`${scope}:${value}`).digest('hex');
  const [rows] = await sequelize.query(`INSERT INTO auth_rate_limits(key,count,"expiresAt") VALUES(:key,1,:expiry)
    ON CONFLICT(key) DO UPDATE SET count=CASE WHEN auth_rate_limits."expiresAt" <= now() THEN 1 ELSE auth_rate_limits.count+1 END,
    "expiresAt"=CASE WHEN auth_rate_limits."expiresAt" <= now() THEN EXCLUDED."expiresAt" ELSE auth_rate_limits."expiresAt" END RETURNING count`,
  { replacements: { key, expiry: new Date(Date.now() + windowMs) } });
  return rows[0].count <= maximum;
};
const createAction = async (user, purpose, transaction) => {
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + (purpose === 'reset' ? 30 : 24 * 60) * 60000);
  await AuthActionToken.update({ usedAt: new Date() }, { where: { userId: user.id, purpose, usedAt: null }, transaction });
  const row = await AuthActionToken.create({ userId: user.id, purpose, tokenHash: hashToken(token), expiresAt }, { transaction });
  const path = purpose === 'reset' ? '/reset-password' : '/verify-email';
  // Fragment avoids transmitting the token in HTTP URLs or referrer headers.
  const href = new URL(path, process.env.CLIENT_URL || 'http://localhost:5173');
  href.hash = token;
  await enqueue(user.id, purpose === 'reset' ? 'Đặt lại mật khẩu' : 'Xác minh email',
    purpose === 'reset' ? 'Liên kết đặt lại mật khẩu có hiệu lực 30 phút.' : 'Liên kết xác minh email có hiệu lực 24 giờ.',
    '/profile', transaction, { href: href.href, expiresAt, actionTokenId: row.id });
};
const requestAction = async (req, purpose) => {
  if (!await consumeRate(`action-ip-${purpose}`, req.ip || 'unknown', 30, 15 * 60000)) fail('Bạn thao tác quá nhanh. Vui lòng thử lại sau.', 429);
  const email = purpose === 'verify' ? req.user.email : String(req.body.email || '').trim().toLowerCase();
  if (email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('Email không hợp lệ');
  if (!await consumeRate(`action-email-${purpose}`, email, 3, 60 * 60000)) return;
  await sequelize.transaction(async (transaction) => {
    const user = await User.findOne({ where: { email }, transaction, lock: transaction.LOCK.UPDATE });
    if (!user?.isActive || (purpose === 'verify' && user.emailVerifiedAt)) return;
    await createAction(user, purpose, transaction);
  });
};
const consumeAction = async (req, purpose) => {
  if (!await consumeRate(`consume-${purpose}`, req.ip || 'unknown', 30, 15 * 60000)) fail('Bạn thao tác quá nhanh. Vui lòng thử lại sau.', 429);
  const token = req.body.token;
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) fail('Liên kết không hợp lệ hoặc đã hết hạn');
  const newPassword = req.body.newPassword;
  if (purpose === 'reset' && (typeof newPassword !== 'string' || newPassword.length < 8 || Buffer.byteLength(newPassword) > 72)) fail('Mật khẩu cần ít nhất 8 ký tự và tối đa 72 byte');
  const found = await AuthActionToken.findOne({ where: { tokenHash: hashToken(token), purpose } });
  if (!found) fail('Liên kết không hợp lệ hoặc đã hết hạn');
  const password = purpose === 'reset' ? await bcrypt.hash(newPassword, 12) : null;
  await sequelize.transaction(async (transaction) => {
    const user = await User.findByPk(found.userId, { transaction, lock: transaction.LOCK.UPDATE });
    const action = await AuthActionToken.findByPk(found.id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!user?.isActive || action.usedAt || new Date(action.expiresAt) <= new Date()) fail('Liên kết không hợp lệ hoặc đã hết hạn');
    await action.update({ usedAt: new Date() }, { transaction });
    if (purpose === 'reset') await revokeAll(user, transaction, password);
    else await user.update({ emailVerifiedAt: new Date() }, { transaction });
    await enqueue(user.id, purpose === 'reset' ? 'Mật khẩu đã thay đổi' : 'Email đã được xác minh',
      purpose === 'reset' ? 'Các phiên đăng nhập cũ đã được thu hồi.' : 'Địa chỉ email của bạn đã được xác minh.', '/profile', transaction);
  });
};
const revokeSession = async (userId, id) => sequelize.transaction(async (transaction) => {
  await User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE });
  const row = await AuthSession.findOne({ where: { id: uuid(id), userId }, transaction, lock: transaction.LOCK.UPDATE });
  if (!row) fail('Không tìm thấy phiên đăng nhập', 404);
  if (!row.revokedAt) await row.update({ revokedAt: new Date() }, { transaction });
});
module.exports = { validSession, issueSession, revokeAll, createAction, requestAction, consumeAction, revokeSession, consumeRate };

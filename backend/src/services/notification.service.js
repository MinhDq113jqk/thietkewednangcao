const crypto = require('node:crypto');
const { Op } = require('sequelize');
const { sequelize } = require('../database/connection');
const { Notification, User, AuthActionToken } = require('../models');
const { sendMail, isSmtpConfigured } = require('./email.service');

// Action links are encrypted at rest; neither API lists nor operational logs expose them.
const key = () => crypto.createHash('sha256').update(process.env.JWT_REFRESH_SECRET).digest();
const seal = (value) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64');
};
const unseal = (value) => {
  const data = Buffer.from(value, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), data.subarray(0, 12));
  decipher.setAuthTag(data.subarray(12, 28));
  return JSON.parse(Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString());
};
const enqueue = (userId, title, body, href, transaction, privatePayload) => Notification.create({
  userId, title, body, href, payload: privatePayload ? seal(privatePayload) : null,
}, { transaction });
const publicFields = ['id', 'userId', 'title', 'body', 'href', 'readAt', 'state', 'attempts', 'nextAttemptAt', 'sentAt', 'lastError', 'createdAt', 'updatedAt'];
const dispatchNotifications = async ({ deliver = sendMail, configured = isSmtpConfigured(), batchSize = 10 } = {}) => {
  if (!configured) return 0;
  let processed = 0;
  for (let i = 0; i < batchSize; i++) {
    const found = await sequelize.transaction(async (transaction) => {
      const row = await Notification.findOne({ where: { state: 'pending', nextAttemptAt: { [Op.lte]: new Date() } },
        order: [['nextAttemptAt', 'ASC'], ['id', 'ASC']], transaction, lock: transaction.LOCK.UPDATE, skipLocked: true });
      if (!row) return false;
      const user = await User.findByPk(row.userId, { transaction });
      const attempts = row.attempts + 1;
      try {
        const secret = row.payload ? unseal(row.payload) : {};
        if (secret.actionTokenId) {
          const action = await AuthActionToken.findByPk(secret.actionTokenId, { transaction });
          if (!action || action.usedAt) {
            await row.update({ state: 'expired', payload: null, lastError: 'LINK_USED' }, { transaction });
            return true;
          }
        }
        // Expired action links must never be sent by a delayed retry.
        if (secret.expiresAt && new Date(secret.expiresAt) <= new Date()) {
          await row.update({ state: 'expired', payload: null, lastError: 'LINK_EXPIRED' }, { transaction });
          return true;
        }
        const href = secret.href || new URL(row.href, process.env.CLIENT_URL || 'http://localhost:5173').href;
        const result = await deliver({ to: user.email, subject: `SouvenirShop - ${row.title}`,
          text: `${row.body}\n\n${href}`, messageId: `<${row.id}@souvenirshop.notification>` });
        if (result?.skipped) throw new Error('DELIVERY_UNAVAILABLE');
        await row.update({ state: 'sent', attempts, sentAt: new Date(), payload: null, lastError: null }, { transaction });
      } catch {
        await row.update({ attempts, state: attempts >= 5 ? 'failed' : 'pending', lastError: 'DELIVERY_FAILED',
          nextAttemptAt: new Date(Date.now() + Math.min(3600000, 30000 * 2 ** (attempts - 1))) }, { transaction });
      }
      return true;
    });
    if (!found) break;
    processed++;
  }
  return processed;
};
module.exports = { enqueue, publicFields, dispatchNotifications, unseal };

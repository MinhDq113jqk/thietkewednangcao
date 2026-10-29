const { DataTypes: D } = require('sequelize');
const { sequelize } = require('../database/connection');
const id = () => ({ type: D.UUID, defaultValue: D.UUIDV4, primaryKey: true });
const req = (type) => ({ type, allowNull: false });
const AuthSession = sequelize.define('AuthSession', {
  id: id(), userId: req(D.UUID), tokenHash: req(D.STRING(64)), label: req(D.STRING(200)),
  expiresAt: req(D.DATE), lastSeenAt: req(D.DATE), revokedAt: D.DATE,
}, { tableName: 'auth_sessions', timestamps: true });
const AuthActionToken = sequelize.define('AuthActionToken', {
  id: id(), userId: req(D.UUID), purpose: req(D.STRING(20)), tokenHash: req(D.STRING(64)),
  expiresAt: req(D.DATE), usedAt: D.DATE,
}, { tableName: 'auth_action_tokens', timestamps: true, updatedAt: false });
const AuthRate = sequelize.define('AuthRate', {
  key: { type: D.STRING(64), primaryKey: true }, count: req(D.INTEGER), expiresAt: req(D.DATE),
}, { tableName: 'auth_rate_limits', timestamps: false });
const Notification = sequelize.define('Notification', {
  id: id(), userId: req(D.UUID), title: req(D.STRING(200)), body: req(D.STRING(2000)), href: req(D.STRING(250)),
  payload: D.TEXT, readAt: D.DATE, state: { ...req(D.STRING(20)), defaultValue: 'pending' },
  attempts: { ...req(D.INTEGER), defaultValue: 0 }, nextAttemptAt: { ...req(D.DATE), defaultValue: D.NOW },
  sentAt: D.DATE, lastError: D.STRING(40),
}, { tableName: 'notification_outbox', timestamps: true });
const SupportTicket = sequelize.define('SupportTicket', {
  id: id(), requesterId: req(D.UUID), orderId: D.UUID, subject: req(D.STRING(200)),
  status: { ...req(D.STRING(20)), defaultValue: 'open' }, assignedTo: D.UUID,
}, { tableName: 'support_tickets', timestamps: true });
const SupportMessage = sequelize.define('SupportMessage', {
  id: id(), ticketId: req(D.UUID), authorId: req(D.UUID), body: req(D.STRING(2000)),
}, { tableName: 'support_messages', timestamps: true, updatedAt: false });
const AuditEvent = sequelize.define('AuditEvent', {
  id: id(), actorId: D.UUID, action: req(D.STRING(80)), resourceType: req(D.STRING(60)), resourceId: req(D.UUID),
  details: { ...req(D.JSONB), defaultValue: {} },
}, { tableName: 'audit_events', timestamps: true, updatedAt: false });
const ModerationAction = sequelize.define('ModerationAction', {
  id: id(), actorId: req(D.UUID), resourceType: req(D.STRING(20)), resourceId: req(D.UUID),
  action: req(D.STRING(20)), reason: req(D.STRING(1000)), previous: req(D.STRING(30)), next: req(D.STRING(30)),
}, { tableName: 'moderation_actions', timestamps: true, updatedAt: false });
module.exports = { AuthSession, AuthActionToken, AuthRate, Notification, SupportTicket, SupportMessage, AuditEvent, ModerationAction };

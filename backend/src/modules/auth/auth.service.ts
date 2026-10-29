import { Injectable } from '@nestjs/common';
import type { Response } from 'express';
import type { AppRequest } from '../../common/types/app-request';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const { sequelize } = require('../../database/connection');
const { AuthSession } = require('../../models');
const { Op } = require('sequelize');
const { issueSession, revokeAll, createAction, requestAction, consumeAction, revokeSession } = require('../../services/accountSecurity.service');
const {
  clearRefreshCookie,
  hashToken,
  matchesAuthVersion,
  publicUser,
  readRefreshToken,
  setRefreshCookie,
} = require('../../utils/authTokens');

@Injectable()
export class AuthService {
  async register(req: AppRequest, res: Response) {
    try {
      const name = String(req.body.name || '').trim();
      const email = String(req.body.email || '')
        .trim()
        .toLowerCase();
      const password = String(req.body.password || '');

      if (!name || !email || !password) {
        return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
      }
      if (password.length < 8 || Buffer.byteLength(password) > 72) {
        return res
          .status(400)
          .json({ message: 'Mật khẩu cần ít nhất 8 ký tự và tối đa 72 byte' });
      }

      const exists = await User.findOne({ where: { email } });
      if (exists) {
        return res.status(409).json({ message: 'Email đã được sử dụng' });
      }

      const hashed = await bcrypt.hash(password, 12);
      const { session } = await sequelize.transaction(async (transaction) => {
        const user = await User.create({ name, email, password: hashed }, { transaction });
        await createAction(user, 'verify', transaction);
        return { session: await issueSession(user, transaction, req) };
      });

      setRefreshCookie(res, session.refreshToken);
      res.status(201).json(session.data);
    } catch (error) {
      throw error;
    }
  }

  async login(req: AppRequest, res: Response) {
    try {
      const email = String(req.body.email || '')
        .trim()
        .toLowerCase();
      const password = String(req.body.password || '');

      if (!email || !password) {
        return res.status(400).json({ message: 'Thiếu email hoặc mật khẩu' });
      }

      const session = await sequelize.transaction(async (transaction) => {
        const user = await User.findOne({ where: { email }, transaction, lock: transaction.LOCK.UPDATE });
        if (!user || !user.isActive) return null;
        if (!(await bcrypt.compare(password, user.password))) return null;
        return issueSession(user, transaction, req);
      });
      if (!session) {
        return res
          .status(401)
          .json({ message: 'Email hoặc mật khẩu không đúng' });
      }

      setRefreshCookie(res, session.refreshToken);
      res.json(session.data);
    } catch (error) {
      throw error;
    }
  }

  me(req: AppRequest, res: Response) {
    res.json(publicUser(req.user));
  }

  async refresh(req: AppRequest, res: Response) {
    const refreshToken = readRefreshToken(req);
    if (!refreshToken) {
      return res.status(401).json({ message: 'Phiên đăng nhập đã hết hạn' });
    }

    try {
      const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      if (payload.type !== 'refresh') throw new Error('Invalid token type');

      const session = await sequelize.transaction(async (transaction) => {
        const user = await User.findByPk(payload.id, { transaction, lock: transaction.LOCK.UPDATE });
        if (!user || !user.isActive || !matchesAuthVersion(payload, user) || !payload.sid) return null;
        const row = await AuthSession.findOne({ where: { id: payload.sid, userId: user.id, revokedAt: null,
          expiresAt: { [Op.gt]: new Date() } }, transaction, lock: transaction.LOCK.UPDATE });
        if (!row || row.tokenHash !== hashToken(refreshToken)) return null;
        return issueSession(user, transaction, req, row);
      });
      if (!session) {
        clearRefreshCookie(res);
        return res
          .status(401)
          .json({ message: 'Phiên đăng nhập không hợp lệ' });
      }

      setRefreshCookie(res, session.refreshToken);
      res.json(session.data);
    } catch {
      clearRefreshCookie(res);
      res.status(401).json({ message: 'Phiên đăng nhập đã hết hạn' });
    }
  }

  async logout(req: AppRequest, res: Response) {
    const refreshToken = readRefreshToken(req);

    if (refreshToken) {
      try {
        const payload = jwt.verify(
          refreshToken,
          process.env.JWT_REFRESH_SECRET,
        );
        if (payload.type !== 'refresh') throw new Error('Invalid token type');
        await sequelize.transaction(async (transaction) => {
          const user = await User.findByPk(payload.id, { transaction, lock: transaction.LOCK.UPDATE });
          if (user && matchesAuthVersion(payload, user) && payload.sid) {
            const row = await AuthSession.findOne({ where: { id: payload.sid, userId: user.id, revokedAt: null }, transaction, lock: transaction.LOCK.UPDATE });
            if (row?.tokenHash === hashToken(refreshToken)) {
              await row.update({ revokedAt: new Date() }, { transaction });
              if (user.refreshToken === hashToken(refreshToken)) await user.update({ refreshToken: null }, { transaction });
            }
          }
        });
      } catch {
        // Logout stays idempotent for expired or malformed cookies.
      }
    }

    clearRefreshCookie(res);
    res.json({ message: 'Đã đăng xuất' });
  }

  async forgotPassword(req: AppRequest, res: Response) {
    await requestAction(req, 'reset');
    res.json({ message: 'Nếu tài khoản hợp lệ, hướng dẫn sẽ được gửi qua email.' });
  }
  async resetPassword(req: AppRequest, res: Response) {
    await consumeAction(req, 'reset');
    clearRefreshCookie(res);
    res.json({ message: 'Đã đặt lại mật khẩu. Vui lòng đăng nhập lại.' });
  }
  async requestVerification(req: AppRequest, res: Response) {
    await requestAction(req, 'verify');
    res.json({ message: 'Hướng dẫn xác minh đã được đưa vào hàng chờ gửi.' });
  }
  async verifyEmail(req: AppRequest, res: Response) {
    await consumeAction(req, 'verify');
    res.json({ message: 'Đã xác minh email.' });
  }
  async sessions(req: AppRequest, res: Response) {
    const rows = await AuthSession.findAll({ where: { userId: req.user.id, revokedAt: null, expiresAt: { [Op.gt]: new Date() } },
      attributes: ['id', 'label', 'createdAt', 'lastSeenAt', 'expiresAt'], order: [['createdAt', 'DESC'], ['id', 'DESC']] });
    res.json(rows.map((row) => ({ ...row.toJSON(), current: row.id === req.sessionId })));
  }
  async revokeSession(req: AppRequest, res: Response) {
    await revokeSession(req.user.id, req.params.id);
    if (req.params.id === req.sessionId) clearRefreshCookie(res);
    res.json({ message: 'Đã thu hồi phiên đăng nhập.' });
  }
  async revokeAll(req: AppRequest, res: Response) {
    await sequelize.transaction(async (transaction) => {
      const user = await User.findByPk(req.user.id, { transaction, lock: transaction.LOCK.UPDATE });
      await revokeAll(user, transaction);
    });
    clearRefreshCookie(res);
    res.json({ message: 'Đã thu hồi mọi phiên đăng nhập.' });
  }
}

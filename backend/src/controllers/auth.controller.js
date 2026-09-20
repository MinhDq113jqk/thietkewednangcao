const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendWelcomeEmail } = require('../services/email.service');
const {
  clearRefreshCookie,
  hashToken,
  publicUser,
  readRefreshToken,
  setRefreshCookie,
  signAccessToken,
  signRefreshToken,
} = require('../utils/authTokens');

const issueSession = async (user, res) => {
  const token = signAccessToken(user.id);
  const refreshToken = signRefreshToken(user.id);

  await user.update({ refreshToken: hashToken(refreshToken) });
  setRefreshCookie(res, refreshToken);

  return { token, user: publicUser(user) };
};

exports.register = async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Mật khẩu cần ít nhất 8 ký tự' });
    }

    const exists = await User.findOne({ where: { email } });
    if (exists) {
      return res.status(409).json({ message: 'Email đã được sử dụng' });
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, password: hashed });
    const session = await issueSession(user, res);

    sendWelcomeEmail(user).catch((error) => {
      console.error('Welcome email failed:', error.message);
    });

    res.status(201).json(session);
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!email || !password) {
      return res.status(400).json({ message: 'Thiếu email hoặc mật khẩu' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
    }

    const matches = await bcrypt.compare(password, user.password);
    if (!matches) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
    }

    res.json(await issueSession(user, res));
  } catch (error) {
    next(error);
  }
};

exports.me = (req, res) => {
  res.json(publicUser(req.user));
};

exports.refresh = async (req, res) => {
  const refreshToken = readRefreshToken(req);
  if (!refreshToken) {
    return res.status(401).json({ message: 'Phiên đăng nhập đã hết hạn' });
  }

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    if (payload.type !== 'refresh') throw new Error('Invalid token type');

    const user = await User.findByPk(payload.id);
    if (!user || !user.isActive || user.refreshToken !== hashToken(refreshToken)) {
      clearRefreshCookie(res);
      return res.status(401).json({ message: 'Phiên đăng nhập không hợp lệ' });
    }

    res.json(await issueSession(user, res));
  } catch {
    clearRefreshCookie(res);
    res.status(401).json({ message: 'Phiên đăng nhập đã hết hạn' });
  }
};

exports.logout = async (req, res) => {
  const refreshToken = readRefreshToken(req);

  if (refreshToken) {
    try {
      const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const user = await User.findByPk(payload.id);
      if (user && user.refreshToken === hashToken(refreshToken)) {
        await user.update({ refreshToken: null });
      }
    } catch {
      // Logout stays idempotent for expired or malformed cookies.
    }
  }

  clearRefreshCookie(res);
  res.json({ message: 'Đã đăng xuất' });
};

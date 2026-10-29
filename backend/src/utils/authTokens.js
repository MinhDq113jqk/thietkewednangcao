const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const REFRESH_COOKIE_NAME = 'souvenir_refresh';
const DEFAULT_REFRESH_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

const parseCookies = (header = '') =>
  String(header)
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const separatorIndex = part.indexOf('=');
      if (separatorIndex < 1) return cookies;

      try {
        const key = decodeURIComponent(part.slice(0, separatorIndex));
        const value = decodeURIComponent(part.slice(separatorIndex + 1));
        if (key === REFRESH_COOKIE_NAME) cookies[key] = value;
      } catch {
        // Ignore malformed unrelated cookies; invalid auth becomes a normal 401.
      }
      return cookies;
    }, {});

const readRefreshToken = (req) =>
  parseCookies(req.headers.cookie)[REFRESH_COOKIE_NAME] || null;

const hashToken = (token) =>
  crypto.createHash('sha256').update(String(token)).digest('hex');

// Legacy tokens belong only to version zero, before the first password change.
const matchesAuthVersion = (payload, user) => {
  const version = payload?.authVersion === undefined ? 0 : payload.authVersion;
  return Number.isSafeInteger(version) && version >= 0
    && version === (user.authVersion ?? 0);
};

const signAccessToken = (userId, authVersion = 0, sid) =>
  jwt.sign({ id: userId, authVersion, ...(sid ? { sid } : {}) }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });

const signRefreshToken = (userId, authVersion = 0, sid) =>
  jwt.sign({ id: userId, authVersion, type: 'refresh', ...(sid ? { sid } : {}) }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    jwtid: crypto.randomUUID(),
  });

const cookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const configuredSameSite = String(
    process.env.AUTH_COOKIE_SAME_SITE || 'Lax'
  ).toLowerCase();
  const sameSite = ['lax', 'strict', 'none'].includes(configuredSameSite)
    ? configuredSameSite
    : 'lax';

  return {
    httpOnly: true,
    maxAge: Number(process.env.AUTH_COOKIE_MAX_AGE_SECONDS || DEFAULT_REFRESH_MAX_AGE_SECONDS),
    path: '/api/auth',
    sameSite,
    secure: isProduction || sameSite === 'none',
  };
};

const serializeCookie = (name, value, options = {}) => {
  const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`];

  if (options.maxAge !== undefined) parts.push(`Max-Age=${Math.max(0, options.maxAge)}`);
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite[0].toUpperCase()}${options.sameSite.slice(1)}`);
  }

  return parts.join('; ');
};

const setRefreshCookie = (res, token) => {
  res.setHeader(
    'Set-Cookie',
    serializeCookie(REFRESH_COOKIE_NAME, token, cookieOptions())
  );
};

const clearRefreshCookie = (res) => {
  res.setHeader(
    'Set-Cookie',
    serializeCookie(REFRESH_COOKIE_NAME, '', {
      ...cookieOptions(),
      maxAge: 0,
    })
  );
};

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  avatar: user.avatar,
  role: user.role,
  emailVerifiedAt: user.emailVerifiedAt || null,
});

const assertAuthSecrets = () => {
  const required = [
    ['JWT_SECRET', process.env.JWT_SECRET],
    ['JWT_REFRESH_SECRET', process.env.JWT_REFRESH_SECRET],
  ];

  required.forEach(([name, value]) => {
    if (!value || value.length < 32 || ['change_me', 'secret'].includes(value)) {
      throw new Error(`${name} must be configured with at least 32 characters`);
    }
  });

  if (process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be different');
  }
};

module.exports = {
  assertAuthSecrets,
  clearRefreshCookie,
  hashToken,
  matchesAuthVersion,
  publicUser,
  readRefreshToken,
  setRefreshCookie,
  signAccessToken,
  signRefreshToken,
};

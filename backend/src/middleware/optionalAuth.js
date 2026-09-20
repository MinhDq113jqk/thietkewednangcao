const jwt = require('jsonwebtoken');
const User = require('../models/User');

const optionalAuth = async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next();

  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    const user = await User.findByPk(payload.id, {
      attributes: { exclude: ['password', 'refreshToken'] },
    });
    if (user?.isActive) req.user = user;
  } catch {
    // Public endpoints remain available when an optional token is invalid.
  }

  return next();
};

module.exports = optionalAuth;

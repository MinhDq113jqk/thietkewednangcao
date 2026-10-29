const { createAllowedOrigins } = require('../../config/cors');

// Cookie-based mutations require a trusted browser origin. Non-browser clients
// may omit Origin, but cross-site Fetch Metadata cannot bypass that check.
module.exports = (env = process.env) => {
  const allowed = createAllowedOrigins(env);
  return (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const origin = req.headers.origin;
    if ((origin && !allowed.has(origin)) || (!origin && req.headers['sec-fetch-site'] === 'cross-site')) {
      return res.status(403).json({ message: 'Nguồn yêu cầu không được phép', code: 'AUTH_ORIGIN_DENIED' });
    }
    return next();
  };
};

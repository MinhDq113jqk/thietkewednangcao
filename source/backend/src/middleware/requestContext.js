const { randomUUID } = require('crypto');

const requestContext = (req, res, next) => {
  const requestId = req.get('X-Request-Id') || randomUUID();

  req.requestId = requestId;
  req.startedAt = Date.now();
  res.setHeader('X-Request-Id', requestId);

  next();
};

module.exports = requestContext;

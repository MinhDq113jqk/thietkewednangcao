const requestLogger = (req, res, next) => {
  res.on('finish', () => {
    const durationMs = Date.now() - (req.startedAt || Date.now());
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    const entry = {
      level,
      type: 'http_request',
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs,
      ip: req.ip || req.socket.remoteAddress,
      userId: req.user?.id,
    };

    console.log(JSON.stringify(entry));
  });

  next();
};

module.exports = requestLogger;

const createRateLimit = ({ windowMs = 15 * 60 * 1000, max = 300 } = {}) => {
  const buckets = new Map();

  const cleanup = (now) => {
    for (const [key, bucket] of buckets.entries()) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  };

  return (req, res, next) => {
    const now = Date.now();
    cleanup(now);

    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const bucket = buckets.get(key) || { count: 0, resetAt: now + windowMs };

    bucket.count += 1;
    buckets.set(key, bucket);

    const remaining = Math.max(0, max - bucket.count);
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > max) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
      return res.status(429).json({ message: 'Quá nhiều yêu cầu, vui lòng thử lại sau' });
    }

    return next();
  };
};

module.exports = createRateLimit;

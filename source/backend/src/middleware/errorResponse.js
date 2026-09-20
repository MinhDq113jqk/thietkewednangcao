const statusMessages = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  413: 'Payload Too Large',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
};

const toErrorCode = (statusCode, message) => {
  const base = statusMessages[statusCode] || 'Error';
  const source = message || base;
  return String(source)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase()
    .slice(0, 80) || `HTTP_${statusCode}`;
};

const formatErrorPayload = ({ req, statusCode, body }) => {
  const source = body && typeof body === 'object' ? body : {};
  const existingError = source.error && typeof source.error === 'object' ? source.error : {};
  const message = source.message || existingError.message || statusMessages[statusCode] || 'Loi server';

  return {
    message,
    error: {
      code: source.code || existingError.code || toErrorCode(statusCode, message),
      status: statusCode,
      method: req.method,
      path: req.originalUrl,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
      ...(source.details || existingError.details ? { details: source.details || existingError.details } : {}),
    },
  };
};

const errorResponseFormatter = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    if (res.statusCode >= 400) {
      return originalJson(formatErrorPayload({ req, statusCode: res.statusCode, body }));
    }

    return originalJson(body);
  };

  next();
};

const notFoundHandler = (req, res) => {
  res.status(404).json({ message: 'Route khong ton tai' });
};

const errorHandler = (err, req, res, _next) => {
  const statusCode = err.status || err.statusCode || 500;
  const safeStatus = statusCode >= 400 && statusCode < 600 ? statusCode : 500;
  const isServerError = safeStatus >= 500;
  const message = isServerError && process.env.NODE_ENV === 'production'
    ? 'Loi server'
    : err.message || 'Loi server';

  console.error(JSON.stringify({
    level: 'error',
    type: 'app_error',
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    status: safeStatus,
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  }));

  res.status(safeStatus).json({
    message,
    code: err.code,
    details: err.details,
  });
};

module.exports = {
  errorHandler,
  errorResponseFormatter,
  formatErrorPayload,
  notFoundHandler,
};

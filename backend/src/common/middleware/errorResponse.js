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
  return (
    String(source)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toUpperCase()
      .slice(0, 80) || `HTTP_${statusCode}`
  );
};

const formatErrorPayload = ({ req, statusCode, body }) => {
  const source = body && typeof body === 'object' ? body : {};
  const existingError =
    source.error && typeof source.error === 'object' ? source.error : {};
  const message = statusCode >= 500 ? 'Lỗi máy chủ. Vui lòng thử lại sau.' :
    source.message ||
    existingError.message ||
    statusMessages[statusCode] ||
    'Loi server';

  return {
    message,
    error: {
      code:
        statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : source.code || existingError.code || toErrorCode(statusCode, message),
      status: statusCode,
      method: req.method,
      path: String(req.originalUrl || req.path || '').split('?')[0],
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
      ...(statusCode < 500 && (source.details || existingError.details)
        ? { details: source.details || existingError.details }
        : {}),
    },
  };
};

const errorResponseFormatter = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    if (res.statusCode >= 400) {
      return originalJson(
        formatErrorPayload({ req, statusCode: res.statusCode, body }),
      );
    }

    return originalJson(body);
  };

  next();
};

module.exports = { errorResponseFormatter, formatErrorPayload };

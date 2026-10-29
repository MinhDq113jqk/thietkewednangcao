const defaultClientUrl = 'http://localhost:5173';

const splitOrigins = (value) =>
  String(value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const createAllowedOrigins = (env = process.env) => {
  const origins = new Set(env.NODE_ENV === 'production' ? [] : [defaultClientUrl, 'http://127.0.0.1:5173']);
  if (env.CLIENT_URL) origins.add(env.CLIENT_URL);

  splitOrigins(env.CORS_ORIGINS).forEach((origin) => origins.add(origin));
  return origins;
};

const createCorsOptions = (env = process.env) => {
  const allowedOrigins = createAllowedOrigins(env);

  return {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      return callback(Object.assign(new Error('CORS blocked origin'), { status: 403 }));
    },
    credentials: true,
  };
};

module.exports = {
  createAllowedOrigins,
  createCorsOptions,
};

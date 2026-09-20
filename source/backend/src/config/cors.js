const defaultClientUrl = 'http://localhost:5173';

const splitOrigins = (value) =>
  String(value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const createAllowedOrigins = (env = process.env) => {
  const origins = new Set([
    env.CLIENT_URL || defaultClientUrl,
    defaultClientUrl,
    'http://127.0.0.1:5173',
  ]);

  splitOrigins(env.CORS_ORIGINS).forEach((origin) => origins.add(origin));
  return origins;
};

const createCorsOptions = (env = process.env) => {
  const allowedOrigins = createAllowedOrigins(env);

  return {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
  };
};

module.exports = {
  createAllowedOrigins,
  createCorsOptions,
};

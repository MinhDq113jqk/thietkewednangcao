const { createClient } = require('redis');

let client;
let disabled = false;

const getRedisClient = async () => {
  if (!process.env.REDIS_URL) return null;
  if (disabled) return null;

  if (!client) {
    client = createClient({
      url: process.env.REDIS_URL,
      socket: {
        connectTimeout: 500,
        reconnectStrategy: false,
      },
    });

    client.on('error', () => {
      disabled = true;
    });
  }

  if (!client.isOpen) {
    try {
      await client.connect();
    } catch {
      disabled = true;
      return null;
    }
  }

  return client;
};

const getJson = async (key) => {
  const redis = await getRedisClient();
  if (!redis) return null;

  try {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const setJson = async (key, value, ttlSeconds = 60) => {
  const redis = await getRedisClient();
  if (!redis) return;

  try {
    await redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch {
    // Cache failures should never break API responses.
  }
};

const deleteByPattern = async (pattern) => {
  const redis = await getRedisClient();
  if (!redis) return;

  try {
    const keys = [];
    for await (const key of redis.scanIterator({ MATCH: pattern, COUNT: 100 })) {
      keys.push(key);
    }
    if (keys.length) await redis.del(keys);
  } catch {
    // Best-effort invalidation.
  }
};

module.exports = {
  deleteByPattern,
  getJson,
  setJson,
};

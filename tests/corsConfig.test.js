import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';

const require = createRequire(import.meta.url);
const { createAllowedOrigins, createCorsOptions } = require('../backend/src/config/cors.js');

describe('CORS configuration', () => {
  it('includes local development origins by default', () => {
    const origins = createAllowedOrigins({});

    assert.equal(origins.has('http://localhost:5173'), true);
    assert.equal(origins.has('http://127.0.0.1:5173'), true);
  });

  it('supports comma-separated production origins', () => {
    const origins = createAllowedOrigins({
      CLIENT_URL: 'https://souvenirshop.vn',
      CORS_ORIGINS: 'https://admin.souvenirshop.vn, https://preview.souvenirshop.vn',
    });

    assert.equal(origins.has('https://souvenirshop.vn'), true);
    assert.equal(origins.has('https://admin.souvenirshop.vn'), true);
    assert.equal(origins.has('https://preview.souvenirshop.vn'), true);
  });

  it('blocks origins outside the allowlist', async () => {
    const corsOptions = createCorsOptions({ CLIENT_URL: 'https://souvenirshop.vn' });

    await assert.rejects(
      new Promise((resolve, reject) => {
        corsOptions.origin('https://evil.example.com', (err) => (err ? reject(err) : resolve()));
      }),
      /CORS blocked origin/,
    );
  });
});

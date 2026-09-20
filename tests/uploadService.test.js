import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';

const require = createRequire(import.meta.url);
const {
  buildCloudinarySignature,
  detectImageType,
  getLocalUploadResult,
  getUploadProvider,
  isCloudinaryConfigured,
  validateImageContent,
} = require('../backend/src/services/upload.service.js');

describe('upload service configuration', () => {
  it('uses local upload unless Cloudinary is configured', () => {
    assert.equal(getUploadProvider({}), 'local');
    assert.equal(getUploadProvider({ UPLOAD_PROVIDER: 'local' }), 'local');
    assert.equal(getUploadProvider({
      CLOUDINARY_CLOUD_NAME: 'demo',
      CLOUDINARY_API_KEY: 'key',
      CLOUDINARY_API_SECRET: 'secret',
    }), 'cloudinary');
  });

  it('detects complete Cloudinary credentials', () => {
    assert.equal(isCloudinaryConfigured({ CLOUDINARY_CLOUD_NAME: 'demo' }), false);
    assert.equal(isCloudinaryConfigured({
      CLOUDINARY_CLOUD_NAME: 'demo',
      CLOUDINARY_API_KEY: 'key',
      CLOUDINARY_API_SECRET: 'secret',
    }), true);
  });

  it('builds deterministic Cloudinary signatures', () => {
    assert.equal(
      buildCloudinarySignature({ timestamp: 1700000000, folder: 'souvenirshop' }, 'secret'),
      'ddd0b87beff6aa375a40929c50b8339157bfe2d8',
    );
  });

  it('keeps local upload response compatible with existing frontend', () => {
    assert.deepEqual(getLocalUploadResult({
      filename: '123-test.jpg',
      mimetype: 'image/jpeg',
      size: 2048,
    }), {
      provider: 'local',
      url: '/uploads/123-test.jpg',
      filename: '123-test.jpg',
      mimetype: 'image/jpeg',
      size: 2048,
    });
  });

  it('detects supported image signatures instead of trusting the MIME header', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    assert.equal(detectImageType(png)?.mimetype, 'image/png');
    assert.equal(detectImageType(Buffer.from('<script>alert(1)</script>')), null);
  });

  it('rejects a file whose declared type does not match its content', () => {
    assert.throws(
      () => validateImageContent({
        mimetype: 'image/png',
        buffer: Buffer.from('<html>not an image</html>'),
      }),
      (error) => error.code === 'INVALID_IMAGE_CONTENT' && error.status === 400,
    );
  });
});

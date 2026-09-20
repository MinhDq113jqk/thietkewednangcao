import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isLazyImportError } from '../src/utils/lazyWithRetry.js';

describe('lazy module recovery', () => {
  it('recognizes browser chunk loading errors', () => {
    assert.equal(
      isLazyImportError(new TypeError('Failed to fetch dynamically imported module: /products.js')),
      true
    );
    assert.equal(isLazyImportError(new Error('ChunkLoadError: Loading chunk 12 failed')), true);
    assert.equal(isLazyImportError(new Error('Regular render error')), false);
  });
});

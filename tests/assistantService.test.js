import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';

const require = createRequire(import.meta.url);
const {
  buildProductReply,
  detectAssistantIntent,
  extractProductQuery,
  getStaticResponse,
  normalizeText,
} = require('../backend/src/services/assistant.service');

describe('shopping assistant service', () => {
  it('normalizes Vietnamese text for intent and product matching', () => {
    assert.equal(normalizeText('Tượng Gốm Bát Tràng!'), 'tuong gom bat trang');
  });

  it('detects supported intents with sensitive information taking priority', () => {
    assert.equal(detectAssistantIntent('Giá tượng gốm Bát Tràng bao nhiêu?'), 'product');
    assert.equal(detectAssistantIntent('Thông tin liên hệ của shop'), 'contact');
    assert.equal(detectAssistantIntent('Tôi muốn theo dõi đơn hàng'), 'orders');
    assert.equal(detectAssistantIntent('OTP thanh toán của tôi là 123456'), 'security');
  });

  it('extracts a useful product name from a natural price question', () => {
    assert.equal(
      extractProductQuery('Cho tôi hỏi giá sản phẩm Tượng gốm Bát Tràng bao nhiêu?'),
      'Tượng gốm Bát Tràng'
    );
  });

  it('builds price replies from live product-shaped data', () => {
    const response = buildProductReply([
      { name: 'Tượng gốm Bát Tràng', price: 120000, salePrice: 99000 },
    ], 'Tượng gốm Bát Tràng');

    assert.match(response.reply, /99[.\s]?000/);
    assert.match(response.reply, /dữ liệu sản phẩm đang bán/);
  });

  it('keeps static contact guidance free of sensitive-data requests', () => {
    const response = getStaticResponse('contact');
    assert.match(response.reply, /support@souvenirshop\.vn/);
    assert.match(response.reply, /không gửi mật khẩu hoặc OTP/);
  });
});

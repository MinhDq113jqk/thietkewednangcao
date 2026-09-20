import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';

const require = createRequire(import.meta.url);
const {
  MAX_CHAT_MESSAGE_LENGTH,
  isConversationParticipant,
  normalizeChatBody,
  validateChatBody,
} = require('../backend/src/services/chat.service');

describe('buyer seller chat service', () => {
  it('normalizes line endings and strips unsafe control characters', () => {
    assert.equal(
      normalizeChatBody('  Xin chào\r\n\u0000Shop  '),
      'Xin chào\nShop'
    );
  });

  it('rejects empty and oversized messages', () => {
    assert.match(validateChatBody('   ').error, /Vui lòng nhập/);
    assert.match(
      validateChatBody('a'.repeat(MAX_CHAT_MESSAGE_LENGTH + 1)).error,
      /tối đa 2000/
    );
    assert.equal(validateChatBody('Sản phẩm còn hàng không?').error, null);
  });

  it('allows only the buyer or shop owner to access a conversation', () => {
    const conversation = { buyerId: 'buyer-1', shopOwnerId: 'seller-1' };
    assert.equal(isConversationParticipant({ ...conversation, userId: 'buyer-1' }), true);
    assert.equal(isConversationParticipant({ ...conversation, userId: 'seller-1' }), true);
    assert.equal(isConversationParticipant({ ...conversation, userId: 'stranger-1' }), false);
  });
});

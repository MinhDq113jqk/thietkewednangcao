const MAX_CHAT_MESSAGE_LENGTH = 2000;

const normalizeChatBody = (value) => [...String(value || '').replace(/\r\n?/g, '\n')]
  .filter((character) => {
    const code = character.charCodeAt(0);
    return code === 9 || code === 10 || (code >= 32 && code !== 127);
  })
  .join('')
  .trim();

const validateChatBody = (value) => {
  const body = normalizeChatBody(value);
  if (!body) return { body, error: 'Vui lòng nhập nội dung tin nhắn' };
  if (body.length > MAX_CHAT_MESSAGE_LENGTH) {
    return { body, error: `Tin nhắn tối đa ${MAX_CHAT_MESSAGE_LENGTH} ký tự` };
  }
  return { body, error: null };
};

const isConversationParticipant = ({ buyerId, shopOwnerId, userId }) => (
  String(buyerId) === String(userId)
  || String(shopOwnerId) === String(userId)
);

module.exports = {
  MAX_CHAT_MESSAGE_LENGTH,
  isConversationParticipant,
  normalizeChatBody,
  validateChatBody,
};

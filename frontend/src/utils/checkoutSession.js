const CHECKOUT_KEY_STORAGE = 'souvenir-checkout-key';
const CHECKOUT_ATTEMPT_STORAGE = 'souvenir-checkout-attempt';

// Pending submissions contain shipping information and belong to one account.
export const accountCheckoutStorage = (storage, accountId) => ({
  getItem: (key) => accountId ? storage?.getItem?.(`${key}:${accountId}`) : null,
  setItem: (key, value) => { if (accountId) storage?.setItem?.(`${key}:${accountId}`, value); },
  removeItem: (key) => { if (accountId) storage?.removeItem?.(`${key}:${accountId}`); },
});

const fallbackRandomKey = () => {
  const random = Math.random().toString(36).slice(2);
  return `checkout_${Date.now().toString(36)}_${random.padEnd(16, '0')}`;
};

export const createCheckoutKey = (cryptoObject = globalThis.crypto) =>
  typeof cryptoObject?.randomUUID === 'function'
    ? `checkout_${cryptoObject.randomUUID()}`
    : fallbackRandomKey();

export const getOrCreateCheckoutKey = (
  storage = globalThis.sessionStorage,
  cryptoObject = globalThis.crypto
) => {
  const existing = storage?.getItem?.(CHECKOUT_KEY_STORAGE);
  if (existing) return existing;

  const key = createCheckoutKey(cryptoObject);
  storage?.setItem?.(CHECKOUT_KEY_STORAGE, key);
  return key;
};

export const clearCheckoutKey = (storage = globalThis.sessionStorage) => {
  storage?.removeItem?.(CHECKOUT_KEY_STORAGE);
  clearCheckoutAttempt(storage);
};

export const getCheckoutAttempt = (storage = globalThis.sessionStorage) => {
  try {
    const attempt = JSON.parse(storage?.getItem?.(CHECKOUT_ATTEMPT_STORAGE) || 'null');
    return attempt?.idempotencyKey && attempt.payload?.items?.length
      && attempt.items?.length && attempt.quote?.fingerprint ? attempt : null;
  } catch {
    return null;
  }
};

export const saveCheckoutAttempt = (attempt, storage = globalThis.sessionStorage) => {
  storage?.setItem?.(CHECKOUT_ATTEMPT_STORAGE, JSON.stringify(attempt));
};

export const clearCheckoutAttempt = (storage = globalThis.sessionStorage) => {
  storage?.removeItem?.(CHECKOUT_ATTEMPT_STORAGE);
};

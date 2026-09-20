const CHECKOUT_KEY_STORAGE = 'souvenir-checkout-key';

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
};

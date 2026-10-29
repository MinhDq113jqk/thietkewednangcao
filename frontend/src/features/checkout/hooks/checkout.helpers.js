import { validateShippingAddress } from '../../../../../backend/src/shared/addressValidation.mjs';

export const checkoutInitialForm = {
  name: '',
  phone: '',
  address: '',
  city: '',
  note: '',
};

export const checkoutPaymentOptions = [
  { value: 'cod', label: 'Thanh toán khi nhận hàng (COD)' },
  { value: 'bank_transfer', label: 'Chuyển khoản ngân hàng (VietQR)' },
];

export const checkoutRequiredMessage = 'Vui lòng điền đầy đủ thông tin giao hàng';

export const formFromSavedAddress = (address, currentForm) => {
  const shipping = { name: address?.name, phone: address?.phone, address: address?.detail, city: address?.city, district: address?.district };
  const result = validateShippingAddress(shipping);
  return result.valid ? { ...currentForm, ...result.value } : null;
};

export const updateCheckoutForm = (form, fieldName, value) => ({
  ...form,
  [fieldName]: value,
});

export const hasRequiredCheckoutFields = (form) =>
  validateShippingAddress(form).valid;

export const hasCheckoutQuote = (quote) => Boolean(
  quote && /^[a-f0-9]{64}$/.test(quote.fingerprint)
  && Array.isArray(quote.shops) && quote.shops.length > 0
  && [quote.subtotal, quote.fee, quote.total].every((amount) => Number.isSafeInteger(amount) && amount >= 0)
  && quote.total === quote.subtotal + quote.fee
);

export const getShippingFee = (shippingEstimate) => shippingEstimate?.fee ?? null;

export const keepCheckoutAttempt = (requestError) => {
  const status = requestError.response?.status;
  const code = requestError.response?.data?.error?.code || requestError.response?.data?.code;
  return !status || status >= 500 || ['ORDER_IN_PROGRESS', 'IDEMPOTENCY_KEY_REUSED'].includes(code);
};

export const createCheckoutPayload = ({ items, form, quote, payment }) => {
  const { value, valid } = validateShippingAddress(form);
  if (!valid) throw new Error(checkoutRequiredMessage);
  return {
    items: items.map((item) => ({ productId: item.id, ...(item.variantId ? { variantId: item.variantId } : {}), quantity: item.quantity })),
    shippingAddress: {
      name: value.name,
      phone: value.phone,
      address: value.address,
      city: value.city,
      ...(value.district ? { district: value.district } : {}),
    },
    quoteFingerprint: quote.fingerprint,
    paymentMethod: payment,
    note: form.note.trim(),
  };
};

export const getCheckoutSuccessMessage = (payment) =>
  payment === 'bank_transfer'
    ? 'Tạo mã QR ngân hàng (VietQR) bên dưới và chuyển khoản đúng nội dung để gian hàng đối soát nhanh hơn.'
    : 'Gian hàng sẽ xác nhận đơn và cập nhật hành trình vận chuyển ngay sau khi bàn giao.';

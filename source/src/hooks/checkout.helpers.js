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

export const updateCheckoutForm = (form, fieldName, value) => ({
  ...form,
  [fieldName]: value,
});

export const hasRequiredCheckoutFields = (form) =>
  Boolean(form.name && form.phone && form.address && form.city);

export const getShippingFee = (shippingEstimate) => shippingEstimate?.fee ?? 0;

export const calculatePayableTotal = (subtotal, shippingFee) => subtotal + shippingFee;

export const createCheckoutPayload = ({ items, form, shippingFee, payment }) => ({
  items: items.map((item) => ({ productId: item.id, quantity: item.quantity })),
  shippingAddress: {
    name: form.name,
    phone: form.phone,
    address: form.address,
    city: form.city,
  },
  shippingFee,
  paymentMethod: payment,
  note: form.note,
});

export const getCheckoutSuccessMessage = (payment) =>
  payment === 'bank_transfer'
    ? 'Tạo mã QR ngân hàng (VietQR) bên dưới và chuyển khoản đúng nội dung để gian hàng đối soát nhanh hơn.'
    : 'Gian hàng sẽ xác nhận đơn và cập nhật hành trình vận chuyển ngay sau khi bàn giao.';

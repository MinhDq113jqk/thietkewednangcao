const ACTIVE_QR_ORDER_STATUSES = new Set(['pending', 'confirmed', 'packing', 'shipping']);

const getOrderPaymentAmount = (order) => (
  Number(order?.total || 0) + Number(order?.shippingFee || 0)
);

const validateVietQrOrder = (order) => {
  if (!order) return 'Không tìm thấy đơn hàng';
  if (order.paymentMethod !== 'bank_transfer') {
    return 'Đơn hàng không sử dụng phương thức chuyển khoản';
  }
  if (order.paymentStatus !== 'unpaid') {
    return 'Đơn hàng không còn ở trạng thái chờ thanh toán';
  }
  if (!ACTIVE_QR_ORDER_STATUSES.has(order.status)) {
    return 'Không thể tạo mã thanh toán cho trạng thái đơn hàng hiện tại';
  }
  if (getOrderPaymentAmount(order) <= 0) {
    return 'Số tiền thanh toán không hợp lệ';
  }
  return null;
};

const validateManualPaymentStatus = (order, nextStatus) => {
  if (!['paid', 'refunded'].includes(nextStatus)) return 'Trạng thái thanh toán không hợp lệ';
  if (order.paymentMethod !== 'bank_transfer') {
    return 'Chỉ đối soát thủ công cho đơn chuyển khoản';
  }
  if (nextStatus === 'paid') {
    if (['cancelled', 'returned'].includes(order.status)) {
      return 'Không thể xác nhận thanh toán cho đơn đã hủy hoặc hoàn trả';
    }
    if (order.paymentStatus === 'refunded') return 'Khoản thanh toán đã được hoàn tiền';
  }
  if (nextStatus === 'refunded' && order.paymentStatus !== 'paid') {
    return 'Chỉ hoàn tiền cho đơn đã thanh toán';
  }
  return null;
};

module.exports = {
  getOrderPaymentAmount,
  validateManualPaymentStatus,
  validateVietQrOrder,
};

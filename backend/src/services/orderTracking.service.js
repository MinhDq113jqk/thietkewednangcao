const statusLabels = {
  pending: 'Đơn hàng đã được tạo',
  confirmed: 'Gian hàng đã xác nhận đơn',
  packing: 'Đơn hàng đang được đóng gói',
  shipping: 'Đơn hàng đang được vận chuyển',
  delivered: 'Đơn hàng đã giao thành công',
  cancelled: 'Đơn hàng đã hủy',
  returned: 'Đơn hàng đã hoàn trả',
};

const createTrackingEvent = ({
  status,
  location = '',
  note = '',
  occurredAt = new Date(),
}) => ({
  status,
  label: statusLabels[status] || status,
  location: String(location || '').trim(),
  note: String(note || '').trim(),
  occurredAt: new Date(occurredAt).toISOString(),
});

const appendTrackingEvent = (order, event) => [
  ...(Array.isArray(order.trackingHistory) ? order.trackingHistory : []),
  createTrackingEvent(event),
];

module.exports = {
  appendTrackingEvent,
  createTrackingEvent,
  statusLabels,
};

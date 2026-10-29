export const orderedOrderStatuses = [
  'pending',
  'confirmed',
  'packing',
  'shipping',
  'delivered',
];

export const orderStatusLabels = {
  pending: 'Đã đặt hàng',
  confirmed: 'Đã xác nhận',
  packing: 'Đang đóng gói',
  shipping: 'Đang vận chuyển',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy',
  returned: 'Đã hoàn trả',
};

export const orderStatusColors = {
  pending: 'bg-[#FFF7D6] text-[#7A5B00]',
  confirmed: 'bg-[#E6F3F1] text-[#0F766E]',
  packing: 'bg-[#F0EDFF] text-[#6046A8]',
  shipping: 'bg-[#EAF2FF] text-[#2563EB]',
  delivered: 'bg-[#E8F6EA] text-[#287A38]',
  cancelled: 'bg-[#FFF1EE] text-[#C93F2C]',
  returned: 'bg-[#EDF1EF] text-[#5E6B66]',
};

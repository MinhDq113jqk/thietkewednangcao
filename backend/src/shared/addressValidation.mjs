export function validateAddress(input) {
  const errors = {};
  const value = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { value, errors: { name: 'Địa chỉ không hợp lệ' }, valid: false };
  for (const [field, label, max, required] of [
    ['name', 'Tên người nhận', 100, true], ['detail', 'Địa chỉ chi tiết', 300, true],
    ['city', 'Tỉnh / Thành', 100, true], ['district', 'Quận / Huyện', 100, false],
  ]) {
    const raw = input[field];
    const text = typeof raw === 'string' ? raw.trim() : '';
    if ((required && !text) || text.length > max || (raw != null && typeof raw !== 'string')) errors[field] = `${label}${required ? ' là bắt buộc và' : ''} tối đa ${max} ký tự`;
    value[field] = text;
  }
  value.phone = typeof input.phone === 'string' ? input.phone.trim().replace(/[\s().-]/g, '') : '';
  if (!/^\+?\d{9,15}$/.test(value.phone)) errors.phone = 'Số điện thoại cần từ 9 đến 15 chữ số';
  if (input.isDefault !== undefined && typeof input.isDefault !== 'boolean') errors.isDefault = 'Trạng thái mặc định phải là boolean';
  value.isDefault = input.isDefault === true;
  return { value, errors, valid: !Object.keys(errors).length };
}

export function validateShippingAddress(input) {
  const source = input && typeof input === 'object' && !Array.isArray(input)
    ? { name: input.name, phone: input.phone, detail: input.address, city: input.city, district: input.district }
    : input;
  const { value, errors, valid } = validateAddress(source);
  const { detail: addressError, ...fieldErrors } = errors;
  return {
    value: {
      name: value.name || '', phone: value.phone || '', address: value.detail || '',
      district: value.district || '', city: value.city || '',
    },
    errors: { ...fieldErrors, ...(addressError ? { address: addressError } : {}) },
    valid,
  };
}

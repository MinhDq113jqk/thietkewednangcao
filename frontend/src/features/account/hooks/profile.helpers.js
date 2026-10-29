export const createProfileInitialForm = (user) => ({
  name: user?.name ?? '',
  phone: user?.phone ?? '',
});

export const updateFormField = (form, fieldName, value) => ({
  ...form,
  [fieldName]: value,
});

export const initialAddressForm = {
  name: '',
  phone: '',
  detail: '',
  district: '',
  city: '',
  isDefault: false,
};

export const createAddressForm = (address) => ({
  ...initialAddressForm,
  ...(address || {}),
});

export const createAddressPayload = (form) => ({
  name: form.name,
  phone: form.phone,
  detail: form.detail,
  district: form.district,
  city: form.city,
  isDefault: Boolean(form.isDefault),
});

export const initialPasswordForm = {
  current: '',
  next: '',
  confirm: '',
};

export const validatePasswordForm = (form) => {
  const errors = {};
  if (!form.current) errors.current = 'Nhập mật khẩu hiện tại';
  if (form.next.length < 8) errors.next = 'Tối thiểu 8 ký tự';
  if (form.next !== form.confirm) errors.confirm = 'Mật khẩu xác nhận không khớp';
  return errors;
};

export const createPasswordPayload = (form) => ({
  currentPassword: form.current,
  newPassword: form.next,
});

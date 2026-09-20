export const loginInitialForm = {
  email: '',
  password: '',
  name: '',
};

export const loginRequiredMessage = 'Vui lòng điền đầy đủ email và mật khẩu';
export const registerNameRequiredMessage = 'Vui lòng nhập họ tên';
export const passwordLengthMessage = 'Mật khẩu cần ít nhất 8 ký tự';

export const updateLoginForm = (form, fieldName, value) => ({
  ...form,
  [fieldName]: value,
});

export const validateLoginForm = ({ form, isLogin }) => {
  if (!form.email || !form.password) return loginRequiredMessage;
  if (!isLogin && !form.name) return registerNameRequiredMessage;
  if (!isLogin && form.password.length < 8) return passwordLengthMessage;
  return '';
};

export const createAuthRequest = ({ form, isLogin }) => ({
  endpoint: isLogin ? '/auth/login' : '/auth/register',
  payload: isLogin
    ? { email: form.email.trim().toLowerCase(), password: form.password }
    : {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      },
});

export const getSafeRedirectPath = (value, fallback = '/') => {
  const path = String(value || '');
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) {
    return fallback;
  }
  return path;
};

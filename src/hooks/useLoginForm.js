import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import useAuthStore from '../store/authStore';
import {
  createAuthRequest,
  getSafeRedirectPath,
  loginInitialForm,
  updateLoginForm,
  validateLoginForm,
} from './loginForm.helpers';

export function useLoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState(loginInitialForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const redirectTo = getSafeRedirectPath(
    location.state?.from?.pathname ||
    new URLSearchParams(location.search).get('from')
  );

  const handleChange = (event) => {
    setForm((currentForm) =>
      updateLoginForm(currentForm, event.target.name, event.target.value)
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validateLoginForm({ form, isLogin });
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setLoading(true);

    try {
      const { endpoint, payload } = createAuthRequest({ form, isLogin });
      const res = await axiosInstance.post(endpoint, payload);
      login(res.data);
      navigate(isLogin ? redirectTo : '/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Đã có lỗi xảy ra, thử lại sau');
    } finally {
      setLoading(false);
    }
  };

  return {
    error,
    form,
    handleChange,
    handleSubmit,
    isLogin,
    loading,
    setIsLogin,
  };
}

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import shopApi from '../api/shopApi';
import { toast } from '../components/ui/toastStore';
import useAuthStore from '../store/authStore';
import {
  sellerRegisterInitialForm,
  updateSellerRegisterForm,
} from './sellerRegister.helpers';

export function useSellerRegister() {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const user = useAuthStore((state) => state.user);
  const [form, setForm] = useState(sellerRegisterInitialForm);

  const registerShop = useMutation({
    mutationFn: shopApi.registerShop,
    onSuccess: () => {
      setUser({ ...user, role: 'seller' });
      toast.success('Đã gửi đăng ký gian hàng');
      navigate('/seller/settings', { replace: true });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Không thể đăng ký gian hàng'),
  });

  const handleChange = (event) => {
    setForm((currentForm) =>
      updateSellerRegisterForm(currentForm, event.target.name, event.target.value)
    );
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    registerShop.mutate(form);
  };

  return {
    form,
    handleChange,
    handleSubmit,
    registerShop,
  };
}

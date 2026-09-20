import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import orderApi from '../api/orderApi';
import shippingApi from '../api/shippingApi';
import { toast } from '../components/ui/toastStore';
import useCartStore from '../store/cartStore';
import { clearCheckoutKey, getOrCreateCheckoutKey } from '../utils/checkoutSession';
import {
  calculatePayableTotal,
  checkoutInitialForm,
  checkoutRequiredMessage,
  createCheckoutPayload,
  getCheckoutSuccessMessage,
  getShippingFee,
  hasRequiredCheckoutFields,
  updateCheckoutForm,
} from './checkout.helpers';

export function useCheckout() {
  const navigate = useNavigate();
  const { items, totalPrice, clearCart } = useCartStore();
  const [form, setForm] = useState(checkoutInitialForm);
  const [payment, setPayment] = useState('cod');
  const [activeStep, setActiveStep] = useState(2);
  const [createdOrders, setCreatedOrders] = useState([]);
  const [error, setError] = useState('');

  const subtotal = totalPrice();
  const { data: shippingEstimate, isLoading: shippingLoading } = useQuery({
    queryKey: ['shipping-estimate', form.city, subtotal],
    queryFn: () => shippingApi.estimate({ city: form.city, subtotal }),
    enabled: Boolean(form.city && subtotal > 0),
  });
  const shippingFee = getShippingFee(shippingEstimate);
  const payableTotal = calculatePayableTotal(subtotal, shippingFee);

  const createOrder = useMutation({
    mutationFn: orderApi.createOrder,
    onSuccess: (data) => {
      setCreatedOrders(data.orders || []);
      clearCheckoutKey();
      clearCart();
      setActiveStep(3);
      toast.success(
        data.idempotentReplay
          ? 'Đã khôi phục đơn hàng trước đó'
          : 'Đặt hàng thành công'
      );
    },
    onError: (requestError) => {
      setError(
        requestError.response?.data?.message ||
        'Chưa nhận được phản hồi từ máy chủ. Bạn có thể nhấn lại, hệ thống sẽ không tạo đơn trùng.'
      );
    },
  });

  const handleChange = (event) => {
    setForm((currentForm) =>
      updateCheckoutForm(currentForm, event.target.name, event.target.value)
    );
  };

  const handleOrder = () => {
    if (!hasRequiredCheckoutFields(form)) {
      setError(checkoutRequiredMessage);
      return;
    }

    setError('');
    createOrder.mutate({
      payload: createCheckoutPayload({ items, form, shippingFee, payment }),
      idempotencyKey: getOrCreateCheckoutKey(),
    });
  };

  return {
    activeStep,
    createOrder,
    createdOrders,
    error,
    form,
    goToOrders: () => navigate('/orders'),
    handleChange,
    handleOrder,
    items,
    payableTotal,
    payment,
    setPayment,
    shippingEstimate,
    shippingFee,
    shippingLoading,
    subtotal,
    successMessage: getCheckoutSuccessMessage(payment),
  };
}

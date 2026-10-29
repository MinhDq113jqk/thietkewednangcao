import { useAccountQuery } from '../../../hooks/useAccountQuery';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import orderApi from '../../orders/api/orderApi';
import shippingApi from '../api/shippingApi';
import userApi from '../../account/api/userApi';
import { toast } from '../../../components/ui/toastStore';
import useCartStore from '../../cart/store/cartStore';
import useAuthStore from '../../auth/store/authStore';
import { validateShippingAddress } from '../../../../../backend/src/shared/addressValidation.mjs';
import {
  clearCheckoutAttempt, clearCheckoutKey, getCheckoutAttempt,
  accountCheckoutStorage,
  getOrCreateCheckoutKey, saveCheckoutAttempt,
} from '../../../utils/checkoutSession';
import {
  checkoutInitialForm,
  checkoutRequiredMessage,
  createCheckoutPayload,
  getCheckoutSuccessMessage,
  getShippingFee,
  hasCheckoutQuote,
  keepCheckoutAttempt,
  updateCheckoutForm,
  formFromSavedAddress,
} from './checkout.helpers';

export function useCheckout() {
  const accountId = useAuthStore((state) => state.user?.id);
  const storage = accountCheckoutStorage(globalThis.sessionStorage, accountId);
  const navigate = useNavigate();
  const { items: cartItems, totalPrice, clearCart } = useCartStore();
  const [pendingCheckout, setPendingCheckout] = useState(() => getCheckoutAttempt(storage));
  const [form, setForm] = useState(() => pendingCheckout ? {
    ...checkoutInitialForm, ...pendingCheckout.payload.shippingAddress, note: pendingCheckout.payload.note || '',
  } : checkoutInitialForm);
  const [payment, setPayment] = useState(() => pendingCheckout?.payload.paymentMethod || 'cod');
  const [activeStep, setActiveStep] = useState(2);
  const [createdOrders, setCreatedOrders] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const addressQuery = useAccountQuery({ queryKey: ['addresses'], queryFn: ({ signal }) => userApi.getAddresses(signal), retry: false });
  const defaultAddress = addressQuery.data?.find(address => address.isDefault);
  const applyDefaultAddress = () => {
    const next = formFromSavedAddress(defaultAddress, form);
    if (next && !pendingCheckout && !createOrder.isPending) { setForm(next); setFieldErrors({}); setError(''); }
  };
  const [error, setError] = useState(() => pendingCheckout
    ? 'Yêu cầu trước chưa được xác nhận. Nhấn kiểm tra lại để nhận kết quả của cùng đơn hàng.' : '');

  const originalItems = pendingCheckout?.items || cartItems;
  const quoteItems = originalItems.map((item) => ({ productId: item.id, ...(item.variantId ? { variantId: item.variantId } : {}), quantity: item.quantity }))
    .sort((left, right) => left.productId.localeCompare(right.productId) || String(left.variantId || '').localeCompare(String(right.variantId || '')));
  const city = form.city.trim();
  const shippingQuery = useAccountQuery({
    queryKey: ['checkout-quote', city, quoteItems],
    queryFn: ({ signal }) => shippingApi.estimate({ city, items: quoteItems }, signal),
    enabled: Boolean(!pendingCheckout && city && quoteItems.length),
    retry: false,
  });
  const shippingEstimate = pendingCheckout?.quote || shippingQuery.data;
  const shippingLoading = !pendingCheckout && shippingQuery.isFetching;
  const shippingReady = hasCheckoutQuote(shippingEstimate) && (Boolean(pendingCheckout)
    || Boolean(city && !shippingLoading && !shippingQuery.isError));
  const shippingError = !pendingCheckout && shippingQuery.isError
    ? shippingQuery.error.response?.data?.message || 'Không thể báo phí vận chuyển. Vui lòng thử lại.' : '';
  const quoteLines = new Map((shippingEstimate?.shops || []).flatMap((shop) =>
    shop.items.map((item) => [`${item.productId}:${item.variantId || item.productId}`, item])));
  const items = originalItems.map((item) => {
    const line = quoteLines.get(`${item.id}:${item.variantId || item.id}`);
    return line ? { ...item, name: line.name, price: line.price, salePrice: null } : item;
  });
  const subtotal = shippingEstimate?.subtotal ?? totalPrice();
  const shippingFee = getShippingFee(shippingEstimate);
  const payableTotal = shippingReady ? shippingEstimate.total : null;

  const createOrder = useMutation({
    mutationFn: orderApi.createOrder,
    onSuccess: (data) => {
      setCreatedOrders(data.orders || []);
      clearCheckoutKey(storage);
      setPendingCheckout(null);
      clearCart();
      setActiveStep(3);
      window.scrollTo({ top: 0, behavior: 'auto' });
      toast.success(
        data.idempotentReplay
          ? 'Đã khôi phục đơn hàng trước đó'
          : 'Đặt hàng thành công'
      );
    },
    onError: (requestError) => {
      setFieldErrors(requestError.response?.data?.error?.details || {});
      if (!keepCheckoutAttempt(requestError)) {
        clearCheckoutAttempt(storage);
        setPendingCheckout(null);
        shippingQuery.refetch();
      }
      setError(
        requestError.response?.data?.message ||
        'Chưa nhận được phản hồi từ máy chủ. Nhấn kiểm tra lại để nhận kết quả của cùng đơn hàng.'
      );
    },
  });

  const handleChange = (event) => {
    setFieldErrors((current) => ({ ...current, [event.target.name]: undefined }));
    setForm((currentForm) =>
      updateCheckoutForm(currentForm, event.target.name, event.target.value)
    );
  };

  const handleOrder = () => {
    if (createOrder.isPending) return;
    if (pendingCheckout) {
      setError('');
      createOrder.mutate({ payload: pendingCheckout.payload, idempotencyKey: pendingCheckout.idempotencyKey });
      return;
    }
    const validation = validateShippingAddress(form);
    setFieldErrors(validation.errors);
    if (!validation.valid) {
      setError(Object.values(validation.errors)[0] || checkoutRequiredMessage);
      return;
    }
    if (!shippingReady) {
      setError('Vui lòng chờ báo giá và phí vận chuyển hoàn tất trước khi đặt hàng');
      return;
    }

    setError('');
    const attempt = {
      payload: createCheckoutPayload({ items, form, quote: shippingEstimate, payment }),
      idempotencyKey: getOrCreateCheckoutKey(storage),
      quote: shippingEstimate,
      items,
    };
    saveCheckoutAttempt(attempt, storage);
    setPendingCheckout(attempt);
    createOrder.mutate({ payload: attempt.payload, idempotencyKey: attempt.idempotencyKey });
  };

  return {
    defaultAddress,
    applyDefaultAddress,
    activeStep,
    createOrder,
    createdOrders,
    checkoutLocked: Boolean(pendingCheckout),
    error,
    fieldErrors,
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
    shippingReady,
    shippingError,
    retryShipping: () => shippingQuery.refetch(),
    subtotal,
    successMessage: getCheckoutSuccessMessage(payment),
  };
}

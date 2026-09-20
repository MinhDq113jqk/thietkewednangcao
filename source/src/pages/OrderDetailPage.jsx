import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarClock,
  Copy,
  MapPin,
  PackageOpen,
  Store,
  Truck,
  XCircle,
} from 'lucide-react';
import orderApi from '../api/orderApi';
import OrderTimeline from '../components/OrderTimeline';
import PaymentQR from '../components/PaymentQR';
import Skeleton from '../components/ui/Skeleton';
import Spinner from '../components/ui/Spinner';
import { toast } from '../components/ui/toastStore';
import {
  calculateLineTotal,
  calculateOrderTotal,
  formatVnd,
} from '../utils/format';
import { orderStatusColors, orderStatusLabels } from '../utils/orderStatus';

const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'long' }).format(new Date(value))
    : 'Chưa có';

function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: order, isLoading, isError } = useQuery({
    queryKey: ['order', id],
    queryFn: () => orderApi.getOrder(id),
    enabled: Boolean(id),
    refetchInterval: (query) => query.state.data?.status === 'shipping' ? 15_000 : false,
  });

  const cancelOrder = useMutation({
    mutationFn: orderApi.cancelOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Đã hủy đơn hàng');
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Không thể hủy đơn'),
  });

  if (isLoading) {
    return (
      <main className="mx-auto min-h-[60vh] max-w-7xl px-4 py-8" aria-busy="true">
        <Skeleton className="h-4 w-32" />
        <div className="mt-5 flex items-center justify-between gap-4 border-b border-[#DDE4E0] pb-5">
          <div className="space-y-3">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-8 w-28" />
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <Skeleton className="h-44 w-full rounded-lg" />
            <Skeleton className="h-56 w-full rounded-lg" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-52 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
        </div>
      </main>
    );
  }

  if (isError || !order) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-7xl flex-col items-center justify-center px-4 text-center">
        <PackageOpen size={46} className="text-[#8A9691]" />
        <h1 className="mt-4 font-display text-2xl font-semibold text-[#17201D]">Không tìm thấy đơn hàng</h1>
        <button type="button" onClick={() => navigate('/orders')} className="mt-5 rounded-lg bg-[#17201D] px-5 py-3 text-sm font-bold text-white">Quay lại đơn hàng</button>
      </main>
    );
  }

  const total = calculateOrderTotal(order);
  const copyTrackingCode = async () => {
    await navigator.clipboard.writeText(order.trackingCode);
    toast.success('Đã sao chép mã vận đơn');
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <Link to="/orders" className="inline-flex items-center gap-2 text-sm font-semibold text-[#68756F] hover:text-[#0F766E]">
        <ArrowLeft size={16} aria-hidden />
        Tất cả đơn hàng
      </Link>

      <header className="mt-5 flex flex-wrap items-start justify-between gap-4 border-b border-[#DDE4E0] pb-5">
        <div>
          <p className="text-xs font-bold uppercase text-[#2563EB]">Chi tiết đơn hàng</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-[#17201D]">Đơn #{order.id.slice(0, 8)}</h1>
          <p className="mt-2 text-sm text-[#68756F]">Đặt ngày {formatDate(order.createdAt)}</p>
        </div>
        <span className={`rounded-md px-3 py-2 text-xs font-bold ${orderStatusColors[order.status] || orderStatusColors.pending}`}>
          {orderStatusLabels[order.status] || order.status}
        </span>
      </header>

      {order.status === 'shipping' && (
        <section className="mt-6 grid gap-5 rounded-lg border border-[#BCD2F5] bg-[#F3F7FF] p-5 md:grid-cols-3" aria-label="Thông tin vận chuyển hiện tại">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase text-[#2563EB]"><MapPin size={15} />Vị trí hiện tại</p>
            <p className="mt-2 text-sm font-semibold text-[#17201D]">{order.currentLocation || 'Đang cập nhật'}</p>
          </div>
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase text-[#2563EB]"><Truck size={15} />Đơn vị vận chuyển</p>
            <p className="mt-2 text-sm font-semibold text-[#17201D]">{order.carrier || 'Đang cập nhật'}</p>
            {order.trackingCode && (
              <button type="button" onClick={copyTrackingCode} className="mt-1 flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:underline">
                {order.trackingCode} <Copy size={13} />
              </button>
            )}
          </div>
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase text-[#2563EB]"><CalendarClock size={15} />Giao dự kiến</p>
            <p className="mt-2 text-sm font-semibold text-[#17201D]">{formatDate(order.estimatedDeliveryAt)}</p>
          </div>
        </section>
      )}

      <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-8">
          <section className="rounded-lg border border-[#DDE4E0] bg-white p-5" aria-labelledby="timeline-heading">
            <h2 id="timeline-heading" className="font-display text-xl font-semibold text-[#17201D]">Hành trình đơn hàng</h2>
            <div className="mt-5">
              <OrderTimeline order={order} />
            </div>
          </section>

          <section aria-labelledby="items-heading">
            <div className="flex items-center justify-between gap-3">
              <h2 id="items-heading" className="font-display text-xl font-semibold text-[#17201D]">Sản phẩm</h2>
              {order.shop && (
                <Link to={`/shop/${order.shop.slug}`} className="flex items-center gap-1.5 text-xs font-semibold text-[#0F766E] hover:underline">
                  <Store size={14} />{order.shop.name}
                </Link>
              )}
            </div>
            <div className="mt-4 divide-y divide-[#EDF1EF] border-y border-[#DDE4E0] bg-white">
              {order.items?.map((item) => (
                <div key={item.id} className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3 p-4">
                  <div className="h-16 w-16 overflow-hidden rounded-lg bg-[#EEF2EF]">
                    {item.image ? <img src={item.image} alt={item.name} className="h-full w-full object-cover" /> : <PackageOpen className="m-auto h-full text-[#8A9691]" size={24} />}
                  </div>
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-semibold text-[#17201D]">{item.name}</p>
                    <p className="mt-1 text-xs text-[#68756F]">{formatVnd(item.price)} × {item.quantity}</p>
                  </div>
                  <strong className="text-sm text-[#17201D]">{formatVnd(calculateLineTotal(item))}</strong>
                </div>
              ))}
            </div>
          </section>

          {order.paymentMethod === 'bank_transfer' && order.paymentStatus === 'unpaid' && (
            <section>
              <h2 className="mb-4 font-display text-xl font-semibold text-[#17201D]">Thanh toán đơn hàng</h2>
              <PaymentQR order={order} />
            </section>
          )}
        </div>

        <aside className="space-y-5">
          <section className="rounded-lg border border-[#DDE4E0] bg-white p-5">
            <h2 className="font-display text-xl font-semibold text-[#17201D]">Tổng thanh toán</h2>
            <dl className="mt-5 space-y-3 text-sm text-[#5E6B66]">
              <div className="flex justify-between"><dt>Tạm tính</dt><dd>{formatVnd(order.total)}</dd></div>
              <div className="flex justify-between"><dt>Phí vận chuyển</dt><dd>{formatVnd(order.shippingFee)}</dd></div>
              <div className="flex justify-between border-t border-[#EDF1EF] pt-4 font-bold text-[#17201D]"><dt>Tổng cộng</dt><dd className="text-lg text-[#C93F2C]">{formatVnd(total)}</dd></div>
            </dl>
            <p className="mt-4 text-xs text-[#68756F]">Thanh toán: {order.paymentMethod === 'bank_transfer' ? 'VietQR' : 'Khi nhận hàng (COD)'}</p>
            {order.status === 'pending' && (
              <button type="button" onClick={() => cancelOrder.mutate(order.id)} disabled={cancelOrder.isPending} aria-busy={cancelOrder.isPending} className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#F0C3BB] text-sm font-bold text-[#C93F2C] hover:bg-[#FFF1EE]">
                {cancelOrder.isPending
                  ? <Spinner size="sm" label="Đang hủy đơn..." />
                  : <XCircle size={16} aria-hidden />}
                {cancelOrder.isPending ? 'Đang hủy...' : 'Hủy đơn'}
              </button>
            )}
          </section>

          <section className="rounded-lg border border-[#DDE4E0] bg-white p-5">
            <h2 className="font-display text-xl font-semibold text-[#17201D]">Địa chỉ nhận hàng</h2>
            <address className="mt-4 not-italic text-sm leading-6 text-[#5E6B66]">
              <strong className="block text-[#17201D]">{order.shippingAddress?.name}</strong>
              <span className="block">{order.shippingAddress?.phone}</span>
              <span className="block">{order.shippingAddress?.address}</span>
              <span className="block">{order.shippingAddress?.city}</span>
            </address>
          </section>
        </aside>
      </div>
    </main>
  );
}

export default OrderDetailPage;

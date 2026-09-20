import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  MapPin,
  PackageOpen,
  ShoppingBag,
  Store,
  Truck,
  XCircle,
} from 'lucide-react';
import orderApi from '../api/orderApi';
import { toast } from '../components/ui/toastStore';
import { OrderCardSkeleton } from '../components/ui/Skeleton';
import Spinner from '../components/ui/Spinner';
import { calculateOrderTotal, formatVnd } from '../utils/format';
import {
  orderedOrderStatuses,
  orderStatusColors,
  orderStatusLabels,
} from '../utils/orderStatus';

const filters = [
  { value: 'all', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ xác nhận' },
  { value: 'shipping', label: 'Đang giao' },
  { value: 'delivered', label: 'Đã giao' },
  { value: 'cancelled', label: 'Đã hủy' },
];

function OrderProgress({ status }) {
  const currentIndex = orderedOrderStatuses.indexOf(status);
  const progress = currentIndex < 0 ? 0 : (currentIndex / (orderedOrderStatuses.length - 1)) * 100;

  return (
    <div>
      <div className="relative h-1 rounded-full bg-[#E3E9E5]">
        <span className="absolute inset-y-0 left-0 rounded-full bg-[#0F766E]" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-[#7A8781]">
        <span>Đã đặt</span>
        <span>Đóng gói</span>
        <span>Đang giao</span>
        <span>Đã nhận</span>
      </div>
    </div>
  );
}

function OrdersPage() {
  const [filter, setFilter] = useState('all');
  const queryClient = useQueryClient();
  const { data: orders = [], isLoading, isError } = useQuery({
    queryKey: ['orders'],
    queryFn: orderApi.getOrders,
    refetchInterval: 30_000,
  });

  const visibleOrders = useMemo(
    () => filter === 'all' ? orders : orders.filter((order) => order.status === filter),
    [filter, orders]
  );

  const cancelOrder = useMutation({
    mutationFn: orderApi.cancelOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Đã hủy đơn hàng');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Không thể hủy đơn hàng');
    },
  });

  return (
    <main className="mx-auto min-h-[65vh] max-w-7xl px-4 py-8" aria-busy={isLoading}>
      <div className="border-b border-[#DDE4E0] pb-5">
        <p className="text-xs font-bold uppercase text-[#2563EB]">Theo dõi mua sắm</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-[#17201D]">Đơn hàng của tôi</h1>
        <p className="mt-2 text-sm text-[#68756F]">Vị trí và trạng thái tự làm mới trong khi đơn đang vận chuyển.</p>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-[#DDE4E0] py-3" role="tablist" aria-label="Lọc đơn hàng">
        {filters.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            className={`shrink-0 border-b-2 px-4 py-2 text-sm font-semibold ${
              filter === item.value
                ? 'border-[#2563EB] text-[#2563EB]'
                : 'border-transparent text-[#68756F] hover:text-[#17201D]'
            }`}
            role="tab"
            aria-selected={filter === item.value}
          >
            {item.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="mt-6 grid gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <OrderCardSkeleton key={index} />
          ))}
        </div>
      )}

      {isError && (
        <div className="mt-8 rounded-lg border border-[#F3C9C1] bg-[#FFF1EE] p-6 text-center text-sm text-[#A73525]">
          Không thể tải danh sách đơn hàng. Kiểm tra kết nối và thử lại.
        </div>
      )}

      {!isLoading && !isError && orders.length === 0 && (
        <div className="flex flex-col items-center py-16 text-center">
          <ShoppingBag size={42} className="text-[#8A9691]" strokeWidth={1.4} aria-hidden />
          <h2 className="mt-4 font-display text-2xl font-semibold text-[#17201D]">Bạn chưa có đơn hàng</h2>
          <Link to="/products" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#0F766E] px-5 py-3 text-sm font-bold text-white hover:bg-[#0B5F58]">
            Khám phá sản phẩm <ArrowRight size={17} />
          </Link>
        </div>
      )}

      <div className="mt-6 grid gap-4">
        {!isLoading && !isError && visibleOrders.map((order) => {
          const total = calculateOrderTotal(order);
          const firstItem = order.items?.[0];
          const remainingItems = Math.max(0, (order.items?.length || 0) - 1);
          const isTerminal = ['cancelled', 'returned'].includes(order.status);

          return (
            <article key={order.id} className="rounded-lg border border-[#DDE4E0] bg-white">
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EDF1EF] px-4 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Store size={16} className="shrink-0 text-[#0F766E]" aria-hidden />
                  <span className="truncate text-sm font-semibold text-[#17201D]">{order.shop?.name || 'Gian hàng'}</span>
                  <span className="text-xs text-[#8A9691]">#{order.id.slice(0, 8)}</span>
                </div>
                <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${orderStatusColors[order.status] || orderStatusColors.pending}`}>
                  {orderStatusLabels[order.status] || order.status}
                </span>
              </header>

              <div className="grid gap-5 p-4 md:grid-cols-[minmax(0,1fr)_280px]">
                <div className="min-w-0">
                  <div className="grid grid-cols-[68px_minmax(0,1fr)_auto] items-center gap-3">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg bg-[#EEF2EF]">
                      {firstItem?.image ? (
                        <img src={firstItem.image} alt={firstItem.name} className="h-full w-full object-cover" />
                      ) : (
                        <PackageOpen size={26} className="text-[#8A9691]" aria-hidden />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#17201D]">{firstItem?.name || 'Sản phẩm'}</p>
                      <p className="mt-1 text-xs text-[#68756F]">
                        x{firstItem?.quantity || 1}{remainingItems > 0 ? ` · và ${remainingItems} sản phẩm khác` : ''}
                      </p>
                      <time className="mt-2 block text-xs text-[#8A9691]" dateTime={order.createdAt}>
                        Đặt ngày {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                      </time>
                    </div>
                    <strong className="text-sm text-[#C93F2C]">{formatVnd(total)}</strong>
                  </div>

                  {!isTerminal && (
                    <div className="mt-5">
                      <OrderProgress status={order.status} />
                    </div>
                  )}
                </div>

                <div className="flex flex-col justify-between border-t border-[#EDF1EF] pt-4 md:border-l md:border-t-0 md:pl-5 md:pt-0">
                  {order.status === 'shipping' ? (
                    <div>
                      <p className="flex items-center gap-2 text-xs font-bold uppercase text-[#2563EB]">
                        <Truck size={15} aria-hidden />
                        Vị trí hiện tại
                      </p>
                      <p className="mt-2 flex items-start gap-2 text-sm font-semibold text-[#17201D]">
                        <MapPin size={16} className="mt-0.5 shrink-0 text-[#2563EB]" aria-hidden />
                        {order.currentLocation || 'Đang chờ cập nhật từ đơn vị vận chuyển'}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm leading-6 text-[#68756F]">
                      {order.status === 'pending'
                        ? 'Gian hàng đang kiểm tra tồn kho và xác nhận đơn.'
                        : order.status === 'delivered'
                          ? 'Đơn hàng đã được giao đến người nhận.'
                          : order.status === 'cancelled'
                            ? 'Đơn đã hủy và tồn kho đã được hoàn lại.'
                            : 'Đơn hàng đang được chuẩn bị.'}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                    {order.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => cancelOrder.mutate(order.id)}
                        disabled={cancelOrder.isPending}
                        aria-busy={cancelOrder.isPending && cancelOrder.variables === order.id}
                        className="flex h-9 items-center gap-1.5 rounded-md border border-[#F0C3BB] px-3 text-xs font-bold text-[#C93F2C] hover:bg-[#FFF1EE] disabled:opacity-50"
                      >
                        {cancelOrder.isPending && cancelOrder.variables === order.id
                          ? <Spinner size="sm" label="Đang hủy đơn..." />
                          : <XCircle size={15} aria-hidden />}
                        Hủy đơn
                      </button>
                    )}
                    <Link
                      to={`/orders/${order.id}`}
                      className="flex h-9 items-center gap-1.5 rounded-md bg-[#17201D] px-3 text-xs font-bold text-white hover:bg-[#2563EB]"
                    >
                      {order.status === 'shipping' ? 'Theo dõi đơn' : 'Xem chi tiết'}
                      <ArrowRight size={15} aria-hidden />
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {!isLoading && !isError && orders.length > 0 && visibleOrders.length === 0 && (
        <p className="py-14 text-center text-sm text-[#68756F]">Không có đơn ở trạng thái này.</p>
      )}
    </main>
  );
}

export default OrdersPage;

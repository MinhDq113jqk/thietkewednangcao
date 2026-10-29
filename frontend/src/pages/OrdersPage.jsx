import { Container as BsContainer, Button as BsButton } from 'react-bootstrap';
import { useAccountQuery } from '../hooks/useAccountQuery';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import ListPaging from '../components/ui/ListPaging';
import OrderDateFilters from '../components/forms/OrderDateFilters';
import orderApi from '../features/orders/api/orderApi';
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
      <div className="position-relative rounded-pill orders-page-detail-1">
        <span className="position-absolute rounded-pill bg-primary orders-page-detail-2" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-2 d-flex justify-content-between text-secondary orders-page-detail-3">
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
  const [page, setPage] = useState(1);
  const [dates, setDates] = useState({ from: '', to: '', sort: 'newest' });
  const queryClient = useQueryClient();
  const { data, isLoading, isFetching, isError, refetch } = useAccountQuery({
    queryKey: ['orders', { page, filter, ...dates }],
    queryFn: () => orderApi.getOrders({ page, status: filter, ...dates }),
    refetchInterval: 30_000,
  });

  const orders = data?.items || [];
  const visibleOrders = orders;

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
    <BsContainer as="main" className="py-5 orders-page-detail-4" aria-busy={isLoading}>
      <div className="border-bottom pb-4 orders-page-detail-5">
        <p className="booking-caption fw-bold text-uppercase text-primary">Theo dõi mua sắm</p>
        <h1 className="mt-2 booking-title fs-3 fw-semibold text-dark">Đơn hàng của tôi</h1>
        <p className="mt-2 booking-small text-secondary">Vị trí và trạng thái tự làm mới trong khi đơn đang vận chuyển.</p>
      </div>

      <div className="d-flex gap-1 overflow-x-auto border-bottom py-2 orders-page-detail-6" role="tablist" aria-label="Lọc đơn hàng">
        {filters.map((item) => (
          <BsButton variant="outline-primary"
            key={item.value}
            type="button"
            onClick={() => { setFilter(item.value); setPage(1); }}
            className={`flex-shrink-0 border-bottom border-2 px-3 py-2 booking-small fw-semibold ${
              filter === item.value
                ? "border-primary text-primary"
                : "text-secondary orders-page-detail-7"
            }`}
            role="tab"
            aria-selected={filter === item.value}
          >
            {item.label}
          </BsButton>
        ))}
      </div>

      <OrderDateFilters value={dates} onChange={value => { setDates(value); setPage(1); }} />
      {isLoading && (
        <div className="mt-4 d-grid gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <OrderCardSkeleton key={index} />
          ))}
        </div>
      )}

      {isError && (
        <div className="mt-5 rounded-3 border p-4 text-center booking-small text-danger orders-page-detail-8">
          Không thể tải danh sách đơn hàng. Kiểm tra bộ lọc và kết nối.
          <BsButton variant="outline-primary" type="submit" className="ms-2 text-decoration-underline" onClick={() => refetch()}>Thử lại</BsButton>
        </div>
      )}

      {!isLoading && !isError && orders.length === 0 && (
        <div className="d-flex flex-column align-items-center py-5 text-center">
          <ShoppingBag size={42} className="text-secondary" strokeWidth={1.4} aria-hidden />
          <h2 className="mt-3 booking-title fs-4 fw-semibold text-dark">Không có đơn hàng phù hợp</h2>
          <Link to="/products" className="mt-4 d-inline-flex align-items-center gap-2 rounded-3 bg-primary px-4 py-2 booking-small fw-bold orders-page-detail-9">
            Khám phá sản phẩm <ArrowRight size={17} />
          </Link>
        </div>
      )}

      <div className="mt-4 d-grid gap-4">
        {!isLoading && !isError && visibleOrders.map((order) => {
          const total = calculateOrderTotal(order);
          const firstItem = order.items?.[0];
          const remainingItems = Math.max(0, (order.items?.length || 0) - 1);
          const isTerminal = ['cancelled', 'returned'].includes(order.status);

          return (
            <article key={order.id} className="rounded-3 border orders-page-detail-10">
              <header className="d-flex flex-wrap align-items-center justify-content-between gap-3 border-bottom px-3 py-2 orders-page-detail-11">
                <div className="d-flex align-items-center gap-2 orders-page-detail-12">
                  <Store size={16} className="flex-shrink-0 text-primary" aria-hidden />
                  <span className="text-truncate booking-small fw-semibold text-dark">{order.shop?.name || 'Gian hàng'}</span>
                  <span className="booking-caption text-secondary">#{order.id.slice(0, 8)}</span>
                </div>
                <span className={`rounded-2 px-3 py-1 booking-caption fw-bold ${orderStatusColors[order.status] || orderStatusColors.pending}`}>
                  {orderStatusLabels[order.status] || order.status}
                </span>
              </header>

              <div className="d-grid gap-5 p-3 orders-page-detail-13">
                <div className="orders-page-detail-14">
                  <div className="d-grid align-items-center gap-3 orders-page-detail-15">
                    <div className="d-flex align-items-center justify-content-center overflow-hidden rounded-3 orders-page-detail-16">
                      {firstItem?.image ? (
                        <img src={firstItem.image} alt={firstItem.name} className="h-100 w-100 object-fit-cover" />
                      ) : (
                        <PackageOpen size={26} className="text-secondary" aria-hidden />
                      )}
                    </div>
                    <div className="orders-page-detail-17">
                      <p className="text-truncate booking-small fw-semibold text-dark">{firstItem?.name || 'Sản phẩm'}</p>
                      <p className="mt-1 booking-caption text-secondary">
                        x{firstItem?.quantity || 1}{remainingItems > 0 ? ` · và ${remainingItems} sản phẩm khác` : ''}
                      </p>
                      <time className="mt-2 d-block booking-caption text-secondary" dateTime={order.createdAt}>
                        Đặt ngày {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                      </time>
                    </div>
                    <strong className="booking-small text-danger">{formatVnd(total)}</strong>
                  </div>

                  {!isTerminal && (
                    <div className="mt-4">
                      <OrderProgress status={order.status} />
                    </div>
                  )}
                </div>

                <div className="d-flex flex-column justify-content-between border-top pt-3 ps-md-4 pt-md-0 orders-page-detail-18">
                  {order.status === 'shipping' ? (
                    <div>
                      <p className="d-flex align-items-center gap-2 booking-caption fw-bold text-uppercase text-primary">
                        <Truck size={15} aria-hidden />
                        Vị trí hiện tại
                      </p>
                      <p className="mt-2 d-flex align-items-start gap-2 booking-small fw-semibold text-dark">
                        <MapPin size={16} className="mt-1 flex-shrink-0 text-primary" aria-hidden />
                        {order.currentLocation || 'Đang chờ cập nhật từ đơn vị vận chuyển'}
                      </p>
                    </div>
                  ) : (
                    <p className="booking-small text-secondary orders-page-detail-19">
                      {order.status === 'pending'
                        ? 'Gian hàng đang kiểm tra tồn kho và xác nhận đơn.'
                        : order.status === 'delivered'
                          ? 'Đơn hàng đã được giao đến người nhận.'
                          : order.status === 'cancelled'
                            ? 'Đơn đã hủy và tồn kho đã được hoàn lại.'
                            : 'Đơn hàng đang được chuẩn bị.'}
                    </p>
                  )}

                  <div className="mt-3 d-flex flex-wrap align-items-center justify-content-end gap-2">
                    {order.status === 'pending' && (
                      <BsButton variant="outline-danger"
                        type="button"
                        onClick={() => cancelOrder.mutate(order.id)}
                        disabled={cancelOrder.isPending}
                        aria-busy={cancelOrder.isPending && cancelOrder.variables === order.id}
                        className="d-flex align-items-center gap-2 px-2 booking-caption orders-page-detail-20"
                      >
                        {cancelOrder.isPending && cancelOrder.variables === order.id
                          ? <Spinner size="sm" label="Đang hủy đơn..." />
                          : <XCircle size={15} aria-hidden />}
                        Hủy đơn
                      </BsButton>
                    )}
                    <Link
                      to={`/orders/${order.id}`}
                      className="d-flex align-items-center gap-2 rounded-2 bg-dark-subtle px-2 booking-caption fw-bold orders-page-detail-21"
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

      {!isError && <ListPaging data={data} page={page} onPage={setPage} busy={isFetching} />}
    </BsContainer>
  );
}

export default OrdersPage;

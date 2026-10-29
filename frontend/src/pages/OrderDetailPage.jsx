import { Container as BsContainer, Button as BsButton } from 'react-bootstrap';
import BsGrid from '../features/home/components/ResponsiveGrid';
import { useAccountQuery } from '../hooks/useAccountQuery';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import orderApi from '../features/orders/api/orderApi';
import OrderReviews from '../features/orders/components/OrderReviews';
import OrderTimeline from '../features/orders/components/OrderTimeline';
import PaymentQR from '../features/checkout/components/PaymentQR';
import { RequestAfterSales } from '../features/after-sales/components/AfterSales';
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
  const { data: order, isLoading, isError } = useAccountQuery({
    queryKey: ['order', id],
    queryFn: () => orderApi.getOrder(id),
    enabled: Boolean(id),
    refetchInterval: (query) => query.state.data?.status === 'shipping'
      || (query.state.data?.paymentMethod === 'bank_transfer' && query.state.data?.paymentStatus === 'unpaid'
        && !['cancelled', 'returned'].includes(query.state.data?.status)) ? 15_000 : false,
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
      <BsContainer as="main" className="py-5 order-detail-page-detail-1" aria-busy="true">
        <Skeleton className="order-detail-page-detail-2" />
        <div className="mt-4 d-flex align-items-center justify-content-between gap-4 border-bottom pb-4 order-detail-page-detail-3">
          <div className="order-detail-page-detail-4">
            <Skeleton className="order-detail-page-detail-5" />
            <Skeleton className="order-detail-page-detail-6" />
          </div>
          <Skeleton className="order-detail-page-detail-7" />
        </div>
        <div className="mt-4 d-grid gap-4 order-detail-page-detail-8">
          <div className="order-detail-page-detail-9">
            <Skeleton className="w-100 rounded-3 order-detail-page-detail-10" />
            <Skeleton className="w-100 rounded-3 order-detail-page-detail-11" />
          </div>
          <div className="order-detail-page-detail-12">
            <Skeleton className="w-100 rounded-3 order-detail-page-detail-13" />
            <Skeleton className="w-100 rounded-3 order-detail-page-detail-14" />
          </div>
        </div>
      </BsContainer>
    );
  }

  if (isError || !order) {
    return (
      <BsContainer as="main" className="d-flex flex-column align-items-center justify-content-center text-center order-detail-page-detail-15">
        <PackageOpen size={46} className="text-secondary" />
        <h1 className="mt-3 booking-title fs-4 fw-semibold text-dark">Không tìm thấy đơn hàng</h1>
        <BsButton variant="primary" type="button" onClick={() => navigate('/orders')} className="mt-4 px-4 py-2 booking-small">Quay lại đơn hàng</BsButton>
      </BsContainer>
    );
  }

  const total = calculateOrderTotal(order);
  const copyTrackingCode = async () => {
    await navigator.clipboard.writeText(order.trackingCode);
    toast.success('Đã sao chép mã vận đơn');
  };

  return (
    <BsContainer as="main" className="py-5">
      <Link to="/orders" className="d-inline-flex align-items-center gap-2 booking-small fw-semibold text-secondary order-detail-page-detail-16">
        <ArrowLeft size={16} aria-hidden />
        Tất cả đơn hàng
      </Link>

      <header className="mt-4 d-flex flex-wrap align-items-start justify-content-between gap-4 border-bottom pb-4 order-detail-page-detail-17">
        <div>
          <p className="booking-caption fw-bold text-uppercase text-primary">Chi tiết đơn hàng</p>
          <h1 className="mt-2 booking-title fs-3 fw-semibold text-dark">Đơn #{order.id.slice(0, 8)}</h1>
          <p className="mt-2 booking-small text-secondary">Đặt ngày {formatDate(order.createdAt)}</p>
        </div>
        <span className={`rounded-2 px-2 py-2 booking-caption fw-bold ${orderStatusColors[order.status] || orderStatusColors.pending}`}>
          {orderStatusLabels[order.status] || order.status}
        </span>
      </header>

      {order.status === 'shipping' && (
        <BsGrid as="section" columns={{"xs":1,"md":3}} className="mt-4 rounded-3 border p-4 order-detail-page-detail-18" aria-label="Thông tin vận chuyển hiện tại">
          <div>
            <p className="d-flex align-items-center gap-2 booking-caption fw-bold text-uppercase text-primary"><MapPin size={15} />Vị trí hiện tại</p>
            <p className="mt-2 booking-small fw-semibold text-dark">{order.currentLocation || 'Đang cập nhật'}</p>
          </div>
          <div>
            <p className="d-flex align-items-center gap-2 booking-caption fw-bold text-uppercase text-primary"><Truck size={15} />Đơn vị vận chuyển</p>
            <p className="mt-2 booking-small fw-semibold text-dark">{order.carrier || 'Đang cập nhật'}</p>
            {order.trackingCode && (
              <BsButton variant="outline-primary" type="button" onClick={copyTrackingCode} className="mt-1 d-flex align-items-center gap-1 booking-caption order-detail-page-detail-19">
                {order.trackingCode} <Copy size={13} />
              </BsButton>
            )}
          </div>
          <div>
            <p className="d-flex align-items-center gap-2 booking-caption fw-bold text-uppercase text-primary"><CalendarClock size={15} />Giao dự kiến</p>
            <p className="mt-2 booking-small fw-semibold text-dark">{formatDate(order.estimatedDeliveryAt)}</p>
          </div>
        </BsGrid>
      )}

      <div className="mt-5 d-grid gap-5 order-detail-page-detail-20">
        <div className="order-detail-page-detail-21">
          <section className="rounded-3 border p-4 order-detail-page-detail-22" aria-labelledby="timeline-heading">
            <h2 id="timeline-heading" className="booking-title fs-5 fw-semibold text-dark">Hành trình đơn hàng</h2>
            <div className="mt-4">
              <OrderTimeline order={order} />
            </div>
          </section>

          <section aria-labelledby="items-heading">
            <div className="d-flex align-items-center justify-content-between gap-3">
              <h2 id="items-heading" className="booking-title fs-5 fw-semibold text-dark">Sản phẩm</h2>
              {order.shop && (
                <Link to={`/shop/${order.shop.slug}`} className="d-flex align-items-center gap-2 booking-caption fw-semibold text-primary order-detail-page-detail-23">
                  <Store size={14} />{order.shop.name}
                </Link>
              )}
            </div>
            <div className="mt-3 border-top border-bottom order-detail-page-detail-24">
              {order.items?.map((item) => (
                <div key={item.id} className="d-grid align-items-center gap-3 p-3 order-detail-page-detail-25">
                  <div className="overflow-hidden rounded-3 order-detail-page-detail-26">
                    {item.image ? <img src={item.image} alt={[item.name, item.variantName, item.sku].filter(Boolean).join(' · ')} className="h-100 w-100 object-fit-cover" /> : <PackageOpen className="m-auto h-100 text-secondary" size={24} />}
                  </div>
                  <div className="order-detail-page-detail-27">
                    <p className="booking-small fw-semibold text-dark order-detail-page-detail-28">{item.name}</p>
                    <p className="mt-1 booking-caption text-secondary">{formatVnd(item.price)} × {item.quantity}</p>
                  </div>
                  <strong className="booking-small text-dark">{formatVnd(calculateLineTotal(item))}</strong>
                </div>
              ))}
            </div>
          </section>

          {order.paymentMethod === 'bank_transfer' && order.paymentStatus === 'unpaid' && (
            <section>
              <h2 className="mb-3 booking-title fs-5 fw-semibold text-dark">Thanh toán đơn hàng</h2>
              <PaymentQR order={order} />
            </section>
          )}
          <OrderReviews order={order} />
          <Link to={`/support?orderId=${id}`} className="my-3 d-inline-block booking-small text-primary text-decoration-underline">Yêu cầu hỗ trợ đơn hàng</Link>
      <RequestAfterSales key={order.id} order={order} />
        </div>

        <aside className="order-detail-page-detail-29">
          <section className="rounded-3 border p-4 order-detail-page-detail-30">
            <h2 className="booking-title fs-5 fw-semibold text-dark">Tổng thanh toán</h2>
            <dl className="mt-4 booking-small text-secondary order-detail-page-detail-31">
              <div className="d-flex justify-content-between"><dt>Tạm tính</dt><dd>{formatVnd(order.total)}</dd></div>
              <div className="d-flex justify-content-between"><dt>Phí vận chuyển</dt><dd>{formatVnd(order.shippingFee)}</dd></div>
              <div className="d-flex justify-content-between border-top pt-3 fw-bold text-dark order-detail-page-detail-32"><dt>Tổng cộng</dt><dd className="fs-5 text-danger">{formatVnd(total)}</dd></div>
            </dl>
            <p className="mt-3 booking-caption text-secondary">Thanh toán: {order.paymentMethod === 'bank_transfer' ? 'VietQR' : 'Khi nhận hàng (COD)'}</p>
            <p className="mt-2 booking-small">Đã hoàn tiền: {formatVnd(order.paymentSummary?.refundedAmount || 0)}</p>
            {order.paymentSummary?.cod && <div className="mt-2 booking-caption text-secondary order-detail-page-detail-33"><p>Đã thu hộ: {formatVnd(order.paymentSummary.cod.collectedAmount)}</p><p>Đã chuyển về cửa hàng: {formatVnd(order.paymentSummary.cod.remittedAmount)}</p><p>Giao hàng thành công được cập nhật riêng với chứng từ thanh toán.</p></div>}
            {order.status === 'pending' && (
              <BsButton variant="outline-danger" type="button" onClick={() => cancelOrder.mutate(order.id)} disabled={cancelOrder.isPending} aria-busy={cancelOrder.isPending} className="mt-4 d-flex w-100 align-items-center justify-content-center gap-2 booking-small order-detail-page-detail-34">
                {cancelOrder.isPending
                  ? <Spinner size="sm" label="Đang hủy đơn..." />
                  : <XCircle size={16} aria-hidden />}
                {cancelOrder.isPending ? 'Đang hủy...' : 'Hủy đơn'}
              </BsButton>
            )}
          </section>

          <section className="rounded-3 border p-4 order-detail-page-detail-35">
            <h2 className="booking-title fs-5 fw-semibold text-dark">Địa chỉ nhận hàng</h2>
            <address className="mt-3 fst-normal booking-small text-secondary order-detail-page-detail-36">
              <strong className="d-block text-dark">{order.shippingAddress?.name}</strong>
              <span className="d-block">{order.shippingAddress?.phone}</span>
              <span className="d-block">{order.shippingAddress?.address}</span>
              <span className="d-block">{order.shippingAddress?.city}</span>
            </address>
          </section>
        </aside>
      </div>
    </BsContainer>
  );
}

export default OrderDetailPage;

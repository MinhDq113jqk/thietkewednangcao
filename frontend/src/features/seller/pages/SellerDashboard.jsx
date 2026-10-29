import BsGrid from '../../home/components/ResponsiveGrid';
import { useAccountQuery } from '../../../hooks/useAccountQuery';
import { Link } from 'react-router-dom';
import sellerApi from '../api/sellerApi';
import Skeleton from '../../../components/ui/Skeleton';

const formatPrice = (value) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value) || 0);

const statusLabels = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  packing: 'Đang đóng gói',
  shipping: 'Đang giao',
  delivered: 'Hoàn thành',
  cancelled: 'Đã hủy',
  returned: 'Đã hoàn',
};

function SellerDashboard() {
  const { data: stats, isLoading, isError } = useAccountQuery({
    queryKey: ['seller-stats'],
    queryFn: sellerApi.getStats,
  });

  const cards = [
    { label: 'Sản phẩm đang bán', value: stats?.products?.active ?? 0 },
    { label: 'Tổng đơn', value: stats?.orders?.total ?? 0 },
    { label: 'Đơn chờ xử lý', value: stats?.orders?.pending ?? 0 },
    { label: 'Doanh thu đã đối soát', value: formatPrice(stats?.revenue?.gross ?? 0) },
  ];

  return (
    <div className="d-flex flex-column gap-4" aria-busy={isLoading}>
      <div className="d-flex flex-column gap-3 flex-md-row align-items-md-center justify-content-md-between">
        <div>
          <h1 className="fs-4 fw-bold text-secondary">Tổng quan người bán</h1>
          <p className="mt-1 booking-small text-secondary">
            {isLoading
              ? <Skeleton as="span" className="d-inline-block align-middle seller-dashboard-detail-1" />
              : stats?.shop ? `${stats.shop.name} · ${stats.shop.status}` : 'Chưa có thông tin gian hàng'}
          </p>
        </div>
        <Link
          to="/seller/products/new"
          className="rounded-3 bg-warning px-3 py-2 booking-small fw-medium seller-dashboard-detail-2"
        >
          Thêm sản phẩm
        </Link>
      </div>

      {isError && (
        <div className="rounded-3 border border-danger p-4 booking-small text-danger shadow-sm seller-dashboard-detail-3">
          Không thể tải thống kê gian hàng.
        </div>
      )}

      <BsGrid as="div" columns={{"xs":1,"md":4}} className="">
        {cards.map((card) => (
          <div key={card.label} className="rounded-3 border border-secondary p-4 shadow-sm seller-dashboard-detail-4">
            <p className="booking-small text-secondary">{card.label}</p>
            {isLoading
              ? <Skeleton className="mt-2 seller-dashboard-detail-5" />
              : <p className="mt-2 fs-4 fw-bold text-secondary">{card.value}</p>}
          </div>
        ))}
      </BsGrid>

      <BsGrid as="div" columns={{"xs":1,"lg":2}} className="">
        <section className="rounded-3 border border-secondary p-4 shadow-sm seller-dashboard-detail-6">
          <div className="mb-3 d-flex align-items-center justify-content-between">
            <h2 className="fw-semibold text-secondary">Sản phẩm bán chạy</h2>
            <Link to="/seller/products" className="booking-small fw-medium text-warning">Xem tất cả</Link>
          </div>
          <div className="d-flex flex-column gap-3">
            {isLoading ? Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="d-flex align-items-center justify-content-between gap-3" aria-hidden="true">
                <Skeleton className="seller-dashboard-detail-7" />
                <Skeleton className="seller-dashboard-detail-8" />
              </div>
            )) : stats?.products?.topSelling?.map((product) => (
              <div key={product.id} className="d-flex align-items-center justify-content-between gap-3 booking-small">
                <span className="text-truncate text-secondary">{product.name}</span>
                <span className="flex-shrink-0 fw-medium text-secondary">{product.sold || 0} đã bán</span>
              </div>
            ))}
            {!isLoading && !stats?.products?.topSelling?.length && (
              <p className="booking-small text-secondary">Chưa có sản phẩm.</p>
            )}
          </div>
        </section>

        <section className="rounded-3 border border-secondary p-4 shadow-sm seller-dashboard-detail-9">
          <div className="mb-3 d-flex align-items-center justify-content-between">
            <h2 className="fw-semibold text-secondary">Đơn hàng gần đây</h2>
            <Link to="/seller/orders" className="booking-small fw-medium text-warning">Xem tất cả</Link>
          </div>
          <div className="d-flex flex-column gap-3">
            {isLoading ? Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="d-flex align-items-center justify-content-between gap-3" aria-hidden="true">
                <div className="seller-dashboard-detail-10">
                  <Skeleton className="w-100 seller-dashboard-detail-11" />
                  <Skeleton className="seller-dashboard-detail-12" />
                </div>
                <Skeleton className="seller-dashboard-detail-13" />
              </div>
            )) : stats?.recentOrders?.map((order) => (
              <div key={order.id} className="d-flex align-items-center justify-content-between gap-3 booking-small">
                <div className="seller-dashboard-detail-14">
                  <p className="text-truncate text-secondary">#{order.id.slice(0, 8)}</p>
                  <p className="booking-caption text-secondary">{statusLabels[order.status] || order.status}</p>
                </div>
                <span className="flex-shrink-0 fw-medium text-secondary">{formatPrice(order.total)}</span>
              </div>
            ))}
            {!isLoading && !stats?.recentOrders?.length && (
              <p className="booking-small text-secondary">Chưa có đơn hàng.</p>
            )}
          </div>
        </section>
      </BsGrid>
    </div>
  );
}

export default SellerDashboard;

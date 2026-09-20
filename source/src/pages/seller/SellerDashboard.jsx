import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import sellerApi from '../../api/sellerApi';
import Skeleton from '../../components/ui/Skeleton';

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
  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['seller-stats'],
    queryFn: sellerApi.getStats,
  });

  const cards = [
    { label: 'Sản phẩm đang bán', value: stats?.products?.active ?? 0 },
    { label: 'Tổng đơn', value: stats?.orders?.total ?? 0 },
    { label: 'Đơn chờ xử lý', value: stats?.orders?.pending ?? 0 },
    { label: 'Doanh thu đã ghi nhận', value: formatPrice(stats?.revenue?.gross ?? 0) },
  ];

  return (
    <div className="flex flex-col gap-6" aria-busy={isLoading}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tổng quan người bán</h1>
          <p className="mt-1 text-sm text-gray-500">
            {isLoading
              ? <Skeleton as="span" className="inline-block h-4 w-48 align-middle" />
              : stats?.shop ? `${stats.shop.name} · ${stats.shop.status}` : 'Chưa có thông tin gian hàng'}
          </p>
        </div>
        <Link
          to="/seller/products/new"
          className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
        >
          Thêm sản phẩm
        </Link>
      </div>

      {isError && (
        <div className="rounded-xl border border-red-100 bg-white p-5 text-sm text-red-500 shadow-sm">
          Không thể tải thống kê gian hàng.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">{card.label}</p>
            {isLoading
              ? <Skeleton className="mt-3 h-8 w-24" />
              : <p className="mt-2 text-2xl font-bold text-gray-800">{card.value}</p>}
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Sản phẩm bán chạy</h2>
            <Link to="/seller/products" className="text-sm font-medium text-amber-600">Xem tất cả</Link>
          </div>
          <div className="flex flex-col gap-3">
            {isLoading ? Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between gap-3" aria-hidden="true">
                <Skeleton className="h-4 w-3/5" />
                <Skeleton className="h-4 w-20" />
              </div>
            )) : stats?.products?.topSelling?.map((product) => (
              <div key={product.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-gray-700">{product.name}</span>
                <span className="shrink-0 font-medium text-gray-500">{product.sold || 0} đã bán</span>
              </div>
            ))}
            {!isLoading && !stats?.products?.topSelling?.length && (
              <p className="text-sm text-gray-400">Chưa có sản phẩm.</p>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Đơn hàng gần đây</h2>
            <Link to="/seller/orders" className="text-sm font-medium text-amber-600">Xem tất cả</Link>
          </div>
          <div className="flex flex-col gap-3">
            {isLoading ? Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between gap-3" aria-hidden="true">
                <div className="w-2/5 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
                <Skeleton className="h-4 w-24" />
              </div>
            )) : stats?.recentOrders?.map((order) => (
              <div key={order.id} className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate text-gray-700">#{order.id.slice(0, 8)}</p>
                  <p className="text-xs text-gray-400">{statusLabels[order.status] || order.status}</p>
                </div>
                <span className="shrink-0 font-medium text-gray-500">{formatPrice(order.total)}</span>
              </div>
            ))}
            {!isLoading && !stats?.recentOrders?.length && (
              <p className="text-sm text-gray-400">Chưa có đơn hàng.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default SellerDashboard;

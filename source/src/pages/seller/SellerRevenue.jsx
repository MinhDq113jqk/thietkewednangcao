import { useQuery } from '@tanstack/react-query';
import sellerApi from '../../api/sellerApi';
import Skeleton, { TableSkeleton } from '../../components/ui/Skeleton';

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

function SellerRevenue() {
  const { data: stats, isLoading: statsLoading, isError: statsError } = useQuery({
    queryKey: ['seller-stats'],
    queryFn: sellerApi.getStats,
  });

  const { data: orders = [], isLoading: ordersLoading, isError: ordersError } = useQuery({
    queryKey: ['seller-orders'],
    queryFn: sellerApi.getOrders,
  });

  const settledOrders = orders.filter((order) => (
    order.status === 'delivered' && order.paymentStatus === 'paid'
  ));
  const isLoading = statsLoading || ordersLoading;

  const cards = [
    { label: 'Doanh thu đã ghi nhận', value: formatPrice(stats?.revenue?.gross ?? 0) },
    {
      label: `Hoa hồng sàn ${Math.round(Number(stats?.revenue?.commissionRate ?? 0.1) * 100)}%`,
      value: formatPrice(stats?.revenue?.commission ?? 0),
    },
    { label: 'Số tiền còn lại', value: formatPrice(stats?.revenue?.net ?? 0) },
    { label: 'Đơn đang xử lý', value: formatPrice(stats?.revenue?.pipelineGross ?? 0) },
  ];

  return (
    <div className="flex flex-col gap-5" aria-busy={isLoading}>
      <div>
        <h1 className="text-xl font-bold text-gray-800">Doanh thu</h1>
        <p className="mt-1 text-sm text-gray-500">Chỉ ghi nhận đơn đã giao và đã thanh toán.</p>
      </div>

      {(statsError || ordersError) && (
        <div className="rounded-xl border border-red-100 bg-white p-5 text-sm text-red-500 shadow-sm">
          Không thể tải dữ liệu doanh thu.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">{card.label}</p>
            {isLoading
              ? <Skeleton className="mt-3 h-8 w-32" />
              : <p className="mt-2 text-2xl font-bold text-gray-800">{card.value}</p>}
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-gray-100 bg-white shadow-sm" aria-busy={isLoading}>
        <div className="border-b border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800">Đơn hàng đã ghi nhận</h2>
          <p className="mt-1 min-h-5 text-sm text-gray-500">
            {isLoading
              ? <Skeleton as="span" className="inline-block h-4 w-56 align-middle" />
              : `${settledOrders.length} đơn đã giao và đối soát thành công.`}
          </p>
        </div>

        {isLoading && <div className="overflow-x-auto"><TableSkeleton columns={5} rows={5} className="min-w-[760px]" /></div>}

        {!isLoading && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-400">
                <tr>
                  <th className="px-5 py-3">Mã đơn</th>
                  <th className="px-5 py-3">Ngày tạo</th>
                  <th className="px-5 py-3">Trạng thái</th>
                  <th className="px-5 py-3">Thanh toán</th>
                  <th className="px-5 py-3 text-right">Tổng đơn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {settledOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-5 py-4 font-medium text-gray-800">#{order.id.slice(0, 8)}</td>
                    <td className="px-5 py-4 text-gray-600">
                      {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-5 py-4 text-gray-600">{statusLabels[order.status] || order.status}</td>
                    <td className="px-5 py-4 text-gray-600">{order.paymentStatus || '-'}</td>
                    <td className="px-5 py-4 text-right font-medium text-gray-800">{formatPrice(order.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!settledOrders.length && (
              <p className="p-5 text-center text-sm text-gray-400">Chưa có đơn hàng đủ điều kiện ghi nhận.</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default SellerRevenue;

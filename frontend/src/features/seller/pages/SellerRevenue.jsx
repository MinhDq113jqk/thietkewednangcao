import { Button as BsButton, Table as BsTable } from 'react-bootstrap';
import { useAccountQuery } from '../../../hooks/useAccountQuery';
import { useState } from 'react';
import ListPaging from '../../../components/ui/ListPaging';
import sellerApi from '../api/sellerApi';
import Skeleton, { TableSkeleton } from '../../../components/ui/Skeleton';
import RevenueSummary from '../../finance/components/RevenueSummary';

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
  const [page, setPage] = useState(1);
  const { data: stats, isLoading: statsLoading, isError: statsError, refetch: reloadStats } = useAccountQuery({
    queryKey: ['seller-stats'],
    queryFn: sellerApi.getStats,
  });

  const { data: orderPage, isLoading: ordersLoading, isError: ordersError, refetch: reloadOrders } = useAccountQuery({
    queryKey: ['seller-orders', { page, revenue: true }],
    queryFn: () => sellerApi.getOrders({ page }),
  });

  const settledOrders = (orderPage?.items || []).filter((order) => Number(order.recognizedRevenue) > 0);
  const isLoading = statsLoading || ordersLoading;

  return (
    <div className="d-flex flex-column gap-5" aria-busy={isLoading}>
      <div>
        <h1 className="fs-5 fw-bold text-secondary">Doanh thu</h1>
      </div>

      {(statsError || ordersError) && (
        <div role="alert" className="rounded-3 border border-danger p-4 booking-small text-danger shadow-sm seller-revenue-detail-1">
          Không thể tải dữ liệu doanh thu.
          <BsButton variant="outline-primary" type="button" className="ms-2 text-decoration-underline" onClick={() => { void reloadStats(); void reloadOrders(); }}>Thử lại</BsButton>
        </div>
      )}

      {!statsError && <RevenueSummary revenue={stats?.revenue} loading={statsLoading} settlementPath="/seller/settlements" />}

      <section className="rounded-3 border border-secondary shadow-sm seller-revenue-detail-2" aria-busy={isLoading}>
        <div className="border-bottom border-secondary p-4">
          <h2 className="fw-semibold text-secondary">Đơn hàng đã ghi nhận</h2>
          <p className="mt-1 booking-small text-secondary seller-revenue-detail-3">
            {isLoading
              ? <Skeleton as="span" className="d-inline-block align-middle seller-revenue-detail-4" />
              : `${stats?.revenue?.settledOrders ?? 0} đơn đã ghi nhận trong toàn gian hàng; bảng hiển thị các đơn của trang hiện tại.`}
          </p>
        </div>

        {isLoading && <div className="overflow-x-auto"><TableSkeleton columns={5} rows={5} className="seller-revenue-detail-5" /></div>}

        {!isLoading && (
          <div className="overflow-x-auto">
            <BsTable responsive hover className="w-100 text-start booking-small seller-revenue-detail-6">
              <thead className="bg-secondary-subtle booking-caption text-uppercase text-secondary">
                <tr>
                  <th className="px-4 py-2">Mã đơn</th>
                  <th className="px-4 py-2">Ngày tạo</th>
                  <th className="px-4 py-2">Trạng thái</th>
                  <th className="px-4 py-2">Thanh toán</th>
                  <th className="px-4 py-2 text-end">Đã ghi nhận sau hoàn tiền</th>
                </tr>
              </thead>
              <tbody className="seller-revenue-detail-7">
                {settledOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-3 fw-medium text-secondary">#{order.id.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-secondary">
                      {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-4 py-3 text-secondary">{statusLabels[order.status] || order.status}</td>
                    <td className="px-4 py-3 text-secondary">{order.paymentStatus || '-'}</td>
                    <td className="px-4 py-3 text-end fw-medium text-secondary">{formatPrice(order.recognizedRevenue)}</td>
                  </tr>
                ))}
              </tbody>
            </BsTable>
            {!settledOrders.length && (
              <p className="p-4 text-center booking-small text-secondary">Trang này chưa có đơn hàng đủ điều kiện ghi nhận.</p>
            )}
          </div>
        )}
      </section>
      <ListPaging data={orderPage} page={page} onPage={setPage} busy={isLoading} />
    </div>
  );
}

export default SellerRevenue;

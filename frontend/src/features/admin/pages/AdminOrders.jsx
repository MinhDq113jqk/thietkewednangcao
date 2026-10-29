import { Form as BsForm, Table as BsTable } from 'react-bootstrap';
import { useAccountQuery } from '../../../hooks/useAccountQuery';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import adminApi from '../api/adminApi';
import Skeleton, { TableSkeleton } from '../../../components/ui/Skeleton';
import Spinner from '../../../components/ui/Spinner';
import { toast } from '../../../components/ui/toastStore';

const statusLabels = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  packing: 'Đang đóng gói',
  shipping: 'Đang giao',
  delivered: 'Hoàn thành',
  cancelled: 'Đã hủy',
  returned: 'Đã hoàn',
};

const statusOptions = Object.entries(statusLabels).map(([value, label]) => ({ value, label }));
const paymentLabels = {
  unpaid: 'Chưa thanh toán',
  paid: 'Đã thanh toán',
  refunded: 'Đã hoàn tiền',
};

const formatPrice = (value) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value) || 0);

function AdminOrders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const status = searchParams.get('status') || '';

  const { data, isLoading, isError } = useAccountQuery({
    queryKey: ['admin-orders', status],
    queryFn: () => adminApi.getOrders({ status: status || undefined, limit: 50 }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, nextStatus }) => adminApi.updateOrderStatus(id, nextStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Đã cập nhật đơn hàng');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Không thể cập nhật đơn hàng'),
  });

  const orders = data?.items || [];

  return (
    <div className="rounded-3 border border-secondary shadow-sm admin-orders-detail-1" aria-busy={isLoading}>
      <div className="d-flex flex-column gap-4 border-bottom border-secondary p-4 flex-md-row align-items-md-center justify-content-md-between">
        <div>
          <h1 className="fs-5 fw-bold text-secondary">Theo dõi đơn hàng</h1>
          <p className="mt-1 booking-small text-secondary admin-orders-detail-2">
            {isLoading
              ? <Skeleton as="span" className="d-inline-block align-middle admin-orders-detail-3" />
              : `${data?.total ?? 0} đơn hàng toàn sàn`}
          </p>
        </div>

        <BsForm.Select
          value={status}
          onChange={(event) => {
            const params = new URLSearchParams(searchParams);
            if (event.target.value) params.set('status', event.target.value);
            else params.delete('status');
            setSearchParams(params);
          }}
          className="rounded-3 border border-secondary px-2 booking-small admin-orders-detail-4"
        >
          <option value="">Tất cả trạng thái</option>
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </BsForm.Select>
      </div>

      {isLoading && <div className="overflow-x-auto"><TableSkeleton columns={8} rows={6} className="admin-orders-detail-5" /></div>}
      {isError && <p className="p-4 booking-small text-danger">Không thể tải đơn hàng.</p>}
      {!isLoading && !isError && (
        <div className="overflow-x-auto">
          <BsTable responsive hover className="w-100 text-start booking-small admin-orders-detail-6">
            <thead className="bg-secondary-subtle booking-caption text-uppercase text-secondary">
              <tr>
                <th className="px-4 py-2">Mã đơn</th>
                <th className="px-4 py-2">Người mua</th>
                <th className="px-4 py-2">Gian hàng</th>
                <th className="px-4 py-2">Sản phẩm</th>
                <th className="px-4 py-2">Tổng</th>
                <th className="px-4 py-2">Trạng thái</th>
                <th className="px-4 py-2">Thanh toán</th>
                <th className="px-4 py-2">Cập nhật</th>
              </tr>
            </thead>
            <tbody className="admin-orders-detail-7">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-3">
                    <p className="fw-semibold text-secondary">#{order.id.slice(0, 8)}</p>
                    <p className="booking-caption text-secondary">{new Date(order.createdAt).toLocaleDateString('vi-VN')}</p>
                  </td>
                  <td className="px-4 py-3 text-secondary">
                    <p>{order.buyer?.name || '-'}</p>
                    <p className="booking-caption text-secondary">{order.buyer?.email}</p>
                  </td>
                  <td className="px-4 py-3 text-secondary">
                    <p>{order.shop?.name || '-'}</p>
                    <p className="booking-caption text-secondary">{order.shop?.status}</p>
                  </td>
                  <td className="px-4 py-3 text-secondary">
                    {order.items?.slice(0, 2).map((item) => (
                      <p key={item.id}>{item.name} x{item.quantity}</p>
                    ))}
                    {order.items?.length > 2 && <p className="booking-caption text-secondary">+{order.items.length - 2} sản phẩm</p>}
                  </td>
                  <td className="px-4 py-3 fw-semibold text-secondary">{formatPrice(Number(order.total) + Number(order.shippingFee || 0))}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-pill bg-secondary-subtle px-2 py-1 booking-caption fw-semibold text-secondary">
                      {statusLabels[order.status] || order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="booking-caption fw-semibold text-secondary">
                      {paymentLabels[order.paymentStatus] || order.paymentStatus}
                    </p>
                    {order.paymentMethod === 'bank_transfer' && <div className="mt-2 booking-caption admin-orders-detail-8">
                      <p>Đã phân bổ: {formatPrice(order.paymentSummary?.allocatedAmount || 0)}</p>
                      {order.paymentExpiresAt && <p>Hạn: {new Date(order.paymentExpiresAt).toLocaleString('vi-VN')}</p>}
                      {order.expiredAt && <p className="fw-semibold text-danger">Đã hết hạn thanh toán</p>}
                      <Link to={`/admin/payments?orderId=${order.id}`} className="d-inline-flex align-items-center fw-semibold text-success text-decoration-underline admin-orders-detail-9">Đối soát giao dịch</Link>
                    </div>}
                    <Link to={`/admin/refunds?orderId=${order.id}`} className="mt-2 d-inline-flex align-items-center booking-caption fw-semibold text-success text-decoration-underline admin-orders-detail-10">Xem sổ hoàn tiền</Link>
                    <Link to={`/admin/returns?orderId=${order.id}`} className="d-block py-2 booking-caption text-success text-decoration-underline admin-orders-detail-11">Đổi trả và khiếu nại</Link>
                  </td>
                  <td className="px-4 py-3" aria-busy={updateStatus.isPending && updateStatus.variables?.id === order.id}>
                    <div className="d-flex align-items-center gap-2">
                      {updateStatus.isPending && updateStatus.variables?.id === order.id && (
                        <Spinner size="sm" label="Đang cập nhật trạng thái đơn..." />
                      )}
                      <BsForm.Select
                      value={order.status}
                      onChange={(event) => updateStatus.mutate({ id: order.id, nextStatus: event.target.value })}
                      disabled={!order.allowedStatusTransitions?.length || updateStatus.isPending}
                      className="rounded-3 border border-secondary px-2 booking-caption admin-orders-detail-12"
                    >
                      <option value={order.status}>{statusLabels[order.status] || order.status}</option>
                      {(order.allowedStatusTransitions || []).map((value) => (
                        <option key={value} value={value}>{statusLabels[value] || value}</option>
                      ))}
                      </BsForm.Select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </BsTable>
          {!orders.length && <p className="p-4 text-center booking-small text-secondary">Không có đơn hàng phù hợp.</p>}
        </div>
      )}
    </div>
  );
}

export default AdminOrders;

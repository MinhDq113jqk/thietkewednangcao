import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { BadgeCheck, RotateCcw } from 'lucide-react';
import adminApi from '../../api/adminApi';
import Skeleton, { TableSkeleton } from '../../components/ui/Skeleton';
import Spinner from '../../components/ui/Spinner';
import { toast } from '../../components/ui/toastStore';

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

  const { data, isLoading, isError } = useQuery({
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

  const updatePayment = useMutation({
    mutationFn: ({ id, nextStatus }) => adminApi.updateOrderPayment(id, nextStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Đã cập nhật đối soát thanh toán');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Không thể cập nhật thanh toán'),
  });

  const orders = data?.items || [];

  return (
    <div className="rounded-lg border border-stone-200 bg-white shadow-sm" aria-busy={isLoading}>
      <div className="flex flex-col gap-4 border-b border-stone-200 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-950">Theo dõi đơn hàng</h1>
          <p className="mt-1 min-h-5 text-sm text-stone-500">
            {isLoading
              ? <Skeleton as="span" className="inline-block h-4 w-36 align-middle" />
              : `${data?.total ?? 0} đơn hàng toàn sàn`}
          </p>
        </div>

        <select
          value={status}
          onChange={(event) => {
            const params = new URLSearchParams(searchParams);
            if (event.target.value) params.set('status', event.target.value);
            else params.delete('status');
            setSearchParams(params);
          }}
          className="h-10 rounded-lg border border-stone-200 px-3 text-sm outline-none focus:border-amber-500"
        >
          <option value="">Tất cả trạng thái</option>
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      {isLoading && <div className="overflow-x-auto"><TableSkeleton columns={8} rows={6} className="min-w-[1180px]" /></div>}
      {isError && <p className="p-5 text-sm text-red-500">Không thể tải đơn hàng.</p>}

      {!isLoading && !isError && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase text-stone-400">
              <tr>
                <th className="px-5 py-3">Mã đơn</th>
                <th className="px-5 py-3">Người mua</th>
                <th className="px-5 py-3">Gian hàng</th>
                <th className="px-5 py-3">Sản phẩm</th>
                <th className="px-5 py-3">Tổng</th>
                <th className="px-5 py-3">Trạng thái</th>
                <th className="px-5 py-3">Thanh toán</th>
                <th className="px-5 py-3">Cập nhật</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-stone-900">#{order.id.slice(0, 8)}</p>
                    <p className="text-xs text-stone-400">{new Date(order.createdAt).toLocaleDateString('vi-VN')}</p>
                  </td>
                  <td className="px-5 py-4 text-stone-600">
                    <p>{order.buyer?.name || '-'}</p>
                    <p className="text-xs text-stone-400">{order.buyer?.email}</p>
                  </td>
                  <td className="px-5 py-4 text-stone-600">
                    <p>{order.shop?.name || '-'}</p>
                    <p className="text-xs text-stone-400">{order.shop?.status}</p>
                  </td>
                  <td className="px-5 py-4 text-stone-600">
                    {order.items?.slice(0, 2).map((item) => (
                      <p key={item.id}>{item.name} x{item.quantity}</p>
                    ))}
                    {order.items?.length > 2 && <p className="text-xs text-stone-400">+{order.items.length - 2} sản phẩm</p>}
                  </td>
                  <td className="px-5 py-4 font-semibold text-stone-900">{formatPrice(order.total)}</td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-700">
                      {statusLabels[order.status] || order.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-xs font-semibold text-stone-700">
                      {paymentLabels[order.paymentStatus] || order.paymentStatus}
                    </p>
                    {order.paymentMethod === 'bank_transfer' && order.paymentStatus === 'unpaid' && (
                      <button
                        type="button"
                        onClick={() => updatePayment.mutate({ id: order.id, nextStatus: 'paid' })}
                        disabled={updatePayment.isPending || ['cancelled', 'returned'].includes(order.status)}
                        aria-busy={updatePayment.isPending && updatePayment.variables?.id === order.id}
                        className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {updatePayment.isPending && updatePayment.variables?.id === order.id
                          ? <Spinner size="sm" label="Đang cập nhật thanh toán..." />
                          : <BadgeCheck size={15} aria-hidden="true" />}
                        {updatePayment.isPending && updatePayment.variables?.id === order.id ? 'Đang cập nhật...' : 'Xác nhận đã nhận tiền'}
                      </button>
                    )}
                    {order.paymentMethod === 'bank_transfer' && order.paymentStatus === 'paid' && (
                      <button
                        type="button"
                        onClick={() => updatePayment.mutate({ id: order.id, nextStatus: 'refunded' })}
                        disabled={updatePayment.isPending}
                        aria-busy={updatePayment.isPending && updatePayment.variables?.id === order.id}
                        className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-lg border border-stone-300 px-3 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {updatePayment.isPending && updatePayment.variables?.id === order.id
                          ? <Spinner size="sm" label="Đang cập nhật hoàn tiền..." />
                          : <RotateCcw size={14} aria-hidden="true" />}
                        {updatePayment.isPending && updatePayment.variables?.id === order.id ? 'Đang cập nhật...' : 'Đánh dấu hoàn tiền'}
                      </button>
                    )}
                  </td>
                  <td className="px-5 py-4" aria-busy={updateStatus.isPending && updateStatus.variables?.id === order.id}>
                    <div className="flex items-center gap-2">
                      {updateStatus.isPending && updateStatus.variables?.id === order.id && (
                        <Spinner size="sm" label="Đang cập nhật trạng thái đơn..." />
                      )}
                      <select
                      value={order.status}
                      onChange={(event) => updateStatus.mutate({ id: order.id, nextStatus: event.target.value })}
                      disabled={!order.allowedStatusTransitions?.length || updateStatus.isPending}
                      className="h-9 rounded-lg border border-stone-200 px-2 text-xs outline-none focus:border-amber-500"
                    >
                      <option value={order.status}>{statusLabels[order.status] || order.status}</option>
                      {(order.allowedStatusTransitions || []).map((value) => (
                        <option key={value} value={value}>{statusLabels[value] || value}</option>
                      ))}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!orders.length && <p className="p-5 text-center text-sm text-stone-400">Không có đơn hàng phù hợp.</p>}
        </div>
      )}
    </div>
  );
}

export default AdminOrders;

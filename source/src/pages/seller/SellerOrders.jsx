import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  MapPin,
  PackageCheck,
  Search,
  Truck,
} from 'lucide-react';
import sellerApi from '../../api/sellerApi';
import Modal from '../../components/ui/Modal';
import { toast } from '../../components/ui/toastStore';
import { TableSkeleton } from '../../components/ui/Skeleton';
import Spinner from '../../components/ui/Spinner';
import { formatVnd } from '../../utils/format';
import { orderStatusColors, orderStatusLabels } from '../../utils/orderStatus';

const statusOptions = [
  { value: 'all', label: 'Tất cả trạng thái' },
  ...Object.entries(orderStatusLabels).map(([value, label]) => ({ value, label })),
];

const emptyShippingForm = {
  carrier: 'GHN',
  trackingCode: '',
  currentLocation: '',
  estimatedDeliveryAt: '',
  note: '',
};

function useOrderAction({ mutationFn, successMessage, onComplete }) {
  return useMutation({
    mutationFn,
    onSuccess: () => {
      onComplete();
      toast.success(successMessage);
    },
    onError: (error) => toast.error(
      error.response?.data?.message || 'Không thể cập nhật đơn hàng'
    ),
  });
}

function SellerOrders() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [dialog, setDialog] = useState({ mode: null, order: null });
  const [shippingForm, setShippingForm] = useState(emptyShippingForm);
  const { data: orders = [], isLoading, isError } = useQuery({
    queryKey: ['seller-orders'],
    queryFn: sellerApi.getOrders,
    refetchInterval: 30_000,
  });

  const filteredOrders = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return orders.filter((order) => {
      const itemText = order.items?.map((item) => item.name).join(' ') || '';
      const buyerText = [
        order.buyer?.name,
        order.buyer?.email,
        order.shippingAddress?.name,
        order.shippingAddress?.phone,
        order.id,
        order.trackingCode,
      ].filter(Boolean).join(' ');
      return (!keyword || `${buyerText} ${itemText}`.toLowerCase().includes(keyword)) &&
        (status === 'all' || order.status === status);
    });
  }, [orders, search, status]);

  const refreshOrders = () => {
    queryClient.invalidateQueries({ queryKey: ['seller-orders'] });
    queryClient.invalidateQueries({ queryKey: ['seller-stats'] });
  };

  const completeAction = () => {
    refreshOrders();
    setDialog({ mode: null, order: null });
    setShippingForm(emptyShippingForm);
  };

  const confirmOrder = useOrderAction({
    mutationFn: sellerApi.confirmOrder,
    successMessage: 'Đã xác nhận đơn hàng',
    onComplete: completeAction,
  });
  const packOrder = useOrderAction({
    mutationFn: sellerApi.packOrder,
    successMessage: 'Đơn đã chuyển sang đóng gói',
    onComplete: completeAction,
  });
  const shipOrder = useOrderAction({
    mutationFn: sellerApi.shipOrder,
    successMessage: 'Đã bàn giao đơn cho đơn vị vận chuyển',
    onComplete: completeAction,
  });
  const updateTracking = useOrderAction({
    mutationFn: sellerApi.updateTracking,
    successMessage: 'Đã cập nhật vị trí vận chuyển',
    onComplete: completeAction,
  });
  const deliverOrder = useOrderAction({
    mutationFn: sellerApi.deliverOrder,
    successMessage: 'Đơn hàng đã hoàn tất',
    onComplete: completeAction,
  });

  const openShippingDialog = (order) => {
    const estimated = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
    setShippingForm({
      ...emptyShippingForm,
      currentLocation: order.currentLocation || '',
      estimatedDeliveryAt: estimated,
    });
    setDialog({ mode: 'ship', order });
  };

  const openTrackingDialog = (order) => {
    setShippingForm({
      ...emptyShippingForm,
      carrier: order.carrier || 'GHN',
      trackingCode: order.trackingCode || '',
      currentLocation: order.currentLocation || '',
      estimatedDeliveryAt: order.estimatedDeliveryAt?.slice(0, 10) || '',
    });
    setDialog({ mode: 'tracking', order });
  };

  const updateForm = (event) => {
    setShippingForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const submitShipping = (event) => {
    event.preventDefault();
    shipOrder.mutate({ id: dialog.order.id, ...shippingForm });
  };

  const submitTracking = (event) => {
    event.preventDefault();
    updateTracking.mutate({
      id: dialog.order.id,
      currentLocation: shippingForm.currentLocation,
      note: shippingForm.note,
    });
  };

  const markDelivered = () => {
    deliverOrder.mutate({
      id: dialog.order.id,
      currentLocation: shippingForm.currentLocation,
      note: shippingForm.note,
    });
  };

  const mutationPending =
    shipOrder.isPending || updateTracking.isPending || deliverOrder.isPending;

  return (
    <main>
      <div className="border-b border-[#DDE4E0] pb-5">
        <p className="text-xs font-bold uppercase text-[#2563EB]">Vận hành và giao hàng</p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-[#17201D]">Đơn hàng</h1>
        <p className="mt-1 text-sm text-[#68756F]">{filteredOrders.length}/{orders.length} đơn trong gian hàng</p>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-[minmax(220px,1fr)_220px]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7A8781]" size={16} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Mã đơn, người mua, mã vận đơn..."
            className="h-10 w-full rounded-lg border border-[#D5DEDA] bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#0F766E]"
          />
        </label>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="h-10 rounded-lg border border-[#D5DEDA] bg-white px-3 text-sm outline-none focus:border-[#0F766E]"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      <section className="mt-5 overflow-hidden rounded-lg border border-[#DDE4E0] bg-white" aria-label="Danh sách đơn hàng" aria-busy={isLoading}>
        {isLoading && <div className="overflow-x-auto"><TableSkeleton columns={6} rows={6} className="min-w-[940px]" /></div>}
        {isError && <p className="p-5 text-sm text-[#C93F2C]">Không thể tải đơn hàng.</p>}

        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[940px] text-left text-sm">
              <thead className="bg-[#F7F8F5] text-xs uppercase text-[#68756F]">
                <tr>
                  <th className="px-4 py-3">Mã đơn</th>
                  <th className="px-4 py-3">Người nhận</th>
                  <th className="px-4 py-3">Sản phẩm</th>
                  <th className="px-4 py-3">Tổng</th>
                  <th className="px-4 py-3">Trạng thái / vị trí</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDF1EF]">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="align-top hover:bg-[#FBFCFA]">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-[#17201D]">#{order.id.slice(0, 8)}</p>
                      <p className="mt-1 text-xs text-[#8A9691]">{new Date(order.createdAt).toLocaleDateString('vi-VN')}</p>
                    </td>
                    <td className="px-4 py-4 text-[#5E6B66]">
                      <p className="font-medium text-[#17201D]">{order.shippingAddress?.name || order.buyer?.name || '-'}</p>
                      <p className="mt-1 text-xs">{order.shippingAddress?.phone || order.buyer?.email}</p>
                    </td>
                    <td className="max-w-60 px-4 py-4 text-[#5E6B66]">
                      {order.items?.slice(0, 2).map((item) => (
                        <p key={item.id} className="truncate">{item.name} × {item.quantity}</p>
                      ))}
                      {order.items?.length > 2 && <p className="mt-1 text-xs text-[#8A9691]">+{order.items.length - 2} sản phẩm</p>}
                    </td>
                    <td className="px-4 py-4 font-semibold text-[#C93F2C]">{formatVnd(Number(order.total) + Number(order.shippingFee || 0))}</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-md px-2 py-1 text-xs font-bold ${orderStatusColors[order.status] || orderStatusColors.pending}`}>
                        {orderStatusLabels[order.status] || order.status}
                      </span>
                      {order.currentLocation && (
                        <p className="mt-2 flex max-w-52 items-start gap-1 text-xs leading-5 text-[#2563EB]">
                          <MapPin size={13} className="mt-0.5 shrink-0" />
                          {order.currentLocation}
                        </p>
                      )}
                      {order.trackingCode && <p className="mt-1 text-xs text-[#68756F]">{order.carrier}: {order.trackingCode}</p>}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        {order.status === 'pending' && (
                          <button type="button" onClick={() => confirmOrder.mutate(order.id)} disabled={confirmOrder.isPending} aria-busy={confirmOrder.isPending && confirmOrder.variables === order.id} className="flex items-center gap-1.5 rounded-md bg-[#0F766E] px-3 py-2 text-xs font-bold text-white hover:bg-[#0B5F58]">
                            {confirmOrder.isPending && confirmOrder.variables === order.id && <Spinner size="sm" label="Đang xác nhận đơn..." />}
                            {confirmOrder.isPending && confirmOrder.variables === order.id ? 'Đang xác nhận...' : 'Xác nhận'}
                          </button>
                        )}
                        {order.status === 'confirmed' && (
                          <button type="button" onClick={() => packOrder.mutate(order.id)} disabled={packOrder.isPending} aria-busy={packOrder.isPending && packOrder.variables === order.id} className="flex items-center gap-1.5 rounded-md border border-[#D5DEDA] px-3 py-2 text-xs font-bold text-[#405049] hover:border-[#0F766E]">
                            {packOrder.isPending && packOrder.variables === order.id
                              ? <Spinner size="sm" label="Đang cập nhật đóng gói..." />
                              : <PackageCheck size={14} aria-hidden />}
                            {packOrder.isPending && packOrder.variables === order.id ? 'Đang cập nhật...' : 'Đóng gói'}
                          </button>
                        )}
                        {order.status === 'packing' && (
                          <button type="button" onClick={() => openShippingDialog(order)} className="flex items-center gap-1.5 rounded-md bg-[#2563EB] px-3 py-2 text-xs font-bold text-white hover:bg-[#1D4ED8]">
                            <Truck size={14} />Bàn giao
                          </button>
                        )}
                        {order.status === 'shipping' && (
                          <button type="button" onClick={() => openTrackingDialog(order)} className="flex items-center gap-1.5 rounded-md border border-[#AFC7EE] px-3 py-2 text-xs font-bold text-[#2563EB] hover:bg-[#F3F7FF]">
                            <MapPin size={14} />Cập nhật hành trình
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filteredOrders.length && <p className="p-8 text-center text-sm text-[#68756F]">Không có đơn hàng phù hợp.</p>}
          </div>
        )}
      </section>

      <Modal
        open={Boolean(dialog.mode)}
        onClose={() => setDialog({ mode: null, order: null })}
        title={dialog.mode === 'ship' ? 'Bàn giao vận chuyển' : 'Cập nhật hành trình'}
      >
        {dialog.order && (
          <form onSubmit={dialog.mode === 'ship' ? submitShipping : submitTracking} className="space-y-4">
            <p className="text-sm text-[#68756F]">Đơn #{dialog.order.id.slice(0, 8)}</p>

            {dialog.mode === 'ship' && (
              <>
                <label className="block">
                  <span className="mb-2 block text-xs font-bold text-[#405049]">Đơn vị vận chuyển</span>
                  <select name="carrier" value={shippingForm.carrier} onChange={updateForm} className="h-11 w-full rounded-lg border border-[#D5DEDA] px-3 text-sm outline-none focus:border-[#2563EB]">
                    {['GHN', 'GHTK', 'Viettel Post', 'VNPost', 'Tự giao'].map((carrier) => <option key={carrier}>{carrier}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-bold text-[#405049]">Mã vận đơn</span>
                  <input required name="trackingCode" value={shippingForm.trackingCode} onChange={updateForm} placeholder="Nhập mã từ đơn vị vận chuyển" className="h-11 w-full rounded-lg border border-[#D5DEDA] px-3 text-sm outline-none focus:border-[#2563EB]" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-bold text-[#405049]">Ngày giao dự kiến</span>
                  <input required type="date" name="estimatedDeliveryAt" value={shippingForm.estimatedDeliveryAt} onChange={updateForm} className="h-11 w-full rounded-lg border border-[#D5DEDA] px-3 text-sm outline-none focus:border-[#2563EB]" />
                </label>
              </>
            )}

            <label className="block">
              <span className="mb-2 block text-xs font-bold text-[#405049]">
                {dialog.mode === 'ship' ? 'Vị trí lấy hàng' : 'Vị trí hiện tại'}
              </span>
              <input required name="currentLocation" value={shippingForm.currentLocation} onChange={updateForm} placeholder="Ví dụ: Kho Thanh Xuân, Hà Nội" className="h-11 w-full rounded-lg border border-[#D5DEDA] px-3 text-sm outline-none focus:border-[#2563EB]" />
            </label>

            {dialog.mode === 'tracking' && (
              <label className="block">
                <span className="mb-2 block text-xs font-bold text-[#405049]">Ghi chú hành trình</span>
                <textarea name="note" value={shippingForm.note} onChange={updateForm} rows={3} placeholder="Ví dụ: Đã đến kho trung chuyển" className="w-full resize-none rounded-lg border border-[#D5DEDA] p-3 text-sm outline-none focus:border-[#2563EB]" />
              </label>
            )}

            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
              {dialog.mode === 'tracking' && (
                <button type="button" onClick={markDelivered} disabled={mutationPending} aria-busy={deliverOrder.isPending} className="flex h-10 items-center justify-center gap-2 rounded-lg border border-[#9BC7A2] px-4 text-sm font-bold text-[#287A38] hover:bg-[#E8F6EA] disabled:opacity-50">
                  {deliverOrder.isPending
                    ? <Spinner size="sm" label="Đang xác nhận giao hàng..." />
                    : <CheckCircle2 size={16} aria-hidden />}
                  {deliverOrder.isPending ? 'Đang xác nhận...' : 'Đã giao thành công'}
                </button>
              )}
              <button type="submit" disabled={mutationPending} aria-busy={shipOrder.isPending || updateTracking.isPending} className="flex h-10 items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 text-sm font-bold text-white hover:bg-[#1D4ED8] disabled:opacity-50">
                {shipOrder.isPending || updateTracking.isPending
                  ? <Spinner size="sm" label="Đang cập nhật vận chuyển..." />
                  : dialog.mode === 'ship' ? <Truck size={16} aria-hidden /> : <MapPin size={16} aria-hidden />}
                {shipOrder.isPending || updateTracking.isPending
                  ? 'Đang cập nhật...'
                  : dialog.mode === 'ship' ? 'Xác nhận bàn giao' : 'Lưu vị trí'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </main>
  );
}

export default SellerOrders;

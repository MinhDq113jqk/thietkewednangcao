import { Form as BsForm, Button as BsButton, Table as BsTable } from 'react-bootstrap';
import { useAccountQuery } from '../../../hooks/useAccountQuery';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  MapPin,
  PackageCheck,
  Search,
  Truck,
} from 'lucide-react';
import ListPaging from '../../../components/ui/ListPaging';
import OrderDateFilters from '../../../components/forms/OrderDateFilters';
import sellerApi from '../api/sellerApi';
import Modal from '../../../components/ui/Modal';
import { toast } from '../../../components/ui/toastStore';
import { TableSkeleton } from '../../../components/ui/Skeleton';
import Spinner from '../../../components/ui/Spinner';
import { formatVnd } from '../../../utils/format';
import { orderStatusColors, orderStatusLabels } from '../../../utils/orderStatus';

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
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get('orderId') || '');
  const [page, setPage] = useState(1);
  const [dates, setDates] = useState({ from: '', to: '', sort: 'newest' });
  const [status, setStatus] = useState('all');
  const [dialog, setDialog] = useState({ mode: null, order: null });
  const [shippingForm, setShippingForm] = useState(emptyShippingForm);
  const { data, isLoading, isFetching, isError, refetch } = useAccountQuery({
    queryKey: ['seller-orders', { page, status, search, ...dates }],
    queryFn: () => sellerApi.getOrders({ page, status, search, ...dates }),
    refetchInterval: 30_000,
  });

  const filteredOrders = data?.items || [];

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
      <div className="border-bottom pb-4 seller-orders-detail-1">
        <p className="booking-caption fw-bold text-uppercase text-primary">Vận hành và giao hàng</p>
        <h1 className="mt-2 booking-title fs-4 fw-semibold text-dark">Đơn hàng</h1>
        <p className="mt-1 booking-small text-secondary">{data?.total ?? 0} đơn trong gian hàng</p>
      </div>

      <div className="mt-4 d-grid gap-3 seller-orders-detail-2">
        <BsForm.Label className="position-relative d-block">
          <Search className="pe-none position-absolute text-secondary seller-orders-detail-3" size={16} />
          <BsForm.Control
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            maxLength={120}
            aria-label="Tìm đơn hàng"
            placeholder="Mã đơn, người mua, mã vận đơn..."
            className="w-100 rounded-3 border py-2 ps-5 pe-2 booking-small seller-orders-detail-4"
          />
        </BsForm.Label>
        <BsForm.Select
          value={status}
          onChange={(event) => { setStatus(event.target.value); setPage(1); }}
          aria-label="Trạng thái đơn hàng"
          className="rounded-3 border px-2 booking-small seller-orders-detail-5"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </BsForm.Select>
      </div>

      <OrderDateFilters value={dates} onChange={value => { setDates(value); setPage(1); }} />
      <section className="mt-4 overflow-hidden rounded-3 border seller-orders-detail-6" aria-label="Danh sách đơn hàng" aria-busy={isLoading}>
        {isLoading && <div className="overflow-x-auto"><TableSkeleton columns={6} rows={6} className="seller-orders-detail-7" /></div>}
        {isError && <p className="p-4 booking-small text-danger">Không thể tải đơn hàng. <BsButton variant="outline-primary" type="submit" onClick={() => refetch()} className="text-decoration-underline">Thử lại</BsButton></p>}

        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            <BsTable responsive hover className="w-100 text-start booking-small seller-orders-detail-8">
              <thead className="booking-caption text-uppercase text-secondary seller-orders-detail-9">
                <tr>
                  <th className="px-3 py-2">Mã đơn</th>
                  <th className="px-3 py-2">Người nhận</th>
                  <th className="px-3 py-2">Sản phẩm</th>
                  <th className="px-3 py-2">Tổng</th>
                  <th className="px-3 py-2">Trạng thái / vị trí</th>
                  <th className="px-3 py-2 text-end">Thao tác</th>
                </tr>
              </thead>
              <tbody className="seller-orders-detail-10">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="align-top seller-orders-detail-11">
                    <td className="px-3 py-3">
                      <p className="fw-semibold text-dark">#{order.id.slice(0, 8)}</p>
                      <p className="mt-1 booking-caption text-secondary">{new Date(order.createdAt).toLocaleDateString('vi-VN')}</p>
                    </td>
                    <td className="px-3 py-3 text-secondary">
                      <p className="fw-medium text-dark">{order.shippingAddress?.name || order.buyer?.name || '-'}</p>
                      <p className="mt-1 booking-caption">{order.shippingAddress?.phone || order.buyer?.email}</p>
                    </td>
                    <td className="px-3 py-3 text-secondary seller-orders-detail-12">
                      {order.items?.slice(0, 2).map((item) => (
                        <p key={item.id} className="text-truncate">{item.name} × {item.quantity}</p>
                      ))}
                      {order.items?.length > 2 && <p className="mt-1 booking-caption text-secondary">+{order.items.length - 2} sản phẩm</p>}
                    </td>
                    <td className="px-3 py-3 fw-semibold text-danger">{formatVnd(Number(order.total) + Number(order.shippingFee || 0))}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-2 px-2 py-1 booking-caption fw-bold ${orderStatusColors[order.status] || orderStatusColors.pending}`}>
                        {orderStatusLabels[order.status] || order.status}
                      </span>
                      {order.currentLocation && (
                        <p className="mt-2 d-flex align-items-start gap-1 booking-caption text-primary seller-orders-detail-13">
                          <MapPin size={13} className="mt-1 flex-shrink-0" />
                          {order.currentLocation}
                        </p>
                      )}
                      {order.trackingCode && <p className="mt-1 booking-caption text-secondary">{order.carrier}: {order.trackingCode}</p>}
                    </td>
                    <td className="px-3 py-3">
                      <div className="d-flex justify-content-end gap-2">
                        {order.paymentMethod === 'bank_transfer' && order.paymentStatus !== 'paid' && !['cancelled', 'returned'].includes(order.status)
                          && <p className="booking-caption text-warning">Chờ đối soát thanh toán</p>}
                        {order.status === 'pending' && (order.paymentMethod !== 'bank_transfer' || order.paymentStatus === 'paid') && (
                          <BsButton variant="primary" type="button" onClick={() => confirmOrder.mutate(order.id)} disabled={confirmOrder.isPending} aria-busy={confirmOrder.isPending && confirmOrder.variables === order.id} className="d-flex align-items-center gap-2 px-2 py-2 booking-caption">
                            {confirmOrder.isPending && confirmOrder.variables === order.id && <Spinner size="sm" label="Đang xác nhận đơn..." />}
                            {confirmOrder.isPending && confirmOrder.variables === order.id ? 'Đang xác nhận...' : 'Xác nhận'}
                          </BsButton>
                        )}
                        {order.status === 'confirmed' && (order.paymentMethod !== 'bank_transfer' || order.paymentStatus === 'paid') && (
                          <BsButton variant="outline-primary" type="button" onClick={() => packOrder.mutate(order.id)} disabled={packOrder.isPending} aria-busy={packOrder.isPending && packOrder.variables === order.id} className="d-flex align-items-center gap-2 px-2 py-2 booking-caption">
                            {packOrder.isPending && packOrder.variables === order.id
                              ? <Spinner size="sm" label="Đang cập nhật đóng gói..." />
                              : <PackageCheck size={14} aria-hidden />}
                            {packOrder.isPending && packOrder.variables === order.id ? 'Đang cập nhật...' : 'Đóng gói'}
                          </BsButton>
                        )}
                        {order.status === 'packing' && (order.paymentMethod !== 'bank_transfer' || order.paymentStatus === 'paid') && (
                          <BsButton variant="outline-primary" type="button" onClick={() => openShippingDialog(order)} className="d-flex align-items-center gap-2 px-2 py-2 booking-caption">
                            <Truck size={14} />Bàn giao
                          </BsButton>
                        )}
                        {order.status === 'shipping' && (
                          <BsButton variant="outline-primary" type="button" onClick={() => openTrackingDialog(order)} className="d-flex align-items-center gap-2 px-2 py-2 booking-caption">
                            <MapPin size={14} />Cập nhật hành trình
                          </BsButton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </BsTable>
            {!filteredOrders.length && <p className="p-5 text-center booking-small text-secondary">Không có đơn hàng phù hợp.</p>}
          </div>
        )}
      </section>

      <Modal
        open={Boolean(dialog.mode)}
        onClose={() => setDialog({ mode: null, order: null })}
        title={dialog.mode === 'ship' ? 'Bàn giao vận chuyển' : 'Cập nhật hành trình'}
      >
        {dialog.order && (
          <BsForm onSubmit={dialog.mode === 'ship' ? submitShipping : submitTracking} className="seller-orders-detail-14">
            <p className="booking-small text-secondary">Đơn #{dialog.order.id.slice(0, 8)}</p>

            {dialog.mode === 'ship' && (
              <>
                <BsForm.Label className="d-block">
                  <span className="mb-2 d-block booking-caption fw-bold text-body">Đơn vị vận chuyển</span>
                  <BsForm.Select name="carrier" value={shippingForm.carrier} onChange={updateForm} className="w-100 rounded-3 border px-2 booking-small seller-orders-detail-15">
                    {['GHN', 'GHTK', 'Viettel Post', 'VNPost', 'Tự giao'].map((carrier) => <option key={carrier}>{carrier}</option>)}
                  </BsForm.Select>
                </BsForm.Label>
                <BsForm.Label className="d-block">
                  <span className="mb-2 d-block booking-caption fw-bold text-body">Mã vận đơn</span>
                  <BsForm.Control required name="trackingCode" value={shippingForm.trackingCode} onChange={updateForm} placeholder="Nhập mã từ đơn vị vận chuyển" className="w-100 rounded-3 border px-2 booking-small seller-orders-detail-16" />
                </BsForm.Label>
                <BsForm.Label className="d-block">
                  <span className="mb-2 d-block booking-caption fw-bold text-body">Ngày giao dự kiến</span>
                  <BsForm.Control required type="date" name="estimatedDeliveryAt" value={shippingForm.estimatedDeliveryAt} onChange={updateForm} className="w-100 rounded-3 border px-2 booking-small seller-orders-detail-17" />
                </BsForm.Label>
              </>
            )}

            <BsForm.Label className="d-block">
              <span className="mb-2 d-block booking-caption fw-bold text-body">
                {dialog.mode === 'ship' ? 'Vị trí lấy hàng' : 'Vị trí hiện tại'}
              </span>
              <BsForm.Control required name="currentLocation" value={shippingForm.currentLocation} onChange={updateForm} placeholder="Ví dụ: Kho Thanh Xuân, Hà Nội" className="w-100 rounded-3 border px-2 booking-small seller-orders-detail-18" />
            </BsForm.Label>

            {dialog.mode === 'tracking' && (
              <BsForm.Label className="d-block">
                <span className="mb-2 d-block booking-caption fw-bold text-body">Ghi chú hành trình</span>
                <BsForm.Control as="textarea" name="note" value={shippingForm.note} onChange={updateForm} rows={3} placeholder="Ví dụ: Đã đến kho trung chuyển" className="w-100 rounded-3 border p-2 booking-small seller-orders-detail-19" />
              </BsForm.Label>
            )}

            <div className="d-flex flex-column gap-2 pt-2 flex-sm-row justify-content-sm-end">
              {dialog.mode === 'tracking' && (
                <BsButton variant="outline-primary" type="button" onClick={markDelivered} disabled={mutationPending} aria-busy={deliverOrder.isPending} className="d-flex align-items-center justify-content-center gap-2 px-3 booking-small seller-orders-detail-20">
                  {deliverOrder.isPending
                    ? <Spinner size="sm" label="Đang xác nhận giao hàng..." />
                    : <CheckCircle2 size={16} aria-hidden />}
                  {deliverOrder.isPending ? 'Đang xác nhận...' : 'Đã giao thành công'}
                </BsButton>
              )}
              <BsButton variant="outline-primary" type="submit" disabled={mutationPending} aria-busy={shipOrder.isPending || updateTracking.isPending} className="d-flex align-items-center justify-content-center gap-2 px-3 booking-small seller-orders-detail-21">
                {shipOrder.isPending || updateTracking.isPending
                  ? <Spinner size="sm" label="Đang cập nhật vận chuyển..." />
                  : dialog.mode === 'ship' ? <Truck size={16} aria-hidden /> : <MapPin size={16} aria-hidden />}
                {shipOrder.isPending || updateTracking.isPending
                  ? 'Đang cập nhật...'
                  : dialog.mode === 'ship' ? 'Xác nhận bàn giao' : 'Lưu vị trí'}
              </BsButton>
            </div>
          </BsForm>
        )}
      </Modal>
      {!isError && <ListPaging data={data} page={page} onPage={setPage} busy={isFetching} />}
    </main>
  );
}

export default SellerOrders;

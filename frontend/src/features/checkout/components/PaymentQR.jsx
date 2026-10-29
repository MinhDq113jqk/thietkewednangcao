import { Button as BsButton } from 'react-bootstrap';
import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy, QrCode, RefreshCw } from 'lucide-react';
import paymentApi from '../api/paymentApi';
import orderApi from '../../orders/api/orderApi';
import { useAccountQuery } from '../../../hooks/useAccountQuery';
import Spinner from '../../../components/ui/Spinner';
import { toast } from '../../../components/ui/toastStore';
import { formatVnd, toNumber } from '../../../utils/format';

function PaymentQR({ order: initialOrder }) {
  const { data: order = initialOrder, isError: balanceError } = useAccountQuery({
    queryKey: ['order', initialOrder.id], queryFn: () => orderApi.getOrder(initialOrder.id),
    initialData: initialOrder,
    refetchInterval: (query) => query.state.data?.paymentStatus === 'unpaid'
      && !['cancelled', 'returned'].includes(query.state.data?.status) ? 15000 : false,
  });
  const amount = order.paymentSummary?.outstandingAmount ?? (toNumber(order.total) + toNumber(order.shippingFee));
  const queryClient = useQueryClient();
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const closed = ['cancelled', 'returned'].includes(order.status) || order.paymentStatus !== 'unpaid';
  const expired = Boolean(order.expiredAt || (order.paymentExpiresAt && new Date(order.paymentExpiresAt).getTime() <= now));
  const generateQr = useMutation({
    mutationFn: () => paymentApi.generateVietQr(order.id),
  });
  const qr = !closed && !expired && !balanceError && generateQr.data?.orderId === order.id
    && generateQr.data?.amount === amount ? generateQr.data : null;
  useEffect(() => {
    if (expired) {
      queryClient.invalidateQueries({ queryKey: ['order', order.id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  }, [expired, order.id, queryClient]);

  const copyValue = async (value, label) => {
    try {
      await navigator.clipboard.writeText(String(value));
      toast.success(`Đã sao chép ${label}`);
    } catch {
      toast.error('Trình duyệt không cho phép sao chép tự động');
    }
  };

  return (
    <article className="rounded-3 border p-4 payment-qr-detail-1" aria-busy={generateQr.isPending}>
      <div className="d-flex align-items-start justify-content-between gap-4">
        <div>
          <p className="booking-caption fw-bold text-uppercase text-primary">Đơn #{order.id.slice(0, 8)}</p>
          <h3 className="mt-2 fs-5 fw-bold text-danger">{formatVnd(amount)}</h3>
          {order.shop?.name && <p className="mt-1 booking-caption text-secondary">{order.shop.name}</p>}
        </div>
        <QrCode className="text-primary" size={28} aria-hidden />
      </div>
      {order.paymentSummary?.allocatedAmount > 0 && <p className="mt-2 booking-small text-secondary">Đã đối soát {formatVnd(order.paymentSummary.allocatedAmount)}. Số tiền hiển thị là khoản còn thiếu.</p>}
      {order.paymentExpiresAt && <p className="mt-2 booking-small text-secondary">Hạn thanh toán: {new Date(order.paymentExpiresAt).toLocaleString('vi-VN')}</p>}
      {balanceError && <p role="alert" className="mt-2 booking-small text-danger">Không thể cập nhật số tiền còn thiếu. Vui lòng tải lại trang trước khi chuyển khoản.</p>}
      {(expired || closed) && <p role="status" className="mt-2 rounded-3 bg-warning-subtle p-2 booking-small text-warning">{expired ? 'Đơn đã hết hạn thanh toán. Vui lòng đặt đơn mới. Nếu đã chuyển tiền, liên hệ hỗ trợ để đối soát.' : 'Đơn không còn chờ thanh toán.'}</p>}

      {!qr && !expired && !closed && !balanceError && (
        <BsButton variant="primary"
          type="button"
          onClick={() => generateQr.mutate()}
          disabled={generateQr.isPending}
          aria-busy={generateQr.isPending}
          className="mt-4 d-flex w-100 align-items-center justify-content-center gap-2 px-3 booking-small payment-qr-detail-2"
        >
          {generateQr.isPending ? <Spinner size="sm" label="Đang tạo mã VietQR..." /> : <QrCode size={17} aria-hidden />}
          {generateQr.isPending ? 'Đang tạo mã...' : 'Hiển thị mã VietQR'}
        </BsButton>
      )}

      {generateQr.isError && (
        <p className="mt-2 rounded-3 border p-2 booking-caption text-danger payment-qr-detail-3">
          {generateQr.error?.response?.data?.message || 'Không thể tạo mã QR. Vui lòng thử lại.'}
        </p>
      )}

      {qr && (
        <div className="mt-4">
          <img
            src={qr.qrDataURL}
            alt={`Mã VietQR cho đơn ${order.id.slice(0, 8)}`}
            className="mx-auto w-100 rounded-3 border object-fit-contain p-2 payment-qr-detail-4"
          />
          <dl className="mt-3 rounded-3 px-3 booking-caption payment-qr-detail-5">
            <div className="d-flex align-items-center justify-content-between gap-3 py-2">
              <div><dt className="text-secondary">Nội dung</dt><dd className="mt-1 fw-bold text-dark">{qr.addInfo}</dd></div>
              <BsButton variant="outline-primary" type="button" onClick={() => copyValue(qr.addInfo, 'nội dung')} className="d-flex align-items-center justify-content-center payment-qr-detail-6" aria-label="Sao chép nội dung">
                <Copy size={15} />
              </BsButton>
            </div>
            <div className="d-flex align-items-center justify-content-between gap-3 py-2">
              <div><dt className="text-secondary">Số tài khoản</dt><dd className="mt-1 fw-bold text-dark">{qr.bank?.accountNo}</dd></div>
              <BsButton variant="outline-primary" type="button" onClick={() => copyValue(qr.bank?.accountNo, 'số tài khoản')} className="d-flex align-items-center justify-content-center payment-qr-detail-7" aria-label="Sao chép số tài khoản">
                <Copy size={15} />
              </BsButton>
            </div>
            <div className="py-2"><dt className="text-secondary">Chủ tài khoản</dt><dd className="mt-1 fw-bold text-dark">{qr.bank?.accountName}</dd></div>
          </dl>
          <BsButton variant="outline-primary" type="button" onClick={() => generateQr.reset()} className="mx-auto mt-2 d-flex align-items-center gap-2 booking-caption">
            <RefreshCw size={14} />
            Tạo lại mã
          </BsButton>
        </div>
      )}
    </article>
  );
}

export default PaymentQR;

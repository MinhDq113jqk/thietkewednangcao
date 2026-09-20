import { useMutation } from '@tanstack/react-query';
import { Copy, QrCode, RefreshCw } from 'lucide-react';
import paymentApi from '../api/paymentApi';
import Spinner from './ui/Spinner';
import { toast } from './ui/toastStore';
import { formatVnd, toNumber } from '../utils/format';

function PaymentQR({ order }) {
  const amount = toNumber(order.total) + toNumber(order.shippingFee);
  const generateQr = useMutation({
    mutationFn: () => paymentApi.generateVietQr(order.id),
  });
  const qr = generateQr.data;

  const copyValue = async (value, label) => {
    try {
      await navigator.clipboard.writeText(String(value));
      toast.success(`Đã sao chép ${label}`);
    } catch {
      toast.error('Trình duyệt không cho phép sao chép tự động');
    }
  };

  return (
    <article className="rounded-lg border border-[#DDE4E0] bg-white p-5" aria-busy={generateQr.isPending}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase text-[#0F766E]">Đơn #{order.id.slice(0, 8)}</p>
          <h3 className="mt-2 text-xl font-bold text-[#C93F2C]">{formatVnd(amount)}</h3>
          {order.shop?.name && <p className="mt-1 text-xs text-[#68756F]">{order.shop.name}</p>}
        </div>
        <QrCode className="text-[#0F766E]" size={28} aria-hidden />
      </div>

      {!qr && (
        <button
          type="button"
          onClick={() => generateQr.mutate()}
          disabled={generateQr.isPending}
          aria-busy={generateQr.isPending}
          className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#0F766E] px-4 text-sm font-bold text-white hover:bg-[#0B5F58] disabled:bg-[#9ABFBA]"
        >
          {generateQr.isPending ? <Spinner size="sm" label="Đang tạo mã VietQR..." /> : <QrCode size={17} aria-hidden />}
          {generateQr.isPending ? 'Đang tạo mã...' : 'Hiển thị mã VietQR'}
        </button>
      )}

      {generateQr.isError && (
        <p className="mt-3 rounded-lg border border-[#F3C9C1] bg-[#FFF1EE] p-3 text-xs leading-5 text-[#A73525]">
          {generateQr.error?.response?.data?.message || 'Không thể tạo mã QR. Vui lòng thử lại.'}
        </p>
      )}

      {qr && (
        <div className="mt-5">
          <img
            src={qr.qrDataURL}
            alt={`Mã VietQR cho đơn ${order.id.slice(0, 8)}`}
            className="mx-auto aspect-square w-full max-w-64 rounded-lg border border-[#DDE4E0] bg-white object-contain p-2"
          />
          <dl className="mt-4 divide-y divide-[#EDF1EF] rounded-lg bg-[#F7F8F5] px-4 text-xs">
            <div className="flex items-center justify-between gap-3 py-3">
              <div><dt className="text-[#7A8781]">Nội dung</dt><dd className="mt-1 font-bold text-[#17201D]">{qr.addInfo}</dd></div>
              <button type="button" onClick={() => copyValue(qr.addInfo, 'nội dung')} className="flex h-8 w-8 items-center justify-center rounded-md text-[#0F766E] hover:bg-white" aria-label="Sao chép nội dung">
                <Copy size={15} />
              </button>
            </div>
            <div className="flex items-center justify-between gap-3 py-3">
              <div><dt className="text-[#7A8781]">Số tài khoản</dt><dd className="mt-1 font-bold text-[#17201D]">{qr.bank?.accountNo}</dd></div>
              <button type="button" onClick={() => copyValue(qr.bank?.accountNo, 'số tài khoản')} className="flex h-8 w-8 items-center justify-center rounded-md text-[#0F766E] hover:bg-white" aria-label="Sao chép số tài khoản">
                <Copy size={15} />
              </button>
            </div>
            <div className="py-3"><dt className="text-[#7A8781]">Chủ tài khoản</dt><dd className="mt-1 font-bold text-[#17201D]">{qr.bank?.accountName}</dd></div>
          </dl>
          <button type="button" onClick={() => generateQr.reset()} className="mx-auto mt-3 flex items-center gap-2 text-xs font-semibold text-[#68756F] hover:text-[#0F766E]">
            <RefreshCw size={14} />
            Tạo lại mã
          </button>
        </div>
      )}
    </article>
  );
}

export default PaymentQR;

import { Form as BsForm, Button as BsButton } from 'react-bootstrap';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccountQuery } from '../../../hooks/useAccountQuery';
import paymentApi from '../../checkout/api/paymentApi';
import Spinner from '../../../components/ui/Spinner';
import { formatVnd } from '../../../utils/format';
import { toast } from '../../../components/ui/toastStore';

const inputClass = "mt-1 w-100 rounded-3 border border-secondary px-2 py-2 booking-small admin-payments-detail-1";
const reasonLabels = {
  unmatched: 'Chưa xác định đơn', ready: 'Chờ đối soát', content_mismatch: 'Sai nội dung chuyển khoản',
  matched: 'Đã phân bổ', overpayment: 'Thừa tiền, cần xử lý', late_payment: 'Nhận hoặc đối soát quá hạn',
  expired: 'Đơn đã hết hạn', order_closed: 'Đơn đã đóng', legacy_payment: 'Đơn đã thanh toán theo dữ liệu cũ',
  predates_order: 'Giao dịch có trước đơn', wrong_method: 'Sai phương thức thanh toán',
  fully_refunded: 'Đã hoàn hết tiền',
};
const localNow = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
};

function OrderBalance({ orderId }) {
  const { data, isLoading, isError } = useAccountQuery({
    queryKey: ['admin-payment-order', orderId], queryFn: () => paymentApi.getOrderBalance(orderId),
    enabled: /^[a-f0-9-]{36}$/i.test(orderId), staleTime: 0,
  });
  if (!orderId) return null;
  if (isLoading) return <p className="mt-2 booking-small" role="status">Đang tải số dư đơn…</p>;
  if (isError) return <p className="mt-2 booking-small text-danger" role="alert">Không tìm thấy hoặc không tải được đơn hàng.</p>;
  if (!data) return <p className="mt-2 booking-small text-danger">Nhập mã UUID đầy đủ của đơn hàng.</p>;
  return <div className="mt-2 rounded-3 bg-secondary-subtle p-2 booking-small">
    <p>Phải thu: <strong>{formatVnd(data.expectedAmount)}</strong> · Đã phân bổ: {formatVnd(data.allocatedAmount)}</p>
    <p>Còn thiếu: <strong>{formatVnd(data.outstandingAmount)}</strong> · Nội dung: <strong>{data.transferReference}</strong></p>
    {data.legacyPayment && <p className="mt-2 text-warning">Đơn cũ đã thanh toán nhưng chưa có chứng từ gốc. Cần xác minh để sử dụng sổ hoàn tiền.</p>}
    {data.paymentExpiresAt && <p>Hạn thanh toán: {new Date(data.paymentExpiresAt).toLocaleString('vi-VN')}</p>}
    {(data.expiredAt || ['cancelled', 'returned'].includes(data.status)) && <p className="fw-semibold text-danger">Đơn đã đóng; giao dịch cần được xử lý riêng.</p>}
  </div>;
}

function AdminPayments() {
  const [params] = useSearchParams();
  const [form, setForm] = useState(() => ({ reference: '', amount: '', receivedAt: localNow(),
    orderId: params.get('orderId') || '', transferContent: '', evidence: '' }));
  const [selection, setSelection] = useState(null);
  const [reviewOnly, setReviewOnly] = useState(false);
  const [page, setPage] = useState(1);
  const errorRef = useRef(null);
  const queryClient = useQueryClient();
  const refresh = () => {
    for (const key of ['admin-payments', 'admin-payment-order', 'admin-orders', 'admin-stats', 'orders', 'order']) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  };
  const receipts = useAccountQuery({ queryKey: ['admin-payments', page, reviewOnly],
    queryFn: () => paymentApi.listReceipts({ page, limit: 20, reviewOnly }), refetchInterval: 15000 });
  const record = useMutation({
    mutationFn: (payload) => paymentApi.recordReceipt(payload),
    onSuccess: ({ receipt }) => { refresh(); setSelection({ id: receipt.id, orderId: receipt.orderId || '', note: '' }); toast.success('Đã lưu giao dịch. Kiểm tra đơn và xác nhận phân bổ tiền.'); },
  });
  const allocate = useMutation({
    mutationFn: ({ id, ...payload }) => paymentApi.allocateReceipt(id, payload),
    onSuccess: (result) => { refresh(); if (result.allocated) { setSelection(null); toast.success('Đã đối soát giao dịch'); } },
  });
  const expire = useMutation({ mutationFn: paymentApi.expireOrders,
    onSuccess: (result) => { refresh(); toast.success(`Đã xử lý ${result.expired} đơn quá hạn`); },
    onError: () => toast.error('Không thể xử lý đơn quá hạn; vui lòng thử lại'),
  });
  useEffect(() => { if (record.isError || allocate.isError) errorRef.current?.focus(); }, [record.isError, allocate.isError]);
  const setField = (name, value) => setForm((previous) => ({ ...previous, [name]: value }));
  const error = record.error || allocate.error;

  return <div className="admin-payments-detail-2">
    <header>
      <h1 className="fs-4 fw-bold text-secondary">Đối soát thanh toán</h1>
      <p className="mt-2 booking-small text-secondary">Ghi nhận tiền đã vào tài khoản theo sao kê, sau đó phân bổ cho đơn hàng. Mỗi mã giao dịch chỉ được ghi nhận một lần.</p>
    </header>
    {error && <div ref={errorRef} tabIndex={-1} role="alert" className="rounded-3 border border-danger bg-danger-subtle p-3 booking-small text-danger">{error.response?.data?.message || 'Không thể xử lý. Vui lòng thử lại với cùng nội dung.'}</div>}
    <section className="rounded-3 border border-secondary p-4 admin-payments-detail-3">
      <h2 className="fs-5 fw-semibold">1. Ghi nhận giao dịch nhận tiền</h2>
      <BsForm className="mt-3 d-grid gap-4 admin-payments-detail-4" onSubmit={(event) => {
        event.preventDefault();
        record.mutate({ ...form, receivedAt: new Date(form.receivedAt).toISOString() });
      }}>
        <BsForm.Label className="booking-small fw-medium">Mã giao dịch ngân hàng
          <BsForm.Control className={inputClass} required minLength={3} maxLength={120} name="reference" value={form.reference} onChange={(e) => setField('reference', e.target.value)} />
        </BsForm.Label>
        <BsForm.Label className="booking-small fw-medium">Số tiền thực nhận (VND)
          <BsForm.Control className={inputClass} required type="number" min="1" max="999999999999999" step="1" name="amount" value={form.amount} onChange={(e) => setField('amount', e.target.value)} />
        </BsForm.Label>
        <BsForm.Label className="booking-small fw-medium">Thời điểm nhận tiền theo sao kê
          <BsForm.Control className={inputClass} required type="datetime-local" step="1" name="receivedAt" value={form.receivedAt} onChange={(e) => setField('receivedAt', e.target.value)} />
        </BsForm.Label>
        <BsForm.Label className="booking-small fw-medium">Nội dung chuyển khoản thực tế
          <BsForm.Control className={inputClass} maxLength={500} name="transferContent" value={form.transferContent} onChange={(e) => setField('transferContent', e.target.value)} />
        </BsForm.Label>
        <BsForm.Label className="booking-small fw-medium layout-span-md-2 admin-payments-detail-5">Mã đơn hàng đầy đủ (có thể để trống)
          <BsForm.Control className={inputClass} name="orderId" value={form.orderId} onChange={(e) => setField('orderId', e.target.value)} />
          <OrderBalance orderId={form.orderId} />
        </BsForm.Label>
        <BsForm.Label className="booking-small fw-medium layout-span-md-2 admin-payments-detail-6">Bằng chứng đối soát
          <BsForm.Control as="textarea" className={inputClass} required minLength={5} maxLength={1000} name="evidence" rows={2} value={form.evidence} onChange={(e) => setField('evidence', e.target.value)} aria-describedby="receipt-evidence-help" />
          <span id="receipt-evidence-help" className="mt-1 d-block booking-caption text-secondary">Ghi thông tin tham chiếu sao kê và kết quả kiểm tra tiền đã vào tài khoản.</span>
        </BsForm.Label>
        <BsButton variant="outline-primary" type="submit" className="px-3 py-2 booking-small admin-payments-detail-7" disabled={record.isPending}>
          {record.isPending ? 'Đang ghi nhận…' : 'Lưu giao dịch nhận tiền'}
        </BsButton>
      </BsForm>
    </section>
    {selection && <section className="rounded-3 border border-success p-4 admin-payments-detail-8" aria-label="Phân bổ giao dịch">
      <h2 className="fs-5 fw-semibold">2. Xác nhận phân bổ cho đơn hàng</h2>
      <p className="mt-2 booking-small text-secondary">Kiểm tra người chuyển và bằng chứng trước khi xác nhận. Nếu sai nội dung hoặc đổi đơn được gợi ý, ghi rõ lý do xác định giao dịch này thuộc đơn.</p>
      <BsForm className="mt-3 admin-payments-detail-9" onSubmit={(event) => { event.preventDefault(); allocate.mutate(selection); }}>
        <BsForm.Label className="d-block booking-small fw-medium">Mã đơn nhận phân bổ
          <BsForm.Control className={inputClass} required value={selection.orderId} onChange={(e) => setSelection({ ...selection, orderId: e.target.value })} />
        </BsForm.Label>
        <OrderBalance orderId={selection.orderId} />
        <BsForm.Label className="d-flex align-items-start gap-2 booking-small"><BsForm.Check.Input type="checkbox" className="mt-1" checked={selection.verifyLegacy || false} onChange={(e) => setSelection({ ...selection, verifyLegacy: e.target.checked })} /><span>Xác minh chứng từ gốc cho đơn cũ đã thanh toán. Chỉ chọn sau khi đối chiếu sao kê đủ toàn bộ tiền đơn; thao tác giữ nguyên trạng thái giao hàng.</span></BsForm.Label>
        <BsForm.Label className="d-block booking-small fw-medium">Lý do và kết quả kiểm tra
          <BsForm.Control as="textarea" className={inputClass} required minLength={10} maxLength={1000} rows={2} value={selection.note} onChange={(e) => setSelection({ ...selection, note: e.target.value })} />
        </BsForm.Label>
        {allocate.data?.allocated === false && <p className="rounded-3 bg-warning-subtle p-2 booking-small text-warning" role="alert">{reasonLabels[allocate.data.reason] || allocate.data.reason}. {allocate.data.message}</p>}
        <div className="d-flex flex-wrap gap-3">
          <BsButton variant="outline-primary" type="submit" disabled={allocate.isPending} className="px-3 py-2 booking-small admin-payments-detail-10">{allocate.isPending ? 'Đang đối soát…' : 'Xác nhận phân bổ tiền'}</BsButton>
          <BsButton variant="outline-primary" type="button" disabled={allocate.isPending} onClick={() => setSelection(null)} className="px-3 py-2 booking-small admin-payments-detail-11">Đóng</BsButton>
        </div>
      </BsForm>
    </section>}
    <section className="rounded-3 border border-secondary p-4 admin-payments-detail-12">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
        <h2 className="fs-5 fw-semibold">Sổ giao dịch nhận tiền</h2>
        <BsForm.Label className="d-flex align-items-center gap-2 booking-small admin-payments-detail-13"><BsForm.Check.Input type="checkbox" checked={reviewOnly} onChange={(e) => { setReviewOnly(e.target.checked); setPage(1); }} />Chỉ khoản cần xử lý</BsForm.Label>
        <BsButton variant="outline-primary" type="button" onClick={() => expire.mutate()} disabled={expire.isPending} className="px-2 booking-small admin-payments-detail-14">{expire.isPending ? 'Đang xử lý…' : 'Xử lý đơn quá hạn'}</BsButton>
      </div>
      {receipts.isLoading && <Spinner label="Đang tải giao dịch…" />}
      {receipts.isError && <p role="alert" className="mt-3 booking-small text-danger">Không thể tải giao dịch. <BsButton variant="outline-primary" type="button" onClick={() => receipts.refetch()} className="text-decoration-underline admin-payments-detail-15">Thử lại</BsButton></p>}
      <div className="mt-3 admin-payments-detail-16">
        {receipts.data?.items.map((receipt) => <article key={receipt.id} className="rounded-3 border border-secondary p-3">
          <div className="d-flex flex-wrap justify-content-between gap-3">
            <div className="admin-payments-detail-17"><h3 className="fw-semibold">{receipt.reference}</h3><p className="mt-1 booking-small text-secondary">{new Date(receipt.receivedAt).toLocaleString('vi-VN')}</p></div>
            <p className="booking-small fw-semibold">{reasonLabels[receipt.reason] || receipt.reason}</p>
          </div>
          <p className="mt-2 booking-small">Thực nhận: <strong>{formatVnd(receipt.amount)}</strong> · Đã phân bổ: {formatVnd(receipt.allocatedAmount)} · Chưa phân bổ: <strong>{formatVnd(receipt.unappliedAmount)}</strong></p>
          <p className="mt-1 booking-small">Đã hoàn: {formatVnd(receipt.refundedAmount)}</p>
          {receipt.unappliedAmount > 0 && <Link className="mt-2 d-inline-flex align-items-center booking-small fw-semibold text-success text-decoration-underline admin-payments-detail-18" to={`/admin/refunds?receiptId=${receipt.id}`}>Hoàn phần tiền chưa phân bổ</Link>}
          {receipt.heldForReviewAmount > receipt.unappliedAmount && <p className="mt-1 booking-small fw-semibold text-warning">Tiền cần xử lý do đơn đã đóng: {formatVnd(receipt.heldForReviewAmount)}</p>}
          <p className="mt-2 booking-small admin-payments-detail-19">Nội dung: {receipt.transferContent || '(Trống)'}</p>
          <p className="mt-1 booking-small text-secondary admin-payments-detail-20">Bằng chứng: {receipt.evidence}</p>
          {receipt.allocation && <p className="mt-1 booking-small text-secondary admin-payments-detail-21">Đơn: {receipt.allocation.orderId} · Ghi chú: {receipt.allocation.note}</p>}
          {!receipt.allocation && <BsButton variant="outline-primary" type="button" onClick={() => { allocate.reset(); record.reset(); setSelection({ id: receipt.id, orderId: receipt.orderId || '', note: '' }); }} className="mt-2 px-3 booking-small text-success admin-payments-detail-22">Đối soát giao dịch</BsButton>}
        </article>)}
        {!receipts.isLoading && !receipts.isError && !receipts.data?.items.length && <p className="py-4 text-center booking-small text-secondary">Không có giao dịch phù hợp.</p>}
      </div>
      <div className="mt-3 d-flex align-items-center justify-content-between gap-3 booking-small">
        <BsButton variant="outline-primary" type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-2 admin-payments-detail-23">Trang trước</BsButton>
        <span>Trang {page} / {receipts.data?.totalPages || 1}</span>
        <BsButton variant="outline-primary" type="button" disabled={!receipts.data || page >= receipts.data.totalPages} onClick={() => setPage(page + 1)} className="px-2 admin-payments-detail-24">Trang sau</BsButton>
      </div>
    </section>
  </div>;
}

export default AdminPayments;

import { Form as BsForm, Button as BsButton } from 'react-bootstrap';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAccountQuery } from '../../../hooks/useAccountQuery';
import afterSalesApi from '../../after-sales/api/afterSalesApi';
import paymentApi from '../../checkout/api/paymentApi';
import { fieldClass, buttonClass } from '../../after-sales/components/AfterSales';
import { useRefreshCommerce } from '../../../hooks/useRefreshCommerce';
import { localTime, isUuid } from '../../../utils/commerceForm';
import { formatVnd } from '../../../utils/format';
import { toast } from '../../../components/ui/toastStore';

export function MoneyFactFields({ form, setForm, includeFee = false }) {
  const field = (key, label, props = {}) => <BsForm.Label className="d-block booking-small">{label}<BsForm.Control className={fieldClass} required value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} {...props} /></BsForm.Label>;
  return <>
    {field('reference', 'Mã giao dịch trên chứng từ', { minLength: 3, maxLength: 120 })}
    {field('amount', 'Số tiền thực tế (VND)', { type: 'number', min: includeFee ? 0 : 1, max: '999999999999999', step: 1 })}
    {includeFee && field('fee', 'Phí đơn vị vận chuyển giữ lại (VND)', { type: 'number', min: 0, max: '999999999999999', step: 1 })}
    {field('occurredAt', 'Thời điểm trên chứng từ', { type: 'datetime-local', step: 1 })}
    <BsForm.Label className="d-block booking-small layout-span-md-2 admin-refunds-detail-1">Bằng chứng đã kiểm tra<BsForm.Control as="textarea" className={fieldClass} required minLength={5} maxLength={1000} value={form.evidence} onChange={(e) => setForm({ ...form, evidence: e.target.value })} /></BsForm.Label>
    <BsForm.Label className="d-block booking-small layout-span-md-2 admin-refunds-detail-2">Ghi chú xử lý<BsForm.Control as="textarea" className={fieldClass} required minLength={10} maxLength={1000} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></BsForm.Label>
  </>;
}

export default function AdminRefunds() {
  const [params] = useSearchParams();
  return <RefundWorkspace key={params.toString()} params={params} />;
}

function RefundWorkspace({ params }) {
  const [orderId, setOrderId] = useState(params.get('orderId') || '');
  const [receiptId, setReceiptId] = useState(params.get('receiptId') || '');
  const excess = Boolean(params.get('receiptId'));
  const [caseId, setCaseId] = useState(params.get('caseId') || '');
  const [form, setForm] = useState(() => ({ reference: '', amount: '', occurredAt: localTime(), evidence: '', note: '' }));
  const refresh = useRefreshCommerce();
  const finance = useAccountQuery({ queryKey: ['order-finance', orderId], queryFn: () => afterSalesApi.finance(orderId), enabled: !excess && isUuid(orderId) });
  const receipt = useAccountQuery({ queryKey: ['bank-receipts', receiptId], queryFn: () => paymentApi.getReceipt(receiptId), enabled: excess && isUuid(receiptId) });
  const cases = useAccountQuery({ queryKey: ['after-sales', 'refund-picker', orderId], queryFn: () => afterSalesApi.list('admin', { orderId, limit: 100 }), enabled: !excess && isUuid(orderId) });
  const refund = useMutation({ mutationFn: (payload) => afterSalesApi.refund(payload), onSuccess: () => {
    refresh(); setForm({ reference: '', amount: '', occurredAt: localTime(), evidence: '', note: '' }); toast.success('Đã lưu chứng từ hoàn tiền');
  } });
  const source = excess ? 'receipt_excess' : finance.data?.paymentMethod === 'cod' ? 'cod_order' : 'bank_order';
  const ready = excess ? Boolean(receipt.data && !receipt.isError) : Boolean(finance.data && !finance.isError);
  return <div className="admin-refunds-detail-3">
    <h1 className="fs-4 fw-bold">Ghi nhận hoàn tiền</h1>
    <p className="booking-small text-secondary">Chỉ lưu sau khi đã thực hiện hoàn tiền và kiểm tra chứng từ. Màn hình này lưu kết quả; việc chuyển tiền được thực hiện qua ngân hàng hoặc kênh thanh toán bên ngoài.</p>
    <Link to="/admin/returns" className="d-inline-flex align-items-center booking-small text-success text-decoration-underline admin-refunds-detail-4">Xem yêu cầu đổi trả và khiếu nại</Link>
    <section className="rounded-3 border p-4 admin-refunds-detail-5">
      <BsForm.Label className="d-block booking-small">{excess ? 'Mã giao dịch nhận tiền cần hoàn phần chưa phân bổ' : 'Mã đơn hàng đầy đủ'}<BsForm.Control className={fieldClass} value={excess ? receiptId : orderId} onChange={(e) => { refund.reset(); if (excess) setReceiptId(e.target.value); else { setOrderId(e.target.value); setReceiptId(''); setCaseId(''); } }} /></BsForm.Label>
      {(finance.isFetching || receipt.isFetching) && <p role="status" className="booking-small">Đang kiểm tra số dư…</p>}
      {(finance.isError || receipt.isError) && <p role="alert" className="booking-small text-danger">Không thể tải nguồn tiền. <BsButton variant="outline-primary" type="submit" className="text-decoration-underline admin-refunds-detail-6" onClick={() => excess ? receipt.refetch() : finance.refetch()}>Thử lại</BsButton></p>}
      {finance.data?.legacyUnverified && <p role="alert" className="rounded-3 bg-warning-subtle p-2 booking-small">Đơn cũ chưa có chứng từ nhận tiền. Cần đối chiếu sao kê trước; số dư cũ không được dùng để tự tạo khoản hoàn.</p>}
      {receipt.data && <p className="booking-small">{receipt.data.reference} · Thực nhận {formatVnd(receipt.data.amount)} · Đã hoàn {formatVnd(receipt.data.refundedAmount)} · Phần chưa phân bổ có thể hoàn {formatVnd(receipt.data.unappliedAmount)}</p>}
      {finance.data?.cod && <p className="booking-small">Đã thu hộ {formatVnd(finance.data.cod.collectedAmount)} · Đã chuyển về {formatVnd(finance.data.cod.remittedAmount)} · Có thể hoàn {formatVnd(finance.data.cod.refundableAmount)}</p>}
      {ready && <BsForm className="d-grid gap-4 admin-refunds-detail-7" onSubmit={(e) => { e.preventDefault(); refund.mutate({ ...form, amount: Number(form.amount), occurredAt: new Date(form.occurredAt).toISOString(), source, orderId: excess ? undefined : orderId, receiptId: source === 'cod_order' ? undefined : receiptId, caseId: excess ? undefined : caseId || undefined }); }}>
        {!excess && source === 'bank_order' && <BsForm.Label className="booking-small layout-span-md-2 admin-refunds-detail-8">Chứng từ nhận tiền dùng để hoàn<BsForm.Select aria-label="Chứng từ nhận tiền dùng để hoàn" required className={fieldClass} value={receiptId} onChange={(e) => setReceiptId(e.target.value)}><option value="">Chọn nguồn tiền</option>{finance.data.sources.map((entry) => <option key={entry.receiptId} value={entry.receiptId} disabled={entry.refundableAmount <= 0}>{entry.reference} · còn {formatVnd(entry.refundableAmount)}</option>)}</BsForm.Select></BsForm.Label>}
        {!excess && <BsForm.Label className="booking-small layout-span-md-2 admin-refunds-detail-9">Yêu cầu đã được duyệt<BsForm.Select aria-label="Yêu cầu đã được duyệt" className={fieldClass} value={caseId} onChange={(e) => setCaseId(e.target.value)}><option value="">Hoàn tiền để đóng đơn chưa giao / đơn đã hủy</option>{cases.data?.items.filter((claim) => (claim.kind === 'return_refund' && claim.status === 'received') || (claim.kind === 'complaint' && claim.status === 'approved')).map((claim) => <option key={claim.id} value={claim.id}>#{claim.id.slice(0, 8)} · còn {formatVnd(Number(claim.approvedAmount) - claim.refundedAmount)}</option>)}</BsForm.Select></BsForm.Label>}
        {!excess && ['pending', 'confirmed', 'packing'].includes(finance.data.status) && <p className="booking-small text-warning layout-span-md-2 admin-refunds-detail-10">Ghi nhận khoản hoàn cho đơn chưa giao sẽ hủy đơn và hoàn tồn trong cùng giao dịch.</p>}
        <MoneyFactFields form={form} setForm={setForm} />
        {refund.isError && <p role="alert" className="booking-small text-danger layout-span-md-2 admin-refunds-detail-11">{refund.error.response?.data?.message || 'Chưa xác định kết quả. Thử lại cùng mã và nội dung chứng từ.'}</p>}
        <BsButton variant="outline-primary" type="submit" disabled={refund.isPending || finance.isFetching || receipt.isFetching} className={buttonClass}>{refund.isPending ? 'Đang lưu…' : 'Lưu chứng từ hoàn tiền'}</BsButton>
      </BsForm>}
    </section>
    <section className="rounded-3 border p-4 admin-refunds-detail-12"><h2 className="fs-5 fw-semibold">Các khoản hoàn đã ghi nhận</h2>{(excess ? receipt.data?.refunds : finance.data?.refunds)?.map((row) => <article key={row.id} className="text-break border-top pt-2 booking-small admin-refunds-detail-13"><strong>{row.reference} · {formatVnd(row.amount)}</strong><p>{new Date(row.occurredAt).toLocaleString('vi-VN')}</p><p>{row.evidence}</p><p>{row.note}</p></article>)}</section>
  </div>;
}

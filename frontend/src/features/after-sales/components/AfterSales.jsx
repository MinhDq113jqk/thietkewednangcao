import { Form as BsForm, Button as BsButton } from 'react-bootstrap';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { useRefreshCommerce } from '../../../hooks/useRefreshCommerce';
import { useAccountQuery } from '../../../hooks/useAccountQuery';
import afterSalesApi from '../api/afterSalesApi';
import { formatVnd } from '../../../utils/format';
import { toast } from '../../../components/ui/toastStore';

export const fieldClass = "mt-1 d-block w-100 rounded-3 border border-secondary px-2 py-2 booking-small after-sales-detail-1";
export const buttonClass = "rounded-3 bg-success px-3 py-2 booking-small fw-semibold after-sales-detail-2";
const kindLabels = { return_refund: 'Trả hàng và hoàn tiền', exchange: 'Đổi cùng sản phẩm', complaint: 'Khiếu nại' };
const statusLabels = { requested: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Đã từ chối', received: 'Đã nhận hàng hoàn', resolved: 'Đã xử lý xong' };
const actionLabels = { approve: 'Duyệt yêu cầu', reject: 'Từ chối yêu cầu', receive: 'Nhận hàng hoàn', resolve: 'Kết thúc xử lý', requested: 'Gửi yêu cầu', refund_recorded: 'Ghi nhận hoàn tiền' };

export function RequestAfterSales({ order }) {
  const refresh = useRefreshCommerce();
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const [kind, setKind] = useState(order.status === 'delivered' ? 'return_refund' : 'complaint');
  const [quantities, setQuantities] = useState({});
  const [reason, setReason] = useState('');
  const [evidence, setEvidence] = useState('');
  const [amount, setAmount] = useState('');
  const create = useMutation({ mutationFn: (payload) => afterSalesApi.create(order.id, payload), onSuccess: () => {
    refresh(); setRequestKey(crypto.randomUUID()); setReason(''); setEvidence(''); setQuantities({}); setAmount(''); toast.success('Đã gửi yêu cầu');
  } });
  const eligible = ['shipping', 'delivered', 'returned'].includes(order.status);
  return <section className="rounded-3 border border-secondary p-4 after-sales-detail-3" aria-label="Đổi trả và khiếu nại">
    <h2 className="fs-5 fw-semibold">Đổi trả và khiếu nại</h2>
    {eligible && <BsForm className="after-sales-detail-4" onSubmit={(e) => { e.preventDefault(); create.mutate({ requestKey, kind, reason, evidence: evidence.split('\n').map((v) => v.trim()).filter(Boolean), requestedAmount: kind === 'exchange' ? 0 : Number(amount || 0), lines: order.items.filter((item) => Number(quantities[item.id]) > 0).map((item) => ({ orderItemId: item.id, quantity: Number(quantities[item.id]) })) }); }}>
      <p className="booking-small text-secondary">Chọn sản phẩm, số lượng và mô tả bằng chứng. Hàng đổi là cùng sản phẩm, cùng số lượng; cửa hàng ghi vận đơn riêng khi gửi lại.</p>
      <BsForm.Label className="d-block booking-small">Loại yêu cầu<BsForm.Select aria-label="Loại yêu cầu" className={fieldClass} value={kind} onChange={(e) => setKind(e.target.value)}>
        {Object.entries(kindLabels).filter(([key]) => order.status === 'delivered' || key === 'complaint').map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </BsForm.Select></BsForm.Label>
      <fieldset className="after-sales-detail-5"><legend className="booking-small fw-semibold">Sản phẩm cần xử lý</legend>{order.items.map((item) => <BsForm.Label key={item.id} className="d-flex align-items-center justify-content-between gap-3 booking-small"><span>{item.name} · {item.variantName} {item.sku} (đã mua {item.quantity})</span><BsForm.Control aria-label={`Số lượng ${item.name}`} type="number" min="0" max={item.quantity} step="1" value={quantities[item.id] || ''} onChange={(e) => setQuantities({ ...quantities, [item.id]: e.target.value })} className={`${fieldClass} after-sales-detail-6`} /></BsForm.Label>)}</fieldset>
      {kind !== 'exchange' && <BsForm.Label className="d-block booking-small">Số tiền đề nghị hoàn (VND){kind === 'complaint' && <span className="text-secondary"> — nhập 0 nếu chỉ cần hỗ trợ</span>}<BsForm.Control required type="number" step="1" min={kind === 'complaint' ? 0 : 1} max={Number(order.total) + Number(order.shippingFee || 0)} value={amount} onChange={(e) => setAmount(e.target.value)} className={fieldClass} /></BsForm.Label>}
      <BsForm.Label className="d-block booking-small">Lý do<BsForm.Control as="textarea" className={fieldClass} required minLength={10} maxLength={2000} value={reason} onChange={(e) => setReason(e.target.value)} /></BsForm.Label>
      <BsForm.Label className="d-block booking-small">Bằng chứng (mỗi dòng một mô tả hoặc mã tham chiếu)<BsForm.Control as="textarea" className={fieldClass} required minLength={5} maxLength={5000} rows={3} value={evidence} onChange={(e) => setEvidence(e.target.value)} /><span className="mt-1 d-block booking-caption text-secondary">Tối đa 5 mục. Nội dung chỉ hiển thị cho bạn, cửa hàng và quản trị viên. Không nhập mật khẩu hoặc thông tin thẻ.</span></BsForm.Label>
      {create.isError && <p role="alert" className="booking-small text-danger">{create.error.response?.data?.message || 'Không thể gửi. Thử lại với cùng nội dung.'}</p>}
      <BsButton variant="outline-primary" type="submit" disabled={create.isPending} className={buttonClass}>{create.isPending ? 'Đang gửi…' : 'Gửi yêu cầu'}</BsButton>
    </BsForm>}
    <AfterSalesList mode="buyer" orderId={order.id} />
  </section>;
}

function CaseActions({ claim, mode }) {
  const refresh = useRefreshCommerce();
  const [action, setAction] = useState('');
  const [note, setNote] = useState('');
  const [approvedAmount, setApprovedAmount] = useState(claim.requestedAmount);
  const [inspection, setInspection] = useState({});
  const [carrier, setCarrier] = useState('');
  const [trackingCode, setTrackingCode] = useState('');
  const update = useMutation({ mutationFn: (payload) => afterSalesApi.update(mode, claim.id, payload), onSuccess: () => { refresh(); setAction(''); setNote(''); toast.success('Đã cập nhật yêu cầu'); } });
  const actions = claim.status === 'requested' ? ['approve', 'reject'] : claim.status === 'approved' ? (claim.kind === 'complaint' ? ['resolve'] : ['receive']) : claim.status === 'received' ? ['resolve'] : [];
  return <div className="mt-3 after-sales-detail-7">
    <div className="d-flex flex-wrap gap-2">{actions.map((key) => <BsButton variant="outline-primary" key={key} type="button" className="px-2 booking-small after-sales-detail-8" onClick={() => { update.reset(); setAction(key); }}>{key === 'resolve' && claim.kind === 'exchange' ? 'Gửi hàng đổi' : actionLabels[key]}</BsButton>)}
      {mode === 'admin' && Number(claim.approvedAmount) > claim.refundedAmount && ['approved', 'received'].includes(claim.status) && claim.kind !== 'exchange' && <Link className="d-inline-flex align-items-center px-2 booking-small fw-semibold text-success text-decoration-underline after-sales-detail-9" to={`/admin/refunds?orderId=${claim.orderId}&caseId=${claim.id}`}>Ghi nhận hoàn tiền</Link>}
    </div>
    {action && <BsForm className="rounded-3 bg-secondary-subtle p-3 after-sales-detail-10" onSubmit={(e) => { e.preventDefault(); update.mutate({ action, note, approvedAmount: Number(approvedAmount), carrier, trackingCode, lines: claim.lines.map((line) => ({ orderItemId: line.orderItemId, restock: inspection[line.orderItemId] === 'yes' })) }); }}>
      <h4 className="fw-semibold">{actionLabels[action]}</h4>
      {action === 'approve' && claim.kind !== 'exchange' && <BsForm.Label className="d-block booking-small">Số tiền duyệt hoàn (VND)<BsForm.Control required min={claim.kind === 'complaint' ? 0 : 1} max={claim.requestedAmount} type="number" step="1" value={approvedAmount} onChange={(e) => setApprovedAmount(e.target.value)} className={fieldClass} /></BsForm.Label>}
      {action === 'receive' && claim.lines.map((line) => <BsForm.Label key={line.id} className="d-block booking-small">{line.item.name} · {line.item.variantName} {line.item.sku} × {line.quantity}<BsForm.Select required className={fieldClass} value={inspection[line.orderItemId] || ''} onChange={(e) => setInspection({ ...inspection, [line.orderItemId]: e.target.value })}><option value="">Kết quả kiểm hàng</option><option value="yes">Có thể bán lại — hoàn tồn</option><option value="no">Hư hỏng — không hoàn tồn</option></BsForm.Select></BsForm.Label>)}
      {action === 'resolve' && claim.kind === 'exchange' && <><BsForm.Label className="d-block booking-small">Đơn vị vận chuyển hàng đổi<BsForm.Control className={fieldClass} required minLength={2} maxLength={100} value={carrier} onChange={(e) => setCarrier(e.target.value)} /></BsForm.Label><BsForm.Label className="d-block booking-small">Mã vận đơn hàng đổi<BsForm.Control className={fieldClass} required minLength={3} maxLength={120} value={trackingCode} onChange={(e) => setTrackingCode(e.target.value)} /></BsForm.Label></>}
      <BsForm.Label className="d-block booking-small">Ghi chú xử lý<BsForm.Control as="textarea" required minLength={10} maxLength={1000} className={fieldClass} value={note} onChange={(e) => setNote(e.target.value)} /></BsForm.Label>
      {update.isError && <p role="alert" className="booking-small text-danger">{update.error.response?.data?.message || 'Không thể cập nhật yêu cầu. Tải lại để kiểm tra.'}</p>}
      <BsButton variant="outline-primary" type="submit" disabled={update.isPending} className={buttonClass}>{update.isPending ? 'Đang lưu…' : 'Lưu xử lý'}</BsButton><BsButton variant="outline-primary" disabled={update.isPending} type="button" className="ms-2 px-2 booking-small after-sales-detail-11" onClick={() => setAction('')}>Đóng</BsButton>
    </BsForm>}
  </div>;
}

export function AfterSalesList({ mode, orderId }) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const query = useAccountQuery({ queryKey: ['after-sales', mode, orderId || '', status, page], queryFn: () => afterSalesApi.list(mode, { orderId, status: status || undefined, page }), refetchInterval: 30_000 });
  return <div className="after-sales-detail-12" aria-busy={query.isLoading}>
    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3"><p className="booking-small text-secondary">Thời hạn gửi yêu cầu sau khi giao: {query.data?.returnWindowDays || '…'} ngày.</p><BsForm.Label className="booking-small">Lọc yêu cầu<BsForm.Select aria-label="Lọc yêu cầu" className={fieldClass} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">Tất cả</option>{Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</BsForm.Select></BsForm.Label></div>
    {query.isLoading && <p role="status" className="py-3 booking-small">Đang tải yêu cầu…</p>}
    {query.isError && <p role="alert" className="booking-small text-danger">Không thể tải yêu cầu. <BsButton variant="outline-primary" type="submit" className="text-decoration-underline after-sales-detail-13" onClick={() => query.refetch()}>Thử lại</BsButton></p>}
    {query.data?.items.map((claim) => <article key={claim.id} className="rounded-3 border border-secondary p-3 after-sales-detail-14" aria-label={`Yêu cầu ${claim.id.slice(0, 8)}`}>
      <header className="d-flex flex-wrap justify-content-between gap-2"><h3 className="fw-semibold">{kindLabels[claim.kind]} · #{claim.id.slice(0, 8)}</h3><strong className="booking-small text-success">{statusLabels[claim.status]}</strong></header>
      <p className="booking-caption text-secondary after-sales-detail-15">Đơn {claim.orderId}</p>
      <p className="text-break booking-small after-sales-detail-16">{claim.reason}</p>
      <ul className="booking-small after-sales-detail-17">{claim.lines.map((line) => <li key={line.id}>{line.item.name} × {line.quantity}{line.restock != null && (line.restock ? ' · Đã hoàn tồn' : ' · Không thể bán lại')}</li>)}</ul>
      <p className="booking-small">Đề nghị {formatVnd(claim.requestedAmount)} · Duyệt {formatVnd(claim.approvedAmount)} · Đã hoàn {formatVnd(claim.refundedAmount)}</p>
      <details className="booking-small"><summary className="py-2 fw-medium after-sales-detail-18">Bằng chứng và lịch sử xử lý</summary><ul className="text-break after-sales-detail-19">{claim.evidence.map((entry, i) => <li key={i} className="after-sales-detail-20">{entry}</li>)}{claim.history.map((entry, i) => <li key={i} className="border-top pt-2"><span className="text-secondary">{new Date(entry.at).toLocaleString('vi-VN')} · {actionLabels[entry.action] || entry.action}</span><p className="after-sales-detail-21">{entry.note}</p></li>)}</ul></details>
      {claim.replacement && <p className="booking-small fw-medium after-sales-detail-22">Hàng đổi đã gửi qua {claim.replacement.carrier} · Vận đơn {claim.replacement.trackingCode}</p>}
      {mode !== 'buyer' && <CaseActions key={`${claim.id}-${claim.status}`} claim={claim} mode={mode} />}
    </article>)}
    {!query.isLoading && !query.isError && !query.data?.items.length && <p className="py-4 booking-small text-secondary">Chưa có yêu cầu phù hợp.</p>}
    <div className="d-flex justify-content-between gap-3 booking-small"><BsButton variant="outline-primary" type="submit" className="px-2 after-sales-detail-23" disabled={page <= 1} onClick={() => setPage(page - 1)}>Trang trước</BsButton><span className="py-2">Trang {page} / {query.data?.totalPages || 1}</span><BsButton variant="outline-primary" type="submit" className="px-2 after-sales-detail-24" disabled={!query.data || page >= query.data.totalPages} onClick={() => setPage(page + 1)}>Trang sau</BsButton></div>
  </div>;
}

export function AfterSalesPage({ mode }) {
  const [params] = useSearchParams();
  return <div className="after-sales-detail-25"><h1 className="fs-4 fw-bold">Đổi trả và khiếu nại</h1><p className="booking-small text-secondary">Duyệt yêu cầu, kiểm hàng trả về và theo dõi khoản hoàn đã ghi nhận.</p><AfterSalesList mode={mode} orderId={params.get('orderId') || undefined} /></div>;
}

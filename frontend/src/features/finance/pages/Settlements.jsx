import { Button as BsButton, Form as BsForm } from 'react-bootstrap';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import settlementApi from '../api/settlementApi';
import { useAccountQuery } from '../../../hooks/useAccountQuery';
import { useRefreshCommerce } from '../../../hooks/useRefreshCommerce';
import { fieldClass, buttonClass } from '../../after-sales/components/AfterSales';
import { MoneyFactFields } from '../../admin/pages/AdminRefunds';
import { localTime } from '../../../utils/commerceForm';
import { formatVnd } from '../../../utils/format';

const kinds = { sale: 'Tiền hàng', commission: 'Hoa hồng', carrier_fee: 'Phí COD bổ sung', refund: 'Hoàn tiền', commission_refund: 'Hoàn hoa hồng', adjustment: 'Điều chỉnh' };
const states = { draft: 'Chờ chi trả', paid: 'Đã chi trả', cancelled: 'Đã hủy' };
const date = (value) => new Date(value).toLocaleString('vi-VN');
function Pager({ page, totalPages = 1, onChange, label }) {
  return <nav aria-label={label} className="d-flex align-items-center justify-content-between gap-2 booking-small">
    <BsButton variant="outline-primary" type="submit" title="Trang trước" aria-label={`${label}: trang trước`} className="d-flex align-items-center justify-content-center settlements-detail-1" disabled={page <= 1} onClick={() => onChange(page - 1)}><ChevronLeft size={18} /></BsButton>
    <span>Trang {page} / {totalPages}</span>
    <BsButton variant="outline-primary" type="submit" title="Trang sau" aria-label={`${label}: trang sau`} className="d-flex align-items-center justify-content-center settlements-detail-2" disabled={page >= totalPages} onClick={() => onChange(page + 1)}><ChevronRight size={18} /></BsButton>
  </nav>;
}
function QueryState({ query }) {
  if (query.isLoading) return <p role="status">Đang tải quyết toán...</p>;
  if (query.isError) return <p role="alert" className="booking-small text-danger">{query.error.response?.data?.message || 'Không thể tải quyết toán.'} <BsButton variant="outline-primary" type="submit" className="text-decoration-underline settlements-detail-3" onClick={() => query.refetch()}>Thử lại</BsButton></p>;
  return null;
}
function MutationState({ mutation }) {
  return <>{mutation.isError && <p role="alert" className="booking-small text-danger layout-span-md-2 settlements-detail-4">{mutation.error.response?.data?.message || 'Chưa xác định kết quả. Thử lại với cùng nội dung và mã chứng từ.'}</p>}
    {mutation.isSuccess && <p role="status" className="booking-small text-success layout-span-md-2 settlements-detail-5">Đã ghi nhận thành công.</p>}</>;
}
function LedgerRows({ items, mode }) {
  return <div className="settlements-detail-6" role="list" aria-label="Bút toán quyết toán">{items.map((entry) => <article role="listitem" key={entry.id} className="d-grid gap-2 py-2 booking-small settlements-detail-7">
    <div className="settlements-detail-8"><strong>{kinds[entry.kind]}</strong><p>{date(entry.effectiveAt)}</p>
      <Link className="text-success text-decoration-underline settlements-detail-9" to={mode === 'admin' ? `/admin/refunds?orderId=${entry.orderId}` : `/seller/orders?orderId=${entry.orderId}`}>Đơn {entry.orderId}</Link>
      <p className="text-break">{entry.note}</p><p className="text-secondary settlements-detail-10">{entry.metadata?.reference || entry.sourceKey}</p>
      {entry.metadata?.commissionBps != null && <p>Hoa hồng {entry.metadata.commissionBps / 100}% · Hết giữ tiền {date(entry.availableAt)}</p>}
      {entry.evidence && <p className="text-break">{entry.evidence}</p>}
    </div><strong className={`text-nowrap text-sm-end ${Number(entry.amount) < 0 ? "text-danger" : "text-success"}`}>{formatVnd(entry.amount)}</strong>
  </article>)}</div>;
}

export default function Settlements({ mode }) {
  const [shopId, setShopId] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [shopPage, setShopPage] = useState(1);
  const shops = useAccountQuery({ queryKey: ['settlement-shops', search, shopPage], queryFn: () => settlementApi.shops({ search, page: shopPage }), enabled: mode === 'admin' });
  return <div className="settlements-detail-11">
    <h1 className="fs-4 fw-bold">Quyết toán người bán</h1>
    <p className="booking-small text-secondary">Tiền hàng cần đủ chứng từ thu tiền, hết thời hạn giữ và không còn yêu cầu đang xử lý để được chi trả.{mode === 'admin' && ' Thực hiện chuyển tiền qua ngân hàng và đối chiếu người nhận trước khi lưu chứng từ chi trả.'}</p>
    {mode === 'admin' && <section className="border-bottom pb-4 settlements-detail-12">
      <BsForm className="d-flex flex-wrap align-items-end gap-3" onSubmit={(e) => { e.preventDefault(); setSearch(searchInput.trim()); setShopPage(1); setShopId(''); }}>
        <BsForm.Label className="flex-grow-1 booking-small settlements-detail-13">Tên gian hàng<BsForm.Control className={fieldClass} maxLength={150} value={searchInput} onChange={(e) => setSearchInput(e.target.value)} /></BsForm.Label>
        <BsButton variant="outline-primary" type="submit" className={buttonClass}>Tìm gian hàng</BsButton>
      </BsForm>
      <QueryState query={shops} />
      {!shops.isError && <BsForm.Label className="d-block booking-small">Gian hàng<BsForm.Select aria-label="Gian hàng" className={fieldClass} value={shopId} onChange={(e) => setShopId(e.target.value)}><option value="">Chọn gian hàng</option>{shops.data?.items.map((shop) => <option key={shop.id} value={shop.id}>{shop.name}</option>)}</BsForm.Select></BsForm.Label>}
      {shops.data?.total === 0 && <p className="booking-small">Không tìm thấy gian hàng.</p>}
      {(shops.data?.totalPages > 1) && <Pager label="Gian hàng" page={shopPage} totalPages={shops.data.totalPages} onChange={(value) => { setShopPage(value); setShopId(''); }} />}
    </section>}
    {(mode === 'seller' || shopId) && <Statement key={`${mode}:${shopId}`} mode={mode} shopId={shopId} />}
  </div>;
}

function Statement({ mode, shopId }) {
  const [ledgerPage, setLedgerPage] = useState(1);
  const [periodPage, setPeriodPage] = useState(1);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const refresh = useRefreshCommerce();
  const query = useAccountQuery({ queryKey: ['settlements', mode, shopId, ledgerPage, periodPage], queryFn: () => settlementApi.statement(mode, shopId, { ledgerPage, periodPage }), refetchInterval: 30000 });
  const sync = useMutation({ mutationFn: () => settlementApi.sync(shopId), onSuccess: refresh });
  const data = query.data;
  return <div className="settlements-detail-14">
    <QueryState query={query} />
    {data && !query.isError && <>
      <header className="d-flex flex-wrap align-items-center justify-content-between gap-3"><h2 className="text-break fs-5 fw-semibold">{data.shop.name}</h2>
        {mode === 'admin' && <BsButton variant="outline-primary" type="submit" className={buttonClass} disabled={sync.isPending} onClick={() => sync.mutate()}><RefreshCw size={16} aria-hidden className="me-2 d-inline" />{sync.isPending ? 'Đang ghi sổ...' : 'Cập nhật sổ giao dịch'}</BsButton>}
      </header>
      <MutationState mutation={sync} />
      {sync.data && <p role="status" className="booking-small">Đã kiểm tra. Chưa đủ chứng từ: {sync.data.skipped.unverified} đơn; chưa có xác nhận giao hàng: {sync.data.skipped.undelivered} đơn.</p>}
      <dl className="d-grid gap-4 border-top border-bottom py-3 booking-small settlements-detail-15">
        {[['Tổng ghi sổ ròng', data.summary.ledgerAmount], ['Đã chi trả', data.summary.paidAmount], ['Còn phải trả (ròng)', data.summary.outstanding], ['Có thể lập kỳ', data.summary.available], ['Đang giữ lại', data.summary.heldAmount], ['Đã lập kỳ chờ trả', data.summary.reserved], ['Nợ chuyển kỳ sau', data.summary.carryDebt]].map(([label, value]) => <div key={label} className="settlements-detail-16"><dt className="text-secondary">{label}</dt><dd className="text-break pt-1 fw-semibold">{formatVnd(value)}</dd></div>)}
      </dl>
      <p className="booking-small">{data.policy ? `Hoa hồng hiện tại: ${data.policy.commissionBps / 100}% tiền hàng. ${data.policy.note}` : 'Chưa xác nhận chính sách hoa hồng.'}</p>
      {mode === 'admin' && <AdminActions shopId={shopId} policy={data.policy} />}
      <section className="settlements-detail-17" aria-label="Các kỳ quyết toán"><h2 className="fs-5 fw-semibold">Kỳ quyết toán</h2>
        {!data.periods.items.length && <p className="booking-small text-secondary">Chưa có kỳ quyết toán.</p>}
        <div className="settlements-detail-18">{data.periods.items.map((period) => <article className="py-3 booking-small settlements-detail-19" aria-label={`Kỳ ${period.id.slice(0, 8)}`} key={period.id}>
          <header className="d-flex flex-wrap justify-content-between gap-2"><strong>#{period.id.slice(0, 8)} · {states[period.status]}</strong><strong>{formatVnd(period.amount)}</strong></header>
          <p>Chốt đến {date(period.cutoffAt)}</p><p className="text-break">{period.note}</p>
          {period.payout && <p className="settlements-detail-20">Chứng từ {period.payout.reference} · {date(period.payout.occurredAt)}</p>}
          <BsButton variant="outline-primary" type="submit" className="px-3 settlements-detail-21" onClick={() => setSelectedPeriod(period.id)}>Xem kỳ quyết toán</BsButton>
        </article>)}</div>
        <Pager label="Kỳ quyết toán" page={periodPage} totalPages={data.periods.totalPages} onChange={setPeriodPage} />
      </section>
      {selectedPeriod && <PeriodDetail key={selectedPeriod} id={selectedPeriod} mode={mode} onClose={() => setSelectedPeriod(null)} />}
      <section className="border-top pt-4 settlements-detail-22"><h2 className="fs-5 fw-semibold">Sổ giao dịch</h2>
        {!data.ledger.items.length && <p className="booking-small text-secondary">Chưa có bút toán.</p>}
        <LedgerRows items={data.ledger.items} mode={mode} />
        <Pager label="Sổ giao dịch" page={ledgerPage} totalPages={data.ledger.totalPages} onChange={setLedgerPage} />
      </section>
    </>}
  </div>;
}

function AdminActions({ shopId, policy }) {
  const [tab, setTab] = useState('period');
  return <section className="border-top border-bottom py-4 settlements-detail-23">
    <div role="tablist" aria-label="Nghiệp vụ quyết toán" className="d-flex flex-wrap gap-2">{[['period', 'Lập kỳ'], ['policy', 'Hoa hồng'], ['adjust', 'Điều chỉnh']].map(([value, label]) => <BsButton variant="outline-primary" type="submit" key={value} role="tab" aria-selected={tab === value} aria-controls="settlement-action" className={`rounded border px-3 booking-small settlements-detail-26 ${tab === value ? "bg-secondary settlements-detail-24" : "settlements-detail-25"}`} onClick={() => setTab(value)}>{label}</BsButton>)}</div>
    <div role="tabpanel" id="settlement-action"><ActionForm key={tab} tab={tab} shopId={shopId} policy={policy} /></div>
  </section>;
}
function ActionForm({ tab, shopId, policy }) {
  const [form, setForm] = useState(() => ({ reference: '', amount: '', occurredAt: localTime(), evidence: '', note: '', orderId: '', direction: 'debit', commissionPercent: policy ? String(policy.commissionBps / 100) : '', cutoffAt: localTime(), requestKey: crypto.randomUUID() }));
  const refresh = useRefreshCommerce();
  const mutation = useMutation({ mutationFn: (payload) => tab === 'period' ? settlementApi.create(shopId, payload) : tab === 'policy' ? settlementApi.policy(shopId, payload) : settlementApi.adjust(shopId, payload), onSuccess: () => { refresh(); if (tab === 'period') setForm((old) => ({ ...old, requestKey: crypto.randomUUID() })); } });
  const field = (name, label, props = {}) => <BsForm.Label className="d-block booking-small">{label}<BsForm.Control className={fieldClass} value={form[name]} required onChange={(e) => { mutation.reset(); setForm({ ...form, [name]: e.target.value }); }} {...props} /></BsForm.Label>;
  return <BsForm className="d-grid gap-4 settlements-detail-27" onSubmit={(e) => { e.preventDefault(); mutation.mutate(tab === 'period' ? { requestKey: form.requestKey, cutoffAt: new Date(form.cutoffAt).toISOString(), note: form.note } : tab === 'policy' ? { commissionBps: Math.round(Number(form.commissionPercent) * 100), note: form.note } : { ...form, amount: Number(form.amount), occurredAt: new Date(form.occurredAt).toISOString() }); }}>
    {tab === 'period' && field('cutoffAt', 'Chốt giao dịch đến thời điểm', { type: 'datetime-local', step: 1 })}
    {tab === 'policy' && <>{field('commissionPercent', 'Hoa hồng tiền hàng (%)', { type: 'number', min: 0, max: 100, step: 0.01 })}<p className="booking-small text-secondary">Áp dụng cho đơn chưa ghi sổ. Các bút toán đã ghi giữ mức hoa hồng cũ.</p></>}
    {tab === 'adjust' ? <>
      {field('orderId', 'Mã đơn cần điều chỉnh', { pattern: '[a-fA-F0-9-]{36}' })}
      <BsForm.Label className="booking-small">Chiều điều chỉnh<BsForm.Select aria-label="Chiều điều chỉnh" className={fieldClass} value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })}><option value="debit">Giảm số dư</option><option value="credit">Tăng số dư</option></BsForm.Select></BsForm.Label>
      <MoneyFactFields form={form} setForm={setForm} />
    </> : <BsForm.Label className="booking-small layout-span-md-2 settlements-detail-28">{tab === 'policy' ? 'Căn cứ thỏa thuận hoa hồng' : 'Ghi chú kỳ quyết toán'}<BsForm.Control as="textarea" className={fieldClass} required minLength={10} maxLength={1000} value={form.note} onChange={(e) => { mutation.reset(); setForm({ ...form, note: e.target.value }); }} /></BsForm.Label>}
    <MutationState mutation={mutation} />
    <BsButton variant="outline-primary" type="submit" disabled={mutation.isPending} className={buttonClass}>{mutation.isPending ? 'Đang lưu...' : tab === 'period' ? 'Lập kỳ quyết toán' : tab === 'policy' ? 'Xác nhận hoa hồng' : 'Ghi nhận điều chỉnh'}</BsButton>
  </BsForm>;
}

function PeriodDetail({ id, mode, onClose }) {
  const [page, setPage] = useState(1);
  const query = useAccountQuery({ queryKey: ['settlement-period', mode, id, page], queryFn: () => settlementApi.period(mode, id, { page }), refetchInterval: 30000 });
  const data = query.data;
  return <section aria-label="Chi tiết kỳ quyết toán" className="border-top border-bottom py-4 settlements-detail-29">
    <header className="d-flex flex-wrap align-items-center justify-content-between gap-3"><h2 className="fs-5 fw-semibold">Chi tiết kỳ #{id.slice(0, 8)}</h2><BsButton variant="outline-primary" type="submit" className="px-3 booking-small settlements-detail-30" onClick={onClose}>Đóng chi tiết</BsButton></header>
    <QueryState query={query} />
    {data && !query.isError && <>
      <p className="fw-semibold">{states[data.period.status]} · {formatVnd(data.period.amount)}</p>
      <LedgerRows items={data.items} mode={mode} />
      <Pager label="Bút toán trong kỳ" page={page} totalPages={data.totalPages} onChange={setPage} />
      {data.payout && <dl className="text-break border-top pt-3 booking-small settlements-detail-31"><div><dt className="fw-semibold">Chứng từ chi trả</dt><dd className="settlements-detail-32">{data.payout.reference}</dd></div><div><dt>Người nhận trên chứng từ</dt><dd>{data.payout.beneficiary}</dd></div><div><dt>Bằng chứng</dt><dd>{data.payout.evidence}</dd></div><div><dt>Ghi chú</dt><dd>{data.payout.note}</dd></div></dl>}
      {data.period.closeNote && <p className="text-break booking-small">Kết thúc {date(data.period.closedAt)} · {data.period.closeNote}</p>}
      {mode === 'admin' && data.period.status === 'draft' && <ClosePeriod key={id} period={data.period} />}
    </>}
  </section>;
}
function ClosePeriod({ period }) {
  const [action, setAction] = useState('payout');
  const [form, setForm] = useState(() => ({ reference: '', amount: String(period.amount), occurredAt: localTime(), evidence: '', note: '', beneficiary: '' }));
  const [confirmed, setConfirmed] = useState(false);
  const refresh = useRefreshCommerce();
  const mutation = useMutation({ mutationFn: (payload) => action === 'payout' ? settlementApi.payout(period.id, payload) : settlementApi.cancel(period.id, payload), onSuccess: refresh });
  return <BsForm className="d-grid gap-4 border-top pt-3 settlements-detail-33" onSubmit={(e) => { e.preventDefault(); mutation.mutate(action === 'payout' ? { ...form, amount: Number(form.amount), occurredAt: new Date(form.occurredAt).toISOString() } : { note: form.note }); }}>
    <BsForm.Label className="booking-small layout-span-md-2 settlements-detail-34">Xử lý kỳ<BsForm.Select aria-label="Xử lý kỳ" className={fieldClass} value={action} onChange={(e) => { mutation.reset(); setAction(e.target.value); }}><option value="payout">Ghi nhận đã chi trả</option><option value="cancel">Hủy kỳ chưa chi trả</option></BsForm.Select></BsForm.Label>
    {action === 'payout' ? <><MoneyFactFields form={form} setForm={setForm} /><BsForm.Label className="booking-small layout-span-md-2 settlements-detail-35">Người nhận trên chứng từ<BsForm.Control className={fieldClass} required minLength={5} maxLength={200} value={form.beneficiary} onChange={(e) => setForm({ ...form, beneficiary: e.target.value })} /></BsForm.Label><BsForm.Label className="d-flex align-items-start gap-3 booking-small layout-span-md-2 settlements-detail-36"><BsForm.Check.Input className="mt-1 settlements-detail-37" type="checkbox" required checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /><span>Đã đối chiếu người nhận của gian hàng, số tiền và giao dịch chuyển tiền thành công.</span></BsForm.Label></>
      : <BsForm.Label className="booking-small layout-span-md-2 settlements-detail-38">Lý do hủy kỳ<BsForm.Control as="textarea" required minLength={10} maxLength={1000} className={fieldClass} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></BsForm.Label>}
    <MutationState mutation={mutation} />
    <BsButton variant="outline-primary" type="submit" disabled={mutation.isPending} className={buttonClass}>{mutation.isPending ? 'Đang lưu...' : action === 'payout' ? 'Lưu chứng từ chi trả' : 'Xác nhận hủy kỳ'}</BsButton>
  </BsForm>;
}

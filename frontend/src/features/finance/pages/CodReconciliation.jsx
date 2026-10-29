import { Form as BsForm, Button as BsButton } from 'react-bootstrap';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAccountQuery } from '../../../hooks/useAccountQuery';
import afterSalesApi from '../../after-sales/api/afterSalesApi';
import { fieldClass, buttonClass } from '../../after-sales/components/AfterSales';
import { MoneyFactFields } from '../../admin/pages/AdminRefunds';
import { useRefreshCommerce } from '../../../hooks/useRefreshCommerce';
import { localTime, isUuid } from '../../../utils/commerceForm';
import { formatVnd } from '../../../utils/format';
import { toast } from '../../../components/ui/toastStore';
import { orderStatusLabels } from '../../../utils/orderStatus';

const labels = { awaiting_collection: 'Chưa có chứng từ thu hộ', awaiting_remittance: 'Chờ chuyển tiền về', partially_remitted: 'Đã chuyển về một phần', reconciled: 'Đã đối soát đủ' };
export default function CodReconciliation({ mode }) {
  const [page, setPage] = useState(1);
  const [orderId, setOrderId] = useState('');
  const [kind, setKind] = useState('collection');
  const [shipment, setShipment] = useState({ carrier: '', trackingCode: '' });
  const [form, setForm] = useState(() => ({ reference: '', amount: '', fee: '0', occurredAt: localTime(), evidence: '', note: '' }));
  const refresh = useRefreshCommerce();
  const query = useAccountQuery({ queryKey: ['cod-orders', mode, page], queryFn: () => afterSalesApi.listCod(mode, { page }), refetchInterval: 30_000 });
  const finance = useAccountQuery({ queryKey: ['order-finance', orderId], queryFn: () => afterSalesApi.finance(orderId), enabled: mode === 'admin' && isUuid(orderId) });
  const record = useMutation({ mutationFn: (payload) => afterSalesApi.recordCod(orderId, payload), onSuccess: () => { refresh(); setForm({ reference: '', amount: '', fee: '0', occurredAt: localTime(), evidence: '', note: '' }); toast.success('Đã lưu chứng từ COD'); } });
  return <div className="cod-reconciliation-detail-1">
    <h1 className="fs-4 fw-bold">Giao vận và đối soát COD</h1>
    <p className="booking-small text-secondary">Theo dõi riêng việc giao hàng, thu hộ của đơn vị vận chuyển và tiền thực chuyển về. Phí và chênh lệch được giữ để đối chiếu chứng từ.</p>
    {mode === 'admin' && <section className="rounded-3 border p-4 cod-reconciliation-detail-2"><h2 className="fs-5 fw-semibold">Ghi nhận chứng từ COD</h2>
      <BsForm.Label className="d-block booking-small">Mã đơn hàng đầy đủ<BsForm.Control className={fieldClass} value={orderId} onChange={(e) => { record.reset(); setOrderId(e.target.value); }} /></BsForm.Label>
      {finance.isFetching && <p role="status" className="booking-small">Đang tải đối soát…</p>}
      {finance.isError && <p role="alert" className="booking-small text-danger">Không thể tải đơn. <BsButton variant="outline-primary" type="submit" className="text-decoration-underline cod-reconciliation-detail-3" onClick={() => finance.refetch()}>Thử lại</BsButton></p>}
      {finance.data && !finance.data.cod && <p role="alert" className="booking-small text-danger">Đơn này không sử dụng COD.</p>}
      {finance.data?.cod && !finance.isError && <><p className="booking-small">Tiền còn ở đơn vị vận chuyển: {formatVnd(finance.data.cod.pendingRemittance)}</p>
        <BsForm className="d-grid gap-4 cod-reconciliation-detail-4" onSubmit={(e) => { e.preventDefault(); record.mutate({ ...form, ...shipment, kind, fee: kind === 'collection' ? 0 : Number(form.fee), amount: Number(form.amount), occurredAt: new Date(form.occurredAt).toISOString() }); }}>
          {!finance.data.carrier && <BsForm.Label className="booking-small">Đơn vị vận chuyển trên chứng từ (bổ sung đơn cũ)<BsForm.Control className={fieldClass} required minLength={2} maxLength={100} value={shipment.carrier} onChange={(e) => setShipment({ ...shipment, carrier: e.target.value })} /></BsForm.Label>}
          {!finance.data.trackingCode && <BsForm.Label className="booking-small">Mã vận đơn trên chứng từ (bổ sung đơn cũ)<BsForm.Control className={fieldClass} required minLength={3} maxLength={120} value={shipment.trackingCode} onChange={(e) => setShipment({ ...shipment, trackingCode: e.target.value })} /></BsForm.Label>}
          <BsForm.Label className="booking-small layout-span-md-2 cod-reconciliation-detail-5">Loại chứng từ<BsForm.Select aria-label="Loại chứng từ" className={fieldClass} value={kind} onChange={(e) => setKind(e.target.value)}><option value="collection">Đơn vị vận chuyển đã thu hộ</option><option value="remittance">Tiền đã chuyển về theo sao kê</option></BsForm.Select></BsForm.Label>
          <MoneyFactFields form={form} setForm={setForm} includeFee={kind === 'remittance'} />
          {record.isError && <p role="alert" className="booking-small text-danger layout-span-md-2 cod-reconciliation-detail-6">{record.error.response?.data?.message || 'Không thể lưu. Kiểm tra và thử lại cùng mã chứng từ.'}</p>}
          <BsButton variant="outline-primary" type="submit" className={buttonClass} disabled={record.isPending || finance.isFetching}>{record.isPending ? 'Đang lưu…' : 'Lưu chứng từ COD'}</BsButton>
        </BsForm>
        <details><summary className="py-2 booking-small fw-semibold cod-reconciliation-detail-7">Lịch sử chứng từ COD</summary>{finance.data.codEntries.map((entry) => <article className="text-break border-top py-2 booking-small cod-reconciliation-detail-8" key={entry.id}><strong>{entry.reference} · {entry.kind === 'collection' ? 'Thu hộ' : 'Chuyển tiền về'} · {formatVnd(entry.amount)}</strong><p>Phí {formatVnd(entry.fee)} · {new Date(entry.occurredAt).toLocaleString('vi-VN')}</p><p>{entry.evidence}</p><p>{entry.note}</p></article>)}</details>
      </>}
    </section>}
    <section className="cod-reconciliation-detail-9" aria-busy={query.isLoading}>
      {query.isLoading && <p role="status">Đang tải vận đơn…</p>}
      {query.isError && <p role="alert" className="booking-small text-danger">Không thể tải vận đơn. <BsButton variant="outline-primary" type="submit" onClick={() => query.refetch()} className="text-decoration-underline cod-reconciliation-detail-10">Thử lại</BsButton></p>}
      {query.data?.items.map((order) => <article key={order.id} className="rounded-3 border p-4 cod-reconciliation-detail-11"><header className="d-flex flex-wrap justify-content-between gap-2"><h2 className="fw-semibold cod-reconciliation-detail-12">Đơn #{order.id.slice(0, 8)}</h2><strong className="booking-small text-success">{labels[order.status]}</strong></header>
        <p className="booking-small cod-reconciliation-detail-13">{order.carrier || 'Chưa có đơn vị vận chuyển'} · Vận đơn {order.trackingCode || 'Chưa có'}</p>
        <p className="booking-small">Giao hàng: {orderStatusLabels[order.deliveryStatus] || order.deliveryStatus}</p>
        <dl className="d-grid gap-3 booking-small cod-reconciliation-detail-14"><div><dt>Phải thu khách</dt><dd className="fw-semibold">{formatVnd(order.expectedAmount)}</dd></div><div><dt>Đã thu hộ</dt><dd>{formatVnd(order.collectedAmount)}</dd></div><div><dt>Đã chuyển tiền về</dt><dd>{formatVnd(order.remittedAmount)}</dd></div><div><dt>Phí giữ lại</dt><dd>{formatVnd(order.carrierFee)}</dd></div><div><dt>Còn ở đơn vị vận chuyển</dt><dd>{formatVnd(order.pendingRemittance)}</dd></div><div><dt>Chênh lệch thu hộ (thực thu − phải thu)</dt><dd className={order.collectionDifference ? "fw-semibold text-warning" : ''}>{order.collectionDifference == null ? 'Chưa xác định' : formatVnd(order.collectionDifference)}</dd></div></dl>
        {order.legacyUnverified && <p className="rounded-3 bg-warning-subtle p-2 booking-small">Đơn cũ có trạng thái đã thanh toán nhưng chưa có chứng từ thu hộ và chuyển tiền về. Cần kiểm tra thủ công.</p>}
        {mode === 'admin' && <BsButton variant="outline-primary" type="submit" className="px-3 booking-small cod-reconciliation-detail-15" onClick={() => { record.reset(); setOrderId(order.id); }}>Đối soát đơn này</BsButton>}
      </article>)}
      {!query.isLoading && !query.isError && !query.data?.items.length && <p className="booking-small text-secondary">Chưa có vận đơn COD phù hợp.</p>}
      <div className="d-flex justify-content-between gap-3 booking-small"><BsButton variant="outline-primary" type="submit" disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-2 cod-reconciliation-detail-16">Trang trước</BsButton><span className="py-2">Trang {page} / {query.data?.totalPages || 1}</span><BsButton variant="outline-primary" type="submit" disabled={!query.data || page >= query.data.totalPages} onClick={() => setPage(page + 1)} className="px-2 cod-reconciliation-detail-17">Trang sau</BsButton></div>
    </section>
  </div>;
}

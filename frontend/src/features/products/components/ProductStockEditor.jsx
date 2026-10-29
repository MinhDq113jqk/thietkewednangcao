import { Form as BsForm, Button as BsButton } from 'react-bootstrap';
import BsGrid from '../../home/components/ResponsiveGrid';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import sellerApi from '../../seller/api/sellerApi';

const field = "mt-1 d-block w-100 rounded-xl border border-gray-200 px-2 py-2.5 disabled:bg-gray-100";
const draftFor = product => ({ stock: String(product.stock), base: product.stockVersion, reason: '' });

export default function ProductStockEditor({ product, reloadProduct }) {
  const [draft, setDraft] = useState(() => draftFor(product));
  const [pendingRequest, setPendingRequest] = useState(null);
  const [reloadError, setReloadError] = useState('');
  const [reloading, setReloading] = useState(false);
  const client = useQueryClient();
  const update = useMutation({
    mutationFn: payload => sellerApi.updateStock(product.id, payload),
    onSuccess: data => {
      setPendingRequest(null);
      setDraft(draftFor(data.product));
      client.invalidateQueries({ queryKey: ['seller-products'] });
      client.invalidateQueries({ queryKey: ['seller-stats'] });
      client.invalidateQueries({ queryKey: ['products'] });
      client.invalidateQueries({ queryKey: ['product', product.id] });
    },
    onError: error => {
      if (error.response?.status >= 400 && error.response.status < 500) setPendingRequest(null);
    },
  });
  const locked = Boolean(pendingRequest) || update.isPending || reloading;
  const reload = async () => {
    setReloading(true); setReloadError('');
    try {
      const fresh = await reloadProduct();
      if (!fresh) throw new Error();
      setDraft(draftFor(fresh)); update.reset();
    } catch { setReloadError('Không thể tải lại tồn kho. Vui lòng thử lại.'); }
    finally { setReloading(false); }
  };
  return <section className="rounded-3 border border-secondary p-4 shadow-sm product-stock-editor-detail-1" aria-label="Điều chỉnh tồn kho">
    <h2 className="fs-5 fw-bold text-secondary">Điều chỉnh tồn kho</h2>
    <p className="mt-2 booking-small text-secondary">Tồn kho gần nhất: {product.stock}. Kiểm tra số lượng thực tế trước khi điều chỉnh.</p>
    {product.stockVersion !== draft.base && <p role="status" className="mt-2 booking-small text-warning">Tồn kho đã thay đổi từ lúc bạn bắt đầu nhập. Tải lại và kiểm tra số lượng.</p>}
    <BsForm className="mt-3 product-stock-editor-detail-2" onSubmit={event => {
      event.preventDefault();
      if (locked) return;
      update.reset();
      const payload = { stock: Number(draft.stock), expectedVersion: draft.base, reason: draft.reason, requestKey: crypto.randomUUID() };
      setPendingRequest(payload); update.mutate(payload);
    }}>
      <BsGrid as="div" columns={{"xs":1,"md":2}} className="">
        <BsForm.Label className="booking-small text-secondary">Tồn kho sau điều chỉnh<BsForm.Control name="newStock" type="number" min="0" max="1000000000" step="1" required disabled={locked} value={draft.stock} onChange={e => setDraft({ ...draft, stock: e.target.value })} className={field} /></BsForm.Label>
        <BsForm.Label className="booking-small text-secondary">Lý do điều chỉnh<BsForm.Control name="stockReason" required minLength={5} maxLength={1000} disabled={locked} value={draft.reason} onChange={e => setDraft({ ...draft, reason: e.target.value })} className={field} /></BsForm.Label>
      </BsGrid>
      {update.isError && <p role="alert" className="booking-small text-danger">{pendingRequest ? 'Chưa xác định kết quả. Thử lại cùng yêu cầu để kiểm tra và hoàn tất.' : update.error.response?.data?.message || 'Không thể điều chỉnh tồn kho.'}</p>}
      {reloadError && <p role="alert" className="booking-small text-danger">{reloadError}</p>}
      {update.isSuccess && <p role="status" className="booking-small text-primary">Đã ghi nhận điều chỉnh. Tồn kho hiện tại: {update.data.product.stock}.</p>}
      <div className="d-flex flex-wrap gap-3">
        {pendingRequest && update.isError
          ? <BsButton variant="primary" type="button" disabled={update.isPending} onClick={() => update.mutate(pendingRequest)} className="px-3 py-2 booking-small">Thử lại điều chỉnh</BsButton>
          : <BsButton variant="primary" type="submit" disabled={locked} className="px-3 py-2 booking-small">{update.isPending ? 'Đang lưu…' : 'Lưu điều chỉnh tồn kho'}</BsButton>}
        <BsButton variant="outline-primary" type="button" disabled={locked} onClick={reload} className="px-3 py-2 booking-small">{reloading ? 'Đang tải…' : 'Tải lại tồn kho'}</BsButton>
      </div>
    </BsForm>
  </section>;
}

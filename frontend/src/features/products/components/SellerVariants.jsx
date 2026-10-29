import { Form as BsForm, Button as BsButton } from 'react-bootstrap';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import sellerApi from '../../seller/api/sellerApi';

const field = "w-100 rounded border border-gray-200 p-2.5";
const message = error => error?.response?.data?.message || 'Chưa xác nhận kết quả. Giữ nội dung và thử lại.';
const draftFor = variant => ({ ...variant, salePrice: variant.salePrice ?? '', image: variant.image || '',
  color: variant.color || '', size: variant.size || '', material: variant.material || '' });

function VariantCard({ product, variant, refresh }) {
  const [draft, setDraft] = useState(() => draftFor(variant || { sku: '', name: '', price: '', stock: 0, isActive: true, lowStockThreshold: 5 }));
  const [createKey] = useState(() => crypto.randomUUID());
  const [command, setCommand] = useState({ kind: 'receipt', quantity: '', reason: '', base: variant?.stockVersion });
  const [pending, setPending] = useState(null);
  const [reloadError, setReloadError] = useState('');
  const save = useMutation({
    mutationFn: body => variant ? sellerApi.updateVariant(product.id, variant.id, body) : sellerApi.createVariant(product.id, body),
    onSuccess: () => refresh(),
  });
  const stock = useMutation({
    mutationFn: body => sellerApi.updateVariantStock(product.id, variant.id, body),
    onSuccess: async result => {
      setPending(null); setCommand({ kind: 'receipt', quantity: '', reason: '', base: result.variant.stockVersion });
      await refresh();
    },
    onError: error => { if (error.response?.status >= 400 && error.response.status < 500) setPending(null); },
  });
  const update = (key, value) => setDraft({ ...draft, [key]: value });
  return <section className="rounded-3 border p-3 seller-variants-detail-1" aria-label={variant ? `SKU ${variant.sku}` : 'Thêm SKU'}>
    <h3 className="fw-semibold">{variant ? `${variant.sku} · ${variant.name}` : 'Thêm biến thể'}</h3>
    <BsForm className="d-grid gap-3 seller-variants-detail-2" onSubmit={event => {
      event.preventDefault();
      if (save.isPending) return;
      const body = { ...draft, price: Number(draft.price), salePrice: draft.salePrice === '' ? null : Number(draft.salePrice), lowStockThreshold: Number(draft.lowStockThreshold) };
      if (variant) { delete body.stock; delete body.held; delete body.stockVersion; }
      else { body.stock = Number(draft.stock); body.requestKey = createKey; }
      save.mutate(body);
    }}>
      {[['sku', 'SKU'], ['name', 'Tên biến thể'], ['color', 'Màu'], ['size', 'Kích thước'], ['material', 'Chất liệu'], ['image', 'URL ảnh'], ['price', 'Giá SKU'], ['salePrice', 'Giá giảm SKU'], ['lowStockThreshold', 'Ngưỡng cảnh báo']].map(([key, label]) =>
        <BsForm.Label key={key} className="booking-small seller-variants-detail-3">{label}<BsForm.Control className={field} value={draft[key]} onChange={e => update(key, e.target.value)} required={['sku','name','price'].includes(key)} inputMode={['price','salePrice','lowStockThreshold'].includes(key) ? 'numeric' : undefined} /></BsForm.Label>)}
      {!variant && <BsForm.Label className="booking-small">Tồn đầu SKU<BsForm.Control className={field} type="number" min="0" step="1" value={draft.stock} onChange={e => update('stock', e.target.value)} required /></BsForm.Label>}
      <BsForm.Label className="d-flex align-items-center gap-2 booking-small"><BsForm.Check.Input type="checkbox" checked={draft.isActive} onChange={e => update('isActive', e.target.checked)} />Đang bán SKU</BsForm.Label>
      {save.isError && <p role="alert" className="booking-small text-danger layout-span-sm-2 seller-variants-detail-4">{message(save.error)}</p>}
      <BsButton variant="primary" type="submit" className="px-3 py-2 seller-variants-detail-5" disabled={save.isPending} aria-busy={save.isPending}>{save.isPending ? 'Đang lưu…' : variant ? 'Lưu SKU' : 'Tạo SKU'}</BsButton>
    </BsForm>
    {variant && <BsForm className="border-top pt-3 seller-variants-detail-6" onSubmit={event => {
      event.preventDefault();
      if (pending || stock.isPending) return;
      const body = { ...command, quantity: Number(command.quantity), expectedVersion: command.base, requestKey: crypto.randomUUID() };
      setPending(body); stock.mutate(body);
    }}>
      <p className="booking-small">Có thể bán: <b>{variant.stock}</b> · Đang giữ: <b>{variant.held}</b> · Trong kho: <b>{variant.stock + variant.held}</b></p>
      {variant.stockVersion !== command.base && <p role="status" className="booking-small text-warning">Tồn đã thay đổi. Tải lại trước khi lưu.</p>}
      <fieldset disabled={Boolean(pending) || stock.isPending} className="d-grid gap-3 seller-variants-detail-7">
        <BsForm.Label className="booking-small">Thao tác<BsForm.Select className={field} value={command.kind} onChange={e => setCommand({ ...command, kind: e.target.value })}><option value="receipt">Nhập thêm hàng</option><option value="adjustment">Đặt lại lượng có thể bán</option></BsForm.Select></BsForm.Label>
        <BsForm.Label className="booking-small">Số lượng<BsForm.Control className={field} type="number" min={command.kind === 'receipt' ? 1 : 0} step="1" required value={command.quantity} onChange={e => setCommand({ ...command, quantity: e.target.value })} /></BsForm.Label>
        <BsForm.Label className="booking-small layout-span-sm-2 seller-variants-detail-8">Lý do kho<BsForm.Control className={field} minLength="5" maxLength="1000" required value={command.reason} onChange={e => setCommand({ ...command, reason: e.target.value })} /></BsForm.Label>
        <BsButton variant="outline-primary" type="submit" className="px-3 py-2 seller-variants-detail-9">{stock.isPending ? 'Đang ghi kho…' : 'Ghi kho SKU'}</BsButton>
      </fieldset>
      {stock.isError && <p role="alert" className="booking-small text-danger">{message(stock.error)}</p>}
      {pending && !stock.isPending && <BsButton variant="outline-primary" type="button" className="text-decoration-underline seller-variants-detail-10" onClick={() => stock.mutate(pending)}>Kiểm tra lại cùng yêu cầu</BsButton>}
      {!pending && <BsButton variant="outline-primary" type="button" className="text-decoration-underline seller-variants-detail-11" onClick={async () => {
        try { const fresh = await refresh(); setCommand({ ...command, base: fresh.variants.find(v => v.id === variant.id).stockVersion }); stock.reset(); setReloadError(''); }
        catch { setReloadError('Không thể tải lại. Thử lại.'); }
      }}>Tải lại tồn SKU</BsButton>}
      {reloadError && <p role="alert">{reloadError}</p>}
    </BsForm>}
  </section>;
}
export default function SellerVariants({ product, reloadProduct }) {
  const client = useQueryClient();
  const [adding, setAdding] = useState(false);
  const refresh = async () => {
    const fresh = await reloadProduct();
    for (const key of ['seller-products', 'seller-inventory', 'seller-stats', 'products', 'shop-products', 'product']) client.invalidateQueries({ queryKey: [key] });
    return fresh;
  };
  return <section className="seller-variants-detail-12" aria-label="Biến thể sản phẩm">
    <h2 className="fs-5 fw-bold">Biến thể và SKU</h2>
    <p className="booking-small text-secondary">SKU duy nhất trong gian hàng. Giá trên danh sách là giá thấp nhất của SKU đang bán. Điều chỉnh kho không thay đổi lượng đã giữ cho đơn.</p>
    {(product.variants || []).map(variant => <VariantCard key={variant.id} product={product} variant={variant} refresh={refresh} />)}
    <BsButton variant="outline-primary" type="button" className="px-3 py-2 seller-variants-detail-13" onClick={() => setAdding(!adding)}>{adding ? 'Đóng thêm biến thể' : 'Thêm biến thể'}</BsButton>
    {adding && <VariantCard product={product} refresh={async () => { const result = await refresh(); setAdding(false); return result; }} />}
  </section>;
}

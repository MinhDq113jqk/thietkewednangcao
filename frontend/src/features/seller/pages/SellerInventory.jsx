import { Form as BsForm, Button as BsButton } from 'react-bootstrap';
import BsGrid from '../../home/components/ResponsiveGrid';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAccountQuery } from '../../../hooks/useAccountQuery';
import sellerApi from '../api/sellerApi';
import ListPaging from '../../../components/ui/ListPaging';

const kinds = { opening: 'Tồn đầu kỳ', receipt: 'Nhập hàng', adjustment: 'Điều chỉnh', legacy_adjustment: 'Điều chỉnh tương thích', reserve: 'Giữ hàng', release: 'Giải phóng', ship: 'Xuất giao hàng', return: 'Nhận hàng trả', exchange: 'Xuất hàng đổi' };
export default function SellerInventory() {
  const [filter, setFilter] = useState({ page: 1, movementPage: 1, sku: '', variantId: '', from: '', to: '', lowStock: '' });
  const query = useAccountQuery({ queryKey: ['seller-inventory', filter], queryFn: () => sellerApi.getInventory(filter) });
  const changeFilter = (key, value) => setFilter({ ...filter, [key]: value, page: 1, movementPage: 1 });
  const data = query.data;
  return <div className="seller-inventory-detail-1" aria-busy={query.isFetching}>
    <h1 className="fs-4 fw-bold">Sổ kho</h1>
    <p className="booking-small">Một kho cho gian hàng. Trong kho = có thể bán + đang giữ. Tồn đầu kỳ ghi nhận tại mốc tạo hoặc chuyển đổi SKU.</p>
    {data && <BsGrid as="div" columns={{"xs":2,"lg":4}} className="">{[['Có thể bán', data.summary.available], ['Đang giữ', data.summary.held], ['SKU tồn thấp', data.summary.lowStock], ['SKU lệch sổ', data.summary.mismatches]].map(([label, value]) => <p key={label} className="rounded border p-3 booking-small seller-inventory-detail-2">{label}<b className="mt-2 d-block fs-5">{value}</b></p>)}</BsGrid>}
    <BsGrid as="div" columns={{"xs":1,"sm":2,"lg":4}} className="rounded border p-3 seller-inventory-detail-3">
      <BsForm.Label className="booking-small">Tìm SKU<BsForm.Control className="mt-1 w-100 rounded border p-3" value={filter.sku} onChange={e => changeFilter('sku', e.target.value)} /></BsForm.Label>
      <BsForm.Label className="booking-small">Từ ngày<BsForm.Control type="date" className="mt-1 w-100 rounded border p-3" value={filter.from} onChange={e => changeFilter('from', e.target.value)} /></BsForm.Label>
      <BsForm.Label className="booking-small">Đến ngày<BsForm.Control type="date" className="mt-1 w-100 rounded border p-3" value={filter.to} onChange={e => changeFilter('to', e.target.value)} /></BsForm.Label>
      <BsForm.Label className="d-flex align-items-center gap-2 booking-small"><BsForm.Check.Input type="checkbox" checked={filter.lowStock === 'true'} onChange={e => changeFilter('lowStock', e.target.checked ? 'true' : '')} />Chỉ SKU tồn thấp</BsForm.Label>
    </BsGrid>
    {query.isLoading && <p role="status">Đang tải sổ kho…</p>}
    {query.isError && <p role="alert" className="text-danger">{query.error.response?.data?.message || 'Không thể tải sổ kho.'} <BsButton variant="outline-primary" type="submit" className="text-decoration-underline seller-inventory-detail-4" onClick={() => query.refetch()}>Thử lại</BsButton></p>}
    {data && !query.isError && <>
      <h2 className="fs-5 fw-semibold">Số dư SKU</h2>
      <BsGrid as="div" columns={{"xs":1,"sm":2}} className="">{data.variants.items.map(v => <article key={v.id} className="rounded border p-3 booking-small seller-inventory-detail-5">
        <Link className="fw-semibold text-decoration-underline" to={`/seller/products/${v.productId}/edit`}>{v.sku} · {v.product.name}</Link><p>{v.name} · {v.isActive ? 'Đang bán' : 'Đã ẩn'}</p>
        <p>Có thể bán: {v.stock} · Đang giữ: {v.held} · Trong kho: {v.stock + v.held}</p>
        {v.stock <= v.lowStockThreshold && <p className="text-warning">Tồn thấp (ngưỡng {v.lowStockThreshold})</p>}
        <BsButton variant="outline-primary" type="submit" className="text-decoration-underline seller-inventory-detail-6" onClick={() => changeFilter('variantId', v.id)}>Xem lịch sử SKU</BsButton>
      </article>)}</BsGrid>
      {!data.variants.items.length && <p>Không có SKU phù hợp.</p>}
      <ListPaging data={data.variants} page={filter.page} onPage={page => setFilter({ ...filter, page })} busy={query.isFetching} />
      <div className="d-flex flex-wrap align-items-center gap-3"><h2 className="fs-5 fw-semibold">Lịch sử biến động</h2>{filter.variantId && <BsButton variant="outline-primary" type="submit" className="text-decoration-underline seller-inventory-detail-7" onClick={() => changeFilter('variantId', '')}>Xem tất cả SKU</BsButton>}</div>
      <div className="seller-inventory-detail-8">{data.movements.items.map(m => <article key={m.id} className="rounded border p-3 booking-small seller-inventory-detail-9">
        <p className="fw-semibold">{kinds[m.kind]} · {m.variant.sku}</p><p>{new Date(m.createdAt).toLocaleString('vi-VN')} · {m.actor?.name || 'Hệ thống'}</p>
        <p>Có thể bán: {m.availableDelta > 0 ? '+' : ''}{m.availableDelta} → {m.availableAfter} · Đang giữ: {m.heldDelta > 0 ? '+' : ''}{m.heldDelta} → {m.heldAfter}</p>
        <p className="text-break">{m.reason}</p><p className="booking-caption text-secondary seller-inventory-detail-10">Nguồn: {m.sourceKey}</p>
        {m.orderId && <Link className="d-inline-block text-decoration-underline seller-inventory-detail-11" to={`/seller/orders?search=${m.orderId}`}>Đơn #{m.orderId.slice(0,8)}</Link>}
      </article>)}</div>
      {!data.movements.items.length && <p>Không có biến động trong khoảng lọc.</p>}
      <ListPaging data={data.movements} page={filter.movementPage} onPage={movementPage => setFilter({ ...filter, movementPage })} busy={query.isFetching} />
    </>}
  </div>;
}

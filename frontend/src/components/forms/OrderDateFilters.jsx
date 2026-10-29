import { Form as BsForm } from 'react-bootstrap';
export default function OrderDateFilters({ value, onChange }) {
  return <div className="my-3 d-flex flex-wrap align-items-end gap-3 booking-small">
    <BsForm.Label>Từ ngày<BsForm.Control aria-label="Từ ngày" type="date" value={value.from} onChange={e => onChange({ ...value, from: e.target.value })} className="mt-1 d-block rounded border p-2 order-date-filters-detail-1" /></BsForm.Label>
    <BsForm.Label>Đến ngày<BsForm.Control aria-label="Đến ngày" type="date" value={value.to} onChange={e => onChange({ ...value, to: e.target.value })} className="mt-1 d-block rounded border p-2 order-date-filters-detail-2" /></BsForm.Label>
    <BsForm.Label>Sắp xếp<BsForm.Select aria-label="Sắp xếp đơn hàng" value={value.sort} onChange={e => onChange({ ...value, sort: e.target.value })} className="mt-1 d-block rounded border p-2 order-date-filters-detail-3"><option value="newest">Mới nhất</option><option value="oldest">Cũ nhất</option></BsForm.Select></BsForm.Label>
    <span className="pb-2 booking-caption text-secondary">Ngày tạo đơn, giờ Việt Nam</span>
  </div>;
}

import { Button as BsButton } from 'react-bootstrap';
export default function ListPaging({ data, page, onPage, busy = false }) {
  return <nav aria-label="Phân trang" className="my-3 d-flex flex-wrap align-items-center gap-3 booking-small">
    <BsButton variant="outline-primary" type="button" disabled={busy || page <= 1} onClick={() => onPage(page - 1)} className="px-3 py-2 list-paging-detail-1">Trang trước</BsButton>
    <span aria-live="polite">Trang {page}/{Math.max(1, data?.totalPages || 0)} · {data?.total ?? 0} kết quả</span>
    <BsButton variant="outline-primary" type="button" disabled={busy || page >= (data?.totalPages || 0)} onClick={() => onPage(page + 1)} className="px-3 py-2 list-paging-detail-2">Trang sau</BsButton>
  </nav>;
}

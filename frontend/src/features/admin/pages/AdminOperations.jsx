import { Button as BsButton, Form as BsForm, Table as BsTable } from 'react-bootstrap';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccountQuery } from '../../../hooks/useAccountQuery';
import api from '../../../services/axiosInstance';
import ListPaging from '../../../components/ui/ListPaging';

const tabs = { notifications: 'Hàng chờ thông báo', audit: 'Nhật ký thao tác', content: 'Kiểm duyệt nội dung', moderation: 'Lịch sử kiểm duyệt' };
export default function AdminOperations() {
  const [tab, setTab] = useState('notifications'), [page, setPage] = useState(1);
  const [type, setType] = useState('product'), [state, setState] = useState('');
  const [target, setTarget] = useState(null), [reason, setReason] = useState('');
  const [resourceType, setResourceType] = useState('');
  const client = useQueryClient();
  const path = `/admin/operations/${tab === 'content' ? `content/${type}` : tab}`;
  const query = useAccountQuery({ queryKey: ['operations', tab, type, page, state, resourceType], queryFn: () => api.get(path, { params: { page, ...(tab === 'notifications' ? { state } : {}), ...(tab === 'audit' ? { resourceType } : {}) } }).then(r => r.data) });
  const action = useMutation({
    mutationFn: payload => tab === 'notifications' ? api.post(`/admin/operations/notifications/${payload.id}/retry`) : api.post(`/admin/operations/content/${type}/${target.id}/moderate`, payload),
    onSuccess: () => { client.invalidateQueries({ queryKey: ['operations'] }); client.invalidateQueries({ queryKey: ['admin-shops'] }); setTarget(null); setReason(''); },
  });
  return <main className="admin-operations-detail-1">
    <h1 className="fs-4 fw-bold">Vận hành hệ thống</h1>
    <div className="d-flex flex-wrap gap-2" aria-label="Chức năng vận hành">{Object.entries(tabs).map(([key,label]) => <BsButton variant="outline-primary" type="submit" key={key} aria-pressed={tab === key} className={`rounded border px-3 py-2 booking-small ${tab === key ? "bg-primary admin-operations-detail-2" : "admin-operations-detail-3"}`} onClick={() => { setTab(key); setPage(1); setTarget(null); action.reset(); }}>{label}</BsButton>)}</div>
    {tab === 'notifications' && <BsForm.Label className="d-block">Trạng thái gửi<BsForm.Select aria-label="Trạng thái gửi" value={state} onChange={e => { setState(e.target.value); setPage(1); }} className="ms-2 rounded border p-2"><option value="">Tất cả</option><option value="pending">Đang chờ</option><option value="failed">Thất bại</option><option value="sent">Đã gửi</option><option value="expired">Liên kết hết hiệu lực</option></BsForm.Select></BsForm.Label>}
    {tab === 'content' && <BsForm.Label className="d-block">Loại nội dung<BsForm.Select aria-label="Loại nội dung" value={type} onChange={e => { setType(e.target.value); setPage(1); setTarget(null); action.reset(); }} className="ms-2 rounded border p-2"><option value="product">Sản phẩm</option><option value="shop">Gian hàng</option><option value="review">Đánh giá</option></BsForm.Select></BsForm.Label>}
    {tab === 'audit' && <BsForm.Label className="d-block">Lọc loại dữ liệu<BsForm.Control maxLength={60} value={resourceType} onChange={e => { setResourceType(e.target.value); setPage(1); }} placeholder="Ví dụ: refunds" className="ms-2 rounded border p-2" /></BsForm.Label>}
    {tab === 'notifications' && <p className="booking-small text-secondary">Email chờ cấu hình SMTP sẽ được giữ lại. Lỗi gửi được thử lại tự động tối đa 5 lần.</p>}
    {query.isLoading && <p role="status">Đang tải...</p>}
    {query.isError && <p role="alert">Không thể tải dữ liệu. <BsButton variant="outline-primary" type="submit" className="text-decoration-underline" onClick={() => query.refetch()}>Thử lại</BsButton></p>}
    {action.isError && <p role="alert" className="text-danger">{action.error.response?.data?.message || 'Không thể lưu thao tác'}</p>}
    {action.isSuccess && <p role="status" className="text-primary">Đã lưu thao tác.</p>}
    <div className="overflow-x-auto rounded border admin-operations-detail-4"><BsTable responsive hover className="w-100 text-start booking-small admin-operations-detail-5"><thead><tr className="border-bottom"><th className="p-2">Nội dung / Định danh</th><th className="p-2">Trạng thái / Chi tiết</th><th className="p-2">Thao tác</th></tr></thead><tbody>
      {query.data?.items.map(row => <tr key={row.id} className="border-bottom align-top">
        <td className="text-break p-2 admin-operations-detail-6"><strong>{row.title || row.name || row.comment || row.action}</strong><p className="my-2 booking-caption text-secondary admin-operations-detail-7">{row.id}</p>{row.resourceType && <p>{row.resourceType}: {row.resourceId}</p>}{row.actorId && <p className="booking-caption admin-operations-detail-8">Người thực hiện: {row.actorId}</p>}</td>
        <td className="text-break p-2 admin-operations-detail-9">{tab === 'notifications' ? <><p>{row.state} · {row.attempts}/5 lần</p><p className="mt-2 booking-caption">{row.lastError}</p></> : tab === 'content' ? <><p>{row.status || (row.moderationHidden ? 'Bị quản trị viên ẩn' : 'Được duyệt')}</p>{row.isActive === false && <p>Người bán đang tạm ẩn</p>}</> : tab === 'audit' ? <pre className="booking-caption admin-operations-detail-10">{JSON.stringify(row.details, null, 2)}</pre> : <><p>{row.reason}</p><p className="mt-2 booking-caption">{row.previous} → {row.next}</p></>}
          <p className="mt-2 booking-caption text-secondary">{new Date(row.createdAt).toLocaleString('vi-VN')}</p></td>
        <td className="p-2">{tab === 'notifications' && row.state === 'failed' && <BsButton variant="outline-primary" type="submit" disabled={action.isPending} onClick={() => action.mutate({ id: row.id })} className="px-2 py-2">Thử gửi lại</BsButton>}{tab === 'content' && <BsButton variant="outline-primary" type="submit" onClick={() => { setTarget(row); setReason(''); action.reset(); }} className="px-2 py-2">Kiểm duyệt</BsButton>}</td>
      </tr>)}
    </tbody></BsTable>{query.data?.total === 0 && <p className="p-4">Chưa có dữ liệu phù hợp.</p>}</div>
    <ListPaging data={query.data} page={page} onPage={setPage} busy={query.isFetching} />
    {target && <BsForm className="rounded border p-4 admin-operations-detail-11" onSubmit={e => { e.preventDefault(); action.mutate({ action: e.nativeEvent.submitter.value, reason }); }}>
      <h2 className="fw-bold">Kiểm duyệt: {target.name || target.id}</h2>
      <BsForm.Label className="d-block">Lý do kiểm duyệt<BsForm.Control as="textarea" required minLength={5} maxLength={1000} rows={3} value={reason} onChange={e => setReason(e.target.value)} className="mt-1 d-block w-100 rounded border p-2" /></BsForm.Label>
      <div className="d-flex flex-wrap gap-3"><BsButton variant="primary" type="submit" value="approve" disabled={action.isPending} className="px-3 py-2">Duyệt nội dung</BsButton><BsButton variant="outline-primary" type="submit" value="hide" disabled={action.isPending} className="px-3 py-2">Ẩn nội dung</BsButton><BsButton variant="outline-primary" type="button" onClick={() => setTarget(null)} className="px-3 py-2">Hủy</BsButton></div>
    </BsForm>}
  </main>;
}

import { Form as BsForm, Button as BsButton } from 'react-bootstrap';
import BsGrid from '../../home/components/ResponsiveGrid';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccountQuery } from '../../../hooks/useAccountQuery';
import api from '../../../services/axiosInstance';
import useAuthStore from '../../auth/store/authStore';
import ListPaging from '../../../components/ui/ListPaging';

const labels = { open: 'Mới tiếp nhận', in_progress: 'Đang xử lý', resolved: 'Đã giải quyết', closed: 'Đã đóng' };
export default function SupportPage({ admin = false }) {
  const [params, setParams] = useSearchParams();
  const id = params.get('ticket');
  const [page, setPage] = useState(1), [messagePage, setMessagePage] = useState(1);
  const [status, setStatus] = useState('');
  const [form, setForm] = useState({ subject: '', message: '', orderId: params.get('orderId') || '' });
  const [reply, setReply] = useState('');
  const [assignment, setAssignment] = useState({ assignedTo: '', status: '', reason: '' });
  const client = useQueryClient();
  const userId = useAuthStore(s => s.user?.id);
  const base = admin ? '/admin/operations/support' : '/support';
  const list = useAccountQuery({ queryKey: ['support-list', admin, page, status], queryFn: () => api.get(base, { params: { page, status } }).then(r => r.data) });
  const detail = useAccountQuery({ queryKey: ['support-detail', admin, id, messagePage], queryFn: () => api.get(`${base}/${id}`, { params: { page: messagePage, limit: 20 } }).then(r => r.data), enabled: Boolean(id) });
  const admins = useAccountQuery({ queryKey: ['support-admins'], queryFn: () => api.get('/admin/users', { params: { role: 'admin', status: 'active', limit: 100 } }).then(r => r.data), enabled: admin });
  const mutate = useMutation({
    mutationFn: ({ type, payload }) => type === 'create' ? api.post(base, payload) : type === 'reply' ? api.post(`${base}/${id}/messages`, { message: reply }) : api.patch(`${base}/${id}`, payload),
    onSuccess: (res, variables) => {
      client.invalidateQueries({ queryKey: ['support-list'] }); client.invalidateQueries({ queryKey: ['support-detail'] });
      if (variables.type === 'create') { setParams({ ticket: res.data.id }); setForm({ subject: '', message: '', orderId: '' }); setMessagePage(1); }
      if (variables.type === 'reply') setReply('');
      if (variables.type === 'update') setAssignment({ assignedTo: '', status: '', reason: '' });
    },
  });
  const select = next => { setParams({ ticket: next }); setMessagePage(1); setReply(''); setAssignment({ assignedTo: '', status: '', reason: '' }); mutate.reset(); };
  const input = "mt-1 d-block w-100 rounded border bg-white p-2";
  return <main className={admin ? "support-page-detail-1" : "mx-auto px-3 py-5 support-page-detail-2"}>
    <h1 className="fs-4 fw-bold">{admin ? 'Xử lý hỗ trợ' : 'Hỗ trợ của tôi'}</h1>
    <Link to="/notifications" className="booking-small text-primary text-decoration-underline">Xem thông báo</Link>
    {mutate.isError && <p role="alert" className="rounded border border-danger bg-danger-subtle p-2 text-danger">{mutate.error.response?.data?.message || 'Không thể lưu. Vui lòng thử lại.'}</p>}
    <BsGrid as="div" columns={{"xs":1,"lg":2}} className="">
      <section className="rounded border p-4 support-page-detail-3">
        <BsForm.Label>Lọc trạng thái<BsForm.Select aria-label="Lọc trạng thái" className={input} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="">Tất cả</option>{Object.entries(labels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</BsForm.Select></BsForm.Label>
        {list.isLoading && <p role="status">Đang tải yêu cầu...</p>}
        {list.isError && <p role="alert">Không tải được yêu cầu. <BsButton variant="outline-primary" type="submit" onClick={() => list.refetch()} className="text-decoration-underline">Thử lại</BsButton></p>}
        {list.data?.items.map(ticket => <BsButton variant="outline-primary" type="submit" key={ticket.id} onClick={() => select(ticket.id)} aria-pressed={id === ticket.id} className={`mt-2 d-block w-100 rounded border p-2 text-start ${id === ticket.id ? "border-primary bg-primary-subtle" : ''}`}><strong>{ticket.subject}</strong><span className="mt-1 d-block booking-caption">{labels[ticket.status]} · {new Date(ticket.createdAt).toLocaleString('vi-VN')}</span></BsButton>)}
        {list.data?.total === 0 && <p className="my-4">Chưa có yêu cầu phù hợp.</p>}
        <ListPaging data={list.data} page={page} onPage={setPage} busy={list.isFetching} />
        {!admin && <BsForm onSubmit={e => { e.preventDefault(); mutate.mutate({ type: 'create', payload: form }); }} className="mt-4 border-top pt-4 support-page-detail-4">
          <h2 className="fw-bold">Tạo yêu cầu hỗ trợ</h2>
          <BsForm.Label className="d-block">Tiêu đề<BsForm.Control required minLength={5} maxLength={200} className={input} value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} /></BsForm.Label>
          <BsForm.Label className="d-block">Mã đơn hàng (nếu có)<BsForm.Control className={input} maxLength={36} value={form.orderId} onChange={e => setForm({ ...form, orderId: e.target.value })} /></BsForm.Label>
          <BsForm.Label className="d-block">Nội dung<BsForm.Control as="textarea" required minLength={10} maxLength={2000} rows={4} className={input} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} /></BsForm.Label>
          <BsButton variant="primary" type="submit" disabled={mutate.isPending} className="px-3 py-2 support-page-detail-5">Gửi yêu cầu</BsButton>
        </BsForm>}
      </section>
      <section className="rounded border p-4 support-page-detail-6">
        {!id && <p>Chọn yêu cầu để xem nội dung.</p>}
        {detail.isLoading && id && <p role="status">Đang tải nội dung...</p>}
        {detail.isError && <p role="alert">Không tải được nội dung. <BsButton variant="outline-primary" type="submit" className="text-decoration-underline" onClick={() => detail.refetch()}>Thử lại</BsButton></p>}
        {detail.data && <>
          <h2 className="fw-bold">{detail.data.subject}</h2><p className="my-2 booking-small">{labels[detail.data.status]} · Người phụ trách: {detail.data.assignedTo ? (admins.data?.items.find(a => a.id === detail.data.assignedTo)?.name || 'Đã phân công') : 'Chưa phân công'}</p>
          {detail.data.orderId && <p className="booking-caption support-page-detail-7">Đơn hàng: {detail.data.orderId}</p>}
          {admin && <BsForm className="my-3 rounded bg-secondary-subtle p-2 support-page-detail-8" onSubmit={e => { e.preventDefault(); mutate.mutate({ type: 'update', payload: { reason: assignment.reason, ...(assignment.assignedTo ? { assignedTo: assignment.assignedTo === 'none' ? null : assignment.assignedTo } : {}), ...(assignment.status ? { status: assignment.status } : {}) } }); }}>
            <BsForm.Label className="d-block">Phân công<BsForm.Select aria-label="Phân công" className={input} value={assignment.assignedTo} onChange={e => setAssignment({ ...assignment, assignedTo: e.target.value })}><option value="">Giữ người phụ trách</option><option value="none">Bỏ phân công</option>{admins.data?.items.map(a => <option key={a.id} value={a.id}>{a.name}{a.id === userId ? ' (Tôi)' : ''}</option>)}</BsForm.Select></BsForm.Label>
            <BsForm.Label className="d-block">Trạng thái mới<BsForm.Select aria-label="Trạng thái mới" className={input} value={assignment.status} onChange={e => setAssignment({ ...assignment, status: e.target.value })}><option value="">Giữ trạng thái</option>{Object.entries(labels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</BsForm.Select></BsForm.Label>
            <BsForm.Label className="d-block">Lý do cập nhật<BsForm.Control required minLength={5} maxLength={1000} className={input} value={assignment.reason} onChange={e => setAssignment({ ...assignment, reason: e.target.value })} /></BsForm.Label>
            <BsButton variant="outline-primary" type="submit" disabled={mutate.isPending} className="px-3 py-2">Lưu phân công và trạng thái</BsButton>
          </BsForm>}
          {[...detail.data.messages.items].reverse().map(m => <article key={m.id} className="my-2 rounded border p-2"><p className="booking-caption text-secondary">{m.authorIdUser?.name} · {new Date(m.createdAt).toLocaleString('vi-VN')}</p><p className="mt-2 text-break support-page-detail-9">{m.body}</p></article>)}
          <ListPaging data={detail.data.messages} page={messagePage} onPage={setMessagePage} busy={detail.isFetching} />
          {detail.data.status !== 'closed' && <BsForm onSubmit={e => { e.preventDefault(); mutate.mutate({ type: 'reply' }); }} className="support-page-detail-10"><BsForm.Label className="d-block">Trả lời<BsForm.Control as="textarea" required maxLength={2000} rows={3} className={input} value={reply} onChange={e => setReply(e.target.value)} /></BsForm.Label><BsButton variant="primary" type="submit" disabled={mutate.isPending} className="px-3 py-2">Gửi phản hồi</BsButton></BsForm>}
        </>}
      </section>
    </BsGrid>
  </main>;
}

import { Container as BsContainer, Button as BsButton } from 'react-bootstrap';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccountQuery } from '../../../hooks/useAccountQuery';
import api from '../../../services/axiosInstance';
import ListPaging from '../../../components/ui/ListPaging';

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const client = useQueryClient();
  const query = useAccountQuery({ queryKey: ['notifications', page], queryFn: () => api.get('/notifications', { params: { page } }).then(r => r.data), refetchInterval: 30000 });
  const read = useMutation({ mutationFn: id => api.patch(`/notifications/${id}/read`), onSuccess: () => client.invalidateQueries({ queryKey: ['notifications'] }) });
  return <BsContainer as="main" className="py-5 booking-narrow notifications-page-detail-1">
    <h1 className="fs-4 fw-bold">Thông báo của tôi</h1>
    {query.isLoading && <p role="status">Đang tải thông báo...</p>}
    {query.isError && <p role="alert">Không thể tải thông báo. <BsButton variant="outline-primary" type="submit" onClick={() => query.refetch()} className="text-decoration-underline">Thử lại</BsButton></p>}
    {read.isError && <p role="alert">Không đánh dấu được thông báo. Vui lòng thử lại.</p>}
    {query.data?.total === 0 && <p>Chưa có thông báo.</p>}
    {query.data?.items.map(row => <article key={row.id} className={`rounded border p-4 notifications-page-detail-2 ${!row.readAt ? "border-primary" : ''}`}>
      <h2 className="fw-bold">{row.title}</h2><p className="my-2 booking-small notifications-page-detail-3">{row.body}</p>
      <p className="mb-2 booking-caption text-secondary">{new Date(row.createdAt).toLocaleString('vi-VN')}</p>
      <Link to={row.href} className="me-4 booking-small text-primary text-decoration-underline">Xem chi tiết</Link>
      {!row.readAt && <BsButton variant="outline-primary" type="submit" disabled={read.isPending} onClick={() => read.mutate(row.id)} className="booking-small text-decoration-underline">Đánh dấu đã đọc</BsButton>}
    </article>)}
    <ListPaging data={query.data} page={page} onPage={setPage} busy={query.isFetching} />
  </BsContainer>;
}

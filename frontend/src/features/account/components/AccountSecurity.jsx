import { Button as BsButton } from 'react-bootstrap';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAccountQuery } from '../../../hooks/useAccountQuery';
import api from '../../../services/axiosInstance';
import useAuthStore from '../../auth/store/authStore';
import { toast } from '../../../components/ui/toastStore';

export default function AccountSecurity() {
  const client = useQueryClient();
  const navigate = useNavigate();
  const sessions = useAccountQuery({ queryKey: ['auth-sessions'], queryFn: () => api.get('/auth/sessions').then(r => r.data) });
  const profile = useAccountQuery({ queryKey: ['auth-security-profile'], queryFn: () => api.get('/auth/me').then(r => r.data), refetchOnWindowFocus: true });
  const revoke = useMutation({
    mutationFn: row => api.delete(row ? `/auth/sessions/${row.id}` : '/auth/sessions'),
    onSuccess: (_data, row) => {
      if (!row || row.current) { useAuthStore.getState().logout(); navigate('/login'); }
      else client.invalidateQueries({ queryKey: ['auth-sessions'] });
    },
    onError: error => toast.error(error.response?.data?.message || 'Không thể thu hồi phiên'),
  });
  const verify = useMutation({ mutationFn: () => api.post('/auth/request-verification'),
    onSuccess: res => toast.success(res.data.message), onError: error => toast.error(error.response?.data?.message || 'Không thể gửi xác minh') });
  return <div className="account-security-detail-1">
    <section><h2 className="fs-5 fw-bold">Xác minh email</h2>
      {profile.isLoading ? <p role="status">Đang tải...</p> : profile.isError ? <BsButton variant="outline-primary" type="submit" onClick={() => profile.refetch()}>Thử tải lại thông tin email</BsButton> : <>
        <p className="my-2 booking-small">{profile.data?.emailVerifiedAt ? 'Email đã được xác minh.' : 'Email chưa được xác minh.'}</p>
        {!profile.data?.emailVerifiedAt && <BsButton variant="outline-primary" type="submit" disabled={verify.isPending} onClick={() => verify.mutate()} className="px-3 py-2 account-security-detail-2">{verify.isPending ? 'Đang gửi...' : 'Gửi email xác minh'}</BsButton>}
      </>}
    </section>
    <section><h2 className="fs-5 fw-bold">Phiên đăng nhập</h2><p className="my-2 booking-small text-secondary">Thu hồi phiên sẽ chặn quyền truy cập của thiết bị đó ngay lập tức.</p>
      {sessions.isLoading && <p role="status">Đang tải phiên...</p>}
      {sessions.isError && <p role="alert">Không thể tải phiên. <BsButton variant="outline-primary" type="submit" onClick={() => sessions.refetch()} className="text-decoration-underline">Thử lại</BsButton></p>}
      {sessions.data?.map(row => <article key={row.id} className="my-2 rounded border p-2">
        <p className="text-break booking-small">{row.label} {row.current && <strong>· Phiên hiện tại</strong>}</p>
        <p className="my-2 booking-caption text-secondary">Hoạt động: {new Date(row.lastSeenAt).toLocaleString('vi-VN')}</p>
        <BsButton variant="outline-danger" type="submit" disabled={revoke.isPending} onClick={() => revoke.mutate(row)} className="booking-small text-decoration-underline">Thu hồi phiên</BsButton>
      </article>)}
      <BsButton variant="outline-danger" type="submit" disabled={revoke.isPending || sessions.isLoading} onClick={() => revoke.mutate(null)} className="px-3 py-2 account-security-detail-3">Đăng xuất mọi thiết bị</BsButton>
    </section>
  </div>;
}

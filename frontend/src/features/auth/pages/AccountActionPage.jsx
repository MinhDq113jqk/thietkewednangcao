import { Form as BsForm, Button as BsButton } from 'react-bootstrap';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import api from '../../../services/axiosInstance';
import useAuthStore from '../store/authStore';

export default function AccountActionPage() {
  const { pathname } = useLocation();
  const [token] = useState(() => window.location.hash.slice(1));
  const [form, setForm] = useState({ email: '', password: '', confirm: '' });
  const [validation, setValidation] = useState('');
  const forgot = pathname === '/forgot-password';
  const reset = pathname === '/reset-password';
  useEffect(() => { if (window.location.hash) window.history.replaceState(null, '', window.location.pathname); }, []);
  const mutation = useMutation({
    mutationFn: () => api.post(`/auth/${forgot ? 'forgot-password' : reset ? 'reset-password' : 'verify-email'}`,
      forgot ? { email: form.email } : { token, ...(reset ? { newPassword: form.password } : {}) }).then(res => res.data),
    onSuccess: () => { if (reset) useAuthStore.getState().logout(); },
  });
  const submit = e => {
    e.preventDefault();
    if (reset && form.password !== form.confirm) return setValidation('Mật khẩu xác nhận chưa khớp.');
    setValidation(''); mutation.mutate();
  };
  return <main className="mx-auto my-5 rounded-3 border p-5 account-action-page-detail-1">
    <h1 className="fs-4 fw-bold">{forgot ? 'Quên mật khẩu' : reset ? 'Đặt lại mật khẩu' : 'Xác minh email'}</h1>
    <p className="my-3 booking-small text-secondary">{forgot ? 'Nhập email tài khoản để nhận liên kết có hiệu lực 30 phút.' : 'Liên kết chỉ sử dụng được một lần.'}</p>
    {mutation.isSuccess ? <p role="status" className="my-3 text-primary">{mutation.data.message}</p> : <BsForm onSubmit={submit} className="account-action-page-detail-2">
      {forgot && <BsForm.Label className="d-block">Email<BsForm.Control required type="email" autoComplete="email" maxLength={150} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="mt-1 d-block w-100 rounded border p-2" /></BsForm.Label>}
      {reset && <>
        <BsForm.Label className="d-block">Mật khẩu mới<BsForm.Control required type="password" minLength={8} autoComplete="new-password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="mt-1 d-block w-100 rounded border p-2" /></BsForm.Label>
        <BsForm.Label className="d-block">Xác nhận mật khẩu<BsForm.Control required type="password" autoComplete="new-password" value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} className="mt-1 d-block w-100 rounded border p-2" /></BsForm.Label>
      </>}
      {!forgot && !token && <p role="alert" className="text-danger">Liên kết thiếu mã xác nhận. Vui lòng mở lại email hoặc yêu cầu liên kết mới.</p>}
      {(validation || mutation.isError) && <p role="alert" className="text-danger">{validation || mutation.error.response?.data?.message || 'Không thể xử lý. Vui lòng thử lại.'}</p>}
      <BsButton variant="primary" type="submit" disabled={mutation.isPending || (!forgot && !token)} className="px-4 py-2 account-action-page-detail-3">{mutation.isPending ? 'Đang xử lý...' : forgot ? 'Gửi hướng dẫn' : reset ? 'Lưu mật khẩu mới' : 'Xác minh email'}</BsButton>
    </BsForm>}
    <Link to="/login" className="mt-4 d-block text-primary text-decoration-underline">Về trang đăng nhập</Link>
  </main>;
}

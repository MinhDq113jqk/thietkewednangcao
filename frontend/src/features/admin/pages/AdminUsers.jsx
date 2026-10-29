import { Form as BsForm, Table as BsTable, Button as BsButton } from 'react-bootstrap';
import { useAccountQuery } from '../../../hooks/useAccountQuery';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Lock, Search, Unlock } from 'lucide-react';
import adminApi from '../api/adminApi';
import Skeleton, { TableSkeleton } from '../../../components/ui/Skeleton';
import Spinner from '../../../components/ui/Spinner';
import { toast } from '../../../components/ui/toastStore';

const roleLabels = {
  buyer: 'Người mua',
  seller: 'Người bán',
  admin: 'Admin',
};

function AdminUsers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const role = searchParams.get('role') || '';
  const status = searchParams.get('status') || '';
  const search = searchParams.get('search') || '';

  const { data, isLoading, isError } = useAccountQuery({
    queryKey: ['admin-users', role, status, search],
    queryFn: () => adminApi.getUsers({
      role: role || undefined,
      status: status || undefined,
      search: search || undefined,
      limit: 50,
    }),
  });

  const updateParams = (next) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([key, value]) => {
      if (!value) params.delete(key);
      else params.set(key, value);
    });
    setSearchParams(params);
  };

  const submitSearch = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    updateParams({ search: String(formData.get('search') || '').trim() });
  };

  const updateStatus = useMutation({
    mutationFn: ({ id, isActive }) => adminApi.updateUserStatus(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Đã cập nhật người dùng');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Không thể cập nhật người dùng'),
  });

  const users = data?.items || [];

  return (
    <div className="rounded-3 border border-secondary shadow-sm admin-users-detail-1" aria-busy={isLoading}>
      <div className="d-flex flex-column gap-4 border-bottom border-secondary p-4">
        <div>
          <h1 className="fs-5 fw-bold text-secondary">Quản lý người dùng</h1>
          <p className="mt-1 booking-small text-secondary admin-users-detail-2">
            {isLoading
              ? <Skeleton as="span" className="d-inline-block align-middle admin-users-detail-3" />
              : `${data?.total ?? 0} tài khoản trong hệ thống`}
          </p>
        </div>

        <div className="d-grid gap-3 admin-users-detail-4">
          <BsForm onSubmit={submitSearch} className="d-flex align-items-center gap-2 rounded-3 border border-secondary px-2 admin-users-detail-5">
            <Search size={16} className="text-secondary" />
            <BsForm.Control
              key={search}
              name="search"
              defaultValue={search}
              placeholder="Tìm tên, email, số điện thoại"
              className="flex-grow-1 booking-small admin-users-detail-6"
            />
          </BsForm>
          <BsForm.Select value={role} onChange={(event) => updateParams({ role: event.target.value })} className="rounded-3 border border-secondary px-2 booking-small admin-users-detail-7">
            <option value="">Tất cả vai trò</option>
            {Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </BsForm.Select>
          <BsForm.Select value={status} onChange={(event) => updateParams({ status: event.target.value })} className="rounded-3 border border-secondary px-2 booking-small admin-users-detail-8">
            <option value="">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Đã khóa</option>
          </BsForm.Select>
        </div>
      </div>

      {isLoading && <div className="overflow-x-auto"><TableSkeleton columns={5} rows={6} className="admin-users-detail-9" /></div>}
      {isError && <p className="p-4 booking-small text-danger">Không thể tải người dùng.</p>}

      {!isLoading && !isError && (
        <div className="overflow-x-auto">
          <BsTable responsive hover className="w-100 text-start booking-small admin-users-detail-10">
            <thead className="bg-secondary-subtle booking-caption text-uppercase text-secondary">
              <tr>
                <th className="px-4 py-2">Người dùng</th>
                <th className="px-4 py-2">Vai trò</th>
                <th className="px-4 py-2">Trạng thái</th>
                <th className="px-4 py-2">Ngày tạo</th>
                <th className="px-4 py-2 text-end">Thao tác</th>
              </tr>
            </thead>
            <tbody className="admin-users-detail-11">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3">
                    <p className="fw-semibold text-secondary">{user.name}</p>
                    <p className="booking-caption text-secondary">{user.email}</p>
                  </td>
                  <td className="px-4 py-3 text-secondary">{roleLabels[user.role] || user.role}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-pill px-2 py-1 booking-caption fw-semibold ${user.isActive ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger"}`}>
                      {user.isActive ? 'Đang hoạt động' : 'Đã khóa'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-secondary">{new Date(user.createdAt).toLocaleDateString('vi-VN')}</td>
                  <td className="px-4 py-3">
                    <div className="d-flex justify-content-end">
                      <BsButton variant="outline-primary" type="submit"
                        onClick={() => updateStatus.mutate({ id: user.id, isActive: !user.isActive })}
                        disabled={updateStatus.isPending}
                        aria-busy={updateStatus.isPending && updateStatus.variables?.id === user.id}
                        className="d-inline-flex align-items-center gap-1 px-2 py-2 booking-caption"
                      >
                        {updateStatus.isPending && updateStatus.variables?.id === user.id
                          ? <Spinner size="sm" label="Đang cập nhật người dùng..." />
                          : user.isActive ? <Lock size={14} aria-hidden /> : <Unlock size={14} aria-hidden />}
                        {updateStatus.isPending && updateStatus.variables?.id === user.id
                          ? 'Đang cập nhật...'
                          : user.isActive ? 'Khóa' : 'Mở khóa'}
                      </BsButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </BsTable>
          {!users.length && <p className="p-4 text-center booking-small text-secondary">Không có người dùng phù hợp.</p>}
        </div>
      )}
    </div>
  );
}

export default AdminUsers;

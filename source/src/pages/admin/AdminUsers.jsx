import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Lock, Search, Unlock } from 'lucide-react';
import adminApi from '../../api/adminApi';
import Skeleton, { TableSkeleton } from '../../components/ui/Skeleton';
import Spinner from '../../components/ui/Spinner';
import { toast } from '../../components/ui/toastStore';

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

  const { data, isLoading, isError } = useQuery({
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
    <div className="rounded-lg border border-stone-200 bg-white shadow-sm" aria-busy={isLoading}>
      <div className="flex flex-col gap-4 border-b border-stone-200 p-5">
        <div>
          <h1 className="text-xl font-bold text-stone-950">Quản lý người dùng</h1>
          <p className="mt-1 min-h-5 text-sm text-stone-500">
            {isLoading
              ? <Skeleton as="span" className="inline-block h-4 w-40 align-middle" />
              : `${data?.total ?? 0} tài khoản trong hệ thống`}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(240px,1fr)_170px_170px]">
          <form onSubmit={submitSearch} className="flex h-10 items-center gap-2 rounded-lg border border-stone-200 px-3">
            <Search size={16} className="text-stone-400" />
            <input
              key={search}
              name="search"
              defaultValue={search}
              placeholder="Tìm tên, email, số điện thoại"
              className="min-w-0 flex-1 text-sm outline-none"
            />
          </form>
          <select value={role} onChange={(event) => updateParams({ role: event.target.value })} className="h-10 rounded-lg border border-stone-200 px-3 text-sm outline-none focus:border-amber-500">
            <option value="">Tất cả vai trò</option>
            {Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select value={status} onChange={(event) => updateParams({ status: event.target.value })} className="h-10 rounded-lg border border-stone-200 px-3 text-sm outline-none focus:border-amber-500">
            <option value="">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Đã khóa</option>
          </select>
        </div>
      </div>

      {isLoading && <div className="overflow-x-auto"><TableSkeleton columns={5} rows={6} className="min-w-[760px]" /></div>}
      {isError && <p className="p-5 text-sm text-red-500">Không thể tải người dùng.</p>}

      {!isLoading && !isError && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase text-stone-400">
              <tr>
                <th className="px-5 py-3">Người dùng</th>
                <th className="px-5 py-3">Vai trò</th>
                <th className="px-5 py-3">Trạng thái</th>
                <th className="px-5 py-3">Ngày tạo</th>
                <th className="px-5 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-stone-900">{user.name}</p>
                    <p className="text-xs text-stone-400">{user.email}</p>
                  </td>
                  <td className="px-5 py-4 text-stone-600">{roleLabels[user.role] || user.role}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${user.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {user.isActive ? 'Đang hoạt động' : 'Đã khóa'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-stone-500">{new Date(user.createdAt).toLocaleDateString('vi-VN')}</td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end">
                      <button
                        onClick={() => updateStatus.mutate({ id: user.id, isActive: !user.isActive })}
                        disabled={updateStatus.isPending}
                        aria-busy={updateStatus.isPending && updateStatus.variables?.id === user.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                      >
                        {updateStatus.isPending && updateStatus.variables?.id === user.id
                          ? <Spinner size="sm" label="Đang cập nhật người dùng..." />
                          : user.isActive ? <Lock size={14} aria-hidden /> : <Unlock size={14} aria-hidden />}
                        {updateStatus.isPending && updateStatus.variables?.id === user.id
                          ? 'Đang cập nhật...'
                          : user.isActive ? 'Khóa' : 'Mở khóa'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!users.length && <p className="p-5 text-center text-sm text-stone-400">Không có người dùng phù hợp.</p>}
        </div>
      )}
    </div>
  );
}

export default AdminUsers;

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, PauseCircle, Search } from 'lucide-react';
import adminApi from '../../api/adminApi';
import Skeleton, { TableSkeleton } from '../../components/ui/Skeleton';
import Spinner from '../../components/ui/Spinner';
import { toast } from '../../components/ui/toastStore';

const statusLabels = {
  pending: 'Chờ duyệt',
  active: 'Đang hoạt động',
  suspended: 'Tạm khóa',
  rejected: 'Từ chối',
};

function AdminShops() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const status = searchParams.get('status') || '';
  const search = searchParams.get('search') || '';

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-shops', status, search],
    queryFn: () => adminApi.getShops({ status: status || undefined, search: search || undefined, limit: 50 }),
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

  const approveShop = useMutation({
    mutationFn: adminApi.approveShop,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-shops'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Đã duyệt gian hàng');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Không thể duyệt gian hàng'),
  });

  const suspendShop = useMutation({
    mutationFn: adminApi.suspendShop,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-shops'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Đã tạm khóa gian hàng');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Không thể tạm khóa gian hàng'),
  });

  const shops = data?.items || [];

  return (
    <div className="rounded-lg border border-stone-200 bg-white shadow-sm" aria-busy={isLoading}>
      <div className="flex flex-col gap-4 border-b border-stone-200 p-5">
        <div>
          <h1 className="text-xl font-bold text-stone-950">Quản lý gian hàng</h1>
          <p className="mt-1 min-h-5 text-sm text-stone-500">
            {isLoading
              ? <Skeleton as="span" className="inline-block h-4 w-40 align-middle" />
              : `${data?.total ?? 0} gian hàng trong hệ thống`}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(240px,1fr)_220px]">
          <form onSubmit={submitSearch} className="flex h-10 items-center gap-2 rounded-lg border border-stone-200 px-3">
            <Search size={16} className="text-stone-400" />
            <input
              key={search}
              name="search"
              defaultValue={search}
              placeholder="Tìm tên shop, slug, địa điểm"
              className="min-w-0 flex-1 text-sm outline-none"
            />
          </form>
          <select
            value={status}
            onChange={(event) => updateParams({ status: event.target.value })}
            className="h-10 rounded-lg border border-stone-200 px-3 text-sm outline-none focus:border-amber-500"
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && <div className="overflow-x-auto"><TableSkeleton columns={5} rows={6} className="min-w-[860px]" /></div>}
      {isError && <p className="p-5 text-sm text-red-500">Không thể tải gian hàng.</p>}

      {!isLoading && !isError && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase text-stone-400">
              <tr>
                <th className="px-5 py-3">Gian hàng</th>
                <th className="px-5 py-3">Chủ shop</th>
                <th className="px-5 py-3">Địa điểm</th>
                <th className="px-5 py-3">Trạng thái</th>
                <th className="px-5 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {shops.map((shop) => (
                <tr key={shop.id}>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-stone-900">{shop.name}</p>
                    <p className="text-xs text-stone-400">{shop.slug}</p>
                  </td>
                  <td className="px-5 py-4 text-stone-600">
                    <p>{shop.owner?.name || '-'}</p>
                    <p className="text-xs text-stone-400">{shop.owner?.email}</p>
                  </td>
                  <td className="px-5 py-4 text-stone-600">{shop.location || '-'}</td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-700">
                      {statusLabels[shop.status] || shop.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      {shop.status !== 'active' && (
                        <button
                          onClick={() => approveShop.mutate(shop.id)}
                          disabled={approveShop.isPending || suspendShop.isPending}
                          aria-busy={approveShop.isPending && approveShop.variables === shop.id}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                        >
                          {approveShop.isPending && approveShop.variables === shop.id
                            ? <Spinner size="sm" label="Đang duyệt gian hàng..." />
                            : <CheckCircle2 size={14} aria-hidden />}
                          {approveShop.isPending && approveShop.variables === shop.id ? 'Đang duyệt...' : 'Duyệt'}
                        </button>
                      )}
                      {shop.status !== 'suspended' && (
                        <button
                          onClick={() => suspendShop.mutate(shop.id)}
                          disabled={approveShop.isPending || suspendShop.isPending}
                          aria-busy={suspendShop.isPending && suspendShop.variables === shop.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-100 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          {suspendShop.isPending && suspendShop.variables === shop.id
                            ? <Spinner size="sm" label="Đang tạm khóa gian hàng..." />
                            : <PauseCircle size={14} aria-hidden />}
                          {suspendShop.isPending && suspendShop.variables === shop.id ? 'Đang khóa...' : 'Tạm khóa'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!shops.length && <p className="p-5 text-center text-sm text-stone-400">Không có gian hàng phù hợp.</p>}
        </div>
      )}
    </div>
  );
}

export default AdminShops;

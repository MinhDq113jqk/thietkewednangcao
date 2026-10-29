import { Form as BsForm, Table as BsTable, Button as BsButton } from 'react-bootstrap';
import { useState } from 'react';
import { useAccountQuery } from '../../../hooks/useAccountQuery';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, PauseCircle, Search } from 'lucide-react';
import adminApi from '../api/adminApi';
import Skeleton, { TableSkeleton } from '../../../components/ui/Skeleton';
import Spinner from '../../../components/ui/Spinner';
import { toast } from '../../../components/ui/toastStore';

const statusLabels = {
  pending: 'Chờ duyệt',
  active: 'Đang hoạt động',
  suspended: 'Tạm khóa',
  rejected: 'Từ chối',
};

function AdminShops() {
  const [reason, setReason] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const status = searchParams.get('status') || '';
  const search = searchParams.get('search') || '';

  const { data, isLoading, isError } = useAccountQuery({
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
    <div className="rounded-3 border border-secondary shadow-sm admin-shops-detail-1" aria-busy={isLoading}>
      <BsForm.Label className="d-block border-bottom p-4 booking-small">Lý do duyệt hoặc tạm khóa (bắt buộc)<BsForm.Control value={reason} onChange={e => setReason(e.target.value)} minLength={5} maxLength={1000} className="mt-2 d-block w-100 rounded border p-2" /></BsForm.Label>
      <div className="d-flex flex-column gap-4 border-bottom border-secondary p-4">
        <div>
          <h1 className="fs-5 fw-bold text-secondary">Quản lý gian hàng</h1>
          <p className="mt-1 booking-small text-secondary admin-shops-detail-2">
            {isLoading
              ? <Skeleton as="span" className="d-inline-block align-middle admin-shops-detail-3" />
              : `${data?.total ?? 0} gian hàng trong hệ thống`}
          </p>
        </div>

        <div className="d-grid gap-3 admin-shops-detail-4">
          <BsForm onSubmit={submitSearch} className="d-flex align-items-center gap-2 rounded-3 border border-secondary px-2 admin-shops-detail-5">
            <Search size={16} className="text-secondary" />
            <BsForm.Control
              key={search}
              name="search"
              defaultValue={search}
              placeholder="Tìm tên shop, slug, địa điểm"
              className="flex-grow-1 booking-small admin-shops-detail-6"
            />
          </BsForm>
          <BsForm.Select
            value={status}
            onChange={(event) => updateParams({ status: event.target.value })}
            className="rounded-3 border border-secondary px-2 booking-small admin-shops-detail-7"
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </BsForm.Select>
        </div>
      </div>

      {isLoading && <div className="overflow-x-auto"><TableSkeleton columns={5} rows={6} className="admin-shops-detail-8" /></div>}
      {isError && <p className="p-4 booking-small text-danger">Không thể tải gian hàng.</p>}

      {!isLoading && !isError && (
        <div className="overflow-x-auto">
          <BsTable responsive hover className="w-100 text-start booking-small admin-shops-detail-9">
            <thead className="bg-secondary-subtle booking-caption text-uppercase text-secondary">
              <tr>
                <th className="px-4 py-2">Gian hàng</th>
                <th className="px-4 py-2">Chủ shop</th>
                <th className="px-4 py-2">Địa điểm</th>
                <th className="px-4 py-2">Trạng thái</th>
                <th className="px-4 py-2 text-end">Thao tác</th>
              </tr>
            </thead>
            <tbody className="admin-shops-detail-10">
              {shops.map((shop) => (
                <tr key={shop.id}>
                  <td className="px-4 py-3">
                    <p className="fw-semibold text-secondary">{shop.name}</p>
                    <p className="booking-caption text-secondary">{shop.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-secondary">
                    <p>{shop.owner?.name || '-'}</p>
                    <p className="booking-caption text-secondary">{shop.owner?.email}</p>
                  </td>
                  <td className="px-4 py-3 text-secondary">{shop.location || '-'}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-pill bg-secondary-subtle px-2 py-1 booking-caption fw-semibold text-secondary">
                      {statusLabels[shop.status] || shop.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="d-flex justify-content-end gap-2">
                      {shop.status !== 'active' && (
                        <BsButton variant="outline-primary" type="submit"
                          onClick={() => approveShop.mutate({ id: shop.id, reason })}
                          disabled={approveShop.isPending || suspendShop.isPending || reason.trim().length < 5}
                          aria-busy={approveShop.isPending && approveShop.variables?.id === shop.id}
                          className="d-inline-flex align-items-center gap-1 px-2 py-2 booking-caption"
                        >
                          {approveShop.isPending && approveShop.variables?.id === shop.id
                            ? <Spinner size="sm" label="Đang duyệt gian hàng..." />
                            : <CheckCircle2 size={14} aria-hidden />}
                          {approveShop.isPending && approveShop.variables?.id === shop.id ? 'Đang duyệt...' : 'Duyệt'}
                        </BsButton>
                      )}
                      {shop.status !== 'suspended' && (
                        <BsButton variant="outline-danger" type="submit"
                          onClick={() => suspendShop.mutate({ id: shop.id, reason })}
                          disabled={approveShop.isPending || suspendShop.isPending || reason.trim().length < 5}
                          aria-busy={suspendShop.isPending && suspendShop.variables?.id === shop.id}
                          className="d-inline-flex align-items-center gap-1 px-2 py-2 booking-caption"
                        >
                          {suspendShop.isPending && suspendShop.variables?.id === shop.id
                            ? <Spinner size="sm" label="Đang tạm khóa gian hàng..." />
                            : <PauseCircle size={14} aria-hidden />}
                          {suspendShop.isPending && suspendShop.variables?.id === shop.id ? 'Đang khóa...' : 'Tạm khóa'}
                        </BsButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </BsTable>
          {!shops.length && <p className="p-4 text-center booking-small text-secondary">Không có gian hàng phù hợp.</p>}
        </div>
      )}
    </div>
  );
}

export default AdminShops;

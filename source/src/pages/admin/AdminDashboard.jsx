import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, Banknote, ClipboardList, Package, Store, Users } from 'lucide-react';
import adminApi from '../../api/adminApi';
import Skeleton from '../../components/ui/Skeleton';

const formatPrice = (value) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value) || 0);

function AdminDashboard() {
  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: adminApi.getStats,
  });

  const cards = [
    { label: 'Người dùng', value: stats?.users?.total ?? 0, detail: `${stats?.users?.active ?? 0} đang hoạt động`, icon: Users },
    { label: 'Gian hàng', value: stats?.shops?.total ?? 0, detail: `${stats?.shops?.pending ?? 0} chờ duyệt`, icon: Store },
    { label: 'Sản phẩm', value: stats?.products?.total ?? 0, detail: `${stats?.products?.active ?? 0} đang bán`, icon: Package },
    { label: 'Đơn hàng', value: stats?.orders?.total ?? 0, detail: 'Tất cả trạng thái', icon: ClipboardList },
    { label: 'GMV tạm tính', value: formatPrice(stats?.revenue?.gmv ?? 0), detail: `Hoa hồng ước tính ${formatPrice(stats?.revenue?.estimatedCommission ?? 0)}`, icon: Banknote },
  ];

  return (
    <div className="flex flex-col gap-6" aria-busy={isLoading}>
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">Admin</p>
        <h1 className="mt-1 text-2xl font-bold text-stone-950">Tổng quan điều hành</h1>
        <p className="mt-1 text-sm text-stone-500">Theo dõi sức khỏe marketplace và xử lý các tác vụ vận hành chính.</p>
      </div>

      {isError && (
        <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-600">
          Không thể tải thống kê admin.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {cards.map(({ label, value, detail, icon: Icon }) => (
          <div key={label} className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-stone-500">{label}</p>
              <Icon size={19} className="text-amber-700" />
            </div>
            {isLoading ? (
              <div className="mt-3 space-y-2" aria-hidden="true">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-3 w-4/5" />
              </div>
            ) : (
              <>
                <p className="mt-3 text-2xl font-bold text-stone-950">{value}</p>
                <p className="mt-1 text-xs text-stone-500">{detail}</p>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {[
          { title: 'Duyệt gian hàng', desc: 'Xem shop pending, duyệt hoặc tạm khóa shop có vấn đề.', to: '/admin/shops' },
          { title: 'Quản lý người dùng', desc: 'Khóa/mở tài khoản buyer, seller, admin khi cần.', to: '/admin/users' },
          { title: 'Theo dõi đơn hàng', desc: 'Quan sát đơn toàn sàn và cập nhật trạng thái vận hành.', to: '/admin/orders' },
        ].map((item) => (
          <Link key={item.to} to={item.to} className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm transition hover:border-amber-300 hover:shadow-md">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-bold text-stone-950">{item.title}</h2>
              <ArrowRight size={18} className="text-amber-700" />
            </div>
            <p className="mt-2 text-sm leading-6 text-stone-500">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default AdminDashboard;

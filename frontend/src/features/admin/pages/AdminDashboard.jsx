import { Button as BsButton } from 'react-bootstrap';
import BsGrid from '../../home/components/ResponsiveGrid';
import { useAccountQuery } from '../../../hooks/useAccountQuery';
import { Link } from 'react-router-dom';
import { ArrowRight, Banknote, ClipboardList, Package, Store, Users } from 'lucide-react';
import adminApi from '../api/adminApi';
import Skeleton from '../../../components/ui/Skeleton';
import RevenueSummary from '../../finance/components/RevenueSummary';

const formatPrice = (value) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value) || 0);

function AdminDashboard() {
  const { data: stats, isLoading, isError, refetch } = useAccountQuery({
    queryKey: ['admin-stats'],
    queryFn: adminApi.getStats,
  });

  const cards = [
    { label: 'Người dùng', value: stats?.users?.total ?? 0, detail: `${stats?.users?.active ?? 0} đang hoạt động`, icon: Users },
    { label: 'Gian hàng', value: stats?.shops?.total ?? 0, detail: `${stats?.shops?.pending ?? 0} chờ duyệt`, icon: Store },
    { label: 'Sản phẩm', value: stats?.products?.total ?? 0, detail: `${stats?.products?.active ?? 0} đang bán`, icon: Package },
    { label: 'Đơn hàng', value: stats?.orders?.total ?? 0, detail: 'Tất cả trạng thái', icon: ClipboardList },
    { label: 'Doanh thu đã đối soát', value: formatPrice(stats?.revenue?.gmv ?? 0), detail: `Hoa hồng theo sổ ${formatPrice(stats?.revenue?.commission ?? 0)}`, icon: Banknote },
  ];

  return (
    <div className="d-flex flex-column gap-4" aria-busy={isLoading}>
      <div>
        <p className="booking-small fw-semibold text-uppercase text-warning admin-dashboard-detail-1">Admin</p>
        <h1 className="mt-1 fs-4 fw-bold text-secondary">Tổng quan điều hành</h1>
        <p className="mt-1 booking-small text-secondary">Theo dõi sức khỏe marketplace và xử lý các tác vụ vận hành chính.</p>
      </div>

      {isError && (
        <div role="alert" className="rounded-3 border border-danger bg-danger-subtle p-3 booking-small text-danger">
          Không thể tải thống kê admin.
          <BsButton variant="outline-primary" type="button" className="ms-2 text-decoration-underline" onClick={() => { void refetch(); }}>Thử lại</BsButton>
        </div>
      )}

      {!isError && <div className="d-grid gap-4 admin-dashboard-detail-2">
        {cards.map(({ label, value, detail, icon: Icon }) => (
          <div key={label} className="rounded-3 border border-secondary p-4 shadow-sm admin-dashboard-detail-3">
            <div className="d-flex align-items-center justify-content-between">
              <p className="booking-small fw-medium text-secondary">{label}</p>
              <Icon size={19} className="text-warning" />
            </div>
            {isLoading ? (
              <div className="mt-2 admin-dashboard-detail-4" aria-hidden="true">
                <Skeleton className="admin-dashboard-detail-5" />
                <Skeleton className="admin-dashboard-detail-6" />
              </div>
            ) : (
              <>
                <p className="mt-2 fs-4 fw-bold text-secondary">{value}</p>
                <p className="mt-1 booking-caption text-secondary">{detail}</p>
              </>
            )}
          </div>
        ))}
      </div>}

      {!isError && <RevenueSummary revenue={stats?.revenue} loading={isLoading} settlementPath="/admin/settlements" />}

      <BsGrid as="div" columns={{"xs":1,"lg":3}} className="">
        {[
          { title: 'Duyệt gian hàng', desc: 'Xem shop pending, duyệt hoặc tạm khóa shop có vấn đề.', to: '/admin/shops' },
          { title: 'Quản lý người dùng', desc: 'Khóa/mở tài khoản buyer, seller, admin khi cần.', to: '/admin/users' },
          { title: 'Theo dõi đơn hàng', desc: 'Quan sát đơn toàn sàn và cập nhật trạng thái vận hành.', to: '/admin/orders' },
        ].map((item) => (
          <Link key={item.to} to={item.to} className="rounded-3 border border-secondary p-4 shadow-sm admin-dashboard-detail-7">
            <div className="d-flex align-items-center justify-content-between gap-4">
              <h2 className="fw-bold text-secondary">{item.title}</h2>
              <ArrowRight size={18} className="text-warning" />
            </div>
            <p className="mt-2 booking-small text-secondary admin-dashboard-detail-8">{item.desc}</p>
          </Link>
        ))}
      </BsGrid>
    </div>
  );
}

export default AdminDashboard;

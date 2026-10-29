import WorkspaceLayout from '../features/home/components/WorkspaceLayout';
import { BarChart3, ClipboardList, CreditCard, Store, Users } from 'lucide-react';

const navItems = [
  { to: '/admin/support', label: 'Hỗ trợ khách hàng', icon: ClipboardList },
  { to: '/admin/operations', label: 'Thông báo và kiểm duyệt', icon: ClipboardList },
  { to: '/admin/dashboard', label: 'Tổng quan', icon: BarChart3 },
  { to: '/admin/shops', label: 'Gian hàng', icon: Store },
  { to: '/admin/users', label: 'Người dùng', icon: Users },
  { to: '/admin/orders', label: 'Đơn hàng', icon: ClipboardList },
  { to: '/admin/payments', label: 'Đối soát thanh toán', icon: CreditCard },
  { to: '/admin/returns', label: 'Đổi trả và khiếu nại', icon: ClipboardList },
  { to: '/admin/refunds', label: 'Hoàn tiền', icon: CreditCard },
  { to: '/admin/cod', label: 'Giao vận và COD', icon: ClipboardList },
  { to: '/admin/settlements', label: 'Quyết toán người bán', icon: CreditCard },
];

function AdminLayout() {
  return <WorkspaceLayout title="Kênh điều hành" items={navItems} />;
}

export default AdminLayout;

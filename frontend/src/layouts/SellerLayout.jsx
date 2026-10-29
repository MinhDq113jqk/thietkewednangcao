import WorkspaceLayout from '../features/home/components/WorkspaceLayout';
import { BarChart3, ClipboardList, DollarSign, MessagesSquare, Package, Store } from 'lucide-react';

const navItems = [
  { to: '/seller/dashboard', label: 'Tổng quan', icon: BarChart3 },
  { to: '/seller/inventory', label: 'Sổ kho', icon: Package },
  { to: '/seller/products', label: 'Sản phẩm', icon: Package },
  { to: '/seller/orders', label: 'Đơn hàng', icon: ClipboardList },
  { to: '/seller/returns', label: 'Đổi trả và khiếu nại', icon: ClipboardList },
  { to: '/seller/cod', label: 'Giao vận và COD', icon: DollarSign },
  { to: '/seller/messages', label: 'Tin nhắn', icon: MessagesSquare },
  { to: '/seller/settings', label: 'Gian hàng', icon: Store },
  { to: '/seller/revenue', label: 'Doanh thu', icon: DollarSign },
  { to: '/seller/settlements', label: 'Quyết toán', icon: DollarSign },
];

function SellerLayout() {
  return <WorkspaceLayout title="Kênh người bán" items={navItems} />;
}

export default SellerLayout;

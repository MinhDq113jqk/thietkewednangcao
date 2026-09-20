import { NavLink, Outlet } from 'react-router-dom';
import { BarChart3, ClipboardList, DollarSign, MessagesSquare, Package, Store } from 'lucide-react';

const navItems = [
  { to: '/seller/dashboard', label: 'Tổng quan', icon: BarChart3 },
  { to: '/seller/products', label: 'Sản phẩm', icon: Package },
  { to: '/seller/orders', label: 'Đơn hàng', icon: ClipboardList },
  { to: '/seller/messages', label: 'Tin nhắn', icon: MessagesSquare },
  { to: '/seller/settings', label: 'Gian hàng', icon: Store },
  { to: '/seller/revenue', label: 'Doanh thu', icon: DollarSign },
];

function SellerLayout() {
  return (
    <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
      <aside className="hidden w-56 shrink-0 md:block">
        <div className="sticky top-28 rounded-lg border border-[#DDE4E0] bg-white p-3 shadow-sm">
          <p className="px-3 pb-3 text-xs font-semibold uppercase text-[#7A8781]">
            Kênh người bán
          </p>
          <nav className="flex flex-col gap-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${
                    isActive ? 'bg-[#E6F3F1] text-[#0F766E]' : 'text-[#405049] hover:bg-[#F0F3F1]'
                  }`
                }
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <nav className="mb-4 flex gap-2 overflow-x-auto pb-1 md:hidden" aria-label="Kênh người bán">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex h-10 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-semibold ${
                  isActive
                    ? 'border-[#0F766E] bg-[#0F766E] text-white'
                    : 'border-[#D5DEDA] bg-white text-[#405049]'
                }`
              }
            >
              <Icon size={15} aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
        <Outlet />
      </main>
    </div>
  );
}

export default SellerLayout;

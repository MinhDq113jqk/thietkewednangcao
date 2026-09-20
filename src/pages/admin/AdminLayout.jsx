import { NavLink, Outlet } from 'react-router-dom';
import { BarChart3, ClipboardList, Store, Users } from 'lucide-react';

const navItems = [
  { to: '/admin/dashboard', label: 'Tổng quan', icon: BarChart3 },
  { to: '/admin/shops', label: 'Gian hàng', icon: Store },
  { to: '/admin/users', label: 'Người dùng', icon: Users },
  { to: '/admin/orders', label: 'Đơn hàng', icon: ClipboardList },
];

function AdminLayout() {
  return (
    <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
      <aside className="hidden w-60 shrink-0 md:block">
        <div className="sticky top-28 rounded-lg border border-stone-200 bg-white p-3 shadow-sm">
          <p className="px-3 pb-3 text-xs font-semibold uppercase tracking-wide text-stone-400">
            Kênh điều hành
          </p>
          <nav className="flex flex-col gap-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
                    isActive ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'
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
        <div className="mb-4 flex gap-2 overflow-x-auto md:hidden">
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `shrink-0 rounded-md border px-4 py-2 text-sm font-semibold ${
                  isActive ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 bg-white text-stone-600'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;

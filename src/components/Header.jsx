import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  Compass,
  Menu,
  Search,
  ShieldCheck,
  ShoppingBag,
  Store,
  UserRound,
  X,
} from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';

const categories = [
  'Gốm sứ',
  'Lụa thêu',
  'Đồ gỗ',
  'Mây tre',
  'Tranh dân gian',
  'Đồ đồng',
  'Nón lá',
  'Tranh thêu',
];

const navLinks = [
  { label: 'Mua sắm', to: '/products' },
  { label: 'Bản đồ văn hóa', to: '/explore' },
  { label: 'Đơn hàng', to: '/orders' },
  { label: 'Tin nhắn', to: '/messages' },
  { label: 'Câu chuyện', to: '/blogs' },
];

function Header() {
  const navigate = useNavigate();
  const accountRef = useRef(null);
  const [query, setQuery] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const cartCount = useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.quantity, 0)
  );
  const { user, logout } = useAuthStore();

  useEffect(() => {
    const closeAccount = (event) => {
      if (!accountRef.current?.contains(event.target)) setAccountOpen(false);
    };
    document.addEventListener('pointerdown', closeAccount);
    return () => document.removeEventListener('pointerdown', closeAccount);
  }, []);

  const handleSearch = (event) => {
    event.preventDefault();
    const search = query.trim();
    if (!search) return;
    navigate(`/products?search=${encodeURIComponent(search)}`);
    setQuery('');
  };

  const handleLogout = async () => {
    try {
      await axiosInstance.post('/auth/logout');
    } finally {
      logout();
      navigate('/');
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[#DDE4E0] bg-white">
      <div className="bg-[#0F766E] text-white">
        <div className="mx-auto flex h-8 max-w-7xl items-center justify-center px-4 text-center text-[11px] font-medium sm:justify-between">
          <span>Quà Việt chọn lọc, giao hàng toàn quốc</span>
          <span className="hidden sm:inline">Kết nối trực tiếp với làng nghề và xưởng thủ công</span>
        </div>
      </div>

      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
        <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="SouvenirShop - Trang chủ">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#17201D] text-[#F2C14E]">
            <Compass size={21} aria-hidden />
          </span>
          <span className="block">
            <span className="block font-display text-base font-bold leading-none text-[#17201D] sm:text-lg">SouvenirShop</span>
            <span className="mt-1 hidden text-[9px] font-semibold uppercase text-[#0F766E] sm:block">Chạm vào bản sắc Việt</span>
          </span>
        </Link>

        <form
          onSubmit={handleSearch}
          className="mx-auto hidden h-10 max-w-xl flex-1 items-center rounded-lg border border-[#D8E0DC] bg-[#F7F8F5] pl-3 focus-within:border-[#0F766E] md:flex"
          role="search"
        >
          <Search size={17} className="text-[#7A8781]" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm gốm, tranh, quà theo vùng..."
            className="min-w-0 flex-1 bg-transparent px-2 text-sm text-[#17201D] outline-none"
            aria-label="Tìm kiếm sản phẩm"
          />
          <button
            type="submit"
            className="mr-1 flex h-8 w-9 items-center justify-center rounded-md bg-[#0F766E] text-white hover:bg-[#0B5F58]"
            aria-label="Tìm kiếm"
          >
            <Search size={16} aria-hidden />
          </button>
        </form>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className="relative px-2 py-2 text-sm font-medium text-[#4D5A55] transition hover:text-[#0F766E] aria-[current=page]:font-bold aria-[current=page]:text-[#0F766E] aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-2 aria-[current=page]:after:-bottom-1 aria-[current=page]:after:h-0.5 aria-[current=page]:after:bg-[#F2C14E]"
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1" role="group" aria-label="Tác vụ">
          <Link
            to={user?.role === 'seller' ? '/seller/dashboard' : '/seller/register'}
            className="hidden h-9 items-center gap-2 rounded-md border border-[#D8E0DC] px-3 text-xs font-semibold text-[#33413B] hover:border-[#0F766E] hover:text-[#0F766E] xl:flex"
          >
            <Store size={16} aria-hidden />
            Bán hàng
          </Link>

          <Link
            to="/cart"
            className="relative flex h-10 w-10 items-center justify-center rounded-md text-[#33413B] hover:bg-[#EEF4F1] hover:text-[#0F766E]"
            aria-label={`Giỏ hàng có ${cartCount} sản phẩm`}
          >
            <ShoppingBag size={21} aria-hidden />
            {cartCount > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#C93F2C] px-1 text-[9px] font-bold text-white">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </Link>

          {user ? (
            <div ref={accountRef} className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setAccountOpen((open) => !open)}
                className="flex h-10 items-center gap-1.5 rounded-md px-2 text-[#33413B] hover:bg-[#EEF4F1]"
                aria-expanded={accountOpen}
                aria-haspopup="menu"
              >
                <UserRound size={20} aria-hidden />
                <span className="hidden max-w-20 truncate text-xs font-semibold xl:block">
                  {user.name?.split(' ').pop()}
                </span>
                <ChevronDown size={14} aria-hidden />
              </button>
              {accountOpen && (
                <div
                  className="absolute right-0 top-12 w-52 rounded-lg border border-[#DDE4E0] bg-white p-1.5 shadow-[0_16px_40px_rgba(23,32,29,0.14)]"
                  role="menu"
                  onClick={() => setAccountOpen(false)}
                >
                  <Link to="/profile" className="block rounded-md px-3 py-2 text-sm text-[#33413B] hover:bg-[#EEF4F1]" role="menuitem">
                    Hồ sơ cá nhân
                  </Link>
                  <Link to="/orders" className="block rounded-md px-3 py-2 text-sm text-[#33413B] hover:bg-[#EEF4F1]" role="menuitem">
                    Đơn hàng của tôi
                  </Link>
                  {user.role === 'seller' && (
                    <Link to="/seller/dashboard" className="block rounded-md px-3 py-2 text-sm text-[#33413B] hover:bg-[#EEF4F1]" role="menuitem">
                      Kênh người bán
                    </Link>
                  )}
                  {user.role === 'admin' && (
                    <Link to="/admin/dashboard" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-[#33413B] hover:bg-[#EEF4F1]" role="menuitem">
                      <ShieldCheck size={15} aria-hidden />
                      Quản trị
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="mt-1 w-full rounded-md border-t border-[#EDF1EF] px-3 py-2 text-left text-sm font-medium text-[#C93F2C] hover:bg-[#FFF1EE]"
                    role="menuitem"
                  >
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="hidden h-9 items-center gap-2 rounded-md bg-[#17201D] px-3 text-xs font-semibold text-white hover:bg-[#26342E] sm:flex"
            >
              <UserRound size={16} aria-hidden />
              Đăng nhập
            </Link>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center rounded-md text-[#33413B] hover:bg-[#EEF4F1] lg:hidden"
            aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
          </button>
        </div>
      </div>

      <div className="border-t border-[#EDF1EF] px-4 py-2 md:hidden">
        <form
          onSubmit={handleSearch}
          className="mx-auto flex h-10 max-w-7xl items-center rounded-lg bg-[#F0F3F1] px-3"
          role="search"
        >
          <Search size={16} className="text-[#7A8781]" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm món quà Việt..."
            className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none"
            aria-label="Tìm kiếm sản phẩm"
          />
        </form>
      </div>

      <nav className="hidden overflow-x-auto border-t border-[#EDF1EF] bg-[#FAFBF9] md:block" aria-label="Danh mục sản phẩm">
        <div className="mx-auto flex max-w-7xl items-center px-4">
          {categories.map((category) => (
            <Link
              key={category}
              to={`/products?category=${encodeURIComponent(category)}`}
              className="shrink-0 border-b-2 border-transparent px-3 py-2 text-xs font-medium text-[#64716B] hover:border-[#F2C14E] hover:text-[#17201D]"
            >
              {category}
            </Link>
          ))}
        </div>
      </nav>

      {mobileOpen && (
        <div
          className="border-t border-[#DDE4E0] bg-white p-4 shadow-lg lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <nav className="grid gap-1" aria-label="Main">
            <NavLink
              to="/"
              end
              className="rounded-md border-l-2 border-transparent px-3 py-3 text-sm font-semibold text-[#17201D] hover:bg-[#EEF4F1] aria-[current=page]:border-[#F2C14E] aria-[current=page]:bg-[#E6F3F1] aria-[current=page]:text-[#0F766E]"
            >
              Trang chủ
            </NavLink>
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className="rounded-md border-l-2 border-transparent px-3 py-3 text-sm font-semibold text-[#17201D] hover:bg-[#EEF4F1] aria-[current=page]:border-[#F2C14E] aria-[current=page]:bg-[#E6F3F1] aria-[current=page]:text-[#0F766E]"
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-3 grid gap-1 border-t border-[#EDF1EF] pt-3" role="group" aria-label="Tác vụ di động">
            <Link
              to={user?.role === 'seller' ? '/seller/dashboard' : '/seller/register'}
              className="flex items-center gap-2 rounded-md bg-[#EEF4F1] px-3 py-3 text-sm font-semibold text-[#0F766E]"
            >
              <Store size={17} aria-hidden />
              {user?.role === 'seller' ? 'Kênh người bán' : 'Mở gian hàng'}
            </Link>
            {user ? (
              <>
                <Link to="/profile" className="rounded-md px-3 py-3 text-sm font-semibold text-[#17201D] hover:bg-[#EEF4F1]">Hồ sơ cá nhân</Link>
                <button type="button" onClick={handleLogout} className="rounded-md px-3 py-3 text-left text-sm font-semibold text-[#C93F2C] hover:bg-[#FFF1EE]">
                  Đăng xuất
                </button>
              </>
            ) : (
              <Link to="/login" className="mt-2 rounded-md bg-[#17201D] px-3 py-3 text-center text-sm font-semibold text-white">
                Đăng nhập / Đăng ký
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;

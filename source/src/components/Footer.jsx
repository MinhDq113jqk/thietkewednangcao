import { Compass, CreditCard, MapPin, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const buyerLinks = [
  { to: '/products', label: 'Khám phá sản phẩm' },
  { to: '/orders', label: 'Theo dõi đơn hàng' },
  { to: '/policy', label: 'Đổi trả và bảo mật' },
];

const sellerLinks = [
  { to: '/seller/register', label: 'Mở gian hàng' },
  { to: '/seller', label: 'Kênh người bán' },
  { to: '/about', label: 'Về SouvenirShop' },
];

function Footer() {
  return (
    <footer className="mt-16 bg-[#17201D] text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-[1.35fr_0.8fr_0.8fr_1fr]">
        <div>
          <Link to="/" className="inline-flex items-center gap-2" aria-label="SouvenirShop">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#F2C14E] text-[#17201D]">
              <Compass size={21} aria-hidden />
            </span>
            <span className="font-display text-xl font-bold">SouvenirShop</span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-6 text-[#C8D1CD]">
            Nơi những món quà Việt có nguồn gốc rõ ràng được tìm thấy, gìn giữ và đi xa hơn.
          </p>
          <div className="mt-5 flex flex-wrap gap-4 text-xs font-semibold text-[#DCE4E0]">
            <span className="flex items-center gap-1.5"><ShieldCheck size={15} className="text-[#5FD0C4]" />Giao dịch bảo vệ</span>
            <span className="flex items-center gap-1.5"><MapPin size={15} className="text-[#60A5FA]" />Theo dõi vận chuyển</span>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-bold">Dành cho người mua</h2>
          <nav className="mt-4 grid gap-3">
            {buyerLinks.map((link) => (
              <Link key={link.to} to={link.to} className="text-sm text-[#B7C2BD] hover:text-white">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div>
          <h2 className="text-sm font-bold">Dành cho người bán</h2>
          <nav className="mt-4 grid gap-3">
            {sellerLinks.map((link) => (
              <Link key={link.to} to={link.to} className="text-sm text-[#B7C2BD] hover:text-white">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div>
          <h2 className="text-sm font-bold">Thanh toán được hỗ trợ</h2>
          <div className="mt-4 flex gap-2">
            <span className="rounded-md border border-[#405049] px-3 py-2 text-xs font-bold text-[#DCE4E0]">COD</span>
            <span className="flex items-center gap-1.5 rounded-md border border-[#405049] px-3 py-2 text-xs font-bold text-[#DCE4E0]">
              <CreditCard size={14} aria-hidden />
              VietQR
            </span>
          </div>
          <Link to="/contact" className="mt-5 inline-block text-sm font-semibold text-[#5FD0C4] hover:text-white">
            Liên hệ hỗ trợ
          </Link>
        </div>
      </div>

      <div className="border-t border-[#33413B]">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 text-xs text-[#91A09A] sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} SouvenirShop</span>
          <span>Thiết kế cho hành trình khám phá quà Việt</span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;

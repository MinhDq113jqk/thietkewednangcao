import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';
import Dropdown from 'react-bootstrap/Dropdown';
import Badge from 'react-bootstrap/Badge';
import Collapse from 'react-bootstrap/Collapse';
import { Menu, ShoppingBag, UserRound } from 'lucide-react';
import axiosInstance from '../services/axiosInstance';
import useCartStore from '../features/cart/store/cartStore';
import useAuthStore from '../features/auth/store/authStore';
import { toast } from '../components/ui/toastStore';

const navLinks = [
  ['Mua sắm', '/products'], ['Bản đồ văn hóa', '/explore'],
  ['Đơn hàng', '/orders'], ['Tin nhắn', '/messages'], ['Câu chuyện', '/blogs'],
];

export default function Header() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const cartCount = useCartStore(state => state.items.reduce((sum, item) => sum + item.quantity, 0));
  const { user, logout } = useAuthStore();
  const sellerUrl = ['seller', 'admin'].includes(user?.role) ? '/seller/dashboard' : '/seller/register';
  const logoutNow = async () => {
    setLoggingOut(true);
    try {
      await axiosInstance.post('/auth/logout');
      logout();
      setMobileOpen(false);
      navigate('/');
    } catch {
      toast.error('Chưa thể kết thúc phiên trên máy chủ. Vui lòng thử lại.');
    } finally { setLoggingOut(false); }
  };
  const accountLinks = [['Hồ sơ cá nhân', '/profile'], ['Đơn hàng của tôi', '/orders'], ['Hỗ trợ của tôi', '/support'], ['Thông báo', '/notifications']];
  if (user?.role === 'seller') accountLinks.push(['Kênh người bán', '/seller/dashboard']);
  if (user?.role === 'admin') accountLinks.push(['Quản trị', '/admin/dashboard']);
  return <header className="bs-ui booking-header">
    <Container>
      <div className="booking-top">
        <Link to="/" className="booking-brand" aria-label="SouvenirShop - Trang chủ">SouvenirShop</Link>
        <div className="booking-actions">
          <span className="booking-desktop" aria-label="Tiền tệ Việt Nam đồng">VND</span>
          <Button as={Link} to={sellerUrl} variant="outline-light" className="booking-desktop">Mở gian hàng</Button>
          <Button as={Link} role="link" to="/cart" variant="outline-light" aria-label={`Giỏ hàng có ${cartCount} sản phẩm`}>
            <ShoppingBag size={20} aria-hidden="true" /><Badge bg="light" text="dark">{cartCount > 99 ? '99+' : cartCount}</Badge>
          </Button>
          {user ? <Dropdown className="booking-desktop">
            <Dropdown.Toggle variant="outline-light" id="account-menu" aria-haspopup="menu"><UserRound size={18} aria-hidden="true" />Tài khoản</Dropdown.Toggle>
            <Dropdown.Menu align="end" role="menu">
              {accountLinks.map(([label,to]) => <Dropdown.Item as={Link} role="menuitem" key={to} to={to}>{label}</Dropdown.Item>)}
              <Dropdown.Divider />
              <Dropdown.Item as="button" role="menuitem" onClick={logoutNow} disabled={loggingOut}>{loggingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown> : <Button as={Link} role="link" to="/login" variant="light" className="booking-desktop">Đăng nhập</Button>}
          <Button variant="outline-light" className="booking-mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)} aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu'} aria-controls="mobile-menu" aria-expanded={mobileOpen}><Menu size={20} aria-hidden="true" /></Button>
        </div>
      </div>
      <nav className="booking-nav" aria-label="Main">{navLinks.map(([label,to]) => <NavLink key={to} to={to}>{label}</NavLink>)}</nav>
      <Collapse in={mobileOpen}><div id="mobile-menu" className="booking-mobile-menu">
        <Link to={sellerUrl} onClick={() => setMobileOpen(false)}>Mở gian hàng</Link>
        {user ? <>{accountLinks.map(([label,to]) => <Link key={to} to={to} onClick={() => setMobileOpen(false)}>{label}</Link>)}<Button variant="outline-light" onClick={logoutNow} disabled={loggingOut}>Đăng xuất</Button></> : <Link to="/login" onClick={() => setMobileOpen(false)}>Đăng nhập / Đăng ký</Link>}
      </div></Collapse>
    </Container>
  </header>;
}

import { Link } from 'react-router-dom';
import { Container, Row, Col } from 'react-bootstrap';
const groups = [
  ['Hỗ trợ', [['/support', 'Trung tâm hỗ trợ'], ['/orders', 'Theo dõi đơn hàng'], ['/contact', 'Liên hệ']]],
  ['Khám phá', [['/products', 'Tất cả sản phẩm'], ['/explore', 'Bản đồ văn hóa'], ['/blogs', 'Câu chuyện làng nghề']]],
  ['Tài khoản', [['/profile', 'Thông tin cá nhân'], ['/notifications', 'Thông báo'], ['/messages', 'Tin nhắn']]],
  ['Đối tác', [['/seller/register', 'Mở gian hàng'], ['/seller', 'Kênh người bán'], ['/seller/products', 'Quản lý sản phẩm']]],
  ['Về SouvenirShop', [['/about', 'Về chúng tôi'], ['/policy', 'Điều khoản và bảo mật'], ['/policy', 'Thanh toán và đổi trả']]],
];
export default function Footer() {
  return <footer className="bs-ui booking-footer"><Container>
    <nav aria-label="Liên kết cuối trang"><Row xs={1} sm={2} lg={5} className="g-4">{groups.map(([title, links]) => <Col key={title}><h2 className="h6 fw-bold">{title}</h2><ul className="list-unstyled mb-0">{links.map(([to, label]) => <li key={label}><Link to={to}>{label}</Link></li>)}</ul></Col>)}</Row></nav>
    <div className="booking-footer-bottom"><Link to="/" className="fw-bold">SouvenirShop</Link><span>Thanh toán: COD · VietQR</span><small>©SouvenirShop</small></div>
  </Container></footer>;
}

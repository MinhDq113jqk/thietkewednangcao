import { Container as BsContainer } from 'react-bootstrap';
import { ArrowLeft, Compass, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <BsContainer as="main" className="d-flex flex-column align-items-center justify-content-center py-5 text-center booking-compact not-found-page-detail-1">
      <span className="d-flex align-items-center justify-content-center rounded-3 bg-primary-subtle text-primary not-found-page-detail-2">
        <Compass size={28} aria-hidden />
      </span>
      <p className="mt-4 booking-caption fw-bold text-uppercase text-danger">Lỗi 404</p>
      <h1 className="mt-2 booking-title fs-2 fw-semibold text-dark">Trang này không còn ở đây.</h1>
      <p className="mt-3 booking-small text-secondary not-found-page-detail-3">
        Đường dẫn có thể đã thay đổi. Bạn có thể trở về trang chủ hoặc tiếp tục tìm món quà phù hợp.
      </p>
      <div className="mt-5 d-flex flex-wrap justify-content-center gap-3">
        <Link to="/" className="d-inline-flex align-items-center gap-2 rounded-3 border px-4 booking-small fw-bold text-body not-found-page-detail-4">
          <ArrowLeft size={17} aria-hidden />
          Về trang chủ
        </Link>
        <Link to="/products" className="d-inline-flex align-items-center gap-2 rounded-3 bg-primary px-4 booking-small fw-bold not-found-page-detail-5">
          <Search size={17} aria-hidden />
          Tìm sản phẩm
        </Link>
      </div>
    </BsContainer>
  );
}

export default NotFoundPage;

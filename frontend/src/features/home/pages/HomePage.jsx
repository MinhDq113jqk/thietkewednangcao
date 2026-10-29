import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Alert, Button, Card, Col, Container, Row } from 'react-bootstrap';
import { BadgeCheck, Box, Image, KeyRound, Leaf, MapPin, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import productApi from '../../products/api/productApi';
import cultureApi from '../../culture/api/cultureApi';
import BookingHero from '../components/BookingHero';
import HomeCollections from '../components/HomeCollections';
import ProductImage from '../../products/components/ProductImage';
import DemoImage from '../../../components/ui/DemoImage';
import ProductCard from '../../products/components/ProductCard';
import { ProductCardSkeleton } from '../../../components/ui/Skeleton';
import RecommendationSection from '../../products/components/RecommendationSection';
import useCartStore from '../../cart/store/cartStore';
import useAuthStore from '../../auth/store/authStore';
import { getProductImages, normalizeCategory } from '../../../../../backend/src/shared/productCatalog.mjs';

const categories = [
  { name: normalizeCategory('Gốm'), icon: Box, caption: 'Men gốm và đồ trang trí' },
  { name: normalizeCategory('Tranh'), icon: Image, caption: 'Những góc nhìn về Việt Nam' },
  { name: normalizeCategory('Móc khóa'), icon: KeyRound, caption: 'Món quà nhỏ để mang theo' },
  { name: normalizeCategory('Mây tre'), icon: Leaf, caption: 'Đan từ chất liệu tự nhiên' },
];
const benefits = [
  { icon: BadgeCheck, title: 'Nguồn gốc rõ ràng', text: 'Xem gian hàng và nơi làm ra sản phẩm.' },
  { icon: Sparkles, title: 'Tìm quà theo sở thích', text: 'Khám phá chất liệu, danh mục và mức giá.' },
  { icon: ShieldCheck, title: 'Chủ động theo dõi đơn', text: 'Xem trạng thái và gửi yêu cầu hỗ trợ.' },
  { icon: Truck, title: 'Theo dõi hành trình', text: 'Tra cứu vận chuyển sau khi gửi hàng.' },
];

export default function HomePage() {
  const addItem = useCartStore(state => state.addItem);
  const authenticated = useAuthStore(state => state.isAuthenticated);
  const popular = useQuery({ queryKey: ['home-popular-products'], queryFn: () => productApi.getProducts({ limit: 8, sort: 'sold_desc' }), staleTime: 60_000, retry: 1 });
  const regions = useQuery({ queryKey: ['culture-regions'], queryFn: cultureApi.getRegions, staleTime: 300_000, retry: 1 });
  return <main className="bs-ui booking-home">
    <BookingHero />
    <Container>
      <section className="booking-section booking-benefits" aria-label="Mua sắm tại SouvenirShop">
        <Row xs={1} sm={2} lg={4} className="g-4">{benefits.map(({ icon: Icon, title, text }) => <Col key={title}><div className="d-flex gap-3"><Icon className="booking-benefit-icon" size={28} aria-hidden="true" /><div><h2 className="h6 fw-bold">{title}</h2><p className="small text-secondary mb-0">{text}</p></div></div></Col>)}</Row>
      </section>
      <section className="booking-section" aria-labelledby="home-discover">
        <h2 id="home-discover">Lên ý tưởng cho món quà tiếp theo</h2><p className="text-secondary">Chọn quà theo ngân sách hoặc tìm câu chuyện từ một làng nghề.</p>
        <Row className="g-3"><Col md={6}><Card className="h-100 booking-offer"><DemoImage imageId="bat-trang-pottery" /><Card.Body><h3 className="h5 fw-bold">Món quà nhỏ, nhiều ý nghĩa</h3><p>Khám phá những sản phẩm có giá đến 100.000 ₫.</p><Button as={Link} to="/products?maxPrice=100000">Tìm quà vừa túi tiền</Button></Card.Body></Card></Col><Col md={6}><Card className="h-100 booking-offer booking-offer-culture"><DemoImage imageId="hoi-an-lanterns" /><Card.Body><h3 className="h5 fw-bold">Ghé thăm những vùng làm nghề</h3><p>Từ câu chuyện của nghệ nhân đến món quà bạn mang về.</p><Button as={Link} to="/explore" variant="outline-primary">Khám phá bản đồ văn hóa</Button></Card.Body></Card></Col></Row>
      </section>
      <section className="booking-section" aria-labelledby="home-regions" aria-busy={regions.isLoading}>
        <div className="booking-section-heading"><div><h2 id="home-regions">Mỗi vùng, một dấu ấn</h2><p className="text-secondary">Khám phá những vùng văn hóa và làng nghề Việt Nam.</p></div><Link to="/explore">Xem bản đồ</Link></div>
        {regions.isLoading && <p role="status">Đang tải vùng văn hóa…</p>}
        {regions.isError && <Alert variant="warning">Chưa tải được vùng văn hóa. <Button variant="outline-primary" onClick={() => regions.refetch()}>Tải lại vùng văn hóa</Button></Alert>}
        {!regions.isLoading && !regions.isError && !regions.data?.items?.length && <p className="text-secondary">Các câu chuyện vùng miền đang được cập nhật.</p>}
        <Row className="g-3 booking-destinations">{(regions.data?.items || []).slice(0, 5).map((region, index) => <Col xs={12} md={index < 2 ? 6 : 4} key={region.id || region.slug}><Link className="booking-destination" to={`/culture/${region.slug}`}>
          {region.heroMedia && !/\.(mp4|webm)(\?.*)?$/i.test(region.heroMedia) && <img src={region.heroMedia} alt="" loading="lazy" onError={event => { event.currentTarget.style.display = 'none'; }} />}
          <span><strong><MapPin size={20} aria-hidden="true" /> {region.name}</strong><small>{region.shortDescription || 'Khám phá câu chuyện và sản phẩm địa phương'}</small></span>
        </Link></Col>)}</Row>
      </section>
      <section className="booking-section" aria-labelledby="home-popular" aria-busy={popular.isLoading}>
        <div className="booking-section-heading"><div><h2 id="home-popular">Những món quà được chọn nhiều</h2><p className="text-secondary">Tìm sản phẩm từ những gian hàng trên SouvenirShop.</p></div><Link to="/products?sort=sold_desc">Xem thêm</Link></div>
        {popular.isError && <Alert variant="warning">Chưa tải được sản phẩm. <Button variant="outline-primary" onClick={() => popular.refetch()}>Thử lại</Button></Alert>}
        {!popular.isLoading && !popular.isError && !popular.data?.items?.length && <p role="status">Chưa có sản phẩm phù hợp. Hãy thử danh mục khác.</p>}
        <Row xs={1} sm={2} lg={4} className="g-3">{popular.isLoading ? Array.from({ length: 8 }, (_, index) => <Col key={index}><ProductCardSkeleton /></Col>) : (popular.data?.items || []).map(product => <Col key={product.id}><ProductCard product={product} onAddToCart={addItem} /></Col>)}</Row>
      </section>
      <section className="booking-section" aria-labelledby="home-categories"><h2 id="home-categories">Tìm theo loại quà</h2><p className="text-secondary">Bắt đầu từ chất liệu hoặc món đồ bạn yêu thích.</p><Row xs={1} sm={2} lg={4} className="g-3">{categories.map(({ name, icon: Icon, caption }) => <Col key={name}><Card as={Link} to={`/products?category=${encodeURIComponent(name)}`} className="booking-category h-100"><span className="booking-collection-image"><ProductImage src={getProductImages((popular.data?.items || []).find(product => normalizeCategory(product.category) === name) || {})[0]} alt={name} loading="lazy" /></span><Card.Body><Icon size={24} aria-hidden="true" /><h3 className="h5 fw-bold mt-3">{name}</h3><p className="text-secondary mb-0">{caption}</p></Card.Body></Card></Col>)}</Row></section>
      <HomeCollections products={popular.data?.items || []} regions={regions.data?.items || []} loading={popular.isLoading} failed={popular.isError} />
      <RecommendationSection className="booking-section" />
      <section className="booking-section"><Card className="booking-account-banner"><Card.Body><h2>{authenticated ? 'Tiếp tục hành trình của bạn' : 'Lưu lại hành trình tìm quà của bạn'}</h2><p>Theo dõi đơn hàng, lưu địa chỉ và liên hệ gian hàng trong tài khoản.</p><Button as={Link} to={authenticated ? '/orders' : '/login'}>{authenticated ? 'Xem đơn hàng' : 'Đăng nhập hoặc đăng ký'}</Button></Card.Body></Card></section>
      <section className="booking-section"><Row className="align-items-center g-3"><Col md={8}><h2>Bạn làm ra những món quà Việt?</h2><p className="text-secondary mb-0">Giới thiệu sản phẩm và quản lý gian hàng của bạn tại SouvenirShop.</p></Col><Col md={4} className="text-md-end"><Button as={Link} variant="outline-primary" to="/seller/register">Mở gian hàng</Button></Col></Row></section>
      <section className="booking-section" aria-labelledby="home-popular-links"><h2 id="home-popular-links">Bắt đầu khám phá</h2><Row xs={1} sm={2} lg={4} className="g-3"><Col><h3 className="h6 fw-bold">Loại quà</h3>{categories.map(({name}) => <Link className="d-block py-2" key={name} to={`/products?category=${encodeURIComponent(name)}`}>{name}</Link>)}</Col><Col><h3 className="h6 fw-bold">Ngân sách</h3>{[100000,300000,500000].map(price => <Link className="d-block py-2" key={price} to={`/products?maxPrice=${price}`}>Đến {price.toLocaleString('vi-VN')} ₫</Link>)}</Col><Col><h3 className="h6 fw-bold">Văn hóa Việt</h3><Link className="d-block py-2" to="/explore">Bản đồ làng nghề</Link><Link className="d-block py-2" to="/blogs">Câu chuyện và cảm hứng</Link></Col><Col><h3 className="h6 fw-bold">Mua sắm</h3><Link className="d-block py-2" to="/products?sort=newest">Sản phẩm mới</Link><Link className="d-block py-2" to="/products?sort=sold_desc">Sản phẩm được chọn nhiều</Link><Link className="d-block py-2" to="/policy">Chính sách thanh toán và đổi trả</Link></Col></Row></section>
    </Container>
  </main>;
}

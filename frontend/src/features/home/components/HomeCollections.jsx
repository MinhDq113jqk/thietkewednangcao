import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, Col, Row } from 'react-bootstrap';
import ProductImage from '../../products/components/ProductImage';
import { getProductImages } from '../../../../../backend/src/shared/productCatalog.mjs';

const plans = [
  { label: 'Quà nhỏ', max: 100000 },
  { label: 'Quà tặng vừa túi', max: 300000 },
  { label: 'Tất cả ngân sách', max: null },
];
export default function HomeCollections({ products, regions, loading, failed }) {
  const [planIndex, setPlanIndex] = useState(1);
  const plan = plans[planIndex];
  const matches = products.filter(p => plan.max === null || Number(p.salePrice ?? p.price) <= plan.max).slice(0, 6);
  const shops = [...new Map(products.filter(p => p.shop?.slug).map(p => [p.shop.slug, { ...p.shop, image: p.shop.logo || getProductImages(p)[0] }])).values()].slice(0, 4);
  return <>
    <section className="booking-section" aria-labelledby="home-quick-plan">
      <h2 id="home-quick-plan">Tìm nhanh một món quà</h2>
      <p className="text-secondary">Gợi ý từ các sản phẩm đang hiển thị; mở danh sách để xem đầy đủ.</p>
      <div className="d-flex flex-wrap gap-2 mb-3" role="group" aria-label="Chọn ngân sách gợi ý">
        {plans.map((item, index) => <Button key={item.label} variant="outline-primary" className="rounded-pill" aria-pressed={planIndex === index} onClick={() => setPlanIndex(index)}>{item.label}</Button>)}
      </div>
      <div aria-live="polite" aria-busy={loading}>
        {loading ? <p role="status">Đang tải gợi ý…</p> : failed ? <p>Chưa tải được gợi ý. Hãy dùng nút thử lại ở phần sản phẩm phía trên.</p> : matches.length === 0 ? <p>Chưa có gợi ý trong khoảng giá này. Bạn có thể chọn ngân sách khác.</p> : <Row xs={2} md={3} lg={6} className="g-3">{matches.map(product => <Col key={product.id}><Link className="booking-mini-card" to={`/products/${product.id}`}><span className="booking-collection-image"><ProductImage src={getProductImages(product)[0]} alt={product.name} loading="lazy" /></span><strong>{product.name}</strong><small>{product.category}</small></Link></Col>)}</Row>}
      </div>
      <Button as={Link} className="mt-3" variant="outline-primary" to={plan.max === null ? '/products' : `/products?maxPrice=${plan.max}`}>Xem đầy đủ theo ngân sách</Button>
    </section>
    {regions.length > 0 && <section className="booking-section" aria-labelledby="home-explore-regions"><h2 id="home-explore-regions">Khám phá Việt Nam qua những món quà</h2><p className="text-secondary">Chọn vùng để đọc câu chuyện và xem làng nghề.</p><Row xs={2} md={3} lg={6} className="g-3">{regions.slice(0, 6).map(region => <Col key={region.slug}><Link className="booking-mini-card" to={`/culture/${region.slug}`}><span className="booking-collection-image"><ProductImage src={/\.(mp4|webm)(\?.*)?$/i.test(region.heroMedia || '') ? null : region.heroMedia} alt={region.name} loading="lazy" /></span><strong>{region.name}</strong><small>Khám phá vùng văn hóa</small></Link></Col>)}</Row></section>}
    {shops.length > 0 && <section className="booking-section" aria-labelledby="home-shops"><div className="booking-section-heading"><div><h2 id="home-shops">Ghé thăm các gian hàng</h2><p className="text-secondary">Những gian hàng có sản phẩm trong lựa chọn phía trên.</p></div><Link to="/products">Khám phá sản phẩm</Link></div><Row xs={1} sm={2} lg={4} className="g-3">{shops.map(shop => <Col key={shop.slug}><Card as={Link} to={`/shop/${shop.slug}`} className="booking-category h-100"><span className="booking-collection-image"><ProductImage src={shop.image} alt={shop.name} loading="lazy" /></span><Card.Body><h3 className="h6 fw-bold">{shop.name}</h3><p className="small text-secondary mb-0">Xem thông tin và sản phẩm</p></Card.Body></Card></Col>)}</Row></section>}
  </>;
}

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Alert, Button, Card, Col, Container, Form, Row } from 'react-bootstrap';
import axiosInstance from '../../../services/axiosInstance';
import ListPaging from '../../../components/ui/ListPaging';
import ProductCard from '../../products/components/ProductCard';
import { ProductCardSkeleton } from '../../../components/ui/Skeleton';
import useCartStore from '../../cart/store/cartStore';

export default function ShopPage() {
  const { slug } = useParams();
  const [filter, setFilter] = useState({ page: 1, search: '' });
  const addItem = useCartStore(state => state.addItem);
  const shopQuery = useQuery({ queryKey: ['shop', slug], queryFn: () => axiosInstance.get(`/shops/${slug}`).then(r => r.data), enabled: Boolean(slug) });
  const productsQuery = useQuery({ queryKey: ['shop-products', slug, filter], queryFn: () => axiosInstance.get(`/shops/${slug}/products`, { params: filter }).then(r => r.data), enabled: Boolean(slug) && shopQuery.isSuccess });
  if (shopQuery.isLoading) return <Container as="main" className="bs-ui py-5" aria-busy="true"><p role="status">Đang tải gian hàng…</p><Row xs={1} md={4} className="g-3">{Array.from({ length: 4 }, (_, i) => <Col key={i}><ProductCardSkeleton /></Col>)}</Row></Container>;
  if (shopQuery.isError || !shopQuery.data) return <Container as="main" className="bs-ui py-5"><h1 className="h3">Không tìm thấy gian hàng</h1><p>Gian hàng có thể đang được xét duyệt hoặc đường dẫn đã thay đổi.</p><Button variant="outline-primary" onClick={() => shopQuery.refetch()}>Thử lại</Button></Container>;
  const shop = shopQuery.data;
  const products = productsQuery.data?.items || [];
  return <Container as="main" className="bs-ui py-4">
    <nav aria-label="Đường dẫn" className="small mb-4"><Link to="/">Trang chủ</Link> / <Link to="/products">Sản phẩm</Link> / {shop.name}</nav>
    <div className="d-flex align-items-center gap-3 mb-4">{shop.logo ? <img className="booking-shop-mark" src={shop.logo} alt={`Biểu trưng ${shop.name}`} /> : <span className="booking-shop-mark fw-bold">{shop.name?.charAt(0) || 'S'}</span>}<div><h1 className="h2 fw-bold">{shop.name}</h1><p className="mb-0 text-secondary">{shop.location} · {Number(shop.rating) ? Number(shop.rating).toFixed(1) : 'Gian hàng mới'}</p></div></div>
    {shop.banner && <img className="booking-shop-banner" src={shop.banner} alt="" />}
    <Row className="g-4"><Col lg={3}><Card body><h2 className="h5 fw-bold">Về gian hàng</h2><p>{shop.description || 'Gian hàng đang cập nhật câu chuyện của mình.'}</p><Form.Group controlId="shop-search"><Form.Label>Tìm sản phẩm trong shop</Form.Label><Form.Control type="search" placeholder="Tìm sản phẩm" value={filter.search} onChange={event => setFilter({ page: 1, search: event.target.value })} /></Form.Group></Card></Col>
      <Col lg={9} as="section" aria-busy={productsQuery.isLoading}><h2 className="h4 fw-bold">Sản phẩm của gian hàng</h2><ListPaging data={productsQuery.data} page={filter.page} onPage={page => setFilter({ ...filter, page })} busy={productsQuery.isFetching} />
        {productsQuery.isError && <Alert variant="danger">Chưa thể tải sản phẩm. <Button variant="outline-danger" onClick={() => productsQuery.refetch()}>Thử lại</Button></Alert>}
        <Row xs={1} sm={2} xl={3} className="g-3">{productsQuery.isLoading ? Array.from({ length: 6 }, (_, i) => <Col key={i}><ProductCardSkeleton /></Col>) : products.map(product => <Col key={product.id}><ProductCard product={product} onAddToCart={addItem} /></Col>)}</Row>
        {!productsQuery.isLoading && !productsQuery.isError && !products.length && <p role="status" className="py-5 text-center">Chưa có sản phẩm phù hợp trong gian hàng.</p>}
      </Col>
    </Row>
  </Container>;
}

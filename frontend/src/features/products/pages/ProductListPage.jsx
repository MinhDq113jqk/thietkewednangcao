import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Card, Col, Collapse, Container, Form, Row } from 'react-bootstrap';
import { SlidersHorizontal } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { ProductCardSkeleton } from '../../../components/ui/Skeleton';
import { productCategories, productSortOptions, useProductList } from '../hooks/useProductList';

export default function ProductListPage() {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { addItem, changePage, isError, isLoading, limit, maxPrice, minPrice, page, products, resetFilters, searchFromUrl, selected, sort, submitFilters, total, totalPages, updateParams } = useProductList();
  return <Container as="main" className="bs-ui booking-results py-4">
    <nav aria-label="Đường dẫn" className="small mb-4"><Link to="/">Trang chủ</Link> / Sản phẩm</nav>
    <Row className="g-4"><Col lg={3} as="aside" aria-label="Bộ lọc sản phẩm"><Button className="d-lg-none w-100 mb-3" variant="outline-primary" aria-expanded={filtersOpen} aria-controls="product-filters" onClick={() => setFiltersOpen(value => !value)}>Bộ lọc sản phẩm</Button><Collapse in={filtersOpen}><div id="product-filters" className="booking-filter-body"><Card className="booking-filter"><Card.Body>
      <div className="d-flex align-items-center justify-content-between mb-3"><h2 className="h5 mb-0"><SlidersHorizontal size={18} aria-hidden="true" /> Bộ lọc</h2><Button variant="link" onClick={resetFilters}>Đặt lại</Button></div>
      <Form onSubmit={submitFilters}>
        <Form.Group controlId="filter-search" className="mb-3"><Form.Label>Từ khóa</Form.Label><Form.Control key={searchFromUrl} name="search" type="search" defaultValue={searchFromUrl} placeholder="Tên món, nơi sản xuất..." /></Form.Group>
        <fieldset className="mb-3"><legend className="h6">Khoảng giá</legend><Row className="g-2"><Col><Form.Group controlId="filter-min"><Form.Label>Giá từ</Form.Label><Form.Control key={`min-${minPrice}`} name="minPrice" inputMode="numeric" defaultValue={minPrice} placeholder="Từ" /></Form.Group></Col><Col><Form.Group controlId="filter-max"><Form.Label>Giá đến</Form.Label><Form.Control key={`max-${maxPrice}`} name="maxPrice" inputMode="numeric" defaultValue={maxPrice} placeholder="Đến" /></Form.Group></Col></Row></fieldset>
        <Button type="submit" className="w-100">Áp dụng</Button>
      </Form>
      <fieldset className="mt-4"><legend className="h6">Danh mục sản phẩm</legend>{productCategories.map(category => <Form.Check key={category} id={`category-${encodeURIComponent(category)}`} type="radio" name="category" label={category} checked={selected === category} onChange={() => updateParams({ category })} className="mb-2" />)}</fieldset>
    </Card.Body></Card></div></Collapse></Col>
    <Col lg={9} as="section" aria-label="Kết quả sản phẩm" aria-busy={isLoading}>
      <h1 className="h3 fw-bold">Khám phá sản phẩm</h1><p aria-live="polite">{isLoading ? 'Đang tìm sản phẩm…' : `${total.toLocaleString('vi-VN')} sản phẩm`}</p>
      <Form.Group controlId="sort-products" className="booking-sort mb-4"><Form.Label>Sắp xếp</Form.Label><Form.Select value={sort} onChange={event => updateParams({ sort: event.target.value })}>{productSortOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</Form.Select></Form.Group>
      {isError && <Alert variant="danger">Không thể tải danh sách sản phẩm. <Button onClick={() => window.location.reload()} variant="outline-danger">Thử lại</Button></Alert>}
      <div className="d-flex flex-column gap-3">{isLoading ? Array.from({ length: limit }, (_, index) => <ProductCardSkeleton key={index} />) : products.map(product => <ProductCard key={product.id} product={product} onAddToCart={addItem} layout="list" />)}</div>
      {!isLoading && !isError && !products.length && <Card body className="text-center py-5"><h2 className="h5">Chưa tìm thấy món phù hợp</h2><p>Thử một từ khóa rộng hơn hoặc bỏ bớt khoảng giá.</p><Button onClick={resetFilters}>Xóa bộ lọc</Button></Card>}
      {!isLoading && !isError && totalPages > 1 && <nav aria-label="Phân trang" className="d-flex align-items-center justify-content-center gap-3 mt-4"><Button variant="outline-primary" disabled={page <= 1} onClick={() => changePage(page - 1)} aria-label="Trang trước">Trang trước</Button><span aria-live="polite">{page} / {totalPages}</span><Button variant="outline-primary" disabled={page >= totalPages} onClick={() => changePage(page + 1)} aria-label="Trang sau">Trang sau</Button></nav>}
    </Col></Row>
  </Container>;
}

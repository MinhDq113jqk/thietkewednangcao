import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MessageCircle, Minus, PackageOpen, Plus, ShoppingBag } from 'lucide-react';
import { Button, ButtonGroup, Card, Col, Container, Form, Nav, Row } from 'react-bootstrap';
import chatApi from '../../messages/api/chatApi';
import productApi from '../api/productApi';
import RecommendationSection from '../components/RecommendationSection';
import Skeleton from '../../../components/ui/Skeleton';
import { toast } from '../../../components/ui/toastStore';
import useCartStore from '../../cart/store/cartStore';
import useAuthStore from '../../auth/store/authStore';
import { formatVnd, getProductPrice, toNumber } from '../../../utils/format';
import { rememberCategory } from '../../../utils/recommendationPreferences';
import { getProductImages, getProductSourceNotice } from '../../../../../backend/src/shared/productCatalog.mjs';
import ProductImage from '../components/ProductImage';
import ProductMetadata from '../components/ProductMetadata';
import ProductReviews from '../components/ProductReviews';

function ProductDetailContent({ id }) {
  const navigate = useNavigate();
  const addItem = useCartStore((state) => state.addItem);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [variantId, setVariantId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const { data: product, isLoading, isError } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productApi.getProduct(id),
    enabled: Boolean(id),
  });

  const images = useMemo(() => {
    if (!product) return [];
    return getProductImages(product);
  }, [product]);

  useEffect(() => {
    if (product?.category) rememberCategory(product.category);
  }, [product?.category]);

  if (isLoading) {
    return (
      <main className="mx-auto px-4 py-5 product-detail-page-detail-1" aria-busy="true">
        <Skeleton className="product-detail-page-detail-2" />
        <div className="mt-5 d-grid gap-5 product-detail-page-detail-3">
          <Skeleton className="w-100 rounded-3 product-detail-page-detail-4" />
          <div className="py-4 product-detail-page-detail-5">
            <Skeleton className="product-detail-page-detail-6" />
            <Skeleton className="product-detail-page-detail-7" />
            <Skeleton className="product-detail-page-detail-8" />
            <Skeleton className="w-100 product-detail-page-detail-9" />
            <div className="d-flex gap-3 pt-3">
              <Skeleton className="product-detail-page-detail-10" />
              <Skeleton className="product-detail-page-detail-11" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (isError || !product) {
    return (
      <main className="mx-auto px-4 py-5 text-center product-detail-page-detail-12">
        <PackageOpen className="mx-auto text-secondary" size={48} strokeWidth={1.4} />
        <h1 className="mt-4 booking-title fs-4 fw-semibold text-dark">Không tìm thấy sản phẩm</h1>
        <Link to="/products" className="mt-5 d-inline-flex rounded-3 bg-dark-subtle px-5 py-3 booking-small fw-bold product-detail-page-detail-13">
          Quay lại khám phá
        </Link>
      </main>
    );
  }

  const variant = product.variants?.find(v => v.id === variantId) || product.variants?.find(v => Number(v.stock) > 0) || product.variants?.[0];
  const price = getProductPrice(variant || product);
  const originalPrice = toNumber(variant?.price ?? product.price);
  const stock = Number(variant?.stock ?? 0);
  const reviews = product.reviews || [];
  const reviewCount = product.reviewSummary?.total ?? reviews.length;
  const rating = product.reviewSummary?.averageRating ?? (reviews.length
    ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length
    : 0);
  const hasDiscount = (variant?.salePrice ?? product.salePrice) && Number(variant?.salePrice ?? product.salePrice) < originalPrice;

  const cartProduct = {
    ...product, variantId: variant?.id, sku: variant?.sku, variantName: variant?.name, stock, salePrice: null,
    image: variant?.image || images[selectedImage] || images[0] || product.image,
    price,
    quantity,
  };

  const addToCart = () => {
    if (!variant || quantity > stock || stock <= 0) return;
    addItem(cartProduct);
    toast.success(`Đã thêm ${quantity} sản phẩm vào giỏ`);
  };

  const buyNow = () => {
    if (!variant || quantity > stock || stock <= 0) return;
    addItem(cartProduct);
    navigate('/checkout');
  };

  const startSellerChat = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/products/${product.id}` } } });
      return;
    }

    setIsStartingChat(true);
    try {
      const conversation = await chatApi.startConversation({
        shopId: product.shop.id,
        productId: product.id,
      });
      navigate(`/messages?conversation=${conversation.id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Chưa thể mở cuộc trò chuyện');
    } finally {
      setIsStartingChat(false);
    }
  };

  return (
    <Container as="main" className="bs-ui py-4">
      <nav aria-label="Đường dẫn" className="small mb-4"><Link to="/">Trang chủ</Link> / <Link to="/products">Sản phẩm</Link> / {product.name}</nav>
      <div className="booking-section-heading mb-3">
        <div><Link to={`/products?category=${encodeURIComponent(product.category || '')}`}>{product.category}</Link><h1 className="h2 fw-bold mt-2">{product.name}</h1>
          <p className="text-secondary"><strong>{rating ? rating.toFixed(1) : 'Mới'}</strong> · {reviewCount} đánh giá · Đã bán {Number(product.sold || 0).toLocaleString('vi-VN')}</p>
        </div>
        <Button onClick={buyNow} disabled={stock < 1}>Mua ngay</Button>
      </div>
      <Nav className="mb-4" variant="underline" aria-label="Thông tin sản phẩm"><Nav.Link href="#product-overview">Tổng quan</Nav.Link><Nav.Link href="#product-story">Câu chuyện và chất liệu</Nav.Link><Nav.Link href="#product-reviews">Đánh giá</Nav.Link></Nav>
      <div className="booking-product-overview" id="product-overview">
        <section aria-label="Ảnh sản phẩm">
          <div className="booking-product-gallery"><ProductImage src={variant?.image || images[selectedImage]} alt={product.name} /></div>
          {images.length > 1 && <div className="booking-thumbnails">{images.map((image, index) => <Button key={image} type="button" variant={selectedImage === index ? 'primary' : 'outline-secondary'} onClick={() => setSelectedImage(index)} className="booking-thumbnail" aria-label={`Xem ảnh ${index + 1}`} aria-pressed={selectedImage === index}><img src={image} alt="" /></Button>)}</div>}
          <ProductMetadata product={product} image={images[selectedImage]} className="mt-3" />
          <p className="small text-secondary mt-3">{getProductSourceNotice(product.dataSource)}</p>
        </section>
        <aside className="booking-purchase-panel" aria-label="Chọn sản phẩm">
          <h2 className="h5 fw-bold">Chọn món quà của bạn</h2>
          <p className="text-secondary">{product.description || 'Thông tin chi tiết đang được gian hàng cập nhật.'}</p>
          <Form.Group controlId="product-variant" className="mb-3"><Form.Label>Chọn biến thể</Form.Label><Form.Select value={variant?.id || ''} onChange={event => { setVariantId(event.target.value); setQuantity(1); setSelectedImage(0); }}>{(product.variants || []).map(v => <option key={v.id} value={v.id}>{v.name} · {v.sku} · {v.stock} còn lại</option>)}</Form.Select></Form.Group>
          <p className={stock > 0 ? 'text-success' : 'text-danger'}>{stock > 0 ? `Còn ${stock} sản phẩm` : 'Tạm hết hàng'}</p>
          <div className="mb-3">{hasDiscount && <del className="text-danger">{formatVnd(originalPrice)}</del>}<p className="h3 fw-bold">{formatVnd(price)}</p></div>
          <div className="d-flex flex-wrap align-items-center gap-3 mb-4"><span>Số lượng</span><ButtonGroup aria-label="Số lượng sản phẩm"><Button variant="outline-primary" onClick={() => setQuantity(value => Math.max(1, value - 1))} disabled={quantity <= 1} aria-label="Giảm số lượng"><Minus size={16} /></Button><output className="px-3 d-flex align-items-center" aria-live="polite">{quantity}</output><Button variant="outline-primary" onClick={() => setQuantity(value => Math.min(stock || 1, value + 1))} disabled={quantity >= stock} aria-label="Tăng số lượng"><Plus size={16} /></Button></ButtonGroup></div>
          <Button onClick={addToCart} disabled={stock < 1} className="w-100"><ShoppingBag size={18} aria-hidden="true" />Thêm vào giỏ</Button>
          {product.shop && <Card className="mt-4"><Card.Body><p className="small text-secondary mb-1">Sản phẩm từ</p><Link className="fw-bold" to={`/shop/${product.shop.slug}`}>{product.shop.name}</Link><Button className="w-100 mt-3" variant="outline-primary" onClick={startSellerChat} disabled={isStartingChat}><MessageCircle size={17} aria-hidden="true" />{isStartingChat ? 'Đang mở...' : 'Nhắn người bán'}</Button></Card.Body></Card>}
          {product.craftVillage && <p className="small mt-3 mb-0"><Link to={product.craftVillage.region?.slug ? `/culture/${product.craftVillage.region.slug}` : '/explore'}>Sản phẩm thuộc {product.craftVillage.name} · Khám phá làng nghề</Link></p>}
        </aside>
      </div>
      <Row className="g-4 my-4"><Col lg={7}><section id="product-story"><h2 className="h4 fw-bold">Câu chuyện và chất liệu</h2><p style={{ whiteSpace: 'pre-line' }}>{product.description || 'Gian hàng chưa bổ sung câu chuyện chi tiết cho sản phẩm này.'}</p></section></Col><Col lg={5}><section id="product-reviews"><ProductReviews key={product.id} productId={product.id} /></section></Col></Row>
      <RecommendationSection productId={product.id} title="Có thể bạn cũng thích" eyebrow="Tiếp tục khám phá" className="booking-section" />
    </Container>
  );
}

function ProductDetailPage() {
  const { id } = useParams();
  return <ProductDetailContent key={id} id={id} />;
}
export default ProductDetailPage;

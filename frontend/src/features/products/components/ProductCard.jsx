import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import Badge from 'react-bootstrap/Badge';
import { PackageOpen, ShoppingBag, Store } from 'lucide-react';
import { toast } from '../../../components/ui/toastStore';
import { formatVnd, getProductPrice, toNumber } from '../../../utils/format';
import { getProductImages, getProductImageLabel, getProductSourceLabel } from '../../../../../backend/src/shared/productCatalog.mjs';

export default function ProductCard({ product, onAddToCart, recommendationReason, layout = 'grid' }) {
  const navigate = useNavigate();
  const [failedUrl, setFailedUrl] = useState(null);
  const originalPrice = toNumber(product.oldPrice || product.price);
  const currentPrice = getProductPrice(product);
  const image = getProductImages(product)[0];
  const shopName = typeof product.shop === 'string' ? product.shop : product.shop?.name;
  const rating = Number(product.rating || product.shop?.rating || 0);
  const outOfStock = Number(product.stock) <= 0;
  const hasDiscount = originalPrice > currentPrice && currentPrice > 0;
  const imageLabel = getProductImageLabel(image);
  const handleAdd = () => {
    if (!onAddToCart || outOfStock) return;
    if (product.variantCount !== undefined && product.variantCount !== 1) { navigate(`/products/${product.id}`); return; }
    onAddToCart({ ...product, variantId: product.id, image: image || product.image, price: currentPrice });
    toast.success(`Đã thêm ${product.name} vào giỏ`);
  };
  return <div className="bs-ui booking-card-wrap"><Card as="article" className={`booking-product-card ${layout === 'list' ? 'booking-result-card' : ''}`}>
    <Link to={`/products/${product.id}`} className="booking-product-image" aria-label={`Xem ${product.name}`}>
      {image && failedUrl !== image ? <img src={image} alt={imageLabel ? `${product.name} (${imageLabel})` : product.name} loading="lazy" onError={() => setFailedUrl(image)} /> : <span className="booking-image-fallback"><PackageOpen size={32} aria-hidden="true" />{image ? 'Ảnh không tải được' : 'Chưa có ảnh'}</span>}
      {hasDiscount && <Badge bg="success" className="booking-discount">Giảm {Math.round((1-currentPrice/originalPrice)*100)}%</Badge>}
    </Link>
    <Card.Body className="d-flex flex-column">
      <div className="d-flex flex-wrap gap-1"><Badge bg="light" text="dark">{getProductSourceLabel(product.dataSource)}</Badge>{imageLabel && <Badge bg="light" text="dark">{imageLabel}</Badge>}{product.isFlashSale && <Badge bg="danger">Bán nhanh</Badge>}</div>
      {recommendationReason && <p className="small text-primary mt-2 mb-0">{recommendationReason}</p>}
      <Card.Title as="h3"><Link to={`/products/${product.id}`}>{product.name}</Link></Card.Title>
      {shopName && <p className="small text-secondary mb-2"><Store size={14} aria-hidden="true" /> {product.shop?.slug ? <Link to={`/shop/${product.shop.slug}`}>{shopName}</Link> : shopName}</p>}
      <p className="small text-secondary mb-2">{product.category}</p>
      <div className="d-flex align-items-center gap-2 mb-3"><span className="booking-rating">{rating ? rating.toFixed(1) : 'Mới'}</span><span className="small">{outOfStock ? 'Hết hàng' : product.sold ? `Đã bán ${product.sold}` : 'Còn hàng'}</span></div>
      <div className="booking-card-actions d-flex flex-wrap align-items-end justify-content-between gap-2 mt-auto">
        <div>{hasDiscount && <del className="small text-danger">{formatVnd(originalPrice)}</del>}<p className="booking-price mb-0">{formatVnd(currentPrice)}</p></div>
        {onAddToCart && <Button onClick={handleAdd} disabled={outOfStock} aria-label={outOfStock ? `${product.name} đã hết hàng` : `Thêm ${product.name} vào giỏ`} title={product.variantCount > 1 ? 'Chọn biến thể' : 'Thêm vào giỏ'}><ShoppingBag size={18} aria-hidden="true" /></Button>}
      </div>
      {layout === 'list' && <Button as={Link} className="mt-2" to={`/products/${product.id}`}>Xem sản phẩm</Button>}
    </Card.Body>
  </Card></div>;
}

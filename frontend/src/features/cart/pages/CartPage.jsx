import { Container as BsContainer, Button as BsButton } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Minus,
  PackageOpen,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Truck,
} from 'lucide-react';
import useCartStore, { cartItemKey } from '../store/cartStore';
import { calculateLineTotal, formatVnd } from '../../../utils/format';

function CartPage() {
  const {
    items,
    removeItem,
    updateQuantity,
    totalItems,
    totalPrice,
    clearCart,
  } = useCartStore();

  if (items.length === 0) {
    return (
      <BsContainer as="main" className="d-flex flex-column align-items-center justify-content-center py-5 text-center cart-page-detail-1">
        <span className="d-flex align-items-center justify-content-center rounded-3 bg-primary-subtle text-primary cart-page-detail-2">
          <ShoppingBag size={30} aria-hidden />
        </span>
        <h1 className="mt-4 booking-title fs-3 fw-semibold text-dark">Giỏ hàng đang trống</h1>
        <p className="mt-2 booking-small text-secondary cart-page-detail-3">
          Khám phá một món quà có câu chuyện và quay lại đây khi bạn đã chọn được.
        </p>
        <Link
          to="/products"
          className="mt-4 d-inline-flex align-items-center gap-2 rounded-3 bg-primary px-4 booking-small fw-bold cart-page-detail-4"
        >
          Tiếp tục khám phá
          <ArrowRight size={17} aria-hidden />
        </Link>
      </BsContainer>
    );
  }

  return (
    <BsContainer as="main" className="py-5">
      <div className="d-flex flex-wrap align-items-end justify-content-between gap-4 border-bottom pb-4 cart-page-detail-5">
        <div>
          <p className="booking-caption fw-bold text-uppercase text-primary">Sẵn sàng đặt hàng</p>
          <h1 className="mt-2 booking-title fs-3 fw-semibold text-dark">Giỏ hàng của bạn</h1>
          <p className="mt-1 booking-small text-secondary">{totalItems()} sản phẩm</p>
        </div>
        <Link to="/products" className="d-flex align-items-center gap-1 booking-small fw-semibold text-primary cart-page-detail-6">
          Mua thêm <ArrowRight size={16} aria-hidden />
        </Link>
      </div>

      <div className="booking-cart-layout py-4">
        <section aria-label="Sản phẩm trong giỏ">
          <div className="border-top border-bottom cart-page-detail-7">
            {items.map((item) => {
              const image = item.image || item.images?.[0];
              const maxQuantity = Number(item.stock || 99);

              return (
                <article key={cartItemKey(item)} className="d-grid gap-4 p-3 align-items-sm-center cart-page-detail-8">
                  <Link to={`/products/${item.id}`} className="overflow-hidden rounded-3 cart-page-detail-9">
                    {image ? (
                      <img src={image} alt={item.name} className="h-100 w-100 object-fit-cover" />
                    ) : (
                      <span className="d-flex h-100 w-100 align-items-center justify-content-center text-secondary">
                        <PackageOpen size={30} aria-hidden />
                      </span>
                    )}
                  </Link>

                  <div className="cart-page-detail-10">
                    <Link to={`/products/${item.id}`} className="booking-small fw-semibold text-dark cart-page-detail-11">
                      {item.name}
                    </Link>
                    {item.shop?.name && <p className="mt-1 text-truncate booking-caption text-secondary">{item.shop.name}</p>}
                    {(item.variantName || item.sku) && <p className="mt-1 booking-caption text-secondary">{[item.variantName, item.sku].filter(Boolean).join(' · ')}</p>}
                    <p className="mt-2 fs-6 fw-bold text-danger">{formatVnd(item.price)}</p>

                    <div className="mt-2 d-flex align-items-center justify-content-between d-sm-none">
                      <div className="d-grid overflow-hidden rounded-3 border cart-page-detail-12">
                        <BsButton variant="outline-primary" type="button" onClick={() => updateQuantity(cartItemKey(item), item.quantity - 1)} className="d-flex align-items-center justify-content-center cart-page-detail-13" aria-label={`Giảm số lượng ${item.name}`}>
                          <Minus size={14} />
                        </BsButton>
                        <span className="d-flex align-items-center justify-content-center border-start border-end booking-small fw-semibold cart-page-detail-14">{item.quantity}</span>
                        <BsButton variant="outline-primary" type="button" onClick={() => updateQuantity(cartItemKey(item), Math.min(maxQuantity, item.quantity + 1))} className="d-flex align-items-center justify-content-center cart-page-detail-15" aria-label={`Tăng số lượng ${item.name}`}>
                          <Plus size={14} />
                        </BsButton>
                      </div>
                      <BsButton variant="outline-danger" type="button" onClick={() => removeItem(cartItemKey(item))} className="d-flex align-items-center justify-content-center cart-page-detail-16" aria-label={`Xóa ${item.name}`}>
                        <Trash2 size={17} />
                      </BsButton>
                    </div>
                  </div>

                  <div className="d-none d-sm-block cart-page-detail-17">
                    <div className="d-flex justify-content-end">
                      <div className="d-grid overflow-hidden rounded-3 border cart-page-detail-18">
                        <BsButton variant="outline-primary" type="button" onClick={() => updateQuantity(cartItemKey(item), item.quantity - 1)} className="d-flex align-items-center justify-content-center cart-page-detail-19" aria-label={`Giảm số lượng ${item.name}`}>
                          <Minus size={14} />
                        </BsButton>
                        <span className="d-flex align-items-center justify-content-center border-start border-end booking-small fw-semibold cart-page-detail-20">{item.quantity}</span>
                        <BsButton variant="outline-primary" type="button" onClick={() => updateQuantity(cartItemKey(item), Math.min(maxQuantity, item.quantity + 1))} className="d-flex align-items-center justify-content-center cart-page-detail-21" aria-label={`Tăng số lượng ${item.name}`}>
                          <Plus size={14} />
                        </BsButton>
                      </div>
                    </div>
                    <p className="mt-2 text-end booking-small fw-bold text-dark">{formatVnd(calculateLineTotal(item))}</p>
                    <BsButton variant="outline-danger" type="button" onClick={() => removeItem(cartItemKey(item))} className="ms-auto mt-2 d-flex align-items-center gap-1 booking-caption">
                      <Trash2 size={13} aria-hidden />
                      Xóa
                    </BsButton>
                  </div>
                </article>
              );
            })}
          </div>

          <BsButton variant="outline-danger"
            type="button"
            onClick={clearCart}
            className="mt-3 booking-caption"
          >
            Xóa toàn bộ giỏ hàng
          </BsButton>
        </section>

        <aside className="rounded-3 border p-4 cart-page-detail-22" aria-label="Tóm tắt giỏ hàng">
          <h2 className="booking-title fs-5 fw-semibold text-dark">Tóm tắt đơn</h2>
          <div className="mt-4 booking-small text-secondary cart-page-detail-23">
            <div className="d-flex justify-content-between gap-3">
              <span>Tạm tính</span>
              <span>{formatVnd(totalPrice())}</span>
            </div>
            <div className="d-flex justify-content-between gap-3">
              <span>Phí vận chuyển</span>
              <span className="text-end">Tính theo địa chỉ</span>
            </div>
          </div>
          <div className="mt-4 d-flex align-items-end justify-content-between gap-3 border-top pt-4 cart-page-detail-24">
            <span className="fw-bold text-dark">Tổng tạm tính</span>
            <span className="fs-5 fw-bold text-danger">{formatVnd(totalPrice())}</span>
          </div>

          <BsButton as={Link} role="link" variant="primary"
            to="/checkout"
            className="mt-4 w-100"
          >
            Tiến hành thanh toán
            <ArrowRight size={18} aria-hidden />
          </BsButton>

          <div className="mt-4 border-top pt-4 booking-caption text-secondary cart-page-detail-25">
            <p className="d-flex align-items-center gap-2"><ShieldCheck size={16} className="text-primary" />Đơn không bị tạo trùng khi mạng chập chờn</p>
            <p className="d-flex align-items-center gap-2"><Truck size={16} className="text-primary" />Có mã và hành trình vận chuyển sau khi gửi</p>
          </div>
        </aside>
      </div>
    </BsContainer>
  );
}

export default CartPage;

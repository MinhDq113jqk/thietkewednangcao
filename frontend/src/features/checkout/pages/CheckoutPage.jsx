import { Form as BsForm, Container as BsContainer, Button as BsButton } from 'react-bootstrap';
import BsGrid from '../../home/components/ResponsiveGrid';
import { Navigate } from 'react-router-dom';
import {
  Check,
  LockKeyhole,
  MapPin,
  PackageCheck,
  QrCode,
  ShieldCheck,
  Truck,
  WalletCards,
} from 'lucide-react';
import PaymentQR from '../components/PaymentQR';
import Steps from '../../../components/ui/Steps';
import Skeleton from '../../../components/ui/Skeleton';
import Spinner from '../../../components/ui/Spinner';
import { checkoutPaymentOptions } from '../hooks/checkout.helpers';
import { useCheckout } from '../hooks/useCheckout';
import { calculateLineTotal, formatVnd } from '../../../utils/format';

const paymentDetails = {
  cod: {
    icon: WalletCards,
    title: 'Thanh toán khi nhận hàng',
    description: 'Thanh toán cho đơn vị vận chuyển khi nhận kiện hàng.',
  },
  bank_transfer: {
    icon: QrCode,
    title: 'Chuyển khoản VietQR',
    description: 'Mã QR và nội dung chuyển khoản riêng cho từng đơn.',
  },
};

const checkoutSteps = [
  { label: 'Giỏ hàng' },
  { label: 'Giao hàng' },
  { label: 'Thanh toán' },
  { label: 'Hoàn tất' },
];

function Field({ label, name, value, onChange, required, error, ...props }) {
  return (
    <BsForm.Label className="d-block">
      <span className="mb-2 d-block booking-caption fw-bold text-body">
        {label}{required && <span className="text-danger"> *</span>}
      </span>
      <BsForm.Control
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `checkout-${name}-error` : undefined}
        className="w-100 rounded-3 border px-2 booking-small checkout-page-detail-1"
        {...props}
      />
      {error && <span id={`checkout-${name}-error`} className="mt-1 d-block booking-caption text-danger" role="alert">{error}</span>}
    </BsForm.Label>
  );
}

function CheckoutPage() {
  const {
    activeStep,
    defaultAddress,
    applyDefaultAddress,
    createOrder,
    createdOrders,
    checkoutLocked,
    error,
    fieldErrors,
    form,
    goToOrders,
    handleChange,
    handleOrder,
    items,
    payableTotal,
    payment,
    setPayment,
    shippingEstimate,
    shippingFee,
    shippingLoading,
    shippingReady,
    shippingError,
    retryShipping,
    subtotal,
    successMessage,
  } = useCheckout();

  if (activeStep === 3) {
    return (
      <BsContainer as="main" className="py-5 booking-narrow">
        <div className="mb-5 border-bottom pb-4 checkout-page-detail-2">
          <Steps items={checkoutSteps} current={activeStep} aria-label="Các bước đặt hàng" />
        </div>
        <section className="border-bottom pb-5 text-center checkout-page-detail-3">
          <span className="mx-auto d-flex align-items-center justify-content-center rounded-pill bg-primary-subtle text-primary checkout-page-detail-4">
            <Check size={28} aria-hidden />
          </span>
          <p className="mt-4 booking-caption fw-bold text-uppercase text-primary">Đơn hàng đã được ghi nhận</p>
          <h1 className="mt-2 booking-title fs-3 fw-semibold text-dark">Đặt hàng thành công</h1>
          <p className="mx-auto mt-2 booking-small text-secondary checkout-page-detail-5">{successMessage}</p>
          <BsButton variant="primary"
            type="button"
            onClick={goToOrders}
            className="mt-4 d-inline-flex align-items-center gap-2 px-4 booking-small checkout-page-detail-6"
          >
            <PackageCheck size={18} aria-hidden />
            Xem đơn hàng
          </BsButton>
        </section>

        <section className="mt-5 rounded-3 border p-4 checkout-page-detail-7" aria-label="Chi tiết đơn đã tạo">
          <h2 className="booking-title fs-5 fw-semibold text-dark">Chi tiết đơn đã tạo</h2>
          <div className="mt-3 booking-small checkout-page-detail-8">
            {createdOrders.map((order) => (
              <div key={order.id} className="d-flex justify-content-between gap-4">
                <span>{order.shop?.name || 'Gian hàng'}<span className="mt-1 d-block booking-caption text-secondary">Tiền hàng {formatVnd(order.total)} · Phí vận chuyển {formatVnd(order.shippingFee)}</span></span>
                <strong>{formatVnd(Number(order.total) + Number(order.shippingFee))}</strong>
              </div>
            ))}
            <div className="d-flex justify-content-between gap-4 border-top pt-2 fw-bold checkout-page-detail-9">
              <span>Tổng thanh toán</span>
              <span className="text-danger">{formatVnd(createdOrders.reduce((sum, order) => sum + Number(order.total) + Number(order.shippingFee), 0))}</span>
            </div>
          </div>
        </section>

        {payment === 'bank_transfer' && createdOrders.length > 0 && (
          <section className="mt-5" aria-label="Thanh toán VietQR">
            <h2 className="booking-title fs-4 fw-semibold text-dark">Hoàn tất chuyển khoản</h2>
            <p className="mt-2 booking-small text-secondary">Mỗi gian hàng có một đơn và nội dung chuyển khoản riêng.</p>
            <BsGrid as="div" columns={{"xs":1,"md":2}} className="mt-4">
              {createdOrders.map((order) => (
                <PaymentQR key={order.id} order={order} />
              ))}
            </BsGrid>
          </section>
        )}
      </BsContainer>
    );
  }

  if (items.length === 0) return <Navigate to="/cart" replace />;

  return (
    <BsContainer as="main" className="py-5">
      <div className="border-bottom pb-4 checkout-page-detail-10">
        <p className="booking-caption fw-bold text-uppercase text-primary">Bước cuối cùng</p>
        <h1 className="mt-2 booking-title fs-3 fw-semibold text-dark">Thanh toán an toàn</h1>
        <div className="mt-4 checkout-page-detail-11">
          <Steps items={checkoutSteps} current={activeStep} aria-label="Các bước đặt hàng" />
        </div>
      </div>

      <div className="booking-checkout-layout py-4">
        <div className="checkout-page-detail-12">
          <section aria-labelledby="shipping-heading">
            <div className="d-flex align-items-center gap-3">
              <span className="d-flex align-items-center justify-content-center rounded-3 text-primary checkout-page-detail-13">
                <MapPin size={19} aria-hidden />
              </span>
              <div>
                <p className="booking-caption fw-bold text-uppercase text-primary">Nơi nhận hàng</p>
                <h2 id="shipping-heading" className="booking-title fs-5 fw-semibold text-dark">Thông tin giao hàng</h2>
              </div>
            </div>

            {defaultAddress && <BsButton className="mt-3" variant="outline-primary" disabled={checkoutLocked} onClick={applyDefaultAddress}>Dùng địa chỉ mặc định</BsButton>}
            <fieldset disabled={checkoutLocked} className="mt-4 d-grid gap-4 rounded-3 border p-4 checkout-page-detail-14">
              <Field label="Họ và tên" name="name" value={form.name} error={fieldErrors.name} onChange={handleChange} required maxLength={100} autoComplete="name" placeholder="Nguyễn Minh Anh" />
              <Field label="Số điện thoại" name="phone" value={form.phone} error={fieldErrors.phone} onChange={handleChange} required autoComplete="tel" inputMode="tel" placeholder="090 000 0000" />
              <div className="layout-span-sm-2 checkout-page-detail-15">
                <Field label="Địa chỉ" name="address" value={form.address} error={fieldErrors.address} onChange={handleChange} required maxLength={300} autoComplete="street-address" placeholder="Số nhà, tên đường, phường/xã" />
              </div>
              <Field label="Tỉnh / Thành phố" name="city" value={form.city} error={fieldErrors.city} onChange={handleChange} required maxLength={100} autoComplete="address-level1" placeholder="Hà Nội" />
              <BsForm.Label className="d-block">
                <span className="mb-2 d-block booking-caption fw-bold text-body">Ghi chú</span>
                <BsForm.Control name="note" value={form.note} onChange={handleChange} placeholder="Ví dụ: giao giờ hành chính" className="w-100 rounded-3 border px-2 booking-small checkout-page-detail-16" />
              </BsForm.Label>
            </fieldset>
          </section>

          <section aria-labelledby="payment-heading">
            <div className="d-flex align-items-center gap-3">
              <span className="d-flex align-items-center justify-content-center rounded-3 text-danger checkout-page-detail-17">
                <WalletCards size={19} aria-hidden />
              </span>
              <div>
                <p className="booking-caption fw-bold text-uppercase text-danger">Cách bạn thanh toán</p>
                <h2 id="payment-heading" className="booking-title fs-5 fw-semibold text-dark">Phương thức thanh toán</h2>
              </div>
            </div>

            <fieldset disabled={checkoutLocked} className="mt-4 d-grid gap-3 checkout-page-detail-18">
              {checkoutPaymentOptions.map((option) => {
                const detail = paymentDetails[option.value];
                const Icon = detail.icon;
                const active = payment === option.value;

                return (
                  <BsForm.Label
                    key={option.value}
                    className={`d-grid gap-3 rounded-3 border p-3 checkout-page-detail-21 ${
                      active
                        ? "border-danger checkout-page-detail-19"
                        : "checkout-page-detail-20"
                    }`}
                  >
                    <BsForm.Check.Input
                      type="radio"
                      value={option.value}
                      checked={active}
                      onChange={() => setPayment(option.value)}
                      className="mt-1 checkout-page-detail-22"
                    />
                    <Icon size={25} className={active ? "text-danger" : "text-secondary"} aria-hidden />
                    <span>
                      <strong className="d-block booking-small text-dark">{detail.title}</strong>
                      <span className="mt-1 d-block booking-caption text-secondary checkout-page-detail-23">{detail.description}</span>
                    </span>
                  </BsForm.Label>
                );
              })}
            </fieldset>
          </section>
        </div>

        <aside className="rounded-3 border p-4 checkout-page-detail-24" aria-label="Xác nhận đơn hàng">
          <h2 className="booking-title fs-5 fw-semibold text-dark">Đơn của bạn</h2>
          <p className="mt-1 booking-caption text-secondary">{items.length} dòng sản phẩm</p>

          <div className="mt-4 overflow-y-auto pe-1 checkout-page-detail-25">
            {items.map((item) => (
              <div key={`${item.id}:${item.variantId || item.id}`} className="d-grid gap-3 booking-small checkout-page-detail-26">
                <div className="position-relative overflow-hidden rounded-2 checkout-page-detail-27">
                  {item.image && <img src={item.image} alt="" className="h-100 w-100 object-fit-cover" />}
                  <span className="position-absolute d-flex align-items-center justify-content-center rounded-pill bg-dark-subtle px-1 fw-bold checkout-page-detail-28">{item.quantity}</span>
                </div>
                <span className="booking-caption text-body checkout-page-detail-29">{item.name} · {item.variantName} {item.sku}</span>
                <span className="booking-caption fw-semibold text-dark">{formatVnd(calculateLineTotal(item))}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 border-top pt-4 booking-small text-secondary checkout-page-detail-30">
            <div className="d-flex justify-content-between gap-3"><span>Tạm tính</span><span>{formatVnd(subtotal)}</span></div>
            <div className="d-flex justify-content-between gap-3">
              <span>Phí vận chuyển</span>
              <span aria-busy={shippingLoading} className="text-end checkout-page-detail-31">
                {shippingLoading
                  ? <Skeleton as="span" className="d-inline-block align-middle checkout-page-detail-32" />
                  : shippingReady ? formatVnd(shippingFee) : 'Chưa tính'}
              </span>
            </div>
            {shippingLoading && <p className="booking-caption" role="status">Đang kiểm tra giá, tồn kho và phí vận chuyển…</p>}
            {!form.city.trim() && <p className="booking-caption checkout-page-detail-33">Nhập tỉnh / thành phố để báo phí.</p>}
            {shippingReady && (
              <div className="rounded-2 p-2 checkout-page-detail-34" aria-label="Phí vận chuyển từng shop">
                {shippingEstimate.shops.map((shop) => (
                  <div key={shop.shopId} className="booking-caption">
                    <div className="d-flex justify-content-between gap-3"><strong className="text-body">{shop.shopName}</strong><span>{shop.fee === 0 ? 'Miễn phí' : formatVnd(shop.fee)}</span></div>
                    <p className="mt-1 text-secondary">Tiền hàng {formatVnd(shop.subtotal)} · Dự kiến {shop.etaDays} ngày</p>
                  </div>
                ))}
              </div>
            )}
            <p className="booking-caption text-secondary checkout-page-detail-35">Miễn phí vận chuyển cho từng shop từ 500.000đ tiền hàng. Phí do hệ thống ước tính.</p>
            {shippingReady && <p className="booking-caption text-secondary checkout-page-detail-36">Giá và tồn kho được kiểm tra lại khi đặt hàng.</p>}
          </div>

          <div className="mt-4 d-flex align-items-end justify-content-between gap-3 border-top pt-4 checkout-page-detail-37">
            <span className="fw-bold text-dark">Tổng thanh toán</span>
            <span className="text-end fs-5 fw-bold text-danger checkout-page-detail-38" aria-busy={shippingLoading}>
              {shippingLoading
                ? <Skeleton as="span" className="d-inline-block align-middle checkout-page-detail-39" />
                : shippingReady ? formatVnd(payableTotal) : <span className="booking-small text-secondary">Chưa có báo phí</span>}
            </span>
          </div>

          {shippingError && (
            <div className="mt-3 rounded-3 border p-2 booking-caption text-danger checkout-page-detail-40" role="alert">
              <p>{shippingError}</p>
              <BsButton variant="outline-primary" type="button" onClick={retryShipping} disabled={shippingLoading} className="mt-2 text-decoration-underline">Báo phí lại</BsButton>
              <p className="mt-1">Nếu sản phẩm không còn được bán hoặc thiếu tồn kho, hãy cập nhật <a href="/cart" className="fw-bold text-decoration-underline">giỏ hàng</a>.</p>
            </div>
          )}

          {error && (
            <p className="mt-3 rounded-3 border p-2 booking-caption text-danger checkout-page-detail-41" role="alert">
              {error}
            </p>
          )}

          <BsButton variant="primary"
            type="button"
            onClick={handleOrder}
            disabled={createOrder.isPending || !shippingReady}
            aria-busy={createOrder.isPending}
            className="mt-4 d-flex w-100 align-items-center justify-content-center gap-2 booking-small checkout-page-detail-42"
          >
            {createOrder.isPending ? (
              <>
                <Spinner size="sm" label="Đang ghi nhận đơn..." />
                Đang ghi nhận đơn...
              </>
            ) : (
              <>
                <LockKeyhole size={17} aria-hidden />
                {checkoutLocked ? 'Kiểm tra lại đơn hàng' : payment === 'bank_transfer' ? 'Tạo đơn và mã VietQR' : 'Đặt hàng an toàn'}
              </>
            )}
          </BsButton>

          <div className="mt-3 booking-caption text-secondary checkout-page-detail-43">
            <p className="d-flex align-items-center gap-2"><ShieldCheck size={15} className="text-primary" />Đơn chỉ được ghi nhận một lần</p>
            <p className="d-flex align-items-center gap-2"><Truck size={15} className="text-primary" />Theo dõi vị trí sau khi bàn giao</p>
          </div>
        </aside>
      </div>
    </BsContainer>
  );
}

export default CheckoutPage;

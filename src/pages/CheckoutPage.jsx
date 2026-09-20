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
import Steps from '../components/ui/Steps';
import Skeleton from '../components/ui/Skeleton';
import Spinner from '../components/ui/Spinner';
import { checkoutPaymentOptions } from '../hooks/checkout.helpers';
import { useCheckout } from '../hooks/useCheckout';
import { calculateLineTotal, formatVnd } from '../utils/format';

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

function Field({ label, name, value, onChange, required, ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold text-[#405049]">
        {label}{required && <span className="text-[#C93F2C]"> *</span>}
      </span>
      <input
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="h-11 w-full rounded-lg border border-[#D5DEDA] bg-white px-3 text-sm outline-none placeholder:text-[#9AA49F] focus:border-[#0F766E]"
        {...props}
      />
    </label>
  );
}

function CheckoutPage() {
  const {
    activeStep,
    createOrder,
    createdOrders,
    error,
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
    subtotal,
    successMessage,
  } = useCheckout();

  if (activeStep === 3) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-8 border-b border-[#DDE4E0] pb-6">
          <Steps items={checkoutSteps} current={activeStep} aria-label="Các bước đặt hàng" />
        </div>
        <section className="border-b border-[#DDE4E0] pb-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#E6F3F1] text-[#0F766E]">
            <Check size={28} aria-hidden />
          </span>
          <p className="mt-5 text-xs font-bold uppercase text-[#0F766E]">Đơn hàng đã được ghi nhận</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-[#17201D]">Đặt hàng thành công</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#68756F]">{successMessage}</p>
          <button
            type="button"
            onClick={goToOrders}
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-[#17201D] px-5 text-sm font-bold text-white hover:bg-[#0F766E]"
          >
            <PackageCheck size={18} aria-hidden />
            Xem đơn hàng
          </button>
        </section>

        {payment === 'bank_transfer' && createdOrders.length > 0 && (
          <section className="mt-8" aria-label="Thanh toán VietQR">
            <h2 className="font-display text-2xl font-semibold text-[#17201D]">Hoàn tất chuyển khoản</h2>
            <p className="mt-2 text-sm text-[#68756F]">Mỗi gian hàng có một đơn và nội dung chuyển khoản riêng.</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {createdOrders.map((order) => (
                <PaymentQR key={order.id} order={order} />
              ))}
            </div>
          </section>
        )}
      </main>
    );
  }

  if (items.length === 0) return <Navigate to="/cart" replace />;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="border-b border-[#DDE4E0] pb-5">
        <p className="text-xs font-bold uppercase text-[#0F766E]">Bước cuối cùng</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-[#17201D]">Thanh toán an toàn</h1>
        <div className="mt-5 max-w-2xl">
          <Steps items={checkoutSteps} current={activeStep} aria-label="Các bước đặt hàng" />
        </div>
      </div>

      <div className="grid gap-8 py-7 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-8">
          <section aria-labelledby="shipping-heading">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EAF2FF] text-[#2563EB]">
                <MapPin size={19} aria-hidden />
              </span>
              <div>
                <p className="text-xs font-bold uppercase text-[#2563EB]">Nơi nhận hàng</p>
                <h2 id="shipping-heading" className="font-display text-xl font-semibold text-[#17201D]">Thông tin giao hàng</h2>
              </div>
            </div>

            <div className="mt-5 grid gap-4 rounded-lg border border-[#DDE4E0] bg-white p-5 sm:grid-cols-2">
              <Field label="Họ và tên" name="name" value={form.name} onChange={handleChange} required autoComplete="name" placeholder="Nguyễn Minh Anh" />
              <Field label="Số điện thoại" name="phone" value={form.phone} onChange={handleChange} required autoComplete="tel" inputMode="tel" placeholder="090 000 0000" />
              <div className="sm:col-span-2">
                <Field label="Địa chỉ" name="address" value={form.address} onChange={handleChange} required autoComplete="street-address" placeholder="Số nhà, tên đường, phường/xã" />
              </div>
              <Field label="Tỉnh / Thành phố" name="city" value={form.city} onChange={handleChange} required autoComplete="address-level1" placeholder="Hà Nội" />
              <label className="block">
                <span className="mb-2 block text-xs font-bold text-[#405049]">Ghi chú</span>
                <input name="note" value={form.note} onChange={handleChange} placeholder="Ví dụ: giao giờ hành chính" className="h-11 w-full rounded-lg border border-[#D5DEDA] px-3 text-sm outline-none focus:border-[#0F766E]" />
              </label>
            </div>
          </section>

          <section aria-labelledby="payment-heading">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFF1EE] text-[#C93F2C]">
                <WalletCards size={19} aria-hidden />
              </span>
              <div>
                <p className="text-xs font-bold uppercase text-[#C93F2C]">Cách bạn thanh toán</p>
                <h2 id="payment-heading" className="font-display text-xl font-semibold text-[#17201D]">Phương thức thanh toán</h2>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {checkoutPaymentOptions.map((option) => {
                const detail = paymentDetails[option.value];
                const Icon = detail.icon;
                const active = payment === option.value;

                return (
                  <label
                    key={option.value}
                    className={`grid cursor-pointer grid-cols-[24px_36px_minmax(0,1fr)] gap-3 rounded-lg border p-4 transition ${
                      active
                        ? 'border-[#C93F2C] bg-[#FFF8F6] shadow-[0_0_0_1px_#C93F2C]'
                        : 'border-[#DDE4E0] bg-white hover:border-[#AFC0B8]'
                    }`}
                  >
                    <input
                      type="radio"
                      value={option.value}
                      checked={active}
                      onChange={() => setPayment(option.value)}
                      className="mt-1 h-4 w-4 accent-[#C93F2C]"
                    />
                    <Icon size={25} className={active ? 'text-[#C93F2C]' : 'text-[#68756F]'} aria-hidden />
                    <span>
                      <strong className="block text-sm text-[#17201D]">{detail.title}</strong>
                      <span className="mt-1 block text-xs leading-5 text-[#68756F]">{detail.description}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-lg border border-[#DDE4E0] bg-white p-5 lg:sticky lg:top-32" aria-label="Xác nhận đơn hàng">
          <h2 className="font-display text-xl font-semibold text-[#17201D]">Đơn của bạn</h2>
          <p className="mt-1 text-xs text-[#68756F]">{items.length} dòng sản phẩm</p>

          <div className="mt-5 max-h-64 space-y-4 overflow-y-auto pr-1">
            {items.map((item) => (
              <div key={item.id} className="grid grid-cols-[44px_minmax(0,1fr)_auto] gap-3 text-sm">
                <div className="relative h-11 w-11 overflow-hidden rounded-md bg-[#EEF2EF]">
                  {item.image && <img src={item.image} alt="" className="h-full w-full object-cover" />}
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#17201D] px-1 text-[10px] font-bold text-white">{item.quantity}</span>
                </div>
                <span className="line-clamp-2 text-xs leading-5 text-[#405049]">{item.name}</span>
                <span className="text-xs font-semibold text-[#17201D]">{formatVnd(calculateLineTotal(item))}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 space-y-3 border-t border-[#EDF1EF] pt-5 text-sm text-[#5E6B66]">
            <div className="flex justify-between gap-3"><span>Tạm tính</span><span>{formatVnd(subtotal)}</span></div>
            <div className="flex justify-between gap-3">
              <span>Phí vận chuyển</span>
              <span aria-busy={shippingLoading} className="min-w-20 text-right">
                {shippingLoading
                  ? <Skeleton as="span" className="inline-block h-4 w-20 align-middle" />
                  : formatVnd(shippingFee)}
              </span>
            </div>
            {shippingEstimate?.note && <p className="text-xs leading-5 text-[#7A8781]">{shippingEstimate.note}</p>}
          </div>

          <div className="mt-5 flex items-end justify-between gap-3 border-t border-[#EDF1EF] pt-5">
            <span className="font-bold text-[#17201D]">Tổng thanh toán</span>
            <span className="min-w-28 text-right text-xl font-bold text-[#C93F2C]" aria-busy={shippingLoading}>
              {shippingLoading
                ? <Skeleton as="span" className="inline-block h-7 w-28 align-middle" />
                : formatVnd(payableTotal)}
            </span>
          </div>

          {error && (
            <p className="mt-4 rounded-lg border border-[#F3C9C1] bg-[#FFF1EE] p-3 text-xs leading-5 text-[#A73525]" role="alert">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleOrder}
            disabled={createOrder.isPending}
            aria-busy={createOrder.isPending}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#C93F2C] text-sm font-bold text-white shadow-sm hover:bg-[#AA3425] disabled:cursor-wait disabled:bg-[#D9A59D]"
          >
            {createOrder.isPending ? (
              <>
                <Spinner size="sm" label="Đang ghi nhận đơn..." />
                Đang ghi nhận đơn...
              </>
            ) : (
              <>
                <LockKeyhole size={17} aria-hidden />
                {payment === 'bank_transfer' ? 'Tạo đơn và mã VietQR' : 'Đặt hàng an toàn'}
              </>
            )}
          </button>

          <div className="mt-4 space-y-2 text-xs text-[#5E6B66]">
            <p className="flex items-center gap-2"><ShieldCheck size={15} className="text-[#0F766E]" />Đơn chỉ được ghi nhận một lần</p>
            <p className="flex items-center gap-2"><Truck size={15} className="text-[#2563EB]" />Theo dõi vị trí sau khi bàn giao</p>
          </div>
        </aside>
      </div>
    </main>
  );
}

export default CheckoutPage;

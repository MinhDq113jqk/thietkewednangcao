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
import useCartStore from '../store/cartStore';
import { calculateLineTotal, formatVnd } from '../utils/format';

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
      <main className="mx-auto flex min-h-[60vh] max-w-7xl flex-col items-center justify-center px-4 py-16 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-lg bg-[#E6F3F1] text-[#0F766E]">
          <ShoppingBag size={30} aria-hidden />
        </span>
        <h1 className="mt-5 font-display text-3xl font-semibold text-[#17201D]">Giỏ hàng đang trống</h1>
        <p className="mt-2 max-w-md text-sm leading-6 text-[#68756F]">
          Khám phá một món quà có câu chuyện và quay lại đây khi bạn đã chọn được.
        </p>
        <Link
          to="/products"
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-[#0F766E] px-5 text-sm font-bold text-white hover:bg-[#0B5F58]"
        >
          Tiếp tục khám phá
          <ArrowRight size={17} aria-hidden />
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#DDE4E0] pb-5">
        <div>
          <p className="text-xs font-bold uppercase text-[#0F766E]">Sẵn sàng đặt hàng</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-[#17201D]">Giỏ hàng của bạn</h1>
          <p className="mt-1 text-sm text-[#68756F]">{totalItems()} sản phẩm</p>
        </div>
        <Link to="/products" className="flex items-center gap-1 text-sm font-semibold text-[#0F766E] hover:text-[#0B5F58]">
          Mua thêm <ArrowRight size={16} aria-hidden />
        </Link>
      </div>

      <div className="grid gap-8 py-7 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-label="Sản phẩm trong giỏ">
          <div className="divide-y divide-[#EDF1EF] border-y border-[#DDE4E0] bg-white">
            {items.map((item) => {
              const image = item.image || item.images?.[0];
              const maxQuantity = Number(item.stock || 99);

              return (
                <article key={item.id} className="grid grid-cols-[84px_minmax(0,1fr)] gap-4 p-4 sm:grid-cols-[104px_minmax(0,1fr)_auto] sm:items-center">
                  <Link to={`/products/${item.id}`} className="aspect-square overflow-hidden rounded-lg bg-[#EEF2EF]">
                    {image ? (
                      <img src={image} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-[#8A9691]">
                        <PackageOpen size={30} aria-hidden />
                      </span>
                    )}
                  </Link>

                  <div className="min-w-0">
                    <Link to={`/products/${item.id}`} className="line-clamp-2 text-sm font-semibold leading-6 text-[#17201D] hover:text-[#0F766E]">
                      {item.name}
                    </Link>
                    {item.shop?.name && <p className="mt-1 truncate text-xs text-[#7A8781]">{item.shop.name}</p>}
                    <p className="mt-2 text-base font-bold text-[#C93F2C]">{formatVnd(item.price)}</p>

                    <div className="mt-3 flex items-center justify-between sm:hidden">
                      <div className="grid grid-cols-[34px_38px_34px] overflow-hidden rounded-lg border border-[#D5DEDA]">
                        <button type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)} className="flex h-8 items-center justify-center hover:bg-[#EEF4F1]" aria-label={`Giảm số lượng ${item.name}`}>
                          <Minus size={14} />
                        </button>
                        <span className="flex items-center justify-center border-x border-[#D5DEDA] text-sm font-semibold">{item.quantity}</span>
                        <button type="button" onClick={() => updateQuantity(item.id, Math.min(maxQuantity, item.quantity + 1))} className="flex h-8 items-center justify-center hover:bg-[#EEF4F1]" aria-label={`Tăng số lượng ${item.name}`}>
                          <Plus size={14} />
                        </button>
                      </div>
                      <button type="button" onClick={() => removeItem(item.id)} className="flex h-9 w-9 items-center justify-center rounded-md text-[#C93F2C] hover:bg-[#FFF1EE]" aria-label={`Xóa ${item.name}`}>
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>

                  <div className="hidden min-w-36 sm:block">
                    <div className="flex justify-end">
                      <div className="grid grid-cols-[34px_42px_34px] overflow-hidden rounded-lg border border-[#D5DEDA]">
                        <button type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)} className="flex h-9 items-center justify-center hover:bg-[#EEF4F1]" aria-label={`Giảm số lượng ${item.name}`}>
                          <Minus size={14} />
                        </button>
                        <span className="flex items-center justify-center border-x border-[#D5DEDA] text-sm font-semibold">{item.quantity}</span>
                        <button type="button" onClick={() => updateQuantity(item.id, Math.min(maxQuantity, item.quantity + 1))} className="flex h-9 items-center justify-center hover:bg-[#EEF4F1]" aria-label={`Tăng số lượng ${item.name}`}>
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                    <p className="mt-3 text-right text-sm font-bold text-[#17201D]">{formatVnd(calculateLineTotal(item))}</p>
                    <button type="button" onClick={() => removeItem(item.id)} className="ml-auto mt-2 flex items-center gap-1 text-xs font-semibold text-[#A94435] hover:text-[#C93F2C]">
                      <Trash2 size={13} aria-hidden />
                      Xóa
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <button
            type="button"
            onClick={clearCart}
            className="mt-4 text-xs font-semibold text-[#7A8781] hover:text-[#C93F2C]"
          >
            Xóa toàn bộ giỏ hàng
          </button>
        </section>

        <aside className="h-fit rounded-lg border border-[#DDE4E0] bg-white p-5 lg:sticky lg:top-32" aria-label="Tóm tắt giỏ hàng">
          <h2 className="font-display text-xl font-semibold text-[#17201D]">Tóm tắt đơn</h2>
          <div className="mt-5 space-y-3 text-sm text-[#5E6B66]">
            <div className="flex justify-between gap-3">
              <span>Tạm tính</span>
              <span>{formatVnd(totalPrice())}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span>Phí vận chuyển</span>
              <span className="text-right">Tính theo địa chỉ</span>
            </div>
          </div>
          <div className="mt-5 flex items-end justify-between gap-3 border-t border-[#EDF1EF] pt-5">
            <span className="font-bold text-[#17201D]">Tổng tạm tính</span>
            <span className="text-xl font-bold text-[#C93F2C]">{formatVnd(totalPrice())}</span>
          </div>

          <Link
            to="/checkout"
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#C93F2C] text-sm font-bold text-white shadow-sm hover:bg-[#AA3425]"
          >
            Tiến hành thanh toán
            <ArrowRight size={18} aria-hidden />
          </Link>

          <div className="mt-5 space-y-3 border-t border-[#EDF1EF] pt-5 text-xs text-[#5E6B66]">
            <p className="flex items-center gap-2"><ShieldCheck size={16} className="text-[#0F766E]" />Đơn không bị tạo trùng khi mạng chập chờn</p>
            <p className="flex items-center gap-2"><Truck size={16} className="text-[#2563EB]" />Có mã và hành trình vận chuyển sau khi gửi</p>
          </div>
        </aside>
      </div>
    </main>
  );
}

export default CartPage;

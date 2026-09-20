import {
  PackageOpen,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from './ui/toastStore';
import { formatVnd, getProductPrice, toNumber } from '../utils/format';

const getProductImage = (product) => {
  if (product.image) return product.image;
  if (Array.isArray(product.images) && product.images.length > 0) return product.images[0];
  return null;
};

function ProductCard({ product, onAddToCart, recommendationReason }) {
  const originalPrice = toNumber(product.oldPrice || product.price);
  const currentPrice = getProductPrice(product);
  const shopName = typeof product.shop === 'string' ? product.shop : product.shop?.name;
  const hasDiscount = originalPrice > 0 && currentPrice > 0 && currentPrice < originalPrice;
  const discountPct = hasDiscount ? Math.round((1 - currentPrice / originalPrice) * 100) : 0;
  const image = getProductImage(product);
  const rating = Number(product.rating || product.shop?.rating || 0);
  const sold = Number(product.sold || 0);
  const outOfStock = Number(product.stock) <= 0;

  const handleAdd = () => {
    if (!onAddToCart || outOfStock) return;
    onAddToCart({ ...product, image: image || product.image, price: currentPrice });
    toast.success(`Đã thêm ${product.name} vào giỏ`);
  };

  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-[#DFE5E1] bg-white transition duration-200 hover:-translate-y-0.5 hover:border-[#8BC3BD] hover:shadow-[0_12px_30px_rgba(23,32,29,0.10)]">
      <Link
        to={`/products/${product.id}`}
        className="relative block aspect-[4/3] overflow-hidden bg-[#EEF2EF]"
        aria-label={`Xem ${product.name}`}
      >
        {image ? (
          <img
            src={image}
            alt={product.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-[#82918B]">
            <PackageOpen size={42} strokeWidth={1.5} aria-hidden />
          </span>
        )}

        <div className="absolute left-2 top-2 flex flex-col items-start gap-1.5">
          {hasDiscount && (
            <span className="rounded-md bg-[#C93F2C] px-2 py-1 text-[11px] font-bold text-white">
              Giảm {discountPct}%
            </span>
          )}
          {product.isFlashSale && (
            <span className="rounded-md bg-[#17201D] px-2 py-1 text-[11px] font-bold text-white">
              Bán nhanh
            </span>
          )}
        </div>

        {product.category && (
          <span className="absolute bottom-2 left-2 max-w-[calc(100%-16px)] truncate rounded-md bg-white/92 px-2 py-1 text-[11px] font-semibold text-[#405049] shadow-sm backdrop-blur">
            {product.category}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        {recommendationReason && (
          <p className="mb-2 flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-[#0F766E]">
            <Sparkles size={13} className="shrink-0" aria-hidden />
            <span className="truncate">{recommendationReason}</span>
          </p>
        )}

        <Link to={`/products/${product.id}`} className="block">
          <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-[#17201D] transition group-hover:text-[#0F766E]">
            {product.name}
          </h3>
        </Link>

        {shopName && (
          <div className="mt-2 flex min-w-0 items-center gap-1.5 text-xs text-[#68756F]">
            <Store size={13} className="shrink-0" aria-hidden />
            <span className="truncate">{shopName}</span>
          </div>
        )}

        <div className="mt-2 flex items-center justify-between gap-2 text-xs text-[#68756F]">
          <span className="flex items-center gap-1">
            <Star size={13} className="fill-[#F2C14E] text-[#F2C14E]" aria-hidden />
            {rating ? rating.toFixed(1) : 'Mới'}
          </span>
          <span>
            {sold
              ? `Đã bán ${sold >= 1000 ? `${(sold / 1000).toFixed(1)}k` : sold}`
              : outOfStock ? 'Hết hàng' : 'Còn hàng'}
          </span>
        </div>

        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-[#C93F2C]">
              {formatVnd(currentPrice)}
            </p>
            {hasDiscount && (
              <p className="text-xs text-[#8A9691] line-through">
                {formatVnd(originalPrice)}
              </p>
            )}
          </div>

          {onAddToCart && (
            <button
              type="button"
              onClick={handleAdd}
              disabled={outOfStock}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[#0F766E] text-white transition hover:bg-[#0B5F58] disabled:cursor-not-allowed disabled:bg-[#CBD4D0]"
              aria-label={outOfStock ? `${product.name} đã hết hàng` : `Thêm ${product.name} vào giỏ`}
              title={outOfStock ? 'Hết hàng' : 'Thêm vào giỏ'}
            >
              <ShoppingBag size={17} aria-hidden />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default ProductCard;

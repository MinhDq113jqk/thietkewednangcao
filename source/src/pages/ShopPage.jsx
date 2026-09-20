import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, MapPin, PackageOpen, Star, Store } from 'lucide-react';
import { useParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import ProductCard from '../components/ProductCard';
import Skeleton, { ProductCardSkeleton } from '../components/ui/Skeleton';
import useCartStore from '../store/cartStore';

function ShopMark({ logo, name }) {
  if (logo) {
    return (
      <img
        src={logo}
        alt={`Biểu trưng ${name}`}
        className="h-16 w-16 rounded-lg border-2 border-white bg-white object-cover shadow-sm sm:h-20 sm:w-20"
      />
    );
  }

  return (
    <span className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-white bg-[#E6F3F1] text-xl font-bold text-[#0F766E] shadow-sm sm:h-20 sm:w-20">
      {name?.trim()?.charAt(0)?.toUpperCase() || <Store size={28} aria-hidden />}
    </span>
  );
}

function ShopPage() {
  const { slug } = useParams();
  const addItem = useCartStore((state) => state.addItem);

  const shopQuery = useQuery({
    queryKey: ['shop', slug],
    queryFn: () => axiosInstance.get(`/shops/${slug}`).then((response) => response.data),
    enabled: Boolean(slug),
  });

  const productsQuery = useQuery({
    queryKey: ['shop-products', slug],
    queryFn: () => axiosInstance.get(`/shops/${slug}/products`).then((response) => response.data),
    enabled: Boolean(slug) && shopQuery.isSuccess,
  });

  if (shopQuery.isLoading) {
    return (
      <main aria-busy="true">
        <div className="skeleton h-64 rounded-none border-b border-[#DDE4E0]" aria-hidden="true" />
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => <ProductCardSkeleton key={index} />)}
          </div>
        </div>
      </main>
    );
  }

  if (shopQuery.isError || !shopQuery.data) {
    return (
      <main className="mx-auto flex min-h-[480px] max-w-2xl flex-col items-center justify-center px-4 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#EEF2EF] text-[#68756F]">
          <Store size={24} aria-hidden />
        </span>
        <h1 className="mt-5 font-display text-3xl font-semibold text-[#17201D]">Không tìm thấy gian hàng</h1>
        <p className="mt-3 text-sm leading-6 text-[#68756F]">Gian hàng có thể đang được xét duyệt hoặc đường dẫn đã thay đổi.</p>
      </main>
    );
  }

  const shop = shopQuery.data;
  const products = Array.isArray(productsQuery.data) ? productsQuery.data : [];

  return (
    <main>
      <section className="relative min-h-64 overflow-hidden border-b border-[#DDE4E0] bg-[#EAF1EE]">
        {shop.banner && (
          <img src={shop.banner} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#17201D]/88 via-[#17201D]/66 to-[#17201D]/20" aria-hidden />
        <div className="relative mx-auto flex min-h-64 max-w-7xl items-end px-4 py-8 text-white">
          <div className="flex min-w-0 items-end gap-4">
            <ShopMark logo={shop.logo} name={shop.name} />
            <div className="min-w-0 pb-1">
              <p className="flex items-center gap-1.5 text-xs font-bold text-[#B7F0EA]">
                <BadgeCheck size={15} aria-hidden />
                Gian hàng đang hoạt động
              </p>
              <h1 className="mt-2 truncate font-display text-3xl font-semibold sm:text-4xl">{shop.name}</h1>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#E1EAE6]">
                <span className="flex items-center gap-1.5">
                  <Star size={14} className="fill-[#F2C14E] text-[#F2C14E]" aria-hidden />
                  {Number(shop.rating) ? Number(shop.rating).toFixed(1) : 'Gian hàng mới'}
                </span>
                {shop.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={14} aria-hidden />
                    {shop.location}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10" aria-busy={productsQuery.isLoading}>
        {shop.description && (
          <p className="mb-9 max-w-3xl text-sm leading-7 text-[#596760]">{shop.description}</p>
        )}

        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase text-[#0F766E]">Bộ sưu tập</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-[#17201D]">Sản phẩm của gian hàng</h2>
          </div>
          <span className="min-w-20 text-right text-sm font-semibold text-[#68756F]" aria-busy={productsQuery.isLoading}>
            {productsQuery.isLoading
              ? <Skeleton as="span" className="inline-block h-4 w-20 align-middle" />
              : `${products.length} sản phẩm`}
          </span>
        </div>

        {productsQuery.isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => <ProductCardSkeleton key={index} />)}
          </div>
        ) : productsQuery.isError ? (
          <p className="border-y border-[#DDE4E0] py-10 text-center text-sm text-[#B33625]">
            Chưa thể tải sản phẩm. Vui lòng thử lại sau.
          </p>
        ) : products.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} onAddToCart={addItem} />
            ))}
          </div>
        ) : (
          <div className="flex min-h-48 flex-col items-center justify-center border-y border-[#DDE4E0] text-center">
            <PackageOpen size={28} className="text-[#91A09A]" aria-hidden />
            <p className="mt-3 text-sm font-semibold text-[#596760]">Gian hàng chưa đăng sản phẩm.</p>
          </div>
        )}
      </section>
    </main>
  );
}

export default ShopPage;

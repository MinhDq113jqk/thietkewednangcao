import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  ChevronRight,
  MessageCircle,
  MapPin,
  Minus,
  PackageOpen,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Star,
  Store,
  Truck,
} from 'lucide-react';
import chatApi from '../api/chatApi';
import productApi from '../api/productApi';
import RecommendationSection from '../components/RecommendationSection';
import Skeleton from '../components/ui/Skeleton';
import { toast } from '../components/ui/toastStore';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';
import { formatVnd, getProductPrice, toNumber } from '../utils/format';
import { rememberCategory } from '../utils/recommendationPreferences';

function ProductDetailContent({ id }) {
  const navigate = useNavigate();
  const addItem = useCartStore((state) => state.addItem);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
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
    if (Array.isArray(product.images) && product.images.length) return product.images.filter(Boolean);
    return product.image ? [product.image] : [];
  }, [product]);

  useEffect(() => {
    if (product?.category) rememberCategory(product.category);
  }, [product?.category]);

  if (isLoading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8" aria-busy="true">
        <Skeleton className="h-4 w-56" />
        <div className="mt-6 grid gap-10 lg:grid-cols-2">
          <Skeleton className="aspect-square w-full rounded-lg" />
          <div className="space-y-5 py-4">
            <Skeleton className="h-8 w-4/5" />
            <Skeleton className="h-5 w-2/5" />
            <Skeleton className="h-12 w-1/2" />
            <Skeleton className="h-28 w-full" />
            <div className="flex gap-3 pt-3">
              <Skeleton className="h-12 w-36" />
              <Skeleton className="h-12 w-44" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (isError || !product) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-20 text-center">
        <PackageOpen className="mx-auto text-[#8A9691]" size={48} strokeWidth={1.4} />
        <h1 className="mt-4 font-display text-2xl font-semibold text-[#17201D]">Không tìm thấy sản phẩm</h1>
        <Link to="/products" className="mt-5 inline-flex rounded-lg bg-[#17201D] px-5 py-3 text-sm font-bold text-white hover:bg-[#0F766E]">
          Quay lại khám phá
        </Link>
      </main>
    );
  }

  const price = getProductPrice(product);
  const originalPrice = toNumber(product.price);
  const stock = Number(product.stock || 0);
  const reviews = product.reviews || [];
  const reviewCount = reviews.length;
  const rating = reviewCount
    ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviewCount
    : 0;
  const hasDiscount = product.salePrice && Number(product.salePrice) < originalPrice;

  const cartProduct = {
    ...product,
    image: images[selectedImage] || images[0] || product.image,
    price,
    quantity,
  };

  const addToCart = () => {
    addItem(cartProduct);
    toast.success(`Đã thêm ${quantity} sản phẩm vào giỏ`);
  };

  const buyNow = () => {
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
    <main className="bg-[#F7F8F5]">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <nav className="flex items-center gap-1 overflow-hidden text-xs text-[#68756F]" aria-label="Đường dẫn">
          <Link to="/" className="hover:text-[#0F766E]">Trang chủ</Link>
          <ChevronRight size={13} aria-hidden />
          <Link to="/products" className="hover:text-[#0F766E]">Sản phẩm</Link>
          <ChevronRight size={13} aria-hidden />
          <span className="truncate text-[#405049]">{product.name}</span>
        </nav>
      </div>

      <section className="border-y border-[#DDE4E0] bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(380px,0.95fr)] lg:gap-12">
          <div>
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-[#EEF2EF]">
              {images.length ? (
                <img
                  src={images[selectedImage]}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <PackageOpen size={64} className="text-[#8A9691]" strokeWidth={1.3} aria-hidden />
              )}
            </div>
            {images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {images.map((image, index) => (
                  <button
                    key={image}
                    type="button"
                    onClick={() => setSelectedImage(index)}
                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 ${
                      selectedImage === index ? 'border-[#0F766E]' : 'border-transparent'
                    }`}
                    aria-label={`Xem ảnh ${index + 1}`}
                  >
                    <img src={image} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-2">
              {product.category && (
                <Link
                  to={`/products?category=${encodeURIComponent(product.category)}`}
                  className="text-xs font-bold uppercase text-[#0F766E] hover:underline"
                >
                  {product.category}
                </Link>
              )}
              {product.isFlashSale && (
                <span className="rounded-md bg-[#FFF1EE] px-2 py-1 text-xs font-bold text-[#C93F2C]">Bán nhanh</span>
              )}
            </div>

            <h1 className="mt-3 font-display text-3xl font-semibold leading-tight text-[#17201D] md:text-4xl">
              {product.name}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-[#68756F]">
              <span className="flex items-center gap-1">
                <Star size={16} className="fill-[#F2C14E] text-[#F2C14E]" aria-hidden />
                <strong className="text-[#17201D]">{rating ? rating.toFixed(1) : 'Mới'}</strong>
                ({reviewCount} đánh giá)
              </span>
              <span>Đã bán {Number(product.sold || 0).toLocaleString('vi-VN')}</span>
              <span className={stock > 0 ? 'text-[#0F766E]' : 'text-[#C93F2C]'}>
                {stock > 0 ? `Còn ${stock} sản phẩm` : 'Tạm hết hàng'}
              </span>
            </div>

            <div className="mt-6 border-y border-[#EDF1EF] py-5">
              <div className="flex flex-wrap items-end gap-3">
                <span className="text-3xl font-bold text-[#C93F2C]">{formatVnd(price)}</span>
                {hasDiscount && (
                  <span className="pb-1 text-sm text-[#8A9691] line-through">{formatVnd(originalPrice)}</span>
                )}
              </div>
            </div>

            <p className="mt-5 text-sm leading-7 text-[#4D5A55]">
              {product.description || 'Thông tin chi tiết về chất liệu và quy trình hoàn thiện đang được gian hàng cập nhật.'}
            </p>

            {product.craftVillage && (
              <Link
                to={product.craftVillage.region?.slug ? `/culture/${product.craftVillage.region.slug}` : '/explore'}
                className="group mt-5 flex items-center justify-between gap-4 rounded-xl border border-[#D8B968] bg-[#FFF8E6] p-4 transition hover:border-[#B88728] hover:shadow-sm"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#8B4A2F] text-[#FFE4A0]">
                    <MapPin size={20} aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[11px] font-bold uppercase tracking-[0.11em] text-[#8B4A2F]">Dấu nghề trên bản đồ</span>
                    <strong className="mt-1 block truncate text-sm text-[#2D2119]">Sản phẩm thuộc {product.craftVillage.name}</strong>
                    <span className="mt-1 block text-xs text-[#746253]">Thăm vùng {product.craftVillage.region?.name || 'văn hóa'} và xem câu chuyện xưởng nghề</span>
                  </span>
                </span>
                <ArrowRight size={18} className="shrink-0 text-[#8B4A2F] transition group-hover:translate-x-1" aria-hidden />
              </Link>
            )}

            {product.shop && (
              <div className="mt-5 flex flex-col gap-3 rounded-lg border border-[#DDE4E0] bg-[#F9FAF8] p-3 sm:flex-row sm:items-center">
                <Link
                  to={`/shop/${product.shop.slug}`}
                  className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-md p-1 hover:text-[#0F766E]"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E6F3F1] text-[#0F766E]">
                      <Store size={20} aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs text-[#68756F]">Sản phẩm từ</span>
                      <strong className="block truncate text-sm text-[#17201D]">{product.shop.name}</strong>
                    </span>
                  </span>
                  <ChevronRight size={18} className="text-[#68756F]" aria-hidden />
                </Link>
                <button
                  type="button"
                  onClick={startSellerChat}
                  disabled={isStartingChat}
                  className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-[#0F766E] bg-white px-3 text-sm font-bold text-[#0F766E] hover:bg-[#E6F3F1] disabled:cursor-wait disabled:opacity-60"
                >
                  <MessageCircle size={17} aria-hidden />
                  {isStartingChat ? 'Đang mở...' : 'Nhắn người bán'}
                </button>
              </div>
            )}

            <div className="mt-6 flex items-center gap-3">
              <span className="text-sm font-semibold text-[#405049]">Số lượng</span>
              <div className="grid grid-cols-[36px_42px_36px] overflow-hidden rounded-lg border border-[#D5DEDA]">
                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  className="flex h-9 items-center justify-center hover:bg-[#EEF4F1]"
                  aria-label="Giảm số lượng"
                >
                  <Minus size={15} aria-hidden />
                </button>
                <output className="flex h-9 items-center justify-center border-x border-[#D5DEDA] text-sm font-bold">
                  {quantity}
                </output>
                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.min(stock || 1, value + 1))}
                  className="flex h-9 items-center justify-center hover:bg-[#EEF4F1]"
                  aria-label="Tăng số lượng"
                >
                  <Plus size={15} aria-hidden />
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={addToCart}
                disabled={stock < 1}
                className="flex h-12 items-center justify-center gap-2 rounded-lg border border-[#0F766E] bg-white text-sm font-bold text-[#0F766E] hover:bg-[#E6F3F1] disabled:cursor-not-allowed disabled:border-[#CBD4D0] disabled:text-[#8A9691]"
              >
                <ShoppingBag size={18} aria-hidden />
                Thêm vào giỏ
              </button>
              <button
                type="button"
                onClick={buyNow}
                disabled={stock < 1}
                className="flex h-12 items-center justify-center gap-2 rounded-lg bg-[#C93F2C] text-sm font-bold text-white hover:bg-[#AA3425] disabled:cursor-not-allowed disabled:bg-[#CBD4D0]"
              >
                Mua ngay
                <ChevronRight size={18} aria-hidden />
              </button>
            </div>

            <div className="mt-5 grid gap-3 border-t border-[#EDF1EF] pt-5 text-xs text-[#5E6B66] sm:grid-cols-3">
              <span className="flex items-center gap-2"><BadgeCheck size={17} className="text-[#0F766E]" />Nguồn gốc rõ ràng</span>
              <span className="flex items-center gap-2"><Truck size={17} className="text-[#2563EB]" />Theo dõi vận chuyển</span>
              <span className="flex items-center gap-2"><ShieldCheck size={17} className="text-[#C93F2C]" />Bảo vệ đơn hàng</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-12 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <p className="text-xs font-bold uppercase text-[#0F766E]">Thông tin sản phẩm</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-[#17201D]">Câu chuyện và chất liệu</h2>
          <p className="mt-4 whitespace-pre-line text-sm leading-7 text-[#4D5A55]">
            {product.description || 'Gian hàng chưa bổ sung câu chuyện chi tiết cho sản phẩm này.'}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-[#0F766E]">Đánh giá đã xác thực</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-[#17201D]">{reviewCount} nhận xét</h2>
          <div className="mt-4 space-y-3">
            {product.reviews?.length ? product.reviews.slice(0, 3).map((review) => (
              <article key={review.id} className="rounded-lg border border-[#DDE4E0] bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-sm text-[#17201D]">{review.user?.name || 'Khách hàng'}</strong>
                  <span className="flex text-[#F2C14E]">
                    {Array.from({ length: review.rating }).map((_, index) => (
                      <Star key={index} size={13} fill="currentColor" aria-hidden />
                    ))}
                  </span>
                </div>
                {review.comment && <p className="mt-2 text-sm leading-6 text-[#5E6B66]">{review.comment}</p>}
              </article>
            )) : (
              <p className="rounded-lg border border-dashed border-[#CBD4D0] p-4 text-sm text-[#68756F]">
                Chưa có đánh giá. Đánh giá đầu tiên sẽ xuất hiện sau khi đơn được giao.
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pb-12">
        <RecommendationSection
          productId={product.id}
          title="Có thể bạn cũng thích"
          eyebrow="Tiếp tục khám phá"
        />
      </div>
    </main>
  );
}

function ProductDetailPage() {
  const { id } = useParams();
  return <ProductDetailContent key={id} id={id} />;
}

export default ProductDetailPage;

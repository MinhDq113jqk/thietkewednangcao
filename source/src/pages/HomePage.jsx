import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Box,
  ChevronRight,
  Compass,
  Image,
  KeyRound,
  Leaf,
  MapPin,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Truck,
} from 'lucide-react';
import productApi from '../api/productApi';
import heroImage from '../assets/hero-souvenir-v2.webp';
import ProductCard from '../components/ProductCard';
import { ProductCardSkeleton } from '../components/ui/Skeleton';
import RecommendationSection from '../components/RecommendationSection';
import useCartStore from '../store/cartStore';

const categories = [
  { name: 'Gốm sứ', english: 'Ceramics', icon: Box, color: 'bg-[#E6F3F1] text-[#0F766E]' },
  { name: 'Tranh dân gian', english: 'Folk art', icon: Image, color: 'bg-[#FFF1EE] text-[#C93F2C]' },
  { name: 'Móc khóa', english: 'Keepsakes', icon: KeyRound, color: 'bg-[#FFF7D6] text-[#8A6500]' },
  { name: 'Mây tre', english: 'Bamboo craft', icon: Leaf, color: 'bg-[#EDF5E8] text-[#3E7A35]' },
];

const benefits = [
  {
    icon: BadgeCheck,
    title: 'Nguồn gốc rõ ràng',
    description: 'Thông tin gian hàng và nơi làm sản phẩm được hiển thị nhất quán.',
    color: 'text-[#0F766E] bg-[#E6F3F1]',
  },
  {
    icon: Sparkles,
    title: 'Gợi ý đúng sở thích',
    description: 'Ưu tiên chất liệu, mức giá và danh mục bạn thường quan tâm.',
    color: 'text-[#8A6500] bg-[#FFF7D6]',
  },
  {
    icon: ShieldCheck,
    title: 'Đặt hàng một lần',
    description: 'Yêu cầu gửi lại khi mạng yếu không tạo thêm đơn hoặc trừ kho lần nữa.',
    color: 'text-[#C93F2C] bg-[#FFF1EE]',
  },
  {
    icon: Truck,
    title: 'Theo dõi hành trình',
    description: 'Xem mã vận đơn, vị trí hiện tại và thời gian giao dự kiến.',
    color: 'text-[#2563EB] bg-[#EAF2FF]',
  },
];

function HomePage() {
  const navigate = useNavigate();
  const addItem = useCartStore((state) => state.addItem);
  const { data, isLoading } = useQuery({
    queryKey: ['home-popular-products'],
    queryFn: () => productApi.getProducts({ limit: 8, sort: 'sold_desc' }),
    staleTime: 60_000,
  });
  const products = data?.items || [];

  const handleSearch = (event) => {
    event.preventDefault();
    const search = String(new FormData(event.currentTarget).get('search') || '').trim();
    if (search) navigate(`/products?search=${encodeURIComponent(search)}`);
  };

  return (
    <main className="bg-[#F7F8F5] text-[#17201D]">
      <section className="overflow-hidden border-b border-[#DDE4E0] bg-[#EEF3EF]">
        <div className="mx-auto grid min-h-[560px] max-w-7xl items-stretch lg:grid-cols-[0.94fr_1.06fr]">
          <div className="flex items-center px-4 py-12 sm:py-16 lg:pr-12">
            <div className="max-w-xl">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#0F766E]">
                <span className="h-px w-8 bg-[#0F766E]" aria-hidden />
                Hai lối vào · Một giỏ hàng
              </p>
              <h1 className="mt-5 font-display text-[44px] font-semibold leading-[1.04] text-[#17201D] sm:text-6xl">
                Mua quà Việt theo cách của bạn.
              </h1>
              <p className="mt-5 max-w-lg text-sm leading-7 text-[#4D5A55] sm:text-base">
                Chọn nhanh món quà theo giá và nhu cầu, hoặc đi qua bản đồ để gặp vùng đất, làng nghề và câu chuyện phía sau sản phẩm.
              </p>

              <form onSubmit={handleSearch} role="search" className="mt-7 flex max-w-xl gap-2">
                <label className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-lg border border-[#C8D5CF] bg-white px-4 shadow-sm focus-within:border-[#0F766E]">
                  <Search size={18} className="shrink-0 text-[#68756F]" aria-hidden />
                  <input
                    name="search"
                    type="search"
                    aria-label="Tìm nhanh sản phẩm"
                    placeholder="Tìm gốm, tranh, quà theo vùng..."
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                  />
                </label>
                <button type="submit" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#17201D] text-white hover:bg-[#0F766E]" aria-label="Tìm sản phẩm">
                  <Search size={18} aria-hidden />
                </button>
              </form>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Link
                  to="/products"
                  className="group flex min-h-20 items-center justify-between gap-3 rounded-xl bg-[#C93F2C] px-5 py-4 text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#AE3425]"
                >
                  <span>
                    <span className="flex items-center gap-2 text-sm font-bold"><ShoppingBag size={17} aria-hidden />Mua sắm nhanh</span>
                    <span className="mt-1 block text-xs text-white/78">Danh mục, bộ lọc và giá bán</span>
                  </span>
                  <ArrowRight size={18} className="transition group-hover:translate-x-1" aria-hidden />
                </Link>
                <Link
                  to="/explore"
                  className="group flex min-h-20 items-center justify-between gap-3 rounded-xl border border-[#9FB9AE] bg-white px-5 py-4 text-[#173B34] shadow-sm transition hover:-translate-y-0.5 hover:border-[#0F766E]"
                >
                  <span>
                    <span className="flex items-center gap-2 text-sm font-bold"><Compass size={17} aria-hidden />Khám phá bản đồ</span>
                    <span className="mt-1 block text-xs text-[#68756F]">Vùng văn hóa và làng nghề</span>
                  </span>
                  <ArrowRight size={18} className="transition group-hover:translate-x-1" aria-hidden />
                </Link>
              </div>
            </div>
          </div>

          <div className="relative min-h-[360px] overflow-hidden lg:min-h-[560px]">
            <img
              src={heroImage}
              alt="Bộ sưu tập quà Việt gồm gốm, sơn mài, mây tre và đồ thêu"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#102D28]/55 via-transparent to-transparent" aria-hidden />
            <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4 rounded-xl border border-white/20 bg-[#102D28]/78 p-4 text-white backdrop-blur sm:bottom-8 sm:left-8 sm:right-8">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#F2C14E]">Món quà có nơi chốn</p>
                <p className="mt-1 max-w-sm text-sm leading-6 text-white/88">Mua nhanh không có nghĩa là bỏ qua nguồn gốc. Mỗi sản phẩm được gắn với gian hàng và nơi làm nghề khi dữ liệu đã xác minh.</p>
              </div>
              <MapPin className="hidden shrink-0 text-[#F2C14E] sm:block" size={30} aria-hidden />
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#DDE4E0] bg-white">
        <div className="mx-auto grid max-w-7xl gap-1 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map(({ icon: Icon, title, description, color }) => (
            <div key={title} className="flex gap-3 px-2 py-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color}`}>
                <Icon size={20} aria-hidden />
              </span>
              <div>
                <h2 className="text-sm font-bold text-[#17201D]">{title}</h2>
                <p className="mt-1 text-xs leading-5 text-[#68756F]">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase text-[#0F766E]">Khám phá theo chất liệu</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-[#17201D] md:text-3xl">
              Mỗi vùng, một dấu ấn
            </h2>
          </div>
          <Link to="/products" className="hidden items-center gap-1 text-sm font-semibold text-[#0F766E] hover:text-[#0B5F58] sm:flex">
            Tất cả danh mục <ChevronRight size={16} aria-hidden />
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map(({ name, english, icon: Icon, color }) => (
            <Link
              key={name}
              to={`/products?category=${encodeURIComponent(name)}`}
              className="group flex min-h-32 items-end justify-between rounded-lg border border-[#DDE4E0] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#8BC3BD] hover:shadow-md"
            >
              <div>
                <p className="font-display text-xl font-semibold text-[#17201D] group-hover:text-[#0F766E]">{name}</p>
                <p className="mt-1 text-xs text-[#7A8781]">{english}</p>
              </div>
              <span className={`flex h-11 w-11 items-center justify-center rounded-lg ${color}`}>
                <Icon size={21} aria-hidden />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pb-12">
        <RecommendationSection />
      </div>

      <section className="border-y border-[#DDE4E0] bg-white" aria-busy={isLoading}>
        <div className="mx-auto max-w-7xl px-4 py-12">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase text-[#C93F2C]">
                <PackageCheck size={15} aria-hidden />
                Đang được săn tìm
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold text-[#17201D] md:text-3xl">
                Những món quà được chọn nhiều
              </h2>
            </div>
            <Link to="/products?sort=sold_desc" className="hidden items-center gap-1 text-sm font-semibold text-[#0F766E] hover:text-[#0B5F58] sm:flex">
              Xem thêm <ChevronRight size={16} aria-hidden />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {isLoading
              ? Array.from({ length: 8 }).map((_, index) => (
                  <ProductCardSkeleton key={index} />
                ))
              : products.map((product) => (
                  <ProductCard key={product.id} product={product} onAddToCart={addItem} />
                ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0F766E] text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-12 md:grid-cols-[1fr_auto]">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-xs font-bold uppercase text-[#B7F0EA]">
              <MapPin size={15} aria-hidden />
              Dành cho hộ gia đình, làng nghề và xưởng sản xuất
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold">Đưa câu chuyện sản phẩm của bạn đến đúng người.</h2>
            <p className="mt-3 text-sm leading-6 text-[#D5F1ED]">
              Quản lý gian hàng, sản phẩm, đơn và hành trình giao hàng trên cùng một hệ thống.
            </p>
          </div>
          <Link
            to="/seller/register"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#F2C14E] px-5 text-sm font-bold text-[#17201D] hover:bg-[#FFD765]"
          >
            <Store size={18} aria-hidden />
            Mở gian hàng
          </Link>
        </div>
      </section>
    </main>
  );
}

export default HomePage;

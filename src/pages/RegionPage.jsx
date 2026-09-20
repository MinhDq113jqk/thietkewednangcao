import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Compass,
  Hammer,
  MapPin,
  PackageOpen,
  Sparkles,
  Users,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import cultureApi from '../api/cultureApi';
import ProductCard from '../components/ProductCard';
import { LoadingStatus } from '../components/ui/Spinner';
import useCartStore from '../store/cartStore';

const defaultTheme = {
  primary: '#174C45',
  accent: '#D89A3D',
  paper: '#F2E6C9',
  ink: '#17201D',
  wash: '#DCEBE5',
};

function RegionPage() {
  const { slug } = useParams();
  const addItem = useCartStore((state) => state.addItem);
  const { data: region, isLoading, isError } = useQuery({
    queryKey: ['culture-region', slug],
    queryFn: () => cultureApi.getRegion(slug),
    enabled: Boolean(slug),
    staleTime: 5 * 60_000,
  });

  const artisans = useMemo(() => (region?.villages || []).flatMap((village) => (
    (village.artisans || []).map((artisan) => ({ ...artisan, villageName: village.name }))
  )), [region]);

  if (isLoading) {
    return (
      <main className="min-h-[540px] bg-[#F7F8F5]">
        <LoadingStatus label="Đang mở hồ sơ văn hóa..." size="lg" className="min-h-[420px]" />
      </main>
    );
  }

  if (isError || !region) {
    return (
      <main className="flex min-h-[540px] items-center justify-center bg-[#F7F8F5] px-4">
        <div className="max-w-md rounded-2xl border border-[#DDE4E0] bg-white p-7 text-center shadow-sm">
          <Compass className="mx-auto text-[#0F766E]" size={34} aria-hidden />
          <h1 className="mt-4 font-display text-2xl font-semibold text-[#17201D]">Chưa mở được hồ sơ vùng</h1>
          <p className="mt-2 text-sm leading-6 text-[#68756F]">Dữ liệu văn hóa đang được kết nối lại. Hãy trở về bản đồ và chọn một điểm khác.</p>
          <Link to="/" className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#0F766E] px-5 py-3 text-sm font-bold text-white">
            <ArrowLeft size={16} aria-hidden />
            Về bản đồ
          </Link>
        </div>
      </main>
    );
  }

  const theme = { ...defaultTheme, ...(region.theme || {}) };
  const style = {
    '--region-primary': theme.primary,
    '--region-accent': theme.accent,
    '--region-paper': theme.paper,
    '--region-ink': theme.ink,
    '--region-wash': theme.wash,
  };

  return (
    <main className="culture-region-page" style={style}>
      <section className="relative overflow-hidden bg-[var(--region-primary)] text-white">
        <div className="culture-region-hero-pattern absolute inset-0" aria-hidden />
        <div className="relative mx-auto grid min-h-[520px] max-w-7xl items-center gap-10 px-4 py-12 lg:grid-cols-[1fr_0.8fr]">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-white/75 hover:text-white">
              <ArrowLeft size={16} aria-hidden />
              Trở lại bản đồ Việt Nam
            </Link>
            <p className="mt-10 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--region-accent)]">
              <MapPin size={15} aria-hidden />
              Hồ sơ văn hóa vùng
            </p>
            <h1 className="mt-4 font-display text-6xl font-semibold leading-none text-white sm:text-7xl lg:text-8xl">
              {region.name}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-white/78 sm:text-lg">
              {region.shortDescription}
            </p>
            <div className="mt-8 flex flex-wrap gap-3 text-sm">
              <span className="rounded-full border border-white/18 bg-white/8 px-4 py-2">
                {region.villages.length} làng nghề đang kể chuyện
              </span>
              <span className="rounded-full border border-white/18 bg-white/8 px-4 py-2">
                {region.products.length} sản phẩm có nguồn gốc
              </span>
            </div>
          </div>

          <div className="culture-region-emblem relative mx-auto aspect-square w-full max-w-[420px] rounded-full border border-white/15">
            <div className="absolute inset-[12%] rounded-full border border-white/12" />
            <div className="culture-region-orbit absolute inset-[21%] rounded-full border border-dashed border-[var(--region-accent)]/60" />
            <div className="absolute inset-[30%] flex items-center justify-center rounded-full bg-[var(--region-paper)] text-[var(--region-ink)] shadow-[0_24px_60px_rgba(0,0,0,0.25)]">
              <Hammer size={68} strokeWidth={1.2} aria-hidden />
            </div>
            <span className="absolute left-[5%] top-[46%] rounded-full bg-[var(--region-accent)] px-3 py-1.5 text-xs font-bold text-[var(--region-ink)]">
              Vật liệu
            </span>
            <span className="absolute right-[2%] top-[25%] rounded-full border border-white/18 bg-[var(--region-primary)] px-3 py-1.5 text-xs font-semibold">
              Ký ức
            </span>
            <span className="absolute bottom-[8%] right-[14%] rounded-full border border-white/18 bg-[var(--region-primary)] px-3 py-1.5 text-xs font-semibold">
              Bàn tay
            </span>
          </div>
        </div>
      </section>

      <section className="border-b border-[color:color-mix(in_srgb,var(--region-primary)_16%,transparent)] bg-[var(--region-paper)]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 lg:grid-cols-[0.72fr_1.28fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--region-primary)]">Một lát cắt lịch sử</p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-[var(--region-ink)] sm:text-4xl">
              Câu chuyện trước khi thành món quà
            </h2>
          </div>
          <p className="text-base leading-8 text-[color:color-mix(in_srgb,var(--region-ink)_76%,transparent)] sm:text-lg">
            {region.history}
          </p>
        </div>
      </section>

      <section className="bg-[var(--region-wash)]">
        <div className="mx-auto max-w-7xl px-4 py-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--region-primary)]">
                <Compass size={15} aria-hidden />
                Các điểm dừng
              </p>
              <h2 className="mt-2 font-display text-3xl font-semibold text-[var(--region-ink)]">Làng nghề trong vùng</h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-[color:color-mix(in_srgb,var(--region-ink)_64%,transparent)]">
              Tọa độ được lưu trong dữ liệu để tìm sản phẩm quanh vị trí người dùng hoặc theo đúng làng nghề.
            </p>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-2">
            {region.villages.map((village) => (
              <article key={village.id} className="group rounded-2xl border border-black/8 bg-white/78 p-6 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--region-primary)]">
                      {village.foundedYear ? `Dấu nghề từ khoảng ${village.foundedYear}` : 'Hồ sơ cộng đồng nghề'}
                    </p>
                    <h3 className="mt-2 font-display text-2xl font-semibold text-[var(--region-ink)]">{village.name}</h3>
                  </div>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--region-primary)] text-white">
                    <MapPin size={19} aria-hidden />
                  </span>
                </div>
                <p className="mt-4 text-sm leading-7 text-[color:color-mix(in_srgb,var(--region-ink)_68%,transparent)]">{village.summary}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {(village.crafts || []).map((craft) => (
                    <span key={craft} className="rounded-full bg-[var(--region-paper)] px-3 py-1 text-xs font-semibold text-[var(--region-ink)]">
                      {craft}
                    </span>
                  ))}
                </div>
                <p className="mt-5 text-xs text-[color:color-mix(in_srgb,var(--region-ink)_52%,transparent)]">
                  {Number(village.latitude).toFixed(4)}, {Number(village.longitude).toFixed(4)}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14">
          <div className="grid gap-8 lg:grid-cols-[0.62fr_1.38fr]">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--region-primary)]">
                <Users size={15} aria-hidden />
                Người giữ nghề
              </p>
              <h2 className="mt-2 font-display text-3xl font-semibold text-[var(--region-ink)]">Top nghệ nhân</h2>
              <p className="mt-3 text-sm leading-6 text-[#68756F]">Hồ sơ MVP hiện dùng dữ liệu mẫu; nội dung xuất bản cần quy trình xác minh và sự đồng ý của nghệ nhân.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {artisans.length ? artisans.map((artisan) => (
                <article key={`${artisan.villageName}-${artisan.name}`} className="border-l-2 border-[var(--region-accent)] bg-[var(--region-wash)] p-5">
                  <Sparkles size={18} className="text-[var(--region-primary)]" aria-hidden />
                  <h3 className="mt-3 font-semibold text-[var(--region-ink)]">{artisan.name}</h3>
                  <p className="mt-1 text-sm text-[#56665F]">{artisan.craft}</p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--region-primary)]">{artisan.villageName}</p>
                </article>
              )) : (
                <p className="text-sm text-[#68756F]">Hồ sơ nghệ nhân đang được cập nhật.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section id="products" className="border-t border-[#E3E8E5] bg-[#F7F8F5]">
        <div className="mx-auto max-w-7xl px-4 py-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--region-primary)]">
                <PackageOpen size={15} aria-hidden />
                Theo dấu nguồn gốc
              </p>
              <h2 className="mt-2 font-display text-3xl font-semibold text-[var(--region-ink)]">Sản phẩm nổi bật từ {region.name}</h2>
            </div>
            <Link to="/products" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--region-primary)] hover:underline">
              Mở toàn bộ cửa hàng <ArrowRight size={16} aria-hidden />
            </Link>
          </div>

          {region.products.length ? (
            <div className="mt-7 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {region.products.map((product) => (
                <ProductCard key={product.id} product={product} onAddToCart={addItem} />
              ))}
            </div>
          ) : (
            <div className="mt-7 rounded-2xl border border-dashed border-[#BFCBC6] bg-white p-8 text-center">
              <PackageOpen className="mx-auto text-[#8A9892]" size={32} aria-hidden />
              <p className="mt-3 font-semibold text-[#405049]">Chưa có sản phẩm được gắn với làng nghề này.</p>
              <p className="mt-1 text-sm text-[#68756F]">Chạy migration và seed để nạp dữ liệu MVP, hoặc liên kết sản phẩm trong cơ sở dữ liệu.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default RegionPage;

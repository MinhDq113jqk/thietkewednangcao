import { Container as BsContainer } from 'react-bootstrap';
import BsGrid from '../../home/components/ResponsiveGrid';
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
import ProductCard from '../../products/components/ProductCard';
import { LoadingStatus } from '../../../components/ui/Spinner';
import useCartStore from '../../cart/store/cartStore';

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
      <main className="region-page-detail-1">
        <LoadingStatus label="Đang mở hồ sơ văn hóa..." size="lg" className="region-page-detail-2" />
      </main>
    );
  }

  if (isError || !region) {
    return (
      <main className="d-flex align-items-center justify-content-center px-3 region-page-detail-3">
        <div className="rounded-4 border p-5 text-center shadow-sm region-page-detail-4">
          <Compass className="mx-auto text-primary" size={34} aria-hidden />
          <h1 className="mt-3 booking-title fs-4 fw-semibold text-dark">Chưa mở được hồ sơ vùng</h1>
          <p className="mt-2 booking-small text-secondary region-page-detail-5">Dữ liệu văn hóa đang được kết nối lại. Hãy trở về bản đồ và chọn một điểm khác.</p>
          <Link to="/" className="mt-4 d-inline-flex align-items-center gap-2 rounded-pill bg-primary px-4 py-2 booking-small fw-bold region-page-detail-6">
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
      <section className="position-relative overflow-hidden region-page-detail-7">
        <div className="culture-region-hero-pattern position-absolute region-page-detail-8" aria-hidden />
        <div className="position-relative mx-auto d-grid align-items-center gap-5 px-3 py-5 region-page-detail-9">
          <div>
            <Link to="/" className="d-inline-flex align-items-center gap-2 booking-small fw-semibold region-page-detail-10">
              <ArrowLeft size={16} aria-hidden />
              Trở lại bản đồ Việt Nam
            </Link>
            <p className="mt-5 d-flex align-items-center gap-2 booking-caption fw-bold text-uppercase region-page-detail-11">
              <MapPin size={15} aria-hidden />
              Hồ sơ văn hóa vùng
            </p>
            <h1 className="mt-3 booking-title fw-semibold lh-1 region-page-detail-12">
              {region.name}
            </h1>
            <p className="mt-4 fs-6 region-page-detail-13">
              {region.shortDescription}
            </p>
            <div className="mt-5 d-flex flex-wrap gap-3 booking-small">
              <span className="rounded-pill border px-3 py-2 region-page-detail-14">
                {region.villages.length} làng nghề đang kể chuyện
              </span>
              <span className="rounded-pill border px-3 py-2 region-page-detail-15">
                {region.products.length} sản phẩm có nguồn gốc
              </span>
            </div>
          </div>

          <div className="culture-region-emblem position-relative mx-auto w-100 rounded-pill border region-page-detail-16">
            <div className="position-absolute rounded-pill border region-page-detail-17" />
            <div className="culture-region-orbit position-absolute rounded-pill border region-page-detail-18" />
            <div className="position-absolute d-flex align-items-center justify-content-center rounded-pill region-page-detail-19">
              <Hammer size={68} strokeWidth={1.2} aria-hidden />
            </div>
            <span className="position-absolute rounded-pill px-2 py-2 booking-caption fw-bold region-page-detail-20">
              Vật liệu
            </span>
            <span className="position-absolute rounded-pill border px-2 py-2 booking-caption fw-semibold region-page-detail-21">
              Ký ức
            </span>
            <span className="position-absolute rounded-pill border px-2 py-2 booking-caption fw-semibold region-page-detail-22">
              Bàn tay
            </span>
          </div>
        </div>
      </section>

      <section className="border-bottom region-page-detail-23">
        <div className="mx-auto d-grid gap-5 px-3 py-5 region-page-detail-24">
          <div>
            <p className="booking-caption fw-bold text-uppercase region-page-detail-25">Một lát cắt lịch sử</p>
            <h2 className="mt-2 booking-title fs-3 fw-semibold region-page-detail-26">
              Câu chuyện trước khi thành món quà
            </h2>
          </div>
          <p className="fs-6 region-page-detail-27">
            {region.history}
          </p>
        </div>
      </section>

      <section className="region-page-detail-28">
        <BsContainer as="div" className="py-5">
          <div className="d-flex flex-wrap align-items-end justify-content-between gap-4">
            <div>
              <p className="d-flex align-items-center gap-2 booking-caption fw-bold text-uppercase region-page-detail-29">
                <Compass size={15} aria-hidden />
                Các điểm dừng
              </p>
              <h2 className="mt-2 booking-title fs-3 fw-semibold region-page-detail-30">Làng nghề trong vùng</h2>
            </div>
            <p className="booking-small region-page-detail-31">
              Tọa độ được lưu trong dữ liệu để tìm sản phẩm quanh vị trí người dùng hoặc theo đúng làng nghề.
            </p>
          </div>

          <BsGrid as="div" columns={{"xs":1,"md":2}} className="mt-5">
            {region.villages.map((village) => (
              <article key={village.id} className="rounded-4 border p-4 shadow-sm region-page-detail-32">
                <div className="d-flex align-items-start justify-content-between gap-5">
                  <div>
                    <p className="booking-caption fw-bold text-uppercase region-page-detail-33">
                      {village.foundedYear ? `Dấu nghề từ khoảng ${village.foundedYear}` : 'Hồ sơ cộng đồng nghề'}
                    </p>
                    <h3 className="mt-2 booking-title fs-4 fw-semibold region-page-detail-34">{village.name}</h3>
                  </div>
                  <span className="d-flex flex-shrink-0 align-items-center justify-content-center rounded-pill region-page-detail-35">
                    <MapPin size={19} aria-hidden />
                  </span>
                </div>
                <p className="mt-3 booking-small region-page-detail-36">{village.summary}</p>
                <div className="mt-4 d-flex flex-wrap gap-2">
                  {(village.crafts || []).map((craft) => (
                    <span key={craft} className="rounded-pill px-2 py-1 booking-caption fw-semibold region-page-detail-37">
                      {craft}
                    </span>
                  ))}
                </div>
                <p className="mt-4 booking-caption region-page-detail-38">
                  {Number(village.latitude).toFixed(4)}, {Number(village.longitude).toFixed(4)}
                </p>
              </article>
            ))}
          </BsGrid>
        </BsContainer>
      </section>

      <section className="region-page-detail-39">
        <BsContainer as="div" className="py-5">
          <div className="d-grid gap-5 region-page-detail-40">
            <div>
              <p className="d-flex align-items-center gap-2 booking-caption fw-bold text-uppercase region-page-detail-41">
                <Users size={15} aria-hidden />
                Người giữ nghề
              </p>
              <h2 className="mt-2 booking-title fs-3 fw-semibold region-page-detail-42">Top nghệ nhân</h2>
              <p className="mt-2 booking-small text-secondary region-page-detail-43">Hồ sơ MVP hiện dùng dữ liệu mẫu; nội dung xuất bản cần quy trình xác minh và sự đồng ý của nghệ nhân.</p>
            </div>
            <BsGrid as="div" columns={{"xs":1,"sm":2}} className="">
              {artisans.length ? artisans.map((artisan) => (
                <article key={`${artisan.villageName}-${artisan.name}`} className="border-start border-2 p-4 region-page-detail-44">
                  <Sparkles size={18} className="region-page-detail-45" aria-hidden />
                  <h3 className="mt-2 fw-semibold region-page-detail-46">{artisan.name}</h3>
                  <p className="mt-1 booking-small text-secondary">{artisan.craft}</p>
                  <p className="mt-2 booking-caption fw-semibold text-uppercase region-page-detail-47">{artisan.villageName}</p>
                </article>
              )) : (
                <p className="booking-small text-secondary">Hồ sơ nghệ nhân đang được cập nhật.</p>
              )}
            </BsGrid>
          </div>
        </BsContainer>
      </section>

      <section id="products" className="border-top region-page-detail-48">
        <BsContainer as="div" className="py-5">
          <div className="d-flex flex-wrap align-items-end justify-content-between gap-4">
            <div>
              <p className="d-flex align-items-center gap-2 booking-caption fw-bold text-uppercase region-page-detail-49">
                <PackageOpen size={15} aria-hidden />
                Theo dấu nguồn gốc
              </p>
              <h2 className="mt-2 booking-title fs-3 fw-semibold region-page-detail-50">Sản phẩm nổi bật từ {region.name}</h2>
            </div>
            <Link to="/products" className="d-inline-flex align-items-center gap-2 booking-small fw-bold region-page-detail-51">
              Mở toàn bộ cửa hàng <ArrowRight size={16} aria-hidden />
            </Link>
          </div>

          {region.products.length ? (
            <BsGrid as="div" columns={{"xs":2,"lg":4}} className="mt-5">
              {region.products.map((product) => (
                <ProductCard key={product.id} product={product} onAddToCart={addItem} />
              ))}
            </BsGrid>
          ) : (
            <div className="mt-5 rounded-4 border p-5 text-center region-page-detail-52">
              <PackageOpen className="mx-auto text-secondary" size={32} aria-hidden />
              <p className="mt-2 fw-semibold text-body">Chưa có sản phẩm được gắn với làng nghề này.</p>
              <p className="mt-1 booking-small text-secondary">Chạy migration và seed để nạp dữ liệu MVP, hoặc liên kết sản phẩm trong cơ sở dữ liệu.</p>
            </div>
          )}
        </BsContainer>
      </section>
    </main>
  );
}

export default RegionPage;

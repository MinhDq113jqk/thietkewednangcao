import { Form as BsForm, Button as BsButton } from 'react-bootstrap';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Compass,
  MapPin,
  Play,
  Search,
  Sparkles,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import cultureApi from '../api/cultureApi';

const isVideo = (source = '') => /\.(mp4|webm)(\?.*)?$/i.test(source);

function CraftPreview({ village }) {
  const media = village?.previewMedia;
  const label = village?.name || 'Câu chuyện làng nghề';

  if (media && isVideo(media)) {
    return (
      <video
        className="h-100 w-100 object-fit-cover"
        src={media}
        aria-label={label}
        autoPlay
        muted
        loop
        playsInline
      />
    );
  }

  if (media) {
    return <img className="h-100 w-100 object-fit-cover" src={media} alt={label} />;
  }

  return (
    <div className="culture-craft-motion" aria-hidden="true">
      <span className="culture-craft-grain" />
      <span className="culture-craft-chisel" />
      <span className="culture-craft-spark culture-craft-spark-one" />
      <span className="culture-craft-spark culture-craft-spark-two" />
      <span className="culture-craft-spark culture-craft-spark-three" />
    </div>
  );
}

function MapArtwork() {
  return (
    <svg
      viewBox="0 0 360 620"
      className="position-absolute overflow-visible culture-map-detail-1"
      role="img"
      aria-label="Bản đồ cách điệu hình chữ S của Việt Nam"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="culture-land" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F5E7C5" />
          <stop offset="0.55" stopColor="#D5D6A9" />
          <stop offset="1" stopColor="#9DC2AC" />
        </linearGradient>
        <linearGradient id="culture-edge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#D8A647" />
          <stop offset="1" stopColor="#A7672F" />
        </linearGradient>
        <filter id="culture-shadow" x="-40%" y="-20%" width="180%" height="160%">
          <feDropShadow dx="14" dy="18" stdDeviation="12" floodColor="#071A18" floodOpacity="0.42" />
        </filter>
        <pattern id="culture-paper-grain" width="18" height="18" patternUnits="userSpaceOnUse">
          <path d="M2 4l5-2M10 14l6-3M4 17l3-1" stroke="#6B7E67" strokeOpacity="0.16" strokeWidth="1" />
        </pattern>
      </defs>

      <g transform="rotate(-4 180 310)" filter="url(#culture-shadow)">
        <path
          d="M166 31C140 37 113 54 107 78c-6 25 16 45 11 70-5 27-25 43-19 69 6 28 38 31 44 55 6 23-14 42-9 66 6 31 39 38 47 65 7 24-9 45 0 70 10 29 40 43 50 70 9 25 0 47-13 64l50-15c15-19 16-45 5-69-12-28-39-44-45-70-6-24 10-47 3-72-8-31-41-41-49-68-7-25 12-45 5-70-7-29-40-36-43-62-3-23 18-42 20-66 2-21-14-39-8-64Z"
          fill="url(#culture-edge)"
          transform="translate(9 13)"
        />
        <path
          className="culture-map-land"
          d="M166 31C140 37 113 54 107 78c-6 25 16 45 11 70-5 27-25 43-19 69 6 28 38 31 44 55 6 23-14 42-9 66 6 31 39 38 47 65 7 24-9 45 0 70 10 29 40 43 50 70 9 25 0 47-13 64l50-15c15-19 16-45 5-69-12-28-39-44-45-70-6-24 10-47 3-72-8-31-41-41-49-68-7-25 12-45 5-70-7-29-40-36-43-62-3-23 18-42 20-66 2-21-14-39-8-64Z"
          fill="url(#culture-land)"
          stroke="#F4D685"
          strokeWidth="2.5"
        />
        <path
          d="M166 31C140 37 113 54 107 78c-6 25 16 45 11 70-5 27-25 43-19 69 6 28 38 31 44 55 6 23-14 42-9 66 6 31 39 38 47 65 7 24-9 45 0 70 10 29 40 43 50 70 9 25 0 47-13 64l50-15c15-19 16-45 5-69-12-28-39-44-45-70-6-24 10-47 3-72-8-31-41-41-49-68-7-25 12-45 5-70-7-29-40-36-43-62-3-23 18-42 20-66 2-21-14-39-8-64Z"
          fill="url(#culture-paper-grain)"
        />
        <g fill="none" stroke="#547B68" strokeOpacity="0.42" strokeWidth="1.2">
          <path d="M112 109c18 6 35 7 54 2" />
          <path d="M104 195c19 4 39 1 55-8" />
          <path d="M132 286c18 5 34 3 51-5" />
          <path d="M158 380c20 2 43-4 61-14" />
          <path d="M187 474c19-3 35-9 47-20" />
        </g>
      </g>

      <g className="culture-route" fill="none" stroke="#F4C862" strokeLinecap="round" strokeWidth="2">
        <path d="M126 104C172 145 151 210 166 274" />
        <path d="M166 274C187 321 177 374 204 423" />
        <path d="M204 423C218 465 244 493 246 540" />
      </g>
      <g fill="#F4C862" opacity="0.84">
        <circle cx="298" cy="170" r="3" />
        <circle cx="313" cy="184" r="2" />
        <circle cx="302" cy="445" r="2.5" />
        <circle cx="321" cy="461" r="2" />
        <circle cx="309" cy="477" r="1.8" />
      </g>
    </svg>
  );
}

function CultureMap() {
  const navigate = useNavigate();
  const [activeSlug, setActiveSlug] = useState('');
  const { data, isLoading, isError } = useQuery({
    queryKey: ['culture-regions'],
    queryFn: cultureApi.getRegions,
    staleTime: 5 * 60_000,
  });
  const regions = useMemo(() => data?.items || [], [data]);

  const activeRegion = regions.find((region) => region.slug === activeSlug) || regions[0];
  const activeVillage = activeRegion?.villages?.[0];

  const handleSearch = (event) => {
    event.preventDefault();
    const search = String(new FormData(event.currentTarget).get('search') || '').trim();
    if (search) navigate(`/products?search=${encodeURIComponent(search)}`);
  };

  return (
    <section className="position-relative overflow-hidden border-bottom culture-map-detail-2">
      <div className="position-absolute culture-map-atmosphere culture-map-detail-3" aria-hidden="true" />
      <div className="position-relative mx-auto d-grid align-items-center gap-5 px-3 py-5 py-lg-5 culture-map-detail-4">
        <div className="position-relative culture-map-detail-5">
          <p className="d-flex align-items-center gap-2 booking-caption fw-bold text-uppercase culture-map-detail-6">
            <Compass size={16} aria-hidden />
            Bản đồ văn hóa &amp; làng nghề
          </p>
          <h1 className="mt-4 booking-title fw-semibold culture-map-detail-7">
            Chạm vào một vùng. Mang về một câu chuyện.
          </h1>
          <p className="mt-4 booking-small culture-map-detail-8">
            Đi dọc Việt Nam qua những lớp men, thớ gỗ và sợi dệt. Mỗi điểm sáng mở ra một cộng đồng làm nghề cùng những món quà có nơi chốn rõ ràng.
          </p>

          <div className="mt-5 d-flex flex-wrap gap-3">
            {activeRegion ? (
              <Link
                to={`/culture/${activeRegion.slug}`}
                className="d-inline-flex align-items-center gap-2 rounded-pill px-4 booking-small fw-bold text-dark culture-map-detail-9"
              >
                Khám phá {activeRegion.name}
                <ArrowRight size={17} aria-hidden />
              </Link>
            ) : (
              <span className="d-inline-flex align-items-center rounded-pill px-4 booking-small culture-map-detail-10">
                Chọn một điểm trên bản đồ
              </span>
            )}
            <Link
              to="/products"
              className="d-inline-flex align-items-center gap-2 rounded-pill border px-4 booking-small fw-semibold culture-map-detail-11"
            >
              Xem tất cả sản phẩm
            </Link>
          </div>

          <BsForm onSubmit={handleSearch} role="search" className="mt-5 d-flex align-items-center gap-2 border-top pt-4 culture-map-detail-12">
            <BsForm.Label className="d-flex flex-grow-1 align-items-center gap-2 rounded-pill px-3 culture-map-detail-13">
              <Search size={16} className="flex-shrink-0 culture-map-detail-14" aria-hidden />
              <BsForm.Control
                type="search"
                name="search"
                aria-label="Tìm sản phẩm theo tên"
                placeholder="Hoặc tìm nhanh một món quà"
                className="flex-grow-1 bg-transparent booking-small culture-map-detail-15"
              />
            </BsForm.Label>
            <BsButton variant="outline-primary" type="submit" className="px-3 booking-small culture-map-detail-16">
              Tìm
            </BsButton>
          </BsForm>
        </div>

        <div className="culture-map-shell position-relative overflow-hidden border culture-map-detail-17">
          <div className="position-absolute rounded-pill border px-2 py-2 fw-semibold text-uppercase culture-map-detail-18">
            Hover hoặc dùng Tab để khám phá
          </div>
          <MapArtwork />

          {isLoading && (
            <div className="position-absolute d-flex align-items-center justify-content-center culture-map-detail-19" aria-live="polite">
              <span className="rounded-pill px-3 py-2 booking-small culture-map-detail-20">Đang mở bản đồ...</span>
            </div>
          )}

          {isError && (
            <div className="position-absolute rounded-4 border p-3 booking-small culture-map-detail-21">
              Chưa tải được dữ liệu văn hóa. Bạn vẫn có thể mở danh sách sản phẩm trong lúc kết nối lại.
            </div>
          )}

          {regions.map((region) => {
            const isActive = region.slug === activeRegion?.slug;
            return (
              <Link
                key={region.id}
                to={`/culture/${region.slug}`}
                className={`culture-map-pin position-absolute culture-map-detail-22 ${isActive ? 'is-active' : ''}`}
                style={{ left: `${region.mapX}%`, top: `${region.mapY}%` }}
                onMouseEnter={() => setActiveSlug(region.slug)}
                onFocus={() => setActiveSlug(region.slug)}
                aria-label={`Khám phá văn hóa ${region.name}`}
              >
                <span className="culture-map-pin-ring" aria-hidden />
                <span className="culture-map-pin-core"><MapPin size={16} aria-hidden /></span>
                <span className="culture-map-pin-label">{region.name}</span>
              </Link>
            );
          })}

          {activeRegion && (
            <article
              key={activeRegion.slug}
              className="culture-map-preview position-absolute overflow-hidden rounded-4 border text-dark shadow-lg culture-map-detail-23"
              aria-live="polite"
            >
              <div className="position-relative overflow-hidden culture-map-detail-24">
                <CraftPreview village={activeVillage} />
                <span className="position-absolute d-inline-flex align-items-center gap-2 rounded-pill px-3 py-1 fw-bold culture-map-detail-25">
                  <Play size={11} className="culture-map-detail-26" aria-hidden />
                  {activeVillage?.previewMedia ? 'Chuyện nghề 20 giây' : 'Minh họa chuyển động'}
                </span>
              </div>
              <div className="p-3">
                <p className="d-flex align-items-center gap-2 fw-bold text-uppercase culture-map-detail-27">
                  <Sparkles size={13} aria-hidden />
                  Điểm sáng · {activeRegion.name}
                </p>
                <h2 className="mt-2 booking-title fs-5 fw-semibold lh-sm">
                  {activeVillage?.name || activeRegion.name}
                </h2>
                <p className="mt-2 booking-caption text-secondary culture-map-detail-28">
                  {activeVillage?.summary || activeRegion.shortDescription}
                </p>
              </div>
            </article>
          )}
        </div>
      </div>
    </section>
  );
}

export default CultureMap;

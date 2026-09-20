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
        className="h-full w-full object-cover"
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
    return <img className="h-full w-full object-cover" src={media} alt={label} />;
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
      className="absolute inset-y-5 left-[3%] h-[calc(100%-2.5rem)] w-[68%] overflow-visible"
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
    <section className="relative overflow-hidden border-b border-[#244D46] bg-[#0B312D] text-white">
      <div className="absolute inset-0 culture-map-atmosphere" aria-hidden="true" />
      <div className="relative mx-auto grid min-h-[680px] max-w-7xl items-center gap-8 px-4 py-12 lg:grid-cols-[0.84fr_1.16fr] lg:py-16">
        <div className="relative z-10 max-w-xl">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#E9C875]">
            <Compass size={16} aria-hidden />
            Bản đồ văn hóa &amp; làng nghề
          </p>
          <h1 className="mt-5 font-display text-[44px] font-semibold leading-[1.04] text-[#FFF8E8] sm:text-6xl">
            Chạm vào một vùng. Mang về một câu chuyện.
          </h1>
          <p className="mt-5 max-w-lg text-sm leading-7 text-[#C9DDD7] sm:text-base">
            Đi dọc Việt Nam qua những lớp men, thớ gỗ và sợi dệt. Mỗi điểm sáng mở ra một cộng đồng làm nghề cùng những món quà có nơi chốn rõ ràng.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            {activeRegion ? (
              <Link
                to={`/culture/${activeRegion.slug}`}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-[#E7B94E] px-5 text-sm font-bold text-[#17201D] transition hover:bg-[#F5CE6F]"
              >
                Khám phá {activeRegion.name}
                <ArrowRight size={17} aria-hidden />
              </Link>
            ) : (
              <span className="inline-flex h-12 items-center rounded-full bg-white/10 px-5 text-sm text-[#C9DDD7]">
                Chọn một điểm trên bản đồ
              </span>
            )}
            <Link
              to="/products"
              className="inline-flex h-12 items-center gap-2 rounded-full border border-white/25 px-5 text-sm font-semibold text-white transition hover:border-white/50 hover:bg-white/8"
            >
              Xem tất cả sản phẩm
            </Link>
          </div>

          <form onSubmit={handleSearch} role="search" className="mt-8 flex max-w-lg items-center gap-2 border-t border-white/14 pt-6">
            <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full bg-white/10 px-4 focus-within:bg-white/14">
              <Search size={16} className="shrink-0 text-[#9FC0B8]" aria-hidden />
              <input
                type="search"
                name="search"
                aria-label="Tìm sản phẩm theo tên"
                placeholder="Hoặc tìm nhanh một món quà"
                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-[#9FC0B8]"
              />
            </label>
            <button type="submit" className="h-11 rounded-full bg-white px-4 text-sm font-bold text-[#123B34] hover:bg-[#FFF4D8]">
              Tìm
            </button>
          </form>
        </div>

        <div className="culture-map-shell relative min-h-[570px] overflow-hidden rounded-[28px] border border-white/14 bg-[#0B423C] shadow-[0_30px_80px_rgba(0,0,0,0.28)]">
          <div className="absolute left-5 top-5 z-10 rounded-full border border-white/12 bg-[#082B27]/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#BBD2CC] backdrop-blur">
            Hover hoặc dùng Tab để khám phá
          </div>
          <MapArtwork />

          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center" aria-live="polite">
              <span className="rounded-full bg-[#082B27]/80 px-4 py-2 text-sm text-[#C9DDD7]">Đang mở bản đồ...</span>
            </div>
          )}

          {isError && (
            <div className="absolute bottom-5 left-5 right-5 z-20 rounded-2xl border border-[#E7B94E]/30 bg-[#082B27]/95 p-4 text-sm text-[#DCEBE7]">
              Chưa tải được dữ liệu văn hóa. Bạn vẫn có thể mở danh sách sản phẩm trong lúc kết nối lại.
            </div>
          )}

          {regions.map((region) => {
            const isActive = region.slug === activeRegion?.slug;
            return (
              <Link
                key={region.id}
                to={`/culture/${region.slug}`}
                className={`culture-map-pin absolute z-20 -translate-x-1/2 -translate-y-1/2 ${isActive ? 'is-active' : ''}`}
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
              className="culture-map-preview absolute bottom-5 right-5 z-20 w-[min(320px,calc(100%-2.5rem))] overflow-hidden rounded-2xl border border-white/15 bg-[#F6EACC] text-[#17201D] shadow-2xl"
              aria-live="polite"
            >
              <div className="relative h-32 overflow-hidden bg-[#B76B3E]">
                <CraftPreview village={activeVillage} />
                <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-[#102F2A]/86 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">
                  <Play size={11} className="fill-current" aria-hidden />
                  {activeVillage?.previewMedia ? 'Chuyện nghề 20 giây' : 'Minh họa chuyển động'}
                </span>
              </div>
              <div className="p-4">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[#8B4A2F]">
                  <Sparkles size={13} aria-hidden />
                  Điểm sáng · {activeRegion.name}
                </p>
                <h2 className="mt-2 font-display text-xl font-semibold leading-tight">
                  {activeVillage?.name || activeRegion.name}
                </h2>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#55645D]">
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

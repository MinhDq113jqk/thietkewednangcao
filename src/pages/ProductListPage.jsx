import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import ProductCard from '../components/ProductCard';
import Skeleton, { ProductCardSkeleton } from '../components/ui/Skeleton';
import {
  productCategories,
  productSortOptions,
  useProductList,
} from '../hooks/useProductList';

function ProductListPage() {
  const {
    addItem,
    changePage,
    error,
    isError,
    isLoading,
    limit,
    maxPrice,
    minPrice,
    page,
    products,
    resetFilters,
    searchFromUrl,
    selected,
    sort,
    submitFilters,
    total,
    totalPages,
    updateParams,
  } = useProductList();

  return (
    <main className="min-h-[70vh] bg-[#F7F8F5]">
      <section className="border-b border-[#DDE4E0] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-[#0F766E]">Bộ sưu tập quà Việt</p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-[#17201D] md:text-4xl">
              Khám phá sản phẩm
            </h1>
            <p className="mt-2 min-h-5 text-sm text-[#68756F]" aria-live="polite" aria-busy={isLoading}>
              {isLoading
                ? <Skeleton as="span" className="inline-block h-4 w-44 align-middle" />
                : `${total.toLocaleString('vi-VN')} sản phẩm`}
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm font-semibold text-[#405049]">
            Sắp xếp
            <select
              value={sort}
              onChange={(event) => updateParams({ sort: event.target.value })}
              className="h-10 rounded-lg border border-[#D5DEDA] bg-white px-3 text-sm outline-none focus:border-[#0F766E]"
            >
              {productSortOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4" role="tablist" aria-label="Danh mục sản phẩm">
          {productCategories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => updateParams({ category })}
              className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                selected === category
                  ? 'border-[#0F766E] text-[#0F766E]'
                  : 'border-transparent text-[#68756F] hover:border-[#AFC0B8] hover:text-[#17201D]'
              }`}
              role="tab"
              aria-selected={selected === category}
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-7 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="h-fit rounded-lg border border-[#DDE4E0] bg-white p-4 lg:sticky lg:top-32" aria-label="Bộ lọc sản phẩm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-[#17201D]">
              <SlidersHorizontal size={17} aria-hidden />
              Bộ lọc
            </h2>
            <button
              type="button"
              onClick={resetFilters}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#68756F] hover:text-[#C93F2C]"
            >
              <RotateCcw size={14} aria-hidden />
              Đặt lại
            </button>
          </div>

          <form onSubmit={submitFilters} className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-[#405049]">Từ khóa</span>
              <span className="flex h-10 items-center gap-2 rounded-lg border border-[#D5DEDA] px-3 focus-within:border-[#0F766E]">
                <Search size={16} className="text-[#7A8781]" aria-hidden />
                <input
                  key={searchFromUrl}
                  name="search"
                  type="search"
                  placeholder="Tên món, nơi sản xuất..."
                  defaultValue={searchFromUrl}
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
              </span>
            </label>

            <fieldset>
              <legend className="mb-2 text-xs font-bold text-[#405049]">Khoảng giá</legend>
              <div className="grid grid-cols-2 gap-2">
                <label>
                  <span className="sr-only">Giá từ</span>
                  <input
                    key={`min-${minPrice}`}
                    name="minPrice"
                    inputMode="numeric"
                    placeholder="Từ"
                    defaultValue={minPrice}
                    className="h-10 w-full rounded-lg border border-[#D5DEDA] px-3 text-sm outline-none focus:border-[#0F766E]"
                  />
                </label>
                <label>
                  <span className="sr-only">Giá đến</span>
                  <input
                    key={`max-${maxPrice}`}
                    name="maxPrice"
                    inputMode="numeric"
                    placeholder="Đến"
                    defaultValue={maxPrice}
                    className="h-10 w-full rounded-lg border border-[#D5DEDA] px-3 text-sm outline-none focus:border-[#0F766E]"
                  />
                </label>
              </div>
            </fieldset>

            <button
              type="submit"
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#17201D] px-4 text-sm font-bold text-white hover:bg-[#0F766E]"
            >
              <Search size={16} aria-hidden />
              Áp dụng
            </button>
          </form>
        </aside>

        <section className="min-w-0" aria-label="Kết quả sản phẩm" aria-busy={isLoading}>
          {isError && (
            <div className="rounded-lg border border-[#F3C9C1] bg-[#FFF1EE] px-4 py-6 text-center text-[#A73525]">
              <p className="font-semibold">Không thể tải danh sách sản phẩm.</p>
              {error?.response?.data?.message && (
                <p className="mt-2 text-xs">{error.response.data.message}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
            {isLoading &&
              Array.from({ length: limit }).map((_, index) => (
                <ProductCardSkeleton key={index} />
              ))}
            {!isLoading &&
              products.map((product) => (
                <ProductCard key={product.id} product={product} onAddToCart={addItem} />
              ))}
          </div>

          {!isLoading && !isError && products.length === 0 && (
            <div className="rounded-lg border border-[#DDE4E0] bg-white px-5 py-12 text-center">
              <p className="font-display text-xl font-semibold text-[#17201D]">Chưa tìm thấy món phù hợp</p>
              <p className="mt-2 text-sm text-[#68756F]">Thử một từ khóa rộng hơn hoặc bỏ bớt khoảng giá.</p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-5 rounded-lg bg-[#17201D] px-4 py-2 text-sm font-bold text-white hover:bg-[#0F766E]"
              >
                Xóa bộ lọc
              </button>
            </div>
          )}

          {!isLoading && !isError && totalPages > 1 && (
            <nav className="mt-9 flex items-center justify-center gap-3" aria-label="Phân trang">
              <button
                type="button"
                onClick={() => changePage(page - 1)}
                disabled={page <= 1}
                className="flex h-10 w-10 items-center justify-center rounded-md border border-[#D5DEDA] bg-white text-[#405049] hover:border-[#0F766E] disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Trang trước"
              >
                <ChevronLeft size={18} aria-hidden />
              </button>
              <span className="min-w-24 text-center text-sm font-semibold text-[#405049]">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => changePage(page + 1)}
                disabled={page >= totalPages}
                className="flex h-10 w-10 items-center justify-center rounded-md border border-[#D5DEDA] bg-white text-[#405049] hover:border-[#0F766E] disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Trang sau"
              >
                <ChevronRight size={18} aria-hidden />
              </button>
            </nav>
          )}
        </section>
      </div>
    </main>
  );
}

export default ProductListPage;

import { useQuery } from '@tanstack/react-query';
import { Compass, Sparkles } from 'lucide-react';
import productApi from '../api/productApi';
import useCartStore from '../store/cartStore';
import { getPreferredCategories } from '../utils/recommendationPreferences';
import ProductCard from './ProductCard';
import { ProductCardSkeleton } from './ui/Skeleton';

const strategyCopy = {
  contextual: 'Dựa trên món bạn đang xem',
  personalized: 'Dựa trên danh mục bạn quan tâm',
  popular: 'Được nhiều người lựa chọn',
};

function RecommendationSection({
  productId,
  title = 'Gợi ý dành cho bạn',
  eyebrow = 'Chọn đúng gu',
  limit = 8,
  className = '',
}) {
  const addItem = useCartStore((state) => state.addItem);
  const categories = getPreferredCategories().join(',');
  const { data, isLoading, isError } = useQuery({
    queryKey: ['recommendations', productId || '', categories, limit],
    queryFn: () => productApi.getRecommendations({
      productId,
      categories,
      limit,
    }),
    staleTime: 60_000,
  });

  if (isError) return null;
  if (!isLoading && !data?.items?.length) return null;

  return (
    <section className={className} aria-labelledby="recommendation-title" aria-busy={isLoading}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase text-[#0F766E]">
            <Sparkles size={15} aria-hidden />
            {eyebrow}
          </p>
          <h2 id="recommendation-title" className="mt-2 font-display text-2xl font-semibold text-[#17201D] md:text-3xl">
            {title}
          </h2>
        </div>
        {data?.strategy && (
          <p className="flex items-center gap-2 text-sm text-[#5E6B66]">
            <Compass size={16} className="text-[#0F766E]" aria-hidden />
            {strategyCopy[data.strategy]}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: Math.min(limit, 8) }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))
          : data.items.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={addItem}
                recommendationReason={product.recommendationReason}
              />
            ))}
      </div>
    </section>
  );
}

export default RecommendationSection;

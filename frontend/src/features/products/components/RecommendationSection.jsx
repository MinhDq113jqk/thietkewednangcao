import BsGrid from '../../home/components/ResponsiveGrid';
import { useAccountQuery } from '../../../hooks/useAccountQuery';
import { Compass, Sparkles } from 'lucide-react';
import productApi from '../api/productApi';
import useCartStore from '../../cart/store/cartStore';
import { getPreferredCategories } from '../../../utils/recommendationPreferences';
import ProductCard from './ProductCard';
import { ProductCardSkeleton } from '../../../components/ui/Skeleton';

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
  const { data, isLoading, isError } = useAccountQuery({
    allowGuest: true,
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
      <div className="mb-4 d-flex flex-wrap align-items-end justify-content-between gap-3">
        <div>
          <p className="d-flex align-items-center gap-2 booking-caption fw-bold text-uppercase text-primary">
            <Sparkles size={15} aria-hidden />
            {eyebrow}
          </p>
          <h2 id="recommendation-title" className="mt-2 booking-title fs-4 fw-semibold text-dark recommendation-section-detail-1">
            {title}
          </h2>
        </div>
        {data?.strategy && (
          <p className="d-flex align-items-center gap-2 booking-small text-secondary">
            <Compass size={16} className="text-primary" aria-hidden />
            {strategyCopy[data.strategy]}
          </p>
        )}
      </div>

      <BsGrid as="div" columns={{"xs":2,"lg":4}} className="">
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
      </BsGrid>
    </section>
  );
}

export default RecommendationSection;

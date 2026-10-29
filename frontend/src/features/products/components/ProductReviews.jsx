import { Button as BsButton } from 'react-bootstrap';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import reviewApi from '../api/reviewApi';

export default function ProductReviews({ productId }) {
  const [page, setPage] = useState(1);
  const query = useQuery({ queryKey: ['product-reviews', productId, page], queryFn: () => reviewApi.listProduct(productId, page) });
  return (
    <section aria-label="Đánh giá sản phẩm" aria-busy={query.isLoading}>
      <h2 className="booking-title fs-4 fw-semibold">Đánh giá người mua</h2>
      {query.isLoading ? <p role="status" className="mt-3">Đang tải nhận xét...</p> : query.isError ? <div role="alert" className="mt-3"><p>Không thể tải nhận xét.</p><BsButton variant="outline-primary" type="button" className="text-decoration-underline product-reviews-detail-1" onClick={() => query.refetch()}>Thử lại</BsButton></div> : <>
        <p className="mt-2 booking-small">{query.data.total} nhận xét · {query.data.total ? `${query.data.averageRating}/5 sao` : 'Chưa có điểm đánh giá'}</p>
        <div className="mt-3 product-reviews-detail-2">{query.data.items.map((review) => <article key={review.id} className="rounded-3 border p-3 product-reviews-detail-3"><div className="d-flex justify-content-between gap-3"><strong className="booking-small">{review.user?.name || 'Khách hàng'}</strong><span className="booking-small">{review.rating}/5 sao</span></div><p className="mt-2 text-break booking-small text-secondary product-reviews-detail-4">{review.comment}</p></article>)}{query.data.total === 0 && <p className="booking-small">Chưa có đánh giá. Bạn có thể nhận xét từ đơn hàng sau khi được giao.</p>}</div>
        {query.data.totalPages > 1 && <nav aria-label="Phân trang đánh giá" className="mt-3 d-flex align-items-center gap-3"><BsButton variant="outline-primary" type="button" disabled={page === 1} onClick={() => setPage(page - 1)} className="px-2 product-reviews-detail-5">Trước</BsButton><span>{page}/{query.data.totalPages}</span><BsButton variant="outline-primary" type="button" disabled={page >= query.data.totalPages} onClick={() => setPage(page + 1)} className="px-2 product-reviews-detail-6">Sau</BsButton></nav>}
      </>}
    </section>
  );
}

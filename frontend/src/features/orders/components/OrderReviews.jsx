import { Form as BsForm, Button as BsButton } from 'react-bootstrap';
import { useId, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccountQuery } from '../../../hooks/useAccountQuery';
import reviewApi from '../../products/api/reviewApi';

function ReviewForm({ orderId, item, existing }) {
  const ratingId = useId();
  const [rating, setRating] = useState('');
  const [comment, setComment] = useState('');
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => reviewApi.create(orderId, { productId: item.productId, rating: Number(rating), comment }),
    onSuccess: () => {
      for (const key of [['order-reviews', orderId], ['product-reviews', item.productId], ['product', item.productId], ['seller-stats']]) queryClient.invalidateQueries({ queryKey: key });
    },
  });
  if (existing) return <p className="rounded-3 border p-3 booking-small order-reviews-detail-1">Đã đánh giá {item.name}: {existing.rating}/5 sao{existing.comment ? ` — ${existing.comment}` : ''}</p>;
  return (
    <BsForm aria-label={`Đánh giá ${item.name}`} onSubmit={(event) => { event.preventDefault(); if (!mutation.isPending) mutation.mutate(); }} className="rounded-3 border p-3 order-reviews-detail-2">
      <h3 className="fw-semibold">{item.name}</h3>
      <BsForm.Label htmlFor={ratingId} className="d-block booking-small">Số sao</BsForm.Label>
      <BsForm.Select id={ratingId} required value={rating} onChange={(event) => setRating(event.target.value)} className="w-100 rounded-3 border px-2 order-reviews-detail-3"><option value="">Chọn số sao</option>{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} sao</option>)}</BsForm.Select>
      <BsForm.Label className="d-block booking-small">Nhận xét<BsForm.Control as="textarea" value={comment} onChange={(event) => setComment(event.target.value)} maxLength={2000} rows={3} className="mt-1 w-100 rounded-3 border p-2 order-reviews-detail-4" /></BsForm.Label>
      {mutation.isError && <p role="alert" className="booking-small text-danger">{mutation.error.response?.data?.message || 'Không thể gửi đánh giá. Vui lòng thử lại.'}</p>}
      <BsButton variant="primary" type="submit" disabled={mutation.isPending} className="px-3 booking-small order-reviews-detail-5">{mutation.isPending ? 'Đang gửi...' : 'Gửi đánh giá'}</BsButton>
    </BsForm>
  );
}

export default function OrderReviews({ order }) {
  const query = useAccountQuery({ queryKey: ['order-reviews', order.id], queryFn: () => reviewApi.listOrder(order.id), enabled: order.status === 'delivered' });
  if (order.status !== 'delivered') return null;
  return (
    <section aria-label="Đánh giá sau mua" className="order-reviews-detail-6">
      <h2 className="booking-title fs-5 fw-semibold">Đánh giá sau mua</h2>
      {query.isLoading ? <p role="status">Đang tải đánh giá...</p> : query.isError ? <div role="alert"><p>Không thể tải đánh giá.</p><BsButton variant="outline-primary" type="button" onClick={() => query.refetch()} className="text-decoration-underline order-reviews-detail-7">Thử lại</BsButton></div> : [...new Map((order.items || []).map((item) => [item.productId, item])).values()].map((item) => <ReviewForm key={item.productId} orderId={order.id} item={item} existing={query.data?.find((review) => review.productId === item.productId)} />)}
    </section>
  );
}

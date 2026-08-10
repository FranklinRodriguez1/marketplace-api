import type { ReviewResponse } from '@cerca/contract';
import type { ReviewRecord } from '../domain/review';

export function presentReview(review: ReviewRecord): ReviewResponse {
  return {
    id: review.id,
    bookingId: review.bookingId,
    listingId: review.listingId,
    authorId: review.authorId,
    rating: review.rating,
    body: review.body,
    createdAt: review.createdAt.toISOString(),
  };
}

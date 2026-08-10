import type { Booking as ContractBooking } from '@cerca/contract';
import type { Page } from '../../../kernel/cursor';
import type { ReviewRecord } from '../domain/review';

export const REVIEW_REPOSITORY = Symbol('REVIEW_REPOSITORY');

export interface CreateReviewData {
  id: string;
  bookingId: string;
  listingId: string;
  authorId: string;
  rating: number;
  body: string;
}

export interface ReviewRepository {
  /** Insert the review, link Booking.reviewId, and recompute the listing rating — one tx.
   *  The unique constraint on bookingId closes the concurrent double-review race. */
  createForBooking(data: CreateReviewData): Promise<ReviewRecord>;
  findById(id: string): Promise<ReviewRecord | null>;
  moderate(id: string, action: 'remove' | 'keep', at: Date, listingId: string): Promise<void>;
  listByListing(
    listingId: string,
    limit: number,
    cursorCreatedAt: string | null,
    cursorId: string | null,
  ): Promise<Page<ReviewRecord>>;
}

export const BOOKING_FOR_REVIEW = Symbol('BOOKING_FOR_REVIEW');

export interface BookingForReviewPort {
  byId(id: string): Promise<ContractBooking | null>;
}

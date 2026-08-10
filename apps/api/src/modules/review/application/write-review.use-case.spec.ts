import { beforeEach, describe, expect, it } from 'vitest';
import type { Actor, Booking } from '@cerca/contract';
import { ConflictError, ForbiddenError, NotFoundError } from '../../../kernel/domain-error';
import type { ReviewRecord } from '../domain/review';
import type { BookingForReviewPort, CreateReviewData, ReviewRepository } from './ports';
import { WriteReviewUseCase } from './write-review.use-case';

// A fake that behaves like the port. It also models the DB unique constraint: a second
// createForBooking for the same booking throws already_reviewed, like Postgres would.
class FakeReviewRepository implements ReviewRepository {
  readonly created = new Map<string, ReviewRecord>();
  forceConflict = false;

  async createForBooking(data: CreateReviewData): Promise<ReviewRecord> {
    if (this.forceConflict || this.created.has(data.bookingId)) {
      throw new ConflictError({ code: 'REVIEW_ALREADY_EXISTS', message: 'exists', reason: 'already_reviewed' });
    }
    const record: ReviewRecord = { ...data, createdAt: new Date('2026-06-11T00:00:00.000Z') };
    this.created.set(data.bookingId, record);
    return record;
  }
  async findById(): Promise<ReviewRecord | null> {
    return null;
  }
  async moderate(): Promise<void> {}
  async listByListing() {
    return { items: [], nextCursor: null };
  }
}

class FakeBookingLookup implements BookingForReviewPort {
  constructor(private readonly booking: Booking | null) {}
  async byId(): Promise<Booking | null> {
    return this.booking;
  }
}

const clock = { now: () => new Date('2026-06-11T00:00:00.000Z') }; // 10 days after completion
const ids = { generate: () => 'review-1' };
const tx = { run: <T>(work: () => Promise<T>): Promise<T> => work() };
const customer: Actor = { id: 'cust-1', capacities: ['customer'], platformRole: 'user' };

function completedBooking(over: Partial<Booking> = {}): Booking {
  return {
    id: 'b1',
    listingId: 'l1',
    customerId: 'cust-1',
    status: { kind: 'completed', completedAt: '2026-06-01T00:00:00.000Z' },
    reviewId: null,
    ...over,
  };
}

describe('WriteReviewUseCase', () => {
  let reviews: FakeReviewRepository;
  beforeEach(() => {
    reviews = new FakeReviewRepository();
  });

  const build = (booking: Booking | null) =>
    new WriteReviewUseCase(reviews, new FakeBookingLookup(booking), clock, ids, tx);

  it('404 when the booking does not exist', async () => {
    await expect(build(null).execute(customer, 'missing', { rating: 5, body: 'x' })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('403 not_your_booking', async () => {
    const other: Actor = { ...customer, id: 'someone-else' };
    await expect(build(completedBooking()).execute(other, 'b1', { rating: 5, body: 'x' })).rejects.toMatchObject({
      constructor: ForbiddenError,
      reason: 'not_your_booking',
    });
  });

  it('409 not_completed', async () => {
    const booking = completedBooking({ status: { kind: 'requested', requestedAt: '2026-06-01T00:00:00.000Z' } });
    await expect(build(booking).execute(customer, 'b1', { rating: 5, body: 'x' })).rejects.toMatchObject({
      constructor: ConflictError,
      reason: 'not_completed',
    });
  });

  it('409 already_reviewed when the booking already has a review', async () => {
    await expect(build(completedBooking({ reviewId: 'r0' })).execute(customer, 'b1', { rating: 5, body: 'x' })).rejects.toMatchObject({
      reason: 'already_reviewed',
    });
  });

  it('403 window_closed when more than 30 days have passed', async () => {
    const lateClock = { now: () => new Date('2026-07-05T00:00:00.000Z') };
    const useCase = new WriteReviewUseCase(reviews, new FakeBookingLookup(completedBooking()), lateClock, ids, tx);
    await expect(useCase.execute(customer, 'b1', { rating: 5, body: 'x' })).rejects.toMatchObject({
      constructor: ForbiddenError,
      reason: 'window_closed',
    });
  });

  it('creates the review on the happy path', async () => {
    const review = await build(completedBooking()).execute(customer, 'b1', { rating: 5, body: 'great' });
    expect(review).toMatchObject({ id: 'review-1', bookingId: 'b1', listingId: 'l1', authorId: 'cust-1', rating: 5 });
  });

  it('surfaces the DB unique race as 409 already_reviewed', async () => {
    reviews.forceConflict = true;
    await expect(build(completedBooking()).execute(customer, 'b1', { rating: 5, body: 'x' })).rejects.toMatchObject({
      constructor: ConflictError,
      reason: 'already_reviewed',
    });
  });
});

import { Inject, Injectable } from '@nestjs/common';
import { type Actor, canReviewBooking, type ReviewBlockedReason, type WriteReviewInput } from '@cerca/contract';
import { ConflictError, ForbiddenError, NotFoundError } from '../../../kernel/domain-error';
import { CLOCK, type ClockPort } from '../../../kernel/ports/clock.port';
import { ID, type IdPort } from '../../../kernel/ports/id.port';
import { TRANSACTION, type TransactionPort } from '../../../kernel/ports/transaction.port';
import type { ReviewRecord } from '../domain/review';
import { BOOKING_FOR_REVIEW, type BookingForReviewPort, REVIEW_REPOSITORY, type ReviewRepository } from './ports';

// The request walkthrough, steps 4–5: load the booking, call the SHARED pure policy with the
// injected clock, and on `{ ok:false }` translate the reason. State reasons are 409, relation/
// time reasons are 403. Then persist in a transaction; the DB unique wins any concurrent race.
const CONFLICT_REASONS: readonly ReviewBlockedReason[] = ['already_reviewed', 'not_completed'];

function reviewMessage(reason: ReviewBlockedReason): string {
  switch (reason) {
    case 'not_your_booking':
      return 'You can only review a booking you made.';
    case 'not_completed':
      return 'You can only review a completed booking.';
    case 'already_reviewed':
      return 'This booking has already been reviewed.';
    case 'window_closed':
      return 'The review window has closed.';
  }
}

@Injectable()
export class WriteReviewUseCase {
  constructor(
    @Inject(REVIEW_REPOSITORY) private readonly reviews: ReviewRepository,
    @Inject(BOOKING_FOR_REVIEW) private readonly bookings: BookingForReviewPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    @Inject(ID) private readonly ids: IdPort,
    @Inject(TRANSACTION) private readonly tx: TransactionPort,
  ) {}

  async execute(actor: Actor, bookingId: string, input: WriteReviewInput): Promise<ReviewRecord> {
    return this.tx.run(async () => {
      const booking = await this.bookings.byId(bookingId);
      if (!booking) {
        throw new NotFoundError({ code: 'BOOKING_NOT_FOUND', message: 'Booking not found.' });
      }

      const eligibility = canReviewBooking(actor, booking, this.clock.now());
      if (!eligibility.ok) {
        const message = reviewMessage(eligibility.reason);
        if (CONFLICT_REASONS.includes(eligibility.reason)) {
          throw new ConflictError({ code: 'REVIEW_BLOCKED', message, reason: eligibility.reason });
        }
        throw new ForbiddenError({ code: 'REVIEW_BLOCKED', message, reason: eligibility.reason });
      }

      return this.reviews.createForBooking({
        id: this.ids.generate(),
        bookingId,
        listingId: booking.listingId,
        authorId: actor.id,
        rating: input.rating,
        body: input.body,
      });
    });
  }
}

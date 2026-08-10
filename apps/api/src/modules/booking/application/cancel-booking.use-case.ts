import { Inject, Injectable } from '@nestjs/common';
import { type Actor, canCancelBooking } from '@cerca/contract';
import { ForbiddenError, NotFoundError } from '../../../kernel/domain-error';
import { CLOCK, type ClockPort } from '../../../kernel/ports/clock.port';
import { TRANSACTION, type TransactionPort } from '../../../kernel/ports/transaction.port';
import type { BookingRecord } from '../domain/booking';
import { BOOKING_REPOSITORY, type BookingRepository, LISTING_LOOKUP, type ListingLookupPort } from './ports';

// Either party may cancel, but only while requested/accepted — the pure policy decides.
@Injectable()
export class CancelBookingUseCase {
  constructor(
    @Inject(BOOKING_REPOSITORY) private readonly bookings: BookingRepository,
    @Inject(LISTING_LOOKUP) private readonly listings: ListingLookupPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    @Inject(TRANSACTION) private readonly tx: TransactionPort,
  ) {}

  async execute(actor: Actor, bookingId: string): Promise<BookingRecord> {
    return this.tx.run(async () => {
      const booking = await this.bookings.findById(bookingId);
      if (!booking) {
        throw new NotFoundError({ code: 'BOOKING_NOT_FOUND', message: 'Booking not found.' });
      }
      const listing = await this.listings.byId(booking.listingId);
      if (!listing) {
        throw new NotFoundError({ code: 'LISTING_NOT_FOUND', message: 'Listing not found.' });
      }
      const eligibility = canCancelBooking(actor, booking, listing);
      if (!eligibility.ok) {
        throw new ForbiddenError({
          code: 'CANCEL_NOT_ALLOWED',
          message: 'You cannot cancel this booking.',
          reason: eligibility.reason,
        });
      }
      return this.bookings.cancel(bookingId, actor.id, this.clock.now());
    });
  }
}

import { Inject, Injectable } from '@nestjs/common';
import type { Actor } from '@cerca/contract';
import { ConflictError, NotFoundError } from '../../../kernel/domain-error';
import { CLOCK, type ClockPort } from '../../../kernel/ports/clock.port';
import { TRANSACTION, type TransactionPort } from '../../../kernel/ports/transaction.port';
import type { BookingRecord } from '../domain/booking';
import { loadOwnedListing } from './booking-guards';
import { BOOKING_REPOSITORY, type BookingRepository, LISTING_LOOKUP, type ListingLookupPort } from './ports';

@Injectable()
export class CompleteBookingUseCase {
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
      await loadOwnedListing(this.listings, actor, booking.listingId);
      if (booking.status.kind !== 'accepted') {
        throw new ConflictError({ code: 'INVALID_BOOKING_STATE', message: 'Only an accepted booking can be completed.' });
      }
      return this.bookings.complete(bookingId, this.clock.now());
    });
  }
}

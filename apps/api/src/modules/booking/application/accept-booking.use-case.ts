import { Inject, Injectable } from '@nestjs/common';
import type { AcceptBookingInput, Actor } from '@cerca/contract';
import { ConflictError, NotFoundError } from '../../../kernel/domain-error';
import { CLOCK, type ClockPort } from '../../../kernel/ports/clock.port';
import { TRANSACTION, type TransactionPort } from '../../../kernel/ports/transaction.port';
import type { BookingRecord } from '../domain/booking';
import { loadOwnedListing } from './booking-guards';
import { BOOKING_REPOSITORY, type BookingRepository, LISTING_LOOKUP, type ListingLookupPort } from './ports';

@Injectable()
export class AcceptBookingUseCase {
  constructor(
    @Inject(BOOKING_REPOSITORY) private readonly bookings: BookingRepository,
    @Inject(LISTING_LOOKUP) private readonly listings: ListingLookupPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    @Inject(TRANSACTION) private readonly tx: TransactionPort,
  ) {}

  async execute(actor: Actor, bookingId: string, input: AcceptBookingInput): Promise<BookingRecord> {
    return this.tx.run(async () => {
      const booking = await this.bookings.findById(bookingId);
      if (!booking) {
        throw new NotFoundError({ code: 'BOOKING_NOT_FOUND', message: 'Booking not found.' });
      }
      await loadOwnedListing(this.listings, actor, booking.listingId);
      if (booking.status.kind !== 'requested') {
        throw new ConflictError({ code: 'INVALID_BOOKING_STATE', message: 'Only a requested booking can be accepted.' });
      }
      return this.bookings.accept(bookingId, new Date(input.scheduledFor), this.clock.now());
    });
  }
}

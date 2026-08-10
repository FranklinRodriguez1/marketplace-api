import { Inject, Injectable } from '@nestjs/common';
import type { Actor } from '@cerca/contract';
import { NotFoundError } from '../../../kernel/domain-error';
import type { BookingRecord } from '../domain/booking';
import { BOOKING_REPOSITORY, type BookingRepository, LISTING_LOOKUP, type ListingLookupPort } from './ports';

@Injectable()
export class GetBookingUseCase {
  constructor(
    @Inject(BOOKING_REPOSITORY) private readonly bookings: BookingRepository,
    @Inject(LISTING_LOOKUP) private readonly listings: ListingLookupPort,
  ) {}

  async execute(actor: Actor, bookingId: string): Promise<BookingRecord> {
    const booking = await this.bookings.findById(bookingId);
    // Relation check: only the customer or the listing owner may see it. 404 (not 403) to
    // avoid leaking that the booking exists at all.
    if (!booking) {
      throw new NotFoundError({ code: 'BOOKING_NOT_FOUND', message: 'Booking not found.' });
    }
    const listing = await this.listings.byId(booking.listingId);
    const isParticipant = booking.customerId === actor.id || listing?.ownerId === actor.id;
    if (!isParticipant) {
      throw new NotFoundError({ code: 'BOOKING_NOT_FOUND', message: 'Booking not found.' });
    }
    return booking;
  }
}

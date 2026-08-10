import { Inject, Injectable } from '@nestjs/common';
import { type Actor, canRequestBooking, type CreateBookingInput } from '@cerca/contract';
import { ForbiddenError, NotFoundError } from '../../../kernel/domain-error';
import { ID, type IdPort } from '../../../kernel/ports/id.port';
import { TRANSACTION, type TransactionPort } from '../../../kernel/ports/transaction.port';
import type { BookingRecord } from '../domain/booking';
import { BOOKING_REPOSITORY, type BookingRepository, LISTING_LOOKUP, type ListingLookupPort } from './ports';

// Idempotent at the HTTP boundary (Idempotency-Key). Here it enforces "not your own listing"
// and "listing must be published", then creates the booking in the `requested` state.
@Injectable()
export class RequestBookingUseCase {
  constructor(
    @Inject(BOOKING_REPOSITORY) private readonly bookings: BookingRepository,
    @Inject(LISTING_LOOKUP) private readonly listings: ListingLookupPort,
    @Inject(ID) private readonly ids: IdPort,
    @Inject(TRANSACTION) private readonly tx: TransactionPort,
  ) {}

  async execute(actor: Actor, input: CreateBookingInput): Promise<BookingRecord> {
    return this.tx.run(async () => {
      const listing = await this.listings.byId(input.listingId);
      if (!listing) {
        throw new NotFoundError({ code: 'LISTING_NOT_FOUND', message: 'Listing not found.' });
      }
      const eligibility = canRequestBooking(actor, listing);
      if (!eligibility.ok) {
        throw new ForbiddenError({
          code: 'BOOKING_NOT_ALLOWED',
          message: 'You cannot book this listing.',
          reason: eligibility.reason,
        });
      }
      return this.bookings.create({ id: this.ids.generate(), listingId: input.listingId, customerId: actor.id });
    });
  }
}

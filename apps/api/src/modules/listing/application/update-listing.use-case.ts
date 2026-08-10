import { Inject, Injectable } from '@nestjs/common';
import { type Actor, canChangePrice, canEditListing, denormalizePricing, type UpdateListingInput } from '@cerca/contract';
import { ForbiddenError, NotFoundError } from '../../../kernel/domain-error';
import { TRANSACTION, type TransactionPort } from '../../../kernel/ports/transaction.port';
import { type ListingRecord, toContractListing } from '../domain/listing';
import { BOOKING_LOOKUP, type BookingLookupPort, LISTING_REPOSITORY, type ListingRepository } from './ports';

// The BOLA endpoint. A PATCH with a foreign token loads the resource, runs the pure policy,
// and returns 403 { reason: 'not_owner' } — never 200. A price change also runs canChangePrice
// (blocked while accepted bookings exist).
@Injectable()
export class UpdateListingUseCase {
  constructor(
    @Inject(LISTING_REPOSITORY) private readonly listings: ListingRepository,
    @Inject(BOOKING_LOOKUP) private readonly bookings: BookingLookupPort,
    @Inject(TRANSACTION) private readonly tx: TransactionPort,
  ) {}

  async execute(actor: Actor, listingId: string, input: UpdateListingInput): Promise<ListingRecord> {
    return this.tx.run(async () => {
      const listing = await this.listings.findById(listingId);
      if (!listing) {
        throw new NotFoundError({ code: 'LISTING_NOT_FOUND', message: 'Listing not found.' });
      }
      const target = toContractListing(listing);

      const eligibility =
        input.pricing !== undefined
          ? canChangePrice(actor, target, await this.bookings.forListing(listingId))
          : canEditListing(actor, target);
      if (!eligibility.ok) {
        throw new ForbiddenError({
          code: 'LISTING_EDIT_FORBIDDEN',
          message: 'You cannot edit this listing.',
          reason: eligibility.reason,
        });
      }

      const denorm = input.pricing ? denormalizePricing(input.pricing) : null;
      return this.listings.update(listingId, {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.pricing !== undefined && denorm
          ? { pricing: input.pricing, priceMinorFrom: denorm.priceMinorFrom, currency: denorm.currency }
          : {}),
      });
    });
  }
}

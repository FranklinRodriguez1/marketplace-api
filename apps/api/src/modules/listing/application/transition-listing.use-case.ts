import { Inject, Injectable } from '@nestjs/common';
import type { Actor } from '@cerca/contract';
import { ForbiddenError, NotFoundError } from '../../../kernel/domain-error';
import { CLOCK, type ClockPort } from '../../../kernel/ports/clock.port';
import type { ListingRecord } from '../domain/listing';
import { LISTING_REPOSITORY, type ListingRepository, type PublishTransition } from './ports';

// Publish / pause. Requires the listing:update capability (guard) AND ownership (here).
@Injectable()
export class TransitionListingUseCase {
  constructor(
    @Inject(LISTING_REPOSITORY) private readonly listings: ListingRepository,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async execute(actor: Actor, listingId: string, transition: PublishTransition): Promise<ListingRecord> {
    const listing = await this.listings.findById(listingId);
    if (!listing) {
      throw new NotFoundError({ code: 'LISTING_NOT_FOUND', message: 'Listing not found.' });
    }
    if (listing.ownerId !== actor.id) {
      throw new ForbiddenError({ code: 'NOT_OWNER', message: 'This listing is not yours.', reason: 'not_owner' });
    }
    if (listing.status.kind === 'removed') {
      throw new ForbiddenError({
        code: 'LISTING_REMOVED',
        message: 'This listing was removed by moderation.',
        reason: 'removed_by_moderation',
      });
    }
    return this.listings.transition(listingId, transition, this.clock.now());
  }
}

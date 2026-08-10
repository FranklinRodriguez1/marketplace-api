import type { Actor, Listing as ContractListing } from '@cerca/contract';
import { ForbiddenError, NotFoundError } from '../../../kernel/domain-error';
import type { ListingLookupPort } from './ports';

/** Loads a listing and asserts the actor owns it — used by accept/decline/complete. */
export async function loadOwnedListing(
  listings: ListingLookupPort,
  actor: Actor,
  listingId: string,
): Promise<ContractListing> {
  const listing = await listings.byId(listingId);
  if (!listing) {
    throw new NotFoundError({ code: 'LISTING_NOT_FOUND', message: 'Listing not found.' });
  }
  if (listing.ownerId !== actor.id) {
    throw new ForbiddenError({
      code: 'NOT_LISTING_OWNER',
      message: 'You do not own the listing for this booking.',
      reason: 'not_owner',
    });
  }
  return listing;
}

import { can, type Actor } from '../auth/actor';
import type { Eligibility } from '../common/result';
import type { Booking } from '../booking/booking.types';
import type { Listing } from './listing.types';

export type EditListingReason = 'no_capacity' | 'not_owner' | 'removed_by_moderation' | 'has_pending_bookings';
export type EditEligibility = Eligibility<EditListingReason>;

/**
 * Capacity + ownership + state, as a pure function shared with the app. The classic bug
 * checks only the capacity — `can(actor, 'listing:update')` — which lets any provider edit
 * ANY listing. The server checks the resource, not just the role. This is exactly the BOLA
 * defense: a PATCH with a foreign token must return 403 `{ reason: 'not_owner' }`, not 200.
 */
export function canEditListing(actor: Actor, listing: Listing): EditEligibility {
  if (!can(actor, 'listing:update')) return { ok: false, reason: 'no_capacity' };
  if (listing.ownerId !== actor.id) return { ok: false, reason: 'not_owner' };
  if (listing.status.kind === 'removed') return { ok: false, reason: 'removed_by_moderation' };
  return { ok: true };
}

/**
 * A finer, purely-business rule: you may not change the price while accepted bookings
 * exist — that would break the agreement with someone who already hired you at the old
 * price. Builds on top of `canEditListing`, so all its denials propagate first.
 */
export function canChangePrice(actor: Actor, listing: Listing, bookings: readonly Booking[]): EditEligibility {
  const base = canEditListing(actor, listing);
  if (!base.ok) return base;
  if (bookings.some((booking) => booking.status.kind === 'accepted')) {
    return { ok: false, reason: 'has_pending_bookings' };
  }
  return { ok: true };
}

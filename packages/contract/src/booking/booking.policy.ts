import type { Actor } from '../auth/actor';
import type { Eligibility } from '../common/result';
import type { Listing } from '../listing/listing.types';
import type { Booking } from './booking.types';

export type RequestBookingReason = 'own_listing' | 'not_bookable';
export type RequestBookingEligibility = Eligibility<RequestBookingReason>;

/**
 * You cannot request your own listing (relation), and only a published listing is bookable
 * (state). The `booking:request` capacity is layer 1 and handled by the guard beforehand.
 */
export function canRequestBooking(actor: Actor, listing: Listing): RequestBookingEligibility {
  if (listing.ownerId === actor.id) return { ok: false, reason: 'own_listing' };
  if (listing.status.kind !== 'published') return { ok: false, reason: 'not_bookable' };
  return { ok: true };
}

export type CancelBookingReason = 'not_participant' | 'not_cancellable';
export type CancelBookingEligibility = Eligibility<CancelBookingReason>;

/**
 * Either party — the customer or the listing owner — may cancel, but only while the
 * booking is still `requested` or `accepted`. A completed/declined/cancelled booking is
 * terminal (relation + state).
 */
export function canCancelBooking(actor: Actor, booking: Booking, listing: Listing): CancelBookingEligibility {
  const isParticipant = booking.customerId === actor.id || listing.ownerId === actor.id;
  if (!isParticipant) return { ok: false, reason: 'not_participant' };
  if (booking.status.kind !== 'requested' && booking.status.kind !== 'accepted') {
    return { ok: false, reason: 'not_cancellable' };
  }
  return { ok: true };
}

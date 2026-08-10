import type { Actor } from '../auth/actor';
import type { Booking } from '../booking/booking.types';
import type { Eligibility } from '../common/result';

export type ReviewBlockedReason = 'not_your_booking' | 'not_completed' | 'already_reviewed' | 'window_closed';
export type ReviewEligibility = Eligibility<ReviewBlockedReason>;

export const REVIEW_WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days elapsed from `from` to `to`, floored. Pure — no clock inside. */
export function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / DAY_MS);
}

/**
 * The star function. You cannot review a booking unless:
 *   · you were the one who booked it        (relation)   → not_your_booking
 *   · the booking is completed              (state)      → not_completed
 *   · you have not already reviewed it      (uniqueness) → already_reviewed
 *   · fewer than 30 days have passed        (time)       → window_closed
 *
 * Four conditions of four different kinds, and no role resolves them. It returns a machine
 * reason (mapped into problem+json), not a boolean, and `now` is a parameter so the
 * "window closed" test passes a date instead of faking a clock. This exact file is the one
 * the API imports at the review endpoint — the mobile app imports the same one.
 */
export function canReviewBooking(actor: Actor, booking: Booking, now: Date): ReviewEligibility {
  if (booking.customerId !== actor.id) return { ok: false, reason: 'not_your_booking' };
  if (booking.status.kind !== 'completed') return { ok: false, reason: 'not_completed' };
  if (booking.reviewId !== null) return { ok: false, reason: 'already_reviewed' };
  if (daysBetween(new Date(booking.status.completedAt), now) > REVIEW_WINDOW_DAYS) {
    return { ok: false, reason: 'window_closed' };
  }
  return { ok: true };
}

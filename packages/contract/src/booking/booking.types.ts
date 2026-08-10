import type { UserId } from '../common/ids';

export type DeclineReason = 'unavailable' | 'not_a_fit' | 'other';

/**
 * A booking is a state machine too. A `switch` over `kind` with `assertNever` in the
 * default forces every transition to be handled: add a state and the code stops compiling
 * at the exact sites that must change.
 */
export type BookingStatus =
  | { kind: 'requested'; requestedAt: string }
  | { kind: 'accepted'; acceptedAt: string; scheduledFor: string }
  | { kind: 'declined'; reason: DeclineReason }
  | { kind: 'completed'; completedAt: string }
  | { kind: 'cancelled'; cancelledBy: UserId; at: string };

/** The shape the pure booking/review policies read. */
export interface Booking {
  readonly id: string;
  readonly listingId: string;
  readonly customerId: UserId;
  readonly status: BookingStatus;
  readonly reviewId: string | null;
}

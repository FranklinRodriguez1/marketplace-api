import type { UserId } from '../common/ids';

export type ListingStatusKind = 'draft' | 'published' | 'paused' | 'under_review' | 'removed';

/**
 * A listing is a state machine. In the domain it is a discriminated union; in Postgres it
 * is a `statusKind` enum plus nullable columns, and the repository rebuilds the union when
 * mapping a row → entity. That way "published listings" is an indexed query, which a JSONB
 * blob would not allow well.
 */
export type ListingStatus =
  | { kind: 'draft' }
  | { kind: 'published'; publishedAt: string }
  | { kind: 'paused' }
  | { kind: 'under_review' }
  | { kind: 'removed'; removedById: UserId; reason: string };

/** The minimum shape the pure listing policies read. The API entity is a superset of this. */
export interface Listing {
  readonly id: string;
  readonly ownerId: UserId;
  readonly status: ListingStatus;
}

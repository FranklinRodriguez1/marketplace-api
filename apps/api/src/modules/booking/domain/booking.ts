import type { Booking as ContractBooking, BookingStatus, DeclineReason } from '@cerca/contract';
import { assertNever } from '../../../kernel/assert-never';

/** Raw booking columns as read from Postgres (statusKind enum + nullable per-variant fields). */
export interface BookingRow {
  id: string;
  listingId: string;
  customerId: string;
  statusKind: string;
  requestedAt: Date;
  acceptedAt: Date | null;
  scheduledFor: Date | null;
  declineReason: string | null;
  completedAt: Date | null;
  cancelledById: string | null;
  cancelledAt: Date | null;
  reviewId: string | null;
}

/** Rebuild the discriminated-union status from the row — the repository's real job. */
export function reconstructBookingStatus(row: BookingRow): BookingStatus {
  switch (row.statusKind) {
    case 'requested':
      return { kind: 'requested', requestedAt: row.requestedAt.toISOString() };
    case 'accepted':
      return {
        kind: 'accepted',
        acceptedAt: (row.acceptedAt ?? row.requestedAt).toISOString(),
        scheduledFor: (row.scheduledFor ?? row.requestedAt).toISOString(),
      };
    case 'declined':
      return { kind: 'declined', reason: (row.declineReason ?? 'other') as DeclineReason };
    case 'completed':
      return { kind: 'completed', completedAt: (row.completedAt ?? row.requestedAt).toISOString() };
    case 'cancelled':
      return { kind: 'cancelled', cancelledBy: row.cancelledById ?? '', at: (row.cancelledAt ?? row.requestedAt).toISOString() };
    default:
      return assertNever(row.statusKind as never);
  }
}

export interface BookingRecord {
  id: string;
  listingId: string;
  customerId: string;
  status: BookingStatus;
  reviewId: string | null;
  requestedAt: Date;
  scheduledFor: Date | null;
  completedAt: Date | null;
}

export function toBookingRecord(row: BookingRow): BookingRecord {
  return {
    id: row.id,
    listingId: row.listingId,
    customerId: row.customerId,
    status: reconstructBookingStatus(row),
    reviewId: row.reviewId,
    requestedAt: row.requestedAt,
    scheduledFor: row.scheduledFor,
    completedAt: row.completedAt,
  };
}

/** The {id, customerId, status, reviewId} projection the pure policies read. */
export function toContractBooking(row: BookingRow): ContractBooking {
  return {
    id: row.id,
    listingId: row.listingId,
    customerId: row.customerId,
    status: reconstructBookingStatus(row),
    reviewId: row.reviewId,
  };
}

import type { Listing as ContractListing } from '@cerca/contract';
import type { Page } from '../../../kernel/cursor';
import type { BookingRecord } from '../domain/booking';

export const BOOKING_REPOSITORY = Symbol('BOOKING_REPOSITORY');

export interface CreateBookingData {
  id: string;
  listingId: string;
  customerId: string;
}

export interface BookingRepository {
  create(data: CreateBookingData): Promise<BookingRecord>;
  findById(id: string): Promise<BookingRecord | null>;
  listByRole(
    actorId: string,
    role: 'customer' | 'provider',
    limit: number,
    cursorRequestedAt: string | null,
    cursorId: string | null,
  ): Promise<Page<BookingRecord>>;
  accept(id: string, scheduledFor: Date, at: Date): Promise<BookingRecord>;
  decline(id: string, reason: string): Promise<BookingRecord>;
  complete(id: string, at: Date): Promise<BookingRecord>;
  cancel(id: string, cancelledById: string, at: Date): Promise<BookingRecord>;
}

// The booking module's read-only view of a listing (owner + status), for the pure policies.
export const LISTING_LOOKUP = Symbol('BOOKING_LISTING_LOOKUP');

export interface ListingLookupPort {
  byId(id: string): Promise<ContractListing | null>;
}

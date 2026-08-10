import type { Booking, GeoPoint, Pricing } from '@cerca/contract';
import type { Page } from '../../../kernel/cursor';
import type { ListingRecord } from '../domain/listing';

export const LISTING_REPOSITORY = Symbol('LISTING_REPOSITORY');

export interface CreateListingData {
  id: string;
  ownerId: string;
  categoryId: string;
  title: string;
  description: string;
  pricing: Pricing;
  priceMinorFrom: number | null;
  currency: string | null;
  location: GeoPoint;
}

export interface UpdateListingData {
  title?: string;
  description?: string;
  pricing?: Pricing;
  priceMinorFrom?: number | null;
  currency?: string | null;
}

export interface SearchListingsParams {
  query: string | null;
  categoryId: string | null;
  lat: number;
  lng: number;
  radiusKm: number;
  limit: number;
  cursorDistance: number | null;
  cursorId: string | null;
}

export interface ListingSearchRow {
  id: string;
  title: string;
  categoryId: string;
  priceMinorFrom: number | null;
  currency: string | null;
  ratingAvg: number;
  ratingCount: number;
  statusKind: string;
  distanceMeters: number;
}

export type PublishTransition = 'publish' | 'pause';
export type ModerationTransition = 'under_review' | 'removed';

export interface ListingRepository {
  create(data: CreateListingData): Promise<ListingRecord>;
  findById(id: string): Promise<ListingRecord | null>;
  findByOwner(ownerId: string, limit: number, cursorCreatedAt: string | null, cursorId: string | null): Promise<Page<ListingRecord>>;
  update(id: string, data: UpdateListingData): Promise<ListingRecord>;
  transition(id: string, transition: PublishTransition, at: Date): Promise<ListingRecord>;
  moderate(id: string, transition: ModerationTransition, moderatorId: string, reason: string): Promise<ListingRecord>;
  search(params: SearchListingsParams): Promise<ListingSearchRow[]>;
}

// A read-only lookup the update use-case needs to enforce canChangePrice. The booking module
// owns bookings; this is a narrow, intention-revealing read, not `findMany`.
export const BOOKING_LOOKUP = Symbol('BOOKING_LOOKUP');

export interface BookingLookupPort {
  forListing(listingId: string): Promise<Booking[]>;
}

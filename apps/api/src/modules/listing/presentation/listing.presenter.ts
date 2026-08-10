import type { ListingResponse, ListingSearchItem } from '@cerca/contract';
import type { ListingSearchRow } from '../application/ports';
import { type ListingRecord, priceFrom } from '../domain/listing';

export function presentListing(listing: ListingRecord): ListingResponse {
  return {
    id: listing.id,
    ownerId: listing.ownerId,
    categoryId: listing.categoryId,
    title: listing.title,
    description: listing.description,
    pricing: listing.pricing,
    priceFrom: priceFrom(listing),
    status: listing.status.kind,
    ratingAvg: listing.ratingAvg,
    ratingCount: listing.ratingCount,
    createdAt: listing.createdAt.toISOString(),
  };
}

export function toSearchItem(row: ListingSearchRow): ListingSearchItem {
  return {
    id: row.id,
    title: row.title,
    categoryId: row.categoryId,
    priceFrom:
      row.priceMinorFrom !== null && row.currency !== null
        ? { amountMinor: row.priceMinorFrom, currency: row.currency }
        : null,
    status: row.statusKind as ListingSearchItem['status'],
    ratingAvg: row.ratingAvg,
    ratingCount: row.ratingCount,
    distanceMeters: row.distanceMeters,
  };
}

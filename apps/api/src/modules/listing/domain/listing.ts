import type { Listing as ContractListing, ListingStatus, Money, Pricing } from '@cerca/contract';

/** The full listing entity. Policies read only the {id, ownerId, status} projection. */
export interface ListingRecord {
  id: string;
  ownerId: string;
  categoryId: string;
  title: string;
  description: string;
  pricing: Pricing;
  priceMinorFrom: number | null;
  currency: string | null;
  status: ListingStatus;
  ratingAvg: number;
  ratingCount: number;
  createdAt: Date;
}

export function toContractListing(listing: ListingRecord): ContractListing {
  return { id: listing.id, ownerId: listing.ownerId, status: listing.status };
}

/** The denormalized "from" price as Money, or null for a quote with no floor. */
export function priceFrom(listing: ListingRecord): Money | null {
  if (listing.priceMinorFrom === null || listing.currency === null) return null;
  return { amountMinor: listing.priceMinorFrom, currency: listing.currency };
}

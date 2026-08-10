import { type ListingStatus, type Pricing, pricingSchema } from '@cerca/contract';
import { assertNever } from '../../../kernel/assert-never';
import type { ListingRecord } from '../domain/listing';

export interface ListingRow {
  id: string;
  ownerId: string;
  categoryId: string;
  title: string;
  description: string;
  pricing: unknown;
  priceMinorFrom: number | null;
  currency: string | null;
  statusKind: string;
  publishedAt: Date | null;
  removedById: string | null;
  removalReason: string | null;
  ratingAvg: number;
  ratingCount: number;
  createdAt: Date;
}

function reconstructStatus(row: ListingRow): ListingStatus {
  switch (row.statusKind) {
    case 'draft':
      return { kind: 'draft' };
    case 'published':
      return { kind: 'published', publishedAt: (row.publishedAt ?? row.createdAt).toISOString() };
    case 'paused':
      return { kind: 'paused' };
    case 'under_review':
      return { kind: 'under_review' };
    case 'removed':
      return { kind: 'removed', removedById: row.removedById ?? '', reason: row.removalReason ?? '' };
    default:
      return assertNever(row.statusKind as never);
  }
}

export function toListingRecord(row: ListingRow): ListingRecord {
  const pricing: Pricing = pricingSchema.parse(row.pricing);
  return {
    id: row.id,
    ownerId: row.ownerId,
    categoryId: row.categoryId,
    title: row.title,
    description: row.description,
    pricing,
    priceMinorFrom: row.priceMinorFrom,
    currency: row.currency,
    status: reconstructStatus(row),
    ratingAvg: row.ratingAvg,
    ratingCount: row.ratingCount,
    createdAt: row.createdAt,
  };
}

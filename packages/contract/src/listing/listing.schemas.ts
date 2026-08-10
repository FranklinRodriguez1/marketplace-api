import { z } from 'zod';
import { moneySchema } from '../money/money';
import { pricingSchema } from './pricing';

export const listingStatusSchema = z.enum(['draft', 'published', 'paused', 'under_review', 'removed']);

export const geoPointSchema = z
  .object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  })
  .strict();
export type GeoPoint = z.infer<typeof geoPointSchema>;

export const createListingSchema = z
  .object({
    categoryId: z.uuid(),
    title: z.string().min(3).max(120),
    description: z.string().min(1).max(4000),
    pricing: pricingSchema,
    location: geoPointSchema,
  })
  .strict();
export type CreateListingInput = z.infer<typeof createListingSchema>;

export const updateListingSchema = z
  .object({
    title: z.string().min(3).max(120).optional(),
    description: z.string().min(1).max(4000).optional(),
    pricing: pricingSchema.optional(),
  })
  .strict();
export type UpdateListingInput = z.infer<typeof updateListingSchema>;

/**
 * Geospatial search. `lat`/`lng` are optional: with no device location the app may pass a
 * `cityId` and the server searches from that city's coordinates (US-08). Coordinates arrive
 * already snapped to a ~1km grid so the query — and its cache key — are reusable.
 */
export const searchListingsQuerySchema = z
  .object({
    query: z.string().max(120).optional(),
    categoryId: z.uuid().optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    cityId: z.string().max(64).optional(),
    radiusKm: z.coerce.number().min(0.1).max(200).default(10),
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();
export type SearchListingsQuery = z.infer<typeof searchListingsQuerySchema>;

export const moderateListingSchema = z
  .object({
    action: z.enum(['under_review', 'removed']),
    reason: z.string().min(1).max(500),
  })
  .strict();
export type ModerateListingInput = z.infer<typeof moderateListingSchema>;

export const listingResponseSchema = z.object({
  id: z.uuid(),
  ownerId: z.uuid(),
  categoryId: z.uuid(),
  title: z.string(),
  description: z.string(),
  pricing: pricingSchema,
  priceFrom: moneySchema.nullable(),
  status: listingStatusSchema,
  ratingAvg: z.number(),
  ratingCount: z.number().int(),
  createdAt: z.iso.datetime(),
});
export type ListingResponse = z.infer<typeof listingResponseSchema>;

export const listingSearchItemSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  categoryId: z.uuid(),
  priceFrom: moneySchema.nullable(),
  status: listingStatusSchema,
  ratingAvg: z.number(),
  ratingCount: z.number().int(),
  distanceMeters: z.number(),
});
export type ListingSearchItem = z.infer<typeof listingSearchItemSchema>;

export const categoryResponseSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: z.string(),
});
export type CategoryResponse = z.infer<typeof categoryResponseSchema>;

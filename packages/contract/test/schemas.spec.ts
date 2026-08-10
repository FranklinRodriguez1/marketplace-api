import { describe, expect, it } from 'vitest';
import { signUpSchema, signInSchema, refreshSchema } from '../src/auth/auth.schemas';
import {
  createListingSchema,
  searchListingsQuerySchema,
  moderateListingSchema,
} from '../src/listing/listing.schemas';
import {
  createBookingSchema,
  acceptBookingSchema,
  bookingRoleQuerySchema,
} from '../src/booking/booking.schemas';
import { writeReviewSchema, moderateReviewSchema } from '../src/review/review.schemas';
import { createReportSchema, resolveReportSchema } from '../src/report/report.schemas';
import { paginationQuerySchema } from '../src/common/pagination';

describe('auth schemas', () => {
  it('defaults capacities to [customer] and rejects a bad email', () => {
    expect(signUpSchema.parse({ email: 'a@b.co', password: 'longenough', displayName: 'A' }).capacities).toEqual([
      'customer',
    ]);
    expect(signUpSchema.safeParse({ email: 'nope', password: 'longenough', displayName: 'A' }).success).toBe(false);
  });

  it('rejects unknown keys (mass-assignment guard)', () => {
    expect(
      signUpSchema.safeParse({ email: 'a@b.co', password: 'longenough', displayName: 'A', platformRole: 'admin' })
        .success,
    ).toBe(false);
  });

  it('sign-in and refresh validate their inputs', () => {
    expect(signInSchema.safeParse({ email: 'a@b.co', password: 'x' }).success).toBe(true);
    expect(refreshSchema.safeParse({ refreshToken: '' }).success).toBe(false);
  });
});

describe('listing schemas', () => {
  it('validates a create payload with pricing + location', () => {
    const ok = createListingSchema.safeParse({
      categoryId: '018f1a2b-3c4d-7e6f-8a9b-0c1d2e3f4a5b',
      title: 'Guitar lessons',
      description: 'One-on-one',
      pricing: { model: 'hourly', hourlyRate: { amountMinor: 3000, currency: 'COP' }, minimumHours: 1 },
      location: { lat: 6.24, lng: -75.58 },
    });
    expect(ok.success).toBe(true);
  });

  it('coerces search query params and caps the limit', () => {
    const parsed = searchListingsQuerySchema.parse({ lat: '6.24', lng: '-75.58', radiusKm: '5', limit: '10' });
    expect(parsed).toMatchObject({ lat: 6.24, lng: -75.58, radiusKm: 5, limit: 10 });
    expect(searchListingsQuerySchema.safeParse({ limit: '999' }).success).toBe(false);
  });

  it('moderation requires an action + reason', () => {
    expect(moderateListingSchema.safeParse({ action: 'removed', reason: 'against policy' }).success).toBe(true);
    expect(moderateListingSchema.safeParse({ action: 'nuke', reason: 'x' }).success).toBe(false);
  });
});

describe('booking / review / report schemas', () => {
  it('booking payloads validate', () => {
    expect(createBookingSchema.safeParse({ listingId: '018f1a2b-3c4d-7e6f-8a9b-0c1d2e3f4a5b' }).success).toBe(true);
    expect(acceptBookingSchema.safeParse({ scheduledFor: '2026-07-01T15:00:00.000Z' }).success).toBe(true);
    expect(bookingRoleQuerySchema.safeParse({ role: 'provider' }).success).toBe(true);
    expect(bookingRoleQuerySchema.safeParse({ role: 'nobody' }).success).toBe(false);
  });

  it('review rating is bounded 1..5', () => {
    expect(writeReviewSchema.safeParse({ rating: 5, body: 'great' }).success).toBe(true);
    expect(writeReviewSchema.safeParse({ rating: 6, body: 'great' }).success).toBe(false);
    expect(moderateReviewSchema.safeParse({ action: 'remove' }).success).toBe(true);
  });

  it('report payloads validate', () => {
    expect(createReportSchema.safeParse({ reason: 'scam listing' }).success).toBe(true);
    expect(resolveReportSchema.safeParse({ action: 'dismiss' }).success).toBe(true);
    expect(resolveReportSchema.safeParse({ action: 'delete' }).success).toBe(false);
  });

  it('pagination caps the limit and defaults it', () => {
    expect(paginationQuerySchema.parse({}).limit).toBe(20);
    expect(paginationQuerySchema.safeParse({ limit: '0' }).success).toBe(false);
  });
});

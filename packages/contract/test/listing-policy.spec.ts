import { describe, expect, it } from 'vitest';
import type { Actor } from '../src/auth/actor';
import type { Booking } from '../src/booking/booking.types';
import { canChangePrice, canEditListing } from '../src/listing/listing.policy';
import type { Listing } from '../src/listing/listing.types';

const provider: Actor = { id: 'owner-1', capacities: ['provider'], platformRole: 'user' };
const customer: Actor = { id: 'cust-1', capacities: ['customer'], platformRole: 'user' };

const listing = (over: Partial<Listing> = {}): Listing => ({
  id: 'l1',
  ownerId: 'owner-1',
  status: { kind: 'published', publishedAt: '2026-01-01T00:00:00.000Z' },
  ...over,
});

describe('canEditListing', () => {
  it('denies without the listing:update capacity', () => {
    expect(canEditListing(customer, listing())).toEqual({ ok: false, reason: 'no_capacity' });
  });

  it('denies editing someone else’s listing — the BOLA case', () => {
    expect(canEditListing(provider, listing({ ownerId: 'someone-else' }))).toEqual({
      ok: false,
      reason: 'not_owner',
    });
  });

  it('denies editing a moderation-removed listing', () => {
    expect(canEditListing(provider, listing({ status: { kind: 'removed', removedById: 'mod', reason: 'spam' } }))).toEqual(
      { ok: false, reason: 'removed_by_moderation' },
    );
  });

  it('allows the owner-provider to edit their own listing', () => {
    expect(canEditListing(provider, listing())).toEqual({ ok: true });
  });
});

describe('canChangePrice', () => {
  const accepted: Booking = {
    id: 'b1',
    listingId: 'l1',
    customerId: 'cust-1',
    status: { kind: 'accepted', acceptedAt: '2026-01-02T00:00:00.000Z', scheduledFor: '2026-01-05T00:00:00.000Z' },
    reviewId: null,
  };
  const requested: Booking = { ...accepted, id: 'b2', status: { kind: 'requested', requestedAt: '2026-01-02T00:00:00.000Z' } };

  it('propagates a base denial (e.g. not the owner)', () => {
    expect(canChangePrice(provider, listing({ ownerId: 'x' }), [])).toEqual({ ok: false, reason: 'not_owner' });
  });

  it('blocks a price change while an accepted booking exists', () => {
    expect(canChangePrice(provider, listing(), [accepted])).toEqual({ ok: false, reason: 'has_pending_bookings' });
  });

  it('allows a price change with no accepted bookings', () => {
    expect(canChangePrice(provider, listing(), [requested])).toEqual({ ok: true });
  });
});

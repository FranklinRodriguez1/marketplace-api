import { describe, expect, it } from 'vitest';
import type { Actor } from '../src/auth/actor';
import { canCancelBooking, canRequestBooking } from '../src/booking/booking.policy';
import type { Booking } from '../src/booking/booking.types';
import type { Listing } from '../src/listing/listing.types';

const customer: Actor = { id: 'cust-1', capacities: ['customer'], platformRole: 'user' };
const owner: Actor = { id: 'owner-1', capacities: ['provider'], platformRole: 'user' };
const stranger: Actor = { id: 'stranger', capacities: ['customer'], platformRole: 'user' };

const published: Listing = { id: 'l1', ownerId: 'owner-1', status: { kind: 'published', publishedAt: '2026-01-01T00:00:00.000Z' } };
const draft: Listing = { id: 'l2', ownerId: 'owner-1', status: { kind: 'draft' } };

describe('canRequestBooking', () => {
  it('rejects booking your own listing', () => {
    expect(canRequestBooking(owner, published)).toEqual({ ok: false, reason: 'own_listing' });
  });

  it('rejects booking a non-published listing', () => {
    expect(canRequestBooking(customer, draft)).toEqual({ ok: false, reason: 'not_bookable' });
  });

  it('allows a customer to book a published listing they do not own', () => {
    expect(canRequestBooking(customer, published)).toEqual({ ok: true });
  });
});

describe('canCancelBooking', () => {
  const requested: Booking = {
    id: 'b1',
    listingId: 'l1',
    customerId: 'cust-1',
    status: { kind: 'requested', requestedAt: '2026-01-02T00:00:00.000Z' },
    reviewId: null,
  };
  const completed: Booking = { ...requested, status: { kind: 'completed', completedAt: '2026-01-10T00:00:00.000Z' } };

  it('rejects a non-participant', () => {
    expect(canCancelBooking(stranger, requested, published)).toEqual({ ok: false, reason: 'not_participant' });
  });

  it('rejects cancelling a terminal (completed) booking', () => {
    expect(canCancelBooking(customer, completed, published)).toEqual({ ok: false, reason: 'not_cancellable' });
  });

  it('allows the customer to cancel a requested booking', () => {
    expect(canCancelBooking(customer, requested, published)).toEqual({ ok: true });
  });

  it('allows the listing owner to cancel too', () => {
    expect(canCancelBooking(owner, requested, published)).toEqual({ ok: true });
  });
});

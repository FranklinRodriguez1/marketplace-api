import { describe, expect, it } from 'vitest';
import type { Actor } from '../src/auth/actor';
import type { Booking } from '../src/booking/booking.types';
import { canReviewBooking, daysBetween, REVIEW_WINDOW_DAYS } from '../src/review/review.policy';

const customer: Actor = { id: 'cust-1', capacities: ['customer'], platformRole: 'user' };

const completedBooking = (over: Partial<Booking> = {}, completedAt = '2026-06-01T00:00:00.000Z'): Booking => ({
  id: 'b1',
  listingId: 'l1',
  customerId: 'cust-1',
  status: { kind: 'completed', completedAt },
  reviewId: null,
  ...over,
});

// A fixed "now" so the test passes a date instead of faking a clock.
const now = new Date('2026-06-11T00:00:00.000Z'); // 10 days after completion

describe('daysBetween', () => {
  it('counts whole floored days', () => {
    expect(daysBetween(new Date('2026-06-01T00:00:00Z'), new Date('2026-06-01T00:00:00Z'))).toBe(0);
    expect(daysBetween(new Date('2026-06-01T00:00:00Z'), new Date('2026-07-01T00:00:00Z'))).toBe(30);
    expect(daysBetween(new Date('2026-06-01T00:00:00Z'), new Date('2026-07-02T00:00:00Z'))).toBe(31);
  });
});

describe('canReviewBooking — the four reasons', () => {
  it('not_your_booking — you were not the one who booked', () => {
    const other: Actor = { ...customer, id: 'someone-else' };
    expect(canReviewBooking(other, completedBooking(), now)).toEqual({ ok: false, reason: 'not_your_booking' });
  });

  it('not_completed — the booking is not completed', () => {
    const requested = completedBooking({ status: { kind: 'requested', requestedAt: '2026-06-01T00:00:00.000Z' } });
    expect(canReviewBooking(customer, requested, now)).toEqual({ ok: false, reason: 'not_completed' });
  });

  it('already_reviewed — a review already exists', () => {
    expect(canReviewBooking(customer, completedBooking({ reviewId: 'r1' }), now)).toEqual({
      ok: false,
      reason: 'already_reviewed',
    });
  });

  it('window_closed — more than 30 days have passed', () => {
    const late = new Date('2026-07-02T00:00:00.000Z'); // 31 days after completion
    expect(canReviewBooking(customer, completedBooking(), late)).toEqual({ ok: false, reason: 'window_closed' });
  });

  it('ok — your completed booking, unreviewed, inside the window', () => {
    expect(canReviewBooking(customer, completedBooking(), now)).toEqual({ ok: true });
  });

  it('ok — exactly on the last day of the window (boundary)', () => {
    const lastDay = new Date('2026-07-01T00:00:00.000Z'); // exactly 30 days
    expect(daysBetween(new Date('2026-06-01T00:00:00.000Z'), lastDay)).toBe(REVIEW_WINDOW_DAYS);
    expect(canReviewBooking(customer, completedBooking(), lastDay)).toEqual({ ok: true });
  });
});

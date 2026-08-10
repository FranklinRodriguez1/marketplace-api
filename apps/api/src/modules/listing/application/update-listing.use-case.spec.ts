import { describe, expect, it } from 'vitest';
import type { Actor, Booking } from '@cerca/contract';
import { ForbiddenError, NotFoundError } from '../../../kernel/domain-error';
import type { ListingRecord } from '../domain/listing';
import type { BookingLookupPort, CreateListingData, ListingRepository, UpdateListingData } from './ports';
import { UpdateListingUseCase } from './update-listing.use-case';

class FakeListingRepository implements ListingRepository {
  constructor(private listing: ListingRecord | null) {}
  async findById(): Promise<ListingRecord | null> {
    return this.listing;
  }
  async update(_id: string, data: UpdateListingData): Promise<ListingRecord> {
    if (!this.listing) throw new Error('no listing');
    this.listing = { ...this.listing, ...('title' in data ? { title: data.title as string } : {}) };
    return this.listing;
  }
  async create(_d: CreateListingData): Promise<ListingRecord> {
    throw new Error('not used');
  }
  async findByOwner() {
    return { items: [], nextCursor: null };
  }
  async transition(): Promise<ListingRecord> {
    throw new Error('not used');
  }
  async moderate(): Promise<ListingRecord> {
    throw new Error('not used');
  }
  async search() {
    return [];
  }
}

class FakeBookingLookup implements BookingLookupPort {
  constructor(private readonly bookings: Booking[]) {}
  async forListing(): Promise<Booking[]> {
    return this.bookings;
  }
}

const tx = { run: <T>(work: () => Promise<T>): Promise<T> => work() };
const provider: Actor = { id: 'owner-1', capacities: ['provider'], platformRole: 'user' };
const customer: Actor = { id: 'cust-1', capacities: ['customer'], platformRole: 'user' };

function listing(over: Partial<ListingRecord> = {}): ListingRecord {
  return {
    id: 'l1',
    ownerId: 'owner-1',
    categoryId: 'c1',
    title: 'Original',
    description: 'desc',
    pricing: { model: 'fixed', price: { amountMinor: 5000, currency: 'COP' } },
    priceMinorFrom: 5000,
    currency: 'COP',
    status: { kind: 'published', publishedAt: '2026-01-01T00:00:00.000Z' },
    ratingAvg: 0,
    ratingCount: 0,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...over,
  };
}

const build = (l: ListingRecord | null, bookings: Booking[] = []) =>
  new UpdateListingUseCase(new FakeListingRepository(l), new FakeBookingLookup(bookings), tx);

describe('UpdateListingUseCase (BOLA)', () => {
  it('404 when the listing is missing', async () => {
    await expect(build(null).execute(provider, 'l1', { title: 'x' })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('403 not_owner when a different provider edits it', async () => {
    const stranger: Actor = { id: 'stranger', capacities: ['provider'], platformRole: 'user' };
    await expect(build(listing()).execute(stranger, 'l1', { title: 'hijacked' })).rejects.toMatchObject({
      constructor: ForbiddenError,
      reason: 'not_owner',
    });
  });

  it('403 no_capacity when a customer edits', async () => {
    await expect(build(listing()).execute(customer, 'l1', { title: 'x' })).rejects.toMatchObject({
      reason: 'no_capacity',
    });
  });

  it('owner can edit their own listing', async () => {
    const updated = await build(listing()).execute(provider, 'l1', { title: 'New title' });
    expect(updated.title).toBe('New title');
  });

  it('blocks a price change while an accepted booking exists', async () => {
    const accepted: Booking = {
      id: 'b1',
      listingId: 'l1',
      customerId: 'cust-1',
      status: { kind: 'accepted', acceptedAt: '2026-01-02T00:00:00.000Z', scheduledFor: '2026-01-05T00:00:00.000Z' },
      reviewId: null,
    };
    await expect(
      build(listing(), [accepted]).execute(provider, 'l1', {
        pricing: { model: 'fixed', price: { amountMinor: 9000, currency: 'COP' } },
      }),
    ).rejects.toMatchObject({ reason: 'has_pending_bookings' });
  });
});

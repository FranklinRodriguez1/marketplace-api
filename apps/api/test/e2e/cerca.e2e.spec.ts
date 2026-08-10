import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/configure-app';

// Boots the real app against the live Postgres + Redis. A handful of critical journeys —
// enough to prove the wiring is real, not a second copy of the unit suite.
describe('Cerca API (e2e)', () => {
  let app: INestApplication;

  const rid = () => Math.random().toString(36).slice(2, 10);
  const http = () => app.getHttpServer();

  async function signUp(capacities: Array<'customer' | 'provider'>): Promise<{ token: string; id: string }> {
    const res = await request(http())
      .post('/v1/auth/sign-up')
      .send({ email: `e2e-${rid()}@test.dev`, password: 'Password123!', displayName: 'E2E', capacities });
    return { token: res.body.accessToken, id: res.body.actor.id };
  }

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  async function createPublishedListing(token: string, categoryId: string, lat: number, lng: number): Promise<string> {
    const created = await request(http())
      .post('/v1/listings')
      .set(auth(token))
      .send({
        categoryId,
        title: 'Servicio de prueba e2e',
        description: 'Descripción de prueba',
        pricing: { model: 'fixed', price: { amountMinor: 30000, currency: 'COP' } },
        location: { lat, lng },
      });
    const id = created.body.id as string;
    await request(http()).post(`/v1/listings/${id}/publish`).set(auth(token));
    return id;
  }

  let categoryId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ bufferLogs: false });
    configureApp(app);
    await app.init();
    const cats = await request(http()).get('/v1/categories');
    categoryId = cats.body[0].id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('sign-up issues tokens and GET /me returns the actor', async () => {
    const provider = await signUp(['customer', 'provider']);
    const me = await request(http()).get('/v1/me').set(auth(provider.token));
    expect(me.status).toBe(200);
    expect(me.body.capacities).toContain('provider');
  });

  it('rejects a private route without a token (401)', async () => {
    const res = await request(http()).post('/v1/listings').send({ title: 'x' });
    expect(res.status).toBe(401);
    expect(res.headers['content-type']).toContain('application/problem+json');
  });

  it('PATCH /listings/:id with a foreign token → 403 { reason: not_owner } (BOLA)', async () => {
    const owner = await signUp(['provider']);
    const attacker = await signUp(['provider']);
    const listingId = await createPublishedListing(owner.token, categoryId, 6.25, -75.56);

    const res = await request(http()).patch(`/v1/listings/${listingId}`).set(auth(attacker.token)).send({ title: 'hijacked' });
    expect(res.status).toBe(403);
    expect(res.body.reason).toBe('not_owner');
    expect(res.body.type).toContain('/errors/');
  });

  it('geo search returns published listings ordered by distance, with a keyset cursor', async () => {
    const res = await request(http()).get('/v1/listings').query({ lat: 6.25, lng: -75.56, radiusKm: 10, limit: 5 });
    expect(res.status).toBe(200);
    const distances = res.body.items.map((i: { distanceMeters: number }) => i.distanceMeters);
    expect(distances.length).toBeGreaterThan(0);
    expect(distances).toEqual([...distances].sort((a: number, b: number) => a - b));
    expect(res.body).toHaveProperty('nextCursor');
  });

  it('booking your own listing is rejected → 403 { reason: own_listing }', async () => {
    const provider = await signUp(['customer', 'provider']);
    const listingId = await createPublishedListing(provider.token, categoryId, 4.71, -74.07);
    const res = await request(http())
      .post('/v1/bookings')
      .set(auth(provider.token))
      .set('Idempotency-Key', rid())
      .send({ listingId });
    expect(res.status).toBe(403);
    expect(res.body.reason).toBe('own_listing');
  });

  it('POST /bookings is idempotent by Idempotency-Key', async () => {
    const provider = await signUp(['provider']);
    const customer = await signUp(['customer']);
    const listingId = await createPublishedListing(provider.token, categoryId, 3.45, -76.53);
    const key = rid();
    const first = await request(http()).post('/v1/bookings').set(auth(customer.token)).set('Idempotency-Key', key).send({ listingId });
    const second = await request(http()).post('/v1/bookings').set(auth(customer.token)).set('Idempotency-Key', key).send({ listingId });
    expect(first.status).toBe(201);
    expect(second.body.id).toBe(first.body.id);
  });

  it('completes the review journey and blocks a second review → 409 { reason: already_reviewed }', async () => {
    const provider = await signUp(['provider']);
    const customer = await signUp(['customer']);
    const listingId = await createPublishedListing(provider.token, categoryId, 10.96, -74.78);

    const booking = await request(http()).post('/v1/bookings').set(auth(customer.token)).set('Idempotency-Key', rid()).send({ listingId });
    const bookingId = booking.body.id as string;
    await request(http())
      .post(`/v1/bookings/${bookingId}/accept`)
      .set(auth(provider.token))
      .send({ scheduledFor: new Date(Date.now() + 86_400_000).toISOString() });
    await request(http()).post(`/v1/bookings/${bookingId}/complete`).set(auth(provider.token));

    const first = await request(http())
      .post(`/v1/bookings/${bookingId}/review`)
      .set(auth(customer.token))
      .set('Idempotency-Key', rid())
      .send({ rating: 5, body: 'Excelente' });
    expect(first.status).toBe(201);

    const second = await request(http())
      .post(`/v1/bookings/${bookingId}/review`)
      .set(auth(customer.token))
      .set('Idempotency-Key', rid())
      .send({ rating: 1, body: 'otra vez' });
    expect(second.status).toBe(409);
    expect(second.body.reason).toBe('already_reviewed');

    const detail = await request(http()).get(`/v1/listings/${listingId}`);
    expect(detail.body.ratingCount).toBe(1);
    expect(detail.body.ratingAvg).toBe(5);
  });

  it('a customer cannot moderate a listing → 403 { reason: no_capacity }', async () => {
    const provider = await signUp(['provider']);
    const customer = await signUp(['customer']);
    const listingId = await createPublishedListing(provider.token, categoryId, 4.71, -74.07);
    const res = await request(http())
      .post(`/v1/listings/${listingId}/moderate`)
      .set(auth(customer.token))
      .send({ action: 'removed', reason: 'nope' });
    expect(res.status).toBe(403);
    expect(res.body.reason).toBe('no_capacity');
  });
});

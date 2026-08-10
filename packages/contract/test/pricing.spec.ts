import { describe, expect, it } from 'vitest';
import { denormalizePricing, pricingSchema, type Pricing } from '../src/listing/pricing';

describe('pricingSchema', () => {
  it('accepts each pricing model', () => {
    expect(pricingSchema.safeParse({ model: 'fixed', price: { amountMinor: 5000, currency: 'COP' } }).success).toBe(
      true,
    );
    expect(
      pricingSchema.safeParse({
        model: 'hourly',
        hourlyRate: { amountMinor: 3000, currency: 'COP' },
        minimumHours: 2,
      }).success,
    ).toBe(true);
    expect(pricingSchema.safeParse({ model: 'quote' }).success).toBe(true);
  });

  it('rejects an unknown model and out-of-range minimumHours', () => {
    expect(pricingSchema.safeParse({ model: 'auction', price: { amountMinor: 1, currency: 'COP' } }).success).toBe(
      false,
    );
    expect(
      pricingSchema.safeParse({
        model: 'hourly',
        hourlyRate: { amountMinor: 3000, currency: 'COP' },
        minimumHours: 99,
      }).success,
    ).toBe(false);
  });
});

describe('denormalizePricing', () => {
  it('derives priceMinorFrom for fixed', () => {
    const p: Pricing = { model: 'fixed', price: { amountMinor: 5000, currency: 'COP' } };
    expect(denormalizePricing(p)).toEqual({ priceMinorFrom: 5000, currency: 'COP' });
  });

  it('derives priceMinorFrom for hourly (the hourly rate)', () => {
    const p: Pricing = { model: 'hourly', hourlyRate: { amountMinor: 3000, currency: 'COP' }, minimumHours: 2 };
    expect(denormalizePricing(p)).toEqual({ priceMinorFrom: 3000, currency: 'COP' });
  });

  it('derives the floor for a quote with startingFrom', () => {
    const p: Pricing = { model: 'quote', startingFrom: { amountMinor: 9000, currency: 'USD' } };
    expect(denormalizePricing(p)).toEqual({ priceMinorFrom: 9000, currency: 'USD' });
  });

  it('has no sortable price for a bare quote', () => {
    const p: Pricing = { model: 'quote' };
    expect(denormalizePricing(p)).toEqual({ priceMinorFrom: null, currency: null });
  });
});

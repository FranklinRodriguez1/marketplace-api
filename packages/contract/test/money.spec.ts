import { describe, expect, it } from 'vitest';
import { minorUnitsFor, moneySchema } from '../src/money/money';

describe('moneySchema', () => {
  it('accepts integer minor units + a 3-letter code', () => {
    expect(moneySchema.parse({ amountMinor: 50000, currency: 'COP' })).toEqual({
      amountMinor: 50000,
      currency: 'COP',
    });
  });

  it('rejects a non-integer amount (no floats for money)', () => {
    expect(moneySchema.safeParse({ amountMinor: 12.5, currency: 'USD' }).success).toBe(false);
  });

  it('rejects a negative amount', () => {
    expect(moneySchema.safeParse({ amountMinor: -1, currency: 'USD' }).success).toBe(false);
  });

  it('rejects a malformed currency code', () => {
    expect(moneySchema.safeParse({ amountMinor: 100, currency: 'usd' }).success).toBe(false);
    expect(moneySchema.safeParse({ amountMinor: 100, currency: 'DOLLAR' }).success).toBe(false);
  });

  it('rejects unknown extra keys (strict)', () => {
    expect(moneySchema.safeParse({ amountMinor: 100, currency: 'USD', formatted: '$1' }).success).toBe(false);
  });
});

describe('minorUnitsFor', () => {
  it('knows currency exponents', () => {
    expect(minorUnitsFor('COP')).toBe(0);
    expect(minorUnitsFor('USD')).toBe(2);
    expect(minorUnitsFor('KWD')).toBe(3);
  });

  it('defaults unknown currencies to 2', () => {
    expect(minorUnitsFor('XYZ')).toBe(2);
  });
});

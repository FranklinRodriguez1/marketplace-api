import { z } from 'zod';

/**
 * Money is ALWAYS integer minor units + an ISO-4217 currency code. Never a float:
 * `0.1 + 0.2 !== 0.3`, and "divide by 100" is wrong in general — the Colombian peso
 * has 0 decimals, the Kuwaiti dinar has 3. The server never formats or divides money;
 * it emits `{ amountMinor, currency }` and the client renders it for its locale.
 */
export const CURRENCY_MINOR_UNITS: Readonly<Record<string, number>> = Object.freeze({
  COP: 0,
  CLP: 0,
  JPY: 0,
  USD: 2,
  EUR: 2,
  GBP: 2,
  MXN: 2,
  BRL: 2,
  KWD: 3,
});

export const moneySchema = z
  .object({
    amountMinor: z.number().int().nonnegative(),
    currency: z
      .string()
      .length(3)
      .regex(/^[A-Z]{3}$/, 'currency must be a 3-letter ISO-4217 code'),
  })
  .strict();

export type Money = z.infer<typeof moneySchema>;

/**
 * Minor-unit exponent for a currency (how many minor units make one major unit).
 * Reference metadata for clients; the server does not use it to format money.
 * Unknown currencies default to 2.
 */
export function minorUnitsFor(currency: string): number {
  return CURRENCY_MINOR_UNITS[currency] ?? 2;
}

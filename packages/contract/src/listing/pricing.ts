import { z } from 'zod';
import { moneySchema } from '../money/money';

/**
 * `Pricing` is a business discriminated union, stored as JSONB validated by this schema
 * (Zod is the source of truth). Alongside it, `priceMinorFrom` + `currency` are
 * denormalized into columns so search can filter/order by price without opening the JSON.
 */
export const pricingSchema = z.discriminatedUnion('model', [
  z.object({ model: z.literal('fixed'), price: moneySchema }).strict(),
  z
    .object({
      model: z.literal('hourly'),
      hourlyRate: moneySchema,
      minimumHours: z.number().int().min(1).max(12),
    })
    .strict(),
  z.object({ model: z.literal('quote'), startingFrom: moneySchema.optional() }).strict(),
]);

export type Pricing = z.infer<typeof pricingSchema>;

/**
 * Derives the denormalized `(priceMinorFrom, currency)` from a pricing. Duplicated data
 * on purpose, always written in the same transaction as the JSONB it mirrors. A `quote`
 * with no floor has no sortable price, so both are null.
 */
export function denormalizePricing(pricing: Pricing): {
  priceMinorFrom: number | null;
  currency: string | null;
} {
  if (pricing.model === 'fixed') {
    return { priceMinorFrom: pricing.price.amountMinor, currency: pricing.price.currency };
  }
  if (pricing.model === 'hourly') {
    return { priceMinorFrom: pricing.hourlyRate.amountMinor, currency: pricing.hourlyRate.currency };
  }
  return pricing.startingFrom
    ? { priceMinorFrom: pricing.startingFrom.amountMinor, currency: pricing.startingFrom.currency }
    : { priceMinorFrom: null, currency: null };
}

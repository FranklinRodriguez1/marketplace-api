import { z } from 'zod';

export const bookingStatusSchema = z.enum(['requested', 'accepted', 'declined', 'completed', 'cancelled']);
export const declineReasonSchema = z.enum(['unavailable', 'not_a_fit', 'other']);

export const createBookingSchema = z
  .object({
    listingId: z.uuid(),
    note: z.string().max(500).optional(),
  })
  .strict();
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const acceptBookingSchema = z.object({ scheduledFor: z.iso.datetime() }).strict();
export type AcceptBookingInput = z.infer<typeof acceptBookingSchema>;

export const declineBookingSchema = z.object({ reason: declineReasonSchema }).strict();
export type DeclineBookingInput = z.infer<typeof declineBookingSchema>;

export const bookingRoleQuerySchema = z
  .object({
    role: z.enum(['customer', 'provider']),
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();
export type BookingRoleQuery = z.infer<typeof bookingRoleQuerySchema>;

export const bookingResponseSchema = z.object({
  id: z.uuid(),
  listingId: z.uuid(),
  customerId: z.uuid(),
  status: bookingStatusSchema,
  requestedAt: z.iso.datetime(),
  scheduledFor: z.iso.datetime().nullable(),
  completedAt: z.iso.datetime().nullable(),
  reviewId: z.uuid().nullable(),
});
export type BookingResponse = z.infer<typeof bookingResponseSchema>;

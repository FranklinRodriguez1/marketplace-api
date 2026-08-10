import { z } from 'zod';

export const writeReviewSchema = z
  .object({
    rating: z.number().int().min(1).max(5),
    body: z.string().min(1).max(2000),
  })
  .strict();
export type WriteReviewInput = z.infer<typeof writeReviewSchema>;

export const moderateReviewSchema = z
  .object({
    action: z.enum(['remove', 'keep']),
    reason: z.string().max(500).optional(),
  })
  .strict();
export type ModerateReviewInput = z.infer<typeof moderateReviewSchema>;

export const reviewResponseSchema = z.object({
  id: z.uuid(),
  bookingId: z.uuid(),
  listingId: z.uuid(),
  authorId: z.uuid(),
  rating: z.number().int(),
  body: z.string(),
  createdAt: z.iso.datetime(),
});
export type ReviewResponse = z.infer<typeof reviewResponseSchema>;

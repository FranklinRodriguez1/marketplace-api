import { z } from 'zod';

export const reportStatusSchema = z.enum(['open', 'resolved', 'dismissed']);

export const createReportSchema = z.object({ reason: z.string().min(3).max(500) }).strict();
export type CreateReportInput = z.infer<typeof createReportSchema>;

export const resolveReportSchema = z
  .object({
    action: z.enum(['remove', 'dismiss']),
    note: z.string().max(500).optional(),
  })
  .strict();
export type ResolveReportInput = z.infer<typeof resolveReportSchema>;

export const reportResponseSchema = z.object({
  id: z.uuid(),
  listingId: z.uuid(),
  reporterId: z.uuid(),
  reason: z.string(),
  status: reportStatusSchema,
  createdAt: z.iso.datetime(),
});
export type ReportResponse = z.infer<typeof reportResponseSchema>;

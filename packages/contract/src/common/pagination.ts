import { z } from 'zod';

/** Every list paginates by keyset cursor — never OFFSET. `?cursor=&limit=`. */
export const paginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/** Uniform page envelope: `{ items, nextCursor }`. `nextCursor === null` ⇒ last page. */
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

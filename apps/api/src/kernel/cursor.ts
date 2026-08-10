// Opaque keyset cursors. Clients treat them as opaque base64 and never parse them, which
// leaves us free to change the sort key. Every list endpoint paginates by cursor, never OFFSET.

export function encodeCursor(payload: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeCursor<T>(cursor: string | undefined): T | null {
  if (!cursor) return null;
  try {
    return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as T;
  } catch {
    return null;
  }
}

/** Uniform page envelope: `{ items, nextCursor }`. `nextCursor === null` ⇒ last page. */
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

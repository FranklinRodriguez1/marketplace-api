export const CACHE = Symbol('CACHE');

export interface CachePort {
  get(key: string): Promise<string | null>;
  /** Set with a MANDATORY ttl — no cache key without a TTL. */
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
  /** SET NX EX: returns true if the key was set (used for idempotency keys and locks). */
  setIfAbsent(key: string, value: string, ttlSeconds: number): Promise<boolean>;
}

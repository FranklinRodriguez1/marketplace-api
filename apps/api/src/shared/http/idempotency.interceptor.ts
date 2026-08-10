import {
  type CallHandler,
  type ExecutionContext,
  Inject,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHash } from 'node:crypto';
import { type Observable, catchError, from, map, mergeMap, of, throwError } from 'rxjs';
import { env } from '../../config/env';
import { ConflictError, ValidationError } from '../../kernel/domain-error';
import { CACHE, type CachePort } from '../../kernel/ports/cache.port';
import { IDEMPOTENT } from './idempotent.decorator';

interface StoredIdempotency {
  state: 'processing' | 'done';
  bodyHash: string;
  body?: unknown;
}

// Idempotency-Key backed by Redis, on POST /bookings and POST /bookings/{id}/review.
// Same key + same body → the stored response is replayed; same key + different body → 422;
// a concurrent duplicate while the first is in flight → 409.
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    @Inject(CACHE) private readonly cache: CachePort,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const idempotent = this.reflector.getAllAndOverride<boolean>(IDEMPOTENT, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!idempotent) return next.handle();

    const req = context.switchToHttp().getRequest<{ headers: Record<string, unknown>; body?: unknown }>();
    const headerValue = req.headers['idempotency-key'];
    const key = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    if (typeof key !== 'string' || key.length === 0) {
      throw new ValidationError({
        code: 'IDEMPOTENCY_KEY_REQUIRED',
        message: 'The Idempotency-Key header is required for this operation.',
      });
    }

    const route = `${context.getClass().name}.${context.getHandler().name}`;
    const cacheKey = `idem:${route}:${key}`;
    const bodyHash = sha256(JSON.stringify(req.body ?? {}));
    const ttl = env.IDEMPOTENCY_TTL_SECONDS;

    const acquired = await this.cache.setIfAbsent(
      cacheKey,
      JSON.stringify({ state: 'processing', bodyHash } satisfies StoredIdempotency),
      ttl,
    );

    if (!acquired) {
      const raw = await this.cache.get(cacheKey);
      const stored = raw ? (JSON.parse(raw) as StoredIdempotency) : null;
      if (stored && stored.bodyHash !== bodyHash) {
        throw new ValidationError({
          code: 'IDEMPOTENCY_KEY_REUSED',
          message: 'This Idempotency-Key was already used with a different request body.',
        });
      }
      if (stored?.state === 'done') {
        return of(stored.body);
      }
      throw new ConflictError({
        code: 'IDEMPOTENCY_IN_PROGRESS',
        message: 'A request with this Idempotency-Key is already being processed.',
      });
    }

    return next.handle().pipe(
      mergeMap((body) =>
        from(
          this.cache.set(cacheKey, JSON.stringify({ state: 'done', bodyHash, body } satisfies StoredIdempotency), ttl),
        ).pipe(map(() => body)),
      ),
      catchError((err) => from(this.cache.del(cacheKey)).pipe(mergeMap(() => throwError(() => err)))),
    );
  }
}

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

import { SetMetadata } from '@nestjs/common';

export const IDEMPOTENT = 'idempotent';

/** Marks a POST that moves state as requiring an `Idempotency-Key` header, backed by Redis. */
export const Idempotent = (): MethodDecorator => SetMetadata(IDEMPOTENT, true);

import { Global, Module } from '@nestjs/common';
import { CACHE } from '../kernel/ports/cache.port';
import { CLOCK } from '../kernel/ports/clock.port';
import { ID } from '../kernel/ports/id.port';
import { RedisCache } from './cache/redis-cache.adapter';
import { SystemClock } from './clock/system-clock.adapter';
import { UuidGenerator } from './id/uuid.adapter';

// Cross-cutting infrastructure ports, bound once and exported globally.
@Global()
@Module({
  providers: [
    { provide: CACHE, useClass: RedisCache },
    { provide: CLOCK, useClass: SystemClock },
    { provide: ID, useClass: UuidGenerator },
  ],
  exports: [CACHE, CLOCK, ID],
})
export class SharedModule {}

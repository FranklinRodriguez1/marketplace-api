import { Controller, Get, Inject, VERSION_NEUTRAL } from '@nestjs/common';
import { HealthCheck, HealthCheckService, type HealthIndicatorResult } from '@nestjs/terminus';
import { CACHE, type CachePort } from '../kernel/ports/cache.port';
import { Public } from '../shared/auth/public.decorator';
import { PrismaService } from '../shared/database/prisma.service';

// Liveness must NOT check dependencies (a DB blip should not restart the fleet). Readiness
// checks Postgres and Redis so the orchestrator holds traffic until they are reachable.
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaService,
    @Inject(CACHE) private readonly cache: CachePort,
  ) {}

  @Public()
  @Get('live')
  @HealthCheck()
  live() {
    return this.health.check([]);
  }

  @Public()
  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([
      async (): Promise<HealthIndicatorResult> => {
        await this.prisma.$queryRaw`SELECT 1`;
        return { database: { status: 'up' } };
      },
      async (): Promise<HealthIndicatorResult> => {
        await this.cache.get('health:probe');
        return { redis: { status: 'up' } };
      },
    ]);
  }
}

import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import { env } from '../../config/env';
import type { CachePort } from '../../kernel/ports/cache.port';

// Cache-aside, idempotency keys and locks, all behind CachePort. Business code never imports
// ioredis. Every write carries a TTL — there is no un-TTL'd key.
@Injectable()
export class RedisCache implements CachePort, OnModuleDestroy {
  private readonly logger = new Logger(RedisCache.name);
  private readonly redis: Redis;

  constructor() {
    this.redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 3 });
    this.redis.on('error', (err) => this.logger.warn(`redis error: ${err.message}`));
  }

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(key, value, 'EX', ttlSeconds);
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async setIfAbsent(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.redis.set(key, value, 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}

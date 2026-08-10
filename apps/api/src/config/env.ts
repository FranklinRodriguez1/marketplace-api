// Fail fast on configuration: a misconfigured server refuses to boot rather than crashing
// three hours later on the one code path that reads the missing variable. Parsed and frozen
// BEFORE Nest starts. Every variable here also exists in .env.example (same commit).
import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3333),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),

  DATABASE_URL: z.string().min(1),
  DIRECT_DATABASE_URL: z.string().min(1).optional(),
  SHADOW_DATABASE_URL: z.string().min(1).optional(),
  LOG_SLOW_QUERIES_MS: z.coerce.number().int().nonnegative().default(300),

  REDIS_URL: z.string().min(1),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),

  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000')
    .transform((s) => s.split(',').map((o) => o.trim()).filter(Boolean)),
  PUBLIC_API_URL: z.string().default('http://localhost:3333'),

  IDEMPOTENCY_TTL_SECONDS: z.coerce.number().int().positive().default(86_400),
  CATEGORIES_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  SEARCH_MAX_LIMIT: z.coerce.number().int().positive().max(100).default(50),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment:\n', z.treeifyError(parsed.error));
  process.exit(1);
}

export const env = Object.freeze(parsed.data);
export type Env = typeof env;

/** DI token so services depend on an injected config, not on process.env directly. */
export const ENV = Symbol('ENV');

// Prisma 7 configures the CLI here, not in package.json.
// Env vars are NOT auto-loaded in v7 — the dotenv import is required.
// Connection URLs for Migrate also live here now (they left the schema in v7).
import 'dotenv/config';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  datasource: {
    // Migrate uses a DIRECT (non-pooled) connection — DDL and advisory locks need a real session.
    url: process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL,
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'tsx prisma/seed.ts',
  },
});

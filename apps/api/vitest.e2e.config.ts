import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';
import tsconfigPaths from 'vite-tsconfig-paths';

// E2E boots the real Nest app against a real Postgres + Redis (provided by DATABASE_URL /
// REDIS_URL — docker compose locally, service containers in CI). Single-threaded, long timeout.
export default defineConfig({
  plugins: [
    tsconfigPaths(),
    swc.vite({
      jsc: {
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
      },
    }),
  ],
  test: {
    environment: 'node',
    globals: true,
    include: ['test/e2e/**/*.spec.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // One app instance shared across the suite (against real Postgres + Redis).
    fileParallelism: false,
  },
});

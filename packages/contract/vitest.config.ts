import { defineConfig } from 'vitest/config';

// The contract is pure TypeScript + Zod — no decorators, so no SWC needed.
// It is the domain: 100% coverage is a floor, not a negotiation.
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', '**/*.spec.ts'],
      thresholds: { lines: 100, functions: 100, branches: 100, statements: 100 },
    },
  },
});

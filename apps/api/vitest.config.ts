import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';
import tsconfigPaths from 'vite-tsconfig-paths';

// NestJS DI relies on emitDecoratorMetadata, which esbuild (Vitest's default) does not emit —
// SWC is required for any test that touches Nest DI.
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
    include: ['src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/modules/**/application/**/*.ts', 'src/modules/**/domain/**/*.ts', 'src/kernel/**/*.ts'],
      exclude: ['**/*.spec.ts', '**/ports.ts', '**/*.module.ts', 'src/generated/**'],
    },
  },
});

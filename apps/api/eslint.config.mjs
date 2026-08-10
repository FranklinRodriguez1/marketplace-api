import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'src/generated/**', 'node_modules/**', 'scripts/**'] },
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      // consistent-type-imports is intentionally OFF: NestJS DI relies on emitDecoratorMetadata,
      // which needs the imported class to remain a VALUE import. Forcing `import type` on an
      // injected class erases the runtime reference and breaks dependency resolution.
    },
  },
);

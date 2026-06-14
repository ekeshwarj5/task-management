import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/test/**/*.test.ts', '**/src/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    // Each test file shares the same Postgres connection pool and
    // TRUNCATEs tasks+users in beforeEach. Running files in parallel
    // makes those truncates race across files. Single-fork keeps the
    // shared DB safe without paying for a per-file schema.
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
  },
});

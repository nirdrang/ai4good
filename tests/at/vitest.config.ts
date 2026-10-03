import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['suites/**/*.test.ts', 'harness/**/*.selftest.ts'],
    environment: 'node',
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});

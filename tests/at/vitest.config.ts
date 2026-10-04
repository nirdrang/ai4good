import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { 'npm:@anthropic-ai/sdk@0.115.0': '@anthropic-ai/sdk' } },
  test: {
    include: ['suites/**/*.test.ts', 'harness/**/*.selftest.ts'],
    environment: 'node',
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});

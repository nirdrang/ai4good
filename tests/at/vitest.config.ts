/**
 * The acceptance suites' own vitest configuration.
 *
 * Deliberately separate from the repo-root `vite.config.ts`: that one is Lovable's application
 * build (TanStack Start, Tailwind, the React plugins) and none of it applies to a Node-side
 * acceptance run. The runner passes this file explicitly with `--config`.
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['suites/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});

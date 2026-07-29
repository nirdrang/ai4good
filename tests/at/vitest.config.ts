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
    // `*.test.ts` under suites/ are the acceptance tests; `*.selftest.ts` under harness/ are the
    // harness's own tests, which depend on none of the capability modules. `at:verify` filters to
    // one suite directory, so the selftests never join an acceptance run.
    include: ['suites/**/*.test.ts', 'harness/**/*.selftest.ts'],
    environment: 'node',
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});

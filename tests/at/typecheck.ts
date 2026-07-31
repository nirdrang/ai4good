/**
 * `bun run typecheck` — the standard type-check, over BOTH tsconfigs.
 *
 * WHY THIS IS NOT `tsc -p a && tsc -p b`: `&&` stops at the first failure, so an error in the app
 * config would prevent the acceptance-test check from ever starting. A command that says nothing at
 * all about `tests/at` reads exactly like one that found it clean — which is the same false-green
 * shape this item exists to remove. Both projects are always launched; the exit code is the
 * aggregate.
 *
 * WHY IT LIVES HERE rather than in a repo-level `scripts/`: that is its natural home, but AI4DEV-24's
 * allowed paths are `tests/at/**`, `package.json` and its own item directory, and reaching outside
 * them would breach the item's scope boundary.
 */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/** The repository root, resolved from THIS file, so the result never depends on the caller's cwd. */
const ROOT = fileURLToPath(new URL('../../', import.meta.url));

const PROJECTS = [
  { label: 'app', project: 'tsconfig.json' },
  { label: 'acceptance tests', project: 'tests/at/tsconfig.json' },
] as const;

const failures: string[] = [];

for (const { label, project } of PROJECTS) {
  console.log(`\n=== typecheck: ${label} (${project}) ===`);
  // `process.execPath` is the bun binary already running this file, so the compiler is reached
  // without a PATH lookup and without a shell. Resolving 'typescript' through require.resolve()
  // is NOT equivalent: outside the project it finds a globally cached TypeScript rather than the
  // pinned one, which is precisely the silent version drift this check exists to prevent.
  const result = spawnSync(process.execPath, ['x', 'tsc', '--noEmit', '--pretty', 'false', '-p', project], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  // A compiler that could not be started, and a run killed by a signal (status null), are both
  // failures. Neither may be reported as a pass.
  if (result.error) {
    console.error(`${project}: the compiler could not be started — ${result.error.message}`);
    failures.push(project);
  } else if (result.status !== 0) {
    failures.push(project);
  }
}

if (failures.length) {
  console.error(`\ntypecheck FAILED: ${failures.join(', ')}`);
  process.exit(1);
}

console.log('\ntypecheck OK: both configs clean');

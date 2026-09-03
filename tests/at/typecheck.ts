/**
 * `bun run typecheck` — the standard type-check, over three projects.
 *
 * WHY THIS IS NOT `tsc -p a && tsc -p b`: `&&` stops at the first failure, so an error in the app
 * config would prevent the acceptance-test check from ever starting. A command that says nothing at
 * all about `tests/at` reads exactly like one that found it clean — which is the same false-green
 * shape this item exists to remove. All three projects are always launched; the exit code is the
 * aggregate.
 *
 * WHY IT LIVES HERE rather than in a repo-level `scripts/`: that is its natural home, but AI4DEV-24's
 * allowed paths are `tests/at/**`, `package.json` and its own item directory, and reaching outside
 * them would breach the item's scope boundary.
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The repository root, resolved from THIS file, so the result never depends on the caller's cwd. */
export const ROOT = fileURLToPath(new URL('../../', import.meta.url));

/**
 * The PINNED compiler, by path — never `bun x tsc`, and never `require.resolve('typescript')`.
 *
 * Both of those can silently run a compiler that is not this project's. `bun x` falls back to
 * fetching the package from the registry when it is not installed locally, and `require.resolve`
 * was measured resolving to a globally cached TypeScript 7.0.2 rather than the pinned 5.9.3. A
 * type-check performed by an unknown compiler version is not the check anyone thinks they ran, and
 * silent toolchain drift is exactly what this file exists to stop — so a missing compiler is a loud
 * failure, never a quiet substitution.
 */
export function pinnedTsc(root: string): string {
  const tsc = join(root, 'node_modules', 'typescript', 'bin', 'tsc');
  if (!existsSync(tsc)) {
    throw new Error(`the pinned TypeScript compiler is not installed at ${tsc} — run \`bun install\` first`);
  }
  return tsc;
}

const PROJECTS = [
  { label: 'app', project: 'tsconfig.json' },
  { label: 'acceptance tests', project: 'tests/at/tsconfig.json' },
  { label: 'verify drive', project: '.claude/skills/verify-ai4good/scripts/tsconfig.json' },
] as const;

function main(): number {
  let tsc: string;
  try {
    tsc = pinnedTsc(ROOT);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    return 1;
  }

  const failures: string[] = [];

  for (const { label, project } of PROJECTS) {
    console.log(`\n=== typecheck: ${label} (${project}) ===`);
    const result = spawnSync(process.execPath, [tsc, '--noEmit', '--pretty', 'false', '-p', project], {
      cwd: ROOT,
      stdio: 'inherit',
    });

    // A compiler that could not be started, and a run killed by a signal (status null), are both
    // failures. Neither may be reported as a pass — and each says WHY, because "typecheck failed"
    // with no reason sends the reader hunting for a type error that does not exist.
    if (result.error) {
      console.error(`${project}: the compiler could not be started — ${result.error.message}`);
      failures.push(project);
    } else if (result.signal) {
      console.error(`${project}: the compiler was killed by signal ${result.signal} — it did not finish, so this is not a pass`);
      failures.push(project);
    } else if (result.status !== 0) {
      console.error(`${project}: tsc exited ${result.status}`);
      failures.push(project);
    }
  }

  if (failures.length) {
    console.error(`\ntypecheck FAILED: ${failures.join(', ')}`);
    return 1;
  }

  console.log('\ntypecheck OK: all three projects clean');
  return 0;
}

if (import.meta.main) process.exit(main());

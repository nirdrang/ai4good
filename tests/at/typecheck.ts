import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../../', import.meta.url));

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
  { label: 'fixture shell', project: 'design/astra/tsconfig.json' },
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

  console.log('\ntypecheck OK: all four projects clean');
  return 0;
}

if (import.meta.main) process.exit(main());

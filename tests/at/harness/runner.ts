/**
 * The AT runner — `bun run at:verify req-0NN --tier <loop|integration|drill>`.
 *
 * The command shape is fixed: all 30 decomposition manifests cite it verbatim in their done
 * contracts, and the skills (`/dev-start`'s inner loop, `/dev-end`, `/pm-done`'s gate) call it.
 *
 * It resolves the requirement's suite, runs it under vitest with the tier passed through
 * `AT_TIER`, and reports PER AT ID — green / red / missing — because "3 failed" tells a gate
 * nothing about which acceptance criterion is unmet.
 *
 * Above the `loop` tier the suite needs a real database, and that database is the LOCAL
 * Supabase stack (AI4DEV-6) — not a shared hosted project, because every run wipes and
 * rebuilds it. The runner checks the stack is actually up, rebuilds the database from the
 * migrations, and only then runs the suite; it refuses loudly
 * when it is not: it never falls back to the loop tier's stubs, because a gate that grades a
 * stand-in is worse than a gate that will not run. `--wired` refuses for the same reason —
 * the screen driver does not exist yet.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { acceptanceP0Ids, normalizeRequirement, REPO_ROOT, suiteDir } from './check.ts';

const TIERS = ['loop', 'integration', 'drill'] as const;
type Tier = (typeof TIERS)[number];

const USAGE = 'usage: bun run at:verify req-0NN --tier <loop|integration|drill> [--wired]';

interface Args {
  requirement: string;
  tier: Tier;
  wired: boolean;
}

function parseArgs(argv: string[]): Args {
  let requirement = '';
  let tier = '';
  let wired = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--wired') wired = true;
    else if (arg === '--tier') tier = argv[++i] ?? '';
    else if (arg.startsWith('--tier=')) tier = arg.slice('--tier='.length);
    else if (arg.startsWith('--')) throw new Error(`unknown option "${arg}"`);
    else if (!requirement) requirement = arg;
    else throw new Error(`unexpected argument "${arg}"`);
  }

  if (!requirement) throw new Error('no requirement given');
  if (!tier) throw new Error('--tier is required — there is no default tier, by design');
  if (!TIERS.includes(tier as Tier)) throw new Error(`unknown tier "${tier}" — expected one of ${TIERS.join('|')}`);

  return { requirement: normalizeRequirement(requirement), tier: tier as Tier, wired };
}

/* ------------------------------------------------------------------------ the local db stack */

/** The API port the local stack listens on, read from `supabase/config.toml` — never guessed. */
function localApiPort(): number {
  const file = join(REPO_ROOT, 'supabase', 'config.toml');
  const text = readFileSync(file, 'utf8');
  let section = '';
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    const header = /^\[([^\]]+)\]/.exec(line);
    if (header) section = header[1];
    else if (section === 'api') {
      const port = /^port\s*=\s*(\d+)/.exec(line);
      if (port) return Number(port[1]);
    }
  }
  throw new Error(`no [api] port in ${file}`);
}

/** Reachable = something answers HTTP on the API port. A 401 counts: the stack is up. */
async function stackIsUp(url: string): Promise<boolean> {
  try {
    await fetch(`${url}/rest/v1/`, { signal: AbortSignal.timeout(3000) });
    return true;
  } catch {
    return false;
  }
}

/**
 * The local stack's URL and development keys, straight from the CLI. Those keys are fixed and
 * public — but they are still read from the running stack rather than pasted in here, so that
 * a changed local setup cannot leave the runner authenticating against a stale constant. The
 * tracked `.env` is never consulted: it points at the hosted project, which the tests must
 * never touch.
 */
function localStackEnv(): Record<string, string> {
  const status = spawnSync('bunx', ['supabase', 'status', '-o', 'json'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  if (status.status !== 0) throw new Error(`\`supabase status\` failed: ${(status.stderr || status.stdout || '').trim()}`);

  const parsed = JSON.parse(status.stdout) as Record<string, unknown>;
  const pick = (key: string): string => {
    const value = parsed[key];
    if (typeof value !== 'string' || value === '') throw new Error(`\`supabase status\` reported no ${key}`);
    return value;
  };
  return {
    AT_SUPABASE_URL: pick('API_URL'),
    AT_SUPABASE_ANON_KEY: pick('ANON_KEY'),
    AT_SUPABASE_SERVICE_ROLE_KEY: pick('SERVICE_ROLE_KEY'),
  };
}

/**
 * Rebuild the local database from empty before the suite runs — the same work `bun run db:reset`
 * does, invoked straight at the CLI so a failure is catchable here.
 *
 * WHY EVERY RUN: without it the second run works on the first run's leftover rows, and on a
 * schema that is missing whatever migration landed since — a suite grading a database nobody
 * established. `supabase/migrations/README.md` promises the test database is built by replaying
 * the migrations; this is where that promise is kept.
 */
function resetLocalDatabase(): void {
  const reset = spawnSync('bunx', ['supabase', 'db', 'reset'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    // progress is worth watching (a reset replays every migration); stderr is captured so a
    // failure can be reported in our own words rather than scrolling past.
    stdio: ['ignore', 'inherit', 'pipe'],
  });
  if (reset.status !== 0) throw new Error(`\`supabase db reset\` exited ${reset.status}: ${(reset.stderr || '').trim()}`);
}

/* --------------------------------------------------------------------------- vitest json shape */

interface AssertionResult {
  title?: string;
  fullName?: string;
  status?: string;
  failureMessages?: string[];
}

interface VitestJson {
  testResults?: { assertionResults?: AssertionResult[] }[];
}

function firstLine(text: string | undefined, fallback: string): string {
  const line = (text ?? '').split('\n').map((l) => l.trim()).find((l) => l.length > 0);
  return line ?? fallback;
}

async function main(argv: string[]): Promise<number> {
  let args: Args;
  try {
    args = parseArgs(argv);
  } catch (err) {
    console.error(`at:verify — ${(err as Error).message}`);
    console.error(USAGE);
    return 2;
  }

  const { requirement, tier, wired } = args;

  if (wired) {
    console.error(
      `at:verify req-${requirement} --wired — the screen driver does not exist yet. Wired re-runs ` +
        `drive the ui-marked ids through real screens; that driver is a later AI4DEV-3 slice, so ` +
        `there is nothing to re-run against and a silent fixture run would be a false green.`,
    );
    return 3;
  }

  // Above `loop`, the suite runs against the local Supabase stack: confirm it is up, rebuild its
  // database from the migrations, and collect its coordinates — all before a single test runs.
  // The `loop` tier touches no database and resets nothing.
  const stackEnv: Record<string, string> = {};
  if (tier !== 'loop') {
    let url: string;
    try {
      url = `http://127.0.0.1:${localApiPort()}`;
    } catch (err) {
      console.error(`at:verify req-${requirement} --tier ${tier} — ${(err as Error).message}`);
      return 2;
    }

    if (!(await stackIsUp(url))) {
      console.error(
        `at:verify req-${requirement} --tier ${tier} — the local Supabase stack is not answering at ` +
          `${url} (the [api] port in supabase/config.toml). The ${tier} tier needs a real database, ` +
          `and this run will NOT fall back to the loop tier's stubs — a gate that grades a stand-in ` +
          `is worse than a gate that refuses to run.\n` +
          `Two things cause this:\n` +
          `  1. Docker Desktop is not installed, or is installed but not running — the local stack is ` +
          `a set of Docker containers and cannot start without it.\n` +
          `  2. Docker is fine but the stack was never started — run \`bun run db:start\` (and ` +
          `\`bun run db:reset\` to rebuild the database from supabase/migrations).`,
      );
      return 3;
    }

    // The database's state must be ESTABLISHED, not inherited: rebuild it from the migrations
    // before a single test runs. A gate grading an unknown database is as bad as one grading a stub.
    try {
      resetLocalDatabase();
    } catch (err) {
      console.error(
        `at:verify req-${requirement} --tier ${tier} — the local database could not be reset: ` +
          `${(err as Error).message}\n` +
          `No tests were run. The ${tier} tier rebuilds the database from supabase/migrations on ` +
          `every run, so that a suite never grades leftover rows or a schema missing a migration; ` +
          `if that rebuild fails, the state under test is unknown and the run stops here.`,
      );
      return 3;
    }

    try {
      Object.assign(stackEnv, localStackEnv());
    } catch (err) {
      console.error(
        `at:verify req-${requirement} --tier ${tier} — the stack answered at ${url} but its ` +
          `coordinates could not be read: ${(err as Error).message}. The development keys are read ` +
          `from the running stack, never hard-coded and never taken from .env, so the run stops here.`,
      );
      return 3;
    }
  }

  const dir = suiteDir(requirement);
  if (!existsSync(dir)) {
    console.error(`at:verify req-${requirement} — no suite at ${dir}`);
    return 2;
  }

  let expected: string[];
  try {
    expected = acceptanceP0Ids(requirement);
  } catch (err) {
    console.error(`at:verify req-${requirement} — ${(err as Error).message}`);
    return 2;
  }

  const atRoot = join(REPO_ROOT, 'tests', 'at');
  const outputFile = join(tmpdir(), `at-verify-req-${requirement}-${process.pid}.json`);
  const vitest = join(REPO_ROOT, 'node_modules', 'vitest', 'vitest.mjs');

  const run = spawnSync(
    process.execPath,
    [
      vitest,
      'run',
      '--root',
      atRoot,
      '--config',
      join(atRoot, 'vitest.config.ts'),
      '--reporter=json',
      `--outputFile=${outputFile}`,
      `suites/req-${requirement}/`,
    ],
    { env: { ...process.env, ...stackEnv, AT_TIER: tier }, stdio: ['ignore', 'inherit', 'inherit'] },
  );

  if (!existsSync(outputFile)) {
    console.error(`at:verify req-${requirement} — vitest produced no report (exit ${run.status})`);
    return 4;
  }

  let report: VitestJson;
  try {
    report = JSON.parse(readFileSync(outputFile, 'utf8')) as VitestJson;
  } catch (err) {
    console.error(`at:verify req-${requirement} — unreadable vitest report: ${(err as Error).message}`);
    return 4;
  } finally {
    rmSync(outputFile, { force: true });
  }

  const assertions = (report.testResults ?? []).flatMap((r) => r.assertionResults ?? []);
  const byId = new Map<string, AssertionResult>();
  for (const a of assertions) {
    const id = /^(AT-[\d.]+[a-z]?)\s+—/.exec(a.title ?? a.fullName ?? '')?.[1];
    if (id) byId.set(id, a);
  }

  const rows: { id: string; status: 'green' | 'red' | 'missing'; detail: string }[] = [];
  for (const id of expected) {
    const a = byId.get(id);
    if (!a) {
      rows.push({ id, status: 'missing', detail: 'no executable test registers this id' });
    } else if (a.status === 'passed') {
      rows.push({ id, status: 'green', detail: a.title?.split('—').slice(1).join('—').trim() ?? '' });
    } else {
      rows.push({ id, status: 'red', detail: firstLine(a.failureMessages?.join('\n'), `status "${a.status}"`) });
    }
  }
  const unexpected = [...byId.keys()].filter((id) => !expected.includes(id));

  console.log('');
  console.log(`at:verify req-${requirement} --tier ${tier}`);
  for (const row of rows) console.log(`  ${row.id.padEnd(12)} ${row.status.padEnd(8)} ${row.detail}`);
  for (const id of unexpected) console.log(`  ${id.padEnd(12)} ${'extra'.padEnd(8)} registered but not a P0 of this requirement`);

  const green = rows.filter((r) => r.status === 'green').length;
  const red = rows.filter((r) => r.status === 'red').length;
  const missing = rows.filter((r) => r.status === 'missing').length;
  console.log(`  ${rows.length} P0: ${green} green, ${red} red, ${missing} missing${unexpected.length ? `, ${unexpected.length} extra` : ''}`);

  return green === rows.length && unexpected.length === 0 ? 0 : 1;
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)));

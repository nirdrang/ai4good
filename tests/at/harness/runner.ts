/**
 * The AT runner — `bun run at:verify req-0NN --tier <loop|integration|drill>`.
 *
 * The command shape is fixed: all 30 decomposition manifests cite it verbatim in their done
 * contracts, and the skills (`/dev-start`'s inner loop, `/dev-end`, `/pm-done`'s gate) call it.
 * It resolves the requirement's suite, runs it under vitest with the tier passed through
 * `AT_TIER`, and reports PER AT ID — green / red / missing — because "3 failed" tells a gate
 * nothing about which acceptance criterion is unmet.
 *
 * Above the `loop` tier the suite needs a real database, and that database is the LOCAL
 * Supabase stack (AI4DEV-6) — not a shared hosted project, because every run wipes and rebuilds
 * it. That makes the sequence below load-bearing, and it is deliberately paranoid:
 *
 *   1. take a machine-wide lock keyed by project id + api port, so two runs (or two checkouts
 *      sharing a project id, which share Docker identity and ports) cannot reset under each other;
 *   2. read the stack's own report of itself and PROVE it is local — loopback host, the ports
 *      configured in `supabase/config.toml`, and keys issued by the local development issuer —
 *      BEFORE anything destructive happens;
 *   3. wait for real readiness: the database answers a query AND a request through the API
 *      gateway succeeds, which takes Kong, PostgREST and Postgres all being up;
 *   4. only then reset the database, then re-prove readiness;
 *   5. run the suite with an ALLOWLISTED environment — the child gets the platform minimum plus
 *      the validated local coordinates, and nothing else, so a secret sitting in a developer's
 *      `.env.local` can never reach a test (and a test can never reach the hosted project).
 *
 * Any failure in that sequence is an INFRASTRUCTURE failure: non-zero exit, no tests run, a
 * message naming what failed. The runner never falls back to the loop tier's stubs and never
 * runs against a database whose state it could not establish — a gate grading a stand-in, or an
 * unknown database, is worse than a gate that refuses to run. Secrets are never printed: raw CLI
 * output is redacted, and validation reports which check failed, never the value that failed it.
 */

import { spawn, spawnSync } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, writeSync } from 'node:fs';
import { hostname, tmpdir } from 'node:os';
import { join } from 'node:path';

import { acceptanceP0Ids, normalizeRequirement, REPO_ROOT, suiteDir } from './check.ts';

const TIERS = ['loop', 'integration', 'drill'] as const;
type Tier = (typeof TIERS)[number];

const USAGE = 'usage: bun run at:verify req-0NN --tier <loop|integration|drill> [--wired]';

/** How long the stack gets to become genuinely ready before the run is called off. */
const READY_TIMEOUT_MS = Number(process.env.AT_READY_TIMEOUT_MS ?? 120_000);
/** How long `supabase db reset` gets before it is assumed wedged and its process tree killed. */
const RESET_TIMEOUT_MS = Number(process.env.AT_RESET_TIMEOUT_MS ?? 600_000);
/** A lock older than this, or held by a process that is gone, is taken over. */
const LOCK_STALE_MINUTES = Number(process.env.AT_LOCK_STALE_MINUTES ?? 60);

/** `supabase status` reports these two as stopped because config.toml disables them. Benign. */
const DISABLED_SERVICES = /^supabase_(imgproxy|pooler)_/;

/** The pinned CLI, invoked directly — no shell, no PATH lookup, no globally installed version. */
const SUPABASE_ENTRY = join(REPO_ROOT, 'node_modules', 'supabase', 'dist', 'supabase.js');

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

/* --------------------------------------------------------------- the child environment (leak) */

/**
 * The ONLY variables a child process inherits. Everything else is dropped.
 *
 * WHY AN ALLOWLIST: bun auto-loads `.env` and `.env.local` into this process, and `.env.example`
 * tells developers to put their real secrets in `.env.local`. Spreading `process.env` into the
 * test process would hand every one of those to every test — and a test reading a conventional
 * name like `SUPABASE_SERVICE_ROLE_KEY` would then be pointed at the HOSTED project, which the
 * acceptance suites must never touch. The child gets the platform minimum plus exactly the
 * values this runner validated. Children are additionally launched with bun's `--no-env-file`,
 * so a child does not re-read the env files for itself.
 */
const ENV_ALLOWLIST = [
  // process/platform basics
  'PATH',
  'PATHEXT',
  'COMSPEC',
  'SystemRoot',
  'SystemDrive',
  'windir',
  'OS',
  'NUMBER_OF_PROCESSORS',
  'PROCESSOR_ARCHITECTURE',
  'PROCESSOR_IDENTIFIER',
  'USERNAME',
  'LANG',
  'LC_ALL',
  'TZ',
  // temp + home, which bun, vitest and the Supabase CLI all need in order to write caches
  'TEMP',
  'TMP',
  'TMPDIR',
  'HOME',
  'HOMEDRIVE',
  'HOMEPATH',
  'USERPROFILE',
  'APPDATA',
  'LOCALAPPDATA',
  'PROGRAMDATA',
  'PROGRAMFILES',
  'PROGRAMFILES(X86)',
  'PROGRAMW6432',
  'XDG_CACHE_HOME',
  'BUN_INSTALL',
  // how the Supabase CLI finds the container runtime (never a credential)
  'DOCKER_HOST',
  'DOCKER_CONTEXT',
  'DOCKER_CONFIG',
  'DOCKER_CERT_PATH',
];

/** Windows environment names are case-insensitive, so match that way and keep the parent's casing. */
export function childEnv(extra: Record<string, string> = {}): Record<string, string> {
  const wanted = new Set(ENV_ALLOWLIST.map((name) => name.toLowerCase()));
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && wanted.has(key.toLowerCase())) env[key] = value;
  }
  return { ...env, ...extra };
}

/**
 * The bun binary. Children are launched under bun deliberately — `--no-env-file` is a bun flag,
 * and it is what stops a child from re-reading `.env`/`.env.local` for itself. Normally this
 * process IS bun, so its own path is the answer; the PATH lookup only matters when something
 * else (a test runner's node worker, say) is asking.
 */
export function bunExecutable(): string {
  if (/[\\/]bun(\.exe)?$/i.test(process.execPath)) return process.execPath;
  const lookup = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['bun'], {
    encoding: 'utf8',
    env: childEnv(),
  });
  const found = (lookup.stdout ?? '').split('\n').map((line) => line.trim()).find(Boolean);
  if (!found) throw new Error('bun was not found on PATH — the harness runs its children under bun');
  return found;
}

/* --------------------------------------------------------------------------------- redaction */

/** Strip anything key-shaped out of text that is about to be printed. */
export function redact(text: string): string {
  return String(text ?? '')
    .replace(/eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}/g, '<redacted-jwt>')
    .replace(/\bsb_[a-z]+_[A-Za-z0-9_-]{8,}/g, '<redacted-key>')
    .replace(/(postgres(?:ql)?:\/\/)[^@\s/]+@/gi, '$1<redacted>@')
    .replace(/[A-Za-z0-9_-]{40,}/g, '<redacted-token>');
}

/** First non-empty line, redacted and length-capped — enough to diagnose, not enough to leak. */
function diagnostic(text: string | undefined, limit = 400): string {
  const line = redact(text ?? '').split('\n').map((l) => l.trim()).find((l) => l.length > 0) ?? '';
  return line.length > limit ? `${line.slice(0, limit)}…` : line;
}

/* ------------------------------------------------------------------------ config.toml reading */

export interface LocalConfig {
  projectId: string;
  apiPort: number;
  dbPort: number;
}

/** Ports and project id come from `supabase/config.toml` — never guessed, never hard-coded. */
function readLocalConfig(): LocalConfig {
  const file = join(REPO_ROOT, 'supabase', 'config.toml');
  const text = readFileSync(file, 'utf8');
  let section = '';
  let projectId = '';
  let apiPort = 0;
  let dbPort = 0;

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    const header = /^\[([^\]]+)\]/.exec(line);
    if (header) {
      section = header[1];
      continue;
    }
    const port = /^port\s*=\s*(\d+)/.exec(line);
    if (section === '' && /^project_id\s*=/.test(line)) projectId = /"([^"]+)"/.exec(line)?.[1] ?? '';
    else if (section === 'api' && port && !apiPort) apiPort = Number(port[1]);
    else if (section === 'db' && port && !dbPort) dbPort = Number(port[1]);
  }

  const missing = [projectId ? '' : 'project_id', apiPort ? '' : '[api] port', dbPort ? '' : '[db] port'].filter(Boolean);
  if (missing.length) throw new Error(`${file} is missing ${missing.join(' and ')}`);
  return { projectId, apiPort, dbPort };
}

/* ---------------------------------------------------------------------- the machine-wide lock */

interface StackLock {
  file: string;
  release(): void;
}

function lockDir(): string {
  const base = process.env.LOCALAPPDATA ?? process.env.XDG_CACHE_HOME ?? tmpdir();
  const dir = join(base, 'ai4good-build', 'at-locks');
  mkdirSync(dir, { recursive: true });
  return dir;
}

function processIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    // EPERM means it exists but belongs to someone else; ESRCH means it is gone.
    return (err as NodeJS.ErrnoException).code === 'EPERM';
  }
}

/**
 * Serialize every destructive run against one stack. The key is project id + api port because
 * that pair IS the stack's identity: a second checkout carrying the same `project_id` shares the
 * same Docker containers and the same ports, so its `at:verify` would reset this run's database
 * out from under it. Mirrors `Acquire-WorkLock` in loop/work/work-lib.ps1 — exclusive create,
 * holder recorded, stale takeover.
 */
function acquireStackLock(config: LocalConfig, requirement: string): StackLock {
  const file = join(lockDir(), `at-verify-${config.projectId}-${config.apiPort}.lock`);

  const claim = (): StackLock | null => {
    let fd: number;
    try {
      fd = openSync(file, 'wx');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'EEXIST') return null;
      throw err;
    }
    try {
      writeSync(fd, JSON.stringify({ pid: process.pid, host: hostname(), requirement, startedAt: new Date().toISOString() }));
    } finally {
      closeSync(fd);
    }
    return {
      file,
      release: () => {
        try {
          const held = JSON.parse(readFileSync(file, 'utf8')) as { pid?: number };
          if (held.pid === process.pid) rmSync(file, { force: true });
        } catch {
          // already removed, or unreadable — nothing of ours left to release
        }
      },
    };
  };

  const first = claim();
  if (first) return first;

  // Held. Take it over only if the holder is provably gone, or old enough to be a leftover.
  let holder: { pid?: number; host?: string; requirement?: string; startedAt?: string } = {};
  try {
    holder = JSON.parse(readFileSync(file, 'utf8')) as typeof holder;
  } catch {
    holder = {};
  }
  const startedAt = holder.startedAt ? Date.parse(holder.startedAt) : NaN;
  const ageMinutes = Number.isFinite(startedAt) ? (Date.now() - startedAt) / 60_000 : Infinity;
  const alive = typeof holder.pid === 'number' && processIsAlive(holder.pid);

  if (alive && ageMinutes < LOCK_STALE_MINUTES) {
    throw new Error(
      `another at:verify run holds this stack (pid ${holder.pid} on ${holder.host ?? 'this machine'}, ` +
        `requirement ${holder.requirement ?? 'unknown'}, started ${holder.startedAt ?? 'unknown'}). ` +
        `Two runs against one stack destroy each other: the second would reset the first's database ` +
        `mid-run. Wait for it to finish. If that process is definitely gone, delete ${file}.`,
    );
  }

  rmSync(file, { force: true });
  const takeover = claim();
  if (!takeover) throw new Error(`could not take over the stale lock at ${file} — another run claimed it first`);
  console.log(
    `at:verify — took over a stale stack lock (holder pid ${holder.pid ?? 'unknown'} ` +
      `${alive ? `is older than ${LOCK_STALE_MINUTES} minutes` : 'is no longer running'})`,
  );
  return takeover;
}

/* -------------------------------------------------------------------- the stack's own report */

export interface StackStatus {
  apiUrl: string;
  dbUrl: string;
  anonKey: string;
  serviceRoleKey: string;
}

const REQUIRED_STATUS_FIELDS: Record<keyof StackStatus, string> = {
  apiUrl: 'API_URL',
  dbUrl: 'DB_URL',
  anonKey: 'ANON_KEY',
  serviceRoleKey: 'SERVICE_ROLE_KEY',
};

function supabaseArgs(...args: string[]): string[] {
  if (!existsSync(SUPABASE_ENTRY)) throw new Error(`the Supabase CLI is not installed at ${SUPABASE_ENTRY} — run \`bun install\``);
  return ['--no-env-file', SUPABASE_ENTRY, ...args];
}

/**
 * Ask the running stack to describe itself. The raw output is NEVER printed: it contains every
 * key the stack issues. Only field names travel into error messages.
 */
function readStackStatus(): StackStatus {
  const res = spawnSync(bunExecutable(), supabaseArgs('status', '-o', 'json'), {
    cwd: REPO_ROOT,
    env: childEnv(),
    encoding: 'utf8',
  });

  if (res.error) {
    const err = res.error as NodeJS.ErrnoException;
    throw new Error(`could not launch the Supabase CLI (${err.code ?? 'spawn error'}): ${diagnostic(err.message)}`);
  }

  const stdout = res.stdout ?? '';
  const open = stdout.indexOf('{');
  const close = stdout.lastIndexOf('}');
  if (open < 0 || close <= open) {
    throw new Error(
      `\`supabase status\` reported no JSON (exit ${res.status}${res.signal ? `, signal ${res.signal}` : ''}): ` +
        `${diagnostic(res.stderr) || '(no error output)'}`,
    );
  }

  // The CLI exits non-zero merely because config.toml disables imgproxy and the pooler. That is
  // not a failure; anything ELSE reported stopped is.
  const notice = `${stdout.slice(0, open)}\n${res.stderr ?? ''}`;
  const stopped = /Stopped services:\s*\[([^\]]*)\]/.exec(notice)?.[1] ?? '';
  const unexpectedStopped = stopped.split(/\s+/).filter((name) => name && !DISABLED_SERVICES.test(name));
  if (unexpectedStopped.length) {
    throw new Error(`the stack reports stopped services: ${unexpectedStopped.join(', ')} — start them before running the suite`);
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(stdout.slice(open, close + 1)) as Record<string, unknown>;
  } catch (err) {
    throw new Error(`\`supabase status\` produced unparseable JSON: ${(err as Error).message}`);
  }

  const status: Partial<StackStatus> = {};
  const missing: string[] = [];
  for (const [field, key] of Object.entries(REQUIRED_STATUS_FIELDS) as [keyof StackStatus, string][]) {
    const value = parsed[key];
    if (typeof value !== 'string' || value.trim() === '') missing.push(key);
    else status[field] = value;
  }
  if (missing.length) throw new Error(`\`supabase status\` reported no ${missing.join(', no ')}`);
  return status as StackStatus;
}

/* --------------------------------------------------------- proving the stack is the LOCAL one */

const LOOPBACK = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

function decodeJwtClaims(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Refuse to touch anything that is not demonstrably the local development stack. Returns the
 * names of the checks that failed — never the values, which are keys and connection strings.
 */
export function localStackProblems(status: StackStatus, config: LocalConfig): string[] {
  const problems: string[] = [];

  const checkUrl = (label: string, raw: string, expectedPort: number) => {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      problems.push(`${label} is not a URL`);
      return;
    }
    if (!LOOPBACK.has(url.hostname)) problems.push(`${label} does not point at the loopback address`);
    if (url.port !== String(expectedPort)) problems.push(`${label} port is not the ${expectedPort} configured in supabase/config.toml`);
  };

  checkUrl('API_URL', status.apiUrl, config.apiPort);
  checkUrl('DB_URL', status.dbUrl, config.dbPort);

  const checkKey = (label: string, token: string, expectedRole: string) => {
    const claims = decodeJwtClaims(token);
    if (!claims) {
      problems.push(`${label} is not a decodable local development JWT`);
      return;
    }
    if (claims.iss !== 'supabase-demo') problems.push(`${label} was not issued by the local development issuer`);
    if (claims.role !== expectedRole) problems.push(`${label} does not carry the ${expectedRole} role`);
    if (typeof claims.ref === 'string') problems.push(`${label} carries a hosted project reference`);
  };

  checkKey('ANON_KEY', status.anonKey, 'anon');
  checkKey('SERVICE_ROLE_KEY', status.serviceRoleKey, 'service_role');

  return problems;
}

/* --------------------------------------------------------------------------------- readiness */

interface BunSqlClient {
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown>;
  close(): Promise<void>;
}
type BunSqlCtor = new (url: string) => BunSqlClient;

/** Postgres itself answers a query — not "the port is open", which a half-started stack satisfies. */
async function databaseAnswers(dbUrl: string): Promise<string | null> {
  const SQL = (globalThis as { Bun?: { SQL?: BunSqlCtor } }).Bun?.SQL;
  if (!SQL) return 'this runtime has no SQL client (expected bun)';
  let sql: BunSqlClient | null = null;
  try {
    sql = new SQL(dbUrl);
    await sql`select 1`;
    return null;
  } catch (err) {
    return diagnostic((err as Error).message);
  } finally {
    await sql?.close().catch(() => undefined);
  }
}

/** One request that only succeeds if Kong routed it, PostgREST served it, and Postgres answered. */
async function gatewayAnswers(status: StackStatus): Promise<string | null> {
  try {
    const res = await fetch(`${status.apiUrl.replace(/\/$/, '')}/rest/v1/`, {
      headers: { apikey: status.anonKey, Authorization: `Bearer ${status.anonKey}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return `the API gateway answered ${res.status}`;
    const type = res.headers.get('content-type') ?? '';
    if (!type.includes('json')) return `the API gateway answered 200 but served ${type || 'no content type'}`;
    return null;
  } catch (err) {
    return diagnostic((err as Error).message);
  }
}

/**
 * Wait until the stack is genuinely usable, or give up. "Something answered on the port" is not
 * readiness: a half-started stack answers 502/503, and a run launched against it fails in ways
 * that look like test failures instead of infrastructure failures.
 */
async function waitForReady(status: StackStatus, phase: string): Promise<void> {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  let lastProblem = 'not attempted';
  let delay = 250;

  while (Date.now() < deadline) {
    const db = await databaseAnswers(status.dbUrl);
    if (db === null) {
      const gateway = await gatewayAnswers(status);
      if (gateway === null) return;
      lastProblem = gateway;
    } else {
      lastProblem = `the database did not answer: ${db}`;
    }
    await new Promise((resolve) => setTimeout(resolve, delay));
    delay = Math.min(delay * 2, 2000);
  }

  throw new Error(
    `the stack was still not ready ${phase} after ${Math.round(READY_TIMEOUT_MS / 1000)}s — last problem: ${lastProblem}`,
  );
}

/* ------------------------------------------------------------------------------------- reset */

/**
 * Rebuild the local database from `supabase/migrations` — the same work `bun run db:reset` does,
 * invoked at the pinned CLI so failures are catchable and bounded.
 *
 * WHY EVERY RUN: without it the second run works on the first run's leftover rows, and on a
 * schema missing whatever migration landed since — a suite grading a database nobody established.
 */
async function resetLocalDatabase(): Promise<void> {
  const child = spawn(bunExecutable(), supabaseArgs('db', 'reset', '--local'), {
    cwd: REPO_ROOT,
    env: childEnv(),
    // progress is worth watching (a reset replays every migration); stderr is captured so a
    // failure can be reported in our own words rather than scrolling past.
    stdio: ['ignore', 'inherit', 'pipe'],
  });

  let stderr = '';
  child.stderr?.on('data', (chunk: Buffer) => {
    stderr = (stderr + chunk.toString('utf8')).slice(-8000);
  });

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    // Kill the TREE: the CLI shells out to the container runtime, and killing only the parent
    // leaves a migration running against the database this run is about to test.
    if (child.pid && process.platform === 'win32') spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    else child.kill('SIGKILL');
  }, RESET_TIMEOUT_MS);

  try {
    await new Promise<void>((resolve, reject) => {
      child.once('error', (err) => {
        const e = err as NodeJS.ErrnoException;
        reject(new Error(`the reset process could not be launched (${e.code ?? 'spawn error'}): ${diagnostic(e.message)}`));
      });
      child.once('close', (code, signal) => {
        if (timedOut) {
          reject(new Error(`the reset did not finish within ${Math.round(RESET_TIMEOUT_MS / 1000)}s and its process tree was killed`));
        } else if (code === 0) {
          resolve();
        } else {
          const how = code === null ? `was killed by signal ${signal}` : `exited ${code}`;
          reject(new Error(`\`supabase db reset\` ${how}: ${diagnostic(stderr) || '(no error output)'}`));
        }
      });
    });
  } finally {
    clearTimeout(timer);
  }
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

export interface IdRow {
  id: string;
  status: 'green' | 'red' | 'missing';
  detail: string;
}

export interface ProcessOutcome {
  error?: unknown;
  status: number | null;
  signal?: NodeJS.Signals | null;
}

/**
 * The verdict is NOT "did every row go green". A vitest process can report twelve green
 * assertions and still exit non-zero — a global teardown that threw, an unhandled rejection, a
 * worker that died after its last test. Treating that as success is exactly the false green this
 * harness exists to prevent, so the process's own exit is part of the verdict, and a discrepancy
 * between green rows and a non-zero exit is called out rather than smoothed over.
 */
export function runVerdict(rows: IdRow[], unexpected: string[], run: ProcessOutcome): string[] {
  const problems: string[] = [];
  const red = rows.filter((r) => r.status === 'red').length;
  const missing = rows.filter((r) => r.status === 'missing').length;

  if (red) problems.push(`${red} id${red === 1 ? '' : 's'} red`);
  if (missing) problems.push(`${missing} id${missing === 1 ? '' : 's'} missing`);
  if (unexpected.length) {
    problems.push(`${unexpected.length} registered id${unexpected.length === 1 ? '' : 's'} not P0 of this requirement`);
  }

  if (run.error) {
    const err = run.error as NodeJS.ErrnoException;
    problems.push(`the test process could not be launched (${err.code ?? 'spawn error'}): ${diagnostic(err.message)}`);
  } else if (run.status !== 0) {
    const how = run.status === null ? `was killed by signal ${run.signal}` : `exited ${run.status}`;
    problems.push(
      red || missing
        ? `the test process ${how}`
        : `the test process ${how} even though every id reported green — something failed outside the ` +
            `assertions (a teardown, an unhandled rejection, a worker that died). This run is a FAILURE.`,
    );
  }

  return problems;
}

function firstLine(text: string | undefined, fallback: string): string {
  const line = redact(text ?? '').split('\n').map((l) => l.trim()).find((l) => l.length > 0);
  return line ?? fallback;
}

/* --------------------------------------------------------------------------------------- main */

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

  const infra = (message: string): number => {
    console.error(`at:verify req-${requirement} --tier ${tier} — INFRASTRUCTURE: ${message}`);
    console.error('No tests were run. This is an infrastructure failure, not a test failure.');
    return 3;
  };

  const stackHelp =
    `Two things cause this:\n` +
    `  1. Docker Desktop is not installed, or is installed but not running, or its CLI is not on ` +
    `PATH — the local stack is a set of Docker containers and cannot run without it.\n` +
    `  2. Docker is fine but the stack was never started — run \`bun run db:start\`.`;

  // The `loop` tier touches no database: no lock, no stack, no reset.
  const stackEnv: Record<string, string> = {};
  let lock: StackLock | null = null;
  const reportDir = mkdtempSync(join(tmpdir(), 'at-verify-'));
  const cleanup = () => {
    rmSync(reportDir, { recursive: true, force: true });
    lock?.release();
    lock = null;
  };
  const onSignal = () => {
    cleanup();
    process.exit(130);
  };
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);

  try {
    if (tier !== 'loop') {
      let config: LocalConfig;
      try {
        config = readLocalConfig();
      } catch (err) {
        return infra((err as Error).message);
      }

      // (1) Lock FIRST — before anything reads, resets or runs against the stack.
      try {
        lock = acquireStackLock(config, `req-${requirement}`);
      } catch (err) {
        return infra((err as Error).message);
      }

      // (2) Read the stack's report of itself and prove it is local, BEFORE anything destructive.
      let status: StackStatus;
      try {
        status = readStackStatus();
      } catch (err) {
        return infra(`${(err as Error).message}\n${stackHelp}`);
      }

      const problems = localStackProblems(status, config);
      if (problems.length) {
        return infra(
          `the stack that answered is not provably the local development stack, so nothing was reset ` +
            `and nothing was run. Failed checks: ${problems.join('; ')}. (Values are deliberately not printed.)`,
        );
      }

      // (3) Readiness before the destructive step.
      try {
        await waitForReady(status, 'before the reset');
      } catch (err) {
        return infra(`${(err as Error).message}\n${stackHelp}`);
      }

      // (4) Reset, then prove readiness again — a reset takes the database down and back up.
      try {
        await resetLocalDatabase();
      } catch (err) {
        return infra(
          `the local database could not be reset: ${(err as Error).message}\n` +
            `The ${tier} tier rebuilds the database from supabase/migrations on every run, so that a ` +
            `suite never grades leftover rows or a schema missing a migration; if that rebuild fails, ` +
            `the state under test is unknown and the run stops here.`,
        );
      }

      try {
        await waitForReady(status, 'after the reset');
      } catch (err) {
        return infra((err as Error).message);
      }

      stackEnv.AT_SUPABASE_URL = status.apiUrl;
      stackEnv.AT_SUPABASE_DB_URL = status.dbUrl;
      stackEnv.AT_SUPABASE_ANON_KEY = status.anonKey;
      stackEnv.AT_SUPABASE_SERVICE_ROLE_KEY = status.serviceRoleKey;
    }

    const atRoot = join(REPO_ROOT, 'tests', 'at');
    const outputFile = join(reportDir, 'vitest-report.json');

    const run = spawnSync(
      bunExecutable(),
      [
        '--no-env-file',
        join(REPO_ROOT, 'node_modules', 'vitest', 'vitest.mjs'),
        'run',
        '--root',
        atRoot,
        '--config',
        join(atRoot, 'vitest.config.ts'),
        '--reporter=json',
        `--outputFile=${outputFile}`,
        `suites/req-${requirement}/`,
      ],
      { cwd: REPO_ROOT, env: childEnv({ ...stackEnv, AT_TIER: tier }), stdio: ['ignore', 'inherit', 'inherit'] },
    );

    if (!existsSync(outputFile)) {
      console.error(
        `at:verify req-${requirement} — vitest produced no report ` +
          `(exit ${run.status}${run.signal ? `, signal ${run.signal}` : ''}` +
          `${run.error ? `, ${diagnostic((run.error as Error).message)}` : ''})`,
      );
      return 4;
    }

    let report: VitestJson;
    try {
      report = JSON.parse(readFileSync(outputFile, 'utf8')) as VitestJson;
    } catch (err) {
      console.error(`at:verify req-${requirement} — unreadable vitest report: ${(err as Error).message}`);
      return 4;
    }

    const assertions = (report.testResults ?? []).flatMap((r) => r.assertionResults ?? []);
    const byId = new Map<string, AssertionResult>();
    for (const a of assertions) {
      const id = /^(AT-[\d.]+[a-z]?)\s+—/.exec(a.title ?? a.fullName ?? '')?.[1];
      if (id) byId.set(id, a);
    }

    const rows: IdRow[] = [];
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

    const verdict = runVerdict(rows, unexpected, run as ProcessOutcome);
    if (verdict.length === 0) return 0;
    for (const problem of verdict) console.log(`  FAILURE: ${problem}`);
    return 1;
  } finally {
    process.off('SIGINT', onSignal);
    process.off('SIGTERM', onSignal);
    cleanup();
  }
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)));

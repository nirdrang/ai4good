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
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readdirSync, readFileSync, rmSync, writeSync } from 'node:fs';
import { hostname, tmpdir } from 'node:os';
import { join } from 'node:path';

import { INSTALL_ROOT, inspectBijection, normalizeRequirement, REPO_ROOT, suiteDir } from './check.ts';

const TIERS = ['loop', 'integration', 'drill'] as const;
type Tier = (typeof TIERS)[number];

const USAGE = 'usage: bun run at:verify req-0NN --tier <loop|integration|drill> [--wired]';

/** How long the stack gets to become genuinely ready before the run is called off. */
const READY_TIMEOUT_MS = Number(process.env.AT_READY_TIMEOUT_MS ?? 120_000);
/** How long `supabase db reset` gets before it is assumed wedged and its process tree killed. */
const RESET_TIMEOUT_MS = Number(process.env.AT_RESET_TIMEOUT_MS ?? 600_000);
/** A lock older than this, or held by a process that is gone, is taken over. */
const LOCK_STALE_MINUTES = Number(process.env.AT_LOCK_STALE_MINUTES ?? 60);
/** The takeover gate is held for milliseconds; anything this old was abandoned by a dead process. */
const GATE_STALE_MINUTES = Number(process.env.AT_LOCK_GATE_STALE_MINUTES ?? 2);

/** `supabase status` reports these two as stopped because config.toml disables them. Benign. */
const DISABLED_SERVICES = /^supabase_(imgproxy|pooler)_/;

/**
 * The pinned CLI, invoked directly — no shell, no PATH lookup, no globally installed version.
 * Resolved from the INSTALL root, never the (overridable) data root: the pinned versions live in
 * the real checkout's `node_modules` wherever the acceptance files being read happen to be.
 */
const SUPABASE_ENTRY = join(INSTALL_ROOT, 'node_modules', 'supabase', 'dist', 'supabase.js');

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
  const found = (lookup.stdout ?? '')
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean);
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
  const line =
    redact(text ?? '')
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.length > 0) ?? '';
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

/** The lock path for one stack. Machine-wide, and deliberately carries no folder component. */
export function stackLockPath(config: LocalConfig): string {
  return join(lockDir(), `at-verify-${config.projectId}-${config.apiPort}.lock`);
}

interface Holder {
  pid?: number;
  host?: string;
  requirement?: string;
  startedAt?: string;
}

/** Live = the recorded process still exists AND the lock is young enough to be a real run. */
function holderIsLive(holder: Holder): boolean {
  const startedAt = holder.startedAt ? Date.parse(holder.startedAt) : NaN;
  const ageMinutes = Number.isFinite(startedAt) ? (Date.now() - startedAt) / 60_000 : Infinity;
  return typeof holder.pid === 'number' && processIsAlive(holder.pid) && ageMinutes < LOCK_STALE_MINUTES;
}

function heldByAnotherRun(holder: Holder, file: string): Error {
  return new Error(
    `another at:verify run holds this stack (pid ${holder.pid} on ${holder.host ?? 'this machine'}, ` +
      `requirement ${holder.requirement ?? 'unknown'}, started ${holder.startedAt ?? 'unknown'}). ` +
      `Two runs against one stack destroy each other: the second would reset the first's database ` +
      `mid-run. Wait for it to finish. If that process is definitely gone, delete ${file}.`,
  );
}

/**
 * A gate left behind by a process that died mid-takeover. The section lasts milliseconds, so
 * anything this old is certainly abandoned; removing one wrongly costs at most two processes in
 * the section, which is the behaviour we had before the gate existed.
 */
function clearStrandedGate(gate: string): void {
  try {
    const held = JSON.parse(readFileSync(gate, 'utf8')) as { pid?: number; at?: string };
    const at = held.at ? Date.parse(held.at) : NaN;
    const ageMinutes = Number.isFinite(at) ? (Date.now() - at) / 60_000 : Infinity;
    const alive = typeof held.pid === 'number' && processIsAlive(held.pid);
    if (!alive || ageMinutes > GATE_STALE_MINUTES) rmSync(gate, { force: true });
  } catch {
    // unreadable or already gone — the next pass finds out
  }
}

/**
 * Serialize every destructive run against one stack. The key is project id + api port because
 * that pair IS the stack's identity: a second checkout carrying the same `project_id` shares the
 * same Docker containers and the same ports, so its `at:verify` would reset this run's database
 * out from under it. Mirrors `Acquire-WorkLock` in loop/work/work-lib.ps1 — exclusive create,
 * holder recorded, stale takeover.
 *
 * TAKEOVER IS THE WHOLE DIFFICULTY. Two processes can both read the same leftover lock and both
 * conclude it is stale; if each then removed it and created its own, the second removal would take
 * out the FIRST one's brand-new live lock and both would run — the precise failure this exists to
 * prevent. Moving the stale file aside with an atomic rename does NOT fix that: the winner
 * repopulates the path microseconds later, so the loser's rename succeeds against a LIVE lock,
 * which is just as destructive as unlinking it. (Proved with a two-contender race, not reasoned
 * about; the race is in runner.selftest.ts.)
 *
 * So the takeover DECISION is serialized by a second exclusive-create lock — the gate. Only one
 * process is ever inside it, and it re-reads the holder INSIDE, so:
 *   - no other process can be taking over concurrently (the gate is exclusive);
 *   - no ordinary claim can have slipped in, because the stale file occupies the path continuously
 *     until the gate holder removes it, and an exclusive create only succeeds on a free path;
 *   - if a third process wins the claim in the instant after removal, the gate holder's own create
 *     simply fails and it restarts, having deleted nothing further.
 * A gate stranded by a killed process is cleared on age. The section lasts milliseconds, so a live
 * holder never reaches that threshold, and clearing one wrongly degrades to two takers in the
 * section — today's behaviour, not worse.
 */
export function acquireStackLock(config: LocalConfig, requirement: string): StackLock {
  const file = stackLockPath(config);

  const claim = (): StackLock | null => {
    let fd: number;
    try {
      fd = openSync(file, 'wx');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'EEXIST') return null;
      throw err;
    }
    try {
      writeSync(
        fd,
        JSON.stringify({
          pid: process.pid,
          host: hostname(),
          requirement,
          startedAt: new Date().toISOString(),
        }),
      );
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

  const gate = `${file}.takeover`;

  /** The recorded holder, or null if the lock is gone. */
  const readHolder = (): Holder | null => {
    try {
      return JSON.parse(readFileSync(file, 'utf8')) as Holder;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      return {}; // unreadable or half-written: treat as an unidentifiable holder, judged below
    }
  };

  /** Bounded synchronous pause; a gate is held for milliseconds, so this is all the wait needed. */
  const pause = (ms: number) => {
    const until = Date.now() + ms;
    while (Date.now() < until) {
      /* spin */
    }
  };

  // Bounded: every retry follows another process winning the gate, which cannot repeat forever.
  for (let attempt = 0; attempt < 20; attempt++) {
    const claimed = claim();
    if (claimed) return claimed;

    const holder = readHolder();
    if (holder === null) continue; // released between the failed claim and the read
    if (holderIsLive(holder)) throw heldByAnotherRun(holder, file);

    // Stale. Enter the takeover gate — the only place the live lock path may be removed.
    let gateFd: number;
    try {
      gateFd = openSync(gate, 'wx');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
      clearStrandedGate(gate);
      pause(10);
      continue;
    }

    try {
      writeSync(gateFd, JSON.stringify({ pid: process.pid, at: new Date().toISOString() }));
      const inside = readHolder();
      if (inside === null) continue; // released while we were entering; the next claim takes it
      if (holderIsLive(inside)) continue; // refreshed under us; the next pass refuses it properly

      rmSync(file, { force: true });
      const takeover = claim();
      if (!takeover) continue; // a third process claimed the free path first — delete nothing more

      console.log(
        `at:verify — took over a stale stack lock (holder pid ${inside.pid ?? 'unknown'} ` +
          `${typeof inside.pid === 'number' && processIsAlive(inside.pid) ? `is older than ${LOCK_STALE_MINUTES} minutes` : 'is no longer running'})`,
      );
      return takeover;
    } finally {
      closeSync(gateFd);
      rmSync(gate, { force: true });
    }
  }

  throw new Error(`could not acquire the stack lock at ${file} — it kept changing hands; try again`);
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

  throw new Error(`the stack was still not ready ${phase} after ${Math.round(READY_TIMEOUT_MS / 1000)}s — last problem: ${lastProblem}`);
}

/* --------------------------------------------------------------------- the migration-set proof */

/**
 * The migrations the reset is supposed to replay, read from disk. The CLI names them
 * `<timestamp>_name.sql` and records the timestamp as the applied version, so the timestamp is
 * the identity. `.gitkeep` and `README.md` are not migrations and are ignored.
 */
export function expectedMigrations(): string[] {
  const dir = join(REPO_ROOT, 'supabase', 'migrations');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .map((name) => /^(\d{14})_.*\.sql$/.exec(name)?.[1])
    .filter((version): version is string => Boolean(version))
    .sort();
}

/** What the database says it actually replayed. */
async function appliedMigrations(dbUrl: string): Promise<string[]> {
  const SQL = (globalThis as { Bun?: { SQL?: BunSqlCtor } }).Bun?.SQL;
  if (!SQL) throw new Error('this runtime has no SQL client (expected bun)');
  let sql: BunSqlClient | null = null;
  try {
    sql = new SQL(dbUrl);
    const rows = (await sql`select version from supabase_migrations.schema_migrations order by version`) as {
      version: string;
    }[];
    return rows.map((row) => String(row.version)).sort();
  } catch (err) {
    // A database that has never had a migration applied has no history table at all. "No table"
    // and "empty table" mean the same thing — nothing was applied — and saying so lets the
    // comparison below name exactly which migrations are missing instead of reporting a SQL error.
    const message = (err as Error).message ?? '';
    if (/schema_migrations/.test(message) && /does not exist/i.test(message)) return [];
    throw new Error(`could not read the migration history: ${diagnostic(message)}`);
  } finally {
    await sql?.close().catch(() => undefined);
  }
}

/** Exact set equality, both directions, named plainly. */
export function migrationSetProblems(expected: string[], applied: string[]): string[] {
  const missing = expected.filter((version) => !applied.includes(version));
  const extra = applied.filter((version) => !expected.includes(version));
  const problems: string[] = [];
  if (missing.length) problems.push(`never applied: ${missing.join(', ')}`);
  if (extra.length) problems.push(`applied but not in supabase/migrations: ${extra.join(', ')}`);
  return problems;
}

/**
 * Prove the rebuild actually replayed the migration set — the promise `supabase/migrations/README.md`
 * makes. "The reset command exited zero" is not that proof: a reset that replays NOTHING also exits
 * zero, and a suite then grades an empty schema while believing it graded the real one.
 *
 * An empty expected set is legitimate today (no migrations have been written yet) and is allowed —
 * but it is STATED on every run, so an empty rebuild can never be silently mistaken for a real one.
 */
async function proveMigrationsReplayed(status: StackStatus): Promise<void> {
  const expected = expectedMigrations();
  const applied = await appliedMigrations(status.dbUrl);
  const problems = migrationSetProblems(expected, applied);

  const summary = `${expected.length} migration${expected.length === 1 ? '' : 's'} expected, ${applied.length} applied`;
  if (problems.length) {
    throw new Error(`the rebuilt database does not match supabase/migrations (${summary}) — ${problems.join('; ')}`);
  }
  console.log(
    expected.length === 0
      ? `at:verify — ${summary} — the schema is empty by design at this stage`
      : `at:verify — ${summary} — the rebuilt schema matches supabase/migrations exactly`,
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

export interface AssertionResult {
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

export interface RuntimeRegistration {
  atId: string;
  title: string;
  surface: string;
}

export interface ReportAnalysis {
  rows: IdRow[];
  unexpected: string[];
}

function assertionId(assertion: AssertionResult): string | null {
  return /^(AT-[\d.]+[a-z]?)\s+—/.exec(assertion.title ?? assertion.fullName ?? '')?.[1] ?? null;
}

export function analyzeReportedTests(
  expected: string[],
  registrations: RuntimeRegistration[],
  assertions: AssertionResult[],
): ReportAnalysis {
  const registrationGroups = new Map<string, RuntimeRegistration[]>();
  for (const registration of registrations) {
    const group = registrationGroups.get(registration.atId) ?? [];
    group.push(registration);
    registrationGroups.set(registration.atId, group);
  }

  const assertionGroups = new Map<string, AssertionResult[]>();
  for (const assertion of assertions) {
    const id = assertionId(assertion);
    if (!id) continue;
    const group = assertionGroups.get(id) ?? [];
    group.push(assertion);
    assertionGroups.set(id, group);
  }

  const rows: IdRow[] = expected.map((id) => {
    const runtime = registrationGroups.get(id) ?? [];
    const results = assertionGroups.get(id) ?? [];
    if (runtime.length !== 1) {
      return {
        id,
        status: 'red',
        detail:
          runtime.length === 0
            ? 'no runtime registration emitted by atTest'
            : `${runtime.length} runtime registrations emitted by atTest; expected exactly 1`,
      };
    }
    if (results.length !== 1) {
      return {
        id,
        status: 'red',
        detail: `${results.length} Vitest results reported; expected exactly 1`,
      };
    }

    const result = results[0];
    const expectedTitle = `${id} — ${runtime[0].title}`;
    if (result.title !== expectedTitle) {
      return {
        id,
        status: 'red',
        detail: `Vitest title ${JSON.stringify(result.title)} does not match runtime registration ${JSON.stringify(expectedTitle)}`,
      };
    }
    if (result.status !== 'passed') {
      return {
        id,
        status: 'red',
        detail: firstLine(result.failureMessages?.join('\n'), `status "${result.status}"`),
      };
    }
    return { id, status: 'green', detail: runtime[0].title };
  });

  const observed = new Set([...registrationGroups.keys(), ...assertionGroups.keys()]);
  const unexpected = [...observed].filter((id) => !expected.includes(id)).sort();
  return { rows, unexpected };
}

function runtimeRegistrations(dir: string): RuntimeRegistration[] {
  const registrations: RuntimeRegistration[] = [];
  for (const file of readdirSync(dir, { withFileTypes: true })) {
    if (!file.isFile() || !file.name.endsWith('.jsonl')) continue;
    const lines = readFileSync(join(dir, file.name), 'utf8').split(/\r?\n/).filter(Boolean);
    for (const line of lines) registrations.push(JSON.parse(line) as RuntimeRegistration);
  }
  return registrations;
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

/**
 * End-of-run housekeeping. The lock release lives in a `finally` of its OWN so that it cannot be
 * skipped: on Windows, removing the report directory can throw EPERM while a file in it is still
 * open, and if that throw escaped, the stack lock would be stranded and every later run would
 * find a leftover it has to reason about. A lost temp directory is untidy; a stranded lock blocks
 * work, so the release always wins and the cleanup failure is reported instead of hidden.
 */
export function cleanupRun(reportDir: string, lock: { release(): void } | null): void {
  try {
    rmSync(reportDir, { recursive: true, force: true });
  } catch (err) {
    console.error(`at:verify — could not remove the report directory ${reportDir}: ${diagnostic((err as Error).message)}`);
  } finally {
    lock?.release();
  }
}

function firstLine(text: string | undefined, fallback: string): string {
  const line = redact(text ?? '')
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 0);
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
    const preflight = inspectBijection(requirement);
    expected = preflight.expected;
    if (preflight.problems.length) {
      console.error(`at:verify req-${requirement} — AT↔code preflight refused the run: ${preflight.problems.join('; ')}`);
      return 2;
    }
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
  const registrationDir = join(reportDir, 'registrations');
  mkdirSync(registrationDir);
  const cleanup = () => {
    cleanupRun(reportDir, lock);
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

      // (5) Prove the rebuild replayed the migration set — a reset that replays nothing also
      // exits zero, and the suite would grade an empty schema believing it was the real one.
      try {
        await proveMigrationsReplayed(status);
      } catch (err) {
        return infra((err as Error).message);
      }

      stackEnv.AT_SUPABASE_URL = status.apiUrl;
      stackEnv.AT_SUPABASE_DB_URL = status.dbUrl;
      stackEnv.AT_SUPABASE_ANON_KEY = status.anonKey;
      stackEnv.AT_SUPABASE_SERVICE_ROLE_KEY = status.serviceRoleKey;
    }

    // The suites and their vitest root come from the DATA root; vitest itself comes from the
    // install root, so a run pointed at a disposable tree still runs the pinned test framework.
    const atRoot = join(REPO_ROOT, 'tests', 'at');
    const outputFile = join(reportDir, 'vitest-report.json');
    const rootOverride: Record<string, string> = {};
    if (process.env.AT_REPO_ROOT?.trim()) rootOverride.AT_REPO_ROOT = process.env.AT_REPO_ROOT.trim();

    const run = spawnSync(
      bunExecutable(),
      [
        '--no-env-file',
        join(INSTALL_ROOT, 'node_modules', 'vitest', 'vitest.mjs'),
        'run',
        '--root',
        atRoot,
        '--config',
        join(atRoot, 'vitest.config.ts'),
        '--reporter=json',
        `--outputFile=${outputFile}`,
        `suites/req-${requirement}/`,
      ],
      {
        cwd: INSTALL_ROOT,
        env: childEnv({ ...stackEnv, ...rootOverride, AT_TIER: tier, AT_REGISTRATION_DIR: registrationDir }),
        stdio: ['ignore', 'inherit', 'inherit'],
      },
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
    const analysis = analyzeReportedTests(expected, runtimeRegistrations(registrationDir), assertions);
    const { rows, unexpected } = analysis;

    console.log('');
    console.log(`at:verify req-${requirement} --tier ${tier}`);
    for (const row of rows) console.log(`  ${row.id.padEnd(12)} ${row.status.padEnd(8)} ${row.detail}`);
    for (const id of unexpected) console.log(`  ${id.padEnd(12)} ${'extra'.padEnd(8)} registered but not a P0 of this requirement`);

    const green = rows.filter((r) => r.status === 'green').length;
    const red = rows.filter((r) => r.status === 'red').length;
    const missing = rows.filter((r) => r.status === 'missing').length;
    console.log(
      `  ${rows.length} P0: ${green} green, ${red} red, ${missing} missing${unexpected.length ? `, ${unexpected.length} extra` : ''}`,
    );

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

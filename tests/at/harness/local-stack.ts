/**
 * The `integration` tier needs a real database, and that database is THE ONE STACK: the project
 * this tree's own `supabase/config.toml` declares (`project_id`, `[api] port`), running at this
 * tree's root — never a shared hosted project, because every run wipes and rebuilds it. There is
 * no pool and no slot. It runs only from the real checkout: `AT_REPO_ROOT` redirects the data root
 * for the runner's own tests, and a data root must not choose which database is reset. It refuses
 * before the lock, from two files on disk, when `[auth] jwt_expiry` and the registry's
 * `accessTokenLifetimeSeconds` differ. THE DATA COST IS STATED: every integration run resets this
 * database, and the evidence line says so on every run. The sequence is deliberately paranoid:
 *
 *   1. take the machine-wide lock keyed by that project id + api port, so two runs cannot reset
 *      under each other — a lock that only a dead holder's process id can free;
 *   2. PROVE the stack that answers is that project — from the CLI's own container names, never
 *      from ports alone — and that it is local: loopback host, the configured ports, keys issued
 *      by the local development issuer. The proof is a branded value only that verdict can mint,
 *      and the reset demands it, so the reset cannot run without it;
 *   3. re-read `supabase/config.toml` and refuse if it changed under the lock, prove the identity
 *      again immediately before the reset, reset on that second proof, and prove the migration set
 *      replayed;
 *   4. run the suite with an ALLOWLISTED environment — the child gets the platform minimum plus
 *      the proven coordinates, and nothing else, so a secret sitting in a developer's
 *      `.env.local` can never reach a test (and a test can never reach the hosted project).
 *
 * Secrets are never printed: raw CLI output is redacted, and validation reports which check
 * failed, never the value that failed it.
 */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { AT_CONFIG } from './atconfig.ts';
import { INSTALL_ROOT, REPO_ROOT } from './check.ts';
import { STACK_ENV, type Stack } from './live-stack.ts';
import type { StackLock } from './stack-lock.ts';

/** How long the stack gets to become genuinely ready before the run is called off. */
const READY_TIMEOUT_MS = Number(process.env.AT_READY_TIMEOUT_MS ?? 120_000);
/** How long `supabase db reset` gets before it is assumed wedged and its process tree killed. */
const RESET_TIMEOUT_MS = Number(process.env.AT_RESET_TIMEOUT_MS ?? 600_000);

/** `supabase status` reports these two as stopped because config.toml disables them. Benign. */
const DISABLED_SERVICES = /^supabase_(imgproxy|pooler)_/;

/**
 * The pinned CLI, invoked directly — no shell, no PATH lookup, no globally installed version.
 * Resolved from the INSTALL root, never the (overridable) data root: the pinned versions live in
 * the real checkout's `node_modules` wherever the acceptance files being read happen to be.
 */
const SUPABASE_ENTRY = join(INSTALL_ROOT, 'node_modules', 'supabase', 'dist', 'supabase.js');

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
export function diagnostic(text: string | undefined, limit = 400): string {
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
  /**
   * `[auth] jwt_expiry` — the access-token lifetime the running Auth service reads at START. The
   * suites wait out the registry's copy of the same number; `lifetimePinProblem` holds the two to
   * each other before anything destructive happens.
   */
  jwtExpirySeconds: number;
  /**
   * `[local_smtp] port` — where THIS config says its mail catcher listens.
   *
   * OPTIONAL, for the same reason `StackStatus.mailUrl` is: a stack with no catcher block still
   * runs everything else, and making it required would turn a config that omits it into an
   * infrastructure failure for every run. `localStackProblems` checks the reported catcher URL
   * against it when both exist, and says so plainly when the status reports one and the config
   * states none.
   */
  mailPort?: number;
}

/**
 * Ports and project id come from `supabase/config.toml` — never guessed, never hard-coded.
 *
 * The root is a parameter so that `main` names the checkout it acts on explicitly and a selftest
 * can point this exact scanner at any tree instead of keeping a second copy of it. Unset — every
 * ordinary call — it reads this tree.
 */
export function readLocalConfig(root: string = REPO_ROOT): LocalConfig {
  const file = join(root, 'supabase', 'config.toml');
  const text = readFileSync(file, 'utf8');
  let section = '';
  let projectId = '';
  let apiPort = 0;
  let dbPort = 0;
  let mailPort = 0;
  let jwtExpirySeconds = 0;

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
    else if (section === 'auth' && /^jwt_expiry\s*=/.test(line)) jwtExpirySeconds = Number(/=\s*(\d+)/.exec(line)?.[1] ?? 0);
    // `[local_smtp]`'s FIRST port is the catcher's web API — the one `supabase status` reports as
    // `MAILPIT_URL`. `smtp_port` and `pop3_port` follow it in the same section and are not it, which
    // is why this reads the first `port` key and nothing else.
    else if (section === 'local_smtp' && port && !mailPort) mailPort = Number(port[1]);
  }

  const missing = [
    projectId ? '' : 'project_id',
    apiPort ? '' : '[api] port',
    dbPort ? '' : '[db] port',
    jwtExpirySeconds ? '' : '[auth] jwt_expiry',
  ].filter(Boolean);
  if (missing.length) throw new Error(`${file} is missing ${missing.join(' and ')}`);
  return { projectId, apiPort, dbPort, jwtExpirySeconds, ...(mailPort ? { mailPort } : {}) };
}

/* -------------------------------------------------------------------- the stack's own report */

export interface StackStatus {
  apiUrl: string;
  dbUrl: string;
  anonKey: string;
  serviceRoleKey: string;
  /**
   * WHERE THE STACK'S OWN MAIL CATCHER ANSWERS, as the stack itself reports it.
   *
   * OPTIONAL, and that is not laziness. The four fields above are REQUIRED because nothing can run
   * without them; a catcher is needed only by a suite that reads mail, and the CLI has renamed this
   * field once already (`INBUCKET_URL` became `MAILPIT_URL` when the catcher changed, and both are
   * emitted today). Making it required would turn a rename into an infrastructure failure for every
   * run, including the ones that never read a message. A suite that DOES need it refuses loudly at
   * its own construction — `mailIdentification` in `live-stack.ts` says exactly that — which is where the refusal belongs.
   *
   * It is read here rather than recomputed from `[local_smtp] port`, so there is one statement of
   * the catcher's address rather than two that can disagree; `localStackProblems` checks the one
   * reported against the one configured.
   */
  mailUrl?: string;
}

const REQUIRED_STATUS_FIELDS: Record<'apiUrl' | 'dbUrl' | 'anonKey' | 'serviceRoleKey', string> = {
  apiUrl: 'API_URL',
  dbUrl: 'DB_URL',
  anonKey: 'ANON_KEY',
  serviceRoleKey: 'SERVICE_ROLE_KEY',
};

export function supabaseArgs(...args: string[]): string[] {
  if (!existsSync(SUPABASE_ENTRY)) throw new Error(`the Supabase CLI is not installed at ${SUPABASE_ENTRY} — run \`bun install\``);
  return ['--no-env-file', SUPABASE_ENTRY, ...args];
}

/**
 * WHICH PROJECT an invocation acts on. A target names both halves of an identity, because either
 * half alone is a hybrid.
 */
export interface CliTarget {
  /** The directory that CONTAINS the `supabase/` project folder — what `--workdir` names. */
  workdir: string;
  /** The project id the invocation must resolve, stated POSITIVELY in `SUPABASE_PROJECT_ID`. */
  projectId: string;
}

export interface CliInvocation {
  args: string[];
  cwd: string;
  env: Record<string, string>;
}

/**
 * THE ONE SEAM every Supabase CLI invocation is built at. Nothing under `tests/` assembles a CLI
 * command line, working directory or environment anywhere else, and that single seam is the whole
 * wall — a wall with two builders is a wall with a gap.
 *
 * THREE THINGS HAVE TO AGREE, and the reason each is here was measured, not reasoned about:
 *
 *   1. `SUPABASE_PROJECT_ID`, set POSITIVELY to the target's project id. The CLI treats that
 *      variable as an OVERRIDE of `project_id` in `config.toml`. The repo's tracked `.env` carries
 *      it, bun loads `.env` into this process, and on 2026-08-09 a `db reset` aimed at slot 2
 *      destroyed the founder's personal database because the environment supplied the identity
 *      while the slot's config supplied the ports. The wall is stating the identity, never merely
 *      avoiding an override: an absence can be reintroduced by any parent process, a positive
 *      value cannot.
 *   2. NO OTHER `SUPABASE_*` variable. `childEnv` is an allowlist that carries none, and this
 *      function asserts that rather than trusting it, because the allowlist is edited by people.
 *   3. The WORKING DIRECTORY, equal to `--workdir`. Measured 2026-08-10: when the CLI's working
 *      directory is itself a Supabase project, `--workdir <other>` produces a hybrid — the other
 *      project's ports beside the working directory's project's containers. Run from a directory
 *      that is not a project, the same command correctly says
 *      `No such container: supabase_db_ai4good-slot-1`.
 *
 * `bun --no-env-file` (in `supabaseArgs`) closes the fourth route: a child that re-reads `.env`
 * for itself.
 *
 * EVERY INVOCATION STATES A TARGET. There is no target-less form: a CLI call that names no identity
 * is exactly the shape this wall exists to refuse, so the seam does not offer one.
 */
export function supabaseInvocation(target: CliTarget, args: string[]): CliInvocation {
  const env = childEnv({ SUPABASE_PROJECT_ID: target.projectId });
  const foreign = Object.keys(env).filter((name) => /^SUPABASE_/i.test(name) && name.toUpperCase() !== 'SUPABASE_PROJECT_ID');
  if (foreign.length) {
    throw new Error(
      `refusing to run the Supabase CLI against ${target.projectId}: the child environment would also carry ` +
        `${foreign.join(', ')}, and a second SUPABASE_* variable can override the identity this invocation states.`,
    );
  }
  if (env.SUPABASE_PROJECT_ID !== target.projectId) {
    throw new Error(`refusing to run the Supabase CLI: SUPABASE_PROJECT_ID would not be "${target.projectId}"`);
  }
  return { args: supabaseArgs('--workdir', target.workdir, ...args), cwd: target.workdir, env };
}

export interface CliResult {
  status: number | null;
  signal?: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  error?: Error;
}

/** Run the pinned CLI through the seam and hand back the RAW result. The caller decides what to
 * read and what may be printed — raw output carries every key the stack issues. */
export function runSupabaseCli(target: CliTarget, args: string[]): CliResult {
  const invocation = supabaseInvocation(target, args);
  const res = spawnSync(bunExecutable(), invocation.args, { cwd: invocation.cwd, env: invocation.env, encoding: 'utf8' });
  return {
    status: res.status,
    signal: res.signal,
    stdout: res.stdout ?? '',
    stderr: res.stderr ?? '',
    error: res.error as Error | undefined,
  };
}

/**
 * Where the JSON object sits in `supabase status -o json` output, or null when the CLI printed
 * none — which is what a stack that is not running looks like.
 */
function statusJsonSpan(stdout: string): { open: number; close: number } | null {
  const open = stdout.indexOf('{');
  const close = stdout.lastIndexOf('}');
  return open < 0 || close <= open ? null : { open, close };
}

/**
 * The status parser, separate from the invocation so that a caller which needs the RAW output for
 * its own checks (`identityVerdict`, which reads the container names off the same result) reads it
 * once and parses the same result, rather than running the CLI twice or keeping a second copy of
 * this parser.
 */
export function parseStackStatus(res: CliResult): StackStatus {
  if (res.error) {
    const err = res.error as NodeJS.ErrnoException;
    throw new Error(`could not launch the Supabase CLI (${err.code ?? 'spawn error'}): ${diagnostic(err.message)}`);
  }

  const stdout = res.stdout ?? '';
  const span = statusJsonSpan(stdout);
  if (span === null) {
    throw new Error(
      `\`supabase status\` reported no JSON (exit ${res.status}${res.signal ? `, signal ${res.signal}` : ''}): ` +
        `${diagnostic(res.stderr) || '(no error output)'}`,
    );
  }
  const { open, close } = span;

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
  for (const [field, key] of Object.entries(REQUIRED_STATUS_FIELDS) as [keyof typeof REQUIRED_STATUS_FIELDS, string][]) {
    const value = parsed[key];
    if (typeof value !== 'string' || value.trim() === '') missing.push(key);
    else status[field] = value;
  }
  if (missing.length) throw new Error(`\`supabase status\` reported no ${missing.join(', no ')}`);

  // BOTH NAMES, newest first. The CLI emits `MAILPIT_URL` today and still emits the older
  // `INBUCKET_URL` beside it; reading both means a CLI that drops either one keeps working, and a
  // CLI that drops both leaves this undefined rather than silently wrong.
  for (const key of ['MAILPIT_URL', 'INBUCKET_URL']) {
    const value = parsed[key];
    if (typeof value === 'string' && value.trim() !== '') {
      status.mailUrl = value;
      break;
    }
  }
  return status as StackStatus;
}

/**
 * Pure mapping from a parsed status onto the shared `Stack`. The drive's constructor cannot stub
 * `runSupabaseCli` without a new parameter, so the selftest feeds a `StackStatus` to this function.
 */
export function stackFromParsedStatus(status: StackStatus): Stack {
  if (!status.mailUrl) {
    throw new Error('the stack names no mail catcher');
  }
  return {
    apiUrl: status.apiUrl,
    dbUrl: status.dbUrl,
    anonKey: status.anonKey,
    serviceRoleKey: status.serviceRoleKey,
    mailUrl: status.mailUrl,
  };
}

/** The drive's constructor: one CLI seam, then the mapping. Refuses when the status names no catcher. */
export function stackFromLocalStatus(repoRoot: string): Stack {
  const config = readLocalConfig(repoRoot);
  return stackFromParsedStatus(
    parseStackStatus(runSupabaseCli({ workdir: repoRoot, projectId: config.projectId }, ['status', '-o', 'json'])),
  );
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

  /*
   * THE MAIL CATCHER URL IS CHECKED TOO (gate-2 ruling S1-6), because it travels into the child
   * exactly as the other coordinates do — `childCoordinates` puts it in `AT_SUPABASE_MAIL_URL` and
   * the live email capability reads mail through it. It used to flow from `supabase status` into
   * the child with nothing looking at it, so the one coordinate that is not a credential was also
   * the one coordinate nothing proved was this stack's.
   *
   * ONLY WHEN A CATCHER IS REPORTED. A stack with no catcher is not a failure — the field is
   * optional in both directions, and a suite that needs one refuses at its own construction. What
   * IS a failure is a reported catcher this config cannot vouch for, and that is said rather than
   * skipped.
   */
  if (status.mailUrl !== undefined) {
    if (config.mailPort === undefined) {
      problems.push('MAIL_URL was reported but supabase/config.toml states no [local_smtp] port to check it against');
    } else {
      checkUrl('MAIL_URL', status.mailUrl, config.mailPort);
    }
  }

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
export async function waitForReady(status: StackStatus, phase: string): Promise<void> {
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

/** Counted, not just proved — the evidence line has to state the migration state it saw. */
export interface MigrationProof {
  expected: number;
  applied: number;
}

/**
 * The migrations the reset is supposed to replay, read from disk. The CLI names them
 * `<timestamp>_name.sql` and records the timestamp as the applied version, so the timestamp is
 * the identity. `.gitkeep` and `README.md` are not migrations and are ignored.
 */
export function expectedMigrations(root: string = REPO_ROOT): string[] {
  const dir = join(root, 'supabase', 'migrations');
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
export async function proveMigrationsReplayed(status: StackStatus, root: string = REPO_ROOT): Promise<MigrationProof> {
  const expected = expectedMigrations(root);
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
  return { expected: expected.length, applied: applied.length };
}

/* ------------------------------------------------------------------------------------- reset */

/**
 * Rebuild the local database from `supabase/migrations` — the same work `bun run db:reset` does,
 * invoked at the pinned CLI so failures are catchable and bounded.
 *
 * WHY EVERY RUN: without it the second run works on the first run's leftover rows, and on a
 * schema missing whatever migration landed since — a suite grading a database nobody established.
 *
 * A TARGET COSTS A PROOF, AND THE TYPE SYSTEM COLLECTS IT (audit ruling B2, decision D13): the
 * identity read is structurally ON the destructive path, never a separate call a caller can skip.
 * The proof is a `StackIdentityRead`, and THE TARGET TRAVELS IN IT: the reset is aimed at
 * `read.target`, the workdir and project id the read judged, so there is no second parameter to
 * disagree with the first and nothing to refuse by name. The type carries a brand only this module
 * sets — a proof cannot be written as a literal; it is minted only by `identityVerdict`, which on
 * the live path only `proveTarget` feeds — and the read is frozen, so it cannot be re-aimed after
 * it is issued. What a caller CAN still write is a spread, `{ ...read, target: other }`, which
 * TypeScript accepts as the same type; the brand is non-enumerable, so the spread does not carry
 * it, and that is checked here at use, before anything is spawned. This is the only reset
 * signature there is.
 */
export async function resetLocalDatabase(read: StackIdentityRead): Promise<void> {
  // Read through the descriptor rather than `PROVEN in read`: the type promises the brand, so the
  // compiler narrows the negative branch of an `in` test to `never` and the message could not name
  // the target. The runtime question is the same either way.
  if (Object.getOwnPropertyDescriptor(read, PROVEN)?.value !== true) {
    throw new Error(
      `REFUSING TO RESET ${read.target.projectId}: the read handed to this reset carries no proof — it is a copy of a ` +
        `read (a spread or Object.assign drops the brand), not the read identityVerdict minted. Nothing was done.`,
    );
  }
  const invocation = supabaseInvocation(read.target, ['db', 'reset', '--local']);
  const child = spawn(bunExecutable(), invocation.args, {
    cwd: invocation.cwd,
    env: invocation.env,
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

/* ------------------------------------------- the one stack: identity, coordinates, evidence */

/**
 * The Supabase container names in a piece of CLI output, partitioned into the ones that belong to
 * this project and the ones that do NOT — one scan, both halves of one instrument.
 *
 * The CLI names its containers `supabase_<service>_<project id>`, and it prints them: a healthy
 * `supabase status` opens with `Stopped services: [supabase_imgproxy_<id> supabase_pooler_<id>]`,
 * and its error paths say things like `No such container: supabase_db_<id>`. That line is the
 * CLI's own statement of WHICH PROJECT it resolved, and it is the instrument that would have
 * caught the incident: on 2026-08-10 a hybrid invocation reported one project's ports beside
 * another project's `supabase_imgproxy_…` in the same output.
 *
 * FOREIGN is deliberately strict: a `supabase_…` token that does not end in `_<this project id>`
 * is reported, whatever it is. A false report costs a loud refusal on a read; a missed one costs a
 * database. The pattern's tail is anchored on an alphanumeric, so a name that ends a sentence
 * (`… supabase_db_<id>.`) is read without the period rather than reported as another project's.
 *
 * OWN is the positive half. MEASURED, 2026-09-02, on this stack: `status -o json` prints exactly
 * two such tokens on stderr, `Stopped services: [supabase_imgproxy_<id> supabase_pooler_<id>]`,
 * and zero tokens that belong to any other project. So the evidence `identityVerdict` demands is
 * evidence the CLI really produces. Absence is not innocence: an output that names no container
 * at all is exactly the hybrid shape the 2026-08-09 incident wore (one project's ports beside
 * another project's containers), so a destructive act requires at least one name that IS this
 * project's, never merely the lack of one that is not.
 *
 * Two residuals, recorded rather than hidden. The two own tokens exist because the tracked config
 * disables imgproxy and the pooler; a config that enables both prints no "Stopped services" line,
 * this check finds no evidence, and the destructive act REFUSES — fail closed and loud, but a real
 * coupling to the config and to the CLI's output shape, and the refusal names it. And the own
 * match is a suffix match: a container of a project whose id ends in `_<this project id>` would
 * count as this project's. No such project exists on this machine.
 */
export function containerNames(text: string, projectId: string): { own: string[]; foreign: string[] } {
  const names = new Set([...String(text ?? '').matchAll(/\bsupabase_[A-Za-z0-9][A-Za-z0-9_.-]*[A-Za-z0-9]/g)].map((match) => match[0]));
  const own: string[] = [];
  const foreign: string[] = [];
  for (const name of names) (name.endsWith(`_${projectId}`) ? own : foreign).push(name);
  return { own, foreign };
}

/**
 * THE BRAND ONLY THIS MODULE CAN SET. Module-private and never exported: an importer cannot name
 * this key, so an object literal that claims to be a `StackIdentityRead` does not compile, and the
 * two destructive signatures can only be handed a read `mintProvenRead` minted. Said exactly: a
 * proof cannot be written as a literal; it is minted only by `identityVerdict`, which on the live
 * path only `proveTarget` feeds. (`identityVerdict` stays exported because the verdict selftests
 * drive it, so a fabricated `CliResult` yields a proof, and a cast still compiles. The threat model
 * is an honest mistake nothing can notice, not an author set on defeating the design — the same
 * mechanism: non-enumerable, so a
 * spread or `Object.assign` copies the fields and not the brand, and read at use.)
 */
const PROVEN: unique symbol = Symbol('at-proven-identity');

/**
 * WHAT THE IDENTITY READ PROVED, in full — the ONE proof type. `resetLocalDatabase` takes exactly
 * this object and nothing else. It is FROZEN, target, status and container list included, so a
 * proof cannot be re-aimed after it is issued.
 */
export interface StackIdentityRead {
  /** Set by `mintProvenRead` and by nothing else. */
  readonly [PROVEN]: true;
  /** The target the read judged — the workdir the CLI ran in and the project id it was told to resolve. */
  readonly target: CliTarget;
  /** The project id the identity read proved, from the CLI's own container names. */
  readonly provenProjectId: string;
  /** The stack's own report. Never null: no stack, no read. */
  readonly status: StackStatus;
  /** The container names the CLI printed that belong to the proven project — the positive evidence itself. */
  readonly containers: readonly string[];
}

/** The one mint. The brand is defined non-enumerable and non-writable; everything else is frozen. */
function mintProvenRead(target: CliTarget, status: StackStatus, containers: string[]): StackIdentityRead {
  const read = {
    target: Object.freeze({ workdir: target.workdir, projectId: target.projectId }),
    provenProjectId: target.projectId,
    status: Object.freeze(status),
    containers: Object.freeze([...containers]),
  };
  Object.defineProperty(read, PROVEN, { value: true, enumerable: false, writable: false, configurable: false });
  return Object.freeze(read) as StackIdentityRead;
}

/**
 * PURE. The verdict over one `status -o json` result.
 *
 * THE ORDER IS LOAD-BEARING. A CLI that could not be launched produced nothing to judge, and is
 * reported as that — not as a refusal. Then:
 *   1. foreign names first — an identity mismatch must never be reported as "stopped services",
 *      "no JSON" or "not running", which is what the steps below would say about a hybrid;
 *   2. then "is anything running": an output with no JSON at all is NOT a refusal. Forgetting
 *      `db:start` is the most frequent way this path fails, and a safety phrase that fires on
 *      routine operator error stops being read — so this says what to run instead;
 *   3. then the parse;
 *   4. then the local checks against the target's own config — loopback, the configured ports,
 *      locally issued keys, a catcher this config can vouch for;
 *   5. then at least one OWN name — ports alone are not identity (the 2026-08-09 shape).
 *
 * Every refusal throws `REFUSING TO RESET <projectId>: … Nothing was done.` and names the check,
 * never a value: the raw output carries every key the stack issues.
 */
export function identityVerdict(res: CliResult, target: CliTarget, config: LocalConfig): StackIdentityRead {
  const id = target.projectId;
  const refuse = (why: string): never => {
    throw new Error(`REFUSING TO RESET ${id}: ${why} Nothing was done.`);
  };

  if (res.error) {
    throw new Error(
      `the Supabase CLI could not be launched to read the identity of ${id} (${diagnostic(res.error.message)}); ` +
        `nothing answered, so nothing was judged.`,
    );
  }

  const names = containerNames(`${res.stdout}\n${res.stderr}`, id);
  if (names.foreign.length) return refuse(`the identity read did not resolve to ${id} — the CLI named ${names.foreign.join(', ')}.`);

  if (statusJsonSpan(res.stdout ?? '') === null) {
    throw new Error(
      `no stack is running for ${id}; run \`bun run db:start\` (\`supabase status\` reported no JSON, ` +
        `exit ${res.status}${res.signal ? `, signal ${res.signal}` : ''}: ${diagnostic(res.stderr) || 'no error output'}).`,
    );
  }

  let status: StackStatus;
  try {
    status = parseStackStatus(res);
  } catch (err) {
    return refuse(`the stack did not report its status — ${(err as Error).message}.`);
  }

  const problems = localStackProblems(status, config);
  if (problems.length) {
    return refuse(
      `the stack that answered is not provably the one supabase/config.toml describes. ` +
        `Failed checks: ${problems.join('; ')}. (Values are deliberately not printed.)`,
    );
  }

  if (names.own.length === 0) {
    return refuse(
      `the CLI printed no container name belonging to ${id}, so the read carries no positive evidence of which ` +
        `project the CLI resolved, and the ports alone are not identity — the 2026-08-09 incident reported the right ` +
        `ports while resolving another project. The known benign cause: supabase/config.toml enables both imgproxy ` +
        `and the pooler, so no "Stopped services" line names them; this proof needs at least one own name.`,
    );
  }

  return mintProvenRead(target, status, names.own);
}

/**
 * THE READ THAT PRECEDES EVERY DESTRUCTIVE ACT: `status -o json` through the seam AS the target,
 * judged by `identityVerdict` against the target's own config. The raw output is never printed;
 * the line this prints carries the project, the configured ports and the container names only.
 */
export function proveTarget(target: CliTarget, config: LocalConfig, when: string): StackIdentityRead {
  const read = identityVerdict(runSupabaseCli(target, ['status', '-o', 'json']), target, config);
  console.log(
    `at:verify — identity proven ${when}: project ${read.provenProjectId}, api ${config.apiPort}, ` +
      `db ${config.dbPort}, containers ${read.containers.join(', ')}`,
  );
  return read;
}

/**
 * THE LIFETIME IS PINNED ONCE, and this is the check that makes that sentence true. The number is
 * written twice — `[auth] jwt_expiry` in `supabase/config.toml`, which the running Auth service
 * reads at start, and `accessTokenLifetimeSeconds` in `atconfig.ts`, which the suites wait out —
 * and prose alone used to join them. A stack serving one number while the bodies wait for the
 * other fails 135 seconds later blaming the product. Null when the two agree. `main` asks before
 * the lock is taken: the answer comes from two files on disk, so a mismatch costs nothing and is
 * reported bare, with no advice about a stack nothing contacted.
 */
export function lifetimePinProblem(config: LocalConfig): string | null {
  const pinned = AT_CONFIG.accessTokenLifetimeSeconds.value;
  if (config.jwtExpirySeconds === pinned) return null;
  return (
    `refusing to prepare ${config.projectId}: supabase/config.toml pins [auth] jwt_expiry = ${config.jwtExpirySeconds}, but ` +
    `the harness registry pins accessTokenLifetimeSeconds = ${pinned} (tests/at/harness/atconfig.ts). The stack issues ` +
    `the config's number and the suites wait out the registry's, so the two must agree: edit whichever is wrong, then ` +
    `run \`bun run db:stop\` and \`bun run db:start\` so the stack reads the config again. Nothing was done.`
  );
}

/**
 * THE LOCKED SNAPSHOT MUST STILL BE THE FILE. `main` reads `supabase/config.toml` once, takes the
 * lock on its project id and api port, and hands that object down; the readiness wait that follows
 * can last two minutes. The second CLI call forces the LOCKED project id through
 * `SUPABASE_PROJECT_ID`, so a file that now declares another project would still be reset as the
 * old one, under a lock keyed to an identity the checkout no longer claims — and a changed port or
 * lifetime would pass a proof judged against numbers that are no longer the file's. So the file is
 * read again immediately before the second proof, and every field that names the stack is held to
 * the snapshot. Empty when nothing moved.
 */
export function configDriftProblems(locked: LocalConfig, current: LocalConfig): string[] {
  const problems: string[] = [];
  const hold = (label: string, was: string | number | undefined, now: string | number | undefined) => {
    if (was !== now) problems.push(`${label} was ${was ?? 'absent'} when the lock was taken and is ${now ?? 'absent'} now`);
  };
  hold('project_id', locked.projectId, current.projectId);
  hold('[api] port', locked.apiPort, current.apiPort);
  hold('[db] port', locked.dbPort, current.dbPort);
  hold('[local_smtp] port', locked.mailPort, current.mailPort);
  hold('[auth] jwt_expiry', locked.jwtExpirySeconds, current.jwtExpirySeconds);
  return problems;
}

/** What one integration run established about the stack before the suite ran. */
export interface PreparedStack {
  read: StackIdentityRead;
  migrations: MigrationProof;
}

/**
 * Make the one stack's database be this tree's database, and prove it.
 *
 * THE ORDER IS THE SAFETY ARGUMENT: prove the identity, wait for readiness, re-read the config the
 * lock and the first proof were judged against and refuse if it changed, PROVE IT AGAIN, reset on
 * that second proof, wait again, and prove the migration set replayed. The lifetime pin is not
 * checked here: it is decided from two files on disk, so `main` refuses it before the lock is taken.
 *
 * WHY TWO READS, AND WHY THE CONFIG IS READ AGAIN. The readiness wait has a budget of
 * `READY_TIMEOUT_MS` (two minutes by default), and a proof taken before it describes the stack as
 * it was before that window, not as it is at the instant of the reset. The second read is taken
 * immediately before the reset and is the read the destructive act receives; the first read only
 * says the stack is worth waiting for. That narrows the RESET's check-to-use window to one CLI
 * call. The config is re-read from the target's workdir before the second proof because that proof
 * forces the LOCKED project id through `SUPABASE_PROJECT_ID`: a file that now names another
 * project, port or lifetime would make the lock, the pin check and the first proof all judgements
 * about a file that no longer exists, and the run refuses rather than reset the old project under a
 * checkout that moved on.
 *
 * WHAT IT DELIBERATELY DOES NOT DO. It does not restart the stack: a restart of the founder's own
 * stack would be a fourth destructive act, so a stack started before `supabase/config.toml` last
 * changed is the operator's to restart (`stackHelp` in `main` names the two commands, and the live
 * adapter refuses with the true cause when the tokens it is issued do not match the pin). And it
 * does not ask Docker for a second opinion on identity. The arena weighed that (2026-09-02):
 * `docker ps` adds LIVENESS, which `waitForReady` already proves, not IDENTITY, which only the
 * CLI's own resolution can state — and it would put the docker binary on a destructive path CI
 * never runs. A later item can revisit that if the CLI's output shape changes.
 */
export async function prepareLocalStack(target: CliTarget, config: LocalConfig): Promise<PreparedStack> {
  const first = proveTarget(target, config, 'before the readiness wait');
  await waitForReady(first.status, 'before the reset');
  const drift = configDriftProblems(config, readLocalConfig(target.workdir));
  if (drift.length) {
    throw new Error(
      `REFUSING TO RESET ${config.projectId}: supabase/config.toml changed after this run locked the stack — ${drift.join('; ')}. ` +
        `The lock, the lifetime pin and the first identity read all judged the earlier file, so nothing below is proven ` +
        `for this one. Nothing was done.`,
    );
  }
  const read = proveTarget(target, config, 'immediately before the reset');
  await resetLocalDatabase(read);
  await waitForReady(read.status, 'after the reset');
  const migrations = await proveMigrationsReplayed(read.status, target.workdir);
  return { read, migrations };
}

/**
 * The coordinates a suite is allowed to see, and nothing else, from a PREPARED stack. The only
 * admission is the parameter type: coordinates can only be emitted from a read that proved the
 * target, because emitting the wrong ones is as destructive as resetting the wrong database.
 */
export function childCoordinates(prepared: PreparedStack): Record<string, string> {
  const { status } = prepared.read;
  const coords: Record<string, string> = {
    [STACK_ENV.apiUrl]: status.apiUrl,
    [STACK_ENV.dbUrl]: status.dbUrl,
    [STACK_ENV.anonKey]: status.anonKey,
    [STACK_ENV.serviceRoleKey]: status.serviceRoleKey,
  };
  if (status.mailUrl) coords[STACK_ENV.mailUrl] = status.mailUrl;
  return coords;
}

/**
 * The tested commit and the tree state, for the evidence line. Read through git with the
 * allowlisted environment; the short hash is checked to be hex before it is printed, so nothing
 * key-shaped can travel through this.
 */
export function treeState(root: string): string {
  const git = (args: string[]) => spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', env: childEnv() });
  const head = (git(['rev-parse', '--short', 'HEAD']).stdout ?? '').trim();
  if (!/^[0-9a-f]{4,40}$/.test(head)) return 'head unknown (git did not report it)';
  const status = git(['status', '--porcelain']);
  if (status.status !== 0) return `head ${head}, tree state unknown (git status failed)`;
  return `head ${head}${(status.stdout ?? '').trim() ? ', dirty' : ''}`;
}

/**
 * The one line the verify transcript carries about the database it ran against: which project,
 * the api port THAT ANSWERED (from the proven status), that the reset happened, the migration
 * state, the lock file, and the commit the tree was at. A green that cannot name its reset ran
 * against unknown state. No slot number anywhere.
 */
export function evidenceLine(prepared: PreparedStack, lock: StackLock): string {
  const { read, migrations } = prepared;
  return (
    `at:verify — stack ${read.provenProjectId} (api ${new URL(read.status.apiUrl).port}) — reset OK — ` +
    `migrations: ${migrations.expected} expected, ${migrations.applied} applied — lock ${lock.file} — ${treeState(REPO_ROOT)}`
  );
}

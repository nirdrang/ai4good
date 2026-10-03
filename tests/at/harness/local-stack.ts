import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { AT_CONFIG } from './atconfig.ts';
import { INSTALL_ROOT, REPO_ROOT } from './check.ts';
import { STACK_ENV, type Stack } from './live-stack.ts';
import type { StackLock } from './stack-lock.ts';

const READY_TIMEOUT_MS = Number(process.env.AT_READY_TIMEOUT_MS ?? 120_000);
const RESET_TIMEOUT_MS = Number(process.env.AT_RESET_TIMEOUT_MS ?? 600_000);

/** `supabase status` reports these as stopped because config.toml disables them. */
const DISABLED_SERVICES = /^supabase_(imgproxy|pooler|analytics|vector)_/;

const SUPABASE_ENTRY = join(INSTALL_ROOT, 'node_modules', 'supabase', 'dist', 'supabase.js');

/** bun auto-loads `.env` and `.env.local`, so a child gets only these variables. */
const ENV_ALLOWLIST = [
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

export function redact(text: string): string {
  return String(text ?? '')
    .replace(/eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}/g, '<redacted-jwt>')
    .replace(/\bsb_[a-z]+_[A-Za-z0-9_-]{8,}/g, '<redacted-key>')
    .replace(/(postgres(?:ql)?:\/\/)[^@\s/]+@/gi, '$1<redacted>@')
    .replace(/[A-Za-z0-9_-]{40,}/g, '<redacted-token>');
}

export function diagnostic(text: string | undefined, limit = 400): string {
  const line =
    redact(text ?? '')
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.length > 0) ?? '';
  return line.length > limit ? `${line.slice(0, limit)}…` : line;
}

export interface LocalConfig {
  projectId: string;
  apiPort: number;
  dbPort: number;
  jwtExpirySeconds: number;
  mailPort?: number;
}

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

export interface StackStatus {
  apiUrl: string;
  dbUrl: string;
  anonKey: string;
  serviceRoleKey: string;
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

export interface CliTarget {
  workdir: string;
  projectId: string;
}

export interface CliInvocation {
  args: string[];
  cwd: string;
  env: Record<string, string>;
}

// The CLI treats SUPABASE_PROJECT_ID as an override of config.toml's project_id.
// When the CLI's cwd is itself a Supabase project, `--workdir <other>` yields a hybrid: the other project's ports beside the cwd project's containers.
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

function statusJsonSpan(stdout: string): { open: number; close: number } | null {
  const open = stdout.indexOf('{');
  const close = stdout.lastIndexOf('}');
  return open < 0 || close <= open ? null : { open, close };
}

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
        `${diagnostic(res.stderr) || '(no error output)'}. If no stack is running: \`bun run db:start\`.`,
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

  // The CLI emits `MAILPIT_URL` and still emits the older `INBUCKET_URL` beside it.
  for (const key of ['MAILPIT_URL', 'INBUCKET_URL']) {
    const value = parsed[key];
    if (typeof value === 'string' && value.trim() !== '') {
      status.mailUrl = value;
      break;
    }
  }
  return status as StackStatus;
}

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

export function stackFromLocalStatus(repoRoot: string): Stack {
  const config = readLocalConfig(repoRoot);
  return stackFromParsedStatus(
    parseStackStatus(runSupabaseCli({ workdir: repoRoot, projectId: config.projectId }, ['status', '-o', 'json'])),
  );
}

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

interface BunSqlClient {
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown>;
  close(): Promise<void>;
}
type BunSqlCtor = new (url: string) => BunSqlClient;

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

export interface MigrationProof {
  expected: number;
  applied: number;
}

export function expectedMigrations(root: string = REPO_ROOT): string[] {
  const dir = join(root, 'supabase', 'migrations');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .map((name) => /^(\d{14})_.*\.sql$/.exec(name)?.[1])
    .filter((version): version is string => Boolean(version))
    .sort();
}

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
    // No migration history table exists until a migration has been applied.
    const message = (err as Error).message ?? '';
    if (/schema_migrations/.test(message) && /does not exist/i.test(message)) return [];
    throw new Error(`could not read the migration history: ${diagnostic(message)}`);
  } finally {
    await sql?.close().catch(() => undefined);
  }
}

export function migrationSetProblems(expected: string[], applied: string[]): string[] {
  const missing = expected.filter((version) => !applied.includes(version));
  const extra = applied.filter((version) => !expected.includes(version));
  const problems: string[] = [];
  if (missing.length) problems.push(`never applied: ${missing.join(', ')}`);
  if (extra.length) problems.push(`applied but not in supabase/migrations: ${extra.join(', ')}`);
  return problems;
}

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

export async function resetLocalDatabase(read: StackIdentityRead): Promise<void> {
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

// The CLI names containers `supabase_<service>_<project id>` and prints them in `status` output.
export function containerNames(text: string, projectId: string): { own: string[]; foreign: string[] } {
  const names = new Set([...String(text ?? '').matchAll(/\bsupabase_[A-Za-z0-9][A-Za-z0-9_.-]*[A-Za-z0-9]/g)].map((match) => match[0]));
  const own: string[] = [];
  const foreign: string[] = [];
  for (const name of names) (name.endsWith(`_${projectId}`) ? own : foreign).push(name);
  return { own, foreign };
}

const PROVEN: unique symbol = Symbol('at-proven-identity');

export interface StackIdentityRead {
  readonly [PROVEN]: true;
  readonly target: CliTarget;
  readonly provenProjectId: string;
  readonly status: StackStatus;
  readonly containers: readonly string[];
}

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

export function proveTarget(target: CliTarget, config: LocalConfig, when: string): StackIdentityRead {
  const read = identityVerdict(runSupabaseCli(target, ['status', '-o', 'json']), target, config);
  console.log(
    `at:verify — identity proven ${when}: project ${read.provenProjectId}, api ${config.apiPort}, ` +
      `db ${config.dbPort}, containers ${read.containers.join(', ')}`,
  );
  return read;
}

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

export interface PreparedStack {
  read: StackIdentityRead;
  migrations: MigrationProof;
}

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

export function treeState(root: string): string {
  const git = (args: string[]) => spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', env: childEnv() });
  const head = (git(['rev-parse', '--short', 'HEAD']).stdout ?? '').trim();
  if (!/^[0-9a-f]{4,40}$/.test(head)) return 'head unknown (git did not report it)';
  const status = git(['status', '--porcelain']);
  if (status.status !== 0) return `head ${head}, tree state unknown (git status failed)`;
  return `head ${head}${(status.stdout ?? '').trim() ? ', dirty' : ''}`;
}

export function evidenceLine(prepared: PreparedStack, lock: StackLock): string {
  const { read, migrations } = prepared;
  return (
    `at:verify — stack ${read.provenProjectId} (api ${new URL(read.status.apiUrl).port}) — reset OK — ` +
    `migrations: ${migrations.expected} expected, ${migrations.applied} applied — lock ${lock.file} — ${treeState(REPO_ROOT)}`
  );
}

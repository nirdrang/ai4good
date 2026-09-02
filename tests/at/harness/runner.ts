/**
 * The AT runner — `bun run at:verify req-0NN --tier <loop|integration|drill>`.
 *
 * The command shape is fixed: all 30 decomposition manifests cite it verbatim in their done
 * contracts, and the skills (`/dev-start`'s inner loop, `/dev-end`, `/pm-done`'s gate) call it.
 * It resolves the requirement's suite, runs it under vitest with the tier passed through
 * `AT_TIER`, and reports PER AT ID — green / red / missing — because "3 failed" tells a gate
 * nothing about which acceptance criterion is unmet.
 *
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
 *   4. print the evidence line — project, api port,
 *      reset, migration counts, lock file, tested commit — so a green can always name the database
 *      it graded;
 *   5. run the suite with an ALLOWLISTED environment — the child gets the platform minimum plus
 *      the proven coordinates, and nothing else, so a secret sitting in a developer's
 *      `.env.local` can never reach a test (and a test can never reach the hosted project).
 *
 * The `drill` tier resolves no database at all until an item decides which stack it should use.
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

import { AT_CONFIG } from './atconfig.ts';
import { INSTALL_ROOT, inspectBijection, normalizeRequirement, REPO_ROOT, suiteDir } from './check.ts';
import {
  expectationDeviations,
  expectedManifestPath,
  loadTierExpectation,
  reportAccountingDeviations,
  type TierExpectation,
} from './expected.ts';

const TIERS = ['loop', 'integration', 'drill'] as const;
type Tier = (typeof TIERS)[number];

const USAGE = 'usage: bun run at:verify req-0NN --tier <loop|integration|drill> [--wired] [--expect]';

/** How long the stack gets to become genuinely ready before the run is called off. */
const READY_TIMEOUT_MS = Number(process.env.AT_READY_TIMEOUT_MS ?? 120_000);
/** How long `supabase db reset` gets before it is assumed wedged and its process tree killed. */
const RESET_TIMEOUT_MS = Number(process.env.AT_RESET_TIMEOUT_MS ?? 600_000);
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
  /** Named `expectDeclared`, not `expect`, so nobody later reads it as vitest's `expect`. */
  expectDeclared: boolean;
}

function parseArgs(argv: string[]): Args {
  let requirement = '';
  let tier = '';
  let wired = false;
  let expectDeclared = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--wired') wired = true;
    else if (arg === '--expect') expectDeclared = true;
    else if (arg === '--tier') tier = argv[++i] ?? '';
    else if (arg.startsWith('--tier=')) tier = arg.slice('--tier='.length);
    else if (arg.startsWith('--')) throw new Error(`unknown option "${arg}"`);
    else if (!requirement) requirement = arg;
    else throw new Error(`unexpected argument "${arg}"`);
  }

  if (!requirement) throw new Error('no requirement given');
  if (!tier) throw new Error('--tier is required — there is no default tier, by design');
  if (!TIERS.includes(tier as Tier)) throw new Error(`unknown tier "${tier}" — expected one of ${TIERS.join('|')}`);
  // Refused here rather than later: `--wired` runs no tests at all, so there would be no report
  // for a declaration to be checked against, and a declaration refusal must never be reported as
  // the wired refusal. A usage error exits 2, which is what a `--expect` command that cannot be
  // honoured is required to do.
  if (wired && expectDeclared) {
    throw new Error('--expect and --wired cannot be combined: --wired runs no tests, so there is no report for a declaration to be checked against');
  }

  return { requirement: normalizeRequirement(requirement), tier: tier as Tier, wired, expectDeclared };
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

/* ---------------------------------------------------------------------- the machine-wide lock */

export interface StackLock {
  file: string;
  release(): void;
}

/**
 * Where the machine-wide claim files live.
 *
 * `AT_LOCK_DIR` overrides it, the same pattern and the same reason as `AT_REPO_ROOT`: a test that
 * exercises the claim protocol must not write into the directory a real run reads, or a selftest
 * and a live `at:verify` could take each other's lock. Unset — every ordinary run — the answer is
 * unchanged.
 */
function lockDir(): string {
  const override = process.env.AT_LOCK_DIR?.trim();
  const dir = override ? override : join(process.env.LOCALAPPDATA ?? process.env.XDG_CACHE_HOME ?? tmpdir(), 'ai4good-build', 'at-locks');
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

export interface Holder {
  pid?: number;
  host?: string;
  requirement?: string;
  startedAt?: string;
  /** Set only on a claim that replaced a dead holder's, so the takeover is recorded IN the claim. */
  tookOverFrom?: { pid?: number; startedAt?: string; requirement?: string };
}

/**
 * THE ONE TAKEOVER RULE: a holder is live while its process is alive, at any age. There is no
 * option and no age window. There used to be a second policy that displaced a LIVE holder after
 * sixty minutes, and it was the default of a call that passed nothing — so a run that legitimately
 * lasted longer than the window could have had its database reset under it. That policy is gone:
 * a dead process id is the only thing that makes a claim displaceable.
 */
function holderIsLive(holder: Holder): boolean {
  return typeof holder.pid === 'number' && processIsAlive(holder.pid);
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
 * holder recorded, takeover of a dead holder's claim.
 *
 * TAKEOVER IS THE WHOLE DIFFICULTY. Two processes can both read the same leftover lock and both
 * conclude its holder is dead; if each then removed it and created its own, the second removal would take
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

  const claim = (displaced?: Holder): StackLock | null => {
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
          // A takeover recorded ONLY on the console is lost the moment the terminal scrolls. The
          // claim file outlives the run that wrote it, so whoever reads it later can see that this
          // occupancy began by displacing an abandoned one, and whose.
          ...(displaced
            ? {
                tookOverFrom: {
                  pid: displaced.pid,
                  startedAt: displaced.startedAt,
                  requirement: displaced.requirement,
                },
              }
            : {}),
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

  /**
   * AN UNIDENTIFIABLE HOLDER IS NEVER TAKEOVER-ELIGIBLE.
   *
   * `readHolder` returns `{}` for a file it cannot read or parse, and `holderIsLive({})` is false —
   * so without this guard a claim file that is empty or half written looks exactly like a dead
   * holder and is deleted. The window is real and small: it is the microseconds between
   * `openSync(file, 'wx')` and the `writeSync` that fills the file, so a second occupier arriving
   * in that instant would remove a LIVE process's brand-new claim. That is the one thing this lock
   * exists to make impossible.
   *
   * One bounded re-read skates over the write window. A holder that STILL has no parseable pid is
   * not a dead holder — it is a file nobody in this process can account for — so it refuses loudly
   * and names the manual repair.
   *
   * Returns the identified holder, or null when the file went away and the loop should retry.
   */
  const identified = (holder: Holder, where: string): Holder | null => {
    if (typeof holder.pid === 'number') return holder;

    pause(50);
    const again = readHolder();
    if (again === null) return null; // released while we looked; the loop takes the free path
    if (typeof again.pid === 'number') return again;

    throw new Error(
      `refusing to take over the claim at ${file}: it names no process id that this run can read, ` +
        `so it cannot be shown to be dead — and a claim file being written right now looks exactly ` +
        `like this. Nothing was taken over. If no run holds that stack, delete ${file} by hand ` +
        `(checked ${where}).`,
    );
  };

  // Bounded: every retry follows another process winning the gate, which cannot repeat forever.
  for (let attempt = 0; attempt < 20; attempt++) {
    const claimed = claim();
    if (claimed) return claimed;

    const read = readHolder();
    if (read === null) continue; // released between the failed claim and the read
    const holder = identified(read, 'before the takeover gate');
    if (holder === null) continue;
    if (holderIsLive(holder)) throw heldByAnotherRun(holder, file);

    // Dead. Enter the takeover gate — the only place the live lock path may be removed.
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
      const readInside = readHolder();
      if (readInside === null) continue; // released while we were entering; the next claim takes it
      // The same guard as above: the gate must not be able to remove an unidentifiable file either.
      const inside = identified(readInside, 'inside the takeover gate');
      if (inside === null) continue;
      if (holderIsLive(inside)) continue; // refreshed under us; the next pass refuses it properly

      rmSync(file, { force: true });
      const takeover = claim(inside);
      if (!takeover) continue; // a third process claimed the free path first — delete nothing more

      console.log(`at:verify — took over a dead holder's stack lock (holder pid ${inside.pid ?? 'unknown'} is no longer running)`);
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
  /**
   * WHERE THE STACK'S OWN MAIL CATCHER ANSWERS, as the stack itself reports it.
   *
   * OPTIONAL, and that is not laziness. The four fields above are REQUIRED because nothing can run
   * without them; a catcher is needed only by a suite that reads mail, and the CLI has renamed this
   * field once already (`INBUCKET_URL` became `MAILPIT_URL` when the catcher changed, and both are
   * emitted today). Making it required would turn a rename into an infrastructure failure for every
   * run, including the ones that never read a message. A suite that DOES need it refuses loudly at
   * its own construction — `live-email.ts` says exactly that — which is where the refusal belongs.
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
 * line `capabilities.ts` draws for its own symbol, and the same mechanism: non-enumerable, so a
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
  return {
    AT_SUPABASE_URL: status.apiUrl,
    AT_SUPABASE_DB_URL: status.dbUrl,
    AT_SUPABASE_ANON_KEY: status.anonKey,
    AT_SUPABASE_SERVICE_ROLE_KEY: status.serviceRoleKey,
    // The catcher URL comes from the stack's own status, so there is one statement of its address.
    ...(status.mailUrl ? { AT_SUPABASE_MAIL_URL: status.mailUrl } : {}),
  };
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

/* --------------------------------------------------------------------------- vitest json shape */

export interface AssertionResult {
  title?: string;
  fullName?: string;
  status?: string;
  failureMessages?: string[];
}

/**
 * The report's own arithmetic, alongside the per-test results. `--expect` needs both: the id
 * parser only sees tests whose titles carry an AT id, so an untagged `it()` that fails is
 * invisible to it and visible in these counts. Optional because this describes a file on disk —
 * a missing field is validated at runtime (see `reportAccountingDeviations`), not asserted here.
 */
interface VitestJson {
  /**
   * One entry per test FILE. `status` and `message` are kept alongside the assertions because a
   * file that fails to import, or whose hook throws, changes no test's status: that failure is
   * visible here and nowhere else in the report.
   */
  testResults?: { name?: string; status?: string; message?: string; assertionResults?: AssertionResult[] }[];
  numTotalTests?: number;
  numPassedTests?: number;
  numFailedTests?: number;
  numPendingTests?: number;
  numTodoTests?: number;
  success?: boolean;
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

  const { requirement, tier, wired, expectDeclared } = args;

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

  // The declaration preflight sits HERE for two reasons, both load-bearing. It needs the
  // acceptance file's P0 id set, which only exists after the bijection preflight above; and every
  // refusal must run NO tests, so it must precede the vitest spawn. Placing it before the stack
  // sequence as well means a bad declaration never takes the machine-wide lock, never talks to
  // Docker and never resets a database — the refusal costs nothing at any tier.
  let expectation: TierExpectation | null = null;
  if (expectDeclared) {
    try {
      expectation = loadTierExpectation(requirement, tier, expected);
    } catch (err) {
      console.error(`at:verify req-${requirement} --tier ${tier} --expect — DECLARATION REFUSED: ${(err as Error).message}`);
      console.error(`No tests were run. The declaration is the contract; fix ${expectedManifestPath(requirement)}.`);
      return 2;
    }
  }

  const infra = (message: string): number => {
    console.error(`at:verify req-${requirement} --tier ${tier} — INFRASTRUCTURE: ${message}`);
    console.error('No tests were run. This is an infrastructure failure, not a test failure.');
    return 3;
  };

  const stackHelp =
    `Two things cause this:\n` +
    `  1. Docker Desktop is not installed, or is installed but not running, or its CLI is not on ` +
    `PATH — the stack is a set of Docker containers and cannot run without it.\n` +
    `  2. Docker is fine but the one stack is not up, or was started before supabase/config.toml ` +
    `last changed: run \`bun run db:stop\` then \`bun run db:start\`.`;

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
    // THE DRILL TIER RESOLVES NO DATABASE. No item has decided which stack drill runs against, and
    // nothing in this tree invokes the tier, so refusing costs nothing. The item that decides
    // drill's stack replaces this.
    if (tier === 'drill') {
      return infra(
        `the drill tier resolves no database: no item has decided which stack drill runs against, ` +
          `so this tier refuses rather than guess. The item that decides drill's stack replaces this.`,
      );
    }

    if (tier === 'integration') {
      // THE DESTRUCTIVE TARGET IS THE REAL CHECKOUT AND NOTHING ELSE. `AT_REPO_ROOT` exists so the
      // runner's own tests can feed it a disposable tree of malformed suites, and bun also loads it
      // out of `.env.local`. A data root must not choose which database is reset, so under a
      // redirect this tier refuses before the lock, before the config read and before any CLI call.
      if (REPO_ROOT !== INSTALL_ROOT) {
        return infra(
          `the integration tier runs only from the real checkout: AT_REPO_ROOT redirects the data root, and a data ` +
            `root must not choose which database is reset (AT_REPO_ROOT names ${REPO_ROOT}; the checkout is ${INSTALL_ROOT}).`,
        );
      }

      // THE ONE STACK, STATED POSITIVELY: the project id this tree's supabase/config.toml declares,
      // at this tree's root. Every CLI call below names it. The reset demands the read that proved
      // it. Every integration run resets this database.
      let config: LocalConfig;
      let target: CliTarget;
      try {
        config = readLocalConfig(REPO_ROOT);
        // THE LIFETIME PIN IS A PREFLIGHT, decided from this file and the registry before the lock:
        // a mispinned tree must not take the machine-wide lock to learn a fact that was true before
        // it started, and the refusal must not wear advice about a stack nothing contacted.
        const pin = lifetimePinProblem(config);
        if (pin) return infra(pin);
        target = { workdir: REPO_ROOT, projectId: config.projectId };
        // The lock goes into the SAME `lock` variable `cleanupRun` releases, before anything else,
        // so the release stays in the one `finally` chain that exists. Its failure is reported on
        // its own: "another run holds this stack" must never be followed by advice to restart it.
        lock = acquireStackLock(config, `req-${requirement}`);
      } catch (err) {
        return infra((err as Error).message);
      }

      try {
        const prepared = await prepareLocalStack(target, config);
        console.log(evidenceLine(prepared, lock));
        Object.assign(stackEnv, childCoordinates(prepared));
      } catch (err) {
        return infra(
          `${(err as Error).message}\n` +
            `The integration tier rebuilds the one stack's database from supabase/migrations on every run, ` +
            `so that a suite never grades leftover rows or a schema missing a migration; if that ` +
            `rebuild fails, the state under test is unknown and the run stops here.\n${stackHelp}`,
        );
      }
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

    if (!expectation) {
      const verdict = runVerdict(rows, unexpected, run as ProcessOutcome);
      if (verdict.length === 0) return 0;
      for (const problem of verdict) console.log(`  FAILURE: ${problem}`);
      return 1;
    }

    // Both deviation sets are computed and printed: an id-level and a report-level problem in the
    // same run are two facts an author needs at once, and printing only the first costs a second
    // run to find the second.
    const deviations = [
      ...expectationDeviations(rows, unexpected, expectation),
      ...reportAccountingDeviations(report, run as ProcessOutcome, expectation),
    ];
    if (deviations.length === 0) {
      console.log(
        `  EXPECTED: the run matches ${expectedManifestPath(requirement)} exactly ` +
          `(${expectation.green.length} declared green, ${Object.keys(expectation.red).length} declared red)`,
      );
      return 0;
    }
    for (const deviation of deviations) console.log(`  DEVIATION: ${deviation}`);
    console.log(
      `  EXPECT FAILURE: ${deviations.length} deviation(s) from the declaration. A red that turned green is a ` +
        `failure too — if reality improved, update the declaration in the same change.`,
    );
    return 1;
  } finally {
    process.off('SIGINT', onSignal);
    process.off('SIGTERM', onSignal);
    cleanup();
  }
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)));

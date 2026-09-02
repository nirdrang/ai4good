/**
 * Tests OF the harness, not tests run BY it.
 *
 * These deliberately live outside `tests/at/suites/` and depend on nothing that AI4DEV-3 has not
 * built yet: no fixtures, no clock, no vendor sims, no `createHarness`. They import the runner's
 * pure pieces and spawn a real child process, so they run today, on a machine with no stack and
 * no Docker. Run them with `bun run at:selftest`.
 *
 * The leak test is the important one: it proves that a secret sitting in this process's
 * environment — which is exactly where bun puts everything in `.env` and `.env.local` — does not
 * reach a child. That property is not visible in a diff, only in a spawned process's own view of
 * its environment, so it is asserted against a real child rather than against the code.
 */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { lifetimeProblem } from '../suites/req-001/_live.ts';
import { AT_CONFIG } from './atconfig.ts';
import { REPO_ROOT } from './check.ts';
import {
  acquireStackLock,
  bunExecutable,
  childCoordinates,
  childEnv,
  cleanupRun,
  configDriftProblems,
  containerNames,
  evidenceLine,
  expectedMigrations,
  identityVerdict,
  lifetimePinProblem,
  localStackProblems,
  migrationSetProblems,
  readLocalConfig,
  redact,
  resetLocalDatabase,
  runVerdict,
  stackLockPath,
  treeState,
  type CliResult,
  type CliTarget,
  type IdRow,
  type LocalConfig,
  type StackStatus,
} from './runner.ts';

/** Names a developer following `.env.example` could plausibly have sitting in `.env.local`. */
const SENTINELS = {
  AT_LEAK_SENTINEL_SERVICE_ROLE: 'sentinel-service-role-value',
  SUPABASE_SERVICE_ROLE_KEY: 'sentinel-hosted-service-role',
  ANTHROPIC_API_KEY: 'sentinel-provider-key',
  STRIPE_SECRET_KEY: 'sentinel-stripe-key',
  // The judge is parked. Its credential still must not reach a child: the allowlist must not
  // pass AT_JUDGE_API_KEY. Named here so the property is proven against a real child rather
  // than read off the allowlist's source.
  AT_JUDGE_API_KEY: 'sentinel-judge-key',
};

describe('the child environment is allowlisted, so credentials cannot leak into a test', () => {
  it('drops planted secrets while keeping the platform minimum', () => {
    for (const [name, value] of Object.entries(SENTINELS)) process.env[name] = value;
    try {
      const env = childEnv({ AT_TIER: 'loop' });
      for (const name of Object.keys(SENTINELS)) expect(env, `${name} survived into the child environment`).not.toHaveProperty(name);
      expect(env.AT_TIER, 'the tier the runner passes deliberately was dropped').toBe('loop');
      const platform = Object.keys(env).map((k) => k.toLowerCase());
      expect(platform, 'PATH was dropped, which would break every child').toContain('path');
    } finally {
      for (const name of Object.keys(SENTINELS)) delete process.env[name];
    }
  });

  it('a REAL child process cannot see them, and does not re-read the env files for itself', () => {
    for (const [name, value] of Object.entries(SENTINELS)) process.env[name] = value;
    let seen: string[];
    try {
      const child = spawnSync(
        // bun, not this process's executable: under vitest the worker is node, and the whole
        // point of the probe is that the CHILD is the kind of process the runner launches.
        bunExecutable(),
        ['--no-env-file', '-e', 'console.log(JSON.stringify(Object.keys(process.env)))'],
        // cwd is the repo root ON PURPOSE: that is where `.env` lives, so this also proves the
        // child does not load it for itself.
        { cwd: REPO_ROOT, env: childEnv({ AT_TIER: 'loop' }), encoding: 'utf8' },
      );
      expect(child.error, 'the probe child could not be launched').toBeUndefined();
      expect(child.status, 'the probe child failed').toBe(0);
      seen = JSON.parse(child.stdout) as string[];
    } finally {
      for (const name of Object.keys(SENTINELS)) delete process.env[name];
    }

    for (const name of Object.keys(SENTINELS)) expect(seen, `${name} reached the child process`).not.toContain(name);
    // Names that exist only in the tracked .env: their presence would mean bun loaded the file.
    for (const name of ['SUPABASE_PROJECT_ID', 'SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_URL']) {
      expect(seen, `${name} reached the child — the env file was loaded`).not.toContain(name);
    }
    expect(seen, 'the child lost the tier it was given').toContain('AT_TIER');
  });
});

describe('a non-zero test process is a failure even when every row is green', () => {
  const green: IdRow[] = [
    { id: 'AT-016.01', status: 'green', detail: '' },
    { id: 'AT-016.02', status: 'green', detail: '' },
  ];

  it('reports the discrepancy rather than success', () => {
    const problems = runVerdict(green, [], { status: 1 });
    expect(problems.length, 'a non-zero vitest exit was treated as success').toBeGreaterThan(0);
    expect(problems.join(' ')).toContain('every id reported green');
  });

  it('treats a launch failure as a failure', () => {
    const problems = runVerdict(green, [], { status: null, error: Object.assign(new Error('spawn EUNKNOWN'), { code: 'EUNKNOWN' }) });
    expect(problems.join(' ')).toContain('could not be launched');
  });

  it('passes only when the rows are green AND the process exited zero', () => {
    expect(runVerdict(green, [], { status: 0 })).toEqual([]);
  });
});

/** A config and a matching status for a stack that is demonstrably local — shared by the checks below and the identity verdict. */
const config: LocalConfig = { projectId: 'demo', apiPort: 54321, dbPort: 54322, jwtExpirySeconds: 120 };
const jwt = (claims: Record<string, unknown>) =>
  `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.` +
  `${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`;

const localStatus = (): StackStatus => ({
  apiUrl: 'http://127.0.0.1:54321',
  dbUrl: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
  anonKey: jwt({ iss: 'supabase-demo', role: 'anon' }),
  serviceRoleKey: jwt({ iss: 'supabase-demo', role: 'service_role' }),
});

/** A `status -o json` result: the JSON on stdout, the CLI's notices on stderr, and the non-zero exit a disabled service causes. */
const cli = (stderr: string, status: StackStatus = localStatus()): CliResult => ({
  status: 1,
  stdout: JSON.stringify({
    API_URL: status.apiUrl,
    DB_URL: status.dbUrl,
    ANON_KEY: status.anonKey,
    SERVICE_ROLE_KEY: status.serviceRoleKey,
    ...(status.mailUrl ? { MAILPIT_URL: status.mailUrl } : {}),
  }),
  stderr,
});

/**
 * A proof, minted the only way one is: a result `identityVerdict` judged. On the live path only
 * `proveTarget` feeds it one; here the result is fabricated, which is the residual `runner.ts`'s
 * brand docstring records.
 */
const demoTarget: CliTarget = { workdir: REPO_ROOT, projectId: 'demo' };
const provenDemo = () => identityVerdict(cli('Stopped services: [supabase_imgproxy_demo supabase_pooler_demo]'), demoTarget, config);

describe('the stack must prove it is local before anything destructive happens', () => {
  it('accepts the local stack', () => {
    expect(localStackProblems(localStatus(), config)).toEqual([]);
  });

  it('checks the mail catcher URL against the config\'s own [local_smtp] port (ruling S1-6)', () => {
    /*
     * The catcher URL travels into the child in `AT_SUPABASE_MAIL_URL` and the live email capability
     * reads mail through it, so it is a coordinate like the others. It used to flow from
     * `supabase status` into the child with nothing looking at it at all.
     */
    const withMail: LocalConfig = { ...config, mailPort: 54324 };
    expect(localStackProblems({ ...localStatus(), mailUrl: 'http://127.0.0.1:54324' }, withMail)).toEqual([]);
    expect(
      localStackProblems({ ...localStatus(), mailUrl: 'http://127.0.0.1:54999' }, withMail).join(' '),
    ).toContain('54324');
    expect(
      localStackProblems({ ...localStatus(), mailUrl: 'http://mail.example.com:54324' }, withMail).join(' '),
    ).toContain('loopback');
    // A REPORTED CATCHER THIS CONFIG CANNOT VOUCH FOR is said plainly rather than skipped.
    expect(localStackProblems({ ...localStatus(), mailUrl: 'http://127.0.0.1:54324' }, config).join(' ')).toContain(
      'no [local_smtp] port',
    );
    // And a stack that reports no catcher at all is not a failure — a suite that needs one refuses
    // at its own construction, which is where that refusal belongs.
    expect(localStackProblems(localStatus(), withMail)).toEqual([]);
  });

  it('refuses a hosted host, a wrong port, and a hosted-issued key', () => {
    expect(localStackProblems({ ...localStatus(), apiUrl: 'https://poancmeitlmxejofwzuu.supabase.co' }, config).join(' ')).toContain('loopback');
    expect(localStackProblems({ ...localStatus(), dbUrl: 'postgresql://postgres:postgres@127.0.0.1:5432/postgres' }, config).join(' ')).toContain('54322');
    const hosted = jwt({ iss: 'supabase', role: 'service_role', ref: 'poancmeitlmxejofwzuu' });
    const problems = localStackProblems({ ...localStatus(), serviceRoleKey: hosted }, config).join(' ');
    expect(problems).toContain('local development issuer');
    expect(problems).toContain('hosted project reference');
  });
});

describe('the container names in CLI output are the identity instrument', () => {
  it('own is a suffix match on the project id, foreign is everything else, one scan, both deduplicated', () => {
    const text =
      'Stopped services: [supabase_imgproxy_demo supabase_pooler_demo]\n' +
      'No such container: supabase_db_other\nNo such container: supabase_db_other';
    expect(containerNames(text, 'demo')).toEqual({
      own: ['supabase_imgproxy_demo', 'supabase_pooler_demo'],
      foreign: ['supabase_db_other'],
    });
    // The suffix is `_<project id>`, so an id that merely ENDS with this one is not this one.
    expect(containerNames('No such container: supabase_db_notdemo', 'demo')).toEqual({ own: [], foreign: ['supabase_db_notdemo'] });
    // No name at all is no evidence either way — the verdict below is what turns that into a refusal.
    expect(containerNames('', 'demo')).toEqual({ own: [], foreign: [] });
    expect(containerNames('nothing that names a container', 'demo')).toEqual({ own: [], foreign: [] });
  });

  it('reads a name that ends a sentence without its punctuation, so an own container is never reported as foreign', () => {
    // The tail of the pattern is anchored on an alphanumeric. Before that, `supabase_db_demo.`
    // matched with the period attached, failed the suffix test, and was reported as ANOTHER
    // project's container — the loudest possible false alarm, naming the project's own container
    // as evidence against it.
    expect(
      containerNames('No such container: supabase_db_demo. Stopped: supabase_pooler_demo, then supabase_db_other;', 'demo'),
    ).toEqual({ own: ['supabase_db_demo', 'supabase_pooler_demo'], foreign: ['supabase_db_other'] });
  });
});

describe("the identity verdict proves the target from the CLI's own container names", () => {
  it('proves the project on own names plus a local status, and carries the target it judged', () => {
    const read = provenDemo();
    expect(read.provenProjectId).toBe('demo');
    expect(read.status.apiUrl).toBe('http://127.0.0.1:54321');
    expect(read.containers).toEqual(['supabase_imgproxy_demo', 'supabase_pooler_demo']);
    // THE TARGET TRAVELS IN THE READ: the reset takes the read and nothing else, so there is no
    // second parameter for a caller to aim somewhere the read did not prove.
    expect(read.target).toEqual(demoTarget);
    expect(read.target.projectId).toBe(read.provenProjectId);
  });

  it('refuses a foreign name BEFORE parsing, so a mismatch is never reported as a stopped service or as no stack', () => {
    // stdout is deliberately not JSON: a verdict that parsed first would report "no stack is
    // running" here instead of the foreign name, and the order is the property under test.
    const hybrid: CliResult = { status: 1, stdout: 'not json at all', stderr: 'No such container: supabase_db_other' };
    expect(() => identityVerdict(hybrid, demoTarget, config)).toThrow(/REFUSING TO RESET demo: .*named supabase_db_other/);
    expect(() => identityVerdict(hybrid, demoTarget, config)).toThrow(/Nothing was done/);
  });

  it('reports a stack that answers no JSON as NOT RUNNING, with the command to run — never as a refusal', () => {
    // "Forgot to run db:start" is the most frequent way this path fails. It is not an identity
    // mismatch, and a safety phrase that fires on routine operator error stops being read.
    const silent: CliResult = { status: 1, stdout: '', stderr: 'supabase start is not running.' };
    expect(() => identityVerdict(silent, demoTarget, config)).toThrow(/no stack is running for demo; run `bun run db:start`/);
    expect(() => identityVerdict(silent, demoTarget, config)).not.toThrow(/REFUSING/);
    // A CLI that could not be launched is not an identity mismatch either: nothing answered, so
    // nothing was judged, and the message says so without the refusal phrase.
    const unlaunched: CliResult = { status: null, stdout: '', stderr: '', error: Object.assign(new Error('spawn ENOENT'), { code: 'ENOENT' }) };
    expect(() => identityVerdict(unlaunched, demoTarget, config)).toThrow(/could not be launched to read the identity of demo/);
    expect(() => identityVerdict(unlaunched, demoTarget, config)).not.toThrow(/REFUSING/);
  });

  it('refuses an output that names no own container at all, naming the benign cause: ports alone are not identity', () => {
    // Every local check passes on this result — right ports, loopback, locally issued keys — and
    // that is exactly the shape the 2026-08-09 hybrid wore. Absence of contrary evidence is not
    // identity. The refusal also names the one benign way to reach it — a config that enables
    // both imgproxy and the pooler prints no "Stopped services" line — so an operator is not sent
    // hunting for a hybrid stack that does not exist.
    expect(() => identityVerdict(cli(''), demoTarget, config)).toThrow(/REFUSING TO RESET demo: .*ports alone are not identity/);
    expect(() => identityVerdict(cli(''), demoTarget, config)).toThrow(/imgproxy and the pooler/);
  });

  it('refuses a status that fails the local checks, naming the check and never the value', () => {
    const wrongPort: StackStatus = { ...localStatus(), apiUrl: 'http://127.0.0.1:54999' };
    const result = cli('Stopped services: [supabase_imgproxy_demo supabase_pooler_demo]', wrongPort);
    expect(() => identityVerdict(result, demoTarget, config)).toThrow(/REFUSING TO RESET demo: .*API_URL port is not the 54321/);
    expect(() => identityVerdict(result, demoTarget, config)).not.toThrow(/54999/);
  });
});

describe('a proof is sealed: the brand does not travel through a spread, and the read cannot be re-aimed', () => {
  // THE SPREAD IS THE HONEST MISTAKE. TypeScript keeps a symbol-keyed member in a spread TYPE, so
  // `{ ...read, target: other }` compiles as a `StackIdentityRead` with no cast anywhere. So the
  // brand is set NON-ENUMERABLE — a spread or `Object.assign` copies the fields and not the brand —
  // and the reset reads the brand at use. Nothing is spawned here: the refusal is the reset's first
  // statement.
  it('a spread carries the fields and not the brand, and the reset refuses it before anything is spawned', async () => {
    const read = provenDemo();
    expect(Object.getOwnPropertySymbols(read), 'the minted read carries no brand').toHaveLength(1);
    const copy = { ...read };
    expect(Object.getOwnPropertySymbols(copy), 'the brand travelled through a spread').toHaveLength(0);
    expect(copy.provenProjectId, 'the spread lost the fields too, which is not the property under test').toBe('demo');
    await expect(resetLocalDatabase({ ...read, target: { workdir: REPO_ROOT, projectId: 'other' } })).rejects.toThrow(
      /REFUSING TO RESET other: .*carries no proof/,
    );
  });

  it('the read, its target, its status and its container list are frozen', () => {
    const read = provenDemo();
    expect(Object.isFrozen(read)).toBe(true);
    expect(Object.isFrozen(read.target)).toBe(true);
    expect(Object.isFrozen(read.status)).toBe(true);
    expect(Object.isFrozen(read.containers)).toBe(true);
    // ES modules are strict, so a write to a frozen object throws rather than silently doing nothing.
    expect(() => {
      (read as { provenProjectId: string }).provenProjectId = 'other';
    }).toThrow(TypeError);
  });
});

describe('the config the lock and the first proof were judged against must still be the file at the second read', () => {
  it('refuses a changed project id, port or lifetime, naming the field and both values', () => {
    const locked: LocalConfig = { ...config, mailPort: 54324 };
    expect(configDriftProblems(locked, { ...locked })).toEqual([]);
    expect(configDriftProblems(locked, { ...locked, projectId: 'other' }).join(' ')).toMatch(/project_id.*demo.*other/);
    expect(configDriftProblems(locked, { ...locked, apiPort: 54999 }).join(' ')).toContain('[api] port');
    expect(configDriftProblems(locked, { ...locked, dbPort: 54999 }).join(' ')).toContain('[db] port');
    expect(configDriftProblems(locked, { ...locked, jwtExpirySeconds: 3600 }).join(' ')).toContain('[auth] jwt_expiry');
    // A catcher port that disappears is a change too: the coordinates the child receives depend on it.
    expect(configDriftProblems(locked, config).join(' ')).toContain('[local_smtp] port');
  });
});

describe('the access-token lifetime is pinned once: config.toml and the registry must agree', () => {
  it("reads [auth] jwt_expiry from this tree's config, and it equals the registry entry", () => {
    // The two literals — `jwt_expiry` in supabase/config.toml and `accessTokenLifetimeSeconds` in
    // atconfig.ts — used to be joined by prose alone. This is the check that joins them, and it
    // runs at the loop tier, in CI, where no stack exists.
    const real = readLocalConfig();
    expect(real.jwtExpirySeconds).toBe(AT_CONFIG.accessTokenLifetimeSeconds.value);
    expect(lifetimePinProblem(real)).toBeNull();
  });

  it('refuses a config whose lifetime differs from the registry, naming both numbers', () => {
    const pinned = AT_CONFIG.accessTokenLifetimeSeconds.value;
    const wrong = pinned * 30;
    const problem = lifetimePinProblem({ ...config, jwtExpirySeconds: wrong });
    expect(problem).toContain(`jwt_expiry = ${wrong}`);
    expect(problem).toContain(`accessTokenLifetimeSeconds = ${pinned}`);
    expect(problem).toContain('bun run db:start');
  });
});

describe('the live adapter holds the running stack to the pinned lifetime EXACTLY', () => {
  it('accepts the pinned number and refuses every other, one second either side included, naming both', () => {
    // `exp` and `iat` come from the same token, so no clock enters the subtraction and there is
    // nothing to tolerate. A five-second tolerance used to accept 115 through 125 as "the same".
    const pinned = AT_CONFIG.accessTokenLifetimeSeconds.value;
    const token = (lifetime: number) => jwt({ iat: 1_700_000_000, exp: 1_700_000_000 + lifetime });
    expect(lifetimeProblem(token(pinned), pinned)).toBeNull();
    for (const issued of [pinned - 1, pinned + 1, pinned + 5, 3600]) {
      const problem = lifetimeProblem(token(issued), pinned);
      expect(problem, `a ${issued}-second lifetime passed against a pin of ${pinned}`).toContain(`${issued}-second`);
      expect(problem).toContain(`jwt_expiry = ${pinned}`);
      expect(problem).toContain('bun run db:start');
    }
    expect(lifetimeProblem(jwt({ sub: 'no lifetime claims' }), pinned), 'a token with no exp and iat passed').not.toBeNull();
  });
});

describe('what reaches the child, and what the evidence line claims', () => {
  const migrations = { expected: 3, applied: 3 };

  it('emits the four coordinates without a catcher, and the five AT_SUPABASE_* names with one', () => {
    const without = childCoordinates({ read: provenDemo(), migrations });
    expect(Object.keys(without).sort()).toEqual(
      ['AT_SUPABASE_ANON_KEY', 'AT_SUPABASE_DB_URL', 'AT_SUPABASE_SERVICE_ROLE_KEY', 'AT_SUPABASE_URL'].sort(),
    );
    expect(without.AT_SUPABASE_URL).toBe('http://127.0.0.1:54321');

    // The catcher URL is the one coordinate that is dropped silently when the status carries none —
    // and its absence surfaces three assertions later as "no confirmation email arrived".
    const withMail: LocalConfig = { ...config, mailPort: 54324 };
    const read = identityVerdict(
      cli('Stopped services: [supabase_imgproxy_demo supabase_pooler_demo]', { ...localStatus(), mailUrl: 'http://127.0.0.1:54324' }),
      demoTarget,
      withMail,
    );
    const withCatcher = childCoordinates({ read, migrations });
    expect(Object.keys(withCatcher).sort()).toEqual(
      [
        'AT_SUPABASE_ANON_KEY',
        'AT_SUPABASE_DB_URL',
        'AT_SUPABASE_MAIL_URL',
        'AT_SUPABASE_SERVICE_ROLE_KEY',
        'AT_SUPABASE_URL',
      ].sort(),
    );
    expect(withCatcher.AT_SUPABASE_MAIL_URL).toBe('http://127.0.0.1:54324');
  });

  it('the evidence line names the project, the api port that answered, both migration counts, the lock and the head', () => {
    const lock = { file: join(tmpdir(), 'at-verify-demo-54321.lock'), release: () => undefined };
    const line = evidenceLine({ read: provenDemo(), migrations: { expected: 3, applied: 2 } }, lock);
    expect(line).toContain('stack demo (api 54321)');
    expect(line).toContain('reset OK');
    expect(line).toContain('3 expected, 2 applied');
    expect(line).toContain(lock.file);
    // The line reads git, so it is not the pure formatter it looks like; this is the real tree's head.
    expect(line).toMatch(/head [0-9a-f]{4,40}/);
  });

  it('the tree state says "head unknown" when git reports nothing, rather than inventing a hash', () => {
    expect(treeState(join(tmpdir(), `at-no-such-tree-${process.pid}-${Date.now()}`))).toBe('head unknown (git did not report it)');
  });
});

describe('the integration tier runs only from the real checkout', () => {
  it('refuses when AT_REPO_ROOT redirects the data root — before the lock, the config read and any CLI call', () => {
    // A COMPLETE disposable tree, so both preflights PASS and the refusal under test is the first
    // thing the integration branch says, rather than a bijection error standing in front of it.
    // Nothing else is planted: no supabase/config.toml, so a runner that read the config before
    // refusing would say "config.toml" instead, and a lock directory that does not exist
    // afterwards proves the lock was never reached.
    const root = mkdtempSync(join(tmpdir(), 'at-data-root-'));
    try {
      mkdirSync(join(root, '.taskmaster', 'docs', 'acceptance'), { recursive: true });
      writeFileSync(join(root, '.taskmaster', 'docs', 'acceptance', 'at-req-999.md'), '- AT-999.01 (P0) — a probe criterion\n');
      mkdirSync(join(root, 'tests', 'at', 'suites', 'req-999'), { recursive: true });
      writeFileSync(join(root, 'tests', 'at', 'suites', 'req-999', 'probe.test.ts'), "atTest('AT-999.01', 'a probe', async () => {});\n");

      const run = spawnSync(
        bunExecutable(),
        ['--no-env-file', fileURLToPath(new URL('./runner.ts', import.meta.url)), 'req-999', '--tier', 'integration'],
        { cwd: REPO_ROOT, env: childEnv({ AT_REPO_ROOT: root, AT_LOCK_DIR: join(root, 'locks') }), encoding: 'utf8' },
      );
      expect(run.error, 'the runner could not be launched').toBeUndefined();
      expect(run.status, `the runner did not refuse as infrastructure; stderr was:\n${run.stderr}`).toBe(3);
      expect(run.stderr).toContain('the integration tier runs only from the real checkout');
      expect(run.stderr).toContain('a data root must not choose which database is reset');
      expect(run.stderr).toContain('No tests were run');
      expect(run.stderr, 'the config was read before the refusal').not.toContain('config.toml');
      expect(existsSync(join(root, 'locks')), 'the lock directory was created, so the lock was reached').toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 30_000);
});

describe('the lifetime pin is a preflight: decidable from two files on disk, so it refuses before the lock', () => {
  it('exits 3 naming both numbers, creates no lock file, and carries no stack advice', () => {
    // THE REAL TREE'S config.toml IS EDITED AND RESTORED, the way the migrations selftest plants a
    // file in the real tree: the integration tier refuses every other root before it reads a config,
    // so the only config this runner can read is this one. The edit is one number on one line; the
    // restore is byte-exact and asserted.
    const file = join(REPO_ROOT, 'supabase', 'config.toml');
    const original = readFileSync(file);
    const text = original.toString('utf8');
    const pinned = AT_CONFIG.accessTokenLifetimeSeconds.value;
    const wrong = pinned * 30;
    const edited = text.replace(/^(jwt_expiry\s*=\s*)\d+/m, `$1${wrong}`);
    expect(edited, 'the config has no [auth] jwt_expiry line to edit').not.toBe(text);
    const root = mkdtempSync(join(tmpdir(), 'at-pin-preflight-'));
    try {
      writeFileSync(file, edited);
      const run = spawnSync(
        bunExecutable(),
        ['--no-env-file', fileURLToPath(new URL('./runner.ts', import.meta.url)), 'req-001', '--tier', 'integration'],
        { cwd: REPO_ROOT, env: childEnv({ AT_LOCK_DIR: join(root, 'locks') }), encoding: 'utf8' },
      );
      expect(run.error, 'the runner could not be launched').toBeUndefined();
      expect(run.status, `the runner did not refuse as infrastructure; stderr was:\n${run.stderr}`).toBe(3);
      expect(run.stderr).toContain(`jwt_expiry = ${wrong}`);
      expect(run.stderr).toContain(`accessTokenLifetimeSeconds = ${pinned}`);
      expect(run.stderr).toContain('No tests were run');
      expect(run.stderr, 'the refusal wears the stack advice, so it ran inside the stack sequence').not.toContain('Docker');
      expect(existsSync(join(root, 'locks')), 'the lock directory was created, so the lock was reached').toBe(false);
    } finally {
      writeFileSync(file, original);
      rmSync(root, { recursive: true, force: true });
    }
    expect(readFileSync(file).equals(original), 'the config was not restored byte for byte').toBe(true);
  }, 30_000);
});

describe('nothing key-shaped is ever printed', () => {
  it('redacts JWTs, publishable keys, long tokens and connection-string credentials', () => {
    const jwtish = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.c2lnbmF0dXJl';
    expect(redact(`token=${jwtish}`)).not.toContain(jwtish);
    expect(redact('key=sb_secret_abcdefghijklmnop')).not.toContain('sb_secret_abcdefghijklmnop');
    expect(redact('postgresql://postgres:hunter2@127.0.0.1:54322/postgres')).not.toContain('hunter2');
  });
});

describe('taking over a dead holder\'s lock is atomic — one owner, never two — and a live holder is never displaced', () => {
  /** A key of its own, so nothing here can disturb a real stack's lock. */
  const testConfig = (): LocalConfig => ({
    projectId: `selftest-${Math.random().toString(36).slice(2, 10)}`,
    apiPort: 1,
    dbPort: 2,
    jwtExpirySeconds: 120,
  });

  const plantLock = (config: LocalConfig, holder: Record<string, unknown>) => {
    writeFileSync(stackLockPath(config), JSON.stringify(holder));
  };
  /** A claim file exactly as it looks mid-write, or after a crash: present, and saying nothing. */
  const plantRawLock = (config: LocalConfig, text: string) => {
    writeFileSync(stackLockPath(config), text);
  };
  const scrub = (config: LocalConfig) => rmSync(stackLockPath(config), { force: true });

  it('takes over a lock whose holder is gone', () => {
    const config = testConfig();
    plantLock(config, { pid: 999_999, host: 'gone', requirement: 'req-000', startedAt: new Date().toISOString() });
    try {
      const lock = acquireStackLock(config, 'req-016');
      expect(JSON.parse(readFileSync(lock.file, 'utf8')).pid, 'the takeover did not record this process as the holder').toBe(process.pid);
      lock.release();
      expect(existsSync(lock.file), 'release left the lock behind').toBe(false);
    } finally {
      scrub(config);
    }
  });

  it('refuses a live, fresh holder', () => {
    const config = testConfig();
    plantLock(config, { pid: process.pid, host: 'here', requirement: 'req-000', startedAt: new Date().toISOString() });
    try {
      expect(() => acquireStackLock(config, 'req-016')).toThrow(/another at:verify run holds this stack/);
    } finally {
      scrub(config);
    }
  });

  it('never takes over a LIVE holder, at any age, and names it — there is no age rule and no option', () => {
    const config = testConfig();
    // Alive (this very process) and two days old. There used to be a second policy that displaced
    // a live holder older than an hour, and it was the DEFAULT of a call that passed no option.
    // Dead-pid-only is now the only behaviour: a run that legitimately lasts longer than any
    // window must not have its database reset under it, and no caller can opt into the other rule.
    plantLock(config, {
      pid: process.pid,
      host: 'here',
      requirement: 'req-000',
      startedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    });
    try {
      expect(() => acquireStackLock(config, 'req-016')).toThrow(new RegExp(`another at:verify run holds this stack \\(pid ${process.pid}`));
    } finally {
      scrub(config);
    }
  });

  it('never takes over a claim file it cannot identify, and leaves it in place (ruling T1)', () => {
    const config = testConfig();
    // AN EMPTY FILE IS WHAT A LIVE CLAIM LOOKS LIKE MID-WRITE. The exclusive create and the write
    // that fills it are two acts, and between them the file exists and says nothing. That must
    // NEVER read as a dead holder: taking it over would delete a live run's brand-new claim, which
    // is the one thing this lock exists to make impossible.
    for (const planted of ['', '   \n', '{"pid":', 'not json at all']) {
      plantRawLock(config, planted);
      try {
        expect(() => acquireStackLock(config, 'req-016'), `a claim file containing ${JSON.stringify(planted)} was taken over`).toThrow(
          /names no process id that this run can read/,
        );
        expect(() => acquireStackLock(config, 'req-016')).toThrow(stackLockPath(config));
        expect(existsSync(stackLockPath(config)), 'the refusal deleted the file it could not identify').toBe(true);
      } finally {
        scrub(config);
      }
    }
  }, 30_000);

  it('two contenders racing for ONE dead holder\'s lock end with exactly one owner', async () => {
    const config = testConfig();
    // Dead by pid, which is the only thing that makes a holder displaceable.
    plantLock(config, {
      pid: 999_999,
      host: 'gone',
      requirement: 'req-000',
      startedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    });

    const runnerUrl = new URL('./runner.ts', import.meta.url).href;
    const startAt = Date.now() + 600;
    const contender = (): Promise<string> => {
      const code =
        `const { acquireStackLock } = await import(${JSON.stringify(runnerUrl)});\n` +
        `const config = ${JSON.stringify(JSON.stringify(config))};\n` +
        `while (Date.now() < ${startAt}) {}\n` + // a barrier, so both attempt at the same instant
        `try {\n` +
        `  const lock = acquireStackLock(JSON.parse(config), 'req-016');\n` +
        `  console.log('ACQUIRED');\n` +
        `  await Bun.sleep(500);\n` + // hold it, so the loser meets a LIVE holder
        `  lock.release();\n` +
        `} catch { console.log('REFUSED'); }\n`;
      // spawn, NOT spawnSync: a synchronous spawn would run the two contenders one after the
      // other, and the second would find the lock already released — a race that never raced.
      return new Promise<string>((resolve) => {
        const child = spawn(bunExecutable(), ['--no-env-file', '-e', code], { stdio: ['ignore', 'pipe', 'pipe'] });
        let out = '';
        child.stdout.on('data', (chunk: Buffer) => (out += chunk.toString('utf8')));
        child.stderr.on('data', (chunk: Buffer) => (out += chunk.toString('utf8')));
        child.once('error', (err) => resolve(`ERROR ${err.message}`));
        child.once('close', () => resolve(out));
      });
    };

    // Started together; the in-child barrier is what makes them collide, not the spawn timing.
    const [a, b] = await Promise.all([contender(), contender()]);
    const outcomes = [a, b].map((out) => (out.includes('ACQUIRED') ? 'ACQUIRED' : out.includes('REFUSED') ? 'REFUSED' : `UNKNOWN(${out.trim()})`));

    try {
      expect(outcomes.filter((o) => o === 'ACQUIRED'), `outcomes were ${JSON.stringify(outcomes)}`).toHaveLength(1);
      expect(outcomes.filter((o) => o === 'REFUSED'), `outcomes were ${JSON.stringify(outcomes)}`).toHaveLength(1);
      expect(existsSync(stackLockPath(config)), 'the winner did not release its lock').toBe(false);
    } finally {
      scrub(config);
    }
  }, 60_000);
});

describe('the stack lock is released even when the report directory cannot be removed', () => {
  it('reports the cleanup failure and releases anyway', () => {
    let released = false;
    // A path containing a NUL byte cannot be removed and cannot be swallowed by `force`.
    cleanupRun('C:\\at-verify\0broken', { release: () => (released = true) });
    expect(released, 'a failing report cleanup stranded the stack lock').toBe(true);
  });
});

describe('the rebuild is proven against the migration set, and an empty set is visible', () => {
  it('accepts an exact match, including the empty set', () => {
    expect(migrationSetProblems([], [])).toEqual([]);
    expect(migrationSetProblems(['20260101000000'], ['20260101000000'])).toEqual([]);
  });

  it('refuses a migration that was never applied, and one applied from nowhere', () => {
    expect(migrationSetProblems(['20260101000000'], []).join(' ')).toContain('never applied: 20260101000000');
    expect(migrationSetProblems([], ['20260101000000']).join(' ')).toContain('applied but not in supabase/migrations: 20260101000000');
  });

  // THE BASELINE IS OBSERVED, NEVER HARD-CODED, and that is what keeps this test true as the
  // repository grows. It once asserted `toEqual([])`, which encoded "this repository has no
  // migrations" as an invariant of the harness; the first product migration made it permanently
  // false and the failure looked like a defect in the migration rather than in this line. Naming
  // the current filenames instead would break again on the next migration and teach the next
  // author to relax the assertion. So: read the baseline, and assert the PROPERTIES this test is
  // named for — every entry is a bare fourteen-digit timestamp (which neither `.gitkeep` nor
  // `README.md` can produce, so their exclusion is what that proves), a planted file adds exactly
  // its own id, and removing it returns the answer exactly to the baseline.
  it('reads timestamped .sql files and ignores .gitkeep and README.md', () => {
    // Asserted so the title cannot pass vacuously: with these two files deleted, "ignores them" is
    // a claim about nothing.
    expect(existsSync(`${REPO_ROOT}/supabase/migrations/.gitkeep`), 'the .gitkeep this test claims to ignore is not there').toBe(true);
    expect(existsSync(`${REPO_ROOT}/supabase/migrations/README.md`), 'the README.md this test claims to ignore is not there').toBe(true);

    const baseline = expectedMigrations();
    for (const id of baseline) {
      expect(id, `${JSON.stringify(id)} is not a bare 14-digit timestamp, so a non-migration file is being counted`).toMatch(/^\d{14}$/);
    }

    const planted = `${REPO_ROOT}/supabase/migrations/20260101000000_selftest_probe.sql`;
    try {
      writeFileSync(planted, '-- selftest probe\n');
      expect(expectedMigrations(), 'planting one .sql file changed the answer by something other than its own id').toEqual(
        [...baseline, '20260101000000'].sort(),
      );
    } finally {
      rmSync(planted, { force: true });
    }
    expect(expectedMigrations(), 'removing the planted file did not return the answer to the baseline').toEqual(baseline);
  });
});

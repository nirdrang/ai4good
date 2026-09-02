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
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { REPO_ROOT } from './check.ts';
import {
  acquireStackLock,
  bunExecutable,
  childEnv,
  cleanupRun,
  expectedMigrations,
  foreignContainerNames,
  identityVerdict,
  localStackProblems,
  migrationSetProblems,
  ownContainerNames,
  redact,
  resetLocalDatabase,
  runVerdict,
  stackLockPath,
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
  // The semantic oracle's judge credential (AI4DEV-20). It is documented parent-side-only and the
  // allowlist has never carried it — but "has never carried it" was a fact about a list nobody
  // asserted, and the harm if it changed is a test process able to bill a provider. Named here so
  // the property is PROVEN against a real child rather than read off the allowlist's source.
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
const config: LocalConfig = { projectId: 'demo', apiPort: 54321, dbPort: 54322 };
const jwt = (claims: Record<string, unknown>) =>
  `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.` +
  `${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`;

const localStatus = (): StackStatus => ({
  apiUrl: 'http://127.0.0.1:54321',
  dbUrl: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
  anonKey: jwt({ iss: 'supabase-demo', role: 'anon' }),
  serviceRoleKey: jwt({ iss: 'supabase-demo', role: 'service_role' }),
});

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
  it('own is a suffix match on the project id, foreign is everything else, both deduplicated', () => {
    const text =
      'Stopped services: [supabase_imgproxy_demo supabase_pooler_demo]\n' +
      'No such container: supabase_db_other\nNo such container: supabase_db_other';
    expect(ownContainerNames(text, 'demo')).toEqual(['supabase_imgproxy_demo', 'supabase_pooler_demo']);
    expect(foreignContainerNames(text, 'demo')).toEqual(['supabase_db_other']);
    // The suffix is `_<project id>`, so an id that merely ENDS with this one is not this one.
    expect(ownContainerNames('No such container: supabase_db_notdemo', 'demo')).toEqual([]);
    expect(foreignContainerNames('No such container: supabase_db_notdemo', 'demo')).toEqual(['supabase_db_notdemo']);
    // No name at all is no evidence either way — the verdict below is what turns that into a refusal.
    expect(ownContainerNames('', 'demo')).toEqual([]);
    expect(foreignContainerNames('nothing that names a container', 'demo')).toEqual([]);
  });
});

describe("the identity verdict proves the target from the CLI's own container names", () => {
  const target: CliTarget = { workdir: REPO_ROOT, projectId: 'demo' };
  /** A `status -o json` result: the JSON on stdout, the CLI's notices on stderr, and the non-zero exit a disabled service causes. */
  const cli = (stderr: string, status: StackStatus = localStatus()): CliResult => ({
    status: 1,
    stdout: JSON.stringify({ API_URL: status.apiUrl, DB_URL: status.dbUrl, ANON_KEY: status.anonKey, SERVICE_ROLE_KEY: status.serviceRoleKey }),
    stderr,
  });

  it('proves the project on own names plus a local status', () => {
    const read = identityVerdict(cli('Stopped services: [supabase_imgproxy_demo supabase_pooler_demo]'), target, config);
    expect(read.provenProjectId).toBe('demo');
    expect(read.status.apiUrl).toBe('http://127.0.0.1:54321');
    expect(read.containers).toEqual(['supabase_imgproxy_demo', 'supabase_pooler_demo']);
  });

  it('refuses a foreign name BEFORE parsing, so a mismatch is never reported as a stopped service', () => {
    // stdout is deliberately not JSON: a verdict that parsed first would report "no JSON" here
    // instead of the foreign name, and the order is the property under test.
    const hybrid: CliResult = { status: 1, stdout: 'not json at all', stderr: 'No such container: supabase_db_other' };
    expect(() => identityVerdict(hybrid, target, config)).toThrow(/REFUSING TO RESET demo: .*named supabase_db_other/);
    expect(() => identityVerdict(hybrid, target, config)).toThrow(/Nothing was done/);
  });

  it('refuses an output that names no own container at all: ports alone are not identity', () => {
    // Every local check passes on this result — right ports, loopback, locally issued keys — and
    // that is exactly the shape the 2026-08-09 hybrid wore. Absence of contrary evidence is not identity.
    expect(() => identityVerdict(cli(''), target, config)).toThrow(/REFUSING TO RESET demo: .*ports alone are not identity/);
  });

  it('refuses a status that fails the local checks, naming the check and never the value', () => {
    const wrongPort: StackStatus = { ...localStatus(), apiUrl: 'http://127.0.0.1:54999' };
    const result = cli('Stopped services: [supabase_imgproxy_demo supabase_pooler_demo]', wrongPort);
    expect(() => identityVerdict(result, target, config)).toThrow(/REFUSING TO RESET demo: .*API_URL port is not the 54321/);
    expect(() => identityVerdict(result, target, config)).not.toThrow(/54999/);
  });
});

describe('a reset aimed at a target demands the identity read that proved that target (ruling B2)', () => {
  // NOTHING IS SPAWNED HERE. The refusal is the first statement in the function, so a mismatched
  // proof never reaches the CLI. That is the property under test: the refusal happens BEFORE the
  // destructive act, not instead of a failure inside it.
  const target: CliTarget = { workdir: REPO_ROOT, projectId: 'ai4good-slot-2' };

  // A proof that names NO project is not a runtime case any more: `provenProjectId` is a string,
  // so the compiler refuses it before this file could.
  it('refuses a proof that names another project', async () => {
    await expect(resetLocalDatabase(target, { provenProjectId: 'ai4good-slot-1' })).rejects.toThrow(
      /REFUSING TO RESET ai4good-slot-2: .*proves ai4good-slot-1, not ai4good-slot-2/,
    );
  });
});

describe('nothing key-shaped is ever printed', () => {
  it('redacts JWTs, publishable keys, long tokens and connection-string credentials', () => {
    const jwtish = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.c2lnbmF0dXJl';
    expect(redact(`token=${jwtish}`)).not.toContain(jwtish);
    expect(redact('key=sb_secret_abcdefghijklmnop')).not.toContain('sb_secret_abcdefghijklmnop');
    expect(redact('postgresql://postgres:hunter2@127.0.0.1:54322/postgres')).not.toContain('hunter2');
  });
});

describe('taking over a stale lock is atomic — one owner, never two', () => {
  /** A key of its own, so nothing here can disturb a real stack's lock. */
  const testConfig = (): LocalConfig => ({ projectId: `selftest-${Math.random().toString(36).slice(2, 10)}`, apiPort: 1, dbPort: 2 });

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

  it('under dead-pid-only, never takes over a LIVE holder, at any age, and names it', () => {
    const config = testConfig();
    // Alive (this very process) and old enough that the stale-or-dead policy would displace it.
    // The integration tier passes dead-pid-only, so it must not: a run that legitimately lasts
    // longer than the stale window must not have its database reset under it.
    plantLock(config, {
      pid: process.pid,
      host: 'here',
      requirement: 'req-000',
      startedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    });
    try {
      expect(() => acquireStackLock(config, 'req-016', { takeover: 'dead-pid-only' })).toThrow(
        new RegExp(`another at:verify run holds this stack \\(pid ${process.pid}`),
      );
    } finally {
      scrub(config);
    }
  });

  it('under dead-pid-only, never takes over a claim file it cannot identify, and leaves it in place (ruling T1)', () => {
    const config = testConfig();
    // AN EMPTY FILE IS WHAT A LIVE CLAIM LOOKS LIKE MID-WRITE. The exclusive create and the write
    // that fills it are two acts, and between them the file exists and says nothing. Under
    // dead-pid-only that must NEVER read as a dead holder: taking it over would delete a live
    // run's brand-new claim, which is the one thing this policy exists to make impossible.
    for (const planted of ['', '   \n', '{"pid":', 'not json at all']) {
      plantRawLock(config, planted);
      try {
        expect(() => acquireStackLock(config, 'req-016', { takeover: 'dead-pid-only' }), `a claim file containing ${JSON.stringify(planted)} was taken over`).toThrow(
          /names no process id that this run can read/,
        );
        expect(() => acquireStackLock(config, 'req-016', { takeover: 'dead-pid-only' })).toThrow(stackLockPath(config));
        expect(existsSync(stackLockPath(config)), 'the refusal deleted the file it could not identify').toBe(true);
      } finally {
        scrub(config);
      }
    }
  }, 30_000);

  it('two contenders racing for ONE stale lock end with exactly one owner', async () => {
    const config = testConfig();
    // Stale by age as well as by liveness, so neither contender can decide otherwise.
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

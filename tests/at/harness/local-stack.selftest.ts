import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { lifetimeProblem } from '../suites/req-001/_live.ts';
import { AT_CONFIG } from './atconfig.ts';
import { REPO_ROOT } from './check.ts';
import { STACK_ENV, stackFromEnv } from './live-stack.ts';
import {
  childCoordinates,
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
  stackFromParsedStatus,
  treeState,
  type CliResult,
  type CliTarget,
  type LocalConfig,
  type StackStatus,
} from './local-stack.ts';

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

const demoTarget: CliTarget = { workdir: REPO_ROOT, projectId: 'demo' };
const provenDemo = () => identityVerdict(cli('Stopped services: [supabase_imgproxy_demo supabase_pooler_demo]'), demoTarget, config);

describe('the stack must prove it is local before anything destructive happens', () => {
  it('accepts the local stack', () => {
    expect(localStackProblems(localStatus(), config)).toEqual([]);
  });

  it('checks the mail catcher URL against the config\'s own [local_smtp] port (ruling S1-6)', () => {
    const withMail: LocalConfig = { ...config, mailPort: 54324 };
    expect(localStackProblems({ ...localStatus(), mailUrl: 'http://127.0.0.1:54324' }, withMail)).toEqual([]);
    expect(
      localStackProblems({ ...localStatus(), mailUrl: 'http://127.0.0.1:54999' }, withMail).join(' '),
    ).toContain('54324');
    expect(
      localStackProblems({ ...localStatus(), mailUrl: 'http://mail.example.com:54324' }, withMail).join(' '),
    ).toContain('loopback');
    expect(localStackProblems({ ...localStatus(), mailUrl: 'http://127.0.0.1:54324' }, config).join(' ')).toContain(
      'no [local_smtp] port',
    );
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
    expect(containerNames('No such container: supabase_db_notdemo', 'demo')).toEqual({ own: [], foreign: ['supabase_db_notdemo'] });
    expect(containerNames('', 'demo')).toEqual({ own: [], foreign: [] });
    expect(containerNames('nothing that names a container', 'demo')).toEqual({ own: [], foreign: [] });
  });

  it('reads a name that ends a sentence without its punctuation, so an own container is never reported as foreign', () => {
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
    expect(read.target).toEqual(demoTarget);
    expect(read.target.projectId).toBe(read.provenProjectId);
  });

  it('refuses a foreign name BEFORE parsing, so a mismatch is never reported as a stopped service or as no stack', () => {
    const hybrid: CliResult = { status: 1, stdout: 'not json at all', stderr: 'No such container: supabase_db_other' };
    expect(() => identityVerdict(hybrid, demoTarget, config)).toThrow(/REFUSING TO RESET demo: .*named supabase_db_other/);
    expect(() => identityVerdict(hybrid, demoTarget, config)).toThrow(/Nothing was done/);
  });

  it('reports a stack that answers no JSON as NOT RUNNING, with the command to run — never as a refusal', () => {
    const silent: CliResult = { status: 1, stdout: '', stderr: 'supabase start is not running.' };
    expect(() => identityVerdict(silent, demoTarget, config)).toThrow(/no stack is running for demo; run `bun run db:start`/);
    expect(() => identityVerdict(silent, demoTarget, config)).not.toThrow(/REFUSING/);
    const unlaunched: CliResult = { status: null, stdout: '', stderr: '', error: Object.assign(new Error('spawn ENOENT'), { code: 'ENOENT' }) };
    expect(() => identityVerdict(unlaunched, demoTarget, config)).toThrow(/could not be launched to read the identity of demo/);
    expect(() => identityVerdict(unlaunched, demoTarget, config)).not.toThrow(/REFUSING/);
  });

  it('refuses an output that names no own container at all, naming the benign cause: ports alone are not identity', () => {
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
    expect(configDriftProblems(locked, config).join(' ')).toContain('[local_smtp] port');
  });
});

describe('the access-token lifetime is pinned once: config.toml and the registry must agree', () => {
  it("reads [auth] jwt_expiry from this tree's config, and it equals the registry entry", () => {
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

  it('maps a parsed status onto Stack and refuses when the catcher is absent', () => {
    const withMail: StackStatus = { ...localStatus(), mailUrl: 'http://127.0.0.1:54324' };
    expect(stackFromParsedStatus(withMail)).toEqual({
      apiUrl: withMail.apiUrl,
      dbUrl: withMail.dbUrl,
      anonKey: withMail.anonKey,
      serviceRoleKey: withMail.serviceRoleKey,
      mailUrl: withMail.mailUrl,
    });
    expect(() => stackFromParsedStatus(localStatus())).toThrow(/no mail catcher/);
  });

  it('childCoordinates and stackFromEnv round-trip through the same names', () => {
    const withMail: LocalConfig = { ...config, mailPort: 54324 };
    const read = identityVerdict(
      cli('Stopped services: [supabase_imgproxy_demo supabase_pooler_demo]', { ...localStatus(), mailUrl: 'http://127.0.0.1:54324' }),
      demoTarget,
      withMail,
    );
    const coords = childCoordinates({ read, migrations });
    expect(Object.keys(coords).sort()).toEqual(Object.values(STACK_ENV).slice().sort());
    const saved = Object.fromEntries(Object.values(STACK_ENV).map((name) => [name, process.env[name]]));
    try {
      for (const name of Object.values(STACK_ENV)) delete process.env[name];
      Object.assign(process.env, coords);
      expect(stackFromEnv()).toEqual({
        apiUrl: coords[STACK_ENV.apiUrl],
        dbUrl: coords[STACK_ENV.dbUrl],
        anonKey: coords[STACK_ENV.anonKey],
        serviceRoleKey: coords[STACK_ENV.serviceRoleKey],
        mailUrl: coords[STACK_ENV.mailUrl],
      });
    } finally {
      for (const name of Object.values(STACK_ENV)) {
        if (saved[name] === undefined) delete process.env[name];
        else process.env[name] = saved[name];
      }
    }
  });

  it('the evidence line names the project, the api port that answered, both migration counts, the lock and the head', () => {
    const lock = { file: join(tmpdir(), 'at-verify-demo-54321.lock'), release: () => undefined };
    const line = evidenceLine({ read: provenDemo(), migrations: { expected: 3, applied: 2 } }, lock);
    expect(line).toContain('stack demo (api 54321)');
    expect(line).toContain('reset OK');
    expect(line).toContain('3 expected, 2 applied');
    expect(line).toContain(lock.file);
    expect(line).toMatch(/head [0-9a-f]{4,40}/);
  });

  it('the tree state says "head unknown" when git reports nothing, rather than inventing a hash', () => {
    expect(treeState(join(tmpdir(), `at-no-such-tree-${process.pid}-${Date.now()}`))).toBe('head unknown (git did not report it)');
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

describe('the rebuild is proven against the migration set, and an empty set is visible', () => {
  it('accepts an exact match, including the empty set', () => {
    expect(migrationSetProblems([], [])).toEqual([]);
    expect(migrationSetProblems(['20260101000000'], ['20260101000000'])).toEqual([]);
  });

  it('refuses a migration that was never applied, and one applied from nowhere', () => {
    expect(migrationSetProblems(['20260101000000'], []).join(' ')).toContain('never applied: 20260101000000');
    expect(migrationSetProblems([], ['20260101000000']).join(' ')).toContain('applied but not in supabase/migrations: 20260101000000');
  });

  it('reads timestamped .sql files and ignores .gitkeep and README.md', () => {
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

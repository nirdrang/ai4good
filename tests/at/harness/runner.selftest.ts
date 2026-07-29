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

import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

import { REPO_ROOT } from './check.ts';
import {
  bunExecutable,
  childEnv,
  localStackProblems,
  redact,
  runVerdict,
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

describe('the stack must prove it is local before anything destructive happens', () => {
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

  it('accepts the local stack', () => {
    expect(localStackProblems(localStatus(), config)).toEqual([]);
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

describe('nothing key-shaped is ever printed', () => {
  it('redacts JWTs, publishable keys, long tokens and connection-string credentials', () => {
    const jwtish = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.c2lnbmF0dXJl';
    expect(redact(`token=${jwtish}`)).not.toContain(jwtish);
    expect(redact('key=sb_secret_abcdefghijklmnop')).not.toContain('sb_secret_abcdefghijklmnop');
    expect(redact('postgresql://postgres:hunter2@127.0.0.1:54322/postgres')).not.toContain('hunter2');
  });
});

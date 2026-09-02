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
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { AT_CONFIG } from './atconfig.ts';
import { REPO_ROOT } from './check.ts';
import { bunExecutable, childEnv } from './local-stack.ts';
import { cleanupRun, runVerdict, type IdRow } from './runner.ts';

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

describe('the stack lock is released even when the report directory cannot be removed', () => {
  it('reports the cleanup failure and releases anyway', () => {
    let released = false;
    // A path containing a NUL byte cannot be removed and cannot be swallowed by `force`.
    cleanupRun('C:\\at-verify\0broken', { release: () => (released = true) });
    expect(released, 'a failing report cleanup stranded the stack lock').toBe(true);
  });
});

/**
 * Tests OF the database slot pool, not tests run BY it.
 *
 * THEY RUN WITH NO DOCKER, NO STACK AND NO SLOT DIRECTORY ON THIS MACHINE, because CI runs them
 * that way (no Docker step, either runner) and a test that quietly needs a live stack would be
 * green on the dev machine and absent everywhere else. So the pool root is a temporary directory
 * (`AT_DB_POOL_ROOT`), the claim directory is a temporary directory (`AT_LOCK_DIR`), and the only
 * thing that is real is the claim protocol and the configuration arithmetic — which is exactly
 * what these tests are about.
 *
 * WHAT THEY DO NOT CLAIM: nothing here proves the isolation wall. A Dockerless test cannot reset a
 * database, so it cannot prove that a reset lands where it was aimed. That proof is the committed
 * spike transcript, taken once on the dev machine against three real stacks.
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { REPO_ROOT } from './check.ts';
import { bunExecutable, stackLockPath, type LocalConfig, type StackStatus } from './runner.ts';
import {
  evidence,
  generateSlotConfig,
  itemFromBranch,
  occupy,
  personalBlockProblems,
  portMappings,
  release,
  reservationPath,
  scanConfig,
  slotConfigPath,
  slotDir,
  slotProjectId,
  type Occupancy,
  type PrepareResult,
} from './db-pool.ts';

const REPO_CONFIG = readFileSync(join(REPO_ROOT, 'supabase', 'config.toml'), 'utf8');

let poolTemp = '';
let lockTemp = '';
let previousPool: string | undefined;
let previousLocks: string | undefined;

/** Write a slot's `config.toml` into the temporary pool, exactly as `setup` would. */
function installSlot(slot: number): LocalConfig {
  mkdirSync(join(slotDir(slot), 'supabase'), { recursive: true });
  writeFileSync(slotConfigPath(slot), generateSlotConfig(REPO_CONFIG, slot), 'utf8');
  const text = readFileSync(slotConfigPath(slot), 'utf8');
  const port = (section: string) =>
    Number(/^(\d+)/.exec(scanConfig(text).find((e) => e.section === section && e.key === 'port')?.value ?? '')?.[1] ?? NaN);
  return { projectId: slotProjectId(slot), apiPort: port('api'), dbPort: port('db') };
}

function writeReservation(slot: number, item: string): void {
  mkdirSync(join(poolTemp, 'reservations'), { recursive: true });
  writeFileSync(
    reservationPath(slot),
    JSON.stringify({ slot, item, branch: 'test', at: new Date().toISOString(), holder: 'selftest' }),
    'utf8',
  );
}

function plantClaim(config: LocalConfig, holder: Record<string, unknown>): void {
  writeFileSync(stackLockPath(config), JSON.stringify(holder), 'utf8');
}

function scrubClaim(config: LocalConfig): void {
  rmSync(stackLockPath(config), { force: true });
}

beforeAll(() => {
  previousPool = process.env.AT_DB_POOL_ROOT;
  previousLocks = process.env.AT_LOCK_DIR;
  poolTemp = mkdtempSync(join(tmpdir(), 'at-db-pool-'));
  lockTemp = mkdtempSync(join(tmpdir(), 'at-db-locks-'));
  process.env.AT_DB_POOL_ROOT = poolTemp;
  process.env.AT_LOCK_DIR = lockTemp;
});

afterAll(() => {
  if (previousPool === undefined) delete process.env.AT_DB_POOL_ROOT;
  else process.env.AT_DB_POOL_ROOT = previousPool;
  if (previousLocks === undefined) delete process.env.AT_LOCK_DIR;
  else process.env.AT_LOCK_DIR = previousLocks;
  rmSync(poolTemp, { recursive: true, force: true });
  rmSync(lockTemp, { recursive: true, force: true });
});

describe('one slot has exactly one occupier', () => {
  it('two concurrent occupies on one slot end with exactly one winner', async () => {
    const config = installSlot(1);
    const moduleUrl = new URL('./db-pool.ts', import.meta.url).href;
    const startAt = Date.now() + 800;

    const contender = (): Promise<string> => {
      const code =
        `const { occupy } = await import(${JSON.stringify(moduleUrl)});\n` +
        `while (Date.now() < ${startAt}) {}\n` + // a barrier, so both attempt at the same instant
        `try {\n` +
        `  const held = occupy('req-000', { slot: 1 });\n` +
        `  console.log('ACQUIRED');\n` +
        `  await Bun.sleep(600);\n` + // hold it, so the loser meets a LIVE holder
        `  held.release();\n` +
        `} catch { console.log('REFUSED'); }\n`;
      // spawn, NOT spawnSync: a synchronous spawn would run the contenders one after the other,
      // and the second would find the claim already released — a race that never raced.
      return new Promise<string>((resolve) => {
        const child = spawn(bunExecutable(), ['--no-env-file', '-e', code], {
          env: { ...process.env, AT_DB_POOL_ROOT: poolTemp, AT_LOCK_DIR: lockTemp } as NodeJS.ProcessEnv,
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        let out = '';
        child.stdout.on('data', (chunk: Buffer) => (out += chunk.toString('utf8')));
        child.stderr.on('data', (chunk: Buffer) => (out += chunk.toString('utf8')));
        child.once('error', (err) => resolve(`ERROR ${err.message}`));
        child.once('close', () => resolve(out));
      });
    };

    const [a, b] = await Promise.all([contender(), contender()]);
    const outcomes = [a, b].map((out) => (out.includes('ACQUIRED') ? 'ACQUIRED' : out.includes('REFUSED') ? 'REFUSED' : `UNKNOWN(${out.trim()})`));

    try {
      expect(outcomes.filter((o) => o === 'ACQUIRED'), `outcomes were ${JSON.stringify(outcomes)}`).toHaveLength(1);
      expect(outcomes.filter((o) => o === 'REFUSED'), `outcomes were ${JSON.stringify(outcomes)}`).toHaveLength(1);
      expect(existsSync(stackLockPath(config)), 'the winner did not release its claim').toBe(false);
    } finally {
      scrubClaim(config);
    }
  }, 60_000);

  it('breaks a dead holder LOUDLY and records the takeover in the new claim', () => {
    const config = installSlot(1);
    plantClaim(config, { pid: 999_999, host: 'gone', requirement: 'req-000', startedAt: new Date().toISOString() });
    const said = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      const held = occupy('req-016', { slot: 1 });
      const claim = JSON.parse(readFileSync(held.claim.file, 'utf8')) as {
        pid?: number;
        tookOverFrom?: { pid?: number; requirement?: string };
      };
      expect(claim.pid, 'the takeover did not record this process as the holder').toBe(process.pid);
      expect(claim.tookOverFrom?.pid, 'the displaced holder was not recorded IN the claim').toBe(999_999);
      expect(claim.tookOverFrom?.requirement).toBe('req-000');
      expect(said.mock.calls.flat().join(' '), 'the takeover was silent').toContain('took over a stale stack lock');
      held.release();
    } finally {
      said.mockRestore();
      scrubClaim(config);
    }
  });

  it('never takes over a LIVE holder, at any age, and names it', () => {
    const config = installSlot(1);
    // Alive (this very process) and old enough that the runner's own stale window would displace
    // it. The pool passes dead-pid-only, so it must not.
    plantClaim(config, {
      pid: process.pid,
      host: 'here',
      requirement: 'req-000',
      startedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    });
    try {
      expect(() => occupy('req-016', { slot: 1 })).toThrow(new RegExp(`another at:verify run holds this stack \\(pid ${process.pid}`));
    } finally {
      scrubClaim(config);
    }
  });

  it('releases from a `finally` when the caller throws', () => {
    const config = installSlot(1);
    let held: Occupancy | null = null;
    expect(() => {
      try {
        held = occupy('req-016', { slot: 1 });
        throw new Error('the suite blew up');
      } finally {
        release(held);
      }
    }).toThrow('the suite blew up');
    expect(existsSync(stackLockPath(config)), 'a throwing caller stranded the occupancy claim').toBe(false);
  });
});

describe('admission control belongs to the coordinator, not to the run', () => {
  it('refuses a run whose item holds no reservation, and names the helper that makes one', () => {
    rmSync(reservationPath(1), { force: true });
    rmSync(reservationPath(2), { force: true });
    expect(() => occupy('req-016', { item: 'AI4DEV-999' })).toThrow(/Reserve-DbSlot -Item AI4DEV-999/);
    expect(() => occupy('req-016', { item: 'AI4DEV-999' })).toThrow(/no fallback onto a free slot/);
  });

  it('finds the slot the reservation names', () => {
    const config = installSlot(2);
    writeReservation(2, 'AI4DEV-79');
    try {
      const held = occupy('req-016', { item: 'AI4DEV-79' });
      expect(held.slot).toBe(2);
      expect(held.via).toBe('reservation');
      held.release();
    } finally {
      rmSync(reservationPath(2), { force: true });
      scrubClaim(config);
    }
  });
});

describe('the branch parser fails closed', () => {
  it('accepts exactly one item id', () => {
    expect(itemFromBranch('nirdrang/ai4dev-79-a-pool-of-local-database-slots')).toBe('AI4DEV-79');
    expect(itemFromBranch('feature/AI4PM-19-auth')).toBe('AI4PM-19');
  });

  it('refuses zero ids, several ids, an empty name and a detached HEAD', () => {
    expect(() => itemFromBranch('main')).toThrow(/names no item id/);
    expect(() => itemFromBranch('nirdrang/ai4dev-79-and-ai4dev-80')).toThrow(/names 2 item ids/);
    expect(() => itemFromBranch('')).toThrow(/branch name is empty/);
    expect(() => itemFromBranch('HEAD')).toThrow(/HEAD is detached/);
  });
});

describe('the personal stack is refused in code', () => {
  it('refuses the repo project id and any port in the personal block', () => {
    const personal = /project_id\s*=\s*"([^"]+)"/.exec(REPO_CONFIG)?.[1] ?? '';
    expect(personal, 'the repository config carries no project_id to test against').not.toBe('');

    const problems = personalBlockProblems(REPO_CONFIG, personal);
    expect(problems.join(' '), 'the repo config was not recognised as the personal identity').toContain(`project id "${personal}"`);
    expect(problems.join(' '), 'a 54321-block port was not refused').toMatch(/is inside the founder's personal port block/);
    expect(problems.join(' '), 'the personal inspector port was not refused').toContain('inspector_port');
  });

  it('accepts a generated slot config, which is the same file wearing a slot identity', () => {
    const personal = /project_id\s*=\s*"([^"]+)"/.exec(REPO_CONFIG)?.[1] ?? '';
    expect(personalBlockProblems(generateSlotConfig(REPO_CONFIG, 1), personal)).toEqual([]);
    expect(personalBlockProblems(generateSlotConfig(REPO_CONFIG, 2), personal)).toEqual([]);
  });
});

describe('the identity overlay moves the identity and nothing else', () => {
  it('changes exactly the project id and the listener ports, byte for byte elsewhere', () => {
    const generated = generateSlotConfig(REPO_CONFIG, 1);
    const source = REPO_CONFIG.split('\n');
    const slot = generated.split('\n');
    expect(slot.length, 'the overlay changed the number of lines').toBe(source.length);

    const changed = source.map((line, index) => (line === slot[index] ? -1 : index)).filter((index) => index >= 0);
    const { mappings } = portMappings(REPO_CONFIG, 1);
    expect(changed.length, 'the overlay changed lines that are not identity fields').toBe(mappings.length + 1);

    for (const mapping of mappings) {
      expect(changed, `[${mapping.section}] ${mapping.key} was not rewritten`).toContain(mapping.line);
      expect(slot[mapping.line]).toContain(String(mapping.to));
    }
    expect(generated).toContain(`project_id = "${slotProjectId(1)}"`);
  });

  it('maps an enabled smtp_port, passes a client port through, and refuses what it cannot place', () => {
    const withSmtp =
      'project_id = "demo"\n[local_smtp]\nport = 54324\nsmtp_port = 54325\n[auth.email.smtp]\nport = 587\nhost = "smtp.example.com"\n';
    const mapped = portMappings(withSmtp, 1);
    expect(mapped.problems, 'a legitimate configuration was refused').toEqual([]);
    expect(mapped.mappings.map((m) => `${m.section}.${m.key}:${m.from}->${m.to}`)).toEqual([
      'local_smtp.port:54324->55324',
      'local_smtp.smtp_port:54325->55325',
    ]);
    // Ruling E4: a client-connection port is data. It is neither moved nor refused.
    expect(generateSlotConfig(withSmtp, 1)).toContain('port = 587');

    const outOfBand = portMappings('project_id = "demo"\n[api]\nport = 9999\n', 1);
    expect(outOfBand.problems.join(' '), 'a listener port outside the band was silently kept').toContain('does not know where to move it');

    const strayLocal = portMappings('project_id = "demo"\n[storage]\nport = 54500\n', 1);
    expect(strayLocal.problems.join(' '), 'an unrecognised port in the local band was treated as data').toContain('decide by hand');
  });
});

describe('the evidence names the slot it ran against', () => {
  it('carries the slot, the project id, the api port, the reset and the migration state', () => {
    const held = {
      slot: 2,
      dir: slotDir(2),
      config: { projectId: 'ai4good-slot-2', apiPort: 56321, dbPort: 56322 },
      item: 'AI4DEV-79',
      via: 'reservation',
      claim: { file: '', release: () => undefined },
      release: () => undefined,
    } as Occupancy;
    const result: PrepareResult = {
      status: {} as StackStatus,
      migrations: { expected: 2, applied: 2 },
      restarted: false,
    };

    const line = evidence(held, result);
    expect(line).toContain('db slot 2');
    expect(line).toContain('ai4good-slot-2');
    expect(line).toContain('api 56321');
    expect(line).toContain('reset OK');
    expect(line).toContain('2 expected, 2 applied');
  });
});

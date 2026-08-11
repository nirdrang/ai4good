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

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { REPO_ROOT } from './check.ts';
import { bunExecutable, stackLockPath, type StackStatus } from './runner.ts';
import {
  evidence,
  generateSlotConfig,
  itemFromBranch,
  mirrorItemTree,
  occupy,
  pathClosureProblems,
  personalBlockProblems,
  portMappings,
  release,
  reservationPath,
  slotClaimKey,
  slotConfigPath,
  slotDir,
  slotProjectId,
  SLOT_JWT_EXPIRY_SECONDS,
  type Occupancy,
  type PrepareResult,
} from './db-pool.ts';

const REPO_CONFIG = readFileSync(join(REPO_ROOT, 'supabase', 'config.toml'), 'utf8');

let poolTemp = '';
let lockTemp = '';
let previousPool: string | undefined;
let previousLocks: string | undefined;

/** Write a slot's `config.toml` into the temporary pool, exactly as `setup` would. */
function installSlot(slot: number): void {
  mkdirSync(join(slotDir(slot), 'supabase'), { recursive: true });
  writeFileSync(slotConfigPath(slot), generateSlotConfig(REPO_CONFIG, slot), 'utf8');
}

/**
 * Where the occupancy claim for a slot lives.
 *
 * IT IS DERIVED FROM THE SLOT NUMBER, never from the slot's current config (ruling T6). A test that
 * read the config for the api port would be asserting against a name `prepare` is allowed to move,
 * and would keep passing while the two runs it is meant to serialize held different files.
 */
function claimPath(slot: number): string {
  return stackLockPath(slotClaimKey(slot));
}

/** A process id that is PROVABLY dead: a real child, started, waited for, and gone (ruling F9). */
function deadPid(): number {
  const child = spawnSync(bunExecutable(), ['--no-env-file', '-e', 'process.exit(0)'], { encoding: 'utf8' });
  expect(typeof child.pid, 'the probe child reported no process id, so nothing provably dead exists to plant').toBe('number');
  return child.pid as number;
}

function writeReservation(slot: number, item: string): void {
  mkdirSync(join(poolTemp, 'reservations'), { recursive: true });
  writeFileSync(
    reservationPath(slot),
    JSON.stringify({ slot, item, branch: 'test', at: new Date().toISOString(), holder: 'selftest' }),
    'utf8',
  );
}

/** A reservation file exactly as it looks mid-write, or after a crash: present, and saying nothing. */
function plantRawReservation(slot: number, text: string): void {
  mkdirSync(join(poolTemp, 'reservations'), { recursive: true });
  writeFileSync(reservationPath(slot), text, 'utf8');
}

function plantClaim(slot: number, holder: Record<string, unknown>): void {
  writeFileSync(claimPath(slot), JSON.stringify(holder), 'utf8');
}

/** A claim file exactly as it looks mid-write, or after a crash: present, and saying nothing. */
function plantRawClaim(slot: number, text: string): void {
  writeFileSync(claimPath(slot), text, 'utf8');
}

function scrubClaim(slot: number): void {
  rmSync(claimPath(slot), { force: true });
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
    installSlot(1);
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
      expect(existsSync(claimPath(1)), 'the winner did not release its claim').toBe(false);
    } finally {
      scrubClaim(1);
    }
  }, 60_000);

  it('breaks a dead holder LOUDLY and records the takeover in the new claim', () => {
    installSlot(1);
    // A REAL process id, from a child that has already exited (ruling F9). A made-up large number
    // is only ASSUMED dead, and a busy machine can legitimately be holding it — which would make
    // the one test that guards the takeover rule fail for a reason that has nothing to do with it.
    const gone = deadPid();
    plantClaim(1, { pid: gone, host: 'gone', requirement: 'req-000', startedAt: new Date().toISOString() });
    const said = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      const held = occupy('req-016', { slot: 1 });
      const claim = JSON.parse(readFileSync(held.claim.file, 'utf8')) as {
        pid?: number;
        tookOverFrom?: { pid?: number; requirement?: string };
      };
      expect(claim.pid, 'the takeover did not record this process as the holder').toBe(process.pid);
      expect(claim.tookOverFrom?.pid, 'the displaced holder was not recorded IN the claim').toBe(gone);
      expect(claim.tookOverFrom?.requirement).toBe('req-000');
      expect(said.mock.calls.flat().join(' '), 'the takeover was silent').toContain('took over a stale stack lock');
      held.release();
    } finally {
      said.mockRestore();
      scrubClaim(1);
    }
  });

  it('never takes over a LIVE holder, at any age, and names it', () => {
    installSlot(1);
    // Alive (this very process) and old enough that the runner's own stale window would displace
    // it. The pool passes dead-pid-only, so it must not.
    plantClaim(1, {
      pid: process.pid,
      host: 'here',
      requirement: 'req-000',
      startedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    });
    try {
      expect(() => occupy('req-016', { slot: 1 })).toThrow(new RegExp(`another at:verify run holds this stack \\(pid ${process.pid}`));
    } finally {
      scrubClaim(1);
    }
  });

  it('never takes over a claim file it cannot identify, and names the file (ruling T1)', () => {
    installSlot(1);
    // AN EMPTY FILE IS WHAT A LIVE CLAIM LOOKS LIKE MID-WRITE. The exclusive create and the write
    // that fills it are two acts, and between them the file exists and says nothing. Under
    // dead-pid-only that must NEVER read as a dead holder: taking it over would delete a live
    // run's brand-new claim, which is the one thing this policy exists to make impossible.
    for (const planted of ['', '   \n', '{"pid":', 'not json at all']) {
      plantRawClaim(1, planted);
      try {
        expect(() => occupy('req-016', { slot: 1 }), `a claim file containing ${JSON.stringify(planted)} was taken over`).toThrow(
          /names no process id that this run can read/,
        );
        expect(() => occupy('req-016', { slot: 1 })).toThrow(claimPath(1));
        expect(existsSync(claimPath(1)), 'the refusal deleted the file it could not identify').toBe(true);
      } finally {
        scrubClaim(1);
      }
    }
  }, 30_000);

  it('releases from a `finally` when the caller throws', () => {
    installSlot(1);
    let held: Occupancy | null = null;
    expect(() => {
      try {
        held = occupy('req-016', { slot: 1 });
        throw new Error('the suite blew up');
      } finally {
        release(held);
      }
    }).toThrow('the suite blew up');
    expect(existsSync(claimPath(1)), 'a throwing caller stranded the occupancy claim').toBe(false);
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
    installSlot(2);
    writeReservation(2, 'AI4DEV-79');
    try {
      const held = occupy('req-016', { item: 'AI4DEV-79' });
      expect(held.slot).toBe(2);
      expect(held.via).toBe('reservation');
      held.release();
    } finally {
      rmSync(reservationPath(2), { force: true });
      scrubClaim(2);
    }
  });

  it('refuses an AT_DB_SLOT run aimed at a slot another item holds (ruling T5)', () => {
    installSlot(2);
    writeReservation(2, 'AI4DEV-900');
    try {
      expect(() => occupy('req-016', { slot: 2, item: 'AI4DEV-79' })).toThrow(/reserved for AI4DEV-900/);
      expect(existsSync(claimPath(2)), 'the refusal still took the claim').toBe(false);
    } finally {
      rmSync(reservationPath(2), { force: true });
      scrubClaim(2);
    }
  });

  it('refuses an AT_DB_SLOT run when the reservation exists but cannot be read (ruling A2)', () => {
    installSlot(2);
    // A RESERVATION NOBODY CAN READ IS NOT NO RESERVATION. `Reserve-DbSlot` creates the file
    // exclusively and fills it a moment later, so between those two acts it exists and says
    // nothing. Reading that as absent lets this run take a slot another item holds.
    //
    // THE LAST FIVE PARSE CLEANLY AND ARE STILL NOT RESERVATIONS (audit ruling B3). `null` is the
    // one that reached the harm: it parsed, it was handed back, and the override's `if (reserved)`
    // read it as no reservation at all — a present file taking the ABSENT branch.
    for (const planted of ['', '   \n', '{"item":', 'not json at all', 'null', '42', '[]', '{"slot":2}', '{"item":"   "}']) {
      plantRawReservation(2, planted);
      try {
        expect(() => occupy('req-016', { slot: 2, item: 'AI4DEV-79' }), `a reservation containing ${JSON.stringify(planted)} was ignored`).toThrow(
          /cannot read after/,
        );
        expect(existsSync(claimPath(2)), 'the refusal still took the claim').toBe(false);
      } finally {
        rmSync(reservationPath(2), { force: true });
        scrubClaim(2);
      }
    }
  }, 60_000);

  it('lets an AT_DB_SLOT run past the reservation check when no reservation exists (ruling A2)', () => {
    installSlot(2);
    rmSync(reservationPath(2), { force: true });
    // An ABSENT file is the one case that proceeds. The refusal tests above would pass vacuously
    // if the strict read refused everything, so this pins the other side of the rule.
    try {
      const held = occupy('req-016', { slot: 2, item: 'AI4DEV-79' });
      held.release();
    } catch (err) {
      expect((err as Error).message, 'an absent reservation was refused as unreadable').not.toMatch(/cannot read after/);
      throw err;
    } finally {
      scrubClaim(2);
    }
  });

  it('lets an AT_DB_SLOT run take a slot reserved for its OWN item', () => {
    installSlot(2);
    writeReservation(2, 'AI4DEV-79');
    try {
      const held = occupy('req-016', { slot: 2, item: 'AI4DEV-79' });
      expect(held.via).toBe('override');
      expect(held.slot).toBe(2);
      held.release();
    } finally {
      rmSync(reservationPath(2), { force: true });
      scrubClaim(2);
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
    expect(problems.join(' '), 'a 54321-block port was not refused').toMatch(/is inside the personal stack's port block/);
    expect(problems.join(' '), 'the personal inspector port was not refused').toContain('inspector_port');
  });

  it('reads a port value WHOLE, so a TOML underscore cannot smuggle one past it (ruling A5)', () => {
    // TOML writes integers with optional underscores between digits, so `54_321` IS the personal
    // stack's api port. A parse of the leading digits reads it as 54, which is in no band anybody
    // checks — the guard would pass a config carrying the founder's own port.
    const underscored = personalBlockProblems('project_id = "demo"\n[api]\nport = 54_321\n', 'the-personal-identity');
    expect(underscored.join(' '), 'a port written 54_321 was not seen as 54321').toContain("is inside the personal stack's port block");

    const inspector = personalBlockProblems('project_id = "demo"\n[edge_runtime]\ninspector_port = 80_83\n', 'the-personal-identity');
    expect(inspector.join(' '), 'an underscored inspector port was not seen as 8083').toContain('inspector port');
  });

  it('refuses a port-valued key whose value is not a plain number, and names the value (ruling A5)', () => {
    // A value this guard cannot read cannot be shown to be outside the founder's block, and it was
    // SKIPPED in silence. Fail closed: an unreadable port value is a problem, not a pass.
    for (const value of ['"54321"', 'env("API_PORT")', '54321 54322', '']) {
      const problems = personalBlockProblems(`project_id = "demo"\n[api]\nport = ${value}\n`, 'the-personal-identity');
      expect(problems.join(' '), `a port value of ${JSON.stringify(value)} passed the guard in silence`).toContain(
        'is not a plain port number',
      );
    }
    // And a plain integer with a trailing comment is still an ordinary port, not a refusal.
    expect(personalBlockProblems('project_id = "demo"\n[api]\nport = 55321 # the slot api port\n', 'the-personal-identity')).toEqual([]);
  });

  it('accepts a generated slot config, which is the same file wearing a slot identity', () => {
    const personal = /project_id\s*=\s*"([^"]+)"/.exec(REPO_CONFIG)?.[1] ?? '';
    expect(personalBlockProblems(generateSlotConfig(REPO_CONFIG, 1), personal)).toEqual([]);
    expect(personalBlockProblems(generateSlotConfig(REPO_CONFIG, 2), personal)).toEqual([]);
  });
});

/**
 * THE ONE NON-IDENTITY SETTING every generated config carries, so a synthetic source in these tests
 * is a source `generateSlotConfig` will accept. The generator FAILS CLOSED on an absent
 * `[auth] jwt_expiry` — a slot silently running the shipped hour-long expiry would make the two
 * session bodies hang rather than fail — so a fixture without it is not a smaller case, it is an
 * invalid one.
 */
const SYNTHETIC_AUTH = '[auth]\njwt_expiry = 3600\n';

describe('the identity overlay moves the identity and nothing else', () => {
  it('changes exactly the project id, the listener ports and the standing session lifetime, byte for byte elsewhere', () => {
    const generated = generateSlotConfig(REPO_CONFIG, 1);
    const source = REPO_CONFIG.split('\n');
    const slot = generated.split('\n');
    expect(slot.length, 'the overlay changed the number of lines').toBe(source.length);

    const changed = source.map((line, index) => (line === slot[index] ? -1 : index)).filter((index) => index >= 0);
    const { mappings } = portMappings(REPO_CONFIG, 1);
    // ONE MORE THAN THE IDENTITY FIELDS, and exactly one: the project id, every mapped listener
    // port, and the standing `auth.jwt_expiry`. This count is the assertion that the permitted
    // transform set did not grow again — a second non-identity edit fails here, naming its line.
    expect(changed.length, 'the overlay changed lines that are neither identity fields nor the standing session lifetime').toBe(
      mappings.length + 2,
    );

    for (const mapping of mappings) {
      expect(changed, `[${mapping.section}] ${mapping.key} was not rewritten`).toContain(mapping.line);
      expect(slot[mapping.line]).toContain(String(mapping.to));
    }
    expect(generated).toContain(`project_id = "${slotProjectId(1)}"`);

    // THE STANDING LOW SESSION LIFETIME (D12). It is a value the slot runs permanently, not a
    // transient override a test makes and restores: there is nothing to restore, so there is nothing
    // to prove restored. The value is measured rather than chosen — the running GoTrue issues tokens
    // with `expires_in` equal to it — and this item's verify-first record carries the reading.
    expect(generated).toContain(`jwt_expiry = ${SLOT_JWT_EXPIRY_SECONDS}`);
    expect(generated, 'the shipped hour-long expiry survived into the slot config').not.toMatch(/^\s*jwt_expiry\s*=\s*3600/m);
    const expiryLine = source.findIndex((line) => /^\s*jwt_expiry\s*=/.test(line));
    expect(changed, 'the jwt_expiry line was not the line that changed').toContain(expiryLine);
  });

  it('refuses to generate a slot config from a source carrying no active [auth] jwt_expiry', () => {
    // FAIL CLOSED, and this is the test that says why. A generator that quietly skipped the
    // transform would hand back a config the CLI accepts and the stack starts — running the shipped
    // hour-long expiry while every declaration downstream assumed two minutes. The two session
    // bodies would then WAIT rather than fail, which is the worst shape of failure to diagnose.
    expect(() => generateSlotConfig('project_id = "demo"\n[api]\nport = 54321\n', 1)).toThrow(/no active \[auth\] jwt_expiry/);
    // A COMMENTED setting is not an active one, and `scanConfig` already knows the difference.
    expect(() => generateSlotConfig('project_id = "demo"\n[auth]\n# jwt_expiry = 3600\n', 1)).toThrow(/no active \[auth\] jwt_expiry/);
  });

  it('maps an enabled smtp_port, passes a client port through, and refuses what it cannot place', () => {
    const withSmtp =
      'project_id = "demo"\n[local_smtp]\nport = 54324\nsmtp_port = 54325\n[auth.email.smtp]\nport = 587\nhost = "smtp.example.com"\n' +
      SYNTHETIC_AUTH;
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

  it('maps a port written with a TOML underscore, and replaces the whole value (ruling A5)', () => {
    const underscored = portMappings('project_id = "demo"\n[api]\nport = 54_321\n', 1);
    expect(underscored.problems, 'a legal TOML integer was refused').toEqual([]);
    expect(underscored.mappings.map((m) => `${m.from}->${m.to}`)).toEqual(['54321->55321']);
    // The rewrite must take the underscore with it. Replacing the leading digits alone would
    // leave `55321_321` behind — a config the stack could not read.
    expect(generateSlotConfig(`project_id = "demo"\n[api]\nport = 54_321\n${SYNTHETIC_AUTH}`, 1)).toContain('port = 55321\n');
    // The same whole-value rule applies to the standing session lifetime, for the same reason.
    expect(generateSlotConfig(`project_id = "demo"\n[api]\nport = 54321\n[auth]\njwt_expiry = 3_600\n`, 1)).toContain(
      `jwt_expiry = ${SLOT_JWT_EXPIRY_SECONDS}\n`,
    );
  });

  it('moves the ruled inspector port by ten and refuses to guess at any other (ruling T8)', () => {
    // 8083 is the RULED value, and +N*10 is the rule written for it. Applying that same arithmetic
    // to a value nobody ruled is a guess, and a guess about a port is a collision with software
    // nobody in this process knows about.
    const ruled = portMappings('project_id = "demo"\n[edge_runtime]\ninspector_port = 8083\n', 1);
    expect(ruled.problems, 'the ruled inspector port was refused').toEqual([]);
    expect(ruled.mappings.map((m) => `${m.from}->${m.to}`)).toEqual(['8083->8093']);

    const other = portMappings('project_id = "demo"\n[edge_runtime]\ninspector_port = 9229\n', 1);
    expect(other.problems.join(' '), 'an unruled inspector port was moved by a guess').toContain('does not know where to move it');
    expect(other.mappings, 'an unruled inspector port was mapped anyway').toEqual([]);

    // In the local stack's own band it is an ordinary listener again, and the generic rule places it.
    const inBand = portMappings('project_id = "demo"\n[edge_runtime]\ninspector_port = 54444\n', 2);
    expect(inBand.problems).toEqual([]);
    expect(inBand.mappings.map((m) => `${m.from}->${m.to}`)).toEqual(['54444->56444']);
  });
});

describe('the path closure fails closed on what it cannot deliver', () => {
  it('accepts this repository\'s config as it stands', () => {
    expect(pathClosureProblems(REPO_CONFIG, REPO_ROOT)).toEqual([]);
  });

  it('refuses a path key whose array does not close on the same line (ruling F5)', () => {
    // `scanConfig` reads one line per setting, so this value is `[` and no path is extracted. For
    // the overlay an unseen value is copied verbatim and is safe; for the closure it is a missed
    // refusal, which is the whole thing this check exists to prevent.
    const multiLine = 'project_id = "demo"\n[db.seed]\nsql_paths = [\n  "./seed.sql"\n]\n';
    const problems = pathClosureProblems(multiLine, REPO_ROOT);
    expect(problems.join(' '), 'a value this check cannot see passed silently').toContain('does not close on the same line');
    expect(problems.join(' '), 'the refusal did not name the repair').toContain('write the value on one line');

    // The same paths on one line are visible again, and are inside supabase/, so they pass.
    expect(pathClosureProblems('project_id = "demo"\n[db.seed]\nsql_paths = ["./seed.sql"]\n', REPO_ROOT)).toEqual([]);
  });

  it('refuses a path outside supabase/ and a path inside a directory the mirror excludes', () => {
    expect(pathClosureProblems('project_id = "demo"\n[db.seed]\nsql_paths = ["../seed.sql"]\n', REPO_ROOT).join(' ')).toContain('outside supabase/');
    expect(pathClosureProblems('project_id = "demo"\n[db.seed]\nsql_paths = ["/etc/seed.sql"]\n', REPO_ROOT).join(' ')).toContain('absolute path');
    expect(
      pathClosureProblems('project_id = "demo"\n[db.seed]\nsql_paths = ["./.temp/seed.sql"]\n', REPO_ROOT).join(' '),
      'a path into the CLI runtime state the mirror leaves behind was accepted',
    ).toContain('supabase/.temp');
  });
});

describe('the mirror carries the project source and nothing else', () => {
  it('leaves out the CLI runtime directories and the item tree config (rulings T3, F3, T11)', () => {
    const item = mkdtempSync(join(tmpdir(), 'at-item-tree-'));
    mkdirSync(join(item, 'supabase', 'migrations'), { recursive: true });
    mkdirSync(join(item, 'supabase', 'functions', 'hello'), { recursive: true });
    mkdirSync(join(item, 'supabase', '.temp', 'start-secrets'), { recursive: true });
    mkdirSync(join(item, 'supabase', '.branches'), { recursive: true });
    writeFileSync(join(item, 'supabase', 'config.toml'), 'project_id = "the-personal-identity"\n', 'utf8');
    writeFileSync(join(item, 'supabase', 'migrations', '20260101000000_a.sql'), 'select 1;\n', 'utf8');
    writeFileSync(join(item, 'supabase', 'functions', 'hello', 'index.ts'), 'export default 1;\n', 'utf8');
    writeFileSync(join(item, 'supabase', '.temp', 'start-secrets', 'anon'), 'a secret\n', 'utf8');
    writeFileSync(join(item, 'supabase', '.branches', '_current_branch'), 'main\n', 'utf8');

    try {
      mirrorItemTree(item, 1);
      const slot = join(slotDir(1), 'supabase');
      expect(existsSync(join(slot, 'migrations', '20260101000000_a.sql')), 'a migration did not reach the slot').toBe(true);
      expect(existsSync(join(slot, 'functions', 'hello', 'index.ts')), 'an edge function did not reach the slot').toBe(true);
      expect(existsSync(join(slot, 'config.toml')), 'the item tree config reached the slot, carrying the personal identity').toBe(false);
      expect(existsSync(join(slot, '.temp')), 'the CLI runtime state about another stack reached the slot').toBe(false);
      expect(existsSync(join(slot, '.branches')), 'the CLI branch state reached the slot').toBe(false);
    } finally {
      rmSync(item, { recursive: true, force: true });
      rmSync(join(slotDir(1), 'supabase'), { recursive: true, force: true });
    }
  });

  it('refuses the whole mirror when a symlink sits under supabase/ (ruling T13)', () => {
    const item = mkdtempSync(join(tmpdir(), 'at-item-link-'));
    mkdirSync(join(item, 'supabase', 'migrations'), { recursive: true });
    mkdirSync(join(item, 'elsewhere'), { recursive: true });
    // A directory junction on Windows needs no privilege; on other systems this is a plain symlink.
    symlinkSync(join(item, 'elsewhere'), join(item, 'supabase', 'migrations', 'linked'), 'junction');

    try {
      expect(() => mirrorItemTree(item, 1)).toThrow(/symlink/);
      expect(() => mirrorItemTree(item, 1)).toThrow(/Nothing was copied/);
    } finally {
      rmSync(item, { recursive: true, force: true });
      rmSync(join(slotDir(1), 'supabase'), { recursive: true, force: true });
    }
  });
});

describe('the evidence names the slot it ran against', () => {
  it('carries the slot, the project id, the api port THAT ANSWERED, the reset and the migration state (ruling A3)', () => {
    // The occupancy's config is read when the slot is TAKEN; `prepare` then regenerates it from
    // the item tree and may lawfully move the api port. So the two disagree here on purpose: the
    // line must name the port the suite actually used, which is the post-prepare status.
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
      status: { apiUrl: 'http://127.0.0.1:56421', dbUrl: 'postgresql://postgres:postgres@127.0.0.1:56422/postgres' } as StackStatus,
      migrations: { expected: 2, applied: 2 },
      restarted: false,
      attestation: 'at-selftest-nonce',
    };

    const line = evidence(held, result);
    expect(line).toContain('db slot 2');
    expect(line).toContain('ai4good-slot-2');
    expect(line, 'the evidence named the port the status reported').toContain('api 56421');
    expect(line, 'the evidence named the pre-prepare port instead of the one that answered').not.toContain('56321');
    expect(line).toContain('reset OK');
    expect(line).toContain('2 expected, 2 applied');
  });
});

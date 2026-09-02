/**
 * The machine-wide lock for the one stack. Keyed by project id + api port so two checkouts
 * that share containers cannot reset under each other.
 */

import { closeSync, mkdirSync, openSync, readFileSync, rmSync, writeSync } from 'node:fs';
import { hostname, tmpdir } from 'node:os';
import { join } from 'node:path';

/** The takeover gate is held for milliseconds; anything this old was abandoned by a dead process. */
export const GATE_STALE_MINUTES = Number(process.env.AT_LOCK_GATE_STALE_MINUTES ?? 2);

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

export function processIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    // EPERM means it exists but belongs to someone else; ESRCH means it is gone.
    return (err as NodeJS.ErrnoException).code === 'EPERM';
  }
}

/** The lock path for one stack. Machine-wide, and deliberately carries no folder component. */
export function stackLockPath({ projectId, apiPort }: { projectId: string; apiPort: number }): string {
  return join(lockDir(), `at-verify-${projectId}-${apiPort}.lock`);
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
export function holderIsLive(holder: Holder): boolean {
  return typeof holder.pid === 'number' && processIsAlive(holder.pid);
}

export function heldByAnotherRun(holder: Holder, file: string): Error {
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
export function clearStrandedGate(gate: string): void {
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
 * about; the race is in stack-lock.selftest.ts.)
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
export function acquireStackLock(config: { projectId: string; apiPort: number }, requirement: string): StackLock {
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

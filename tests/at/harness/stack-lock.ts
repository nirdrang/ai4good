import { closeSync, mkdirSync, openSync, readFileSync, rmSync, writeSync } from 'node:fs';
import { hostname, tmpdir } from 'node:os';
import { join } from 'node:path';

export const GATE_STALE_MINUTES = Number(process.env.AT_LOCK_GATE_STALE_MINUTES ?? 2);

export interface StackLock {
  file: string;
  release(): void;
}

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

export function stackLockPath({ projectId, apiPort }: { projectId: string; apiPort: number }): string {
  return join(lockDir(), `at-verify-${projectId}-${apiPort}.lock`);
}

export interface Holder {
  pid?: number;
  host?: string;
  requirement?: string;
  startedAt?: string;
  tookOverFrom?: { pid?: number; startedAt?: string; requirement?: string };
}

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

  const readHolder = (): Holder | null => {
    try {
      return JSON.parse(readFileSync(file, 'utf8')) as Holder;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      return {};
    }
  };

  const pause = (ms: number) => {
    const until = Date.now() + ms;
    while (Date.now() < until) {
      /* spin */
    }
  };

  const identified = (holder: Holder, where: string): Holder | null => {
    if (typeof holder.pid === 'number') return holder;

    pause(50);
    const again = readHolder();
    if (again === null) return null;
    if (typeof again.pid === 'number') return again;

    throw new Error(
      `refusing to take over the claim at ${file}: it names no process id that this run can read, ` +
        `so it cannot be shown to be dead — and a claim file being written right now looks exactly ` +
        `like this. Nothing was taken over. If no run holds that stack, delete ${file} by hand ` +
        `(checked ${where}).`,
    );
  };

  for (let attempt = 0; attempt < 20; attempt++) {
    const claimed = claim();
    if (claimed) return claimed;

    const read = readHolder();
    if (read === null) continue;
    const holder = identified(read, 'before the takeover gate');
    if (holder === null) continue;
    if (holderIsLive(holder)) throw heldByAnotherRun(holder, file);

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
      if (readInside === null) continue;
      const inside = identified(readInside, 'inside the takeover gate');
      if (inside === null) continue;
      if (holderIsLive(inside)) continue;

      rmSync(file, { force: true });
      const takeover = claim(inside);
      if (!takeover) continue;

      console.log(`at:verify — took over a dead holder's stack lock (holder pid ${inside.pid ?? 'unknown'} is no longer running)`);
      return takeover;
    } finally {
      closeSync(gateFd);
      rmSync(gate, { force: true });
    }
  }

  throw new Error(`could not acquire the stack lock at ${file} — it kept changing hands; try again`);
}

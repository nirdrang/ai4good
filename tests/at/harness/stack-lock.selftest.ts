import { spawn } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { bunExecutable } from './local-stack.ts';
import { acquireStackLock, stackLockPath } from './stack-lock.ts';

describe('taking over a dead holder\'s lock is atomic — one owner, never two — and a live holder is never displaced', () => {
  const testConfig = (): { projectId: string; apiPort: number } => ({
    projectId: `selftest-${Math.random().toString(36).slice(2, 10)}`,
    apiPort: 1,
  });

  const plantLock = (config: { projectId: string; apiPort: number }, holder: Record<string, unknown>) => {
    writeFileSync(stackLockPath(config), JSON.stringify(holder));
  };
  const plantRawLock = (config: { projectId: string; apiPort: number }, text: string) => {
    writeFileSync(stackLockPath(config), text);
  };
  const scrub = (config: { projectId: string; apiPort: number }) => rmSync(stackLockPath(config), { force: true });

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
    plantLock(config, {
      pid: 999_999,
      host: 'gone',
      requirement: 'req-000',
      startedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    });

    const lockUrl = new URL('./stack-lock.ts', import.meta.url).href;
    const startAt = Date.now() + 600;
    const contender = (): Promise<string> => {
      const code =
        `const { acquireStackLock } = await import(${JSON.stringify(lockUrl)});\n` +
        `const config = ${JSON.stringify(JSON.stringify(config))};\n` +
        `while (Date.now() < ${startAt}) {}\n` +
        `try {\n` +
        `  const lock = acquireStackLock(JSON.parse(config), 'req-016');\n` +
        `  console.log('ACQUIRED');\n` +
        `  await Bun.sleep(500);\n` +
        `  lock.release();\n` +
        `} catch { console.log('REFUSED'); }\n`;
      return new Promise<string>((resolve) => {
        const child = spawn(bunExecutable(), ['--no-env-file', '-e', code], { stdio: ['ignore', 'pipe', 'pipe'] });
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
      expect(existsSync(stackLockPath(config)), 'the winner did not release its lock').toBe(false);
    } finally {
      scrub(config);
    }
  }, 60_000);
});

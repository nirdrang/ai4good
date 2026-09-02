/**
 * The above-loop refusal, through the real path.
 *
 * CI never runs the integration tier. The factory selftests call the pure predicate by hand.
 * This file is the remaining guard: it spawns the pinned vitest on the real req-016 suite
 * with AT_TIER=integration and no stack coordinates, and asserts every id fails with the
 * named CapabilityPending. The refusal precedes construction, so the test needs no stack.
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { INSTALL_ROOT } from './check.ts';
import { bunExecutable, childEnv } from './local-stack.ts';

const REFUSAL = 'CapabilityPending: CAPABILITY PENDING — fixtures.worlds, sut.notifications';

describe('the above-loop refusal, through the real path', () => {
  it('fails every req-016 id above loop with the named capability pending, with no stack', () => {
    const dir = mkdtempSync(join(tmpdir(), 'at-live-refusal-'));
    const outputFile = join(dir, 'vitest-report.json');
    try {
      const env = childEnv({ AT_TIER: 'integration', AT_REGISTRATION_DIR: dir });
      expect(
        Object.keys(env).filter((key) => key.startsWith('AT_SUPABASE_')),
        'the child environment carried a stack coordinate',
      ).toEqual([]);

      const atRoot = join(INSTALL_ROOT, 'tests', 'at');
      const run = spawnSync(
        bunExecutable(),
        [
          '--no-env-file',
          join(INSTALL_ROOT, 'node_modules', 'vitest', 'vitest.mjs'),
          'run',
          '--root',
          atRoot,
          '--config',
          join(atRoot, 'vitest.config.ts'),
          '--reporter=json',
          `--outputFile=${outputFile}`,
          'suites/req-016/',
        ],
        { cwd: INSTALL_ROOT, env, encoding: 'utf8' },
      );

      const report = JSON.parse(readFileSync(outputFile, 'utf8')) as {
        testResults?: { assertionResults?: { status?: string; failureMessages?: string[] }[] }[];
      };
      const assertions = (report.testResults ?? []).flatMap((file) => file.assertionResults ?? []);
      expect(
        assertions,
        `expected twelve assertion results; child exit ${run.status}\n${run.stdout}\n${run.stderr}`,
      ).toHaveLength(12);
      for (const assertion of assertions) {
        expect(assertion.status).toBe('failed');
        const message = assertion.failureMessages?.[0] ?? '';
        expect(message.startsWith(REFUSAL), message).toBe(true);
      }
    } finally {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          rmSync(dir, { recursive: true, force: true });
          break;
        } catch {
          /* retry once */
        }
      }
    }
  });
});

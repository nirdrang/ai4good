import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

import { INSTALL_ROOT } from './check.ts';
import { bunExecutable, childEnv } from './local-stack.ts';

const REQUIREMENT = '999';
const REFUSAL = 'CapabilityPending: CAPABILITY PENDING — fixtures.worlds, sut.probe';
const REGISTRY_URL = pathToFileURL(join(INSTALL_ROOT, 'tests', 'at', 'harness', 'registry.ts')).href;

const FIXTURE_VITEST_CONFIG = `export default { test: { include: ['suites/**/*.test.ts'], environment: 'node', testTimeout: 30000 } };\n`;

const FIXTURE_ADAPTER = `export const requirement = 'req-${REQUIREMENT}';
export function createFixtureAdapter({ worlds }) {
  return {
    sut: { probe: { ping: async () => 'pong' } },
    fixtures: { world: async (name) => await worlds.world(name) },
    teardown: async () => {},
  };
}
`;

const SUITE = `import { describe, it } from 'vitest';
import { bindSuite } from '${REGISTRY_URL}';
const { atTest } = bindSuite({ requirement: 'req-${REQUIREMENT}', sut: 'probe', sutMissingDetail: 'the probe sut is absent' });
describe('a suite with no live adapter', () => {
  atTest('AT-${REQUIREMENT}.01', 'opens a world', async ({ open }) => { await open(); });
  atTest('AT-${REQUIREMENT}.02', 'opens a world', async ({ open }) => { await open(); });
  atTest('AT-${REQUIREMENT}.03', 'opens a world', async ({ open }) => { await open(); });
});
`;

describe('the above-loop refusal, through the real path', () => {
  it('fails every id of a suite with no live adapter above loop with the named capability pending, with no stack', () => {
    const tree = mkdtempSync(join(tmpdir(), 'at-live-refusal-'));
    const outputFile = join(tree, 'vitest-report.json');
    try {
      const atRoot = join(tree, 'tests', 'at');
      const suiteDir = join(atRoot, 'suites', `req-${REQUIREMENT}`);
      mkdirSync(suiteDir, { recursive: true });
      writeFileSync(join(atRoot, 'vitest.config.ts'), FIXTURE_VITEST_CONFIG, 'utf8');
      writeFileSync(join(suiteDir, '_fixture.ts'), FIXTURE_ADAPTER, 'utf8');
      writeFileSync(join(suiteDir, 'a-probe.test.ts'), SUITE, 'utf8');

      const env = childEnv({ AT_TIER: 'integration', AT_REPO_ROOT: tree, AT_REGISTRATION_DIR: tree });
      expect(
        Object.keys(env).filter((key) => key.startsWith('AT_SUPABASE_')),
        'the child environment carried a stack coordinate',
      ).toEqual([]);

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
          `suites/req-${REQUIREMENT}/`,
        ],
        { cwd: INSTALL_ROOT, env, encoding: 'utf8' },
      );

      const report = JSON.parse(readFileSync(outputFile, 'utf8')) as {
        testResults?: { assertionResults?: { status?: string; failureMessages?: string[] }[] }[];
      };
      const assertions = (report.testResults ?? []).flatMap((file) => file.assertionResults ?? []);
      expect(
        assertions,
        `expected three assertion results; child exit ${run.status}\n${run.stdout}\n${run.stderr}`,
      ).toHaveLength(3);
      for (const assertion of assertions) {
        expect(assertion.status).toBe('failed');
        const message = assertion.failureMessages?.[0] ?? '';
        expect(message.startsWith(REFUSAL), message).toBe(true);
      }
    } finally {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          rmSync(tree, { recursive: true, force: true });
          break;
        } catch {
          /* retry once */
        }
      }
    }
  });
});

import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

import { INSTALL_ROOT } from './check.ts';
import { bunExecutable, childEnv } from './local-stack.ts';

const RUNNER = join(INSTALL_ROOT, 'tests', 'at', 'harness', 'runner.ts');
const REGISTRY_URL = pathToFileURL(join(INSTALL_ROOT, 'tests', 'at', 'harness', 'registry.ts')).href;

const FIXTURE_VITEST_CONFIG = `export default { test: { include: ['suites/**/*.test.ts'], environment: 'node', testTimeout: 30000 } };\n`;

function fixtureAdapter(requirement: string): string {
  return `export const requirement = 'req-${requirement}';
export function createFixtureAdapter({ worlds }) {
  return {
    sut: { probe: { ping: async () => 'pong' } },
    fixtures: { world: async (name) => await worlds.world(name) },
    teardown: async () => {},
  };
}
`;
}

const PENDING_CAPABILITY = 'H9 imaginary capability';

function suitePreamble(requirement: string): string {
  return (
    `import { describe, expect, it } from 'vitest';\n` +
    `import { bindSuite } from '${REGISTRY_URL}';\n` +
    `import { CapabilityPending } from '${REGISTRY_URL}';\n` +
    `const { atTest } = bindSuite({ requirement: 'req-${requirement}', sut: 'probe', sutMissingDetail: 'the probe sut is absent' });\n`
  );
}

function greenTest(atId: string): string {
  return (
    `  atTest('${atId}', 'a green one', async ({ open }) => {\n` +
    `    const { sut } = await open();\n` +
    `    expect(await sut.ping()).toBe('pong');\n` +
    `  });\n`
  );
}

function redTest(atId: string): string {
  return (
    `  atTest('${atId}', 'a pending one', async ({ open }) => {\n` +
    `    const { sut } = await open();\n` +
    `    expect(await sut.ping()).toBe('pong');\n` +
    `    throw new CapabilityPending(['${PENDING_CAPABILITY}']);\n` +
    `  });\n`
  );
}

const p0 = (atId: string, text: string) => `- **${atId} (P0)** — ${text}\n`;

const IMPORT_FAILURE_FILE =
  `import { describe, it } from 'vitest';\n` +
  `throw new Error('this file blows up at import time');\n` +
  `describe('never reached', () => { it('nothing', () => { expect(true).toBe(true); }); });\n`;

function twoIdSuite(
  requirement: string,
  opts: { secondIsRed?: boolean; untaggedFailure?: boolean; brokenImport?: boolean } = {},
): Record<string, string> {
  const { secondIsRed = true, untaggedFailure = false, brokenImport = false } = opts;
  const files: Record<string, string> = {
    'a-two-ids.test.ts':
      suitePreamble(requirement) +
      `describe('two ids', () => {\n` +
      greenTest(`AT-${requirement}.01`) +
      (secondIsRed ? redTest(`AT-${requirement}.02`) : greenTest(`AT-${requirement}.02`)) +
      (untaggedFailure ? `  it('a failure no id claims', () => { expect(1).toBe(2); });\n` : '') +
      `});\n`,
  };
  if (brokenImport) files['z-broken.test.ts'] = IMPORT_FAILURE_FILE;
  return files;
}

const twoIdAcceptance = (requirement: string) =>
  p0(`AT-${requirement}.01`, 'the green one') + p0(`AT-${requirement}.02`, 'the pending one');

interface RunnerOutcome {
  status: number | null;
  stdout: string;
  stderr: string;
  output: string;
}

interface ExpectTree {
  requirement: string;
  acceptance: string;
  files: Record<string, string>;
  manifest?: string;
  expect: boolean;
}

function runExpectTree(spec: ExpectTree): RunnerOutcome {
  const tree = mkdtempSync(join(tmpdir(), 'at-expect-'));
  try {
    const suiteDir = join(tree, 'tests', 'at', 'suites', `req-${spec.requirement}`);
    mkdirSync(suiteDir, { recursive: true });
    mkdirSync(join(tree, '.taskmaster', 'docs', 'acceptance'), { recursive: true });
    writeFileSync(join(tree, '.taskmaster', 'docs', 'acceptance', `at-req-${spec.requirement}.md`), spec.acceptance, 'utf8');
    writeFileSync(join(tree, 'tests', 'at', 'vitest.config.ts'), FIXTURE_VITEST_CONFIG, 'utf8');
    writeFileSync(join(suiteDir, '_fixture.ts'), fixtureAdapter(spec.requirement), 'utf8');
    for (const [name, content] of Object.entries(spec.files)) writeFileSync(join(suiteDir, name), content, 'utf8');

    if (spec.manifest !== undefined) {
      const expectedDir = join(tree, 'tests', 'at', 'expected');
      mkdirSync(expectedDir, { recursive: true });
      writeFileSync(join(expectedDir, `req-${spec.requirement}.json`), spec.manifest, 'utf8');
    }

    const argv = [`req-${spec.requirement}`, '--tier', 'loop', ...(spec.expect ? ['--expect'] : [])];
    const run = spawnSync(bunExecutable(), ['--no-env-file', RUNNER, ...argv], {
      cwd: INSTALL_ROOT,
      env: childEnv({ AT_REPO_ROOT: tree }),
      encoding: 'utf8',
    });

    const stdout = run.stdout ?? '';
    const stderr = run.stderr ?? '';
    return { status: run.status, stdout, stderr, output: `${stdout}\n${stderr}` };
  } finally {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        rmSync(tree, { recursive: true, force: true });
        break;
      } catch {
        /* retry once — Windows can hold a handle open for a moment after the child exits */
      }
    }
  }
}

const declaration = (body: string) => `${body}\n`;

describe('--expect passes only when the run matches the declaration exactly', () => {
  it('exits 0 when the declared greens and the declared red are exactly what happened', () => {
    const run = runExpectTree({
      requirement: '910',
      acceptance: twoIdAcceptance('910'),
      files: twoIdSuite('910'),
      manifest: declaration(`{
  "requirement": "910",
  "tiers": {
    "loop": {
      "green": ["AT-910.01"],
      "red": { "AT-910.02": { "kind": "capability-pending", "capabilities": ["H9 imaginary capability"] } }
    }
  }
}`),
      expect: true,
    });

    expect(run.status, `a matching declaration was not accepted\n${run.output}`).toBe(0);
    expect(run.stdout).toContain('EXPECTED: the run matches');
    expect(run.stdout).toContain('1 declared green, 1 declared red');
    expect(run.stdout).not.toContain('DEVIATION:');
  });

  it('fails a declared red that is actually green, and says to update the declaration', () => {
    const run = runExpectTree({
      requirement: '911',
      acceptance: twoIdAcceptance('911'),
      files: twoIdSuite('911', { secondIsRed: false }),
      manifest: declaration(`{
  "requirement": "911",
  "tiers": {
    "loop": {
      "green": ["AT-911.01"],
      "red": { "AT-911.02": { "kind": "capability-pending", "capabilities": ["H9 imaginary capability"] } }
    }
  }
}`),
      expect: true,
    });

    expect(run.status, `a red that turned green was accepted\n${run.output}`).toBe(1);
    expect(run.output).toContain('AT-911.02');
    expect(run.output).toContain('reported GREEN');
    expect(run.output).toContain('update the declaration');
  });

  it('fails a declared green that is actually red', () => {
    const run = runExpectTree({
      requirement: '912',
      acceptance: twoIdAcceptance('912'),
      files: twoIdSuite('912'),
      manifest: declaration(`{
  "requirement": "912",
  "tiers": { "loop": { "green": ["AT-912.01", "AT-912.02"], "red": {} } }
}`),
      expect: true,
    });

    expect(run.status, `a green that turned red was accepted\n${run.output}`).toBe(1);
    expect(run.output).toContain('AT-912.02');
    expect(run.output).toContain('declared green, reported red');
  });

  it('fails a red that is red for a DIFFERENT reason, printing what it expected and what it got', () => {
    const run = runExpectTree({
      requirement: '913',
      acceptance: twoIdAcceptance('913'),
      files: twoIdSuite('913'),
      manifest: declaration(`{
  "requirement": "913",
  "tiers": {
    "loop": {
      "green": ["AT-913.01"],
      "red": { "AT-913.02": { "kind": "capability-pending", "capabilities": ["H4 a different capability"] } }
    }
  }
}`),
      expect: true,
    });

    expect(run.status, `a red with the wrong cause was accepted\n${run.output}`).toBe(1);
    expect(run.output).toContain('AT-913.02');
    expect(run.output).toContain('a red of a different shape');
    expect(run.output).toContain('H4 a different capability');
    expect(run.output).toContain(PENDING_CAPABILITY);
  });
});

describe('--expect refuses, and runs nothing, when the declaration cannot be honoured', () => {
  it('refuses when there is no declaration at all', () => {
    const run = runExpectTree({
      requirement: '914',
      acceptance: twoIdAcceptance('914'),
      files: twoIdSuite('914'),
      expect: true,
    });

    expect(run.status, `a missing declaration did not refuse the run\n${run.output}`).toBe(2);
    expect(run.stderr).toContain('DECLARATION REFUSED');
    expect(run.stderr).toContain('req-914.json');
    expect(run.stdout).not.toContain('at:verify req-914 --tier loop');
  });

  it('refuses a declaration that is not valid JSON', () => {
    const run = runExpectTree({
      requirement: '918',
      acceptance: twoIdAcceptance('918'),
      files: twoIdSuite('918'),
      manifest: '{ "requirement": "918", "tiers": { oops',
      expect: true,
    });

    expect(run.status, `a malformed declaration was allowed to run\n${run.output}`).toBe(2);
    expect(run.stderr).toContain('DECLARATION REFUSED');
    expect(run.stderr).toContain('is not valid JSON');
    expect(run.stdout).not.toContain('at:verify req-918 --tier loop');
  });

  it('refuses a declaration that says nothing about the tier being run', () => {
    const run = runExpectTree({
      requirement: '919',
      acceptance: twoIdAcceptance('919'),
      files: twoIdSuite('919'),
      manifest: declaration(`{
  "requirement": "919",
  "tiers": {
    "integration": {
      "green": ["AT-919.01"],
      "red": { "AT-919.02": { "kind": "capability-pending", "capabilities": ["H9 imaginary capability"] } }
    }
  }
}`),
      expect: true,
    });

    expect(run.status, `a declaration for another tier was treated as this tier's\n${run.output}`).toBe(2);
    expect(run.stderr).toContain('DECLARATION REFUSED');
    expect(run.stderr).toContain('no declaration for the loop tier');
    expect(run.stdout).not.toContain('at:verify req-919 --tier loop');
  });

  it('refuses a declaration that forgets an id the acceptance file lists', () => {
    const run = runExpectTree({
      requirement: '915',
      acceptance: twoIdAcceptance('915'),
      files: twoIdSuite('915'),
      manifest: declaration(`{
  "requirement": "915",
  "tiers": { "loop": { "green": ["AT-915.01"], "red": {} } }
}`),
      expect: true,
    });

    expect(run.status, `an incomplete declaration was allowed to run\n${run.output}`).toBe(2);
    expect(run.stderr).toContain('DECLARATION REFUSED');
    expect(run.stderr).toContain('AT-915.02');
    expect(run.stdout).not.toContain('at:verify req-915 --tier loop');
  });
});

describe('without --expect the runner behaves exactly as it did before', () => {
  it('exits 1 on the same tree and declaration that --expect exits 0 on', () => {
    const run = runExpectTree({
      requirement: '916',
      acceptance: twoIdAcceptance('916'),
      files: twoIdSuite('916'),
      manifest: declaration(`{
  "requirement": "916",
  "tiers": {
    "loop": {
      "green": ["AT-916.01"],
      "red": { "AT-916.02": { "kind": "capability-pending", "capabilities": ["H9 imaginary capability"] } }
    }
  }
}`),
      expect: false,
    });

    expect(run.status, `the default path changed\n${run.output}`).toBe(1);
    expect(run.stdout).toContain('FAILURE: 1 id red');
    expect(run.stdout).not.toContain('DEVIATION:');
    expect(run.stdout).not.toContain('EXPECTED:');
    expect(run.output).not.toContain('DECLARATION');
  });
});

describe('--expect accounts for the whole run, not only the ids it can name', () => {
  it('fails a run carrying an extra failure that no AT id claims', () => {
    const run = runExpectTree({
      requirement: '917',
      acceptance: twoIdAcceptance('917'),
      files: twoIdSuite('917', { untaggedFailure: true }),
      manifest: declaration(`{
  "requirement": "917",
  "tiers": {
    "loop": {
      "green": ["AT-917.01"],
      "red": { "AT-917.02": { "kind": "capability-pending", "capabilities": ["H9 imaginary capability"] } }
    }
  }
}`),
      expect: true,
    });

    expect(run.status, `an unaccounted-for failure was reported as the expected state\n${run.output}`).toBe(1);
    expect(run.output).toContain('counts 2 failed tests but the declaration declares 1 red');
    expect(run.output).toContain('an extra test ran');
    expect(run.output).not.toContain('AT-917.01 —');
    expect(run.output).not.toContain('AT-917.02 —');
  });
});

describe('--expect sees a failure that belongs to a FILE and to no test', () => {
  it('fails a run where a second file died at import while every declared count stayed correct', () => {
    const run = runExpectTree({
      requirement: '920',
      acceptance: twoIdAcceptance('920'),
      files: twoIdSuite('920', { brokenImport: true }),
      manifest: declaration(`{
  "requirement": "920",
  "tiers": {
    "loop": {
      "green": ["AT-920.01"],
      "red": { "AT-920.02": { "kind": "capability-pending", "capabilities": ["H9 imaginary capability"] } }
    }
  }
}`),
      expect: true,
    });

    expect(run.status, `a broken suite file was reported as the expected state\n${run.output}`).toBe(1);
    expect(run.output).toContain('z-broken.test.ts');
    expect(run.output).toContain('not one test in it failed');
    expect(run.output).toContain('this file blows up at import time');
    expect(run.output).not.toContain('AT-920.01 —');
    expect(run.output).not.toContain('AT-920.02 —');
  });
});

describe('--expect and --wired cannot be combined', () => {
  it('refuses the pair as a usage error rather than reporting the wired refusal', () => {
    const run = spawnSync(bunExecutable(), ['--no-env-file', RUNNER, 'req-910', '--tier', 'loop', '--expect', '--wired'], {
      cwd: INSTALL_ROOT,
      env: childEnv(),
      encoding: 'utf8',
    });

    expect(run.status, `--expect --wired was accepted\n${run.stdout ?? ''}\n${run.stderr ?? ''}`).toBe(2);
    expect(run.stderr ?? '').toContain('cannot be combined');
    expect(run.stderr ?? '').toContain('usage: bun run at:verify');
  });
});

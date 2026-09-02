/**
 * `--expect`, driven END TO END as a black box.
 *
 * WHY SEPARATELY from `expected.selftest.ts`: that file proves the comparison RULES by calling the
 * pure functions with hand-built inputs. The claim a gate depends on is different — "the assembled
 * runner, given a suite in a particular state and a declaration, exits with this code and says
 * this" — and assembly is where a false green hides: a preflight computed and not acted on, a
 * declaration read from the wrong root, a deviation list printed but not returned as an exit code.
 *
 * So each case plants a COMPLETE disposable tree — acceptance file, suite, vitest config, and
 * (usually) a declaration — points the real runner at it with `AT_REPO_ROOT`, and asserts the exit
 * code and the printed output. `node_modules` still resolves from the real checkout, so the child
 * runs the pinned vitest, and the fixture suite imports the REAL registry and the REAL
 * `CapabilityPending` by absolute file URL: these are tests of the harness, not of a copy of it.
 * That last part is load-bearing now that a declared red is matched by exact shape — a fixture
 * throwing a plain `Error` could never match a `capability-pending` declaration.
 *
 * The tree-planting helper below duplicates `runner-blackbox.selftest.ts`'s deliberately: sharing
 * it would mean editing a passing selftest that guards the runner's assembly, and forty lines of
 * fixture plumbing is a cheap price for not perturbing it.
 *
 * Every case runs at the loop tier, which by design takes no lock, starts no Docker and touches no
 * database.
 */

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

/**
 * The adapter declares its own requirement because the real `loadAdapter()` checks that literal
 * against the requirement it was asked to load. These trees are not in `suite-adapters.ts`'s type
 * map and do not need to be — the check compares what the adapter says about itself against what
 * was requested, which needs no map.
 */
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

/** The capability a fixture red is pending on. Never a real one — nothing here waits on H9. */
const PENDING_CAPABILITY = 'H9 imaginary capability';

/**
 * The requirement is a parameter because `atTest` now refuses an id whose requirement disagrees
 * with the binding's. These suites are never type-checked but they ARE executed, so that run-time
 * guard applies to them exactly as it does to a real suite.
 */
function suitePreamble(requirement: string): string {
  return (
    `import { describe, expect, it } from 'vitest';\n` +
    `import { bindSuite } from '${REGISTRY_URL}';\n` +
    `import { CapabilityPending } from '${REGISTRY_URL}';\n` +
    `const { atTest } = bindSuite({ requirement: 'req-${requirement}', sut: 'probe', sutMissingDetail: 'the probe sut is absent' });\n`
  );
}

/** A green id: opens a world and asserts something the fixture adapter really answers. */
function greenTest(atId: string): string {
  return (
    `  atTest('${atId}', 'a green one', async ({ open }) => {\n` +
    `    const { sut } = await open();\n` +
    `    expect(await sut.ping()).toBe('pong');\n` +
    `  });\n`
  );
}

/**
 * A red id. It opens and asserts FIRST so the red is the thrown CapabilityPending and not the
 * registry's own complaint about a body that never opened a world or never asserted.
 */
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

/** A second file that dies while vitest is loading it — it never contributes a test at all. */
const IMPORT_FAILURE_FILE =
  `import { describe, it } from 'vitest';\n` +
  `throw new Error('this file blows up at import time');\n` +
  `describe('never reached', () => { it('nothing', () => { expect(true).toBe(true); }); });\n`;

/** The two-id suite every case shares, so the only variable between cases is the declaration. */
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
  /** raw text written to <tree>/tests/at/expected/req-<NNN>.json; omit to plant no declaration */
  manifest?: string;
  /** pass --expect to the runner */
  expect: boolean;
}

/**
 * Plant a tree, run the real runner against it at the loop tier, remove the tree.
 *
 * The declaration is written under the TREE, not the checkout — which is why
 * `expectedManifestPath` must resolve from the AT_REPO_ROOT-overridable data root rather than the
 * install root. That is a hard constraint on the module, not a preference.
 */
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

/** Declarations are written out per case rather than generated, so no shared bug can agree with itself. */
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
    // No report table means no tests ran — the refusal has to happen before the suite is spawned.
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
      // Complete and well formed — for a tier nobody asked for.
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
    // The control. Its tree and declaration are case 1's; only the flag differs, so the pair
    // proves the flag is doing the work rather than something else about the tree.
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
    // THE case Gate 1 found. Both declared ids match their declarations perfectly, so the per-id
    // comparison is silent; an untagged `it()` also failed, and only the report's own arithmetic
    // can see it. Without that arithmetic this tree exits 0 — a false green inside the artefact
    // built to remove one. The untagged test is not an `atTest(` call site, so the static
    // bijection preflight still passes and the run reaches its verdict.
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
    // and the ids themselves are NOT reported as deviations — the point of the case
    expect(run.output).not.toContain('AT-917.01 —');
    expect(run.output).not.toContain('AT-917.02 —');
  });
});

describe('--expect sees a failure that belongs to a FILE and to no test', () => {
  it('fails a run where a second file died at import while every declared count stayed correct', () => {
    // Gate 2's shared finding, raised independently by codex and Kimi. The declared ids report
    // exactly as declared, every count matches, and `success === false` reads as expected because
    // reds ARE declared — so before the file-level check this tree exited 0. Measured against the
    // real reporter: the import failure adds a file entry with status "failed", zero assertions
    // and a message, and moves no test count at all.
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
    // and the declared ids are NOT deviations — which is exactly why nothing else caught this
    expect(run.output).not.toContain('AT-920.01 —');
    expect(run.output).not.toContain('AT-920.02 —');
  });
});

describe('--expect and --wired cannot be combined', () => {
  it('refuses the pair as a usage error rather than reporting the wired refusal', () => {
    // --wired runs no tests, so there is no report for a declaration to check. Costs no vitest
    // spawn: it fails in argument parsing, before anything is read.
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

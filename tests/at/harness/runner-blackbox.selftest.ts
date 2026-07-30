/**
 * The runner, driven END TO END as a black box.
 *
 * WHY THIS EXISTS SEPARATELY from `runner.selftest.ts`: that file tests the runner's pure pieces —
 * `analyzeReportedTests`, `bijectionProblems`, `runVerdict` — by calling them with hand-built
 * inputs. That is worth having, and it is not the same claim. The claim a gate actually depends on
 * is "the ASSEMBLED runner, given a suite in a particular state, exits with this code and reports
 * this per id", and the assembly is where a false green hides: a preflight whose result is
 * computed and not acted on, a report that is parsed but whose exit code is dropped, a
 * registration file the child writes somewhere the parent does not read. Every one of those passes
 * a unit test of the pure function and fails the whole product.
 *
 * So each case below plants a COMPLETE disposable tree — its own acceptance file, its own suite,
 * its own vitest config — points the runner at it with `AT_REPO_ROOT`, and asserts the exit code
 * and the report line for the id. The trees are disposable because the situations are deliberately
 * broken (an acceptance file that yields no P0 ids, a suite claiming an id nothing registers, a
 * test that reports twice), and the runner's own tests must not be able to damage the repository
 * they are checking. `node_modules` still resolves from the real checkout, so the child runs the
 * pinned vitest and the fixture suites import the REAL harness registry by absolute file URL —
 * these are tests of the harness, not of a copy of it.
 *
 * The non-loop safety sequence (stack lock, local-stack proof, reset, migration proof) is NOT
 * touched here: every case runs at the loop tier, which by design takes no lock, starts no Docker
 * and touches no database.
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

import { INSTALL_ROOT } from './check.ts';
import { bunExecutable, childEnv } from './runner.ts';

const RUNNER = join(INSTALL_ROOT, 'tests', 'at', 'harness', 'runner.ts');

/** The real registry, addressed absolutely — a fixture suite registers through it, not a copy. */
const REGISTRY_URL = pathToFileURL(join(INSTALL_ROOT, 'tests', 'at', 'harness', 'registry.ts')).href;

/**
 * A vitest config for the disposable tree. Deliberately a plain object rather than
 * `defineConfig`: the tree has no `node_modules` of its own, and `defineConfig` is an identity
 * function, so importing `vitest/config` from a temp directory would buy nothing and could fail.
 */
const FIXTURE_VITEST_CONFIG = `export default { test: { include: ['suites/**/*.test.ts'], environment: 'node', testTimeout: 30000 } };\n`;

/**
 * A minimal fixture adapter, so `open()` in a fixture suite reaches a real world through the real
 * harness. It is the same seam `harness/index.ts` loads for REQ-016.
 */
const FIXTURE_ADAPTER = `export function createFixtureAdapter({ worlds }) {
  return {
    sut: { probe: { ping: async () => 'pong' } },
    fixtures: { world: async (name) => await worlds.world(name) },
    teardown: async () => {},
  };
}
`;

/** Preamble every fixture suite shares: vitest, plus the real registry bound to the probe sut. */
function suitePreamble(): string {
  return (
    `import { describe, expect, it } from 'vitest';\n` +
    `import { bindSuite } from '${REGISTRY_URL}';\n` +
    `const atTest = bindSuite({ sut: 'probe', sutMissingDetail: 'the probe sut is absent' });\n`
  );
}

interface RunnerOutcome {
  status: number | null;
  stdout: string;
  stderr: string;
  /** everything the runner emitted, for assertions that do not care which stream it came from */
  output: string;
  /** the report row for an id: `green` / `red` / `missing` plus its detail */
  row(atId: string): { status: string; detail: string } | null;
}

/**
 * Plant a tree, run the real runner against it at the loop tier, remove the tree.
 *
 * `acceptance` is the whole acceptance file, because its FORMATTING is under test in one of the
 * cases; `files` are the suite's files, written verbatim, because what a call site looks like in
 * source is under test in another.
 */
function runAgainstTree(requirement: string, acceptance: string, files: Record<string, string>): RunnerOutcome {
  const tree = mkdtempSync(join(tmpdir(), 'at-blackbox-'));
  try {
    const suiteDir = join(tree, 'tests', 'at', 'suites', `req-${requirement}`);
    mkdirSync(suiteDir, { recursive: true });
    mkdirSync(join(tree, '.taskmaster', 'docs', 'acceptance'), { recursive: true });
    writeFileSync(join(tree, '.taskmaster', 'docs', 'acceptance', `at-req-${requirement}.md`), acceptance, 'utf8');
    writeFileSync(join(tree, 'tests', 'at', 'vitest.config.ts'), FIXTURE_VITEST_CONFIG, 'utf8');
    writeFileSync(join(suiteDir, '_fixture.ts'), FIXTURE_ADAPTER, 'utf8');
    for (const [name, content] of Object.entries(files)) writeFileSync(join(suiteDir, name), content, 'utf8');

    const run = spawnSync(bunExecutable(), ['--no-env-file', RUNNER, `req-${requirement}`, '--tier', 'loop'], {
      cwd: INSTALL_ROOT,
      env: childEnv({ AT_REPO_ROOT: tree }),
      encoding: 'utf8',
    });

    const stdout = run.stdout ?? '';
    const stderr = run.stderr ?? '';
    return {
      status: run.status,
      stdout,
      stderr,
      output: `${stdout}\n${stderr}`,
      row: (atId: string) => {
        const pattern = new RegExp(`^\\s+${atId.replace(/\./g, '\\.')}\\s+(green|red|missing)\\s+(.*)$`, 'm');
        const found = pattern.exec(stdout);
        return found ? { status: found[1], detail: found[2].trim() } : null;
      },
    };
  } finally {
    // Windows can hold a handle open for a moment after the child exits; one retry is enough, and
    // a leftover temp directory must never fail the test that produced it.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        rmSync(tree, { recursive: true, force: true });
        break;
      } catch {
        /* retry once */
      }
    }
  }
}

const p0 = (atId: string, text: string) => `- **${atId} (P0)** — ${text}\n`;

describe('the assembled runner, on a suite that passes for the wrong reason', () => {
  it('refuses a body that passed without ever opening a world', () => {
    const run = runAgainstTree('901', p0('AT-901.01', 'a body that asserts but never opens'), {
      'a-never-opens.test.ts':
        suitePreamble() +
        `describe('never opens', () => {\n` +
        `  atTest('AT-901.01', 'asserts something true and opens nothing', async () => {\n` +
        `    expect(1 + 1).toBe(2);\n` +
        `  });\n` +
        `});\n`,
    });

    expect(run.status, `the runner accepted a zero-open body\n${run.output}`).toBe(1);
    const row = run.row('AT-901.01');
    expect(row, `no report row for AT-901.01\n${run.output}`).not.toBeNull();
    expect(row!.status).toBe('red');
    expect(row!.detail).toContain('never opened');
  });

  it('refuses an id whose only registration is a call site that never runs', () => {
    // The call site is statically visible — so the bijection checker is satisfied — and never
    // executes, so nothing registers at runtime. A bare `it()` supplies the passing green.
    const source =
      suitePreamble() +
      `describe('title only', () => {\n` +
      `  if (false) atTest('AT-902.01', 'never reached', async ({ open }) => { await open(); });\n` +
      `  it('AT-902.01 — placeholder', () => { expect(true).toBe(true); });\n` +
      `});\n`;
    const run = runAgainstTree('902', p0('AT-902.01', 'a registration that never executes'), {
      'b-title-only.test.ts': source,
    });

    // The static scan MUST see the unreachable call site, otherwise this case is testing the
    // bijection checker's blindness rather than the runtime-registration requirement.
    expect(run.output, `the preflight did not accept the statically visible call site\n${run.output}`).not.toContain(
      'preflight refused',
    );
    expect(run.status, `a title-only registration was accepted\n${run.output}`).toBe(1);
    const row = run.row('AT-902.01');
    expect(row!.status).toBe('red');
    expect(row!.detail).toContain('no runtime registration');
  });

  it('refuses an id reported twice instead of keeping whichever result came last', () => {
    const run = runAgainstTree('903', p0('AT-903.01', 'a real test plus an impostor of the same name'), {
      'c-duplicate.test.ts':
        suitePreamble() +
        `describe('duplicate', () => {\n` +
        `  atTest('AT-903.01', 'the real test', async ({ open }) => {\n` +
        `    const { sut } = await open();\n` +
        `    expect(await sut.ping()).toBe('pong');\n` +
        `  });\n` +
        `  it('AT-903.01 — the real test', () => { expect(true).toBe(true); });\n` +
        `});\n`,
    });

    expect(run.status, `a duplicated id was accepted\n${run.output}`).toBe(1);
    const row = run.row('AT-903.01');
    expect(row!.status).toBe('red');
    expect(row!.detail).toContain('2 Vitest results');
  });
});

describe('the assembled runner refuses to run at all when the preflight cannot be satisfied', () => {
  it('refuses an acceptance file whose formatting yields zero P0 ids', () => {
    // The id is in the file; the P0 marking the parser looks for is not. Nothing else about this
    // tree is wrong — the suite claims no id either — so the ONLY thing standing between this run
    // and a perfect "0 P0: 0 green, 0 red" report over nothing at all is the zero-id refusal.
    // That is deliberate: the case has to isolate that one guard, or it would keep passing on the
    // strength of a different problem.
    const run = runAgainstTree('904', `- **AT-904.01 (P1)** — marked P1, so this file carries no P0 at all\n`, {
      'd-zero-ids.test.ts':
        `import { describe, expect, it } from 'vitest';\n` +
        `describe('zero ids', () => {\n` +
        `  it('a test that claims no AT id', () => { expect(true).toBe(true); });\n` +
        `});\n`,
    });

    expect(run.status, `an empty expectation set was allowed to run\n${run.output}`).toBe(2);
    expect(run.stderr).toContain('preflight refused the run');
    expect(run.stderr).toContain('zero P0 ids');
  });

  it('refuses a suite that registers nothing for an id the acceptance file lists', () => {
    const run = runAgainstTree(
      '905',
      p0('AT-905.01', 'this one is registered') + p0('AT-905.02', 'this one is not registered anywhere'),
      {
        'e-missing.test.ts':
          suitePreamble() +
          `describe('missing', () => {\n` +
          `  atTest('AT-905.01', 'the only registered id', async ({ open }) => {\n` +
          `    const { sut } = await open();\n` +
          `    expect(await sut.ping()).toBe('pong');\n` +
          `  });\n` +
          `});\n`,
      },
    );

    expect(run.status, `a missing P0 id did not stop the run\n${run.output}`).toBe(2);
    expect(run.stderr).toContain('preflight refused the run');
    expect(run.stderr).toContain('AT-905.02');
  });
});

describe('the assembled runner reports a genuinely good suite as good', () => {
  it('exits zero and reports green for a suite that opens a world and asserts something real', () => {
    // The positive control. Without it every assertion above is satisfied by a runner that fails
    // everything, which is a useless gate in the other direction.
    const run = runAgainstTree('906', p0('AT-906.01', 'a well-formed single test'), {
      'f-good.test.ts':
        suitePreamble() +
        `describe('good', () => {\n` +
        `  atTest('AT-906.01', 'opens a world and asserts a real observation', async ({ open }) => {\n` +
        `    const { w, sut } = await open();\n` +
        `    expect(await sut.ping()).toBe('pong');\n` +
        `    expect(w.state.projects.length).toBeGreaterThan(0);\n` +
        `  });\n` +
        `});\n`,
    });

    expect(run.status, `a well-formed suite was reported as a failure\n${run.output}`).toBe(0);
    const row = run.row('AT-906.01');
    expect(row, `no report row for AT-906.01\n${run.output}`).not.toBeNull();
    expect(row!.status).toBe('green');
    expect(row!.detail).toBe('opens a world and asserts a real observation');
  });
});

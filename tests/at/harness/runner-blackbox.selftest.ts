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

const ADAPTER_BODY = `export function createFixtureAdapter({ worlds }) {
  return {
    sut: { probe: { ping: async () => 'pong' } },
    fixtures: { world: async (name) => await worlds.world(name) },
    teardown: async () => {},
  };
}
`;

function fixtureAdapter(requirement: string): string {
  return `export const requirement = 'req-${requirement}';\n${ADAPTER_BODY}`;
}

function suitePreamble(requirement: string): string {
  return (
    `import { describe, expect, it } from 'vitest';\n` +
    `import { bindSuite } from '${REGISTRY_URL}';\n` +
    `const { atTest } = bindSuite({ requirement: 'req-${requirement}', sut: 'probe', sutMissingDetail: 'the probe sut is absent' });\n`
  );
}

interface RunnerOutcome {
  status: number | null;
  stdout: string;
  stderr: string;
  output: string;
  row(atId: string): { status: string; detail: string } | null;
}

function runAgainstTree(
  requirement: string,
  acceptance: string,
  files: Record<string, string>,
  adapter: string = fixtureAdapter(requirement),
): RunnerOutcome {
  const tree = mkdtempSync(join(tmpdir(), 'at-blackbox-'));
  try {
    const suiteDir = join(tree, 'tests', 'at', 'suites', `req-${requirement}`);
    mkdirSync(suiteDir, { recursive: true });
    mkdirSync(join(tree, '.taskmaster', 'docs', 'acceptance'), { recursive: true });
    writeFileSync(join(tree, '.taskmaster', 'docs', 'acceptance', `at-req-${requirement}.md`), acceptance, 'utf8');
    writeFileSync(join(tree, 'tests', 'at', 'vitest.config.ts'), FIXTURE_VITEST_CONFIG, 'utf8');
    writeFileSync(join(suiteDir, '_fixture.ts'), adapter, 'utf8');
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
        suitePreamble('901') +
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
    const source =
      suitePreamble('902') +
      `describe('title only', () => {\n` +
      `  if (false) atTest('AT-902.01', 'never reached', async ({ open }) => { await open(); });\n` +
      `  it('AT-902.01 — placeholder', () => { expect(true).toBe(true); });\n` +
      `});\n`;
    const run = runAgainstTree('902', p0('AT-902.01', 'a registration that never executes'), {
      'b-title-only.test.ts': source,
    });

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
        suitePreamble('903') +
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
          suitePreamble('905') +
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

describe('the assembled runner holds a fixture adapter to the requirement it declares', () => {
  it('refuses an adapter that declares a different requirement, naming both values', () => {
    const run = runAgainstTree(
      '907',
      p0('AT-907.01', 'a well-formed test against an adapter that says it is a different suite'),
      {
        'g-mislabelled-adapter.test.ts':
          suitePreamble('907') +
          `describe('mislabelled adapter', () => {\n` +
          `  atTest('AT-907.01', 'opens a world through an adapter claiming another requirement', async ({ open }) => {\n` +
          `    const { sut } = await open();\n` +
          `    expect(await sut.ping()).toBe('pong');\n` +
          `  });\n` +
          `});\n`,
      },
      fixtureAdapter('999'),
    );

    expect(run.status, `a mislabelled adapter produced a passing run\n${run.output}`).toBe(1);
    const row = run.row('AT-907.01');
    expect(row, `no report row for AT-907.01\n${run.output}`).not.toBeNull();
    expect(row!.status).toBe('red');
    expect(row!.detail, `the failure did not name what the adapter declares\n${run.output}`).toContain('req-999');
    expect(row!.detail, `the failure did not name what was loaded\n${run.output}`).toContain('req-907');
  });

  it('refuses an adapter that declares no requirement at all', () => {
    const run = runAgainstTree(
      '908',
      p0('AT-908.01', 'a well-formed test against an adapter that names no requirement'),
      {
        'h-unlabelled-adapter.test.ts':
          suitePreamble('908') +
          `describe('unlabelled adapter', () => {\n` +
          `  atTest('AT-908.01', 'opens a world through an adapter that declares nothing', async ({ open }) => {\n` +
          `    const { sut } = await open();\n` +
          `    expect(await sut.ping()).toBe('pong');\n` +
          `  });\n` +
          `});\n`,
      },
      ADAPTER_BODY,
    );

    expect(run.status, `an adapter declaring no requirement produced a passing run\n${run.output}`).toBe(1);
    const row = run.row('AT-908.01');
    expect(row, `no report row for AT-908.01\n${run.output}`).not.toBeNull();
    expect(row!.status).toBe('red');
    expect(row!.detail, `the failure did not say the literal is missing\n${run.output}`).toContain(
      'it exports no `requirement`',
    );
    expect(row!.detail, `the failure did not name what was loaded\n${run.output}`).toContain('req-908');
  });
});

describe('the assembled runner reports a genuinely good suite as good', () => {
  it('exits zero and reports green for a suite that opens a world and asserts something real', () => {
    const run = runAgainstTree('906', p0('AT-906.01', 'a well-formed single test'), {
      'f-good.test.ts':
        suitePreamble('906') +
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

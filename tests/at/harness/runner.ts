import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { INSTALL_ROOT, inspectBijection, normalizeRequirement, REPO_ROOT, suiteDir } from './check.ts';
import {
  expectationDeviations,
  expectedManifestPath,
  loadTierExpectation,
  reportAccountingDeviations,
  type TierExpectation,
} from './expected.ts';
import {
  bunExecutable,
  childCoordinates,
  childEnv,
  diagnostic,
  evidenceLine,
  lifetimePinProblem,
  prepareLocalStack,
  readLocalConfig,
  redact,
  type CliTarget,
  type LocalConfig,
} from './local-stack.ts';
import { acquireStackLock, type StackLock } from './stack-lock.ts';

const TIERS = ['loop', 'integration', 'drill'] as const;
type Tier = (typeof TIERS)[number];

const USAGE = 'usage: bun run at:verify req-0NN --tier <loop|integration|drill> [--wired] [--expect]';

interface Args {
  requirement: string;
  tier: Tier;
  wired: boolean;
  expectDeclared: boolean;
}

function parseArgs(argv: string[]): Args {
  let requirement = '';
  let tier = '';
  let wired = false;
  let expectDeclared = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--wired') wired = true;
    else if (arg === '--expect') expectDeclared = true;
    else if (arg === '--tier') tier = argv[++i] ?? '';
    else if (arg.startsWith('--tier=')) tier = arg.slice('--tier='.length);
    else if (arg.startsWith('--')) throw new Error(`unknown option "${arg}"`);
    else if (!requirement) requirement = arg;
    else throw new Error(`unexpected argument "${arg}"`);
  }

  if (!requirement) throw new Error('no requirement given');
  if (!tier) throw new Error('--tier is required — there is no default tier, by design');
  if (!TIERS.includes(tier as Tier)) throw new Error(`unknown tier "${tier}" — expected one of ${TIERS.join('|')}`);
  if (wired && expectDeclared) {
    throw new Error('--expect and --wired cannot be combined: --wired runs no tests, so there is no report for a declaration to be checked against');
  }

  return { requirement: normalizeRequirement(requirement), tier: tier as Tier, wired, expectDeclared };
}

export interface AssertionResult {
  title?: string;
  fullName?: string;
  status?: string;
  failureMessages?: string[];
}

interface VitestJson {
  testResults?: { name?: string; status?: string; message?: string; assertionResults?: AssertionResult[] }[];
  numTotalTests?: number;
  numPassedTests?: number;
  numFailedTests?: number;
  numPendingTests?: number;
  numTodoTests?: number;
  success?: boolean;
}

export interface IdRow {
  id: string;
  status: 'green' | 'red' | 'missing';
  detail: string;
}

export interface RuntimeRegistration {
  atId: string;
  title: string;
  surface: string;
}

export interface ReportAnalysis {
  rows: IdRow[];
  unexpected: string[];
}

function assertionId(assertion: AssertionResult): string | null {
  return /^(AT-[\d.]+[a-z]?)\s+—/.exec(assertion.title ?? assertion.fullName ?? '')?.[1] ?? null;
}

export function analyzeReportedTests(
  expected: string[],
  registrations: RuntimeRegistration[],
  assertions: AssertionResult[],
): ReportAnalysis {
  const registrationGroups = new Map<string, RuntimeRegistration[]>();
  for (const registration of registrations) {
    const group = registrationGroups.get(registration.atId) ?? [];
    group.push(registration);
    registrationGroups.set(registration.atId, group);
  }

  const assertionGroups = new Map<string, AssertionResult[]>();
  for (const assertion of assertions) {
    const id = assertionId(assertion);
    if (!id) continue;
    const group = assertionGroups.get(id) ?? [];
    group.push(assertion);
    assertionGroups.set(id, group);
  }

  const rows: IdRow[] = expected.map((id) => {
    const runtime = registrationGroups.get(id) ?? [];
    const results = assertionGroups.get(id) ?? [];
    if (runtime.length !== 1) {
      return {
        id,
        status: 'red',
        detail:
          runtime.length === 0
            ? 'no runtime registration emitted by atTest'
            : `${runtime.length} runtime registrations emitted by atTest; expected exactly 1`,
      };
    }
    if (results.length !== 1) {
      return {
        id,
        status: 'red',
        detail: `${results.length} Vitest results reported; expected exactly 1`,
      };
    }

    const result = results[0];
    const expectedTitle = `${id} — ${runtime[0].title}`;
    if (result.title !== expectedTitle) {
      return {
        id,
        status: 'red',
        detail: `Vitest title ${JSON.stringify(result.title)} does not match runtime registration ${JSON.stringify(expectedTitle)}`,
      };
    }
    if (result.status !== 'passed') {
      return {
        id,
        status: 'red',
        detail: firstLine(result.failureMessages?.join('\n'), `status "${result.status}"`),
      };
    }
    return { id, status: 'green', detail: runtime[0].title };
  });

  const observed = new Set([...registrationGroups.keys(), ...assertionGroups.keys()]);
  const unexpected = [...observed].filter((id) => !expected.includes(id)).sort();
  return { rows, unexpected };
}

function runtimeRegistrations(dir: string): RuntimeRegistration[] {
  const registrations: RuntimeRegistration[] = [];
  for (const file of readdirSync(dir, { withFileTypes: true })) {
    if (!file.isFile() || !file.name.endsWith('.jsonl')) continue;
    const lines = readFileSync(join(dir, file.name), 'utf8').split(/\r?\n/).filter(Boolean);
    for (const line of lines) registrations.push(JSON.parse(line) as RuntimeRegistration);
  }
  return registrations;
}

export interface ProcessOutcome {
  error?: unknown;
  status: number | null;
  signal?: NodeJS.Signals | null;
}

export function runVerdict(rows: IdRow[], unexpected: string[], run: ProcessOutcome): string[] {
  const problems: string[] = [];
  const red = rows.filter((r) => r.status === 'red').length;
  const missing = rows.filter((r) => r.status === 'missing').length;

  if (red) problems.push(`${red} id${red === 1 ? '' : 's'} red`);
  if (missing) problems.push(`${missing} id${missing === 1 ? '' : 's'} missing`);
  if (unexpected.length) {
    problems.push(`${unexpected.length} registered id${unexpected.length === 1 ? '' : 's'} not P0 of this requirement`);
  }

  if (run.error) {
    const err = run.error as NodeJS.ErrnoException;
    problems.push(`the test process could not be launched (${err.code ?? 'spawn error'}): ${diagnostic(err.message)}`);
  } else if (run.status !== 0) {
    const how = run.status === null ? `was killed by signal ${run.signal}` : `exited ${run.status}`;
    problems.push(
      red || missing
        ? `the test process ${how}`
        : `the test process ${how} even though every id reported green — something failed outside the ` +
            `assertions (a teardown, an unhandled rejection, a worker that died). This run is a FAILURE.`,
    );
  }

  return problems;
}

export function cleanupRun(reportDir: string, lock: { release(): void } | null): void {
  try {
    rmSync(reportDir, { recursive: true, force: true });
  } catch (err) {
    console.error(`at:verify — could not remove the report directory ${reportDir}: ${diagnostic((err as Error).message)}`);
  } finally {
    lock?.release();
  }
}

function firstLine(text: string | undefined, fallback: string): string {
  const line = redact(text ?? '')
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  return line ?? fallback;
}

async function main(argv: string[]): Promise<number> {
  let args: Args;
  try {
    args = parseArgs(argv);
  } catch (err) {
    console.error(`at:verify — ${(err as Error).message}`);
    console.error(USAGE);
    return 2;
  }

  const { requirement, tier, wired, expectDeclared } = args;

  if (wired) {
    console.error(
      `at:verify req-${requirement} --wired — the screen driver does not exist yet. Wired re-runs ` +
        `drive the ui-marked ids through real screens; that driver is a later AI4DEV-3 slice, so ` +
        `there is nothing to re-run against and a silent fixture run would be a false green.`,
    );
    return 3;
  }

  const dir = suiteDir(requirement);
  if (!existsSync(dir)) {
    console.error(`at:verify req-${requirement} — no suite at ${dir}`);
    return 2;
  }

  let expected: string[];
  try {
    const preflight = inspectBijection(requirement);
    expected = preflight.expected;
    if (preflight.problems.length) {
      console.error(`at:verify req-${requirement} — AT↔code preflight refused the run: ${preflight.problems.join('; ')}`);
      return 2;
    }
  } catch (err) {
    console.error(`at:verify req-${requirement} — ${(err as Error).message}`);
    return 2;
  }

  let expectation: TierExpectation | null = null;
  if (expectDeclared) {
    try {
      expectation = loadTierExpectation(requirement, tier, expected);
    } catch (err) {
      console.error(`at:verify req-${requirement} --tier ${tier} --expect — DECLARATION REFUSED: ${(err as Error).message}`);
      console.error(`No tests were run. The declaration is the contract; fix ${expectedManifestPath(requirement)}.`);
      return 2;
    }
  }

  const infra = (message: string): number => {
    console.error(`at:verify req-${requirement} --tier ${tier} — INFRASTRUCTURE: ${message}`);
    console.error('No tests were run. This is an infrastructure failure, not a test failure.');
    return 3;
  };

  const stackHelp =
    `Two things cause this:\n` +
    `  1. Docker Desktop is not installed, or is installed but not running, or its CLI is not on ` +
    `PATH — the stack is a set of Docker containers and cannot run without it.\n` +
    `  2. Docker is fine but the one stack is not up, or was started before supabase/config.toml ` +
    `last changed: run \`bun run db:stop\` then \`bun run db:start\`.`;

  const stackEnv: Record<string, string> = {};
  let lock: StackLock | null = null;
  const reportDir = mkdtempSync(join(tmpdir(), 'at-verify-'));
  const registrationDir = join(reportDir, 'registrations');
  mkdirSync(registrationDir);
  const cleanup = () => {
    cleanupRun(reportDir, lock);
    lock = null;
  };
  const onSignal = () => {
    cleanup();
    process.exit(130);
  };
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);

  try {
    if (tier === 'drill') {
      return infra(
        `the drill tier resolves no database: no item has decided which stack drill runs against, ` +
          `so this tier refuses rather than guess. The item that decides drill's stack replaces this.`,
      );
    }

    if (tier === 'integration') {
      if (REPO_ROOT !== INSTALL_ROOT) {
        return infra(
          `the integration tier runs only from the real checkout: AT_REPO_ROOT redirects the data root, and a data ` +
            `root must not choose which database is reset (AT_REPO_ROOT names ${REPO_ROOT}; the checkout is ${INSTALL_ROOT}).`,
        );
      }

      let config: LocalConfig;
      let target: CliTarget;
      try {
        config = readLocalConfig(REPO_ROOT);
        const pin = lifetimePinProblem(config);
        if (pin) return infra(pin);
        target = { workdir: REPO_ROOT, projectId: config.projectId };
        lock = acquireStackLock(config, `req-${requirement}`);
      } catch (err) {
        return infra((err as Error).message);
      }

      try {
        const prepared = await prepareLocalStack(target, config);
        console.log(evidenceLine(prepared, lock));
        Object.assign(stackEnv, childCoordinates(prepared));
      } catch (err) {
        return infra(
          `${(err as Error).message}\n` +
            `The integration tier rebuilds the one stack's database from supabase/migrations on every run, ` +
            `so that a suite never grades leftover rows or a schema missing a migration; if that ` +
            `rebuild fails, the state under test is unknown and the run stops here.\n${stackHelp}`,
        );
      }
    }

    const atRoot = join(REPO_ROOT, 'tests', 'at');
    const outputFile = join(reportDir, 'vitest-report.json');
    const rootOverride: Record<string, string> = {};
    if (process.env.AT_REPO_ROOT?.trim()) rootOverride.AT_REPO_ROOT = process.env.AT_REPO_ROOT.trim();

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
        `suites/req-${requirement}/`,
      ],
      {
        cwd: INSTALL_ROOT,
        env: childEnv({ ...stackEnv, ...rootOverride, AT_TIER: tier, AT_REGISTRATION_DIR: registrationDir }),
        stdio: ['ignore', 'inherit', 'inherit'],
      },
    );

    if (!existsSync(outputFile)) {
      console.error(
        `at:verify req-${requirement} — vitest produced no report ` +
          `(exit ${run.status}${run.signal ? `, signal ${run.signal}` : ''}` +
          `${run.error ? `, ${diagnostic((run.error as Error).message)}` : ''})`,
      );
      return 4;
    }

    let report: VitestJson;
    try {
      report = JSON.parse(readFileSync(outputFile, 'utf8')) as VitestJson;
    } catch (err) {
      console.error(`at:verify req-${requirement} — unreadable vitest report: ${(err as Error).message}`);
      return 4;
    }

    const assertions = (report.testResults ?? []).flatMap((r) => r.assertionResults ?? []);
    const analysis = analyzeReportedTests(expected, runtimeRegistrations(registrationDir), assertions);
    const { rows, unexpected } = analysis;

    console.log('');
    console.log(`at:verify req-${requirement} --tier ${tier}`);
    for (const row of rows) console.log(`  ${row.id.padEnd(12)} ${row.status.padEnd(8)} ${row.detail}`);
    for (const id of unexpected) console.log(`  ${id.padEnd(12)} ${'extra'.padEnd(8)} registered but not a P0 of this requirement`);

    const green = rows.filter((r) => r.status === 'green').length;
    const red = rows.filter((r) => r.status === 'red').length;
    const missing = rows.filter((r) => r.status === 'missing').length;
    console.log(
      `  ${rows.length} P0: ${green} green, ${red} red, ${missing} missing${unexpected.length ? `, ${unexpected.length} extra` : ''}`,
    );

    if (!expectation) {
      const verdict = runVerdict(rows, unexpected, run as ProcessOutcome);
      if (verdict.length === 0) return 0;
      for (const problem of verdict) console.log(`  FAILURE: ${problem}`);
      return 1;
    }

    const deviations = [
      ...expectationDeviations(rows, unexpected, expectation),
      ...reportAccountingDeviations(report, run as ProcessOutcome, expectation),
    ];
    if (deviations.length === 0) {
      console.log(
        `  EXPECTED: the run matches ${expectedManifestPath(requirement)} exactly ` +
          `(${expectation.green.length} declared green, ${Object.keys(expectation.red).length} declared red)`,
      );
      return 0;
    }
    for (const deviation of deviations) console.log(`  DEVIATION: ${deviation}`);
    console.log(
      `  EXPECT FAILURE: ${deviations.length} deviation(s) from the declaration. A red that turned green is a ` +
        `failure too — if reality improved, update the declaration in the same change.`,
    );
    return 1;
  } finally {
    process.off('SIGINT', onSignal);
    process.off('SIGTERM', onSignal);
    cleanup();
  }
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)));

/**
 * The AT runner — `bun run at:verify req-0NN --tier <loop|integration|drill>`.
 *
 * The command shape is fixed: all 30 decomposition manifests cite it verbatim in their done
 * contracts, and the skills (`/dev-start`'s inner loop, `/dev-end`, `/pm-done`'s gate) call it.
 *
 * It resolves the requirement's suite, runs it under vitest with the tier passed through
 * `AT_TIER`, and reports PER AT ID — green / red / missing — because "3 failed" tells a gate
 * nothing about which acceptance criterion is unmet.
 *
 * SLICE 1 boundary: only `--tier loop` runs. `integration` and `drill` need a real test
 * database (the staging Supabase item, AI4DEV-6) and `--wired` needs the screen driver;
 * both refuse loudly rather than degrade into a weaker run that looks like the real one.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { acceptanceP0Ids, normalizeRequirement, REPO_ROOT, suiteDir } from './check.ts';

const TIERS = ['loop', 'integration', 'drill'] as const;
type Tier = (typeof TIERS)[number];

const USAGE = 'usage: bun run at:verify req-0NN --tier <loop|integration|drill> [--wired]';

interface Args {
  requirement: string;
  tier: Tier;
  wired: boolean;
}

function parseArgs(argv: string[]): Args {
  let requirement = '';
  let tier = '';
  let wired = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--wired') wired = true;
    else if (arg === '--tier') tier = argv[++i] ?? '';
    else if (arg.startsWith('--tier=')) tier = arg.slice('--tier='.length);
    else if (arg.startsWith('--')) throw new Error(`unknown option "${arg}"`);
    else if (!requirement) requirement = arg;
    else throw new Error(`unexpected argument "${arg}"`);
  }

  if (!requirement) throw new Error('no requirement given');
  if (!tier) throw new Error('--tier is required — there is no default tier, by design');
  if (!TIERS.includes(tier as Tier)) throw new Error(`unknown tier "${tier}" — expected one of ${TIERS.join('|')}`);

  return { requirement: normalizeRequirement(requirement), tier: tier as Tier, wired };
}

/* --------------------------------------------------------------------------- vitest json shape */

interface AssertionResult {
  title?: string;
  fullName?: string;
  status?: string;
  failureMessages?: string[];
}

interface VitestJson {
  testResults?: { assertionResults?: AssertionResult[] }[];
}

function firstLine(text: string | undefined, fallback: string): string {
  const line = (text ?? '').split('\n').map((l) => l.trim()).find((l) => l.length > 0);
  return line ?? fallback;
}

function main(argv: string[]): number {
  let args: Args;
  try {
    args = parseArgs(argv);
  } catch (err) {
    console.error(`at:verify — ${(err as Error).message}`);
    console.error(USAGE);
    return 2;
  }

  const { requirement, tier, wired } = args;

  if (wired) {
    console.error(
      `at:verify req-${requirement} --wired — the screen driver does not exist yet. Wired re-runs ` +
        `drive the ui-marked ids through real screens; that driver is a later AI4DEV-3 slice, so ` +
        `there is nothing to re-run against and a silent fixture run would be a false green.`,
    );
    return 3;
  }

  if (tier !== 'loop') {
    console.error(
      `at:verify req-${requirement} --tier ${tier} — the ${tier} tier needs a real test database. ` +
        `The staging Supabase item (AI4DEV-6) has not landed, so only --tier loop runs today; ` +
        `running ${tier} against stubs would let the gate grade a stand-in.`,
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
    expected = acceptanceP0Ids(requirement);
  } catch (err) {
    console.error(`at:verify req-${requirement} — ${(err as Error).message}`);
    return 2;
  }

  const atRoot = join(REPO_ROOT, 'tests', 'at');
  const outputFile = join(tmpdir(), `at-verify-req-${requirement}-${process.pid}.json`);
  const vitest = join(REPO_ROOT, 'node_modules', 'vitest', 'vitest.mjs');

  const run = spawnSync(
    process.execPath,
    [
      vitest,
      'run',
      '--root',
      atRoot,
      '--config',
      join(atRoot, 'vitest.config.ts'),
      '--reporter=json',
      `--outputFile=${outputFile}`,
      `suites/req-${requirement}/`,
    ],
    { env: { ...process.env, AT_TIER: tier }, stdio: ['ignore', 'inherit', 'inherit'] },
  );

  if (!existsSync(outputFile)) {
    console.error(`at:verify req-${requirement} — vitest produced no report (exit ${run.status})`);
    return 4;
  }

  let report: VitestJson;
  try {
    report = JSON.parse(readFileSync(outputFile, 'utf8')) as VitestJson;
  } catch (err) {
    console.error(`at:verify req-${requirement} — unreadable vitest report: ${(err as Error).message}`);
    return 4;
  } finally {
    rmSync(outputFile, { force: true });
  }

  const assertions = (report.testResults ?? []).flatMap((r) => r.assertionResults ?? []);
  const byId = new Map<string, AssertionResult>();
  for (const a of assertions) {
    const id = /^(AT-[\d.]+[a-z]?)\s+—/.exec(a.title ?? a.fullName ?? '')?.[1];
    if (id) byId.set(id, a);
  }

  const rows: { id: string; status: 'green' | 'red' | 'missing'; detail: string }[] = [];
  for (const id of expected) {
    const a = byId.get(id);
    if (!a) {
      rows.push({ id, status: 'missing', detail: 'no executable test registers this id' });
    } else if (a.status === 'passed') {
      rows.push({ id, status: 'green', detail: a.title?.split('—').slice(1).join('—').trim() ?? '' });
    } else {
      rows.push({ id, status: 'red', detail: firstLine(a.failureMessages?.join('\n'), `status "${a.status}"`) });
    }
  }
  const unexpected = [...byId.keys()].filter((id) => !expected.includes(id));

  console.log('');
  console.log(`at:verify req-${requirement} --tier ${tier}`);
  for (const row of rows) console.log(`  ${row.id.padEnd(12)} ${row.status.padEnd(8)} ${row.detail}`);
  for (const id of unexpected) console.log(`  ${id.padEnd(12)} ${'extra'.padEnd(8)} registered but not a P0 of this requirement`);

  const green = rows.filter((r) => r.status === 'green').length;
  const red = rows.filter((r) => r.status === 'red').length;
  const missing = rows.filter((r) => r.status === 'missing').length;
  console.log(`  ${rows.length} P0: ${green} green, ${red} red, ${missing} missing${unexpected.length ? `, ${unexpected.length} extra` : ''}`);

  return green === rows.length && unexpected.length === 0 ? 0 : 1;
}

if (import.meta.main) process.exit(main(process.argv.slice(2)));

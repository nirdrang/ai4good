import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { REPO_ROOT } from './check.ts';
import type { PendingPhase } from './registry.ts';
import type { IdRow, ProcessOutcome } from './runner.ts';

export type RedDeclaration =
  | { kind: 'capability-pending'; capabilities: string[] }
  | { kind: 'pending'; phase: PendingPhase };

export interface TierExpectation {
  green: string[];
  red: Record<string, RedDeclaration>;
}

export interface ExpectedManifest {
  requirement: string;
  tiers: Record<string, TierExpectation>;
}

export type ReportedRow = Pick<IdRow, 'id' | 'status' | 'detail'>;

export interface ReportTotals {
  numTotalTests?: unknown;
  numPassedTests?: unknown;
  numFailedTests?: unknown;
  numPendingTests?: unknown;
  numTodoTests?: unknown;
  success?: unknown;
  testResults?: unknown;
}

interface ReportSuiteFile {
  name?: unknown;
  status?: unknown;
  message?: unknown;
  assertionResults?: unknown;
}

const TIERS = ['loop', 'integration', 'drill'];

const AT_ID = /^AT-\d{3}(?:\.\d+)*\.\d+[a-z]?$/;

const REDACTION_SENTINEL = /<redacted(?:-[a-z]+)?>/;

const PENDING_PHASES = ['harness-missing', 'sut-missing', 'tier-unset'] as const satisfies readonly PendingPhase[];

export function expectedManifestPath(requirement: string): string {
  return join(REPO_ROOT, 'tests', 'at', 'expected', `req-${requirement}.json`);
}

function manifestLabel(requirement: string): string {
  return `tests/at/expected/req-${requirement}.json`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseRedDeclaration(label: string, atId: string, value: unknown): RedDeclaration {
  const where = `${label}: the declaration for ${atId}`;
  if (!isPlainObject(value)) {
    throw new Error(
      `${where} must be an object carrying its "kind" — a bare string reason is the old schema, ` +
        `which could be satisfied by an unrelated failure containing the same words`,
    );
  }

  const kind = value.kind;
  if (kind === 'capability-pending') {
    const capabilities = value.capabilities;
    if (!Array.isArray(capabilities) || capabilities.length === 0) {
      throw new Error(`${where} needs a non-empty "capabilities" array`);
    }
    for (const name of capabilities) {
      if (typeof name !== 'string' || name.trim() === '') {
        throw new Error(`${where} has a capability name that is not a non-empty string`);
      }
      if (name.includes(',')) {
        throw new Error(
          `${where} has a capability name containing a comma (${JSON.stringify(name)}) — names are joined with ", ", ` +
            `so a comma makes one name indistinguishable from two`,
        );
      }
      if (REDACTION_SENTINEL.test(name)) {
        throw new Error(
          `${where} declares the redaction sentinel ${JSON.stringify(name)}, which identifies no capability — ` +
            `a detail that gets redacted cannot be declared exactly, and must not be matched loosely`,
        );
      }
    }
    return { kind, capabilities: capabilities as string[] };
  }

  if (kind === 'pending') {
    const phase = value.phase;
    if (typeof phase !== 'string' || !(PENDING_PHASES as readonly string[]).includes(phase)) {
      throw new Error(`${where} needs a "phase" of ${PENDING_PHASES.join(' | ')}, not ${JSON.stringify(phase)}`);
    }
    return { kind, phase: phase as PendingPhase };
  }

  throw new Error(`${where} has an unknown "kind" ${JSON.stringify(kind)} — expected "capability-pending" or "pending"`);
}

function parseTierExpectation(label: string, tier: string, value: unknown): TierExpectation {
  const where = `${label}: the ${tier} tier`;
  if (!isPlainObject(value)) throw new Error(`${where} must be an object`);

  const green = value.green;
  if (!Array.isArray(green) || green.some((id) => typeof id !== 'string')) {
    throw new Error(`${where} needs a "green" array of ids`);
  }
  const red = value.red;
  if (!isPlainObject(red)) throw new Error(`${where} needs a "red" object`);

  // JSON.parse creates an own `__proto__` key; assigning it onto `{}` hits the prototype setter and drops the entry.
  const declared: TierExpectation = { green: green as string[], red: Object.create(null) as Record<string, RedDeclaration> };
  for (const [atId, declaration] of Object.entries(red)) {
    declared.red[atId] = parseRedDeclaration(label, atId, declaration);
  }

  for (const atId of [...declared.green, ...Object.keys(declared.red)]) {
    if (!AT_ID.test(atId)) throw new Error(`${where} declares ${JSON.stringify(atId)}, which is not a well-formed AT id`);
  }
  return declared;
}

export function parseExpectedManifest(text: string, requirement: string): ExpectedManifest {
  const label = manifestLabel(requirement);

  let raw: unknown;
  try {
    raw = JSON.parse(text) as unknown;
  } catch (err) {
    throw new Error(`${label} is not valid JSON: ${(err as Error).message}`);
  }

  if (!isPlainObject(raw)) throw new Error(`${label} must be a JSON object`);

  if (raw.requirement !== requirement) {
    throw new Error(`${label} declares requirement ${JSON.stringify(raw.requirement)} but req-${requirement} is being verified`);
  }

  const tiers = raw.tiers;
  if (!isPlainObject(tiers)) throw new Error(`${label} needs a "tiers" object`);

  const manifest: ExpectedManifest = { requirement, tiers: {} };
  for (const [tier, value] of Object.entries(tiers)) {
    if (!TIERS.includes(tier)) throw new Error(`${label} declares an unknown tier ${JSON.stringify(tier)} — expected ${TIERS.join(' | ')}`);
    manifest.tiers[tier] = parseTierExpectation(label, tier, value);
  }
  return manifest;
}

export function tierExpectation(manifest: ExpectedManifest, tier: string): TierExpectation {
  const declared = manifest.tiers[tier];
  if (!declared) {
    const others = Object.keys(manifest.tiers);
    throw new Error(
      `${manifestLabel(manifest.requirement)} carries no declaration for the ${tier} tier ` +
        `(declared: ${others.length ? others.join(', ') : 'nothing'})`,
    );
  }
  return declared;
}

export function declarationBijectionProblems(expectation: TierExpectation, acceptanceIds: string[]): string[] {
  const redIds = Object.keys(expectation.red);
  const declared = [...expectation.green, ...redIds];
  const problems: string[] = [];

  const undeclared = acceptanceIds.filter((id) => !declared.includes(id));
  if (undeclared.length) {
    problems.push(`${undeclared.length} P0 id${undeclared.length === 1 ? '' : 's'} carr${undeclared.length === 1 ? 'ies' : 'y'} no declaration: ${undeclared.join(', ')}`);
  }

  const strangers = declared.filter((id) => !acceptanceIds.includes(id));
  if (strangers.length) {
    problems.push(`${strangers.length} declared id${strangers.length === 1 ? ' is' : 's are'} not a P0 of this requirement: ${[...new Set(strangers)].join(', ')}`);
  }

  const both = expectation.green.filter((id) => redIds.includes(id));
  if (both.length) problems.push(`${both.length} id${both.length === 1 ? '' : 's'} declared both green and red: ${both.join(', ')}`);

  const twice = [...new Set(expectation.green.filter((id, i) => expectation.green.indexOf(id) !== i))];
  if (twice.length) problems.push(`${twice.length} id${twice.length === 1 ? '' : 's'} listed twice in green: ${twice.join(', ')}`);

  return problems;
}

export function declaredDetail(atId: string, red: RedDeclaration): string {
  return red.kind === 'capability-pending'
    ? `CapabilityPending: CAPABILITY PENDING — ${red.capabilities.join(', ')}`
    : `AtPending: ${atId} PENDING [${red.phase}] — `;
}

export function detailMatches(atId: string, red: RedDeclaration, detail: string): boolean {
  const expected = declaredDetail(atId, red);
  return red.kind === 'capability-pending' ? detail === expected : detail.startsWith(expected);
}

function describeRed(red: RedDeclaration): string {
  return red.kind === 'capability-pending' ? `capability-pending: ${red.capabilities.join(', ')}` : `pending: ${red.phase}`;
}

export function expectationDeviations(rows: ReportedRow[], unexpected: string[], expectation: TierExpectation): string[] {
  const deviations: string[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    seen.add(row.id);
    const red = expectation.red[row.id];
    const declaredGreen = expectation.green.includes(row.id);

    if (row.status === 'missing') {
      deviations.push(`${row.id} — no result was reported for this id`);
      continue;
    }
    if (!red && !declaredGreen) {
      deviations.push(`${row.id} — reported but not declared`);
      continue;
    }
    if (declaredGreen && row.status === 'red') {
      deviations.push(`${row.id} — declared green, reported red: ${row.detail}`);
      continue;
    }
    if (red && row.status === 'green') {
      deviations.push(
        `${row.id} — declared red (${describeRed(red)}), reported GREEN. ` +
          `If this id genuinely works now, update the declaration in this same change.`,
      );
      continue;
    }
    if (red && row.status === 'red' && REDACTION_SENTINEL.test(row.detail)) {
      deviations.push(
        `${row.id} — this red's detail was redacted, so it cannot be matched exactly and the id is undeclarable ` +
          `until the detail no longer contains a secret-shaped token: ${row.detail}`,
      );
      continue;
    }
    if (red && row.status === 'red' && !detailMatches(row.id, red, row.detail)) {
      const expected = declaredDetail(row.id, red);
      const how = red.kind === 'capability-pending' ? 'expected' : 'expected prefix';
      deviations.push(
        `${row.id} — declared red as ${red.kind}, reported a red of a different shape. ` +
          `${how}: ${JSON.stringify(expected)} actual: ${JSON.stringify(row.detail)}`,
      );
    }
  }

  for (const id of unexpected) deviations.push(`${id} — registered but not a P0 of this requirement`);
  for (const id of [...expectation.green, ...Object.keys(expectation.red)]) {
    if (!seen.has(id)) deviations.push(`${id} — declared but not reported`);
  }

  return deviations;
}

// vitest's JSON report serialises a throwing hook in a file that also holds a failing test identically to a healthy run of that file.
export function reportAccountingDeviations(totals: ReportTotals, run: ProcessOutcome, expectation: TierExpectation): string[] {
  const green = expectation.green.length;
  const red = Object.keys(expectation.red).length;
  const deviations: string[] = [];

  if (run.error) {
    const err = run.error as NodeJS.ErrnoException;
    deviations.push(`the test process could not be launched (${err.code ?? 'spawn error'})`);
  }

  const counts: Record<string, unknown> = {
    numTotalTests: totals.numTotalTests,
    numPassedTests: totals.numPassedTests,
    numFailedTests: totals.numFailedTests,
    numPendingTests: totals.numPendingTests,
    numTodoTests: totals.numTodoTests,
  };
  const unusable: string[] = [];
  for (const [field, value] of Object.entries(counts)) {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
      unusable.push(`the report carries no usable ${field}, so the run cannot be accounted for`);
    }
  }
  if (typeof totals.success !== 'boolean') {
    unusable.push('the report carries no usable success flag, so the run cannot be accounted for');
  }
  if (!Array.isArray(totals.testResults)) {
    unusable.push('the report carries no usable testResults array, so suite-level failures cannot be accounted for');
  }
  if (unusable.length) return [...deviations, ...unusable];

  const total = counts.numTotalTests as number;
  const passed = counts.numPassedTests as number;
  const failed = counts.numFailedTests as number;
  const pending = counts.numPendingTests as number;
  const todo = counts.numTodoTests as number;

  if (failed !== red) {
    deviations.push(
      `the report counts ${failed} failed test${failed === 1 ? '' : 's'} but the declaration declares ${red} red${red === 1 ? '' : 's'} — ` +
        `a failure outside the declared ids (an untagged test, a failing hook) looks exactly like this`,
    );
  }
  if (passed !== green) {
    deviations.push(`the report counts ${passed} passed test${passed === 1 ? '' : 's'} but the declaration declares ${green} green${green === 1 ? '' : 's'}`);
  }
  if (total !== green + red) {
    deviations.push(`the report counts ${total} test${total === 1 ? '' : 's'} in total but the declaration accounts for ${green + red} (${green} green + ${red} red) — an extra test ran`);
  }
  if (pending !== 0) deviations.push(`the report counts ${pending} pending (skipped) test${pending === 1 ? '' : 's'} — a skip must never hide inside a declared red`);
  if (todo !== 0) deviations.push(`the report counts ${todo} todo test${todo === 1 ? '' : 's'} — a todo must never hide inside a declared red`);

  if (totals.success !== (red === 0)) {
    deviations.push(
      red === 0
        ? 'the report says the run did not succeed while the declaration declares no red'
        : `the report says the whole run succeeded while the declaration declares ${red} red${red === 1 ? '' : 's'} — ` +
            `vitest should have reported those failures, so a clean run means the suite did not do what the declaration says`,
    );
  }

  if (red === 0 && !run.error && run.status !== 0) {
    const how = run.status === null ? `was killed by signal ${run.signal}` : `exited ${run.status}`;
    deviations.push(`the test process ${how} while the declaration declares no red`);
  }

  deviations.push(...suiteFileDeviations(totals.testResults as ReportSuiteFile[]));

  return deviations;
}

function suiteFileLabel(name: unknown): string {
  const text = typeof name === 'string' ? name : '';
  const base = text.split(/[\\/]/).pop();
  return base && base.length ? base : 'an unnamed test file';
}

function firstLineOf(text: string, limit = 200): string {
  const line =
    text
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.length > 0) ?? '';
  return line.length > limit ? `${line.slice(0, limit)}…` : line;
}

// vitest's JSON reporter: a file that fails to import adds a `failed` testResults entry with zero assertions; the aggregate numFailedTestSuites also counts describe blocks.
function suiteFileDeviations(files: ReportSuiteFile[]): string[] {
  const deviations: string[] = [];

  for (const file of files) {
    const where = suiteFileLabel(file.name);
    const assertions = Array.isArray(file.assertionResults) ? (file.assertionResults as { status?: unknown }[]) : [];
    const failedInFile = assertions.filter((assertion) => assertion?.status !== 'passed').length;

    if (typeof file.status !== 'string') {
      deviations.push(`${where} carries no usable status, so the file cannot be accounted for`);
    } else if (file.status !== 'passed' && failedInFile === 0) {
      deviations.push(
        `${where} is reported "${file.status}" but not one test in it failed — that is a collection, import or hook ` +
          `failure, and no AT id can ever claim it`,
      );
    }

    if (typeof file.message === 'string' && file.message.trim() !== '') {
      deviations.push(`${where} carries a file-level error that no test claims: ${firstLineOf(file.message)}`);
    }
  }

  return deviations;
}

export function loadTierExpectation(requirement: string, tier: string, acceptanceIds: string[]): TierExpectation {
  const file = expectedManifestPath(requirement);

  let text: string;
  try {
    text = readFileSync(file, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`there is no declaration at ${file} — write one, or run without --expect`);
    }
    throw new Error(`could not read ${file}: ${(err as Error).message}`);
  }

  const expectation = tierExpectation(parseExpectedManifest(text, requirement), tier);
  const problems = declarationBijectionProblems(expectation, acceptanceIds);
  if (problems.length) {
    throw new Error(`${manifestLabel(requirement)} is not in bijection with the acceptance file: ${problems.join('; ')}`);
  }
  return expectation;
}

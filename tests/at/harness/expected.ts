/**
 * The expected-state declaration — what `bun run at:verify req-0NN --tier <tier> --expect` checks
 * the run against.
 *
 * WHY THIS EXISTS: without it `at:verify` exits 1 whenever any acceptance id is red, and REQ-016
 * legitimately has honest reds waiting on later capability slices. So the command cannot gate
 * anything — a machine cannot tell "the declared greens plus the declared honest reds" from
 * "something broke", and every claim of green is a human reading a table. A declaration makes the
 * expected state a committed, machine-checked contract instead.
 *
 * TWO RULES DO THE WORK, and both are deliberately harsh:
 *
 *   1. A RED THAT TURNED GREEN IS A FAILURE. The declaration is the contract, so improving reality
 *      means updating the contract in the same change. Without that rule the gate cannot tell
 *      improvement from drift, which is the whole point.
 *
 *   2. A DECLARED RED IS MATCHED BY SHAPE, NOT BY SUBSTRING. A free substring cannot establish
 *      that a red has its declared CAUSE: `H3 fault injection` as a substring also matches
 *      `Error: H3 fault injection: fixture reset failed`, so a brand-new harness defect would
 *      satisfy the declaration. Each declared red therefore names its kind, and the first line the
 *      harness prints is REBUILT from the declaration and compared exactly. A red whose detail
 *      fits neither shape is undeclarable — and therefore a failure. That is deliberate: a red we
 *      cannot describe exactly is a red we do not understand.
 *
 * KNOWN, ACCEPTED TRADE-OFF (rule 2): the rebuilt lines below duplicate message text owned by
 * `capabilities.ts` and `registry.ts`. Deriving them by constructing the error classes would track
 * a wording change silently; duplicating them means a wording change breaks declarations loudly,
 * with a diff naming the id. That is the correct failure direction. Machine-readable capability
 * codes emitted before redaction are the better long-term answer and belong to the slice that owns
 * `capabilities.ts`.
 *
 * Every function here except `loadTierExpectation` is pure, so the comparison rules are unit
 * testable without spawning anything.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { REPO_ROOT } from './check.ts';
import type { PendingPhase } from './registry.ts';
import type { IdRow, ProcessOutcome } from './runner.ts';

/* ------------------------------------------------------------------------------- the schema */

/** A red we can describe exactly. Anything else is undeclarable, and so a failure. */
export type RedDeclaration =
  | { kind: 'capability-pending'; capabilities: string[] }
  | { kind: 'pending'; phase: PendingPhase };

/** One tier's declaration: the ids that MUST be green, and the ids that MUST be red, with why. */
export interface TierExpectation {
  green: string[];
  red: Record<string, RedDeclaration>;
}

export interface ExpectedManifest {
  requirement: string;
  tiers: Record<string, TierExpectation>;
}

/** Exactly the three fields this module reads off a runner report row. */
export type ReportedRow = Pick<IdRow, 'id' | 'status' | 'detail'>;

/**
 * The vitest report's own arithmetic. Typed `unknown` on purpose: this describes someone else's
 * JSON file, so the fields are validated at runtime rather than asserted at compile time.
 */
export interface ReportTotals {
  numTotalTests?: unknown;
  numPassedTests?: unknown;
  numFailedTests?: unknown;
  numPendingTests?: unknown;
  numTodoTests?: unknown;
  success?: unknown;
}

const TIERS = ['loop', 'integration', 'drill'];

/** The same grammar `registry.ts` enforces at the `atTest` call site. */
const AT_ID = /^AT-\d{3}(?:\.\d+)*\.\d+[a-z]?$/;

/** Pinned to the type, so a phase renamed in registry.ts is a compile error here, not a dud rule. */
const PENDING_PHASES = ['harness-missing', 'sut-missing', 'tier-unset'] as const satisfies readonly PendingPhase[];

/* --------------------------------------------------------------------------------- locating */

/** Declarations live under the DATA root, so `AT_REPO_ROOT` redirects them with everything else. */
export function expectedManifestPath(requirement: string): string {
  return join(REPO_ROOT, 'tests', 'at', 'expected', `req-${requirement}.json`);
}

/** The path as it reads in a message — stable across machines, which matters for the selftests. */
function manifestLabel(requirement: string): string {
  return `tests/at/expected/req-${requirement}.json`;
}

/* -------------------------------------------------------------------------------- validating */

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

  const declared: TierExpectation = { green: green as string[], red: {} };
  for (const [atId, declaration] of Object.entries(red)) {
    declared.red[atId] = parseRedDeclaration(label, atId, declaration);
  }

  for (const atId of [...declared.green, ...Object.keys(declared.red)]) {
    if (!AT_ID.test(atId)) throw new Error(`${where} declares ${JSON.stringify(atId)}, which is not a well-formed AT id`);
  }
  return declared;
}

/** Text → validated manifest. PURE. Throws with a precise message on any malformation. */
export function parseExpectedManifest(text: string, requirement: string): ExpectedManifest {
  const label = manifestLabel(requirement);

  let raw: unknown;
  try {
    raw = JSON.parse(text) as unknown;
  } catch (err) {
    throw new Error(`${label} is not valid JSON: ${(err as Error).message}`);
  }

  if (!isPlainObject(raw)) throw new Error(`${label} must be a JSON object`);

  // The `requirement` field has no other purpose than this copy/paste guard.
  if (raw.requirement !== requirement) {
    throw new Error(`${label} declares requirement ${JSON.stringify(raw.requirement)} but req-${requirement} is being verified`);
  }

  const tiers = raw.tiers;
  if (!isPlainObject(tiers)) throw new Error(`${label} needs a "tiers" object`);

  const manifest: ExpectedManifest = { requirement, tiers: {} };
  for (const [tier, value] of Object.entries(tiers)) {
    // A typo'd tier key would otherwise surface as the much vaguer "no declaration for this tier".
    if (!TIERS.includes(tier)) throw new Error(`${label} declares an unknown tier ${JSON.stringify(tier)} — expected ${TIERS.join(' | ')}`);
    manifest.tiers[tier] = parseTierExpectation(label, tier, value);
  }
  return manifest;
}

/** The tier's declaration, or throw naming the tiers that ARE declared. PURE. */
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

/**
 * The declared ids and the acceptance file's P0 ids must be in exact bijection. PURE.
 * A manifest that forgets an id must never silently pass — that id would simply not be checked.
 */
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

/* --------------------------------------------------------------------------- matching a red */

/**
 * The text a declared red MUST produce, rebuilt from the declaration. PURE.
 *
 * `capability-pending` rebuilds the WHOLE first line, mirroring `CapabilityPending` in
 * capabilities.ts (`CAPABILITY PENDING — <names joined by ", ">`, `name = 'CapabilityPending'`)
 * through vitest's `"<name>: <message>"` serialisation.
 *
 * `pending` rebuilds only the anchored PREFIX, mirroring `AtPending` in registry.ts
 * (`<atId> PENDING [<phase>] — <detail>`). The tail is free by construction and must stay free:
 * `sut-missing` carries a string the suite supplies, and `harness-missing` embeds a
 * module-resolution message that differs by machine and checkout path — a declaration that could
 * never be written on a second machine is not a stricter rule, it is a broken one. Class, id and
 * phase are still all matched exactly, from position 0.
 */
export function declaredDetail(atId: string, red: RedDeclaration): string {
  return red.kind === 'capability-pending'
    ? `CapabilityPending: CAPABILITY PENDING — ${red.capabilities.join(', ')}`
    : `AtPending: ${atId} PENDING [${red.phase}] — `;
}

/** Does this reported detail carry exactly the declared shape? PURE. */
export function detailMatches(atId: string, red: RedDeclaration, detail: string): boolean {
  const expected = declaredDetail(atId, red);
  return red.kind === 'capability-pending' ? detail === expected : detail.startsWith(expected);
}

function describeRed(red: RedDeclaration): string {
  return red.kind === 'capability-pending' ? `capability-pending: ${red.capabilities.join(', ')}` : `pending: ${red.phase}`;
}

/* ---------------------------------------------------------------------------- the comparison */

/** Every way the reported ids deviate from the declaration, one line per offending id. PURE. */
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
      // Unreachable once the bijection check has run; kept so a future caller cannot skip it.
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

/**
 * Every way the RUN ITSELF is not fully accounted for by the declaration. PURE.
 *
 * WHY THE ID COMPARISON IS NOT ENOUGH: with reds declared, vitest necessarily exits non-zero, so
 * the process's exit code stops carrying information and an extra failure hides behind an expected
 * one. The id parser only sees tests whose titles carry an AT id, so an untagged `it()` that fails
 * is invisible to it — but not to the report's own arithmetic. Every failing, passing, pending and
 * todo test must add up against the declaration; anything unaccounted for is a failure.
 *
 * KNOWN RESIDUAL GAP: while any red is declared, a failure that fails no test and is not
 * serialised into the report — an unhandled rejection, a hook error attributed to nothing — is
 * still invisible here. Closing it needs a reporter-side envelope, which is filed, not built here.
 */
export function reportAccountingDeviations(totals: ReportTotals, run: ProcessOutcome, expectation: TierExpectation): string[] {
  const green = expectation.green.length;
  const red = Object.keys(expectation.red).length;
  const deviations: string[] = [];

  // A launch failure always fails, whatever the declaration says. No message text is quoted: the
  // code is enough to diagnose a spawn failure, and this module does no redaction of its own.
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
  // Comparing against a field that is missing would be arithmetic on nonsense: report the unusable
  // fields and stop. Under --expect that is a failure, never a skipped check.
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

  // With no red declared the process's own exit is still the plain rule it has always been.
  if (red === 0 && !run.error && run.status !== 0) {
    const how = run.status === null ? `was killed by signal ${run.signal}` : `exited ${run.status}`;
    deviations.push(`the test process ${how} while the declaration declares no red`);
  }

  return deviations;
}

/* ---------------------------------------------------------------------------------- the I/O */

/**
 * Read, validate and select one tier's declaration — the single call the runner makes, performing
 * every refusal in order so that a bad declaration stops the run before any test is run.
 */
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

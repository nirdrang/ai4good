/**
 * The declaration reader and comparison rules, tested as pure functions.
 *
 * The black-box file next door (`runner-expect.selftest.ts`) proves the ASSEMBLED runner behaves,
 * which is the claim a gate depends on. This file proves the rules themselves, which is where the
 * two dangerous cases live: a red that has the declared SHAPE versus one that merely contains the
 * declared WORDS, and a run whose ids all match while its arithmetic does not. Both are cheap to
 * state here and expensive to state end to end.
 *
 * Every expected detail is built through the `DASH` constant rather than being typed inline. The
 * separator the harness really prints is U+2014 EM DASH — verified by codepoint in
 * `capabilities.ts`, in `registry.ts` and in a real vitest report — and routing it through one
 * named constant means a mangled encoding shows up as one obviously-wrong constant instead of as
 * a scattering of assertions that still look right and no longer match.
 */

import { describe, expect, it } from 'vitest';

import {
  declarationBijectionProblems,
  declaredDetail,
  detailMatches,
  expectationDeviations,
  parseExpectedManifest,
  reportAccountingDeviations,
  tierExpectation,
  type RedDeclaration,
  type ReportedRow,
  type TierExpectation,
} from './expected.ts';

const DASH = '—';
const capabilityDetail = (names: string) => `CapabilityPending: CAPABILITY PENDING ${DASH} ${names}`;

const manifest = (body: unknown) => JSON.stringify(body);

const validBody = {
  requirement: '900',
  tiers: {
    loop: {
      green: ['AT-900.01'],
      red: { 'AT-900.02': { kind: 'capability-pending', capabilities: ['H9 imaginary capability'] } },
    },
  },
};

const expectation = (green: string[], red: Record<string, RedDeclaration>): TierExpectation => ({ green, red });

const row = (id: string, status: ReportedRow['status'], detail: string): ReportedRow => ({ id, status, detail });

const totals = (over: Record<string, unknown> = {}) => ({
  numTotalTests: 2,
  numPassedTests: 1,
  numFailedTests: 1,
  numPendingTests: 0,
  numTodoTests: 0,
  success: false,
  ...over,
});

const ranAndFailed = { status: 1 } as const;

describe('parseExpectedManifest refuses anything it cannot act on', () => {
  it('refuses text that is not JSON, naming the file', () => {
    expect(() => parseExpectedManifest('{ nope', '900')).toThrow(/req-900\.json is not valid JSON/);
  });

  it('refuses a top level that is not an object', () => {
    expect(() => parseExpectedManifest('[]', '900')).toThrow(/must be a JSON object/);
  });

  it('refuses a manifest declaring a different requirement', () => {
    expect(() => parseExpectedManifest(manifest({ ...validBody, requirement: '901' }), '900')).toThrow(
      /declares requirement "901" but req-900 is being verified/,
    );
  });

  it('refuses an unknown tier key rather than reporting it later as an absent tier', () => {
    expect(() => parseExpectedManifest(manifest({ requirement: '900', tiers: { lopo: { green: [], red: {} } } }), '900')).toThrow(
      /unknown tier "lopo"/,
    );
  });

  it('refuses a bare-string reason — the old substring schema — instead of reinterpreting it', () => {
    const body = { requirement: '900', tiers: { loop: { green: [], red: { 'AT-900.02': 'H9 imaginary capability' } } } };
    expect(() => parseExpectedManifest(manifest(body), '900')).toThrow(/must be an object carrying its "kind"/);
  });

  it('refuses an unknown kind', () => {
    const body = { requirement: '900', tiers: { loop: { green: [], red: { 'AT-900.02': { kind: 'later' } } } } };
    expect(() => parseExpectedManifest(manifest(body), '900')).toThrow(/unknown "kind" "later"/);
  });

  it('refuses an empty capability list, which could never match any real failure', () => {
    const body = { requirement: '900', tiers: { loop: { green: [], red: { 'AT-900.02': { kind: 'capability-pending', capabilities: [] } } } } };
    expect(() => parseExpectedManifest(manifest(body), '900')).toThrow(/non-empty "capabilities" array/);
  });

  it('refuses a phase the registry does not define', () => {
    const body = { requirement: '900', tiers: { loop: { green: [], red: { 'AT-900.02': { kind: 'pending', phase: 'sut-absent' } } } } };
    expect(() => parseExpectedManifest(manifest(body), '900')).toThrow(/needs a "phase" of/);
  });

  it('refuses a malformed AT id', () => {
    const body = { requirement: '900', tiers: { loop: { green: ['AT-900'], red: {} } } };
    expect(() => parseExpectedManifest(manifest(body), '900')).toThrow(/not a well-formed AT id/);
  });

  it('accepts the typed form and returns it', () => {
    const parsed = parseExpectedManifest(manifest(validBody), '900');
    expect(parsed.tiers.loop.green).toEqual(['AT-900.01']);
    expect(parsed.tiers.loop.red['AT-900.02']).toEqual({ kind: 'capability-pending', capabilities: ['H9 imaginary capability'] });
  });

  it('names the tiers that ARE declared when the requested one is not', () => {
    const parsed = parseExpectedManifest(manifest(validBody), '900');
    expect(() => tierExpectation(parsed, 'integration')).toThrow(/no declaration for the integration tier \(declared: loop\)/);
  });
});

describe('declarationBijectionProblems catches a declaration that does not cover the acceptance file', () => {
  it('names a P0 id nobody declared', () => {
    const problems = declarationBijectionProblems(expectation(['AT-900.01'], {}), ['AT-900.01', 'AT-900.02']);
    expect(problems.join(' ')).toContain('AT-900.02');
    expect(problems.join(' ')).toContain('no declaration');
  });

  it('names a declared id that is not a P0 of this requirement', () => {
    const problems = declarationBijectionProblems(expectation(['AT-900.01', 'AT-900.99'], {}), ['AT-900.01']);
    expect(problems.join(' ')).toContain('AT-900.99');
  });

  it('catches an id declared both green and red, and one listed twice', () => {
    const both = declarationBijectionProblems(
      expectation(['AT-900.01', 'AT-900.01'], { 'AT-900.01': { kind: 'pending', phase: 'sut-missing' } }),
      ['AT-900.01'],
    ).join(' ');
    expect(both).toContain('both green and red');
    expect(both).toContain('twice in green');
  });

  it('says nothing when the declaration is in exact bijection', () => {
    const clean = declarationBijectionProblems(
      expectation(['AT-900.01'], { 'AT-900.02': { kind: 'capability-pending', capabilities: ['H9'] } }),
      ['AT-900.01', 'AT-900.02'],
    );
    expect(clean).toEqual([]);
  });
});

describe('a declared red is matched by shape, not by the words it contains', () => {
  const pendingCapability: RedDeclaration = { kind: 'capability-pending', capabilities: ['H3 fault injection'] };

  it('rebuilds the whole first line for capability-pending', () => {
    expect(declaredDetail('AT-900.02', pendingCapability)).toBe(capabilityDetail('H3 fault injection'));
  });

  it('accepts the exact line the harness prints', () => {
    expect(detailMatches('AT-900.02', pendingCapability, capabilityDetail('H3 fault injection'))).toBe(true);
  });

  it('REJECTS a new harness defect that merely contains the declared words', () => {
    // The whole reason D3's substring rule was replaced: this line would have satisfied it.
    expect(detailMatches('AT-900.02', pendingCapability, 'Error: H3 fault injection: fixture reset failed')).toBe(false);
  });

  it('REJECTS a truncated capability name, which a substring rule would have accepted', () => {
    const truncated: RedDeclaration = { kind: 'capability-pending', capabilities: ['H3 fault'] };
    expect(detailMatches('AT-900.02', truncated, capabilityDetail('H3 fault injection'))).toBe(false);
  });

  it('rejects the same capabilities in a different order or joining', () => {
    const two: RedDeclaration = { kind: 'capability-pending', capabilities: ['H3 sentinels', 'H5 email provider simulator'] };
    expect(detailMatches('AT-900.02', two, capabilityDetail('H3 sentinels, H5 email provider simulator'))).toBe(true);
    expect(detailMatches('AT-900.02', two, capabilityDetail('H5 email provider simulator, H3 sentinels'))).toBe(false);
  });

  it('matches a pending red on class, id and phase, leaving its free tail free', () => {
    const pending: RedDeclaration = { kind: 'pending', phase: 'sut-missing' };
    const detail = `AtPending: AT-900.02 PENDING [sut-missing] ${DASH} REQ-900's implementation is not in the tree`;
    expect(detailMatches('AT-900.02', pending, detail)).toBe(true);
  });

  it('rejects a pending red in a different phase, for a different id, or thrown as a plain Error', () => {
    const pending: RedDeclaration = { kind: 'pending', phase: 'sut-missing' };
    expect(detailMatches('AT-900.02', pending, `AtPending: AT-900.02 PENDING [harness-missing] ${DASH} no harness`)).toBe(false);
    expect(detailMatches('AT-900.02', pending, `AtPending: AT-900.03 PENDING [sut-missing] ${DASH} wrong id`)).toBe(false);
    expect(detailMatches('AT-900.02', pending, `Error: AT-900.02 PENDING [sut-missing] ${DASH} not the real class`)).toBe(false);
  });
});

describe('expectationDeviations reports exactly how a run departs from its declaration', () => {
  const declared = expectation(['AT-900.01'], { 'AT-900.02': { kind: 'capability-pending', capabilities: ['H9 imaginary capability'] } });

  it('says nothing when reality matches the declaration', () => {
    const rows = [row('AT-900.01', 'green', 'a green one'), row('AT-900.02', 'red', capabilityDetail('H9 imaginary capability'))];
    expect(expectationDeviations(rows, [], declared)).toEqual([]);
  });

  it('fails a declared red that turned green, and says to update the declaration', () => {
    const rows = [row('AT-900.01', 'green', 'a green one'), row('AT-900.02', 'green', 'it works now')];
    const line = expectationDeviations(rows, [], declared).join('\n');
    expect(line).toContain('AT-900.02');
    expect(line).toContain('reported GREEN');
    expect(line).toContain('update the declaration');
  });

  it('fails a declared green that turned red', () => {
    const rows = [row('AT-900.01', 'red', 'it broke'), row('AT-900.02', 'red', capabilityDetail('H9 imaginary capability'))];
    expect(expectationDeviations(rows, [], declared).join('\n')).toContain(`AT-900.01 ${DASH} declared green, reported red: it broke`);
  });

  it('fails a red of a different shape, printing both the expected and the actual line', () => {
    const rows = [row('AT-900.01', 'green', 'a green one'), row('AT-900.02', 'red', 'Error: H9 imaginary capability: fixture reset failed')];
    const line = expectationDeviations(rows, [], declared).join('\n');
    expect(line).toContain('a red of a different shape');
    expect(line).toContain(capabilityDetail('H9 imaginary capability'));
    expect(line).toContain('fixture reset failed');
  });

  it('fails an id that registered but is not a P0, and one that reported nothing', () => {
    const rows = [row('AT-900.01', 'green', 'a green one'), row('AT-900.02', 'missing', '')];
    const line = expectationDeviations(rows, ['AT-900.99'], declared).join('\n');
    expect(line).toContain('AT-900.02 — no result was reported');
    expect(line).toContain('AT-900.99 — registered but not a P0');
  });
});

describe('reportAccountingDeviations makes the run add up, not just the ids', () => {
  const declared = expectation(['AT-900.01'], { 'AT-900.02': { kind: 'capability-pending', capabilities: ['H9'] } });

  it('says nothing when the arithmetic matches the declaration', () => {
    expect(reportAccountingDeviations(totals(), ranAndFailed, declared)).toEqual([]);
  });

  it('CATCHES an extra failing test the id parser never saw', () => {
    // Two ids match their declarations perfectly; an untagged `it()` also failed. This is the
    // false green the id comparison alone cannot see.
    const line = reportAccountingDeviations(totals({ numTotalTests: 3, numFailedTests: 2 }), ranAndFailed, declared).join('\n');
    expect(line).toContain('counts 2 failed tests but the declaration declares 1 red');
    expect(line).toContain('an extra test ran');
  });

  it('catches a skipped or todo test hiding inside the run', () => {
    const skipped = reportAccountingDeviations(totals({ numPendingTests: 1 }), ranAndFailed, declared).join('\n');
    expect(skipped).toContain('pending (skipped)');
    const todo = reportAccountingDeviations(totals({ numTodoTests: 1 }), ranAndFailed, declared).join('\n');
    expect(todo).toContain('todo test');
  });

  it('catches a clean run reported while reds are declared', () => {
    const line = reportAccountingDeviations(totals({ success: true }), { status: 0 }, declared).join('\n');
    expect(line).toContain('the whole run succeeded while the declaration declares 1 red');
  });

  it('catches a non-zero exit when no red is declared at all', () => {
    const allGreen = expectation(['AT-900.01', 'AT-900.02'], {});
    const clean = totals({ numPassedTests: 2, numFailedTests: 0, success: true });
    expect(reportAccountingDeviations(clean, { status: 0 }, allGreen)).toEqual([]);
    expect(reportAccountingDeviations(clean, { status: 7 }, allGreen).join('\n')).toContain('exited 7 while the declaration declares no red');
  });

  it('refuses to do arithmetic on a report that lacks the fields', () => {
    const line = reportAccountingDeviations({ numTotalTests: 2 }, ranAndFailed, declared).join('\n');
    expect(line).toContain('carries no usable numPassedTests');
    expect(line).toContain('carries no usable success flag');
  });

  it('fails a process that could not be launched, whatever the declaration says', () => {
    const line = reportAccountingDeviations(totals(), { error: { code: 'ENOENT' }, status: null }, declared).join('\n');
    expect(line).toContain('could not be launched (ENOENT)');
  });
});

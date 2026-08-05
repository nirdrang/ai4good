/**
 * The semantic oracle's conformance wall.
 *
 * WHY THIS FILE CARRIES MORE WEIGHT THAN MOST. No suite consumes an oracle yet: the three
 * acceptance criteria that will (AT-009.07, AT-004.10, AT-033.07) live in untranslated
 * requirements, and the committed replay store is empty because no judge credential existed when
 * this landed. So there is no run anywhere in this tree that would notice if the oracle were
 * quietly broken — not one red test, not one changed expectation. These tests are not supporting
 * evidence for this capability. They are the entire evidence, and every one of them is written so
 * that the machinery going wrong fails it.
 *
 * EVERY TEST HERE RUNS OFFLINE, and that is a rule rather than a happy accident: a loop-tier
 * oracle that touched the network would be a false green of the worst kind, so the transports
 * below are fakes, the replay directories are temp directories, and the one test that exercises
 * the live path deletes `AT_JUDGE_API_KEY` from this process first so that a developer who
 * happens to have one exported cannot turn a conformance run into a billed API call.
 *
 * The load-bearing rubrics are requirement-NEUTRAL and defined here, shaped to hit machinery edges
 * rather than to resemble any requirement. `harness/rubrics/` holds the requirement-shaped
 * examples, and this file checks only that they are well-formed — because their CONTENTS are the
 * future suites' business, and pinning content here would make a disposable skeleton load-bearing
 * by the back door.
 */

import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

import { createConfigRegistry } from './config.ts';
import type { CriterionComparator, ExtractionCriterion, Rubric, RubricCriterion, SemanticCriterion } from './contracts.ts';
import { createHarness } from './index.ts';
import {
  canonicalJson,
  compareExtraction,
  createOracleCapability,
  createReplayTransport,
  createSemanticOracle,
  isCommittedRecordingsDir,
  JUDGE_EFFORT,
  JUDGE_MODEL,
  JUDGE_VOTES_KEY,
  judgeVoteCountProblem,
  materialProblem,
  OracleError,
  OracleReplayMiss,
  OracleUnavailable,
  parseJudgeAnswers,
  readRecordings,
  recordingProblem,
  RECORDINGS_DIR,
  renderJudgeRequest,
  renderSystemPrompt,
  replayKey,
  rubricProblem,
  writeRecording,
  type JudgeRequest,
  type JudgeTransport,
  type RecordingEntry,
} from './oracles.ts';
import { AT_009_07_COMPLIANT, AT_009_07_REJECTION_COPY, AT_009_07_VIOLATING } from './rubrics/at-009-07.ts';
import { AT_004_10_COMPLIANT, AT_004_10_EXAMPLE_RUBRIC, AT_004_10_VIOLATING } from './rubrics/at-004-10.ts';
import { AT_033_07_COMPLIANT, AT_033_07_EXAMPLE_RUBRIC, AT_033_07_VIOLATING } from './rubrics/at-033-07.ts';

/* ------------------------------------------------------------------- neutral fixtures */

/** Two semantic criteria, one required and one not: the required/optional rule needs both. */
const NEUTRAL: Rubric = {
  id: 'conformance-neutral',
  version: '1',
  materialSlots: ['subject'],
  criteria: [
    { kind: 'semantic', id: 'alpha', statement: 'The subject mentions alpha.', required: true },
    { kind: 'semantic', id: 'beta', statement: 'The subject mentions beta.', required: false },
  ],
};
const NEUTRAL_MATERIAL: Record<string, string> = { subject: 'a subject mentioning alpha and beta' };

/** One of each comparator, so the two boundary rules are exercised side by side. */
const MEASURED: Rubric = {
  id: 'conformance-measured',
  version: '1',
  materialSlots: ['reading'],
  criteria: [
    {
      kind: 'extraction',
      id: 'within',
      statement: 'What value does the reading state?',
      required: true,
      extract: { what: 'the stated value', unit: 'units' },
      compare: { op: 'numeric_within_tolerance', expected: 10, tolerance: 0.5 },
    },
    {
      kind: 'extraction',
      id: 'atleast',
      statement: 'How many entries does the reading list?',
      required: true,
      extract: { what: 'the number of listed entries' },
      compare: { op: 'count_at_least', minimum: 3 },
    },
  ],
};
const MEASURED_MATERIAL: Record<string, string> = { reading: 'value 10.2 over four listed entries' };

/** One vote's answers to a rubric: criterion id → `holds` for semantic, extracted number otherwise. */
type Ballot = Record<string, boolean | number>;

function ballotText(rubric: Rubric, ballot: Ballot, evidenceTag: string): string {
  return JSON.stringify({
    answers: rubric.criteria.map((criterion) =>
      criterion.kind === 'semantic'
        ? {
            criterionId: criterion.id,
            kind: 'semantic',
            holds: ballot[criterion.id] as boolean,
            evidence: `${evidenceTag}:${criterion.id}`,
          }
        : {
            criterionId: criterion.id,
            kind: 'extraction',
            value: ballot[criterion.id] as number,
            evidence: `${evidenceTag}:${criterion.id}`,
          },
    ),
  });
}

type ScriptedTransport = { transport: JudgeTransport; calls: number[] };

/**
 * A transport driven by a script of ballots, one per vote. Everything the real transports supply —
 * the source, the served model, the stop reason — is settable, because each of those is a fact a
 * verdict reports and every one of them has a test below that turns it into a refusal.
 */
function scripted(
  rubric: Rubric,
  ballots: Ballot[],
  opts: { source?: 'live' | 'replay'; stopReason?: string; stopDetail?: string; servedModel?: string; text?: string[] } = {},
): ScriptedTransport {
  const calls: number[] = [];
  return {
    calls,
    transport: {
      async send(_request, voteIndex) {
        calls.push(voteIndex);
        const ballot = ballots[Math.min(voteIndex, ballots.length - 1)]!;
        return {
          source: opts.source ?? 'replay',
          servedModel: opts.servedModel ?? JUDGE_MODEL,
          stopReason: opts.stopReason ?? 'end_turn',
          ...(opts.stopDetail === undefined ? {} : { stopDetail: opts.stopDetail }),
          text: opts.text?.[voteIndex] ?? ballotText(rubric, ballot, `vote-${voteIndex}`),
        };
      },
    },
  };
}

/** Stands where "the network was not reached" needs proving: any use at all fails the test. */
const NEVER_TOUCHED: JudgeTransport = {
  async send() {
    throw new Error('this transport must never be reached');
  },
};

function oracleWith(transport: JudgeTransport, votes = 3) {
  return createSemanticOracle({ transport, votes });
}

const tempDirs: string[] = [];
function tempRecordingsDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'at-oracle-'));
  tempDirs.push(dir);
  return dir;
}
afterAll(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

/**
 * Run a body with no judge credential in this process, whatever the developer has exported.
 *
 * The conformance wall must be incapable of making a real API call, and the live transport reads
 * its credential at call time — so the only way to guarantee that is to take it away here and put
 * it back afterwards. What the tests below then assert is exactly the state a test child is
 * guaranteed by the runner's environment allowlist: no key, and a refusal that names why.
 */
async function withoutJudgeCredential<T>(body: () => Promise<T>): Promise<T> {
  const saved = process.env.AT_JUDGE_API_KEY;
  delete process.env.AT_JUDGE_API_KEY;
  try {
    return await body();
  } finally {
    if (saved !== undefined) process.env.AT_JUDGE_API_KEY = saved;
  }
}

/* ------------------------------------------------------------------------------- tests */

describe('a rubric that cannot be judged honestly is refused at construction', () => {
  it('refuses a rubric with no criteria, because a verdict over nothing passes', () => {
    const problem = rubricProblem({ ...NEUTRAL, criteria: [] }) ?? '';
    expect(problem, 'an empty rubric was accepted — every material would pass it').toContain('no criteria');
  });

  it('refuses a duplicated criterion id, because one answer would silently replace the other', () => {
    const duplicated = rubricProblem({ ...NEUTRAL, criteria: [NEUTRAL.criteria[0]!, NEUTRAL.criteria[0]!] }) ?? '';
    expect(duplicated).toContain('twice');
  });

  it('refuses a criterion with no id and one with no statement', () => {
    expect(rubricProblem({ ...NEUTRAL, criteria: [{ ...NEUTRAL.criteria[0]!, id: '  ' }] }) ?? '').toContain('no id');
    expect(rubricProblem({ ...NEUTRAL, criteria: [{ ...NEUTRAL.criteria[0]!, statement: '' }] }) ?? '').toContain(
      'no statement',
    );
  });

  it('refuses a rubric that declares no material slots, or the same one twice', () => {
    expect(rubricProblem({ ...NEUTRAL, materialSlots: [] }) ?? '').toContain('no material slots');
    expect(rubricProblem({ ...NEUTRAL, materialSlots: ['subject', 'subject'] }) ?? '').toContain('twice');
  });

  it('refuses every unusable comparator payload', () => {
    // The casts are the point: this guard exists for values that disagree with their own type — a
    // rubric read from JSON, or one a suite assembled by hand — so the payloads below are exactly
    // the ones the compiler would otherwise have caught.
    const withCompare = (compare: unknown): Rubric => ({
      ...MEASURED,
      criteria: [{ ...(MEASURED.criteria[0] as ExtractionCriterion), compare: compare as CriterionComparator }],
    });
    expect(rubricProblem(withCompare({ op: 'numeric_within_tolerance', expected: 10, tolerance: -1 })) ?? '').toContain(
      'tolerance',
    );
    expect(
      rubricProblem(withCompare({ op: 'numeric_within_tolerance', expected: Number.NaN, tolerance: 1 })) ?? '',
    ).toContain('non-finite');
    expect(rubricProblem(withCompare({ op: 'count_at_least', minimum: 2.5 })) ?? '').toContain('minimum');
    expect(rubricProblem(withCompare({ op: 'count_at_least', minimum: -1 })) ?? '').toContain('minimum');
    expect(rubricProblem(withCompare({ op: 'invented_operator' })) ?? '').toContain('unknown comparator');
  });

  it('refuses a criterion of an unknown kind', () => {
    const invented = { ...(NEUTRAL.criteria[0] as SemanticCriterion), kind: 'vibes' } as unknown as RubricCriterion;
    expect(rubricProblem({ ...NEUTRAL, criteria: [invented] }) ?? '').toContain('unknown kind');
  });

  it('refuses material that does not match the declaration, in both directions', () => {
    expect(materialProblem(NEUTRAL, {}) ?? '', 'a missing slot was accepted').toContain('did not supply');
    expect(
      materialProblem(NEUTRAL, { subject: 'x', smuggled: 'y' }) ?? '',
      'text the rubric never declared was fed to the judge',
    ).toContain('not declared');
    expect(materialProblem(NEUTRAL, { subject: '   ' }) ?? '', 'an empty slot was accepted').toContain('empty');
    expect(materialProblem(NEUTRAL, NEUTRAL_MATERIAL), 'a valid material was refused').toBeNull();
  });

  it('routes judge() through those guards rather than computing them and carrying on', async () => {
    // The guards above are pure functions; an implementation that ignored them would pass every
    // test in this block and fail both of these.
    const oracle = oracleWith(NEVER_TOUCHED);
    await expect(oracle.judge({ ...NEUTRAL, criteria: [] }, NEUTRAL_MATERIAL)).rejects.toThrow(/no criteria/);
    await expect(oracle.judge(NEUTRAL, {})).rejects.toThrow(/did not supply/);
  });
});

describe('the replay key covers the complete rendered request', () => {
  const request = renderJudgeRequest(NEUTRAL, NEUTRAL_MATERIAL);
  const base = replayKey(request, 0);

  it('is stable for the same request and vote', () => {
    expect(replayKey(renderJudgeRequest(NEUTRAL, NEUTRAL_MATERIAL), 0)).toBe(base);
  });

  it('changes when the EFFORT changes — the pin is provisional, so this must invalidate recordings', () => {
    // Finding F7: the effort pin is a guess until a consuming suite can sweep it. Sweeping it must
    // not be able to leave recordings answering under the old setting.
    expect(replayKey({ ...request, effort: 'high' }, 0)).not.toBe(base);
  });

  it('changes when the model, the token cap or the output schema changes', () => {
    expect(replayKey({ ...request, model: 'claude-sonnet-5' }, 0)).not.toBe(base);
    expect(replayKey({ ...request, maxTokens: request.maxTokens + 1 }, 0)).not.toBe(base);
    expect(replayKey({ ...request, outputSchema: { type: 'string' } }, 0)).not.toBe(base);
  });

  it('changes when a MATERIAL VALUE changes, not merely when a slot name does', () => {
    const other = renderJudgeRequest(NEUTRAL, { subject: 'a subject mentioning alpha only' });
    expect(replayKey(other, 0), 'two different texts hash to one key — every recording answers both').not.toBe(base);
  });

  it('changes when the prompt text changes, without anyone bumping a version constant', () => {
    // The point of F6: the rendered prompt is IN the hash, so an edit to renderSystemPrompt() moves
    // every key by itself. Simulated here by moving the rendered system text directly.
    expect(replayKey({ ...request, system: `${request.system}\nand one more instruction` }, 0)).not.toBe(base);
  });

  it('changes when the rubric identity or version changes', () => {
    expect(replayKey({ ...request, rubricId: 'other' }, 0)).not.toBe(base);
    expect(replayKey({ ...request, rubricVersion: '2' }, 0)).not.toBe(base);
  });

  it('changes per vote, so k recordings are needed and the majority cannot be unanimous by accident', () => {
    expect(replayKey(request, 1)).not.toBe(base);
    expect(replayKey(request, 2)).not.toBe(base);
  });

  it('does NOT change when object key order changes, so a harmless refactor keeps recordings alive', () => {
    const reordered = {
      messages: request.messages,
      system: request.system,
      outputSchema: request.outputSchema,
      effort: request.effort,
      maxTokens: request.maxTokens,
      model: request.model,
      rubricVersion: request.rubricVersion,
      rubricId: request.rubricId,
      promptVersion: request.promptVersion,
    } as JudgeRequest;
    expect(replayKey(reordered, 0)).toBe(base);
    expect(canonicalJson({ b: 1, a: 2 })).toBe(canonicalJson({ a: 2, b: 1 }));
  });

  it('never shows the judge the comparator it is not allowed to apply', () => {
    // The extraction-then-code-comparison split is only real if the expected value stays out of the
    // prompt. If it leaks in, the judge can answer the comparison and the arithmetic is back inside
    // the generation.
    const prompt = renderSystemPrompt(MEASURED);
    expect(prompt, 'the expected value reached the judge').not.toContain('10.5');
    expect(prompt, 'the tolerance reached the judge').not.toContain('tolerance');
    expect(prompt, 'the count minimum reached the judge').not.toContain('minimum');
    expect(prompt, 'the criterion ids the judge must key its answers on are missing').toContain('within');
  });
});

describe('the replay store answers from committed bytes, or refuses', () => {
  const liveish = (request: JudgeRequest, voteIndex: number, text: string) =>
    ({
      voteIndex,
      recordedFrom: 'live' as const,
      request,
      servedModel: JUDGE_MODEL,
      stopReason: 'end_turn',
      text,
    });

  it('replays a recorded verdict bit-for-bit, through the same writer conformance uses', async () => {
    const dir = tempRecordingsDir();
    const request = renderJudgeRequest(NEUTRAL, NEUTRAL_MATERIAL);
    for (let vote = 0; vote < 3; vote++) {
      writeRecording(dir, liveish(request, vote, ballotText(NEUTRAL, { alpha: true, beta: true }, `rec-${vote}`)));
    }
    const first = await oracleWith(createReplayTransport(dir)).judge(NEUTRAL, NEUTRAL_MATERIAL);
    const second = await oracleWith(createReplayTransport(dir)).judge(NEUTRAL, NEUTRAL_MATERIAL);
    expect(first.pass).toBe(true);
    expect(JSON.stringify(second), 'two replays of one recording disagreed').toBe(JSON.stringify(first));
    expect(first.provenance.source, 'a replayed verdict claimed to be live').toBe('replay');
  });

  it('answers a miss with a typed error naming the key, and NEVER falls through to a live call', async () => {
    const dir = tempRecordingsDir();
    // The two failure modes are distinguishable ON PURPOSE. A fallthrough to the live transport
    // would raise OracleUnavailable (no credential in a test child); a refusal to fall through
    // raises OracleReplayMiss. Asserting the class is how "no network was reached" is checked
    // without pretending to observe the socket.
    const thrown = await oracleWith(createReplayTransport(dir))
      .judge(NEUTRAL, NEUTRAL_MATERIAL)
      .then(() => null, (err: unknown) => err);
    expect(thrown, 'a replay miss did not raise the typed miss').toBeInstanceOf(OracleReplayMiss);
    expect(thrown, 'a loop-tier miss reached the live transport instead of refusing').not.toBeInstanceOf(
      OracleUnavailable,
    );
    expect((thrown as OracleReplayMiss).key).toBe(replayKey(renderJudgeRequest(NEUTRAL, NEUTRAL_MATERIAL), 0));
    expect((thrown as OracleReplayMiss).message, 'the miss does not name the key it wanted').toContain(
      (thrown as OracleReplayMiss).key,
    );
  });

  it('refuses an entry whose declared key its own stored request does not hash to', () => {
    const dir = tempRecordingsDir();
    const request = renderJudgeRequest(NEUTRAL, NEUTRAL_MATERIAL);
    const entry = writeRecording(dir, liveish(request, 0, ballotText(NEUTRAL, { alpha: true, beta: true }, 'r')));
    // Hand-edit the recording the way a person would: keep the filename, change what it claims to
    // answer. Without the re-derivation the store would happily serve this for another request.
    const tampered: RecordingEntry = { ...entry, key: 'f'.repeat(64) };
    writeFileSync(join(dir, `${entry.key}.json`), JSON.stringify(tampered, null, 2), 'utf8');
    expect(() => readRecordings(dir)).toThrow(/does not hash to/);
  });

  it('refuses a recording that does not say how it was produced', () => {
    const request = renderJudgeRequest(NEUTRAL, NEUTRAL_MATERIAL);
    const entry: RecordingEntry = {
      ...liveish(request, 0, '{}'),
      key: replayKey(request, 0),
      recordedAt: new Date().toISOString(),
      recordedFrom: undefined as never,
    };
    expect(recordingProblem(entry, { committed: false }) ?? '').toContain('no provenance');
  });

  it('refuses a SYNTHETIC entry in the committed store and accepts one anywhere else (F2)', () => {
    const request = renderJudgeRequest(NEUTRAL, NEUTRAL_MATERIAL);
    const synthetic: RecordingEntry = {
      ...liveish(request, 0, '{}'),
      recordedFrom: 'synthetic',
      key: replayKey(request, 0),
      recordedAt: new Date().toISOString(),
    };
    expect(
      recordingProblem(synthetic, { committed: true }) ?? '',
      'a synthetic recording was accepted by the committed store — the loop tier would go green on a verdict no judge gave',
    ).toContain('COMMITTED');
    expect(
      recordingProblem(synthetic, { committed: false }),
      'conformance cannot write its own fixtures, so the replay path could not be tested at all',
    ).toBeNull();
  });

  it('refuses to WRITE a synthetic recording into the committed store, and writes nothing', () => {
    // This one aims the REAL writer at the REAL committed directory, because a refusal proven only
    // against a temp path would prove nothing about the path that matters. The cleanup exists for
    // the day the refusal regresses: the assertion below fails and says so, and the tree is not
    // left carrying an invented recording that a later loop-tier run would answer from.
    const before = readdirSync(RECORDINGS_DIR).sort();
    try {
      expect(() =>
        writeRecording(RECORDINGS_DIR, {
          voteIndex: 0,
          recordedFrom: 'synthetic',
          request: renderJudgeRequest(NEUTRAL, NEUTRAL_MATERIAL),
          servedModel: JUDGE_MODEL,
          stopReason: 'end_turn',
          text: '{}',
        }),
      ).toThrow(/COMMITTED/);
      expect(readdirSync(RECORDINGS_DIR).sort(), 'the refused write still left something behind').toEqual(before);
    } finally {
      for (const name of readdirSync(RECORDINGS_DIR)) {
        if (!before.includes(name)) rmSync(join(RECORDINGS_DIR, name), { force: true });
      }
    }
  });

  it('knows which directory is the committed one', () => {
    expect(isCommittedRecordingsDir(RECORDINGS_DIR)).toBe(true);
    expect(isCommittedRecordingsDir(tempRecordingsDir())).toBe(false);
  });

  it('accepts the committed store as it actually stands, and every entry in it is live', () => {
    // NOT an assertion that the store is empty: it is empty today because no credential existed,
    // and the day someone records against a real key this test must keep meaning something. What it
    // pins is the invariant that survives that day.
    const entries = readRecordings(RECORDINGS_DIR);
    for (const [key, entry] of entries) {
      expect(entry.recordedFrom, `committed recording ${key} is not from a live judge call`).toBe('live');
    }
  });

  it('reads a missing recordings directory as an empty store rather than crashing', () => {
    expect(readRecordings(join(tempRecordingsDir(), 'not-created')).size).toBe(0);
  });
});

describe('a criterion is decided by majority over k votes', () => {
  it('passes on 2-1 and fails on 1-2, and reports the tally either way', async () => {
    const passes = scripted(NEUTRAL, [
      { alpha: true, beta: true },
      { alpha: true, beta: true },
      { alpha: false, beta: true },
    ]);
    const passed = await oracleWith(passes.transport).judge(NEUTRAL, NEUTRAL_MATERIAL);
    expect(passed.criteria.find((entry) => entry.criterionId === 'alpha')).toMatchObject({
      pass: true,
      votes: { pass: 2, fail: 1 },
    });

    const fails = scripted(NEUTRAL, [
      { alpha: false, beta: true },
      { alpha: true, beta: true },
      { alpha: false, beta: true },
    ]);
    const failed = await oracleWith(fails.transport).judge(NEUTRAL, NEUTRAL_MATERIAL);
    expect(failed.criteria.find((entry) => entry.criterionId === 'alpha')).toMatchObject({
      pass: false,
      votes: { pass: 1, fail: 2 },
    });
  });

  it('decides each criterion on its OWN votes, on ballots that cross', async () => {
    // The failure this catches: aggregating per BALLOT rather than per criterion. Here no single
    // ballot agrees with the verdict — alpha carries 2-1 while beta falls 1-2 — so an
    // implementation that picked a winning ballot would get one of the two wrong.
    const crossed = scripted(NEUTRAL, [
      { alpha: true, beta: false },
      { alpha: true, beta: true },
      { alpha: false, beta: false },
    ]);
    const verdict = await oracleWith(crossed.transport).judge(NEUTRAL, NEUTRAL_MATERIAL);
    expect(verdict.criteria.find((entry) => entry.criterionId === 'alpha')).toMatchObject({
      pass: true,
      votes: { pass: 2, fail: 1 },
    });
    expect(verdict.criteria.find((entry) => entry.criterionId === 'beta')).toMatchObject({
      pass: false,
      votes: { pass: 1, fail: 2 },
    });
  });

  it('quotes a vote that AGREED with the reported verdict, never a dissenting one', async () => {
    const split = scripted(NEUTRAL, [
      { alpha: false, beta: true },
      { alpha: true, beta: true },
      { alpha: true, beta: true },
    ]);
    const verdict = await oracleWith(split.transport).judge(NEUTRAL, NEUTRAL_MATERIAL);
    expect(
      verdict.criteria.find((entry) => entry.criterionId === 'alpha')!.evidence,
      'the evidence beside a PASS came from the vote that said FAIL, which reads as support for the opposite verdict',
    ).toBe('vote-1:alpha');
  });

  it('fails the verdict only on a REQUIRED criterion', async () => {
    const optionalFails = scripted(NEUTRAL, [{ alpha: true, beta: false }]);
    const stillPasses = await oracleWith(optionalFails.transport).judge(NEUTRAL, NEUTRAL_MATERIAL);
    expect(stillPasses.pass, 'an optional criterion failed the whole verdict').toBe(true);
    expect(stillPasses.criteria.find((entry) => entry.criterionId === 'beta')!.pass).toBe(false);

    const requiredFails = scripted(NEUTRAL, [{ alpha: false, beta: true }]);
    expect((await oracleWith(requiredFails.transport).judge(NEUTRAL, NEUTRAL_MATERIAL)).pass).toBe(false);
  });
});

describe('the at-config registry is the sole writer of the vote count', () => {
  const oracleAt = (votes: number, transport: JudgeTransport) =>
    createOracleCapability({
      tier: 'loop',
      config: createConfigRegistry({ [JUDGE_VOTES_KEY]: votes }),
      transport,
    }).value;

  it('changes how many times the transport is called', async () => {
    const three = scripted(NEUTRAL, [{ alpha: true, beta: true }]);
    await oracleAt(3, three.transport).judge(NEUTRAL, NEUTRAL_MATERIAL);
    expect(three.calls, 'the vote count did not reach the transport').toEqual([0, 1, 2]);

    const five = scripted(NEUTRAL, [{ alpha: true, beta: true }]);
    await oracleAt(5, five.transport).judge(NEUTRAL, NEUTRAL_MATERIAL);
    expect(five.calls, 'an override of the registry knob changed nothing observable').toEqual([0, 1, 2, 3, 4]);
  });

  it('changes which way a split criterion lands, so a literal 3 in oracles.ts would fail here', async () => {
    // Two passes then three fails: a 2-1 pass at k=3, a 2-3 fail at k=5. An implementation with the
    // count hard-coded would pass the registry's own selftest and fail this one.
    const ballots: Ballot[] = [
      { alpha: true, beta: true },
      { alpha: true, beta: true },
      { alpha: false, beta: true },
      { alpha: false, beta: true },
      { alpha: false, beta: true },
    ];
    expect((await oracleAt(3, scripted(NEUTRAL, ballots).transport).judge(NEUTRAL, NEUTRAL_MATERIAL)).pass).toBe(true);
    expect((await oracleAt(5, scripted(NEUTRAL, ballots).transport).judge(NEUTRAL, NEUTRAL_MATERIAL)).pass).toBe(false);
  });

  it('refuses a vote count that cannot decide anything', () => {
    expect(judgeVoteCountProblem(3)).toBeNull();
    expect(judgeVoteCountProblem(0) ?? '').toContain('no votes');
    expect(judgeVoteCountProblem(-1) ?? '').toContain('no votes');
    expect(judgeVoteCountProblem(2) ?? '').toContain('even');
    expect(judgeVoteCountProblem(2.5) ?? '').toContain('whole number');
    expect(judgeVoteCountProblem('three') ?? '').toContain('must be a number');
  });

  it('refuses those counts through the factory AND through createHarness, not just as a predicate', async () => {
    for (const bad of [0, -1, 2, 2.5]) {
      expect(() => oracleAt(bad, NEVER_TOUCHED), `a vote count of ${bad} built an oracle`).toThrow(OracleError);
      await expect(
        createHarness({ requirement: 'req-016', tier: 'loop', configOverrides: { [JUDGE_VOTES_KEY]: bad } }),
        `a vote count of ${bad} survived createHarness()`,
      ).rejects.toThrow(/judge vote count/);
    }
  });
});

describe('extraction is the judge, comparison is the code', () => {
  const extraction = (id: string) => MEASURED.criteria.find((entry) => entry.id === id) as ExtractionCriterion;

  it('is INCLUSIVE at the tolerance and excludes the first step beyond it', () => {
    expect(compareExtraction(extraction('within'), 10.5), 'a value exactly at the tolerance failed').toBe(true);
    expect(compareExtraction(extraction('within'), 9.5)).toBe(true);
    expect(compareExtraction(extraction('within'), 10.500001)).toBe(false);
    expect(compareExtraction(extraction('within'), 9.499999)).toBe(false);
  });

  it('passes a count exactly at the minimum and fails the one below it', () => {
    expect(compareExtraction(extraction('atleast'), 3), 'a count exactly at the minimum failed').toBe(true);
    expect(compareExtraction(extraction('atleast'), 2)).toBe(false);
    expect(compareExtraction(extraction('atleast'), 400)).toBe(true);
  });

  it('refuses a fractional count rather than rounding it to whichever side passes', () => {
    expect(() => compareExtraction(extraction('atleast'), 2.5)).toThrow(/whole number/);
  });

  it('applies both comparators through judge(), on the boundary', async () => {
    const onTheLine = scripted(MEASURED, [{ within: 10.5, atleast: 3 }]);
    const passed = await oracleWith(onTheLine.transport).judge(MEASURED, MEASURED_MATERIAL);
    expect(passed.pass, 'the boundary case did not survive the round trip through judge()').toBe(true);

    const justOver = scripted(MEASURED, [{ within: 10.6, atleast: 2 }]);
    const failed = await oracleWith(justOver.transport).judge(MEASURED, MEASURED_MATERIAL);
    expect(failed.pass).toBe(false);
    expect(failed.criteria.map((entry) => entry.pass)).toEqual([false, false]);
  });
});

describe('a judge that could not answer is an ERROR, never a pass', () => {
  it('refuses a declined request, naming the refusal and its category', async () => {
    const refused = scripted(NEUTRAL, [{ alpha: true, beta: true }], { stopReason: 'refusal', stopDetail: 'cyber' });
    const thrown = await oracleWith(refused.transport)
      .judge(NEUTRAL, NEUTRAL_MATERIAL)
      .then(() => null, (err: Error) => err.message);
    expect(thrown, 'a refusal was scored as a verdict').toContain('refusal');
    expect(thrown, 'the refusal category was dropped').toContain('cyber');
    // NO SILENT FALLBACK to another model: a substituted judge would be a different oracle wearing
    // this one's id, and the green tick would look identical.
    expect(thrown).toContain('never a silent retry');
  });

  it('refuses a truncated answer', async () => {
    const truncated = scripted(NEUTRAL, [{ alpha: true, beta: true }], { stopReason: 'max_tokens' });
    await expect(oracleWith(truncated.transport).judge(NEUTRAL, NEUTRAL_MATERIAL)).rejects.toThrow(/max_tokens/);
  });

  it('refuses output that is not the verdict schema, however it fails to be', async () => {
    const cases: [string, RegExp][] = [
      ['not json at all', /not JSON/],
      ['{"answers":"nope"}', /no `answers` array/],
      [JSON.stringify({ answers: [{ criterionId: 'alpha', kind: 'semantic', holds: true }] }), /no evidence/],
      [JSON.stringify({ answers: [{ criterionId: 'alpha', kind: 'semantic', evidence: 'q' }] }), /boolean/],
      [JSON.stringify({ answers: [{ criterionId: 'alpha', kind: 'guess', evidence: 'q' }] }), /unknown kind/],
    ];
    for (const [text, expected] of cases) {
      const transport = scripted(NEUTRAL, [{ alpha: true, beta: true }], { text: [text, text, text] });
      await expect(
        oracleWith(transport.transport).judge(NEUTRAL, NEUTRAL_MATERIAL),
        `schema drift ${JSON.stringify(text.slice(0, 30))} was accepted`,
      ).rejects.toThrow(expected);
    }
  });

  it('refuses an answer to a criterion the rubric does not contain, and a criterion left unanswered', () => {
    const unknown = JSON.stringify({
      answers: [
        { criterionId: 'alpha', kind: 'semantic', holds: true, evidence: 'q' },
        { criterionId: 'beta', kind: 'semantic', holds: true, evidence: 'q' },
        { criterionId: 'gamma', kind: 'semantic', holds: true, evidence: 'q' },
      ],
    });
    expect(() => parseJudgeAnswers(NEUTRAL, unknown)).toThrow(/does not contain/);

    const missing = JSON.stringify({ answers: [{ criterionId: 'alpha', kind: 'semantic', holds: true, evidence: 'q' }] });
    expect(() => parseJudgeAnswers(NEUTRAL, missing)).toThrow(/unanswered/);

    const twice = JSON.stringify({
      answers: [
        { criterionId: 'alpha', kind: 'semantic', holds: true, evidence: 'q' },
        { criterionId: 'alpha', kind: 'semantic', holds: false, evidence: 'q' },
        { criterionId: 'beta', kind: 'semantic', holds: true, evidence: 'q' },
      ],
    });
    expect(() => parseJudgeAnswers(NEUTRAL, twice)).toThrow(/more than once/);
  });

  it('refuses an extraction answered as a judgement, which is the whole point of the split', () => {
    const judged = JSON.stringify({
      answers: [
        { criterionId: 'within', kind: 'semantic', holds: true, evidence: 'q' },
        { criterionId: 'atleast', kind: 'extraction', value: 4, evidence: 'q' },
      ],
    });
    expect(() => parseJudgeAnswers(MEASURED, judged)).toThrow(/declares it extraction/);
  });

  it('refuses a verdict assembled half from replay and half from a live call', async () => {
    const calls: number[] = [];
    const mixed: JudgeTransport = {
      async send(_request, voteIndex) {
        calls.push(voteIndex);
        return {
          source: voteIndex === 0 ? 'replay' : 'live',
          servedModel: JUDGE_MODEL,
          stopReason: 'end_turn',
          text: ballotText(NEUTRAL, { alpha: true, beta: true }, 'mixed'),
        };
      },
    };
    await expect(oracleWith(mixed).judge(NEUTRAL, NEUTRAL_MATERIAL)).rejects.toThrow(/did not come from one place/);
  });
});

describe('per-tier provenance, and live mode never consults the replay store', () => {
  it('is a STAND-IN at loop and REAL above it', () => {
    const config = createConfigRegistry();
    expect(createOracleCapability({ tier: 'loop', config, transport: NEVER_TOUCHED }).provenance).toBe('stand-in');
    expect(createOracleCapability({ tier: 'loop', config, transport: NEVER_TOUCHED }).name).toBe('oracles.judge');
    expect(createOracleCapability({ tier: 'integration', config, transport: NEVER_TOUCHED }).provenance).toBe('real');
    expect(createOracleCapability({ tier: 'drill', config, transport: NEVER_TOUCHED }).provenance).toBe('real');
  });

  it('above loop, ignores a recordings directory that WOULD have answered, and names the deferred boundary', async () => {
    const dir = tempRecordingsDir();
    const request = renderJudgeRequest(NEUTRAL, NEUTRAL_MATERIAL);
    for (let vote = 0; vote < 3; vote++) {
      writeRecording(dir, {
        voteIndex: vote,
        recordedFrom: 'live',
        request,
        servedModel: JUDGE_MODEL,
        stopReason: 'end_turn',
        text: ballotText(NEUTRAL, { alpha: true, beta: true }, `rec-${vote}`),
      });
    }
    // A matching recording for every vote is sitting right there. The loop-tier oracle answers from
    // it; the integration-tier one must not look, and must say why it cannot answer instead.
    const replayed = await createOracleCapability({
      tier: 'loop',
      config: createConfigRegistry(),
      recordingsDir: dir,
    }).value.judge(NEUTRAL, NEUTRAL_MATERIAL);
    expect(replayed.provenance.source).toBe('replay');

    await withoutJudgeCredential(async () => {
      const live = createOracleCapability({
        tier: 'integration',
        config: createConfigRegistry(),
        recordingsDir: dir,
      }).value;
      const thrown = await live.judge(NEUTRAL, NEUTRAL_MATERIAL).then(() => null, (err: unknown) => err);
      expect(thrown, 'the live oracle answered from committed recordings').toBeInstanceOf(OracleUnavailable);
      expect((thrown as Error).message, 'the refusal does not name the deferred credential-delivery boundary').toContain(
        'deferred to the slice that makes the integration tier real',
      );
    });
  });

  it('hands a suite an oracle through createHarness, and reports it on the provenance ledger', async () => {
    const h = await createHarness({ requirement: 'req-016', tier: 'loop' });
    try {
      expect(
        await h.stubbedCapabilities(),
        'the oracle dropped off the provenance ledger — an integration-tier run would accept the replay store',
      ).toContain('oracles.judge');
      expect(typeof h.oracles.judge, 'the harness supplies no oracle at all').toBe('function');
      // The committed store is empty, so this is the honest loop-tier answer today: a miss naming
      // the key, and emphatically not a live call.
      await expect(h.oracles.judge(NEUTRAL, NEUTRAL_MATERIAL)).rejects.toBeInstanceOf(OracleReplayMiss);
    } finally {
      await h.teardown();
    }
  });

  it('builds a FRESH oracle per harness, so nothing one test replayed reaches the next', async () => {
    const first = await createHarness({ requirement: 'req-016', tier: 'loop' });
    const second = await createHarness({ requirement: 'req-016', tier: 'loop' });
    try {
      expect(first.oracles, 'two harnesses share one oracle instance').not.toBe(second.oracles);
    } finally {
      await first.teardown();
      await second.teardown();
    }

    // And the replay index is per instance rather than module-level state: an oracle built over an
    // empty directory keeps seeing it empty, while one built afterwards sees what was written. If
    // the index were shared, the second would inherit the first's emptiness — or worse, the first
    // would start answering from bytes it never loaded.
    const dir = tempRecordingsDir();
    const request = renderJudgeRequest(NEUTRAL, NEUTRAL_MATERIAL);
    const stale = oracleWith(createReplayTransport(dir), 1);
    await expect(stale.judge(NEUTRAL, NEUTRAL_MATERIAL)).rejects.toBeInstanceOf(OracleReplayMiss);
    writeRecording(dir, {
      voteIndex: 0,
      recordedFrom: 'live',
      request,
      servedModel: JUDGE_MODEL,
      stopReason: 'end_turn',
      text: ballotText(NEUTRAL, { alpha: true, beta: true }, 'late'),
    });
    const fresh = oracleWith(createReplayTransport(dir), 1);
    expect((await fresh.judge(NEUTRAL, NEUTRAL_MATERIAL)).pass).toBe(true);
    await expect(stale.judge(NEUTRAL, NEUTRAL_MATERIAL)).rejects.toBeInstanceOf(OracleReplayMiss);
  });
});

describe('every verdict carries what it is worth', () => {
  it('records the model asked for, the models served, the request hashes, the rubric and the vote count', async () => {
    const transport = scripted(NEUTRAL, [{ alpha: true, beta: true }], { servedModel: 'claude-opus-5-served' });
    const verdict = await oracleWith(transport.transport).judge(NEUTRAL, NEUTRAL_MATERIAL);
    const request = renderJudgeRequest(NEUTRAL, NEUTRAL_MATERIAL);
    expect(verdict.provenance).toEqual({
      source: 'replay',
      requestedModel: JUDGE_MODEL,
      // TWO fields, not one: a fixed model id is a pinned snapshot rather than pinned behaviour, so
      // what we asked for and what the provider says it served are separate facts and drift between
      // them has to be visible.
      servedModels: ['claude-opus-5-served', 'claude-opus-5-served', 'claude-opus-5-served'],
      requestHashes: [replayKey(request, 0), replayKey(request, 1), replayKey(request, 2)],
      rubricId: NEUTRAL.id,
      rubricVersion: NEUTRAL.version,
      effort: JUDGE_EFFORT,
      votes: 3,
    });
  });
});

describe('the example rubrics are well-formed, and their specimens are complete', () => {
  const examples: [string, Rubric, Record<string, string>, Record<string, string>][] = [
    ['AT-009.07 (near-final)', AT_009_07_REJECTION_COPY, AT_009_07_COMPLIANT, AT_009_07_VIOLATING],
    ['AT-004.10 (disposable skeleton)', AT_004_10_EXAMPLE_RUBRIC, AT_004_10_COMPLIANT, AT_004_10_VIOLATING],
    ['AT-033.07 (disposable skeleton)', AT_033_07_EXAMPLE_RUBRIC, AT_033_07_COMPLIANT, AT_033_07_VIOLATING],
  ];

  for (const [label, rubric, compliant, violating] of examples) {
    it(`accepts ${label} and both of its specimens`, () => {
      // WHAT THIS DOES AND DOES NOT CHECK. It checks that the examples are legal rubrics with
      // complete material — that the contract can express them at all, which is the claim the
      // ratified acceptance text actually supports today. It does NOT check that the compliant
      // specimen passes and the violating one fails, because that is a claim about the judge and
      // there is no recorded judgement to make it from. Asserting it here would need a canned
      // verdict, and a canned verdict is this file grading its own fixture.
      expect(rubricProblem(rubric), `${label} is not a legal rubric`).toBeNull();
      expect(materialProblem(rubric, compliant), `${label}'s compliant specimen does not fill its slots`).toBeNull();
      expect(materialProblem(rubric, violating), `${label}'s violating specimen does not fill its slots`).toBeNull();
    });
  }

  it('covers every criterion KIND the ratified acceptance text pins', () => {
    // Semantic-containment, semantic-absence, count-minimum and numeric-tolerance between them are
    // what AT-009.07, AT-004.10 and AT-033.07 require the contract to express. If an example stops
    // exercising one, the grounding claim in the plan has quietly narrowed.
    const all = examples.flatMap(([, rubric]) => rubric.criteria);
    expect(all.some((criterion) => criterion.kind === 'semantic')).toBe(true);
    expect(
      all.some((criterion) => criterion.kind === 'extraction' && criterion.compare.op === 'count_at_least'),
    ).toBe(true);
    expect(
      all.some((criterion) => criterion.kind === 'extraction' && criterion.compare.op === 'numeric_within_tolerance'),
    ).toBe(true);
    expect(
      AT_033_07_EXAMPLE_RUBRIC.criteria.some((criterion) => criterion.id === 'progress-introduces-no-fabrications'),
      'the no-fabrication criterion went from the AT-033.07 example',
    ).toBe(true);
  });
});

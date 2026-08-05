/**
 * H4 — the semantic oracle: judging the MEANING of generated text, and being able to say what
 * that judgement is worth.
 *
 * WHAT THE PROBLEM ACTUALLY IS. A gate that asks a language model a question gets a different
 * answer on a different day, and an acceptance test whose answer moves is not an acceptance test.
 * The provider exposes no seed — sampling parameters are removed on this model's generation and
 * rejected on the neighbouring one — so "run it again and get the same bytes" is not available at
 * any price. That fact closes the ratified spec's first option and forces the guarantee to be
 * stated per tier rather than asserted once:
 *
 *   loop tier          BIT-DETERMINISTIC BY CONSTRUCTION. The oracle is a replay of committed
 *                      recordings keyed on the complete rendered request. No network, no
 *                      credential. A miss is a loud typed error naming the key it wanted — never
 *                      a fallthrough to a live call, because a gate that quietly goes live when
 *                      its recording is stale is a gate that reports yesterday's answer as
 *                      today's.
 *   integration/drill  STABILITY-BOUNDED, and the bound is measured rather than claimed. Three
 *                      things buy the stability: the rubric is decomposed into named binary
 *                      criteria instead of one free-form score; every number is EXTRACTED by the
 *                      judge and compared in code below, so arithmetic never depends on
 *                      generation; and each criterion is decided by majority over k repeated
 *                      votes, k from the at-config registry.
 *
 * Majority voting does not make a live call deterministic and this file does not pretend it does
 * (Gate 1 finding F1). It reduces independent variance; correlated drift — a model behaving
 * differently next month under the same id — is not something k votes can see. What CAN see it is
 * the provenance every verdict carries and the request hash every recording is keyed on, so drift
 * shows up as a changed answer or a stale key rather than as a quiet pass.
 *
 * NO REFUSAL FALLBACK, DELIBERATELY. The API can decline a request, and the documented remedy is
 * to re-run it on another model. Doing that here would swap the oracle's identity mid-suite: the
 * verdict would be a different judge's, with the same green tick. So a refusal, a truncation, or
 * output that does not match the verdict schema is a typed error carrying the cause. An oracle
 * that cannot judge says so; it never passes.
 */

import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type Anthropic from '@anthropic-ai/sdk';

import { realCapability, standInCapability, type Capability } from './capabilities.ts';
import type { ConfigRegistry } from './config.ts';
import type {
  CriterionComparator,
  CriterionVerdict,
  ExtractionCriterion,
  Rubric,
  RubricCriterion,
  SemanticOracle,
  SemanticVerdict,
  Tier,
  VerdictProvenance,
} from './contracts.ts';

/* ------------------------------------------------------------------------ the pinned judge */

/**
 * ONE MODULE PINS THE JUDGE, so "which model decided this" has a single answer and changing it is
 * a one-line diff plus a re-record.
 *
 * `claude-opus-5`: the judge answers pinned binary questions and does verbatim extraction under a
 * strict output schema, so instruction-following stability is the only quality that matters, and
 * cost is immaterial at this volume (one call carries a whole rubric). Self-preference — the
 * product generates with Claude too — is neutralized by the rubric decomposition rather than by
 * the model choice: the judge never ranks and never free-scores, it checks named criteria against
 * supplied text.
 */
export const JUDGE_MODEL = 'claude-opus-5';

/** One verdict object per call. Thinking is at the model default and is billed inside this cap. */
export const JUDGE_MAX_TOKENS = 4000;

/**
 * PROVISIONAL (Gate 1 finding F7). Anthropic's own guidance is to start high and lower effort
 * where task-specific evaluation shows quality holds — and there is no consuming evaluation to
 * run that sweep against yet, so any value here is a guess and the honest thing is to label it
 * one. The labelled sweep belongs to the first suite that consumes an oracle. Effort is part of
 * the replay key, so changing it invalidates every recording by construction rather than by
 * anyone remembering to.
 */
export const JUDGE_EFFORT = 'low' satisfies JudgeEffort;

/**
 * METADATA ONLY, and the distinction is the whole of finding F6. A hand-bumped prompt version is
 * an invalidation mechanism that fails exactly when it matters: someone edits the prompt and does
 * not bump it, and every recording keeps answering. The real mechanism is `replayKey()`, which
 * hashes the rendered prompt itself. This string survives so a human reading a recording can see
 * which generation of the prompt produced it.
 */
export const PROMPT_VERSION = 'oracle-prompt-1';

export type JudgeEffort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

/* --------------------------------------------------------------------------- typed failures */

/** Every way this capability can decline to answer. It declines loudly; it never passes. */
export class OracleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OracleError';
  }
}

/**
 * The replay store had no entry for a key. Carries the key, because the ONLY useful next step is
 * to record that exact request — and because a miss must be visibly different from a live
 * transport with no credential, which is how conformance proves loop tier never falls through.
 */
export class OracleReplayMiss extends OracleError {
  constructor(
    readonly key: string,
    message: string,
  ) {
    super(message);
    this.name = 'OracleReplayMiss';
  }
}

/** The live judge cannot run in this process — see the message, which names the deferred boundary. */
export class OracleUnavailable extends OracleError {
  constructor(message: string) {
    super(message);
    this.name = 'OracleUnavailable';
  }
}

/* ------------------------------------------------------------------------------ the request */

/**
 * THE COMPLETE RENDERED REQUEST — every input that can change what the judge answers, in one
 * serializable object, because that object is what gets hashed (F6).
 *
 * `rubricId` and `rubricVersion` ride along even though the prompt already contains them in
 * prose: a machine-readable copy lets a recording be identified by a human and, more usefully,
 * makes a rubric renamed-but-otherwise-identical produce a different key.
 */
export type JudgeRequest = {
  promptVersion: string;
  rubricId: string;
  rubricVersion: string;
  model: string;
  maxTokens: number;
  effort: JudgeEffort;
  outputSchema: Record<string, unknown>;
  system: string;
  messages: { role: 'user'; content: string }[];
};

/** What a transport hands back. Deliberately bytes-and-metadata: no parsing happens out there. */
export type JudgeResponse = {
  /** where THESE BYTES came from on THIS run — never where they were originally produced */
  source: 'live' | 'replay';
  /** `response.model`: what the provider says it served, which is not the same fact as `model` */
  servedModel: string;
  stopReason: string;
  /** the refusal category or truncation detail, when the provider supplied one */
  stopDetail?: string;
  text: string;
};

/**
 * The injectable seam. Both real implementations below satisfy it, and so do the fakes in
 * `oracles.selftest.ts` — which is what lets the entire conformance wall run offline, with a
 * transport that throws if it is touched standing in for "the network was not reached".
 */
export type JudgeTransport = {
  send(request: JudgeRequest, voteIndex: number): Promise<JudgeResponse>;
};

/**
 * The verdict schema, enforced server-side by structured outputs AND re-validated here.
 *
 * Both, not either. Server-side enforcement is what makes the happy path reliable; local
 * re-validation is what catches the case the schema cannot express — an answer for a criterion id
 * that is not in this rubric, a missing criterion, an extraction answer to a semantic question.
 * A schema is a shape check, and the thing that would quietly ruin a verdict is a well-shaped
 * answer to the wrong question.
 */
export const VERDICT_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['answers'],
  properties: {
    answers: {
      type: 'array',
      items: {
        anyOf: [
          {
            type: 'object',
            additionalProperties: false,
            required: ['criterionId', 'kind', 'holds', 'evidence'],
            properties: {
              criterionId: { type: 'string' },
              kind: { type: 'string', const: 'semantic' },
              holds: { type: 'boolean' },
              evidence: { type: 'string' },
            },
          },
          {
            type: 'object',
            additionalProperties: false,
            required: ['criterionId', 'kind', 'value', 'evidence'],
            properties: {
              criterionId: { type: 'string' },
              kind: { type: 'string', const: 'extraction' },
              value: { type: 'number' },
              evidence: { type: 'string' },
            },
          },
        ],
      },
    },
  },
};

/** One vote's answer to one criterion, after the local re-validation above. */
export type JudgeAnswer =
  | { criterionId: string; kind: 'semantic'; holds: boolean; evidence: string }
  | { criterionId: string; kind: 'extraction'; value: number; evidence: string };

/* --------------------------------------------------------------------------------- guards */

/**
 * These predicates live here rather than in `guards.ts` on purpose. That file holds the checks
 * every SUITE would otherwise re-assert — sentinel quality, fault arming — and centralizes them
 * because thirty suites would drift. These are the oracle capability's own construction checks:
 * one implementation reads them, and they are exercised both directly and through that
 * implementation below, which is the same standard `guards.ts` is held to.
 *
 * Each returns plain-words trouble, or null when the thing is acceptable.
 */

/** A vote count that cannot decide anything must be refused, never rounded into one that can. */
export function judgeVoteCountProblem(votes: unknown): string | null {
  if (typeof votes !== 'number' || !Number.isFinite(votes)) {
    return `the judge vote count must be a number, got ${JSON.stringify(votes)}`;
  }
  if (!Number.isInteger(votes)) {
    return `a judge vote count of ${votes} is not a whole number of votes — there is no honest way to cast ${votes} of them`;
  }
  if (votes < 1) {
    return `a judge vote count of ${votes} casts no votes at all, so every criterion would be decided by nothing`;
  }
  if (votes % 2 === 0) {
    return (
      `a judge vote count of ${votes} is even, so a criterion can split evenly and the majority is undefined — ` +
      `whichever way the tie were broken would be a verdict nobody chose`
    );
  }
  return null;
}

function comparatorProblem(criterionId: string, compare: CriterionComparator): string | null {
  if (compare.op === 'numeric_within_tolerance') {
    if (!Number.isFinite(compare.expected)) {
      return `criterion ${JSON.stringify(criterionId)} compares against a non-finite expected value (${String(compare.expected)})`;
    }
    if (!Number.isFinite(compare.tolerance) || compare.tolerance < 0) {
      return (
        `criterion ${JSON.stringify(criterionId)} has a tolerance of ${String(compare.tolerance)} — a tolerance is a ` +
        `non-negative distance, and a negative one would fail every extraction including an exact match`
      );
    }
    return null;
  }
  if (compare.op === 'count_at_least') {
    if (!Number.isInteger(compare.minimum) || compare.minimum < 0) {
      return (
        `criterion ${JSON.stringify(criterionId)} has a minimum of ${String(compare.minimum)} — a count-minimum is a ` +
        `non-negative whole number`
      );
    }
    return null;
  }
  return `criterion ${JSON.stringify(criterionId)} carries an unknown comparator ${JSON.stringify((compare as { op: string }).op)}`;
}

/**
 * A rubric is refused at construction, not discovered mid-verdict. A duplicate criterion id would
 * make one criterion's answer silently overwrite another's, and an empty criteria list would
 * produce `pass: true` from a judge that was never asked anything — the most expensive false green
 * available here.
 */
export function rubricProblem(rubric: Rubric): string | null {
  if (typeof rubric?.id !== 'string' || rubric.id.trim() === '') return 'a rubric must carry a non-empty id';
  if (typeof rubric.version !== 'string' || rubric.version.trim() === '') {
    return `rubric ${JSON.stringify(rubric.id)} carries no version`;
  }
  if (!Array.isArray(rubric.materialSlots) || rubric.materialSlots.length === 0) {
    return `rubric ${JSON.stringify(rubric.id)} declares no material slots, so the judge would be shown nothing to judge`;
  }
  const slotsSeen = new Set<string>();
  for (const slot of rubric.materialSlots) {
    if (typeof slot !== 'string' || slot.trim() === '') {
      return `rubric ${JSON.stringify(rubric.id)} declares a blank material slot`;
    }
    if (slotsSeen.has(slot)) {
      return `rubric ${JSON.stringify(rubric.id)} declares the material slot ${JSON.stringify(slot)} twice`;
    }
    slotsSeen.add(slot);
  }
  if (!Array.isArray(rubric.criteria) || rubric.criteria.length === 0) {
    return (
      `rubric ${JSON.stringify(rubric.id)} has no criteria — a verdict over zero criteria passes without ` +
      `anything having been judged`
    );
  }
  const idsSeen = new Set<string>();
  for (const criterion of rubric.criteria) {
    // The id and the kind are READ OFF THE VALUE FIRST, before any narrowing. The types say a
    // criterion is one of two shapes; this function exists for the case where the value disagrees
    // with its type — a rubric assembled from JSON, or a suite that wrote one by hand — and inside
    // the exhausted branch below TypeScript has narrowed the value to `never`, where nothing can
    // be read at all.
    const criterionId: string = criterion?.id;
    const kind: string = criterion?.kind;
    if (typeof criterionId !== 'string' || criterionId.trim() === '') {
      return `rubric ${JSON.stringify(rubric.id)} carries a criterion with no id`;
    }
    if (idsSeen.has(criterionId)) {
      return (
        `rubric ${JSON.stringify(rubric.id)} carries the criterion id ${JSON.stringify(criterionId)} twice — ` +
        `one of the two answers would silently replace the other`
      );
    }
    idsSeen.add(criterionId);
    if (typeof criterion.statement !== 'string' || criterion.statement.trim() === '') {
      return `criterion ${JSON.stringify(criterionId)} has no statement, so the judge would be asked nothing`;
    }
    if (typeof criterion.required !== 'boolean') {
      return `criterion ${JSON.stringify(criterionId)} does not say whether it is required`;
    }
    if (kind === 'extraction') {
      const extraction = criterion as ExtractionCriterion;
      if (typeof extraction.extract?.what !== 'string' || extraction.extract.what.trim() === '') {
        return `extraction criterion ${JSON.stringify(criterionId)} does not say what to extract`;
      }
      const problem = comparatorProblem(criterionId, extraction.compare);
      if (problem !== null) return problem;
    } else if (kind !== 'semantic') {
      return `criterion ${JSON.stringify(criterionId)} has an unknown kind ${JSON.stringify(kind)}`;
    }
  }
  return null;
}

/**
 * The material must match the rubric's declaration exactly. A MISSING slot leaves a criterion
 * unanswerable while the judge answers anyway; an UNDECLARED one feeds the judge text the rubric
 * never mentions, which is a different oracle wearing this one's id.
 */
export function materialProblem(rubric: Rubric, material: Record<string, string>): string | null {
  if (material === null || typeof material !== 'object') return 'material must be a record of slot name to text';
  const supplied = Object.keys(material);
  const missing = rubric.materialSlots.filter((slot) => !supplied.includes(slot));
  if (missing.length) {
    return `rubric ${JSON.stringify(rubric.id)} declares material slot${missing.length === 1 ? '' : 's'} ${missing.join(', ')} that the caller did not supply`;
  }
  const undeclared = supplied.filter((slot) => !rubric.materialSlots.includes(slot));
  if (undeclared.length) {
    return (
      `${undeclared.join(', ')} ${undeclared.length === 1 ? 'is' : 'are'} not declared by rubric ` +
      `${JSON.stringify(rubric.id)} — declared slots: ${rubric.materialSlots.join(', ')}`
    );
  }
  for (const slot of rubric.materialSlots) {
    if (typeof material[slot] !== 'string' || material[slot].trim() === '') {
      return `material slot ${JSON.stringify(slot)} is empty, so every criterion about it would be answered from nothing`;
    }
  }
  return null;
}

/* ------------------------------------------------------------------- rendering and hashing */

function renderCriterion(criterion: RubricCriterion): string {
  const head = `CRITERION ${criterion.id} (${criterion.kind})\n  ${criterion.statement.trim()}`;
  if (criterion.kind === 'semantic') return head;
  const parts = [`  extract: ${criterion.extract.what.trim()}`];
  if (criterion.extract.unit) parts.push(`  unit: ${criterion.extract.unit.trim()}`);
  if (criterion.extract.normalization) parts.push(`  normalization: ${criterion.extract.normalization.trim()}`);
  return `${head}\n${parts.join('\n')}`;
}

/**
 * THE COMPARATOR IS NOT IN THIS PROMPT and that omission is the design. Telling the judge
 * "expected 4200, tolerance 420" invites it to answer the comparison rather than perform the
 * extraction, and then the arithmetic is back inside the generation where its instability came
 * from. The judge is asked for a number; `compareExtraction()` below owns the threshold.
 */
export function renderSystemPrompt(rubric: Rubric): string {
  return [
    'You are judging whether supplied text satisfies a fixed rubric, as part of an automated acceptance test.',
    '',
    'Answer only from the material below. Do not use outside knowledge about the product it came from.',
    'Answer every criterion exactly once, keyed by its id, and answer no criterion that is not listed.',
    '',
    'For a criterion of kind "semantic", set `holds` to whether its statement is true of the material.',
    'For a criterion of kind "extraction", set `value` to the number the criterion names, under the unit and',
    'normalization it gives. Do not decide whether that number is acceptable: a threshold is applied to it in',
    'code, outside this request.',
    '',
    'For every criterion, set `evidence` to a short verbatim quote from the material. Where your answer rests on',
    'something being absent, quote the passage where it would have appeared.',
    '',
    `RUBRIC ${rubric.id} (version ${rubric.version})`,
    '',
    rubric.criteria.map(renderCriterion).join('\n\n'),
  ].join('\n');
}

/** Slots are rendered in the RUBRIC's declared order, never the caller object's key order. */
export function renderMaterial(rubric: Rubric, material: Record<string, string>): string {
  return rubric.materialSlots
    .map((slot) => `<material slot="${slot}">\n${material[slot]}\n</material>`)
    .join('\n\n');
}

export function renderJudgeRequest(rubric: Rubric, material: Record<string, string>): JudgeRequest {
  return {
    promptVersion: PROMPT_VERSION,
    rubricId: rubric.id,
    rubricVersion: rubric.version,
    model: JUDGE_MODEL,
    maxTokens: JUDGE_MAX_TOKENS,
    effort: JUDGE_EFFORT,
    outputSchema: VERDICT_SCHEMA,
    system: renderSystemPrompt(rubric),
    messages: [{ role: 'user', content: renderMaterial(rubric, material) }],
  };
}

/**
 * Key order is not part of a request's meaning, so it must not be part of its hash — otherwise a
 * refactor that reorders a literal invalidates every recording for no reason at all.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entryValue]) => entryValue !== undefined)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
  return `{${entries.map(([key, entryValue]) => `${JSON.stringify(key)}:${canonicalJson(entryValue)}`).join(',')}}`;
}

/**
 * THE REPLAY KEY IS THE WHOLE REQUEST, PLUS THE VOTE INDEX.
 *
 * Model id, max tokens, effort, the output schema, the fully rendered system and user text with
 * every material value in it — all of it. Any code change that alters what the judge is asked
 * produces a different key, so recordings go stale by construction rather than by discipline
 * (F6). The vote index is in the key because the k votes send an identical request and are
 * distinguished only by being separate samples; without it, replay would answer all k votes with
 * one recording and the majority would be unanimous by accident.
 */
export function replayKey(request: JudgeRequest, voteIndex: number): string {
  return createHash('sha256').update(canonicalJson({ request, voteIndex }), 'utf8').digest('hex');
}

/* ---------------------------------------------------------------------- the replay store */

/** Where committed recordings live. Resolved from THIS file: they are harness data, not suite data. */
export const RECORDINGS_DIR: string = resolve(fileURLToPath(new URL('.', import.meta.url)), 'recordings');

/**
 * One recorded judge call.
 *
 * `recordedFrom` is the answer to finding F2 — "how would anyone know a committed recording came
 * from the judge it claims?". A synthetic entry is a legitimate thing for conformance to write
 * into a temp directory; it is not a legitimate thing to find in the committed store, and both
 * the reader and the writer refuse it there. Nothing in this file can produce a synthetic entry
 * that claims to be live, because `recordedFrom` is set by whoever calls the writer and the only
 * live caller is `record-oracles.ts`, which sets it after a real call returns.
 */
export type RecordingEntry = {
  key: string;
  voteIndex: number;
  recordedAt: string;
  recordedFrom: 'live' | 'synthetic';
  request: JudgeRequest;
  servedModel: string;
  stopReason: string;
  stopDetail?: string;
  text: string;
};

/** Is this the committed store — the one directory whose entries must all be live? */
export function isCommittedRecordingsDir(dir: string): boolean {
  return resolve(dir) === RECORDINGS_DIR;
}

/**
 * Everything wrong with one recording, from the store's point of view.
 *
 * The key check is the load-bearing one and it is not decoration: the store indexes by the key the
 * entry DECLARES, so an entry could otherwise name any key it liked and answer a request it was
 * never a recording of. Re-deriving the hash from the stored request makes a hand-edited key a
 * refusal instead of a silent hit.
 */
export function recordingProblem(entry: RecordingEntry, opts: { committed: boolean }): string | null {
  if (entry === null || typeof entry !== 'object') return 'a recording must be an object';
  if (typeof entry.key !== 'string' || entry.key.trim() === '') return 'a recording carries no key';
  if (!Number.isInteger(entry.voteIndex) || entry.voteIndex < 0) {
    return `recording ${entry.key} carries a nonsensical vote index (${String(entry.voteIndex)})`;
  }
  if (entry.recordedFrom !== 'live' && entry.recordedFrom !== 'synthetic') {
    return (
      `recording ${entry.key} does not say how it was produced (recordedFrom=${JSON.stringify(entry.recordedFrom)}) — ` +
      `a recording with no provenance cannot be told from an invented one`
    );
  }
  if (opts.committed && entry.recordedFrom !== 'live') {
    return (
      `recording ${entry.key} is marked ${JSON.stringify(entry.recordedFrom)} and sits in the COMMITTED store, whose ` +
      `entries must every one be the output of a real judge call. A synthetic recording here would make the loop ` +
      `tier green against a verdict no judge ever gave.`
    );
  }
  if (entry.request === null || typeof entry.request !== 'object') return `recording ${entry.key} carries no request`;
  if (typeof entry.servedModel !== 'string' || entry.servedModel.trim() === '') {
    return `recording ${entry.key} does not say which model served it`;
  }
  if (typeof entry.stopReason !== 'string' || entry.stopReason.trim() === '') {
    return `recording ${entry.key} does not say why the judge stopped`;
  }
  if (typeof entry.text !== 'string') return `recording ${entry.key} carries no response text`;
  if (typeof entry.recordedAt !== 'string' || entry.recordedAt.trim() === '') {
    return `recording ${entry.key} carries no recording timestamp`;
  }
  const derived = replayKey(entry.request, entry.voteIndex);
  if (derived !== entry.key) {
    return (
      `recording ${entry.key} declares a key its own stored request does not hash to (${derived}) — the entry has ` +
      `been edited by hand, or the request was recorded under different code`
    );
  }
  return null;
}

/** What the writer is given. The key and the timestamp are the writer's to set, never a caller's. */
export type RecordingDraft = Omit<RecordingEntry, 'key' | 'recordedAt'>;

/**
 * Atomic: written beside the target and renamed into place, so a crash mid-write cannot leave a
 * half-parsed recording that the store would then refuse for the wrong reason.
 *
 * ONE WRITER for both the recorder and conformance (F2). Conformance exercising the same code
 * into a temp directory is what keeps the replay path tested while the committed store is empty.
 */
export function writeRecording(dir: string, draft: RecordingDraft): RecordingEntry {
  const entry: RecordingEntry = {
    ...draft,
    key: replayKey(draft.request, draft.voteIndex),
    recordedAt: new Date().toISOString(),
  };
  const problem = recordingProblem(entry, { committed: isCommittedRecordingsDir(dir) });
  if (problem !== null) throw new OracleError(`refusing to write a recording: ${problem}`);
  mkdirSync(dir, { recursive: true });
  const target = join(dir, `${entry.key}.json`);
  const scratch = `${target}.writing-${process.pid}`;
  writeFileSync(scratch, `${JSON.stringify(entry, null, 2)}\n`, 'utf8');
  renameSync(scratch, target);
  return entry;
}

/** Every recording in a directory, indexed by key. Refuses the whole directory on any bad entry. */
export function readRecordings(dir: string): Map<string, RecordingEntry> {
  const committed = isCommittedRecordingsDir(dir);
  let files: string[];
  try {
    files = readdirSync(dir).filter((name) => name.endsWith('.json'));
  } catch {
    // A missing directory is an EMPTY store, not a crash: with no judge credential this item ships
    // the directory empty on purpose, and the useful error is the miss below, which names the key.
    return new Map();
  }
  const entries = new Map<string, RecordingEntry>();
  for (const name of files.sort()) {
    const path = join(dir, name);
    let parsed: RecordingEntry;
    try {
      parsed = JSON.parse(readFileSync(path, 'utf8')) as RecordingEntry;
    } catch (err) {
      throw new OracleError(`recording ${path} is not readable JSON — ${err instanceof Error ? err.message : String(err)}`);
    }
    const problem = recordingProblem(parsed, { committed });
    if (problem !== null) throw new OracleError(`refusing the replay store at ${dir}: ${problem} (${name})`);
    entries.set(parsed.key, parsed);
  }
  return entries;
}

/**
 * The loop-tier transport: committed bytes, no network, no credential.
 *
 * The index is read ONCE per instance and never written, which is what makes the oracle stateless
 * per harness in the sense finding F12 asked for — `createHarness()` builds a fresh one, so
 * nothing a test does can reach the next test through here, and there is no resource to dispose.
 */
export function createReplayTransport(dir: string): JudgeTransport {
  let index: Map<string, RecordingEntry> | null = null;
  return {
    async send(request, voteIndex) {
      index ??= readRecordings(dir);
      const key = replayKey(request, voteIndex);
      const entry = index.get(key);
      if (!entry) {
        throw new OracleReplayMiss(
          key,
          `no committed recording for judge request ${key} (rubric ${request.rubricId} v${request.rubricVersion}, ` +
            `vote ${voteIndex}) in ${dir}. This is NOT a reason to call the judge live: a loop-tier oracle that ` +
            `reached the network would report today's answer under yesterday's expectations. Record it parent-side ` +
            `with \`bun tests/at/harness/record-oracles.ts\` (needs AT_JUDGE_API_KEY in the CALLING process) and ` +
            `commit the result.`,
        );
      }
      // The source is REWRITTEN to 'replay', never carried over from the recording. The recording
      // says where the bytes were produced; the verdict must say where they came from this run,
      // and reporting 'live' for a replayed call is the exact lie provenance exists to prevent.
      return {
        source: 'replay',
        servedModel: entry.servedModel,
        stopReason: entry.stopReason,
        ...(entry.stopDetail === undefined ? {} : { stopDetail: entry.stopDetail }),
        text: entry.text,
      };
    },
  };
}

/* ---------------------------------------------------------------------- the live transport */

/**
 * PARENT-SIDE ONLY. `AT_JUDGE_API_KEY` is read from whatever process calls this and is never
 * spread into a child — the runner's environment allowlist is untouched by this item, and this
 * item's live surface is the recorder and the smoke script, both of which run beside the developer
 * rather than inside a test (plan §4d, ruling F8).
 *
 * The credential is read at CALL time, not construction, so building the capability above the loop
 * tier costs nothing and the refusal below arrives where a suite could actually see it.
 *
 * UNEXERCISED AT THE TIME OF WRITING. No judge credential existed when this landed, so no live
 * call has ever been made through this function. What IS verified is the request shape: it is
 * assembled through the official SDK's own parameter types, so `bun run typecheck` fails if the
 * pinned model, max-token, effort or structured-output fields are not what that SDK version
 * accepts. That is a compile-time check of the shape, not a runtime check of the behaviour, and
 * the difference is stated here rather than glossed.
 */
export function createLiveTransport(): JudgeTransport {
  let client: Anthropic | null = null;
  return {
    async send(request, voteIndex) {
      // Every vote sends the IDENTICAL request; they differ only by being separate samples. The
      // index reaches the key, not the wire.
      void voteIndex;
      const apiKey = process.env.AT_JUDGE_API_KEY?.trim();
      if (!apiKey) {
        throw new OracleUnavailable(
          'the semantic oracle has no judge credential in this process. AT_JUDGE_API_KEY is read only by the ' +
            'PARENT-side recorder and smoke scripts and is deliberately not passed into any test child: how a ' +
            'credential should reach a child at integration tier — a broker, a scoped key, something else — is a ' +
            'decision deferred to the slice that makes the integration tier real, taken with its first consuming ' +
            'run rather than guessed at now (AI4DEV-20 plan §2, ruling F8). At loop tier the oracle replays ' +
            'committed recordings and needs no credential at all.',
        );
      }
      if (!client) {
        const { default: AnthropicClient } = await import('@anthropic-ai/sdk');
        client = new AnthropicClient({ apiKey });
      }
      const message = await client.messages.create({
        model: request.model,
        max_tokens: request.maxTokens,
        system: request.system,
        messages: request.messages,
        output_config: {
          effort: request.effort,
          format: { type: 'json_schema', schema: request.outputSchema },
        },
      });
      const text = message.content
        .filter((block): block is Extract<typeof block, { type: 'text' }> => block.type === 'text')
        .map((block) => block.text)
        .join('');
      return {
        source: 'live',
        servedModel: message.model,
        stopReason: message.stop_reason ?? '<none reported>',
        ...(message.stop_details?.category ? { stopDetail: message.stop_details.category } : {}),
        text,
      };
    },
  };
}

/* --------------------------------------------------------------- parsing and aggregation */

function answersProblem(rubric: Rubric, answers: JudgeAnswer[]): string | null {
  const byId = new Map<string, JudgeAnswer>();
  for (const answer of answers) {
    if (byId.has(answer.criterionId)) {
      return `the judge answered criterion ${JSON.stringify(answer.criterionId)} more than once`;
    }
    const criterion = rubric.criteria.find((entry) => entry.id === answer.criterionId);
    if (!criterion) {
      return (
        `the judge answered ${JSON.stringify(answer.criterionId)}, which rubric ${JSON.stringify(rubric.id)} does not ` +
        `contain — an answer to a question nobody asked cannot be scored`
      );
    }
    if (criterion.kind !== answer.kind) {
      return (
        `the judge answered criterion ${JSON.stringify(answer.criterionId)} as ${answer.kind} while the rubric ` +
        `declares it ${criterion.kind}`
      );
    }
    byId.set(answer.criterionId, answer);
  }
  const unanswered = rubric.criteria.filter((criterion) => !byId.has(criterion.id)).map((criterion) => criterion.id);
  if (unanswered.length) {
    return `the judge left criteri${unanswered.length === 1 ? 'on' : 'a'} ${unanswered.join(', ')} unanswered`;
  }
  return null;
}

/** Local re-validation of one vote's structured output. Anything unexpected is an error, never a pass. */
export function parseJudgeAnswers(rubric: Rubric, text: string): JudgeAnswer[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new OracleError(
      `the judge's output is not JSON (${err instanceof Error ? err.message : String(err)}). The verdict schema is ` +
        `enforced server-side, so unparseable output means the response was truncated or the request was not the ` +
        `one this code believes it sent.`,
    );
  }
  const answersRaw = (parsed as { answers?: unknown })?.answers;
  if (!Array.isArray(answersRaw)) throw new OracleError("the judge's output carries no `answers` array");
  const answers: JudgeAnswer[] = [];
  for (const raw of answersRaw as Record<string, unknown>[]) {
    if (raw === null || typeof raw !== 'object') throw new OracleError('the judge returned an answer that is not an object');
    const criterionId = raw.criterionId;
    const evidence = raw.evidence;
    if (typeof criterionId !== 'string' || criterionId.trim() === '') {
      throw new OracleError('the judge returned an answer with no criterion id');
    }
    if (typeof evidence !== 'string' || evidence.trim() === '') {
      throw new OracleError(`the judge returned no evidence for criterion ${JSON.stringify(criterionId)}`);
    }
    if (raw.kind === 'semantic') {
      if (typeof raw.holds !== 'boolean') {
        throw new OracleError(`the judge's semantic answer for ${JSON.stringify(criterionId)} carries no boolean \`holds\``);
      }
      answers.push({ criterionId, kind: 'semantic', holds: raw.holds, evidence });
      continue;
    }
    if (raw.kind === 'extraction') {
      if (typeof raw.value !== 'number' || !Number.isFinite(raw.value)) {
        throw new OracleError(
          `the judge's extraction answer for ${JSON.stringify(criterionId)} carries no finite \`value\` (${String(raw.value)})`,
        );
      }
      answers.push({ criterionId, kind: 'extraction', value: raw.value, evidence });
      continue;
    }
    throw new OracleError(`the judge returned an answer of unknown kind ${JSON.stringify(raw.kind)}`);
  }
  const problem = answersProblem(rubric, answers);
  if (problem !== null) throw new OracleError(problem);
  return answers;
}

/**
 * THE ARITHMETIC, IN CODE. This is the half of the determinism story that does not depend on the
 * judge behaving the same way twice: given the same extracted number, this returns the same answer
 * forever.
 */
export function compareExtraction(criterion: ExtractionCriterion, value: number): boolean {
  const compare = criterion.compare;
  if (compare.op === 'numeric_within_tolerance') {
    // INCLUSIVE at the boundary: a tolerance of 0.5 means half a unit either way is acceptable,
    // and "acceptable" that excludes its own stated limit is a different tolerance.
    return Math.abs(value - compare.expected) <= compare.tolerance;
  }
  if (!Number.isInteger(value)) {
    // A COUNT IS NOT ROUNDED. "2.5 occurrences" is the judge failing to count, and rounding it to
    // whichever side happens to pass is the guess this harness exists to refuse.
    throw new OracleError(
      `criterion ${JSON.stringify(criterion.id)} counts occurrences and the judge extracted ${value}, which is not a ` +
        `whole number of them`,
    );
  }
  return value >= compare.minimum;
}

function voteOutcome(criterion: RubricCriterion, answer: JudgeAnswer): boolean {
  if (criterion.kind === 'semantic') {
    if (answer.kind !== 'semantic') throw new OracleError(`criterion ${criterion.id} was answered as ${answer.kind}`);
    return answer.holds;
  }
  if (answer.kind !== 'extraction') throw new OracleError(`criterion ${criterion.id} was answered as ${answer.kind}`);
  return compareExtraction(criterion, answer.value);
}

/* -------------------------------------------------------------------------- the oracle */

export const JUDGE_VOTES_KEY = 'harness.oracle.judge_votes';

/**
 * THE REGISTRY IS THE SOLE WRITER of the vote count (finding F10). The number is never a literal
 * in this file: it is read here, from the at-config registry, and `oracles.selftest.ts` proves an
 * override changes both how many times the transport is called and which way a split criterion
 * lands. A literal that happened to equal the registry's value would pass a test that only checked
 * the registry entry existed; it fails the test that overrides it.
 */
export function readJudgeVotes(config: ConfigRegistry): number {
  const votes = config.get<number>(JUDGE_VOTES_KEY);
  const problem = judgeVoteCountProblem(votes);
  if (problem !== null) {
    throw new OracleError(`refusing to build the semantic oracle from ${JUDGE_VOTES_KEY}: ${problem}`);
  }
  return votes;
}

export function createSemanticOracle(opts: { transport: JudgeTransport; votes: number }): SemanticOracle {
  const problem = judgeVoteCountProblem(opts.votes);
  if (problem !== null) throw new OracleError(`refusing to build the semantic oracle: ${problem}`);
  const votes = opts.votes;

  return {
    async judge(rubric, material) {
      const rubricTrouble = rubricProblem(rubric);
      if (rubricTrouble !== null) throw new OracleError(`refusing to judge: ${rubricTrouble}`);
      const materialTrouble = materialProblem(rubric, material);
      if (materialTrouble !== null) throw new OracleError(`refusing to judge: ${materialTrouble}`);

      const request = renderJudgeRequest(rubric, material);
      const ballots: JudgeAnswer[][] = [];
      const servedModels: string[] = [];
      const requestHashes: string[] = [];
      const sources = new Set<JudgeResponse['source']>();

      for (let voteIndex = 0; voteIndex < votes; voteIndex++) {
        const response = await opts.transport.send(request, voteIndex);
        // THE STOP REASON IS CHECKED BEFORE THE TEXT IS TOUCHED, and it is checked here rather
        // than in the transport so that a RECORDED refusal replays as a refusal. A recording of a
        // declined call is a legitimate thing to hold; treating it as a verdict is not.
        if (response.stopReason !== 'end_turn') {
          throw new OracleError(
            `the judge did not finish: stop reason ${JSON.stringify(response.stopReason)}` +
              `${response.stopDetail ? ` (${response.stopDetail})` : ''} on vote ${voteIndex} of rubric ` +
              `${JSON.stringify(rubric.id)}. This is an oracle ERROR, never a pass and never a silent retry on ` +
              `another model — a substituted model would be a different judge wearing this one's verdict.`,
          );
        }
        if (response.source !== 'live' && response.source !== 'replay') {
          throw new OracleError(`a judge transport reported an unknown source ${JSON.stringify(response.source)}`);
        }
        sources.add(response.source);
        servedModels.push(response.servedModel);
        requestHashes.push(replayKey(request, voteIndex));
        ballots.push(parseJudgeAnswers(rubric, response.text));
      }

      if (sources.size !== 1) {
        throw new OracleError(
          `the ${votes} votes did not come from one place (${[...sources].sort().join(', ')}) — a verdict half ` +
            `replayed and half live cannot honestly report either`,
        );
      }

      const criteria: CriterionVerdict[] = rubric.criteria.map((criterion) => {
        const outcomes = ballots.map((ballot) => {
          const answer = ballot.find((entry) => entry.criterionId === criterion.id)!;
          return { outcome: voteOutcome(criterion, answer), evidence: answer.evidence };
        });
        const passCount = outcomes.filter((entry) => entry.outcome).length;
        // k is a positive ODD integer, so this is a strict majority with no tie to break.
        const pass = passCount * 2 > votes;
        return {
          criterionId: criterion.id,
          pass,
          // The evidence shown is the first vote that AGREED with the majority: quoting a
          // dissenting vote beside the reported verdict would read as the verdict's own support.
          evidence: outcomes.find((entry) => entry.outcome === pass)!.evidence,
          votes: { pass: passCount, fail: votes - passCount },
        };
      });

      const provenance: VerdictProvenance = {
        source: [...sources][0]!,
        requestedModel: request.model,
        servedModels,
        requestHashes,
        rubricId: rubric.id,
        rubricVersion: rubric.version,
        effort: request.effort,
        votes,
      };

      const failedRequired = criteria.filter(
        (verdict) => !verdict.pass && rubric.criteria.find((criterion) => criterion.id === verdict.criterionId)!.required,
      );
      return { pass: failedRequired.length === 0, criteria, provenance };
    },
  };
}

/**
 * The capability, per tier — and exactly what that does and does not establish (finding F3).
 *
 * At `loop` the oracle is a REPLAY and says so: `standInCapability` puts `oracles.judge` on the
 * provenance ledger, which is what stops an integration-tier run grading against committed bytes.
 * Above `loop` it is the live judge and is reported real.
 *
 * WHAT THIS DOES NOT DO is make the integration tier reachable. `createHarness()` still registers
 * the clock, the fixtures, the vendor sim and every system-under-test member as stand-ins, so
 * `registry.ts` refuses a non-loop run wholesale today. This settles ONE capability's provenance;
 * the tier becomes reachable when the other stand-ins are replaced, which is other slices' work.
 *
 * `recordingsDir` and `transport` are conformance seams and the harness passes neither. Note that
 * `recordingsDir` is consulted only at loop tier: the test that hands it a directory containing a
 * MATCHING recording at integration tier, and still gets the live transport's refusal, is what
 * proves live mode never consults the replay store.
 */
export function createOracleCapability(opts: {
  tier: Tier;
  config: ConfigRegistry;
  recordingsDir?: string;
  transport?: JudgeTransport;
}): Capability<SemanticOracle> {
  const votes = readJudgeVotes(opts.config);
  if (opts.tier === 'loop') {
    const transport = opts.transport ?? createReplayTransport(opts.recordingsDir ?? RECORDINGS_DIR);
    return standInCapability('oracles.judge', createSemanticOracle({ transport, votes }));
  }
  const transport = opts.transport ?? createLiveTransport();
  return realCapability('oracles.judge', createSemanticOracle({ transport, votes }));
}

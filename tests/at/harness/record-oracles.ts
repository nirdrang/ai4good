/**
 * The judge recorder — `bun tests/at/harness/record-oracles.ts`.
 *
 * PARENT-SIDE, AND THAT IS THE WHOLE POINT. This script is the only thing in the tree that calls
 * the judge for real. It reads `AT_JUDGE_API_KEY` from its own environment and runs beside the
 * developer, never inside a test child: the runner's environment allowlist is untouched by this
 * item, so no credential can reach a spawned test, and how one eventually should reach a child at
 * integration tier is a decision deferred to the slice that makes that tier real (plan §4d,
 * ruling F8).
 *
 * IT IS ALSO THE SOLE WRITER of committed recordings, which is the answer to Gate 1 finding F2:
 * "how would anyone know a committed recording came from the judge it claims?". Everything it
 * writes is marked `recordedFrom: 'live'` because it has just watched a live response arrive, and
 * `writeRecording()` refuses anything else in the committed directory. Conformance writes through
 * the same function into temp directories with entries marked synthetic, so the replay path stays
 * tested without a single invented byte reaching the store.
 *
 * WHAT IT PRODUCES, in one run:
 *   1. the committed recordings for each example specimen — k votes each, keyed on the complete
 *      rendered request, which is what the loop tier replays;
 *   2. a MEASURED stability figure: the full k-vote verdict repeated N times live over the same
 *      fixed specimens, with per-criterion flips counted. Finding F1 accepted the stability
 *      argument only on condition it be measured rather than asserted, and this is where the
 *      measurement comes from;
 *   3. `loop/items/AI4DEV-20/live-smoke.md`, which is that measurement written down.
 *
 * NEVER IN CI. It costs money, it needs a credential CI does not have, and its output is committed
 * data rather than a check.
 *
 * NOT YET RUN. No judge credential existed on the machine where this landed, so every line below
 * is unexercised: what has been verified is that it compiles against the pinned SDK's own request
 * and response types, and nothing more. Treat the first real run as a bring-up, not a formality.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { INSTALL_ROOT } from './check.ts';
import { createConfigRegistry } from './config.ts';
import type { Rubric, SemanticVerdict } from './contracts.ts';
import {
  createLiveTransport,
  createSemanticOracle,
  JUDGE_EFFORT,
  JUDGE_MODEL,
  parseJudgeAnswers,
  readJudgeVotes,
  RECORDINGS_DIR,
  renderJudgeRequest,
  writeRecording,
  type JudgeResponse,
  type JudgeTransport,
} from './oracles.ts';
import { AT_009_07_COMPLIANT, AT_009_07_REJECTION_COPY, AT_009_07_VIOLATING } from './rubrics/at-009-07.ts';
import { AT_004_10_COMPLIANT, AT_004_10_EXAMPLE_RUBRIC, AT_004_10_VIOLATING } from './rubrics/at-004-10.ts';
import { AT_033_07_COMPLIANT, AT_033_07_EXAMPLE_RUBRIC, AT_033_07_VIOLATING } from './rubrics/at-033-07.ts';

/** How many times the whole k-vote verdict is repeated to measure how stable it is. */
const STABILITY_REPEATS = 5;

type Specimen = {
  label: string;
  rubric: Rubric;
  material: Record<string, string>;
  /** what the specimen was written to be — reported beside the verdict, never used to force it */
  expected: 'pass' | 'fail';
};

const SPECIMENS: Specimen[] = [
  { label: 'AT-009.07 compliant', rubric: AT_009_07_REJECTION_COPY, material: AT_009_07_COMPLIANT, expected: 'pass' },
  { label: 'AT-009.07 violating', rubric: AT_009_07_REJECTION_COPY, material: AT_009_07_VIOLATING, expected: 'fail' },
  { label: 'AT-004.10 compliant', rubric: AT_004_10_EXAMPLE_RUBRIC, material: AT_004_10_COMPLIANT, expected: 'pass' },
  { label: 'AT-004.10 violating', rubric: AT_004_10_EXAMPLE_RUBRIC, material: AT_004_10_VIOLATING, expected: 'fail' },
  { label: 'AT-033.07 compliant', rubric: AT_033_07_EXAMPLE_RUBRIC, material: AT_033_07_COMPLIANT, expected: 'pass' },
  { label: 'AT-033.07 violating', rubric: AT_033_07_EXAMPLE_RUBRIC, material: AT_033_07_VIOLATING, expected: 'fail' },
];

/**
 * The live transport, wrapped so that the FIRST repeat's responses become the committed
 * recordings and every later repeat is measurement only.
 *
 * Later repeats cannot be recorded even if we wanted them: they send an identical request, so they
 * hash to the same key, and the store holds one entry per key. That is the correct arrangement —
 * replay must answer with one fixed set of votes, and the spread across repeats is a fact about
 * the live judge that belongs in the smoke report rather than in the store.
 *
 * The response is VALIDATED before it is written. A refusal, a truncation or output that is not a
 * verdict is a recording nobody should keep: it would replay as an error forever, and the loop tier
 * would inherit a failure that only ever happened once.
 */
function recordingTransport(rubric: Rubric, record: boolean): JudgeTransport {
  const live = createLiveTransport();
  return {
    async send(request, voteIndex) {
      const response: JudgeResponse = await live.send(request, voteIndex);
      if (response.stopReason !== 'end_turn') {
        throw new Error(
          `vote ${voteIndex} did not finish: ${response.stopReason}${response.stopDetail ? ` (${response.stopDetail})` : ''}`,
        );
      }
      // Throws if the output is not a verdict for THIS rubric. Nothing unvalidated is stored.
      parseJudgeAnswers(rubric, response.text);
      if (record) {
        const entry = writeRecording(RECORDINGS_DIR, {
          voteIndex,
          recordedFrom: 'live',
          request,
          servedModel: response.servedModel,
          stopReason: response.stopReason,
          ...(response.stopDetail === undefined ? {} : { stopDetail: response.stopDetail }),
          text: response.text,
        });
        console.log(`    recorded vote ${voteIndex} -> ${entry.key.slice(0, 16)}… (served by ${response.servedModel})`);
      }
      return response;
    },
  };
}

type SpecimenResult = {
  specimen: Specimen;
  verdicts: SemanticVerdict[];
  /** criterion id -> how many of the N repeats disagreed with the first repeat */
  flips: Record<string, number>;
  overallFlips: number;
};

async function measure(specimen: Specimen, votes: number): Promise<SpecimenResult> {
  console.log(`  ${specimen.label} (expected ${specimen.expected})`);
  const verdicts: SemanticVerdict[] = [];
  for (let repeat = 0; repeat < STABILITY_REPEATS; repeat++) {
    const oracle = createSemanticOracle({ transport: recordingTransport(specimen.rubric, repeat === 0), votes });
    const verdict = await oracle.judge(specimen.rubric, specimen.material);
    verdicts.push(verdict);
    console.log(`    repeat ${repeat + 1}/${STABILITY_REPEATS}: ${verdict.pass ? 'pass' : 'fail'}`);
  }
  const first = verdicts[0]!;
  const flips: Record<string, number> = {};
  for (const criterion of first.criteria) {
    flips[criterion.criterionId] = verdicts.filter(
      (verdict) => verdict.criteria.find((entry) => entry.criterionId === criterion.criterionId)!.pass !== criterion.pass,
    ).length;
  }
  return {
    specimen,
    verdicts,
    flips,
    overallFlips: verdicts.filter((verdict) => verdict.pass !== first.pass).length,
  };
}

function report(results: SpecimenResult[], votes: number): string {
  const lines: string[] = [
    '# AI4DEV-20 — live judge smoke and measured stability',
    '',
    `Recorded ${new Date().toISOString()} by \`bun tests/at/harness/record-oracles.ts\`, parent-side.`,
    '',
    `- judge model requested: \`${JUDGE_MODEL}\``,
    `- effort: \`${JUDGE_EFFORT}\` (PROVISIONAL — no consuming evaluation exists to settle it)`,
    `- votes per criterion: ${votes} (\`harness.oracle.judge_votes\`)`,
    `- full k-vote verdict repeated ${STABILITY_REPEATS} times per specimen`,
    '',
    'A FLIP is a repeat whose answer differed from the first repeat, on the same fixed specimen and',
    'the same rubric. It is a measurement of this judge on these six specimens on this day — not a',
    'bound that holds for any other rubric, and not a claim that a live gate is deterministic. It',
    'cannot see correlated drift: a model that answered differently next month under the same id',
    'would show zero flips here and a changed answer there.',
    '',
    '| specimen | written to | verdicts | overall flips | per-criterion flips |',
    '|---|---|---|---|---|',
  ];
  for (const result of results) {
    const verdicts = result.verdicts.map((verdict) => (verdict.pass ? 'pass' : 'fail')).join(' ');
    const perCriterion = Object.entries(result.flips)
      .map(([id, count]) => `${id}: ${count}`)
      .join('; ');
    lines.push(
      `| ${result.specimen.label} | ${result.specimen.expected} | ${verdicts} | ` +
        `${result.overallFlips}/${STABILITY_REPEATS - 1} | ${perCriterion} |`,
    );
  }
  lines.push(
    '',
    '## Served models',
    '',
    'The id requested and the id served are separate facts, and a divergence between them is the',
    'first sign that a pinned snapshot has stopped being one.',
    '',
    ...[...new Set(results.flatMap((result) => result.verdicts.flatMap((verdict) => verdict.provenance.servedModels)))].map(
      (model) => `- \`${model}\``,
    ),
    '',
    '## Committed recordings',
    '',
    `The first repeat of each specimen was written to \`tests/at/harness/recordings/\` — ${votes} votes per`,
    'specimen, keyed on the complete rendered request. Later repeats hash to the same keys by',
    'construction, so only the first set is stored; the spread across repeats is the table above.',
  );
  return `${lines.join('\n')}\n`;
}

async function main(): Promise<number> {
  if (!process.env.AT_JUDGE_API_KEY?.trim()) {
    console.error(
      'record-oracles: no AT_JUDGE_API_KEY in this process.\n' +
        '\n' +
        'This script is the only live surface in the tree and it runs beside you, never inside a\n' +
        'test child. Export the key in THIS shell and run it again:\n' +
        '\n' +
        "    $env:AT_JUDGE_API_KEY = '<key>'\n" +
        '    bun tests/at/harness/record-oracles.ts\n' +
        '\n' +
        'Nothing is written without one: an empty recordings directory is the honest state, and\n' +
        'synthetic entries dressed as live ones are refused by the writer anyway.',
    );
    return 2;
  }

  const votes = readJudgeVotes(createConfigRegistry());
  console.log(`record-oracles: ${JUDGE_MODEL} at effort ${JUDGE_EFFORT}, ${votes} votes, ${STABILITY_REPEATS} repeats`);
  mkdirSync(RECORDINGS_DIR, { recursive: true });

  const results: SpecimenResult[] = [];
  for (const specimen of SPECIMENS) results.push(await measure(specimen, votes));

  const target = join(INSTALL_ROOT, 'loop', 'items', 'AI4DEV-20', 'live-smoke.md');
  mkdirSync(join(INSTALL_ROOT, 'loop', 'items', 'AI4DEV-20'), { recursive: true });
  writeFileSync(target, report(results, votes), 'utf8');
  console.log(`\nwrote ${target}`);
  console.log('Commit the recordings and the smoke report together — they are one piece of evidence.');

  const unexpected = results.filter(
    (result) => (result.verdicts[0]!.pass ? 'pass' : 'fail') !== result.specimen.expected,
  );
  if (unexpected.length) {
    // NOT a failure of the recorder: the specimens are examples, and a judge disagreeing with one
    // is a fact worth knowing rather than an error to swallow. It is reported loudly and the
    // recordings are kept, because the disagreement is the interesting part.
    console.warn(
      `\n${unexpected.length} specimen(s) did not land where they were written to: ` +
        unexpected.map((result) => result.specimen.label).join(', '),
    );
  }
  return 0;
}

if (import.meta.main) process.exit(await main());

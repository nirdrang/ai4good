# AI4DEV-20 — H4 Semantic-oracle harness (judging the meaning of AI output) — PLAN

Item agent: fable @ xhigh. Chain: `~bringup → AI4DEV-3 (AT harness) → AI4DEV-20 (judging AI output meaning)`.
Branch `nirdrang/ai4dev-20-h4-semantic-oracle-harness-judging-the-meaning-of-ai-output`, base `14fee90`.
This plan is the ONE intent artifact for the item (no brief, no Gate 0). Gate 1 (codex sol @ xhigh)
refutes it — intent included — before anything is implemented.

## 1. What the item is

Some acceptance tests assert on the MEANING of generated text, where string-matching cannot decide:

- **AT-009.07** — rejection/failure copy "contains remediation instructions and no accusatory
  language — instructs, never accuses (semantic oracle over the copy)".
- **AT-004.10** — Discovery, run on Claude Opus over 5–10 turns, yields output that "satisfies a
  fixture-specific semantic oracle — the required facts, constraints, user stories, and acceptance
  criteria for that fixture are present and correct — not merely non-empty fields".
- **AT-033.07** — the assistant's four framed answers each pass a pinned oracle (fixture task named;
  blocker cause AND awaited action named; ≥ configured minimum of N fixture events with NO
  fabricated facts; runway stated within a configured tolerance).

H4 is the harness slice that makes such assertions executable: the **oracle capability** on the
shared harness contract, the judge machinery behind it, and the **determinism strategy** so the same
input does not pass one day and fail the next. The item text carries one open spec decision —
"which judge model, and how determinism is achieved — fixed seed, rubric thresholds, or
repeated-vote majority. Decide at the start of this item." That decision is §3 of this plan.

## 2. Honest boundary: no consuming suite exists yet

The three consuming ATs live in REQ-009 / REQ-004 / REQ-033 suites, none of which is translated
(just-in-time, per the scope boundary in `loop/bringup/AI4DEV-3-at-harness.md`). REQ-016 — the only
translated suite, and the H7 proving ground — has no semantic AT. The H5 precedent (founder ruling
2026-08-04) warns that a contract authored without its consuming test is a guess.

Why H4 still builds now, and how the guess-risk is contained:

- The founder picked this item today; the H7 item text lists H4 among its blockers; the parent
  cannot fold without it. Deferral was available (as it was for the five vendor sims) and was not
  chosen — H4 stayed a numbered slice.
- Unlike a vendor sim (whose contract guesses at an EXTERNAL API's shape), the oracle contract is
  grounded in RATIFIED text: the three AT statements above pin exactly what the oracle must decide.
  We author the three rubrics NOW as committed grounding fixtures, derived line-by-line from the AT
  text, and exercise the full machinery over them in conformance tests. The consuming suites will
  own the final rubric parameters (minimums, tolerances) when they are authored; the rubric SHAPE
  and the judge machinery are what this item pins.
- The surface is kept minimal — one capability, one entry point (`judge`), no speculative modes.

## 3. The open spec decision — RESOLVED (this item, 2026-08-05)

### 3a. "Fixed seed" is REFUTED as unavailable, not merely rejected

The Anthropic API exposes **no seed parameter** at all, and on current-generation models
(Opus 4.7+, Opus 5, Sonnet 5, Fable/Mythos) the sampling parameters `temperature` / `top_p` /
`top_k` are **removed — sending any of them is a 400**. Even on older models where temperature
existed, temperature 0 never guaranteed identical outputs. A determinism strategy built on seeding
is therefore not a design option on this provider; the spec's first listed option is closed by
fact, not preference. (Source: claude-api skill, cached 2026-06, checked 2026-08-05.)

### 3b. Judge model: **`claude-opus-5`**, pinned in one module

- The judge's job is narrow: binary criterion checks and verbatim extraction over supplied text,
  against a pinned rubric. Reliability of instruction-following under a strict output schema is the
  quality that matters; verdict flip-rate is the enemy, because a flaky gate poisons every suite
  that leans on it.
- Cost is not a deciding factor at this volume: one judge call carries ALL criteria of one rubric;
  3 votes × a handful of semantic ATs × a few KB of material ≈ cents per integration run at
  $5/$25 per MTok.
- `claude-sonnet-5` ($3/$15) is the considered alternative — likely adequate, rejected because the
  saving is immaterial while any increase in verdict variance is paid by every future suite.
  Revisiting later is a one-line change in one module plus re-recording replay fixtures.
- Self-preference risk (the product's Discovery generator is also Claude/Opus) is real for holistic
  "is this good?" judging and largely neutralized here: the judge never ranks or scores freely — it
  answers pinned binary questions against fixture facts supplied in the same prompt.
- `claude-opus-5` is a fixed model id (no date-suffixed snapshots exist to pin). Behavior drift
  under a fixed id therefore CANNOT be excluded by pinning alone — this is a stated reason for the
  replay layer and the provenance record below, which make any drift visible rather than silent.
- Request shape: `output_config: { effort: "low", format: { type: "json_schema", schema: <verdict
  schema> } }`, `max_tokens` sized generously (~4000); thinking left at the model default
  (adaptive). Effort `low` is documented as strong on this model for scoped tasks and reduces
  output variance; the schema-constrained output is the verdict, so there is no prose to drift.
- **No refusal fallback, deliberately.** The claude-api skill recommends server-side `fallbacks`
  by default for product code; for a TEST ORACLE a silent model swap would change the oracle's
  identity mid-suite — the exact "declared fact drifting from a real one" failure this project
  deletes. A `stop_reason: "refusal"` (or `max_tokens`, or unparseable output) is a typed oracle
  ERROR carrying the cause — never a pass, never a silent retry on another model.

### 3c. Determinism: rubric decomposition + repeated-vote majority + committed replay

Four layers, each doing the part it is good at:

1. **Rubric thresholds (decomposition).** Every semantic AT is authored as a rubric of NAMED BINARY
   criteria, each judged independently in one structured verdict. Binary questions over supplied
   text at a fixed prompt are far more stable than one holistic judgment. Pass rule v1: every
   `required` criterion true. Thresholds/minimums that the AT itself parameterizes (AT-033.07's
   "configured minimum of N events", "configured tolerance") are rubric PARAMETERS read from
   at-config by the consuming suite — never constants inside a rubric.
2. **Extraction-then-code-comparison.** Numeric and countable claims are never judged by the model:
   the judge EXTRACTS the stated value or the matched items (verbatim quotes in the verdict), and
   CODE applies the tolerance or the minimum. The model answers semantic questions only
   ("does this answer name the fixture's blocker cause?"); arithmetic is deterministic by
   construction.
3. **Repeated-vote majority (integration/drill tier).** `judge()` runs k independent live calls and
   takes the per-criterion majority. k = 3, pinned in the at-config registry
   (`harness.oracle.judge_votes`, provisional), so re-tuning is a registry edit, not a test edit.
   For small per-vote flip probability p, the majority flips at ≈ 3p² — the standard variance
   squeeze available on an API without seeds.
4. **Committed replay (loop tier).** At loop tier the oracle capability is a REPLAY of committed
   recordings — keyed by SHA-256 over (model id, prompt version, rubric id+version+hash, material
   hash, vote index) — no network, no key, bit-deterministic, free. A missing recording is a loud
   typed error naming the key, NEVER a fallthrough to a live call: loop tier stays offline by
   construction. This obeys the tier contract in `registry.ts`: the replay oracle is registered as
   a STAND-IN (legal at loop only); the live judge is registered REAL above loop, so
   `stubbedCapabilities()` stays empty at integration exactly as `openWorld` asserts.

**Provenance is part of the verdict.** Every `SemanticVerdict` records model id, `response.model`
as served, prompt version, rubric hash, material hash, vote count, per-criterion vote tallies and
evidence quotes, and source (`live` | `replay`). A drifting judge produces a visibly different
record; a failing verdict is actionable from its own evidence.

## 4. Architecture

### 4a. Contract (types only, in `tests/at/harness/contracts.ts` — ALIASES, never interfaces)

```
Rubric            { id, version, materialSlots: string[], criteria: RubricCriterion[] }
RubricCriterion   { id, kind: 'semantic' | 'extraction', statement, required } —
                  extraction criteria also declare what to extract; code compares
SemanticVerdict   { pass, criteria: CriterionVerdict[], provenance }
CriterionVerdict  { criterionId, pass, evidence, votes: { pass, fail } }
SemanticOracle    { judge(rubric, material: Record<string,string>): Promise<SemanticVerdict> }
AtHarness         gains `oracles: SemanticOracle`
```

Exact member names are the executor's latitude within this shape; the alias rule and the
one-entry-point rule are not.

### 4b. Implementation (`tests/at/harness/oracles.ts`, new)

- Rubric validation (refuses empty criteria, duplicate ids, unknown material slot references —
  loud, at construction).
- Versioned prompt builder: system prompt states the judge role, the criteria, and the extraction
  duties; user content carries the material slots. `PROMPT_VERSION` constant participates in the
  replay key — any prompt edit invalidates recordings by construction instead of silently reusing
  them.
- Verdict schema: JSON schema enforced server-side via structured outputs AND re-validated locally
  (a schema drift or refusal must be OUR error, with the cause, never a crash or a pass).
  `stop_reason` checked before parsing; `refusal` / `max_tokens` / unknown criterion ids in the
  response are typed errors.
- Majority aggregation over k votes, per criterion; overall pass = all required criteria pass;
  extraction criteria resolved by code comparison after extraction.
- Replay store: committed JSON recordings under `tests/at/harness/recordings/`; lookup by the key
  in §3c; misses throw with the exact key.
- Live client: official `@anthropic-ai/sdk` (new devDependency — the project is TypeScript and the
  skill mandates the SDK over hand-rolled fetch), constructed lazily; credential read from
  `AT_JUDGE_API_KEY` only (see 4d); a missing credential is an error at CALL time with remediation
  text, so building a harness for a suite that never touches oracles stays clean at any tier.
- Transport is injectable for conformance tests (a fake that returns canned responses / throws on
  use), so `at:selftest` never does network.

### 4c. Wiring (`tests/at/harness/index.ts`)

`createHarness()` registers the capability by tier: `standInCapability('oracles.judge', replay)`
at loop; `realCapability('oracles.judge', live)` at integration/drill. No change to the
harness-missing message, no change to req-016 behavior (that suite never reaches `h.oracles`).

### 4d. Credential path (`tests/at/harness/runner.ts`)

The runner's child environment is an allowlist and `ANTHROPIC_API_KEY` is deliberately leak-tested
OUT of it — that stays true. The judge key uses a DEDICATED name, `AT_JUDGE_API_KEY`, passed
explicitly at the one vitest-spawn call site, ONLY when tier ≠ loop. Loop tier remains
credential-free and offline by construction. `runner.selftest.ts` gains: (a) `AT_JUDGE_API_KEY` is
NOT in the base allowlist, (b) the non-loop path passes it through, (c) `ANTHROPIC_API_KEY` still
never leaks. `.env.example` documents the variable.

### 4e. Registry pin (`tests/at/harness/atconfig.ts` + `config.ts`)

`oracleJudgeVotes` = 3, unit `votes`, `provisional: true`, source: this item's §3c decision;
dotted key `harness.oracle.judge_votes`. (Rubric minimums/tolerances for AT-033.07 are pinned when
the REQ-033 suite is authored — they are that requirement's numbers, not the harness's.)

### 4f. Grounding rubrics (`tests/at/harness/rubrics/`)

`at-009-07.ts`, `at-004-10.ts`, `at-033-07.ts` — the three rubrics derived from the ratified AT
text, plus small fixture material samples (a compliant and a violating specimen each), plus
committed recordings so the replay path over real rubric shapes is conformance-tested offline.
Marked as grounding: the consuming suite may amend parameters; the shapes are the contract's proof.

### 4g. Conformance tests (`tests/at/harness/oracles.selftest.ts`)

Per suite-authoring rule 2, these are the load-bearing wall — a bug here green-lights every future
semantic AT. Cover at minimum: rubric validation refusals; prompt version participates in replay
key; replay hit (bit-stable verdict), replay miss (typed error naming key, no network attempted);
majority math (3-0, 2-1 both directions, extraction overrides); required-vs-optional pass rule;
refusal / max_tokens / malformed-response / unknown-criterion outcomes are errors, never passes;
loop-tier oracle never touches the network (fake transport that throws if invoked); provenance
recorded; teardown leaves no state.

### 4h. Live smoke (conditional, executor-run, recorded)

If `AT_JUDGE_API_KEY` is available locally, run the three grounding rubrics once each against
their fixture material via the REAL client (compliant specimen → pass, violating specimen → fail),
capture full verdicts + `response.model` into `loop/items/AI4DEV-20/live-smoke.md`, and refresh
the committed recordings from these real responses. If no key is available, say so in the PR
plainly: the live path ships verified by schema + typed SDK + conformance, and the first
consuming suite's integration run is named as the live proof point. The smoke never runs in CI.

## 5. Steps (executor implements; done-criterion per step)

1. Contract types + `oracles` member → `bun run typecheck` green; type-invention probes still pass.
2. `oracles.ts` core (validation, prompt, schema, aggregation, replay, live client, injectable
   transport) → its conformance tests green.
3. Wiring + tier provenance → `at:verify req-016 --tier loop --expect` UNCHANGED (exit 0);
   integration-tier stub assertion unaffected.
4. Runner credential pass-through + sentinel additions → `runner.selftest.ts` green.
5. at-config entry + dotted key → config selftests green.
6. Grounding rubrics + specimens + recordings → oracle conformance green offline.
7. Live smoke (conditional) → `live-smoke.md` recorded, recordings refreshed.
8. `bun install` delta (`@anthropic-ai/sdk` devDependency) committed with lockfile.

## 6. Verification state expected at the end

| Check | Expected |
|---|---|
| `bun run typecheck` | exit 0 (both projects) |
| `bun run at:selftest` | exit 0, including new oracle conformance |
| `bun run at:verify req-016 --tier loop --expect` | exit 0, byte-identical expectations (no manifest change) |
| CI `verify` on the PR head | green — required for merge, pinned head |
| Live smoke | recorded in item record, or its absence stated in the PR |

No AT ids are owned by this item (infrastructure; the parent's done criteria are functional).
Nothing in this item may alter req-016's expected manifest.

## 7. Risks Gate 1 should attack

- The no-consuming-suite boundary (§2): is the grounding-rubric mitigation real or decorative?
- The judge-model ruling (§3b): is `effort: "low"` + schema + k=3 actually the variance-minimizing
  configuration, and is rejecting the refusal-fallback right for an oracle?
- Replay keying: does any input that changes judge behavior escape the key (model id, prompt
  version, rubric, material, vote index — anything missing)?
- Tier semantics: any path by which an integration run silently grades against replay, or a loop
  run silently goes live.
- Credential surface: does `AT_JUDGE_API_KEY` pass-through weaken the leak-model the runner
  enforces?
- The `@anthropic-ai/sdk` dependency addition (territory: package.json is neither Lovable's nor
  Claude's per the CI guard; CI code-territory triggers the full suite — is that acceptable?).
- Anything here a tool cannot do as written.

## 8. Out of scope / rides along

- Translating REQ-004/009/033 suites, or registering any AT id — future items.
- Vendor sims (AI4DEV-38..42), reporter envelope, capability codes — other items.
- Rides along: none identified yet; `.env.example` line and runner comment ride naturally with 4d.

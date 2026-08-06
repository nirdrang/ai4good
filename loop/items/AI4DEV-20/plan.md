# AI4DEV-20 — H4 Semantic-oracle harness (judging the meaning of AI output) — PLAN, rev 2

**Rev 2, amended after Gate 1** (codex sol @ xhigh, `gate1-critique.md`; dispositions in
`gate1-rulings.md` — F1..F12, all ruled by the item agent). Rev 1 is in git history at
`de7a074`. Item agent: fable @ xhigh. Chain: `~bringup → AI4DEV-3 (AT harness) → AI4DEV-20
(judging AI output meaning)`. Branch
`nirdrang/ai4dev-20-h4-semantic-oracle-harness-judging-the-meaning-of-ai-output`.

## 1. What the item is

Some acceptance tests assert on the MEANING of generated text, where string-matching cannot
decide: AT-009.07 (rejection copy instructs, never accuses), AT-004.10 (Discovery output
satisfies a fixture-specific semantic oracle), AT-033.07 (the assistant's four framed answers,
each with a pinned oracle). H4 is the harness slice that makes such assertions executable: the
oracle capability on the shared contract, the judge machinery behind it, and the determinism
strategy. The item's open spec decision ("which judge model, and how determinism is achieved")
is resolved in §3 and went through Gate 1 with the plan.

## 2. Honest boundaries (amended per F3, F5, F8)

- **No consuming suite exists yet.** The three consuming ATs live in untranslated suites. What
  the ratified AT text pins TODAY is the set of criterion KINDS the contract must express:
  semantic-absence, semantic-containment, count-minimum, numeric-tolerance, no-fabrication.
  That — not any finished rubric — is the contract's grounding. Example rubrics (§4f) are
  labeled accordingly: one near-final, two disposable skeletons.
- **Integration tier is not reachable in this tree yet.** `createHarness()` registers clock,
  fixtures, vendors and every SUT member as stand-ins, so `registry.ts` rejects any non-loop
  run wholesale today. This item establishes ONLY the oracle capability's correct per-tier
  provenance (stand-in at loop, real above); integration reachability belongs to the slices
  that replace the other stand-ins (staging DB, proving-ground era).
- **No credential enters any test child** (F8 scope cut, §4d). Live judging inside integration
  test processes needs a credential-delivery mechanism (parent-side broker vs. env); that
  decision is DEFERRED to the slice that makes the integration tier real, taken with its first
  consuming run. This item's live surface is parent-side only.

## 3. The open spec decision — RESOLVED (this item, 2026-08-05; refined by Gate 1)

### 3a. "Fixed seed" is REFUTED as unavailable
The Anthropic API exposes no seed parameter on any model. On the pinned judge model's
generation (Opus 4.7+) the sampling parameters are removed (400 when sent); on Sonnet 5
non-default values are rejected. Even where temperature existed historically it never
guaranteed identical outputs. Seeding is not a design option on this provider; the spec's
first listed option is closed by fact.

### 3b. Judge model: **`claude-opus-5`**, pinned in one module
- The judge answers pinned binary questions and does verbatim extraction over supplied text;
  instruction-following stability under a strict output schema is the quality that matters.
- Cost immaterial at this volume (one call carries a whole rubric; k votes × few semantic ATs).
- `claude-sonnet-5` considered, rejected: the saving is immaterial while any variance increase
  is paid by every future suite. Revisit = one-line change + re-record.
- Self-preference (product generates with Claude too) is neutralized by rubric decomposition:
  the judge never ranks or free-scores; it checks named criteria against supplied facts.
- `claude-opus-5` is a fixed model id; behavior drift under a fixed id cannot be excluded by
  pinning — the replay layer, full-request hashing and provenance record make drift visible.
- Request shape: structured output via `output_config.format` (JSON schema = the verdict),
  `max_tokens` ~4000, thinking at model default. **Effort: `"low"`, marked PROVISIONAL**
  (F7) — no consuming evaluation exists to settle it; the labeled effort sweep is explicitly
  deferred to the first consuming suite; effort participates in the replay key (F6), so any
  change invalidates recordings by construction.
- **No refusal fallback, deliberately.** A silent model swap would change the oracle's
  identity mid-suite. `stop_reason: refusal` / `max_tokens` / unparseable output are typed
  oracle ERRORS carrying the cause — never a pass, never a silent retry elsewhere.
- Client: official `@anthropic-ai/sdk` (devDependency). Executor latitude (recorded if used):
  if the SDK misbehaves under bun, a minimal fetch transport is the approved fallback,
  documented as a decision in the item record.

### 3c. Determinism: two-tier guarantee, stated honestly (F1)
Bit-determinism at a live gate is IMPOSSIBLE on this provider. The ratified spec's own option
menu (rubric thresholds, repeated-vote majority) defines "determinism" as verdict stability;
replay at integration is structurally unavailable because the SUT generates the judged
material fresh each run. The strategy, per tier:

1. **Loop tier: bit-deterministic by construction.** The oracle is a REPLAY of committed
   recordings — no network, no credential, keyed as in §4b. A miss is a loud typed error
   naming the key; never a fallthrough to live.
2. **Integration/drill tier: stability-bounded.** (a) Rubric decomposition into named BINARY
   criteria judged in one structured verdict; (b) extraction-then-code-comparison — the model
   extracts values/quotes, CODE applies tolerances and minimums (deterministic arithmetic);
   (c) repeated-vote majority per criterion, k read from the at-config registry
   (`harness.oracle.judge_votes` = 3, provisional), validated positive odd integer.
3. **Measured, not asserted** (F1): the live smoke (§4h) repeats the full k-vote verdict N
   times over fixed specimens and records flip counts in the item record — a measured
   stability bound, or its absence stated when no key exists.

Provenance is part of every verdict: model id requested, `response.model` served, request
hash, rubric id+version, vote tallies, evidence quotes, source (`live` | `replay`).

## 4. Architecture (amended)

### 4a. Contract (`tests/at/harness/contracts.ts` — type ALIASES, never interfaces)
```
Rubric              { id, version, materialSlots: string[], criteria: RubricCriterion[] }
RubricCriterion     discriminated union (F4):
  { kind:'semantic',   id, statement, required }
  { kind:'extraction', id, statement, required, extract: {what, unit?, normalization?},
                       compare: { op:'numeric_within_tolerance', expected, tolerance }
                              | { op:'count_at_least', minimum } }
SemanticVerdict     { pass, criteria: CriterionVerdict[], provenance: VerdictProvenance }
CriterionVerdict    { criterionId, pass, evidence, votes: {pass, fail} }
SemanticOracle      { judge(rubric, material: Record<string,string>): Promise<SemanticVerdict> }
AtHarness           gains `oracles: SemanticOracle`
```
Exact member names are executor latitude within this shape. Every new exported alias joins the
protected-alias list in the type-invention probes with matching declaration-merging attacks
(F11). Expected values/tolerances/minimums for real ATs are suite-supplied later; the SHAPE
ships now with boundary-case conformance (at-tolerance, off-by-one minimum).

### 4b. Implementation (`tests/at/harness/oracles.ts`, new)
- Rubric validation: refuses empty criteria, duplicate ids, unknown material slots, invalid
  comparator payloads — loud, at construction.
- Prompt builder: system prompt (judge role + criteria + extraction duties), user content
  (material slots). Prompt metadata carries a version string for humans; **the invalidation
  mechanism is the request hash, not the version constant** (F6).
- **Replay key (F6):** SHA-256 over a canonical serialization of the COMPLETE rendered request
  — model id, every request parameter (effort, max_tokens, output schema included), fully
  rendered system + user messages (material slot names and values) — plus the vote index.
- Verdict schema enforced server-side (structured outputs) AND re-validated locally;
  `stop_reason` checked before parsing; refusal / truncation / unknown criterion ids / schema
  drift are typed errors, never passes.
- Aggregation: per-criterion majority over k votes; overall pass = all `required` criteria
  pass; extraction criteria resolved by code comparison after extraction; k from `h.config`
  (F10), validated positive odd integer (0/negative/fractional/even → typed refusal).
- Replay store: committed JSON under `tests/at/harness/recordings/`, entries carry provenance
  incl. `source`; the store REFUSES provenance-less or non-live entries in the committed dir
  (F2); lookup by key; miss = typed error with the exact key.
- Live transport: lazy `@anthropic-ai/sdk` client; credential `AT_JUDGE_API_KEY` read from the
  CALLING process env only (recorder/smoke — parent-side; §4d). Injectable transport seam for
  conformance (canned responses / throws-on-use).
- Statelessness (F12): fresh oracle instance per `createHarness()` (email-sim pattern); replay
  store read-only; fresh-instance isolation proven in conformance; if any state needing
  disposal appears, it registers with harness teardown and its failure reddens the run.

### 4c. Wiring (`tests/at/harness/index.ts`) — narrowed claim (F3)
`createHarness()` registers `oracles.judge` as `standInCapability` (replay) at loop and
`realCapability` (live transport) above loop. That establishes THIS capability's provenance
correctly; it does NOT make integration reachable (other stand-ins remain). The exact
loop-tier stub ledger in `conformance.selftest.ts` gains `'oracles.judge'`. Factory-level
tests assert provenance per tier and that live mode NEVER consults the replay store. Above
loop, a `judge()` call fails at call time with a typed error naming the deferred
credential-delivery boundary (§2). No change to req-016 behavior or its expected manifest.

### 4d. Credential path — REPLACED (F8/F9)
No runner change. No child-environment change. `AT_JUDGE_API_KEY` is read only by the
parent-side recorder and smoke scripts. The existing leak sentinels (`ANTHROPIC_API_KEY`
excluded from children) stay untouched and green. `.env.example` documents `AT_JUDGE_API_KEY`
as parent-side-only. **Removal verification condition (per the skill):** the executor proves
by inspection of the final diff that `runner.ts` is untouched and no code passes any judge
credential into a child environment; restore trigger: a conformance need the injectable fake
transport cannot cover (none expected).

### 4e. Registry pin (`atconfig.ts` + `config.ts`)
`oracleJudgeVotes` = 3, unit `votes`, `provisional: true`, source: this plan §3c + rulings
F1/F10; dotted key `harness.oracle.judge_votes`. The oracle constructs from `h.config` — the
registry is the sole writer of the vote count, proven by an override test that observably
changes transport call count and aggregation (F10).

### 4f. Example rubrics (`tests/at/harness/rubrics/`) — relabeled (F5)
- `at-009-07.ts`: near-final (fixture-independent: remediation-present, accusation-absent).
- `at-004-10.ts`, `at-033-07.ts`: DISPOSABLE parameterized skeletons; example parameters are
  explicitly NOT the future suites' oracles; they exist to prove the criterion KINDS express.
- Compliant + violating specimen per rubric.
The load-bearing conformance rubrics are requirement-NEUTRAL synthetic ones designed to hit
machinery edges.

### 4g. Conformance tests (`tests/at/harness/oracles.selftest.ts`) — the load-bearing wall
Rubric validation refusals · replay key covers the complete request (change effort → new key;
change a material value → new key) · replay hit bit-stable, miss = typed error + NO network
(fake transport that throws if touched) · committed-store provenance refusal (F2) · majority
math incl. 2-1 both directions and crossed multi-criterion patterns (F10) · votes
sole-writer + invalid-votes refusals (F10) · required-vs-optional pass rule · extraction
boundary cases (F4) · refusal / max_tokens / malformed / unknown-criterion are errors, never
passes · per-tier provenance + live-never-replay (F3) · fresh-instance isolation (F12) ·
protected-alias attacks for every new type (F11).

### 4h. Recorder + live smoke (parent-side; conditional on a key) (F2, F1)
`tests/at/harness/record-oracles.ts` (name = executor latitude): canonicalize → live call →
validate → atomic write with full provenance. With `AT_JUDGE_API_KEY` present locally the
executor: records the example rubrics' specimens (compliant → pass, violating → fail),
repeats the k-vote verdict N=5 times per specimen and records flip counts, writes
`loop/items/AI4DEV-20/live-smoke.md`, commits the recordings. Without a key: the recordings
dir ships EMPTY, nothing synthetic is committed, and the PR states the boundary and names the
first consuming suite's integration run as the live proof point. The smoke never runs in CI.

## 5. Steps (executor implements; done-criterion per step)
1. Contract types + `oracles` member + protected-alias extensions → `bun run typecheck` green;
   type-invention selftests green WITH the new aliases enumerated and attacked.
2. `oracles.ts` core (validation, prompt, hashing, schema, aggregation, replay, live client,
   injectable transport) → its conformance tests green.
3. Wiring + per-tier provenance + stub-ledger update → `at:verify req-016 --tier loop
   --expect` exit 0, manifest byte-identical; conformance ledger green.
4. at-config entry + dotted key + votes validation → config/oracle conformance green.
5. Example rubrics + specimens (labeled per 4f) → conformance green offline.
6. Recorder + conditional live smoke → `live-smoke.md` + recordings committed, or the no-key
   state with an EMPTY committed recordings dir, stated in the PR.
7. Dependency delta (`@anthropic-ai/sdk` devDependency) committed with lockfile.
8. F8 removal verification: diff inspection proving runner untouched, no credential to
   children; recorded in the executor's report.

## 6. Verification state expected at the end
| Check | Expected |
|---|---|
| `bun run typecheck` | exit 0 (both projects) |
| `bun run at:selftest` | exit 0, incl. oracle conformance + extended alias attacks |
| `bun run at:verify req-016 --tier loop --expect` | exit 0, expectations byte-identical |
| CI `verify` on the PR head | green — required for merge, pinned head |
| Live smoke + stability figures | in item record, or absence stated in PR |
| `runner.ts` | untouched (F8 condition, diff-proven) |

No AT ids are owned by this item. Nothing may alter req-016's expected manifest.

## 7. Risks accepted (Gate 1 residuals, recorded)
Self-preference correlated across same-provider votes · provider availability/rate limits at
gate time · SDK-under-bun unproved until smoke (fallback latitude in §3b) · two specimens per
rubric cannot expose silently-ignored criteria · recording staleness handled by full-request
hashing, not discipline · integration-tier live path lands with a later slice (deferred
credential delivery, §2) — accepted knowingly, with the boundary written into the code's
error text.

## 8. Out of scope / rides along
Translating REQ-004/009/033 suites or registering AT ids · vendor sims (AI4DEV-38..42) ·
child-side credential delivery (deferred, §2) · reporter envelope / capability codes (other
items). Rides along: `.env.example` line for the parent-side `AT_JUDGE_API_KEY`. Nothing else.

# Gate 1 rulings — AI4DEV-20 (item agent: fable @ xhigh, 2026-08-05)

Reviewer: codex gpt-5.6-sol @ xhigh, read-only, verdict "BLOCKING FINDINGS PRESENT".
Full critique: `gate1-critique.md` (committed). Each finding ruled below; the amended plan
(`plan.md`, rev 2) carries every accepted change. Ruling authority: the item agent; the open
spec decision was delegated to this item by the item text ("Decide at the start of this item").

## F1 (BLOCKER — majority vote is not determinism at the integration gate)
**Ruling: PARTIALLY ACCEPTED — guarantee restated honestly; mechanism stands; no founder
escalation.** Sol is right that k=3 majority cannot make live calls bit-deterministic and that
correlated drift defeats the 3p² arithmetic. But the ratified spec's own option menu ("fixed
seed, rubric thresholds, or repeated-vote majority") lists majority vote AS a determinism
strategy — the spec's word "determinism" therefore means verdict stability, not bit-equality,
and choosing from the menu is inside this item's delegated authority. Sol's alternative
("reviewed replay at integration") is not actually available: at integration tier the judge's
material is text the SUT GENERATES FRESH each run, so a replay keyed on material can never hit —
replay is structurally a loop-tier mechanism. Accepted parts: (a) the plan now states the
guarantee as two tiers — bit-deterministic at loop by construction, stability-bounded at
integration — and says plainly that bit-determinism at a live gate is impossible on this
provider; (b) the live smoke gains a MEASURED stability check (N repeated k-vote verdicts over
fixed specimens, flip counts recorded in the item record) so the stability claim is measured,
never asserted.

## F2 (BLOCKER — no recorder, no sole writer; synthetic recordings could impersonate live)
**Ruling: ACCEPTED.** The plan gains an explicit recorder (parent-side script): canonicalize
request → live call → validate → atomic write with provenance (requested model, served
`response.model`, request hash, timestamp, `source: "live"`). The replay store REFUSES entries
without live provenance. If no key is available, NOTHING is committed to the recordings
directory — conformance tests exercise the replay path through the same writer code into
test-scoped temp dirs with entries marked synthetic, and the PR states the boundary plainly.
A committed recording claiming live provenance it does not have is the false green this
project exists to kill; the design now makes it unrepresentable.

## F3 (MAJOR — stubbedCapabilities claim false; integration unreachable; stub ledger untouched)
**Ruling: ACCEPTED.** My plan overstated. Today `createHarness()` registers clock, fixtures,
vendors and every SUT member as stand-ins, so integration-tier runs are rejected wholesale —
this item establishes ONLY the oracle capability's correct per-tier provenance (stand-in at
loop, real above), not integration reachability. Amendments: the exact stub ledger in
`conformance.selftest.ts` gains `oracles.judge` at loop tier; per-tier factory tests assert the
provenance; a live-mode-never-reads-replay test is added.

## F4 (MAJOR — extraction contract not executable as specified)
**Ruling: ACCEPTED.** The criterion shape becomes a serializable discriminated union: semantic
criteria (binary judge questions) and extraction criteria carrying typed comparators —
minimally `numeric_within_tolerance` (expected, tolerance, unit, normalization) and
`count_at_least` (minimum) — with boundary cases pinned in conformance (at-tolerance,
off-by-one minimum). Expected VALUES stay suite-supplied at authoring time; the SHAPE is this
item's deliverable.

## F5 (MAJOR — grounding rubrics decorative for AT-004.10 / AT-033.07)
**Ruling: ACCEPTED via relabeling.** What the ratified AT text genuinely pins is the set of
criterion KINDS the contract must express (semantic-absence, semantic-containment,
count-minimum, numeric-tolerance, no-fabrication) — that grounding claim stays. The three
example rubrics are relabeled: AT-009.07 near-final (fixture-independent); AT-004.10 and
AT-033.07 explicitly DISPOSABLE parameterized skeletons whose example parameters are not the
future suites' oracles. The load-bearing conformance tests run on requirement-NEUTRAL synthetic
rubrics designed to hit machinery edges.

## F6 (MAJOR — replay key omits behavior-changing inputs; hand-bumped PROMPT_VERSION unsafe)
**Ruling: ACCEPTED.** Replay key = SHA-256 over a canonical serialization of the COMPLETE
rendered request (model id, every request parameter including effort, max_tokens and the output
schema, the fully rendered system + user messages with material slot names and values) plus the
vote index. Any code change that alters the request invalidates recordings by construction.
PROMPT_VERSION survives as metadata only, never as the invalidation mechanism.

## F7 (MAJOR — effort "low" pin unsupported; sampling-params wording overbroad)
**Ruling: PARTIALLY ACCEPTED.** Effort inclusion in the key: covered by F6. The effort pin is
downgraded to PROVISIONAL in the oracle module with the labeled sweep explicitly deferred to
the first consuming suite (a sweep now has no labeled dataset and may have no key). The
sampling-params sentence is corrected to the documented shape (removed on the Opus 4.7+ line;
non-default values rejected on Sonnet 5); the decision consequence — no seeding path exists —
is unchanged. REJECTED: switching the default effort to "high" now; with zero consuming
evaluations either value is a guess, the provisional marker is what matters, and k-vote
majority absorbs the variance either way.

## F8 (MAJOR — AT_JUDGE_API_KEY into the vitest child weakens the leak model)
**Ruling: ACCEPTED via scope cut — the stronger form of sol's fix.** This item passes NO
credential into any test child. The runner is NOT touched. The live transport exists
parent-side only (recorder + smoke scripts, reading `AT_JUDGE_API_KEY` from their own
environment and never spreading it to children). At integration tier the oracle capability is
registered real, and its transport fails at call time with a typed error naming the boundary:
child-side credential delivery (broker vs. env) is a decision for the slice that makes the
integration tier real, taken WITH its first consuming run — the H5 lesson applied to a
mechanism instead of a sim. VERIFICATION CONDITION for this removal (a ruling that removes
work must carry one): the executor greps the diff to prove no child-environment change and no
credential name reaches `runner.ts`; the existing `ANTHROPIC_API_KEY` leak sentinels stay
untouched and green. Restore trigger: a conformance test that genuinely cannot be written
against the injectable fake transport — none is expected.

## F9 (MAJOR — childEnv(extra) sentinel test would be vacuous)
**Ruling: RESOLVED BY F8.** No spawn-site change exists to test; existing real-child probes
stay as they are.

## F10 (MAJOR — registry not proven sole writer of the vote count; invalid overrides undefined)
**Ruling: ACCEPTED.** The oracle factory reads votes from `h.config` (dotted key
`harness.oracle.judge_votes`), validates a positive odd integer (0, negative, fractional, even
→ typed refusal), and conformance proves an override observably changes transport call count
and aggregation, plus crossed multi-criterion vote patterns.

## F11 (MAJOR — new contract aliases unprotected by the type-invention probes)
**Ruling: ACCEPTED.** Every new exported oracle contract alias joins the protected-alias list
with matching declaration-merging attacks; step 1's done criterion says so explicitly.

## F12 (MINOR — teardown claim had no implementation path)
**Ruling: ACCEPTED.** The oracle is stateless per harness by construction (fresh instance per
`createHarness()`, replay store read-only), matching the email sim's structural-isolation
pattern; a fresh-instance isolation conformance test replaces the vague "leaves no state"
promise. No disposer is needed; if the executor finds state that needs one, it registers with
harness teardown and its failure reddens the run.

## Residual risks — accepted and recorded in plan §7
Same-provider self-preference correlated across votes; provider availability at gate time;
SDK-on-bun compatibility unproved until the smoke (executor latitude: if the official SDK
fails under bun, a minimal fetch transport is the approved fallback, recorded as a decision in
the item record); two specimens per rubric cannot expose silently-ignored criteria; recording
staleness is handled by full-request hashing (F6) rather than discipline.

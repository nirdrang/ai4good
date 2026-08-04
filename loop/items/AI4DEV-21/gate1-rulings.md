# AI4DEV-21 (fake Stripe, GitHub, Anthropic) — Gate 1 rulings

> **Confirmation outcome (same sol session, resumed with pins verified — model
> `gpt-5.6-sol`, effort `high`, sandbox `read-only`; rollout carries both turn_context
> events):** findings 2–6 CONFIRMED-RESOLVED; finding 1 NOT-RESOLVED on two points, both
> with prescribed fixes, both folded into the plan in the commit that carries this note:
> (a) the deferred set is ALL FIVE named vendors, not four — the email sim is a sixth
> capability claimed by the item's note, and my amended text had miscounted; the plan now
> maps five backlog items, one per vendor, as the durable owners under Option A;
> (b) Option B now carries a mandatory re-gate clause — if ruled, the plan is amended with
> the five contract designs and passes a fresh Gate 1 review before that implementation
> begins.
> **Ruling on proceeding:** sol judged the substantive posture of D1 sound ("D1's merge
> block is sound"); the residual was a count correction and a conditional clause, closed
> verbatim as the reviewer prescribed. I rule the gate satisfied for the email-sim
> implementation to begin; the merge remains blocked on the founder's Option A/B answer.
> A third sol round is not spent on transcription of the reviewer's own words.

**Reviewer:** codex `gpt-5.6-sol` @ `max`, read-only, in this worktree (session
`019fcd79-2db3-7022-85ad-6727a045d1a7`; pins verified in the rollout's `turn_context`).
**Verdict received:** REFUTED — 2 blockers, 4 majors. **All six findings are ACCEPTED**, with
the amendments below folded into `plan.md` in the same commit as this file. A confirmation
pass by the same sol session follows on the amended plan.

> **FOUNDER RULING RECEIVED (2026-08-04, relayed verbatim through the coordinator: "A
> defer"):** Option A stands. The five title-named vendor stand-ins are deferred, each built
> with the first test suite that consumes it. Durable tracking executed the same day: five
> backlog items filed under AI4DEV-3 (AT harness) — AI4DEV-38 (Anthropic usage/cost sim),
> AI4DEV-39 (Stripe sim), AI4DEV-40 (GitHub sim), AI4DEV-41 (Lovable credit sim), AI4DEV-42
> (Linear tree sim) — and the parent working spec amended in this branch
> (`loop/bringup/AI4DEV-3-at-harness.md`, Part A item 8 + the H5 breakdown line). Finding 1
> is thereby closed on the reviewer's own condition: founder-approved scope amendment plus a
> durable tracked owner per deferred vendor. The merge block on this front is lifted.

## Post-implementation rulings (executor round, same authority)

The opus executor's report contained six adaptations and three deferred judgment calls.
Rulings:

- **All six adaptations ACCEPTED** — the `Vendors`-map value under the unchanged
  `'vendors.email'` capability name; `EmailProviderPort` living in `harness/vendors.ts`
  beside its implementation (the `AdapterFaultSeam` precedent); the sim non-generic (the
  harness is used at its default channel type everywhere); one implementation commit (the
  declaration-with-seam drift rule made the suggested split incoherent); proofs re-captured
  at the final code commit (the standing capture rule); the `deliveredByProcess` null-check
  retained (documented behaviour a conformance case reads).
- **`EmailProviderPort` stays OUT of the type-invention guard's protected list.** The list's
  stated scope is types reachable from the harness object or from what `open()` hands a test
  body; the port travels harness→adapter, exactly like `AdapterFaultSeam` and
  `AdapterSentinelSeam`, which are also outside the list. Widening the list would change its
  specification and require probe augmentations this item does not need. Gate 2 is
  explicitly invited to attack this reasoning.
- **Ride-along accepted (one line):** `tests/at/expected/README.md`'s schema example cited
  AT-016.11's old red declaration, which THIS diff removed — the example now cites the real
  remaining red (AT-016.01, `["H3 static provider scan"]`). The adjacent `pending`-kind
  example and the stale measurement note in `expected.ts` (~line 484, "6 failed suites for 4
  failed tests") were already counterfactual before this item — mentioned in the PR body,
  deliberately not edited (surgical-changes rule).

## Finding 1 (BLOCKER) — the deferral of the five named vendors is a scope amendment the item agent cannot self-ratify

**ACCEPTED, with one correction of framing.** Sol is right on the substance: the parent
working spec assigns all five stand-ins to this slice; the just-in-time boundary in that spec
covers per-requirement TESTS, not the engine's capability slices; no decomposition manifest
today assigns the four vendor sims anywhere else, so "each future suite carries its sim" is a
prediction, not a tracked fact; and a Linear comment + PR body is not closure-coupled — the
board could fold the AT-harness parent with spec-named capabilities missing and nothing
durable saying so. The framing correction: the email/notification-provider sim is not a
"sixth capability smuggled in" — the Linear item's own note claims it for this slice
("REQ-016's provider-acceptance tests … need the notification-provider stand-in from this
slice"), and it is the one stand-in with a live consumer. It is in scope under every
resolution of this question.

**Ruling.** The deferral question is the founder's, not mine: it amends founder-authored item
scope and the parent spec's text. The question goes to the founder now (via the coordinator,
relayed verbatim), with a recommendation and both honest options:

- **Option A (recommended):** amend the parent spec so the four remaining vendor sims
  (Anthropic usage/cost, Stripe, GitHub, Lovable, Linear) are built just-in-time with the
  FIRST suite that consumes each — the durable record being the spec amendment itself plus
  four backlog items under the AT-harness parent so the board cannot fold it silently while
  they are missing. This item then delivers the notification/email provider sim, which is the
  only one with a consuming test today.
- **Option B:** keep all five in this item; I design their contracts from the acceptance-file
  prose now and build them here, accepting the risk that the contracts are rewritten when
  their consuming suites are translated.

**Interim posture:** implementation of the email sim proceeds (needed under both options).
The MERGE waits for the founder's answer; the PR body and the board record carry whichever
disposition is ruled. If Option A is ruled, the spec amendment and the four backlog items are
created BEFORE the merge, so the durable owners exist when this item closes.

## Finding 2 (BLOCKER) — auto-merge queued at PR-open can merge before the gates

**ACCEPTED.** Queuing `gh pr merge --auto --merge` at PR-open (an instruction carried in my
spawn prompt) would let GitHub merge the first CI-green head while Gate 2, the pre-merge
audit, the reflection and the written ruling are still running. The required-check-green
condition is necessary, never sufficient; the skill's ordering wins over the spawn prompt.

**Amendment (D8 in the plan):** the PR opens as a **DRAFT** when implementation lands — CI
runs on every push (which also feeds the auditor's fallback evidence), but a draft cannot
auto-merge. Only after Gate 2 is folded, the audit is read, the reflection is committed and
the written merge ruling pins the head SHA does the PR get marked ready and auto-merge get
queued — at which point auto-merge merges exactly the ruled head when `verify` is green on
it. The merge ruling records the head SHA and the `verify` run id for that SHA; any push
after the ruling voids the ruling.

## Finding 3 (MAJOR) — the existing exact-list provenance oracle breaks when `vendors.email` is registered

**ACCEPTED; verified in the tree** (`conformance.selftest.ts:154-158` asserts the complete
stubbed list `['clock.controlled','fixtures.worlds','sut.notifications']`). The plan claimed
existing selftests stay green; that claim was wrong. **Amendment (D3):** the same commit that
registers `standInCapability('vendors.email', …)` updates that oracle's expected list to
include `'vendors.email'` (sorted position: after `'sut.notifications'`). D6's new provenance
case then re-asserts it through its own lens, and the two cannot drift apart because both
read the same `stubbedCapabilities()`.

## Finding 4 (MAJOR) — AT-016.11(c)'s maintained oracle cannot see a fixture that marks an unconfirmed (no-ack) send as sent

**ACCEPTED.** Walked sol's counterexample against the test text: a fixture that calls the
port once, receives `no_ack`, and wrongly marks the delivery sent satisfies every (c)
assertion — one logical row, all deliveries sent, exactly one accepted pair — because (c)
never reads `attempts()` or the event's attempt counter, and under a run-to-quiescence
default drain the "retry pass" drain on the next line is a no-op. F2 catches the SIM's
dedupe being removed, not the FIXTURE's no-ack handling, and only as a one-off mutation run,
not a maintained oracle.

**Amendment (new D7):** strengthen AT-016.11's clause (c) in the suite — same AT id, same
file, stronger oracle (the AI4DEV-19 precedent: widening AT-016.09's oracle in place):

1. after `acceptButLoseAck(1)` and the fire, the first drain is `{ passes: 1 }`;
2. assert the provider trace for the event is exactly `['ack_lost']`, the email-channel
   delivery is NOT `sent`, and the event state is `pending`/`retrying` — the unconfirmed
   state is observed, not assumed;
3. then a default drain; assert the provider trace is exactly `['ack_lost', 'accepted']`
   and the event's own attempt counter reached ≥ 2 — the retry physically happened;
4. the existing pair/dedupe/sent assertions follow unchanged.

F1/F2 stay as falsification artifacts; the maintained oracle no longer depends on them.

## Finding 5 (MAJOR) — nothing proves the forced-outcome queue is one cross-method FIFO

**ACCEPTED.** A two-counter implementation that always serves rejections first would pass
every listed conformance case and the suite. **Amendment (D6):** two added conformance cases
using two distinct send identities: `acceptButLoseAck(1); rejectNext(1)` must produce
outcomes `['ack_lost','rejected']` in send order, and the reverse arming order must produce
`['rejected','ack_lost']` — call order, not kind priority, decides.

## Finding 6 (MAJOR) — the drain-pass cap contradicts the contract's quiescence promise, and the hazard it guards against cannot occur

**ACCEPTED.** The forced-outcome queue is finite, so an always-rejecting provider cannot
arise; a default drain therefore always terminates without any cap — each pass either
transitions a delivery to `sent` or consumes a forced outcome, and both are finite. The
proposed `MAX_DRAIN_PASSES = 8` was not only unnecessary, it violated the suite contract's
"default = to quiescence" in a reachable scenario (`rejectNext(8)`, one email delivery).
**Amendment (D4):** no cap; the default drain loops until every delivery is `sent`, with the
termination argument stated in a comment. **Boundary test added (D6):** through the real
harness, `rejectNext(3)` on one identity + default drain → delivery `sent`, provider trace
`['rejected','rejected','rejected','accepted']` — quiescence provably crosses multiple
consecutive forced failures.

## Net effect on the plan

D1 gains the founder question and the interim posture; D3 gains the conformance-list edit;
D4 loses the cap and gains the termination argument; D6 gains three cases (mixed order ×2,
multi-reject quiescence); new D7 (suite oracle strengthening for AT-016.11(c)); new D8
(draft-PR merge sequencing replacing queue-at-open). Expected verification state per AT id is
unchanged — AT-016.11 green, AT-016.01 red on `["H3 static provider scan"]` — but the green
now rests on a maintained oracle, not on one-off falsification runs.

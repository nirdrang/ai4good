# AI4DEV-3 — AT harness + at-config registry (working spec)

**Board:** AI4GOOD-DEV · project W0 Bring-up · vendor-native (closes on merge, no /pm-done gate).
**Role:** the keystone of the verify layer. Every `bun run at:verify` in the skills — the inner
loop's `--tier loop`, `/dev-end`'s assumed-verify, `/pm-done`'s gate — resolves to machinery
that does not exist until this ships. Until then `/pm-done` fails closed by design.

This item bundles two things: the **engine that runs acceptance tests**, and the **registry of
every configured number** those tests read.

## Done criteria (functional — this is infrastructure, not itself AT-covered)

1. `bun run at:verify req-0NN --tier <loop|integration|drill>` runs any requirement's suite and
   reports pass/fail PER AT id.
2. The AT↔code bijection checker passes: every P0 AT id of a requirement has exactly one
   executable test tagged with it; no executable test claims an id that is not in the suite.
3. The at-config registry is the single source for every configured number; no test hard-codes
   a pinned value.
4. Proven on one real suite translated end-to-end (proving ground — see scope boundary).
5. One authored test body demonstrably runs on BOTH surfaces — fixtures and a real screen — from
   a single source. The wiring leaves' `--wired` pass is a RE-RUN of already-assigned ids; if a
   test has to be rewritten to drive a screen, the manifests' "no new AT ids" contract is broken
   and the bijection silently becomes a claim about two different tests sharing a number. No
   product screen exists yet, so prove the seam against the design session's static screens
   (`design/screens/`).

## Part A — the harness (runner + the capabilities the tests assume)

1. **Runner + command surface.** `bun run at:verify req-0NN --tier <tier>`: resolve the executable
   tests for a requirement by AT id, build a clean world, run, tear down, report per id. The
   command shape is fixed — all 30 manifests' done contracts cite it verbatim.
2. **Tiers — one test, three depths.** `loop` (fast, more stubbed — the inner cycle),
   `integration` (real components + real test DB — the /pm-done gate), `drill` (heaviest —
   fault injection, adversarial). Lets one AT statement serve both the coding loop and the hard
   gate without a rewrite.
3. **Fixture harness — the "Given" worlds.** Build/tear-down of product-real starting states
   (an NGO; projects across the 9 lifecycle states; ledger rows; blockers; thread messages)
   behind one seam. Reuses/extends the design session's fixture pack. Isolation between tests.
4. **Controlled clock.** Advance time on demand — funding's 7-day expiry, the UTC daily credit
   reset, blocker aging 48h/7d, abandonment 14d/21d, short-lived link expiry, year-scale
   no-decay. Many tests say "controlled clock" explicitly.
5. **Sentinels — plant/scan, presence AND absence.** Fact-in-a-file cited in scope (AT-004.16;
   AT-032.12 across all 7 formats); body sentinel that must appear in NO store (AT-009.26);
   key-shaped push that must be BLOCKED (AT-009.29); deleted→recovered file returning its
   original content (AT-032.11).
6. **Fault injection.** Force a failure at a chosen point: notification atomicity under an
   induced fault between transition and event write (AT-016.09); tamper-evident credit events
   (AT-014.04). Assert rollback / atomicity.
7. **Semantic oracles.** Judge the MEANING of AI output where string-match cannot: rejection
   copy instructs-never-accuses (AT-009.07); Opus yields a valid scope over 5–10 turns
   (AT-004.10); the assistant's four framed answers (AT-033.07). A judge model or rubric.
8. **Provider/vendor simulation at the seams.** Controllable stand-ins the tests drive:
   Anthropic per-workspace usage/cost report (the whole money path — provider-truth
   conformance, 20/5/0% stop, nightly reconciliation), Stripe (checkout/webhooks/disputes),
   GitHub, Lovable credit status, Linear.
9. **AT↔code bijection checker.** The code-level sibling of `loop/decomp/check-tree.ps1`:
   every P0 id has a tagged executable test, no invented ids. Prevents silent skips.
10. **Per-id reporting** consumable by the skills (green/red per AT id + summary).

## Part B — the at-config registry (single source of pinned numbers)

One place holding every configured value; tests read it, never hard-code. Contents (initial):
gateway latency p95 ≤300ms + first-chunk ≤500ms (PROVISIONAL — pending founder SLO); AUP
residual removal ≤15min; monitor propagation ≤5min; $50 funding minimum; $200 first-fund cap +
per-day cap; tier grants 10/30; blocker aging 48h/7d; abandonment 14d/21d; 4-hour restore
objective; file per-file + per-project size caps; authorized-link TTL; OD-4 binding-check
threshold; OD-7 PRD-gate threshold. One edit re-tunes every test that uses a value — the reason
harness + registry ship together.

## Three execution surfaces (matches the manifests' surface tags)

- **backend** — against edge functions + the test DB.
- **ui** — the wired re-runs, driving real screens. NOTE: the design session PLANNED a
  design-check Playwright harness at `tests/design/` but never built it — only the static
  screens, change orders, gate reports and log exist. There is no UI test foundation to inherit;
  this item builds it. (The design checks themselves — never-show list, units discipline — are a
  standing suite over the screen set, NOT per-requirement AT work; out of scope here.)
- **skill** — REQ-028's tests in a harness-driven Claude Code session against fixture repos.

**Surface is an axis independent of tier.** A test is authored once and selected by id; the
harness decides which surface it drives. 22 of 30 requirements are `mixed` and 21 carry a wiring
leaf, so this is the common case, not an edge case.

## Decisions that must land BEFORE the first suite is translated

These three are conventions, not code — none of them needs the harness to exist. All three are
cheap now and expensive later: every suite translated before they are settled has to be rewritten.

1. **The surface seam + the authoring rule.** A test that will be re-run through a screen must
   never poke a fixture directly; it asserts through a seam the harness points at either the
   fixture world or a rendered screen. Write the rule down where test authors will meet it
   (`/dev-start`'s brief), because the just-in-time authoring moment for a UI-relevant test is
   its OWNING leaf — early — while the wired re-run happens at the wiring leaf, late. An author
   who does not anticipate the second run produces a test that cannot have one. RESOLVED
   (founder, 2026-07-28): tests interact with the system ONLY through a driver interface
   supplied by the harness; the harness provides a fixture driver now and a screen driver
   later; a test that imports or touches fixture internals directly is invalid.
2. **A stable-identifier convention for screen elements.** Lovable owns the interface and
   regenerates markup on every message; a wired test pinned to whatever markup existed that day
   breaks on the next Lovable turn. Nothing in `design/ui-ux-instructions.md` mandates test
   handles today. Agree the convention and push it into Lovable's project knowledge (the channel
   already carrying the governance rules) so it re-applies to every generation. DRAFTED:
   `loop/bringup/testid-convention-draft.md` — awaiting founder ratification.
3. **Where the ui tag lives.** 21 manifests scope `--wired` to "the ui-tagged subset"; no
   acceptance file carries such a tag — the subset is named in 21 places and defined in zero.
   Decide: marked per test in `acceptance/at-req-0NN.md`, or declared per leaf in the manifest.
   Until this lands, `--wired` has no defined input. RESOLVED (founder, 2026-07-28): the ui tag
   lives in the executable test registration — `atTest` accepts a surface marker; the acceptance
   markdown files are NOT edited; `--wired` selects registered ui-marked ids and fails the run if
   a wiring leaf's selection is empty.

## Suite-authoring rules (founder-ratified 2026-07-29, after the REQ-016 audit)

Origin: the founder suspected the translated REQ-016 suite was overbuilt; an audit plus one
codex round (gpt-5.6-sol, xhigh) confirmed the WASTE IS IN THE TRANSLATION PATTERN, NOT THE
PLAN — the ~658 P0 ids stay; the acceptance docs are NOT reopened. These rules bind every suite
translated from here on. The REQ-016 suite predates them and is retrofitted when H2 lands.
Verdict trail: two of the auditor's own cuts were REFUTED and are recorded here as
must-keeps, so nobody re-proposes them.

1. **Capture once, assert many.** For each event execution, capture raw events, deliveries and
   linked outcomes under the returned eventId, then FREEZE that snapshot (immutable — one lens
   that normalizes or de-duplicates in place hides evidence from the next). Every P0 id whose
   assertions only PROJECT that evidence (recipients, channels, payload, body, ops outcomes)
   consumes the snapshot without re-firing. In REQ-016 this makes ~11 integration-tier firings
   free: AT-016.04/.05/.12 become lenses over AT-016.03's capture.
2. **Generic self-checks live in the harness, once — with their own conformance tests.** Sentinel
   value quality (length/uniqueness), rejection of unknown fault points, failure on clearing a
   never-fired fault, restart epoch change, controlled-clock product wiring: implemented and
   independently tested in the harness, never re-asserted per suite. HARD CAVEAT (codex): a bug
   in a centralized guard green-lights all 30 suites at once — e.g. a fault handle that counts
   "armed" as "triggered" makes every atomicity test pass on nothing. The conformance tests are
   therefore not optional polish; they are the load-bearing wall. Domain-SPECIFIC controls stay
   in the suites: no-fault control runs, mid-flight-not-yet-delivered checks, meaningful-config
   guards, role-actually-moved checks — those are scenario evidence, not boilerplate.
3. **Fresh world only when state demands it.** A new open() only when the scenario changes
   fault/provider/clock/process/role state, or when zero work could satisfy the assertion (then
   include a positive control). Register each P0 id exactly once; loop its full oracle matrix
   INSIDE the test — never sample, never mint per-row tests.
4. **Must-keeps (cuts proposed and REFUTED — do not re-propose):** (a) the sole-writer proof
   keeps its domain firings — the provider-side orphan check is vacuous when nothing fires, and
   a static import scan cannot see a sender using a raw client; the firings ARE the evidence.
   (b) Oracle logic (channel rules, payload predicates, pair counting) and harness primitives
   get focused unit tests of their own — they are code nothing else checks, and per rule 2 a
   silent oracle bug would invalidate every suite. The tiers do not substitute for this.
5. **Shared contract, thin adapters.** Tier/clock/sentinel/fault/config/vendor contracts come
   from ONE shared harness package (with the conformance tests above); a suite defines locally
   only its requirement-specific SUT and fixture adapter. `_contract.ts` in REQ-016 was the
   pre-harness stopgap, not the pattern.

## Dependencies

- Integration tier needs a real test database → the **staging Supabase item (AI4DEV-6)** is a
  sibling it leans on.
- No downstream can be verified until this exists; it is intentionally first in W0.

## Scope boundary — what this does NOT include

It builds the ENGINE + capabilities, not the ~658 per-requirement tests. Those are translated
**just-in-time, test-first, when each requirement is pulled** (`/dev-start`'s brief points at
the leaf's verify set). This item ships **one real suite translated end-to-end** as its proving
ground — **REQ-016 (Notifications)** recommended: 12 P0, small, and it exercises the emitter,
atomicity/fault-injection, and provider-acceptance paths in one suite.

## Suggested internal breakdown (for when this item is pulled)

- **H0 Conventions** — the three decisions above, settled and written down. No code; blocks H7
  and every just-in-time translation that follows.
- **H1 Runner + tiers + surfaces + reporting** — the `at:verify` command, tier dispatch, the
  surface seam and `--wired` selection, per-id report, the bijection checker.
- **H2 Fixture harness + controlled clock** — world build/teardown seam + time control.
- **H3 Sentinels + fault injection** — plant/scan utilities + induced-fault hooks.
- **H4 Semantic-oracle harness** — the judge/rubric surface.
- **H5 Vendor sims** — Anthropic usage/cost, Stripe, GitHub, Lovable, Linear stand-ins.
- **H6 at-config registry** — the pinned-value module every test reads.
- **H7 Proving ground** — translate REQ-016's 12 P0 end-to-end at integration tier; green. Its
  in-app surface also exercises done-criterion 5 (one authored body, both surfaces).

## Open questions for the build

- Test framework (Vitest/Playwright split for backend vs ui) — decide at H1. Constrained by the
  surface seam: whatever is chosen, one authored test must reach both surfaces.
- Semantic-oracle model + determinism strategy (fixed seed / rubric thresholds) — H4.
- How much the `loop` tier stubs vs `integration` — the stub boundary — H1/H2.
- Provisional pins (gateway p95, OD-4, OD-7) stay flagged in the registry until founder-set.

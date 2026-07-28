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
   who does not anticipate the second run produces a test that cannot have one.
2. **A stable-identifier convention for screen elements.** Lovable owns the interface and
   regenerates markup on every message; a wired test pinned to whatever markup existed that day
   breaks on the next Lovable turn. Nothing in `design/ui-ux-instructions.md` mandates test
   handles today. Agree the convention and push it into Lovable's project knowledge (the channel
   already carrying the governance rules) so it re-applies to every generation. DRAFTED:
   `loop/bringup/testid-convention-draft.md` — awaiting founder ratification.
3. **Where the ui tag lives.** 21 manifests scope `--wired` to "the ui-tagged subset"; no
   acceptance file carries such a tag — the subset is named in 21 places and defined in zero.
   Decide: marked per test in `acceptance/at-req-0NN.md`, or declared per leaf in the manifest.
   Until this lands, `--wired` has no defined input.

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

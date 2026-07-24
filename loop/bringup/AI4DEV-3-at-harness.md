# AI4DEV-3 — AT harness + at-config registry (working spec)

**Board:** AI4GOOD-DEV · project W0 Bring-up · vendor-native (closes on merge, no /pm-done gate).
**Role:** the keystone of the verify layer. Every `pnpm at:verify` in the skills — the inner
loop's `--tier loop`, `/dev-end`'s assumed-verify, `/pm-done`'s gate — resolves to machinery
that does not exist until this ships. Until then `/pm-done` fails closed by design.

This item bundles two things: the **engine that runs acceptance tests**, and the **registry of
every configured number** those tests read.

## Done criteria (functional — this is infrastructure, not itself AT-covered)

1. `pnpm at:verify req-0NN --tier <loop|integration|drill>` runs any requirement's suite and
   reports pass/fail PER AT id.
2. The AT↔code bijection checker passes: every P0 AT id of a requirement has exactly one
   executable test tagged with it; no executable test claims an id that is not in the suite.
3. The at-config registry is the single source for every configured number; no test hard-codes
   a pinned value.
4. Proven on one real suite translated end-to-end (proving ground — see scope boundary).

## Part A — the harness (runner + the capabilities the tests assume)

1. **Runner + command surface.** `pnpm at:verify req-0NN --tier <tier>`: resolve the executable
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
- **ui** — the wired re-runs, driving real screens (build on the design-check Playwright harness
  the design session started, `tests/design/`).
- **skill** — REQ-028's tests in a harness-driven Claude Code session against fixture repos.

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

- **H1 Runner + tiers + reporting** — the `at:verify` command, tier dispatch, per-id report,
  the bijection checker.
- **H2 Fixture harness + controlled clock** — world build/teardown seam + time control.
- **H3 Sentinels + fault injection** — plant/scan utilities + induced-fault hooks.
- **H4 Semantic-oracle harness** — the judge/rubric surface.
- **H5 Vendor sims** — Anthropic usage/cost, Stripe, GitHub, Lovable, Linear stand-ins.
- **H6 at-config registry** — the pinned-value module every test reads.
- **H7 Proving ground** — translate REQ-016's 12 P0 end-to-end at integration tier; green.

## Open questions for the build

- Test framework (Vitest/Playwright split for backend vs ui) — decide at H1.
- Semantic-oracle model + determinism strategy (fixed seed / rubric thresholds) — H4.
- How much the `loop` tier stubs vs `integration` — the stub boundary — H1/H2.
- Provisional pins (gateway p95, OD-4, OD-7) stay flagged in the registry until founder-set.

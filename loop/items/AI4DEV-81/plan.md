# Plan — AI4DEV-81 (per-item integration verification), batch with AI4DEV-45 (CI timeout counts queue time)

Branch: `nirdrang/ai4dev-81-per-item-integration-verification-every-item-proves-its-ids`,
cut from main at 466880d. Reserved database slot: **slot 1**, reserved under this item; it serves
the pair. AI4DEV-45 is the batch partner: it rides this branch and pull request, and the pull
request closes it with the one sanctioned closes-line.

## What the board items ask

**AI4DEV-81** (primary): the goal step of every item runs the suite at BOTH tiers — loop
(unchanged, CI's required check) and integration against the item's reserved slot — each graded
per acceptance id with exact-match declarations. First concrete scope: migrate the live-proof
checks of the three finished auth items (GitHub sign-in, email verification, sessions) into
integration-mode test bodies. The live-proof script shrinks to vendor measurement only.
Constraints: no new pool mechanics; the personal stack stays untouchable; CI's required check
stays stub-based and fast; the requirement evidence gate is unchanged.

**AI4DEV-45** (partner): raise the verify job's `timeout-minutes` from 15 into the 30–45 range,
because the 15-minute budget was consumed by runner queue time and killed the check before one
step ran. The item states explicitly that the raise must NOT be justified by picking one of the
two undistinguished stories (queue vs. dead runner).

## Facts established against the tree (evidence by pointer)

- F1 — `.github/workflows/ci.yml` line 49 already carries `timeout-minutes: 30`, with a comment
  recording the 2026-08-06 queue deaths. `git log -L` shows the raise (15 → 30) landed in commit
  2795926, the change that routed CI to a self-hosted runner behind a variable, merged as PR #44.
  **The partner's remedy is already on main; it was never attributed to the partner item.**
- F2 — `tests/at/harness/runner.ts` already implements the integration tier end to end: slot
  occupancy via the item's reservation (`db-pool.ts occupy`), prepare (mirror, identity proof,
  reset, migration-set proof), the evidence line, an allowlisted child environment carrying
  `AT_SUPABASE_URL / _DB_URL / _ANON_KEY / _SERVICE_ROLE_KEY`, and `--expect` at any tier.
- F3 — `tests/at/harness/expected.ts` already supports per-tier declarations
  (`tiers: { loop, integration, drill }`), with two declarable red kinds only:
  `capability-pending` (exact capability names) and `pending` (phase). Bijection with the
  requirement's P0 ids is enforced per tier.
- F4 — `tests/at/expected/req-001.json` and `req-016.json` declare ONLY the loop tier today.
- F5 — `tests/at/harness/registry.ts` (~line 619): above loop, the whole capability ledger must
  contain zero stand-ins, enforced as a bare `expect(...).toEqual([])`. That failure detail fits
  NEITHER declarable red kind — so today an integration run of any suite is undeclarable, not
  merely red.
- F6 — `tests/at/harness/capabilities.ts`: the witness table is CLOSED (six names); the
  adapter-derived route (`fixtures.worlds`, every `sut.<key>`) stamps stand-in UNCONDITIONALLY;
  `clock.controlled`'s witness refuses any value without the freeze/advance seam, noting "this
  tree holds no attested real clock backing". `oracles.judge` already returns real at
  integration+live. `pendingCapability()` exists and throws `CapabilityPending` on any use.
- F7 — `tests/at/suites/req-001/_fixture.ts` header: every `sut.<key>` from the loop adapter is a
  stand-in, so "nothing here can reach the integration-tier run". The live evidence for the real
  half lives in the three finished items' `proof-local.ts` transcripts (one machine's word, never
  re-runnable): email verification checks (a, b, b2, d), sessions checks (a–e: sign-in row,
  refused sign-in adds no row, logout scope=local with a sibling-session control, expiry via a
  transiently lowered `jwt_expiry` plus same-row refresh, password reset), and the signup set
  (complete_signup atomicity leaving zero rows, the GitHub gate, the imported profile, database
  backstops).
- F8 — no OAuth app or credential exists for GitHub or Google in this environment. The provider
  HANDSHAKES are unproved at every tier (fixture header, mirrors 4 and 5) and this item cannot
  change that.
- F9 — no Discovery send route exists in this repository; `sendDiscoveryMessage` is a stand-in
  surface mirroring nothing (fixture header, closing paragraph).

## Decisions

- **D1 — the goal step runs both tiers.** The executor's goal loop definition becomes: every
  plan step at its done-criterion AND two exact-match results — `at:verify <req> --tier loop
  --expect` for every declaration manifest (as CI's loop step discovers them), and `at:verify
  <req> --tier integration --expect` for every declaration manifest, serially on the item's one
  reserved slot. CI (`.github/workflows/ci.yml`) is NOT changed by this item: the required check
  stays loop-only and fast. Cost accepted at filing: a slot reset plus a real run per manifest,
  minutes per item.
- **D2 — the integration refusal becomes declarable.** The registry's above-loop stand-in gate
  (F5) stops being a bare expect and throws `CapabilityPending` naming the stubbed capability
  names, so an id whose harness assembly still leans on stand-ins is a red of exactly the
  declarable `capability-pending` shape. Strictness is preserved: the id is still red, the names
  are exact, and the declaration machinery refuses any drift. This is what makes "unbuilt ids
  still red, nothing else moved" writable at the integration tier.
- **D3 — the loader selects the adapter by tier.** Loop keeps `_fixture.ts` unchanged.
  Integration loads a suite-provided live adapter module (new file beside the fixture) that backs
  a SUBSET of sut keys against the slot's stack using the validated `AT_SUPABASE_*` coordinates,
  and supplies `pendingCapability('sut.<key>')` proxies for every key it does not back — so an
  unbacked id fails as declarable `capability-pending`, and a backed id runs against the real
  database. A suite with no live adapter module assembles with the loop fixture and is caught by
  D2's gate — all ids declarably red.
- **D4 — real provenance only on positive evidence.** The capability machinery gains a
  deliberately designed route for live-backed values: verdict `real` ONLY when the witness holds
  positive grounds — the slot coordinates validated the same way `localStackProblems` validates
  them (loopback host, ports outside the personal stack's block, keys issued by the local
  development issuer, no hosted project reference). Absence of a stand-in seam is never grounds.
  The same doctrine covers the clock: at integration the harness registers an attested real clock
  (no freeze/advance seam, positive attestation from the harness's own real-clock constructor) —
  the "attested real clock backing" the witness table anticipates. The witness table stays
  closed; the failure direction of any fabrication stays false-red, never false-green.
- **D5 — per-tier test bodies are permitted, one body per id per tier.** The item's own words
  are "integration-mode test bodies". Some live checks are different procedures proving the same
  criterion (the boundary-instant expiry rides the controlled clock at loop and a transiently
  lowered `jwt_expiry` live), so `atTest` gains an explicit per-tier body form. The invariant the
  runner already enforces — exactly one registration and one vitest result per id per run —
  holds at every tier. A criterion's meaning never forks: both bodies cite the same acceptance
  text.
- **D6 — the integration green floor is the three migrated check sets.** Ids carried by the
  proof transcripts are the floor (see the table); every other req-001 id is declared red with
  its exact kind. Provider-handshake ids (F8) and the Discovery floor id (F9) are NOT declared
  green at integration — a green that needs a credential nobody holds or a route nobody built
  would be the false green this repository exists to kill.
- **D7 — req-016 gets an integration declaration too** (all ids red, exact kinds, via D2), so
  the goal step's discovery loop over every manifest runs exact-match at both tiers with nothing
  skipped.
- **D8 — the live-proof script is demoted in the process text.** The goal step's verification
  instrument is `at:verify` alone; a one-off proof script is legitimate only as a vendor
  measurement feeding a plan decision. The three committed transcripts stay in the record as
  history; nothing is deleted.
- **D9 — integration joins the merge evidence.** The merge ruling states both exact-match
  results (tier, requirement, exit, slot evidence line) pinned to the head. Process files:
  `WORKFLOW.md` (goal step and merge ruling lines), `executor.md` (goal definition),
  `orchestrator.md` + `orchestrator-opus.md` (merge ruling content — the twins are edited both
  or neither; `loop/work/twin-check.ps1` is the check).
- **D10 — the partner needs zero code change.** By F1 the remedy is applied, inside the item's
  30–45 range, with the runaway bound kept and the workflow comment not picking one of the two
  undistinguished stories. This pull request closes the partner with the sanctioned closes-line;
  the merge ruling declares that line and records F1 as the partner's evidence. Nothing else in
  the tree is touched for it.
- **D11 — slicing: yes.** The diff is large enough that one review would be a wall. The code
  gate runs per slice: **slice 1** — harness machinery (D2, D3's loader, D4, D5's registration
  form, selftests); **slice 2** — the live adapter, the migrated integration bodies, both
  declaration manifests, and the process-text changes (D1, D8, D9).

## Steps, each with its done-criterion

1. **Confirm the id ↔ check-set mapping** against the acceptance file
   (`.taskmaster/docs/acceptance/at-req-001.md`) and the three proof transcripts; amend the
   table below from "target" to "settled" per id. Done: every one of req-001's 37 P0 ids has a
   settled integration disposition recorded in the amended plan, each green citing the check(s)
   that prove it live-provable.
2. **Registry: declarable above-loop refusal (D2).** Done: a harness selftest proves `open()`
   above loop with stand-ins on the ledger throws `CapabilityPending` naming the exact stubbed
   names; every existing selftest and the loop-tier `--expect` runs for req-001 and req-016 stay
   green.
3. **Capabilities: the live-evidence route and the attested real clock (D4).** Done: selftests
   prove (a) real provenance is granted only with validated slot coordinates and refused for
   personal-stack ports, hosted-reference keys, and absent evidence; (b) the closed witness table
   still refuses unknown names; (c) the loop ledger is byte-identical to before.
4. **Loader: tier-selected adapter (D3) and the per-tier body form (D5).** Done: selftests prove
   loop loads `_fixture.ts` unchanged; integration loads the live adapter when present and falls
   back to a fully-declarable-red assembly when absent; two bodies for one id at one tier is a
   refusal; a body registered for the other tier does not run or register.
5. **The live adapter for req-001, backing the floor's sut keys** against the slot stack
   (GoTrue HTTP, the deployed edge functions, service-role SQL reads — the proof transcripts'
   own recipes). VERIFY FIRST, before the adapter design hardens: whether the slot's stack
   serves the edge functions from its mirrored `supabase/` (the CLI's edge-runtime container),
   or a functions-serve process must be managed per run — the finished items' stack-up and
   serves transcripts are the reference. Done: the adapter module exists, backs every floor key,
   proxies every other key, and typechecks; the verify-first answer is recorded in the item
   record with the command evidence.
6. **The migrated integration test bodies (D5, D6)** — these are the executable test bodies
   this item verifies, written as their own step, not deferred: email verification (a, b, b2, d),
   sessions (a–e including the transient-`jwt_expiry` expiry with in-run restore and a
   `git diff` proof that `supabase/config.toml` is unchanged, logout scope=local with the
   sibling-session control), signup atomicity (zero rows on refusal), the GitHub gate and the
   imported profile. Done: each floor id has exactly one integration body implementing its
   check; loop bodies untouched; typecheck green.
7. **Both declaration manifests gain their integration tier (D6, D7).** Done:
   `bun run at:verify req-001 --tier integration --expect` exits 0 on slot 1 from this checkout;
   the same for req-016; both loop `--expect` runs unchanged green. A red the run reports that
   fits neither declarable kind is a defect to fix, never a declaration to bend.
8. **Process text (D1, D8, D9).** Done: `WORKFLOW.md`, `executor.md`, and both orchestrator
   twins state the two-tier goal step, the merge-evidence addition, and the live-proof demotion;
   `loop/work/twin-check.ps1` passes.
9. **Goal-step evidence for this item.** Done: both tiers' `--expect` outputs (all manifests)
   recorded in the item record at the final head, integration carrying the slot evidence line
   naming slot 1.

## Expected verification state per acceptance id

Loop tier, both requirements: **unchanged** — the declarations in `tests/at/expected/*.json` as
they stand on main; any drift is a failure.

Integration tier, req-001 (settled in step 1; "floor" = must be green, from the item's own done
criterion):

| ids | expected at integration | grounds |
|---|---|---|
| AT-001.01, .05 | green — floor | signup atomicity, imported profile (signup proof set) |
| AT-001.09 | green — floor | verified fact via live `/auth/v1/user` (email proof d) |
| AT-001.12, .13, .38 | green — floor | sessions proofs a–d (expiry, refresh, mint/refuse) |
| AT-001.14 | green — floor | password reset (sessions proof e) |
| AT-001.04, .06, .07 | green target — settle in step 1 | live-provable without a provider handshake if the acceptance text permits; else declared red with exact kind |
| AT-001.02, .03 | red expected — settle in step 1 | provider handshakes, F8: no credential exists; green here would be false |
| AT-001.10 | red — capability-pending | F9: no Discovery route exists |
| the 24 loop-red ids (.16–.37, .39, .40) | red — same pending kinds as loop, confirmed by the run | unbuilt surfaces stay red, nothing else moves |

Integration tier, req-016: every id red, exact kinds via D2's declarable refusal.

## Proportionality and gates

This item reaches code (harness, suites, manifests, plus process files). The code gate runs, per
slice (D11). The plan gate reviews this file.

## Rides along

Nothing beyond the two board items. Machinery surprises found mid-build are filed, not built.

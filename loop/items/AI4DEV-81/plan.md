# Plan — AI4DEV-81 (per-item integration verification), batch with AI4DEV-45 (CI timeout counts queue time)

Branch: `nirdrang/ai4dev-81-per-item-integration-verification-every-item-proves-its-ids`,
cut from main at 466880d. Reserved database slot: **slot 1**, reserved under this item; it serves
the pair. AI4DEV-45 is the batch partner: it rides this branch and pull request, and the pull
request closes it with the one sanctioned closes-line.

**AMENDED after gate 1** (11 findings, all accepted — one fixed differently; see
`rulings-gate1.md` for each ruling with the reviewer's claim verbatim). This amended plan is
what gets built.

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
  reserved slot. CI's BEHAVIOR is not changed by this item: the required check stays loop-only
  and fast; the ONE edit `.github/workflows/ci.yml` receives is the comment neutralization of
  ruling 11 (zero behavior change). Cost accepted at filing: a slot reset plus a real run per
  manifest, minutes per item.
- **D2 — the integration refusal becomes declarable (amended, rulings 3 and 5).** The registry's
  above-loop stand-in gate (F5) stops being a bare expect and throws `CapabilityPending` naming
  the stubbed capability names, so an id whose harness assembly still leans on LEDGER stand-ins
  is a red of exactly the declarable `capability-pending` shape. The METHOD axis is covered at
  use time instead: callable pending proxies (D3) throw `CapabilityPending` naming
  `sut.accounts.<method>` on use, so an id leaning on an unbacked method is declarably red
  without failing the whole suite. Strictness is preserved: reds stay red, names are exact, the
  declaration machinery refuses drift. For any integration GREEN to exist, ledger construction
  itself becomes tier-aware (D4): at integration it constructs the attested real clock, the live
  mail-catcher email capability, and live-route fixtures/sut entries — a stand-in-free ledger on
  positive evidence, never by relaxing the gate.
- **D3 — the loader selects the adapter by tier (amended, rulings 2 and 5).** Loop keeps
  `_fixture.ts` unchanged. Integration loads a suite-provided live adapter module (new file
  beside the fixture, its own factory signature — no `ControlledClock` parameter) that backs a
  closed, exported ENUMERATION of `sut.accounts` METHOD names against the slot's stack, and
  supplies callable pending proxies for every method it does not back. Admission checks: every
  enumerated name must exist on the loaded adapter surface; every `real` grant carries D4's
  attestation evidence; nothing is ever granted `real` by prefix. The `sut.accounts` ledger
  entry is `real` with evidence naming the backed enumeration and the attestation; a pending
  proxy can only ever refuse, so the failure direction stays false-red. A suite with no live
  adapter module assembles with the loop fixture and is caught by D2's gate — all ids declarably
  red.
- **D4 — real provenance only on positive evidence (amended, rulings 1, 3, 4).** Shape checks
  (`localStackProblems`) remain a guard, never grounds. Positive grounds = a live round-trip
  binding: `prepare()` mints a per-run attestation nonce and writes it into the slot database
  after the reset; the child receives `AT_SLOT_ATTESTATION`; live construction reads the nonce
  back THROUGH the supplied coordinates and refuses on mismatch or read failure. The clock: at
  integration the harness constructs an attested real clock with NO control seam; the
  `clock.controlled` witness gains the attested-real branch its refusal text anticipates,
  granted only on the harness's own real-clock constructor's attestation. Email: at integration
  the ledger constructs a live email capability reading the slot stack's mail catcher (endpoint
  derived from the slot's own status/config, attested, probed before grant); the sim branch of
  the witness is untouched. The witness table stays closed; the live route is a separate
  constructor with its own admission partition; the failure direction of any fabrication stays
  false-red, never false-green.
- **D5 — per-tier test bodies are permitted, one body per id per tier (amended, ruling 4).**
  The item's own words are "integration-mode test bodies". Some live checks are different
  procedures proving the same criterion, so `atTest` gains an explicit per-tier body form. The
  per-tier CONTEXT TYPES carry the capability differences: an integration body's clock type
  exposes no `freezeAt`/`advance`, so seam misuse fails typecheck. The invariant the runner
  already enforces — exactly one registration and one vitest result per id per run — holds at
  every tier. A criterion's meaning never forks: both bodies cite the same acceptance text.
- **D6 — the integration floor is the three migrated CHECK SETS; per-id green follows the full
  criterion (amended, rulings 7 and 9).** The item's done-criterion mandates migrating the three
  finished items' live checks; it does not license any green the migrated checks do not prove.
  An id is declared green ONLY where its integration body proves the criterion's full text
  against the live stack (see the table's conditions for .01, .09, .13); every other req-001 id
  is declared red with its exact kind. Provider-handshake ids (F8) and the Discovery floor id
  (F9) are NOT declared green at integration — a green that needs a credential nobody holds or a
  route nobody built would be the false green this repository exists to kill.
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
- **D10 — the partner needs one comment edit, no behavior change (amended, ruling 11).** By F1
  the remedy is applied, inside the item's 30–45 range, with the runaway bound kept. The
  existing workflow comment WAS found to elect the queue story (`ci.yml:46` asserts "hosted
  capacity queued this job"), which the partner item forbids; the comment is amended to state
  both candidate explanations as undistinguished — no runner for 11-15 minutes, hosted queueing
  and a dead runner lane equally consistent with the evidence, the budget expired before a
  single step ran. This pull request closes the partner with the sanctioned closes-line; the
  merge ruling declares that line and records F1 plus the amended comment as the partner's
  evidence. Nothing else in the tree is touched for it.
- **D11 — slicing: yes.** The diff is large enough that one review would be a wall. The code
  gate runs per slice: **slice 1** — harness machinery (D2, D3's loader, D4, D5's registration
  form, D12's config transform, selftests); **slice 2** — the live adapter, the migrated
  integration bodies, both declaration manifests, the ci.yml comment neutralization (D10), and
  the process-text changes (D1, D8, D9).
- **D12 — standing low `jwt_expiry` in the generated slot config (new, ruling 6).** There is no
  transient config override and no restoration to prove. `generateSlotConfig`
  (`tests/at/harness/db-pool.ts:308`) gains one sanctioned, pinned transform: slot configs set a
  standing low `auth.jwt_expiry` (target ~120 s; exact value settled by step 5's verify-first).
  The value rides the existing generated-config + hash-marker + restart machinery — applied when
  absent, never restored, identical every run. No test body edits config or restarts the slot,
  ever. This makes AT-001.12's expiry arm and AT-001.13's client auto-refresh provable inside
  the single manifest run. The generator's selftests assert the transform is the only new
  difference it produces.

## Steps, each with its done-criterion

1. **Confirm the id ↔ check-set mapping** against the acceptance file
   (`.taskmaster/docs/acceptance/at-req-001.md`) and the three proof transcripts; amend the
   table below from "target" to "settled" per id. Done: every one of req-001's 37 P0 ids has a
   settled integration disposition recorded in the amended plan, each green citing the check(s)
   that prove it live-provable.
2. **Registry: declarable above-loop refusal (D2).** Done: a harness selftest proves `open()`
   above loop with stand-ins on the LEDGER throws `CapabilityPending` naming the exact stubbed
   names; a selftest proves a callable pending proxy throws `CapabilityPending` naming
   `sut.accounts.<method>` on use; every existing selftest and the loop-tier `--expect` runs for
   req-001 and req-016 stay green.
3. **Capabilities: the live-evidence route, the attestation binding, the attested real clock,
   and the live email branch (D4).** Done: selftests prove (a) real provenance requires the
   attestation round-trip — granted with a nonce read back through the supplied coordinates,
   refused for personal-stack ports, hosted-reference keys, absent evidence, AND
   well-formed-but-fabricated coordinates whose database does not hold this run's nonce (ruling
   1's case); (b) the closed witness table still refuses unknown names AND the new live route
   refuses unknown and unenumerated names — nothing is granted `real` by prefix (ruling 2);
   (c) the attested-real clock branch grants only on the harness's own constructor attestation
   and the live email branch only on a probed catcher endpoint; (d) the loop ledger is
   byte-identical to before.
4. **Loader: tier-selected adapter (D3), per-tier body form and context types (D5), and D12's
   config transform.** Done: selftests prove loop loads `_fixture.ts` unchanged; integration
   loads the live adapter when present (its own factory signature, no `ControlledClock`) and
   falls back to a fully-declarable-red assembly when absent; two bodies for one id at one tier
   is a refusal; a body registered for the other tier does not run or register; the integration
   context's clock type exposes no control seam; `generateSlotConfig` emits the standing
   `jwt_expiry` transform and its selftests assert it is the only new difference.
5. **The live adapter for req-001, backing the settled method enumeration** against the slot
   stack (GoTrue HTTP, the deployed edge functions, service-role SQL reads — the proof
   transcripts' own recipes). VERIFY FIRST, before the adapter design hardens: (a) whether the
   slot's stack serves the edge functions from its mirrored `supabase/` (the CLI's edge-runtime
   container), or a functions-serve process must be managed per run — the finished items'
   stack-up and serves transcripts are the reference; (b) whether the slot stack serves a mail
   catcher, and at which port (ruling 3); (c) the accepted range for `auth.jwt_expiry` in the
   local stack's config and the exact standing value D12 pins (ruling 6); (d) whether
   supabase-js `autoRefreshToken` rotation is deterministically observable under that expiry
   (ruling 7). Done: the adapter module exists, backs every enumerated method, proxies every
   other method, and typechecks; every verify-first answer is recorded in the item record with
   the command evidence.
6. **The migrated integration test bodies (D5, D6; rulings 6-9)** — these are the executable
   test bodies this item verifies, written as their own step, not deferred: email verification
   parameterized over BOTH account types — NGO (a, b, b2, d) and volunteer (the email item's
   check (e) recipe); sessions — sign-in row, refused sign-in adds no row, logout scope=local
   with the sibling-session control, expiry and same-row refresh under D12's standing low
   `jwt_expiry` (no in-run config edit, no restore, no `git diff` proof — struck by ruling 6);
   AT-001.13's genuine client auto-refresh body (supabase-js `autoRefreshToken`, rotation
   observed without an explicit refresh call, then continued access) IF step 5(d) proves it
   observable, else the id is declared red with its exact kind; password reset; signup — the
   FULL AT-001.01 oracle (account type NGO, org row, admin membership, acknowledgment fields,
   the pre-project gate as the loop body oracles it, later sign-in) with atomicity as the
   negative arm, green only if step 1 settles every clause live-oracleable; the GitHub gate and
   the imported profile per their settled conditions. Done: each settled-green id has exactly
   one integration body implementing its full criterion; loop bodies untouched; typecheck green.
7. **Both declaration manifests gain their integration tier (D6, D7; ruling 10).** The
   declarations are AUTHORED BEFORE the first integration run, from step 1's settled table plus
   the fixture/adapter analysis; the run must then match. Done:
   `bun run at:verify req-001 --tier integration --expect` exits 0 on slot 1 from this checkout;
   the same for req-016; both loop `--expect` runs unchanged green. A red the run reports that
   fits neither declarable kind is a defect to fix, never a declaration to bend; a divergence
   between authored declaration and run is investigated as a defect first, and a declaration is
   amended toward the run only with the cause traced and recorded in the item record.
8. **Process text (D1, D8, D9) and the partner's comment neutralization (D10).** Done:
   `WORKFLOW.md`, `executor.md`, and both orchestrator twins state the two-tier goal step, the
   merge-evidence addition, and the live-proof demotion; `loop/work/twin-check.ps1` passes; the
   `ci.yml` comment states both stories as undistinguished with no other change to the file.
9. **Goal-step evidence for this item.** Done: both tiers' `--expect` outputs (all manifests)
   recorded in the item record at the final head, integration carrying the slot evidence line
   naming slot 1.

## Expected verification state per acceptance id

Loop tier, both requirements: **unchanged** — the declarations in `tests/at/expected/*.json` as
they stand on main; any drift is a failure.

Integration tier, req-001 — dispositions settled by the DRAFT sitting per the gate-1 rulings;
cells marked "step 1 confirms" name exactly what the executor checks against the transcripts and
the deployed surfaces before authoring the declaration (ruling 10: the declaration is authored
from THIS table, never from the run):

| ids | settled disposition at integration | grounds and conditions |
|---|---|---|
| AT-001.01 | green ONLY with the full-outcome oracle (ruling 9); else red exact kind | account type NGO, org row, admin membership, acknowledgment fields (timestamp, IP, text version), pre-project gate as the loop body oracles it, later sign-in; atomicity as the negative arm. Step 1 confirms every clause is live-oracleable from the deployed surfaces |
| AT-001.05 | green ONLY if the When/Then (onboarding import populating handle and stats) is proved live without vendor fabrication; else red exact kind | the transcript's own honesty note: the linked-identity GIVEN was fabricated by operator authority, and no green may claim the handshake. Provisioning the Given via service-role is fixture setup and is recorded in the body's evidence; step 1 confirms what the import read (a real public API or a stand-in) and settles accordingly |
| AT-001.09 | green — parameterized over BOTH account types (ruling 8) | NGO round trip (email proofs a, b, b2, d) plus the volunteer path (email proof e recipe) |
| AT-001.12, .38 | green | the sessions transcript's own recipes: sign-in mint, wrong-password refusal adds no row, logout scope=local with sibling-session control, expiry and same-row refresh under D12's standing low `jwt_expiry` (ruling 6 — no transient override) |
| AT-001.13 | green ONLY with the genuine client auto-refresh body (ruling 7); else red exact kind | supabase-js `autoRefreshToken` rotation observed with no explicit refresh call under D12's expiry, then continued access; feasibility is step 5(d)'s verify-first |
| AT-001.14 | green | password reset via the emailed flow (sessions proof set) |
| AT-001.04 | red expected — the "linking completes signup" clause needs the handshake (F8); step 1 confirms no legitimate live link path exists, else settles green | the block arm alone does not satisfy the criterion's full text (same doctrine as rulings 8 and 9). Settled red; the declared refusal names `sut.accounts.registerWithProvider` — the Google half, the true first refusal on the body's path (draft ruling R-D5) |
| AT-001.06, .07 | green target — step 1 confirms the full criterion is live-oracleable from the deployed surfaces; else red exact kind | volunteer-refused-NGO-action and platform-admin sign-in are handshake-free; the oracle surfaces must exist live |
| AT-001.02, .03 | red | provider handshakes, F8: no credential exists; green here would be false |
| AT-001.10 | red — capability-pending | F9: no Discovery route exists |
| the 24 loop-red ids (.16–.37, .39, .40) | red — same pending kinds as loop | unbuilt surfaces stay red, nothing else moves; the authored declaration predicts them and the run must match (ruling 10) |

Integration tier, req-016: every id red, exact kinds via D2's declarable refusal, authored
before the run from the fixture analysis (ruling 10).

## Proportionality and gates

This item reaches code (harness, suites, manifests, plus process files). The code gate runs, per
slice (D11). The plan gate reviews this file.

## Rides along

Nothing beyond the two board items. Machinery surprises found mid-build are filed, not built.

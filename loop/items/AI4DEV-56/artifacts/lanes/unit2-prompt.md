# Unit 2 lane: deactivation gates every write, with a conformance check in CI

You are a feature writer lane. You work only in the worktree you were started in (branch `lane/ai4dev-56/unit2`). You edit, run the checks, and commit there. You do not push, and you do not touch any other worktree. Reply with five lines at the end (see Report); everything else goes to the report file.

## Read first, in this order

1. `loop/items/AI4DEV-56/brief.md`, unit 2 and facts 1 to 13.
2. `loop/items/AI4DEV-56/artifacts/arena/design.md`: section 4 (the conformance check, both tables of codes, the negative selftest), the `set_account_lifecycle` migration sketch, section 8 (the two clauses with no surface, DECLARE), section 9 rows .29, .30, .31, section 10 (`attemptWrite`, `setAccountLifecycle` and the harness pieces).
3. `loop/items/AI4DEV-56/artifacts/how/rulings.md` R1, R2, R7, R8, R10, R11, R13.
4. `loop/items/AI4DEV-56/artifacts/lanes/unit1-report.md`: what unit 1 landed and how it deviated from the design. Unit 1 is on your branch. Its code is the contract you build on: `supabase/functions/_shared/write-routes.ts` (the inventory `WRITE_ROUTES`, `writeGateDecision`, `writePipeline`, `parseWriteRefusalKind`), `edge.ts` (`writeRoute`, `callDatabaseFunction` unexported), `admin-operations.ts`, the migration `20260908120000_...sql` (`assert_account_active`, `change_account_lifecycle`, `append_audit_event`), `tests/at/suites/req-001/_contract.ts`, `_fixture.ts`, `_live.ts`, `_integration.ts`, `_pending.ts`, `_policy-scan.ts` and `_source-scan.ts` (the pattern for a tree-reading scan with a pure core), `tests/at/harness/policy-scan.selftest.ts`, `f-lifecycle-and-audit.test.ts`, `tests/at/expected/req-001.json`, `.taskmaster/docs/acceptance/at-req-001.md` section G.

## Scope of this unit (one commit group)

**The lifecycle setter.** Migration `supabase/migrations/20260909120000_account_lifecycle_setter.sql` per the design sketch: `set_account_lifecycle(p_account_id, p_subject_account_id, p_lifecycle, p_reason)` granted to `service_role`, `assert_account_active` on the CALLER first, then the platform-admin backstop, then `change_account_lifecycle`; it returns `{changed: boolean}`; every raise carries its kind as DETAIL (`no-account`, `not-a-platform-admin`, `subject-no-account`, `invalid-request`); `notify pgrst, 'reload schema'`. The route `supabase/functions/set-account-lifecycle/index.ts` in the four-line shape (the inventory row already exists), its pure decision `decideLifecycleChange` in `admin-operations.ts` (a deactivated administrator is refused by the gate before the decision; an administrator changing its own lifecycle is `invalid-request`; the subject is the standing's `subject`), and the `[functions.set-account-lifecycle]` block with `verify_jwt = true`.

**The virtual-key seam, declared.** `supabase/functions/_shared/gateway-keys.ts` with `KeyAction` and `virtualKeyActionFor(from, to)` exactly as the design's section 8 states. No table, no route: the founder has not answered the declare-or-stub question, so the design's DECLARE assumption holds.

**The conformance scan.** `tests/at/suites/req-001/_write-route-scan.ts` with the pure `scanWriteRoutes(inventory, files, configToml, edgeModule, migrations, fixtureText)` and the tree-reading `writeRouteProblems()`, on the `_source-scan.ts` pattern, emitting exactly the design's codes: `write-route-unregistered`, `write-route-missing-entry`, `write-route-not-constructed`, `write-route-registered-under-other-name`, `stand-in-not-gated`, `write-route-bypasses-boundary`, `write-route-unconfigured`, `write-route-jwt-unverified`, `rpc-caller-exported`, and the SQL half `definer-no-write-gate` (with the one exemption row `WRITE_GATE_EXEMPT` for `complete_signup` and its reason) and `audit-mutation-in-definer`. The SQL half reuses `splitSqlStatements` and the definer tracking `_policy-scan.ts` already does; extend that module rather than parse SQL twice, and say in the report which you did. It throws on an empty functions directory. The negative selftest `tests/at/harness/write-route-scan.selftest.ts` builds a synthetic tree per code (one `it` per code, plus one `it` that the real tree yields `[]`); the load-bearing case is a fourth write route that reaches `/rest/v1/rpc/` without registering. Keep the two sentences from the design in the module header: what the scan proves and what only integration proves.

**The three ids.** AT-001.29, .30 and .31 in `f-lifecycle-and-audit.test.ts`, per the design's section 9 rows, with the shapes below.
- `attemptWrite(route, session, subject)` joins `AccountsSut` as a `Record<WriteRouteName, ...>` in both adapters, so an inventory row the adapter cannot attempt is a type error; each entry performs the smallest legal write on that route as that session. `setAccountLifecycle(session, request)` joins beside it. The live adapter's `discovery-message` entry throws `CapabilityPending(['sut.accounts.sendDiscoveryMessage'])`; the fixture's entry runs the shipped gate over `WRITE_ROUTES['discovery-message']` through `sendDiscoveryMessage`, which now calls `writeGateDecision` before `discoveryMessageAllowed`.
- AT-001.29 iterates `WRITE_ROUTES` and, for every `account-required` row and every admitted type, drives an active control and a deactivated account; every deactivated attempt refuses `account-deactivated` and writes nothing; every control succeeds; and `writeRouteProblems()` equals `[]`. Loop: green. Integration: the NGO and platform-admin arms run for real, then the body throws `CapabilityPending(['sut.accounts.sendDiscoveryMessage'])` (the AT-001.24 shape, and the string the live adapter already throws for AT-001.10; mint no new capability string).
- AT-001.30: loop green (write refused at once after deactivation; `virtualKeyActionFor('active','deactivated') === 'revoke'`); integration: the real deactivation and the real refusal, the volunteer's token still answering 200 at `/auth/v1/user` (the measured fact, `artifacts/measure/auth-ban-probe.txt`), then `CapabilityPending(['gateway.virtual-key-revocation', 'sut.accounts.sendDiscoveryMessage'])`.
- AT-001.31: loop green; integration: the real re-enable and the writes succeeding again, the independent gates still refusing (the re-enabled NGO still `not-an-admin` where it holds `member`), a deactivated administrator unable to re-enable itself, then `CapabilityPending(['gateway.virtual-key-reissue'])`.
- Replace the three pending bodies; remove `LEAF.D6_L2` from `_pending.ts` and update its counts; in `tests/at/expected/req-001.json` move .29, .30 and .31 to green at loop, and at integration declare them `capability-pending` with the capability arrays above, in that order. Every refusal test also checks that the intended write did not happen.

**A shipped-module selftest** for `virtualKeyActionFor` and `decideLifecycleChange` under `tests/at/harness/` (`shipped-*.selftest.ts`).

Nothing else: no role-change trigger, no AT-001.33 or .34 (unit 3), no identity trigger (unit 5).

## Rules you must keep

- The harness takes no new machinery: no new sentinels, faults, vendor stand-ins, fixture worlds. The two `gateway.*` capability strings are the declared seam the design names; `sut.accounts.sendDiscoveryMessage` is reused.
- Refusal kinds travel on the wire (R10); a definer backstop refusal carries its kind in DETAIL.
- Every changed line traces to this unit. Do not reformat neighbours. No narrating comments; a comment only for a non-obvious why. ASD-STE100 in every sentence a person reads.
- Do not name any Linear id other than AI4DEV-56 in the commit message.

## Checks, all green before you commit

```
bun run typecheck
bun run at:check req-001
bun run at:selftest
bun run at:verify req-001 --tier loop --expect
```

Then the integration tier on the one local stack, from your worktree, in this order, keeping the output:

```
bun run db:stop
bun run db:start
bun run db:reset
bun run at:verify req-001 --tier integration --expect
```

If the stack fails to start, report it and stop; do not retry more than twice. Leave the stack running when done.

## Commit

One commit (squash if several), message exactly:

```
AI4DEV-56: deactivation gates every write, with a conformance check that fails an unregistered route in CI

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01X4L1LDLGqdutW5cMaJsaaG
```

## Report

Write `loop/items/AI4DEV-56/artifacts/lanes/unit2-report.md` in your worktree before the commit: files changed and why, deviations from the design with reasons, each check command with its exit code and the last 20 lines of output including the integration run's timestamps, open doubts. Reply with exactly five lines: the commit hash; the eight check results as `name: exit code`; one sentence naming any deviation from the design; one sentence on the biggest doubt; the report path.

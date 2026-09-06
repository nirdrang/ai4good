# Unit 2 writer: assigned-volunteer scope, platform-admin reach, the logged-out visitor (AT-001.23, AT-001.40, AT-001.24)

You are the writer for unit 2 of the tenant-isolation deliverable. You work in the git worktree at `/home/user/ai4good/.claude/worktrees/unit-2`, on branch `ai4dev-55-unit-2`. Stay inside that directory for every read, write and command. Never touch `/home/user/ai4good` itself or any other worktree. Never change a file under `src/`.

Unit 1 is already in your tree: the posture migration, the two `viewer_` predicates' first member, the read functions, the harness members and the green bodies for AT-001.21 and AT-001.22. Read its report at `loop/items/AI4DEV-55/artifacts/units/unit-1-report.md` first; it tells you what exists and how the gates were run.

## The contract

Read, in this order, all from the worktree root:

1. `loop/items/AI4DEV-55/artifacts/arena/design.md` — the design. Its unit 2 section and its migration-two sketch say what you build. The proof map's rows for AT-001.23, AT-001.40 and AT-001.24 say what each body does at each tier.
2. `loop/items/AI4DEV-55/artifacts/how/rulings.md` — every "act on" item binds you. Ruling 8 (assignment grants access only to a volunteer: the type conjunct in the policy AND the seat trigger) and ruling 10 (AT-001.24 red with a named shape, no route registry) matter most here.
3. `loop/items/AI4DEV-55/brief.md`, and the three ids verbatim in `.taskmaster/docs/acceptance/at-req-001.md`, section E.
4. The unit 1 code: `supabase/migrations/20260906120000_tenant_read_posture_and_org_member_policies.sql`, `supabase/functions/_shared/tenant-reads.ts`, `tests/at/suites/req-001/_contract.ts`, `_fixture.ts`, `_live.ts`, `_integration.ts` (the bodies `at00121` and `at00122` are your precedent), `_policy-scan.ts`, `d-tenant-isolation.test.ts`, `_pending.ts`, `tests/at/expected/req-001.json`.

The design is a sketch with signatures. You fill the bodies. Where the design and the tree disagree on a detail, the tree wins on the detail and the design wins on the decision. Where you cannot follow the design without breaking a ruling, take the smallest change that keeps every ruling and name it under "Deviations" in your report. Do not redesign.

## What unit 2 lands

- Migration two, `supabase/migrations/20260907120000_tenant_read_volunteer_seat_and_admin_reach.sql`, exactly as `design.md` sketches it: the seat trigger with its two error codes and the validation block; `viewer_is_platform_admin()`; `viewer_is_volunteer()`; the assigned-volunteer policy with the type conjunct; the four platform-admin policies; `notify pgrst`. No new table grant. Nothing to `anon`. The `viewer_` functions follow the posture the unit 1 migration header states, and `_policy-scan.ts` will refuse any other shape.
- `AssignVolunteerOutcome` gains `not-a-volunteer-account`; the live adapter classifies the trigger's refusal by message first, SQLSTATE second, as the existing refusals are classified; the loop fixture's `assignVolunteerAsOperator` mirrors the trigger as it already mirrors the NGO-only membership trigger.
- Bodies for AT-001.23 and AT-001.40 at both tiers, per the proof map. The loop bodies grade shipped orchestration through the fixture surface and the static scan; they grade no policy. The integration bodies sign each actor in through `registerConfirmAndSignIn`, provision Givens as the operator, read as the viewer, and end with both catalog halves (`tenantCatalogProblems()` and `sut.tenantTableFacts()`), as unit 1's bodies do. AT-001.23 exercises the trigger: an operator attempt to seat an NGO account is refused with `not-a-volunteer-account`. AT-001.40 reaches all four tenant tables of two different NGOs through the viewer reads and both read functions, and an NGO account repeats one read and gets an empty list and the refusal constant. The platform admin comes from the existing `provisionPlatformAdmin` operator member; read its comment before using it and follow what it returns.
- AT-001.24 at both tiers: the integration body asserts the interface half first (anon probes of the four tenant tables answer 401 `permission denied`; the public page answers 200 with no token), then throws `CapabilityPending(['ui.authenticated-surface-rendering'])`; the loop body throws the same. No route registry, no route classifier, nothing under `src/`.
- `tests/at/expected/req-001.json`: AT-001.23 and AT-001.40 move to `green` at both tiers; AT-001.24 moves from `pending / sut-missing` to `{ "kind": "capability-pending", "capabilities": ["ui.authenticated-surface-rendering"] }` at both tiers. `_pending.ts` drops `D5_L2` and corrects its header counts; no id uses `notLanded(LEAF.D5_L2)` afterwards.
- `tests/at/README.md` gains nothing unless a new harness module appears; none is expected.

## Rules for the diff

- Comments state a non-obvious why only. No narrating comments, no phase markers, no restated signatures.
- TypeScript under `tests/at` compiles under `tests/at/tsconfig.json` (strict, Node, `.ts` import specifiers, type aliases not interfaces). Pure modules under `supabase/functions/_shared/` stay pure.
- Match the style of the file you are in. Do not reformat or improve adjacent code.
- Commit liberally on `ai4dev-55-unit-2`, with messages that begin `AI4DEV-55:` and name no other item id anywhere.

## Gates, in order, all from the worktree root

1. `bun run typecheck`
2. `bun run at:check req-001`
3. `bun run at:selftest`
4. `bun run at:verify req-001 --tier loop --expect` and `bun run at:verify req-016 --tier loop --expect`
5. The integration tier. The stack serves edge functions from the checkout that started it. Before the first integration run, from the worktree root: `bun run db:stop`, then `bun run db:start`, then confirm with `docker inspect supabase_edge_runtime_poancmeitlmxejofwzuu --format '{{json .Mounts}}'` that the mount names your worktree's `supabase/functions`. Then `bun run at:verify req-001 --tier integration --expect`. It re-runs unit 1's ids too; all four tenant ids green and AT-001.24 declared is the target. One integration run at a time.
6. Every gate green at the end, on the committed tree.

A red you cannot turn green is not a reason to weaken a test, widen a declaration, or skip. Record it exactly and stop at that gate.

## The report

Write `loop/items/AI4DEV-55/artifacts/units/unit-2-report.md` in the worktree and commit it: what you built, file by file in one line each; every gate with the exact command, its exit code and the summary line it printed; the policy set as the live catalog saw it after migration two; deviations, each with its reason; anything discovered that belongs to a later requirement. Plain sentences.

Then reply with exactly five lines: the report's path; one line per gate group saying green or the first red (typecheck and check, selftest and loop tiers, integration tier); one line naming your deviations or "no deviations".

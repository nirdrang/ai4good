# Fix lane: the interrogate act-on set

You are a feature writer lane. You work only in the worktree you were started in (branch `lane/ai4dev-56/fix`). You edit, run the checks, and commit there. You do not push, and you do not touch any other worktree. Reply with five lines at the end (see Report); everything else goes to the report file.

## Read first

1. `loop/items/AI4DEV-56/artifacts/interrogate/verdict.md`: the fourteen act-on items are your scope, numbered 1 to 14. Read the four reviews it cites (`review-astra.md`, `review-fable.md`, `review-grok.md`, `review-opus.md`) for the exact locations and evidence.
2. The lane reports `loop/items/AI4DEV-56/artifacts/lanes/unit*-report.md` for what each unit landed, and `loop/items/AI4DEV-56/artifacts/arena/design.md` for the shapes.
3. The code: `supabase/functions/_shared/*.ts`, `supabase/functions/*/index.ts`, the four migrations `20260908120000`, `20260909120000`, `20260910120000`, `20260911120000`, `tests/at/suites/req-001/*.ts`, `tests/at/harness/*.selftest.ts`, `tests/at/expected/req-001.json`.

## The rulings you implement, item by item

The verdict's numbering. Where the verdict states a shape, that shape is the contract.

1. **R16, the transfer moves the seat and deactivates only a seatless account.** In `transfer_organization_contact`: after moving the seat, count the outgoing account's remaining seats; when zero, `change_account_lifecycle(..., 'deactivated', ...)`; when not zero, leave it active. The `org_contact_transferred` row's `detail` gains `remaining_seats` (an array of organisation ids, empty when deactivated) and `deactivated` (boolean). Remove the `holds-other-seats` refusal from the definer, from `decideContactTransfer`, from `WRITE_REFUSAL_KINDS`, from the selftest and from `TransferOutcome`; drop `orgSeatHolderSeats` from `WriteStanding`, `parseWriteStanding` and `write_standing` (nothing reads it any more); drop `fields` from `WriteRouteDecision` and `refuseWrite` if no other refusal uses it. AT-001.25's loop and integration bodies gain the second arm: transfer X from A to B, then X from B to a third completed NGO C; B keeps its signup seat and stays `active`; the second transfer's audit row has `remaining_seats = [B's organisation]` and `deactivated = false`; A is `deactivated` from the first transfer. Update `transferGiven` to mint C. The fixture mirror follows.
2. **Locks in the transfer definer.** First statement after `assert_account_active` and the reason and id checks: `perform 1 from public.accounts where id in (p_from_account_id, p_to_account_id) order by id for update`, then the seat row `for update`, then every read (seat holder, transferee type and lifecycle, remaining seats) under those locks. Say in the report why a concurrent `create_organization` for the outgoing account now waits.
3. **The actor on product membership inserts.** A new migration `20260912120000_audit_actor_on_product_paths.sql` recreates `complete_signup` (its current body from `20260811120000` or the latest migration that defines it, plus `perform set_config('app.actor_account_id', p_account_id::text, true)` before its membership insert) and `create_organization` (same line), with their revoke and grant restated, and replaces `append_audit_event` so the label is `account_type || ':' || id` looked up from `public.accounts` when the actor is not null, and `operator` when it is. The fixture's `recordRoleChange` and `appendAudit` mirrors follow. The `20260910120000` header sentence about the actor is rewritten to the new truth.
4. **AT-001.33 exact rows and a static loop arm.** In `assertAppendOnlyAudit`: snapshot `org_role_changed` rows for the organisation before each act; after the transfer require one new row with `reason = 'seat repointed'`, `actorAccountId = admin`, `detail.old_account_id = A`, `detail.new_account_id = B`; after the operator re-point require one new row with `reason = 'seat repointed'`, `actorAccountId = null`, `actorLabel = 'operator'`. Count, do not `some`. In `_policy-scan.ts` add `scanAuditAppendOnly(files)` with codes `audit-no-row-trigger` (no `before update or delete ... on public.audit_events` trigger), `audit-no-truncate-trigger`, `audit-write-grant` (any `grant` of `insert`, `update`, `delete`, `truncate` or `all` on `public.audit_events` to any role); `auditAppendOnlyProblems()` reads the tree; AT-001.33's loop body asserts it is `[]`; three selftest cases.
5. **`scanWriteGateSql` keeps grants across `create or replace`.** On a replace, start from the previous entry's `executeRoles` (and `revokedPublic` if tracked); clear on `drop function`. Selftest: a replace of a gated definer with an ungated body and no grant line is `definer-no-write-gate`.
6. **The write-route scan reads the whole functions tree.** `loadWriteRouteTree` reads every `.ts` under every function directory and under `_shared`; `REACHES_DATABASE` becomes the union of `writeRoute`, `callDatabaseFunction`, `/rest/v1/`, `createClient`, `.rpc(`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`; any `_shared` file other than `edge.ts` that matches is `shared-module-reaches-database`; any non-`index.ts` file in a route directory that matches is `write-route-helper-reaches-database`; `edge.ts` itself may match only inside `callDatabaseFunction` and `publicProjectReads` (check by function-body slicing, and say in the report how). `exportsCallDatabaseFunction` also matches `export const callDatabaseFunction`, `export default callDatabaseFunction` and `export { callDatabaseFunction`. Selftest cases: a direct table write in an `index.ts`, a `db.ts` helper beside an `index.ts`, a `_shared/bypass.ts`, and an `export const` form. The module header states what the scan does not see (a bypass that builds the URL from fragments).
7. **`attemptWrite` delegates; `WriteSubject` is a union.** In `_contract.ts`, `WriteSubject` is a discriminated union on `route: WriteRouteName`, each member carrying only the fields that route reads; `attemptWrite(subject: WriteSubject, session)` (or keep the route as the first argument and type the subject by it with a mapped type; pick one and say which). Both adapters implement `attemptWrite` as a map whose entries call the named members (`transferOrganizationContact`, `setEscalationContact`, `setAccountLifecycle`, `updateOrganization`, `createOrganization`, `completeSignup`, `sendDiscoveryMessage`) and map `{ ok: true, ... }` to `{ ok: true }`. `sendDiscoveryMessage` and `createOrganization` return the `WriteRefusal` shape (`kind`, `status`, `reason`) on refusal in both adapters, so the map is uniform; fix the outcome types and every body that reads them. Delete the duplicated mirror blocks and the `writeSubject` builder. The Discovery stand-in runs through one `writePipeline` spec in the fixture.
8. **Narrow the decision input.** `AccountStanding` is the `account` member of `WriteStanding` as a named type; `AccountWriteRouteInput` is `WriteRouteInput` with `standing: AccountStanding`; `WriteRouteSpec` becomes generic over which input its `decide` takes, so an `account-required` row's spec is typed with `AccountWriteRouteInput` and `writePipeline` passes the narrowed standing after the gate admits; `complete-signup` keeps the wide input. Delete the three 502 branches in `admin-operations.ts` and the ternary in `decideOrganizationRename`, and their selftest cases.
9. **AT-001.29 iterates every row with its own subject.** Remove the `account-required` filter; `complete-signup` runs with a deactivated NGO as caller and is refused `account-deactivated` at both tiers; every route's active control gets its own actors (a fresh organisation and accounts per row), so the transfer control cannot change what a later row sees; the `set-account-lifecycle` control performs a real change (deactivate a fresh subject) rather than a no-op.
10. **DETAIL on the restated writers.** In `create_organization`: `detail = 'no-account'`, `detail = 'not-an-ngo-account'`, `detail = 'invalid-name'`; in `update_organization`: `detail = 'invalid-name'`, `detail = 'no-such-organisation'`, `detail = 'not-a-member'`, `detail = 'not-an-admin'`. These land in the same new migration as item 3 (recreate both there, once, with all changes).
11. **`writeRoute` answers 409 only for a raised exception.** `RpcOutcome` gains `code: string | null` (PostgREST's `code` field); `writeRoute` answers 409 when `code` is a five-character SQLSTATE, else 502 with `kind: 'refused'`. `loadWriteStanding` is unchanged. Selftest the two shapes if a pure helper is extracted for the classification (extract one: `rpcRefusalStatus(outcome)`).
12. **The escalation contact is audited.** `audit_event_kind` gains `org_escalation_contact_recorded` (in the new migration, `alter type ... add value`, and note in the report that the value is usable only after the migration commits, so the definer that writes it is recreated in the same migration but the enum value is added in a preceding statement; if the local CLI runs a migration inside one transaction and refuses the new value in the same transaction, split the enum addition into its own migration `20260912110000` and say so). `set_escalation_contact` appends one row with actor, the organisation, reason `escalation contact recorded`, and `detail` carrying `previous` (the replaced contact or null) and `current`. AT-001.28's bodies read the row back at both tiers; the fixture mirror follows.
13. **The virtual-key clause is declared at both tiers.** Delete `supabase/functions/_shared/gateway-keys.ts` and `tests/at/harness/shipped-lifecycle.selftest.ts`'s cases for it (keep the `decideLifecycleChange` cases). AT-001.30 and AT-001.31 loop bodies run every real arm and then throw `CapabilityPending(['gateway.virtual-key-revocation'])` and `CapabilityPending(['gateway.virtual-key-reissue'])`; the manifest declares them `capability-pending` at loop with exactly those arrays; `loop/items/AI4DEV-56/pending-ledger.txt` gains the two loop lines and its count line moves (loop reds 5, greens 33).
14. **Nits.** `fromAccountId` goes through the same UUID check in `writeRoute` (a third selector, `from`, on the spec; the transfer names it); `RpcOutcome` is not exported; the escalation email must match `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` in `validateEscalationContact` and the SQL check; the role-change trigger binds `delete` and writes `membership removed` with `old` values; `scanIdentityPermanence` resolves the trigger's function name and requires the function body (found in the migrations) to contain `'github'`, `'volunteer'` and `raise exception`, with a selftest for an empty body; the `edge.ts` header paragraphs that count functions and list imports are rewritten as one sentence each with no count ("every function under `supabase/functions/` shares this header; only `public-project` authenticates nothing"), and `_fixture.ts`'s header names the shipped modules it imports without a count; AT-001.28's NGO-refusal assertion checks `status === 403` beside the kind; the `20260911120000` header gains one sentence: "The refusal reaches the caller as GoTrue's 500; a product surface must not offer unlink to a completed volunteer."

## Rules you must keep

- The harness takes no new machinery: no new sentinels, faults, vendor stand-ins, fixture worlds, or capabilities beyond the two `gateway.*` strings already in the manifest.
- Every new migration passes the static scans. A recreated definer restates its revoke and grant.
- Every changed line traces to an item above. Do not reformat neighbours. No narrating comments; a comment only for a non-obvious why. ASD-STE100 in every sentence a person reads.
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
AI4DEV-56: the review findings — the transfer moves on, the definer locks its accounts, the audit names its actors, and the scans read the whole tree

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01X4L1LDLGqdutW5cMaJsaaG
```

## Report

Write `loop/items/AI4DEV-56/artifacts/lanes/fix-report.md` in your worktree before the commit: per item 1 to 14, what changed and where, any item you could not complete and why, each check command with its exit code and the last 20 lines of output including the integration run's timestamps, open doubts. Reply with exactly five lines: the commit hash; the eight check results as `name: exit code`; the items completed as a list of numbers and the items not completed with one reason each; one sentence on the biggest doubt; the report path.

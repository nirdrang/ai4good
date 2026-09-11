# Unit 1 report: the vetting record, every mandated field or no commit

Worktree: `C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-102-unit0`.
No commit was made.

## What landed

Two migrations:

- `supabase/migrations/20260914110000_audit_event_kind_org_vetting.sql` adds the audit enum value `org_vetting_changed` and nothing else.
- `supabase/migrations/20260914120000_org_vetting.sql` creates `public.org_vetting` (one row per organisation, unreachable by client roles, RLS on, baseline revoke from anon, authenticated and service_role) and the definer `public.set_organization_vetting`. Every mandated column is `not null` and has a populated check. The check `org_vetting_registration_metadata` couples emailed registration documents to their metadata and forbids that metadata on every other evidence type. The C5 mailbox sentence sits on that check.

The definer:

- calls `public.assert_account_active` first
- refuses a caller who is not a platform admin
- locks the organisation row
- implements vet and unvet
- returns `changed false` with no audit row when an unvet finds no vetted state
- appends `org_vetting_changed` through `public.append_audit_event` when state changes
- does not emit a notification
- keeps `v_notification_event_id` null after the audit write so unit 3 can insert the emit

The route:

- `POST /functions/v1/set-organization-vetting`
- one `Deno.serve(writeRoute(...))`
- `WRITE_ROUTES` row that admits only `platform_admin`
- `[functions.set-organization-vetting] verify_jwt = true`
- decision module `supabase/functions/_shared/org-vetting.ts`
- new refusal kind `invalid-evidence`

The auth suite:

- `TENANT_CATALOG` gained `org_vetting: 'unreachable-by-client-roles'`
- `WriteSubject`, the two exhaustive `Record<WriteRouteName, ...>` maps, and the lifecycle switches in `_integration.ts` gained the new route, so AT-001.29 still drives every write

The organisation suite:

- loop and live adapters implement `provisionNgo`, `provisionPlatformAdmin`, `setVetting`, `vettingRecord`, `attemptVettingRowAsOperator` and `vettingAuditEvents`
- AT-002.11 and AT-002.11b are green at both tiers in `tests/at/expected/req-002.json`
- no other id moved

## The seven commands

Run in the worktree.

1. `bun run typecheck` — `typecheck OK: all three projects clean`, exit 0.
2. `bun run at:check req-002` — `27 P0 in the acceptance file, 27 registered in the suite`, `RESULT: 27 P0 ids in bijection`, exit 0.
3. `bun run at:verify req-002 --tier loop --expect` — `27 P0: 2 green, 25 red, 0 missing`, matches the declaration, exit 0.
4. `bun run at:verify req-002 --tier integration --expect` — `27 P0: 2 green, 25 red, 0 missing`, matches the declaration, exit 0.
5. `bun run at:selftest` — `Test Files 19 passed (19)`, `Tests 293 passed (293)`, exit 0.
6. `bun run at:verify req-001 --tier loop --expect` — `38 P0: 33 green, 5 red, 0 missing`, exit 0. `bun run at:verify req-016 --tier loop --expect` — `12 P0: 12 green, 0 red, 0 missing`, exit 0.
7. `bun run at:verify req-001 --tier integration --expect` — `38 P0: 27 green, 11 red, 0 missing`, matches the declaration, exit 0.

## Schema arm

A direct insert with a mandated column set to null is refused with SQLSTATE `23502`. PostgreSQL 17 does not attach a named `pg_constraint` to an unnamed `NOT NULL`. The error names the column, not a constraint. The first field the body nulls is `org_id`. The named primary key on that column is `org_vetting_pkey`. A null `organization_name` produces the same SQLSTATE and does not trip `org_vetting_name_populated`, because a SQL `CHECK` treats NULL as unknown and passes.

## Stack restart

The first integration run refused the complete vet with kind `refused`. The SQL function itself succeeded when called as the operator. The edge runtime was still mounted on another worktree and answered `404 Function not found`. I stopped and started the local stack from this worktree so the new function is served. After that, both ids were green.

## Where the design of record was not followed, and why

- No notification emit, and no TypeScript notice passed into the definer (graft G3). Unit 3 is the only unit that adds the emit. The definer already locks the seat and reads the holder email, and it already returns `notification_event_id`. Adding the emit is an insertion after the audit write.
- No allowance ledger, profile columns, publish route or funding route. Later units own those.
- `_integration.ts` was edited in addition to the three named auth-suite files. The lifecycle helper switches over every write-route name, so a new route does not type-check without those cases.

## Least sure

Whether unit 3 can insert the emit without also changing the definer's argument list. Graft G3 wants TypeScript to compute the notice and pass it in. That would add parameters, which is more than an insertion.

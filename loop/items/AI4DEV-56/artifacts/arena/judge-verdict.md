## Scores

| Criterion | A | B | C | D |
|---|---|---|---|---|
| 1. One boundary, mechanically enforced | 3 | 3 | 2 | 3 |
| 2. History preserved, attribution intact | 3 | 3 | 3 | 3 |
| 3. Append-only in the schema | 3 | 3 | 3 | 3 |
| 4. Every id has a body and an honest tier shape | 3 | 2 | 3 | 3 |
| 5. Smallest surface, deepest modules | 2 | 2 | 2 | 2 |
| 6. Fits the tree's posture | 3 | 2 | 2 | 2 |
| **Total** | **17** | **15** | **15** | **16** |

`callDatabaseFunction` is the only RPC helper in `supabase/functions/_shared/edge.ts`, and only the three write entries import it. `_policy-scan.ts` `WRITE_PRIVS` is `insert, update, delete, truncate, all`. `_integration.ts` keeps `SERVICE_ROLE_SELECT` as `accounts` and `org_memberships`.

## Per-candidate notes

### A

**1. Boundary — 3.** The README says `callDatabaseFunction` is not exported, so a route cannot reach `/rest/v1/rpc/` alone. The scan fails a fourth file that fetches `donate_fuel` without `writeRoute`.

**2. History — 3.** The transfer table leaves `acknowledgments` unchanged, still pointing at A. Seat move, deactivation, and audit rows commit in one definer.

**3. Append-only — 3.** The sketch revokes all on `audit_events` from `anon`, `authenticated`, and `service_role`. A BEFORE UPDATE OR DELETE trigger raises, and the operator may drop it.

**4. Ids — 3.** The per-id table covers AT-001.25 through .35 and .41 with Given, act, assertion, and tier. AT-001.34 throws `CapabilityPending` on `vendors.gotrue-sign-in-rate-limit` at both tiers.

**5. Surface — 2.** It adds three admin routes, four internal SQL functions, and nine SUT members including `attemptWrite`. Entries become four lines, so modules are deep, but the object count is not smallest.

**6. Tree — 3.** `TENANT_CATALOG` gains `audit_events` and `org_escalation_contacts` as `unreachable-by-client-roles`. AT-001.28 is green at both tiers with the narrowing stated in the body.

**Rulings violated.** None that invert an act-on rule. The identity trigger uses `pg_trigger_depth() > 1` inside the function, not R3's `= 0` text.

**Graft.** A write route is a value handed to `writeRoute`, and no other path reaches the database.

**Weakest.** "A future route with a genuinely different pipeline must extend `writeRoute` rather than work beside it."

### B

**1. Boundary — 3.** CI recomputes generated `WRITE_ROUTES` from migrations and fails a fourth unregistered entry. The TypeScript scan requires `gateWrite` before the matching RPC, including aliases.

**2. History — 3.** Successful transfer updates one seat, deactivates A, and leaves acknowledgments, projects, and profiles unchanged. Replay of the same request id returns the same receipt.

**3. Append-only — 3.** Append-only has four parts: no client write privilege, no mutating definer, raising triggers, and no cascading foreign key. BEFORE TRUNCATE is included, matching R3's TRUNCATE clause.

**4. Ids — 2.** AT-001.28 throws `CapabilityPending(['ngo.concierge-onboarding'])` after storage checks. That leaves the concierge id red, against R15's green shape at both tiers.

**5. Surface — 2.** The package adds a generated inventory file, an AST scanner, request ids, and two unused SQL stand-in functions. `concierge_contact_refusal` and `virtual_key_refusal` restate TypeScript seams in SQL with no caller.

**6. Tree — 2.** The identity trigger uses `WHEN (pg_trigger_depth() = 0)`, which matches a direct delete before the function runs. Adding new tables to `SERVICE_ROLE_SELECT` would expect SELECT the live catalog does not grant.

**Rulings violated.** R15: "The design task's explicit DECLARE assumption takes precedence over ruling R15's earlier proposal to mark concierge onboarding green."

**Graft.** Derive the typed write inventory from effective migration definers, and fail CI when that artifact is stale.

**Weakest.** Route registration lives in `at-write` comment metadata on SQL functions, which a maintainer can mistype without a type checker.

### C

**1. Boundary — 2.** Candidates are directories whose `index.ts` matches `callDatabaseFunction`. Registration does not require the gate call to appear before the RPC.

**2. History — 3.** The seat row's `account_id` becomes the transferee; acknowledgments stay on A; projects stay on O. One RPC is one transaction.

**3. Append-only — 3.** The sketch revokes all on `audit_events` and raises on BEFORE UPDATE OR DELETE. Role changes and transfer both insert `audit_events`; transfer writes from the definer.

**4. Ids — 3.** The per-id table names all eleven ids, with AT-001.28 green and AT-001.34 pending. Integration AT-001.29 runs NGO and admin arms, then throws `product.volunteer-write-route`.

**5. Surface — 2.** Public surface is one new URL, five tagged commands, and two extra calls on two existing files. `admin-operations/index.ts` still loads standing, gates, and maps RPC errors by hand.

**6. Tree — 2.** New tables revoke all from client roles and `service_role`, with no policy. The identity function returns old when `pg_trigger_depth() <> 0`, which is always true inside a trigger.

**Rulings violated.** R10: `return json({ ok: false, kind: 'refused', reason: outcome.message }, status)` on every RPC failure. R3: `if pg_trigger_depth() <> 0 then return old`. R1: the scan never requires the gate before the RPC.

**Graft.** One `admin-operations` function dispatches a closed command list and inserts the audit row first.

**Weakest.** SQL `p_act text` plus `p_payload jsonb` makes the closed TypeScript enum open again at the definer.

### D

**1. Boundary — 3.** An edge candidate is registered only if it names `WRITE_ROUTES['<name>']` and does not import `callDatabaseFunction`. Every service-role definer must contain `perform public.assert_account_active` unless signup-exempt.

**2. History — 3.** The one `org_memberships` row for O changes `account_id` from X to Y and keeps role admin. `acknowledgments` are not touched; X's signer fields stay X's.

**3. Append-only — 3.** Revoke all includes `service_role`; a BEFORE UPDATE OR DELETE trigger raises `42501`. The scan adds `audit-mutation-in-definer` for update or delete of `audit_events`.

**4. Ids — 3.** The per-id table covers all eleven ids; AT-001.28 is green; AT-001.34 is pending on the vendor limiter. AT-001.29 integration throws `CapabilityPending(['sut.accounts.sendDiscoveryMessage'])` after real NGO and admin arms.

**5. Surface — 2.** Three new edge functions share `writeRoute`; `ngoOnlyActionAllowed` is deleted. `accounts.lifecycle_changed_at` duplicates when-change already stored on the audit row.

**6. Tree — 2.** The unlink body raises only when `pg_trigger_depth() = 0`, which is never true inside a trigger function. `assert_account_active` is granted to `service_role`, so the helper itself becomes a scan candidate.

**Rulings violated.** R3: `if pg_trigger_depth() = 0 and old.provider = 'github'` inside the trigger function, so a direct unlink is never refused.

**Graft.** `writeAllowed(route, account, orgRole)` is the one pure gate the fixture and the edge both call.

**Weakest.** Deleting `ngoOnlyActionAllowed` removes the shipped AT-001.06 decision in `accounts.ts` that `create-organization` and the fixture already import.

## Base recommendation

Candidate A is the base. A future maintainer adds one inventory row and a four-line entry, and cannot reach PostgREST any other way. The unexported RPC helper is the invariant the scan and the type checker both pin. The operator path is named as test-only, and the SQL helper still covers a raw service-role RPC. Three admin URLs and extra SQL helpers are larger than C, but they do not reopen a route or skip a type. AT-001.28 stays green, and the identity trigger still refuses a direct delete. Cleaner boundary beats smaller surface here, so A wins the 17-to-16 edge over D.

## Grafts

- **From B into A.** Put the identity-trigger depth test in `WHEN (pg_trigger_depth() = 0)` on `CREATE TRIGGER`, not inside the function.
- **From C into A.** Keep one closed command list for platform-administrator acts if two extra URLs prove costly; do not map definer refusals to `kind: 'refused'`.
- **From D into A.** Carry SQL refusal `kind` in `DETAIL`, and name the volunteer arm `sut.accounts.sendDiscoveryMessage`, the capability the live adapter already throws.

## Dropouts

None. All four packages are complete, on-task designs for the six units.
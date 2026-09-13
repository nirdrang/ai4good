The tree already has the tenant, write-route, audit, and Discovery-allowance machinery a need intake must join. It does **not** yet have a product path that creates a project, a project status, intake fields, a storage bucket, or a need write route.

### Components Found

| Name | Path | What it does |
|---|---|---|
| `public.projects` | `supabase/migrations/20260811130000_single_seat_org_and_single_developer_projects.sql` 57–66 | One row per project: `id`, `org_id`, `name`, `assigned_volunteer_id`, `created_at`. Table comment says product creation is **not** landed. No status, urgency, description, or cause column. |
| `project_seat_holds_one_developer` / `project_seat_holds_a_volunteer` | same file 80–104; `20260907120000_…sql` 11–52 | Triggers: refuse replacing an occupied developer seat; refuse seating a non-volunteer. |
| `public.organizations` | `20260808120000_…sql` 47–51 plus `20260915120000_organization_profile.sql` 14–18 | `id`, `name`, `created_at`, then nullable `mission`, `country`, `website`, `logo` with populated CHECKs. |
| `public.org_memberships` | `20260808120000_…sql` 57–63; unique index `20260811130000_…sql` 41–45 | Composite PK `(org_id, account_id)`; `role` is `admin` \| `member`. Unique index on `org_id` alone makes a second seat unrepresentable. |
| `public.org_role` | `20260808120000_…sql` 31 | Enum `admin`, `member`. Nothing in product writes `member`; tests reach it with an operator insert into a **different** org. |
| `public.acknowledgments` | `20260808120000_…sql` 72–79 plus signer columns in `20260811120000_…sql` | Platform ToS/Promise at signup. `has_platform_acknowledgment` (93–109) is the **hook** project creation must call; no writer calls it yet. |
| `TENANT_CATALOG` | `tests/at/suites/req-001/_policy-scan.ts` 21–37 | Handwritten map of every `public` table to `tenant-isolated` or `unreachable-by-client-roles`. |
| `viewer_is_org_member` / `viewer_is_platform_admin` / `viewer_is_volunteer` | `20260906120000_…sql` 64–83; `20260907120000_…sql` 70–110 | SECURITY DEFINER helpers a policy USING may call. Live pin: only these three definers are executable by `authenticated` (`_integration.ts` 167). |
| `WRITE_ROUTES` / `writeRoute` / `writePipeline` | `supabase/functions/_shared/write-routes.ts`; `edge.ts` 336–379 | Mandatory write inventory and the only path a write route may reach the database. |
| `write_standing` | `20260908120000_…sql` 94–127 | One RPC: account type + lifecycle, whether the org exists, role **in the target org**, seat holder, optional subject. Granted to `service_role`. |
| `orgAdminActionAllowed` | `supabase/functions/_shared/memberships.ts` 96–114 | Admin-of-this-org decision. Two refusal kinds: `not-a-member` vs `not-an-admin`. |
| `assert_account_active` | `20260908120000_…sql` 69–91 | SQL backstop every non-exempt service_role definer must call (`WRITE_GATE_EXEMPT` is only `complete_signup`, `_policy-scan.ts` 43–47). |
| `public.audit_events` | `20260908120000_…sql` 11–67 | Append-only: UPDATE/DELETE/TRUNCATE raise. `event_kind` enum, `detail jsonb`, non-empty `reason` and `actor_label`. |
| `append_audit_event` | recreated in `20260912120000_…sql` 5–46 then `20260914120000_…sql` 14–57 | Sole writer. Owner-definer only (revoke from `public`, **no** grant to `service_role`). Optional `p_occurred_at`. |
| `public.discovery_spend` / `public.discovery_allowance` | `20260916120000_discovery_allowance.sql` | Per-org per-UTC-day ledger. Remaining is never stored: `granted - spent`. |
| `DISCOVERY_DAILY_GRANT` | `supabase/functions/_shared/discovery-allowance.ts` 17–20 | TypeScript twin of SQL `discovery_daily_grant`: 10 unverified, 30 vetted. |
| `project-workspace` | `supabase/functions/project-workspace/index.ts` | Authenticated **read**. Does not write. Not in `WRITE_ROUTES`. |
| `public-project` | `supabase/functions/public-project/index.ts` | Anonymous **read** via `read_public_project`. `verify_jwt = false`. `projectIsPublic` is always true (`public-project.ts` 23–25). |
| `set-organization-profile` | `supabase/functions/set-organization-profile/index.ts` | Canonical NGO-admin write: `writeRoute` + `organizationIdField` + `orgAdminActionAllowed` + SQL backstop. |
| `discovery-allowance` | `supabase/functions/discovery-allowance/index.ts` | Read or debit today's credits. Debit’s email check lives in **SQL**, not in `writeGateDecision`. |
| `create-organization` | `supabase/functions/create-organization/index.ts` | NGO-only create. Header still says no project/need table exists (stale: `projects` exists; creation still does not). |
| `emailVerifiedFromUser` / `discoveryMessageAllowed` | `supabase/functions/_shared/verification.ts` | Discovery-**message** floor. Header at lines 8–24: **no deployed caller yet**. Not on the general write pipeline. |
| `publishingAllowed` | `org-vetting.ts` 59–65 | Vetting gates publishing only. No publish route consults it yet. |
| Storage section | `supabase/config.toml` 125–135 | `[storage] enabled = true`, `file_size_limit = "50MiB"`. Bucket block is **commented out**. No product bucket, policy, or upload path. |

`projects` posture today (`TENANT_CATALOG` line 24 = `tenant-isolated`):

- RLS on; SELECT granted to `authenticated` only.
- Policies: `projects_select_org_member` (`viewer_is_org_member(org_id)`), `projects_select_assigned_volunteer` (seat = `auth.uid()` and `viewer_is_volunteer()`), `projects_select_platform_admin`.
- `anon` holds nothing. `service_role` holds no table privilege on `projects` (not in `SERVICE_ROLE_SELECT`, `_integration.ts` 166).

---

### Flow

**1. Authenticated project read (`project-workspace`)**

1. `Deno.serve(edgeHandler(…))` in `project-workspace/index.ts` 16.
2. POST only; `resolveCaller` (`edge.ts` 165–207) presents the JWT to `/auth/v1/user`.
3. `callerFromAuthAnswer` (`caller.ts` 111–119) yields `{ id, githubHandle }` or `null` → 401.
4. Body must name `projectId` as a UUID.
5. `callerReads` (`edge.ts` 398–422) GETs `/rest/v1/projects?id=eq.…&select=id,name,org_id,assigned_volunteer_id` **as the caller**. RLS filters.
6. `projectWorkspace` (`tenant-reads.ts` 96–114) maps zero rows to the one 404 `"no such thing is visible to this caller"`. It does not write.

`organization-dashboard` is the same pattern for an org: it also SELECTs `projects?org_id=eq.…&select=id,name,assigned_volunteer_id` (`edge.ts` 412–416). Intake fields would be invisible until those `select=` lists grow.

**2. Public project read (`public-project`)**

1. `verify_jwt = false` (`config.toml` 524–525).
2. Service-role RPC `read_public_project` (`20260906120000_…sql` 123–140) returns `project_id`, `project_name`, `organization_name`.
3. `projectIsPublic` always returns true (`public-project.ts` 23–25). There is no visibility or lifecycle column to consult.

**3. A write route (the shape a need writer must copy)**

Example: `set-organization-profile/index.ts` 13–18.

1. Boot: `writeRoute` throws if `spec.name` is not in `WRITE_ROUTES` or if the row is a stand-in (`edge.ts` 339–341).
2. Platform JWT check: `[functions.<name>] verify_jwt = true` (`config.toml` 500–501).
3. `resolveCaller` as above.
4. `spec.target` = `organizationIdField` → `body.organizationId` (`write-routes.ts` 269–271). Malformed UUID → 400 (`edge.ts` 359–362).
5. `loadWriteStanding` calls `write_standing` as service role (`edge.ts` 320–331).
6. `writePipeline` (`write-routes.ts` 309–319):
   - `writeGateDecision` (290–307): unreadable → 502; `deactivated` → 403 `account-deactivated`; `no-account` → 409; type not in `admits` → 403 `not-an-ngo-account` / `not-a-platform-admin`.
   - **Does not** check email verification, org role, or `has_platform_acknowledgment`.
7. `decideOrganizationProfile` (`memberships.ts` 151–184): missing target → 400; `orgAdminActionAllowed(standing.orgRole)` → 403 `not-a-member` / `not-an-admin`; trim/non-empty fields.
8. `callDatabaseFunction` POSTs `/rest/v1/rpc/set_organization_profile` with the judged `p_*` args (`edge.ts` 283–317). Service role, one round trip = one transaction.
9. SQL `set_organization_profile` (`20260915120000_…sql` 42–95): `assert_account_active`; trim including NBSP; lock org `FOR UPDATE`; re-read membership; raise `not-a-member` / `not-an-admin` / `no-such-organisation` with `DETAIL` = the kind; then UPDATE.
10. A five-character SQLSTATE maps to HTTP 409 and `parseWriteRefusalKind(details)` (`write-routes.ts` 232–233; `edge.ts` 372–375). Anything else is 502.

`discovery-allowance` follows the same pipeline. Extra SQL on **debit only** (`20260916120000_…sql` 149–209): `email_confirmed_at` on `auth.users` (kind `email-unverified`); positive credits; lock spend row; remaining ≤ 0 → `daily-allowance-exhausted`; debit > remaining → `debit-exceeds-remaining`. The TypeScript `decideDiscoveryAllowance` does **not** re-check email (`discovery-allowance.ts` 153–201). The loop fixture re-implements the debit refusals after `writePipeline` (`req-002/_fixture.ts` 789–818).

**4. How “capacity” is read**

- Table `discovery_spend`: `(org_id, utc_day)` PK, `spent`, `granted`. Remaining is derived (`20260916120000_…sql` 1–2, 139–146).
- UTC day is `(clock_timestamp() at time zone 'utc')::date` after the org lock (106–109), not `now()`.
- Read: if no row, remaining = daily grant (10 or 30). Does not insert.
- Debit: `apply_discovery_grant_mark` inserts or raises `granted` to the high-water mark (never lowers it, 50–51). Then `spent += credits`.
- “With Discovery capacity” in the brief is `remaining > 0` on this ledger (free credits). Funded fuel is a later surface (`checkout.project-fuel` is already a declared red in REQ-002).

**5. How a new table joins tenant posture**

Static scan `scanTenantMigrations` (`_policy-scan.ts` 256–569), live pin `assertTenantCatalog` (`_integration.ts` 170–201):

1. `create table public.<t>`.
2. `revoke all … from anon, authenticated, service_role` after create, or `no-baseline-revoke` (473–479). The scan records a baseline only on `revoke all`, not on a partial revoke.
3. `alter table … enable row level security` if posture is `tenant-isolated` (`isolated-no-rls`, 500–501). Unreachable tables in this tree still enable RLS (defense in depth); the scan does not require it.
4. Declare the name in `TENANT_CATALOG` in the **same** change (`undeclared-table` / `missing-table`, 462–470). Live walk is both ways: a live `pg_class` row absent from the catalog fails, and a catalog key with no live row fails (174–179).
5. Isolated: `grant select to authenticated` only (`isolated-wrong-privileges`); at least one `create policy` (`isolated-no-policy`); USING must name `auth.uid()` or `public.viewer_…` (`policy-using-no-auth`); no tautology; no `to anon`; no `for all`; no non-viewer function in USING.
6. Unreachable: leftover `authenticated` grants → `unreachable-client-grant`. Live: `authenticated: []`. `service_role` remaining set is `[]` unless the table is in `SERVICE_ROLE_SELECT` (`accounts`, `org_memberships` only).
7. New `viewer_` helper: SECURITY DEFINER, `SET search_path = ''`, no argument that names another person, revoke EXECUTE from `public`, grant EXECUTE to `authenticated`. Live `VIEWER_FUNCTIONS` must be updated (`_integration.ts` 167, 197–199).
8. No `FORCE ROW LEVEL SECURITY`. No `grant … to anon` / `to public`. No `alter default privileges`.
9. Notify PostgREST: `notify pgrst, 'reload schema'`.

**6. How a new write route registers**

`scanWriteRoutes` (`_write-route-scan.ts` 147–277) plus `writeRoute` itself:

- Row in `WRITE_ROUTES` with `surface: { kind: 'edge', rpc: '<sql_name>' }` and `standing.admits`.
- Folder `supabase/functions/<name>/index.ts` constructed as **one** `Deno.serve(writeRoute({ name: '<name>', … }))` (`write-route-not-constructed`, 214–219).
- `[functions.<name>]` with `verify_jwt = true` (`write-route-jwt-unverified`, 240–250).
- The index must not name `callDatabaseFunction`, `/rest/v1/`, `createClient`, `.rpc(`, or the service-role key (`write-route-bypasses-boundary`).
- A folder that reaches the database and is **not** an edge row → `write-route-unregistered`. Read routes (`project-workspace`, `organization-dashboard`, `public-project`) stay off the inventory because their `index.ts` does not match `REACHES_DATABASE`; they go through `callerReads` / `publicProjectReads` inside `edge.ts`, which is the only shared module allowed to reach the database.
- SQL: SECURITY DEFINER, `SET search_path = ''`, `assert_account_active`, revoke EXECUTE from `public` (and typically from `anon, authenticated, service_role` then grant `service_role` only). Missing `assert_account_active` on a service_role definer → `definer-no-write-gate` (`_policy-scan.ts` 646–650).
- New refusal kinds go on `WRITE_REFUSAL_KINDS` (`write-routes.ts` 74–96) so `DETAIL` round-trips.
- Loop fixture must drive the same `writePipeline` spec (REQ-002 pattern at `_fixture.ts` 719–787).

**7. Audit enum values**

PostgreSQL refuses using a new enum value in the same transaction that adds it. Precedent is two files:

- `20260912110000_audit_event_kind_escalation_contact.sql` line 4: `alter type … add value 'org_escalation_contact_recorded';`
- Next migration recreates the definer that writes it.

Same pair for `'org_vetting_changed'` (`20260914110000_…sql` / `20260914120000_…sql`). A raw-intake kind needs that split. `scanWriteGateSql` refuses any definer that `update`s or `delete`s `audit_events` (`audit-mutation-in-definer`, 652–656).

**8. Storage**

No bucket is configured. `[storage.buckets.images]` is commented (`config.toml` 130–135). No migration creates a bucket or `storage.objects` policy. Grep for `create bucket` / `storage.objects` in product SQL is empty.

REQ-002’s AT-002.16 oracle (`_source-documents.ts` 53–106) **fails the REQ-002 suite** if any product `.ts`/`.tsx` contains `storage.from(`, `createBucket(`, or `createSignedUrl(`, or if a migration adds columns named `storage_key`, `storage_path`, `object_key`, `file_bytes`, `attachment`, etc., or `bytea`. A need-upload that talks to Supabase Storage under those names would turn REQ-002 red. REQ-032 owns the file-policy contract; this run is supposed to consume disclosure copy as a fixture.

---

### Files Read

- `loop/items/AI4DEV-120/brief.md`
- `.taskmaster/docs/acceptance/at-req-003.md`
- `loop/decomp/req-003.md`, `loop/decomp/req-005.5.md` (D1/D2 only)
- Migrations: `20260808120000`, `20260811125000`, `20260811130000`, `20260906120000`, `20260907120000`, `20260908120000`, `20260909120000`, `20260910120000`, `20260912110000`, `20260912120000` (header), `20260913120000` (posture), `20260914110000`, `20260914120000`, `20260915120000`, `20260916120000`
- `supabase/config.toml` (storage 125–135; functions 486–525)
- `supabase/functions/_shared/{write-routes,edge,caller,tenant-reads,public-project,verification,discovery-allowance,org-vetting,memberships,accounts,acknowledgment-copy}.ts`
- Edge entries: `project-workspace`, `public-project`, `organization-dashboard`, `set-organization-profile`, `discovery-allowance`, `create-organization`, `update-organization`, `complete-signup`, `set-organization-vetting`
- `tests/at/suites/req-001/{_policy-scan,_write-route-scan,_integration,_live,_live-tenant-reads,_contract}.ts` (catalog, scan, operator project insert)
- `tests/at/suites/req-002/{_bind,_pending,_contract,_fixture,_live,_source-documents,_source-scan,a-org-profile,b-allowance,e-gates}.test.ts`
- `tests/at/expected/req-002.json`, `tests/at/harness/{check,expected}.ts`

---

### Boundaries

**Inputs a need writer would take**

- Authenticated NGO session (JWT).
- `organizationId` on the body (every org-scoped write uses this one field).
- Title / description / urgency as request fields (none exist on `projects` today).
- Optional file: no upload path exists; REQ-032 owns format/size; REQ-002 forbids storage APIs and document-content column names in this tree.

**Outputs already available**

- Tenant-filtered project reads: `id`, `name`, `org_id`, `assigned_volunteer_id` only.
- Public page: id, project name, org name. Every row is “public”.
- Discovery remaining credits via `discovery-allowance` action `read`.
- Audit rows via `append_audit_event` (platform-retrievable because the table is unreachable to clients; tests read as operator).

**Surfaces owned elsewhere (declare red, do not build)**

| Id | Waits on |
|---|---|
| AT-003.10 | REQ-004 classification event (stub); REQ-032 disclosure copy |
| AT-003.07 / .09 | Full upload surface is REQ-032; this run may prove copy/flag only (brief unit 4) |
| AT-003.11 / .12 | REQ-005.5 transition engine `draft → discovery_in_progress`; email/capacity **rejection + remedies** are AT-REQ-005.5 (AT-003.13 retired) |
| AT-003.17 | Negative claim about REQ-004 cause-taxonomy timing |
| AT-003.05 screen | Autosave is a data contract here; the typing screen is the wiring leaf (D3.LW), not this run |
| Cross-NGO isolation | AT-REQ-001.21 (AT-003.15 retired) |

REQ-002 red shape to copy: `_pending.ts` `awaiting(AWAITED.…)` throws `CapabilityPending`; `tests/at/expected/req-002.json` lists the id under `red` with `{ "kind": "capability-pending", "capabilities": ["…"] }`. A red that turns green fails `--expect` until the manifest moves it.

**Acceptance suite this run must add**

- `tests/at/suites/req-003/` in the REQ-002 shape: `_bind.ts`, `_contract.ts`, `_fixture.ts`, `_live.ts`, `_pending.ts`, `_source-*.ts`, lettered `*.test.ts`.
- `tests/at/expected/req-003.json` with per-tier `green` / `red`.
- Thirteen P0 call sites through `atTest` matching `.taskmaster/docs/acceptance/at-req-003.md`: 01, 02, 03, 04, 05, 07, 09, 10, 11, 12, 14, 16, 17. Retired 06, 08, 13, 15 must **not** appear (`at:check` bijection, `check.ts` 48–59, 71–82).

---

### Non-Obvious Things

1. **`projects` is a seat table, not a need.** Its comment (`20260811130000_…sql` 65–66) is load-bearing: landing the table did not land creation. Operator tests insert `(org_id, name)` as postgres (`_live.ts` 656–667). `name` is required and non-empty. There is no `status` / lifecycle enum anywhere on it. `draft → discovery_in_progress` is REQ-005.5 D1.L1, not in this tree.

2. **`create-organization/index.ts` 12–13 is stale.** It still says no project or need table exists. The table exists; the **writer** does not.

3. **Email verification is not a write-pipeline gate.** `Caller` has no `emailVerified`. `writeGateDecision` never reads `email_confirmed_at`. Only `discovery_allowance` debit does, in SQL, and the fixture mirrors it after `writePipeline`. `verification.ts` is explicitly the Discovery-**message** hook with no deployed caller. Isolating AT-003.03 (missing description vs verification/capacity) means the description check must fail **before** those other gates, on a caller who would otherwise pass them.

4. **Admin role ≠ NGO account type.** `WRITE_ROUTES` `admits: ['ngo']` only proves the global type. The per-org admin check is `orgAdminActionAllowed` in `decide` plus the SQL backstop. A volunteer hitting an ngo-admitted route is `not-an-ngo-account` (403) and never reaches the role check. AT-003.04’s “member without admin” Given is **not** a second seat in the same org (unique index `org_memberships_one_seat_per_org_idx` refuses that as `23505`). Tests mint `member` by operator-inserting the **sole** seat of another org (`_contract.ts` 775–778).

5. **`has_platform_acknowledgment` is still unused.** AT-001.01 says the acknowledgment is required before project creation. The predicate exists and is granted to `service_role` (`20260808120000_…sql` 93–109, 376). No writer calls it. A need-creation definer is the first place that hook is supposed to fire.

6. **Read routes and write routes are different constructors.** A new **write** must be `Deno.serve(writeRoute(…))` and an inventory row. Extending `project-workspace` / `callerReads` is the way to **read** new columns without a second write shape. Putting a database reach in a new `index.ts` without registering it fails `write-route-unregistered`.

7. **New audit kinds are two migrations, not one.** Same-transaction `ADD VALUE` + write fails in PostgreSQL. The comment is in `20260912110000_…sql` 1–3.

8. **`append_audit_event` is not callable as `service_role`.** Edge code must not RPC it. The product definer (owner) calls it internally. `actor_label` is `account_type:id` or `operator` (`20260914120000_…sql` 31–40).

9. **High-water grant.** Vetting the same UTC day raises `granted` via `greatest`; unvetting does not lower it (`apply_discovery_grant_mark` 50–51; vetting definer 406–413). Capacity for AT-003.12 is this remaining count, not a new meter.

10. **REQ-002 will fail this run if you add Storage the obvious way.** `_source-documents.ts` 53 and 104–106 treat `storage.from(` as a document-content sink. Column names `storage_key` / `file_bytes` / `attachment` fail the same oracle. Brief unit 4 says prove disclosure as copy or flag; do not land REQ-032’s file policy here.

11. **`public-project` would leak a draft.** `projectIsPublic` is unconditionally true (`public-project.ts` 19–25). A draft row on `projects` is world-readable by id until REQ-010/011 lands a rule in that one function.

12. **`member` in the same NGO cannot exist as a second person.** AT-003.04 can use: a `member`-role sole seat (operator), a volunteer (`not-an-ngo-account`), or a visitor (`no-account` / 401). Cross-org isolation is already AT-001.16 / AT-001.21.

13. **Cause labels have nowhere to live.** No column, no API field. AT-003.17 is a negative read through whatever surface you add; stub the producer.

14. **Notifications.** Brief fact 4: no id in this run emits. `emit_notification` is the sole writer. Do not add a taxonomy row.

---

### Open Questions

- **Need row vs `projects` row.** The brief (unit 1) tells the design to decide. The table exists, is tenant-isolated, and already appears on both project reads — but it has no intake columns, no status, and its comment forbids treating the table as “creation landed.” A sibling table would need a full posture join and a decision about how `project-workspace` finds it. I did not find a committed design in this worktree.

- **Where `draft` / `discovery_in_progress` will live.** REQ-005.5 D1.L1 owns the nine-state engine and is not materialised. No enum, no transition function. Unit 6 must decide how to prove the transition until that engine exists.

- **`architecture-notes#req-003`.** The decomp cites it. I found no file matching that name in this tree.

- **How a storage attachment would be allowed without breaking AT-002.16.** REQ-032 is supposed to own buckets/policies. I could not find an exemption in `_source-documents.ts`. A metadata-only pointer with a name **not** in `DOCUMENT_CONTENT_COLUMNS` might pass that oracle; I did not prove a safe name.

- **Whether `write_standing` should grow a project id.** Today it takes `(account, org, subject account)`. A project-scoped write would still key off `organizationId` unless the design adds a fourth standing field.

- **Whether the description-missing gate belongs in TypeScript `decide`, SQL, or both.** Precedent is both (profile name, allowance debit). AT-003.03 needs the block to be this gate alone, with verification and capacity already satisfied.

- **I did not execute** `bun run at:check` or a live catalog query; catalog membership and scan codes are from the source as it stands.
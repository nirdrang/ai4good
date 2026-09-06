The database today is fail-closed: six tables, RLS on, **zero policies**, and almost no Data API grants. Tenant reads (AT-001.21–.24, .40) are not implemented.

### Components Found

**Enums**

- `public.account_type` (`'ngo' | 'volunteer' | 'platform_admin'`) — `supabase/migrations/20260808120000_accounts_org_membership_and_acknowledgments.sql` lines 27. Global type; one per auth user because it lives on `accounts.id`.
- `public.org_role` (`'admin' | 'member'`) — same file, line 31. Per-organisation role, never stored on the account.

**Tables (all in `public`, all with RLS enabled, none with `FORCE ROW LEVEL SECURITY`, none with `CREATE POLICY`)**

| Table | Columns | RLS | Policies | Data API grants in migrations |
|---|---|---|---|---|
| `accounts` | `id` PK → `auth.users(id)` ON DELETE CASCADE; `account_type` NOT NULL; `created_at` | ON | **none** | `GRANT SELECT, INSERT` → `authenticated`; `GRANT SELECT` → `service_role` |
| `organizations` | `id` UUID PK; `name` NOT NULL `length(btrim(name)) > 0`; `created_at` | ON | **none** | no explicit GRANT; no `REVOKE ALL` |
| `org_memberships` | composite PK `(org_id, account_id)`; `role`; `created_at`; unique index on `org_id` alone | ON | **none** | `GRANT SELECT` → `service_role` only |
| `acknowledgments` | `id`; `account_id`; `kind` non-blank; `acknowledged_at`; `ip inet`; `text_version` non-blank; later `signer_name`, `signer_title`, `authority_attestation` (POSIX `!~ '^\s*$'`) | ON | **none** | no explicit GRANT; no `REVOKE ALL` |
| `volunteer_profiles` | PK `account_id` → `accounts`; `github_handle`; `top_languages text[]`; `repository_count >= 0`; `contribution_summary`; `imported_at` | ON | **none** | `REVOKE ALL` from `anon`, `authenticated`, `service_role` |
| `projects` | `id`; `org_id` → `organizations` ON DELETE CASCADE; `name`; `assigned_volunteer_id` → `accounts` ON DELETE SET NULL; `created_at` | ON | **none** | `REVOKE ALL` from `anon`, `authenticated`, `service_role` |

No other `CREATE TABLE` exists under `supabase/migrations/`. No views, storage buckets, or generated `database.types.ts`.

**Security-definer / trigger functions (current catalog after drops/recreates)**

- `has_platform_acknowledgment(uuid)` — SECURITY DEFINER, STABLE. Exists-check on `acknowledgments` where `kind = 'platform_tos_and_promise'`. Does **not** check the JWT. EXECUTE revoked from PUBLIC; granted to `service_role` only. Restricted because a signed-in caller asking about any id would be an existence oracle (first migration lines 367–369).
- `complete_signup(uuid, text, text, text, inet, text, text[], integer, text, text, text, text)` — SECURITY DEFINER. Current signature after `20260811120000`. Refuses `platform_admin` (42501); only `'ngo'|'volunteer'`; NGO requires org name; volunteer forbids org name; volunteer requires GitHub handle matching `auth.identities.identity_data->>'user_name'` plus populated import; NGO forbids GitHub params; inserts account, then org+admin membership (NGO) or `volunteer_profiles` (volunteer), then acknowledgment last. Does **not** bind `p_account_id` to `auth.uid()` — the edge function does. EXECUTE: `service_role` only.
- `create_organization(uuid, text)` — SECURITY DEFINER. Loads `accounts.account_type` for `p_account_id`; refuses missing account (23503) and non-NGO (42501); inserts org + admin membership. No JWT check. EXECUTE: `service_role` only.
- `update_organization(uuid, uuid, text)` — SECURITY DEFINER. Whitespace-trim of name (explicit set including tab); **existence of org first** (23503 `no such organisation`); then membership in **that** org only; then role must be `admin`. EXECUTE: `service_role` only.
- `org_membership_grantee_must_be_ngo()` — SECURITY DEFINER trigger, BEFORE INSERT OR UPDATE on `org_memberships`. Refuses no-account (23503) and non-`ngo` including `platform_admin` (42501). EXECUTE revoked from PUBLIC; no grant.
- `text_array_entries_all_populated(text[])` — IMMUTABLE helper for the `volunteer_profiles` CHECK. EXECUTE revoked from PUBLIC; no grant (owner evaluates the CHECK).
- `project_seat_holds_one_developer()` — **invoker** trigger, BEFORE UPDATE on `projects`. Refuses replacing a non-null `assigned_volunteer_id` with a different non-null id. Null (release) and same-id rewrite allowed. EXECUTE revoked from PUBLIC.

**Indexes / constraints that encode tenancy shape**

- `org_memberships` PK `(org_id, account_id)` — one role per (org, account).
- `org_memberships_one_seat_per_org_idx` UNIQUE on `org_id` — v1 single-seat NGO (AT-001.17).
- `projects.assigned_volunteer_id` is one nullable column — single-developer seat is unrepresentable as a second volunteer (AT-001.32).
- `acknowledgments_account_id_kind_idx` is a **non-unique** index — multiple rows of the same kind per account are allowed.
- Organisation `name` is **not** unique.

**Acceptance named-data vs tables today**

AT-001.21/40 list NGO non-public data as **drafts, ledger, files, thread, dashboard**. AT-001.22/23 list project non-public / working data as **reference files, thread, tasks**.

| Named kind | Exists as a table today? |
|---|---|
| drafts | **No** (REQ-003; AT-003.15 retired into AT-001.21) |
| ledger / fuel transactions | **No** (REQ-006) |
| files / reference files | **No** (REQ-032; no storage buckets in `config.toml`) |
| thread | **No** (REQ-015) |
| dashboard | **No** — UI aggregation (REQ-013), not a table |
| tasks | **No** — Linear, not Postgres (REQ-026) |
| listings / public project pages | **No** public-projection tables; `projects` has no lifecycle/visibility columns |

Closest existing stand-ins: `organizations` + `org_memberships` + `acknowledgments` (NGO-scoped), `projects` (org + one assignee), `volunteer_profiles` (volunteer-scoped, not named in those ATs), `accounts` (identity).

---

### Flow

Database access is not triggered by a user read of tenant data. There is no tenant-read path. What exists:

1. **Auth session** — GoTrue issues a JWT (`jwt_expiry = 120` in `supabase/config.toml` line 180; `enable_anonymous_sign_ins = false`; `enable_confirmations = true`; Google + GitHub OAuth on; `enable_manual_linking = true`). No `custom_access_token` hook, so the JWT has **no `account_type` claim**. Schema never calls `auth.uid()`.

2. **Signup write** — `complete-signup` edge function (`verify_jwt = true`) resolves the caller, then `callDatabaseFunction(..., SERVICE_ROLE_KEY, 'complete_signup', { p_account_id: caller.id, ... })` (`supabase/functions/_shared/edge.ts` 272–286). Function runs as owner; service role has no INSERT.

3. **NGO create-org** — `create-organization` **SELECT**s `public.accounts` with the service role (the one table SELECT grant), then RPC `create_organization`.

4. **NGO rename** — `update-organization` **SELECT**s `public.org_memberships` with the service role (the second SELECT grant), applies `orgAdminActionAllowed` in TypeScript, then RPC `update_organization`. Product path maps missing org and non-member to the same 403 `not-a-member` (client-reachable no-oracle). The RPC itself still raises 23503 vs 42501; only `service_role` can call it (accepted residual, `loop/items/AI4DEV-62/gate2-rulings.md` R1).

5. **Client Data API** — `authenticated` may SELECT/INSERT `accounts`. RLS has no policy, so INSERT fails with `new row violates row-level security policy` (measured in `loop/items/AI4DEV-57/proof-local.ts` (e)). SELECT returns **zero rows**, including the caller's own. Other tables: no DML grants (or `REVOKE ALL` on `volunteer_profiles` and `projects`), so privilege-layer denial. `anon` has no DML grants.

6. **Service-role Data API** — BYPASSRLS. SELECT `accounts` and `org_memberships` sees **all rows**. INSERT into `accounts` is `permission denied for table accounts` (proof-local (k)) — privilege layer, because BYPASSRLS would otherwise write. No INSERT/UPDATE/DELETE anywhere in this schema for `service_role`.

7. **Operator SQL** — integration adapter uses `AT_SUPABASE_DB_URL` as role `postgres`: `current_user=postgres`, `superuser=false`, `bypassrls=true` (`loop/items/AI4DEV-62/artifacts/verify-first-answers.md` (a)). Triggers still fire. This is how `platform_admin` is provisioned (`INSERT INTO public.accounts ... 'platform_admin'`), how unseated orgs and `member` rows are minted, and how projects are created/assigned. No product project-creation path exists; `has_platform_acknowledgment` is an unused hook.

8. **Volunteer ↔ org ↔ project**
   - NGO account → `complete_signup` / `create_organization` → one `organizations` row + one `org_memberships` row with `role='admin'`.
   - Unique index on `org_id` forbids a second member. Trigger forbids volunteer/`platform_admin` membership on **every** SQL path including operator.
   - Volunteer is **not** an org member. Tie to a project is `projects.assigned_volunteer_id` only. No check that the assignee is type `volunteer`.
   - `platform_admin` cannot sit in `org_memberships`. Cross-account reach is AT-001.40 and is not built.

---

### Files Read

- `supabase/migrations/README.md`
- `supabase/migrations/20260808120000_accounts_org_membership_and_acknowledgments.sql`
- `supabase/migrations/20260809090000_volunteer_github_link_and_imported_profile.sql`
- `supabase/migrations/20260811120000_acknowledgment_signer_identity.sql`
- `supabase/migrations/20260811125000_org_membership_ngo_only_and_organization_rename.sql`
- `supabase/migrations/20260811130000_single_seat_org_and_single_developer_projects.sql`
- `supabase/config.toml` (auth, api, functions, seed)
- `loop/decomp/req-001.md` (D5)
- `.taskmaster/docs/acceptance/at-req-001.md` (section E)
- `.taskmaster/docs/requirements/req-001.md`
- `.taskmaster/docs/prd-mvp.md` (REQ-001 visibility + NFR Security tenant-isolation sentence)
- `.taskmaster/docs/acceptance/at-req-003.md`, `at-req-006.md`, `at-req-015.md`, `at-req-032.md` (named kinds)
- `tests/at/suites/req-001/d-tenant-isolation.test.ts`
- `tests/at/expected/req-001.json`
- `tests/at/suites/req-001/_contract.ts` (operator vs product; isolation scope of AT-001.16)
- `tests/at/suites/req-001/_live.ts` (operator SQL)
- `tests/at/harness/live-stack.ts`
- `supabase/functions/complete-signup/index.ts`, `create-organization/index.ts`, `update-organization/index.ts`
- `supabase/functions/_shared/memberships.ts`, `edge.ts` (`callDatabaseFunction`)
- `loop/items/AI4DEV-57/proof-local.ts` (RLS vs privilege layers)
- `loop/items/AI4DEV-62/artifacts/verify-first-answers.md`, `gate2-rulings.md`

`supabase/seed.sql` is referenced in `config.toml` and does not exist (reset warns; migrations are the schema).

---

### Boundaries

**In**

- JWT from GoTrue (edge `verify_jwt = true`).
- Service-role key for RPC and the two SELECT reads (`accounts`, `org_memberships`).
- Operator `postgres` connection for Givens no product path can construct (`platform_admin`, unseated org, `member` row, project + assignee).

**Out**

- Definer functions return jsonb (`account_id` / `organization_id` / `name`).
- Client Data API: RLS denial on `accounts` INSERT; empty SELECT; privilege denial elsewhere.
- No tenant-read API, no public listings table, no signed-URL file path.

**Adjacent (not this schema)**

- Edge caller resolution (`resolveCaller`) — other explorer.
- Front-end routes — other explorer.
- AT harness bodies for D5 — still `notLanded(LEAF.D5_L1/L2)`; both tiers `pending / sut-missing`.

---

### Non-Obvious Things

1. **RLS on + zero policies is the current access control**, not a missing enable. First migration says the tenant-isolation **policy set** is D5 (AT-001.21–.24, .40). Granting SELECT and adding policies is the intended next migration shape, not “turn RLS on”.

2. **Two different denial layers are load-bearing and must not be collapsed.** `authenticated` INSERT on `accounts` is denied by **RLS** (“new row violates row-level security policy”). `service_role` INSERT is denied by **privilege** (“permission denied for table accounts”) because `service_role` **BYPASSRLS**. Granting `service_role` INSERT would make `complete_signup`'s `platform_admin` refusal skippable.

3. **`service_role` never reads through policies.** Any SELECT grant it holds sees every row. Today that is `accounts` and `org_memberships`. A new SELECT policy on those tables does **not** constrain edge-function reads unless those reads switch to the user JWT (or move into a definer that checks the caller).

4. **`REVOKE ALL` was learned the hard way.** `auto_expose_new_tables` is unset (no DML auto-grant), but ALTER DEFAULT PRIVILEGES still gave `REFERENCES`/`TRIGGER`/`TRUNCATE` to `anon`/`authenticated`/`service_role`. TRUNCATE is not covered by RLS. Only `volunteer_profiles` and `projects` revoke those. `accounts`, `organizations`, `org_memberships`, `acknowledgments` never got `REVOKE ALL`.

5. **The `accounts` SELECT/INSERT grant to `authenticated` exists so RLS is the layer that runs**, for the proof in AI4DEV-57 — not so clients can read their own row. They cannot.

6. **No `auth.uid()` in the schema.** Policies cannot use JWT custom claims (`account_type` is not in the token). They must join `public.accounts` / `org_memberships` / `projects.assigned_volunteer_id`.

7. **Operator `postgres` has `bypassrls=true` and is not superuser.** Triggers fire; RLS does not. `FORCE ROW LEVEL SECURITY` is never set. Provisioning `platform_admin` is a narrower authority than the service role, by design.

8. **`member` has no product writer.** Enum exists for AT-001.36; operator insert is the only way to seat `member`. Unique index then forbids a second seat, so the Given is an unseated org created by operator, then one `member` grant.

9. **Assigned volunteer is not type-checked.** AT-001.32 is “second volunteer”, not “first must be volunteer”. Matching requirement owns type.

10. **`update_organization` RPC is an existence oracle; the edge path is not.** 23503 vs 42501 on the definer; 403 `not-a-member` for both missing org and non-member on the product path. Design treats service-role as trusted infrastructure.

11. **`has_platform_acknowledgment` is itself treated as an existence oracle** if callable by `authenticated` — hence EXECUTE only for `service_role`. It is not a project-creation gate yet; nothing creates projects in product code.

12. **AT-001.16 is operation-surface isolation (rename), not read isolation.** `_contract.ts` 574–579 says drafts/ledgers/files stay with D5. A green on .16 does not prove AT-001.21.

13. **PostgreSQL default EXECUTE ON FUNCTION TO PUBLIC** — every new function is revoked from PUBLIC in the same migration. Dropping `complete_signup` to change signature **drops the grant**; later migrations re-revoke and re-grant.

14. **NFR sentence is wider than the tables:** “Tenant isolation covers NGO records, projects, fuel transactions, task comments, and project files” (`prd-mvp.md` ~650). Fuel, comments, files are other requirements’ tables.

15. **Public project page vs non-public data** (AT-001.22/24) has no schema hook: `projects` has no public-vs-private column, no status, no listing flag. AT-001.24 is largely a UI/routing concern; the DB cannot currently distinguish public projection from working data.

---

### What a new per-tenant read policy migration would have to add

The existing migrations already:

- Enable RLS on all six tables and add **no** SELECT policies (deny-by-default for client keys).
- Forbid `service_role` DML on tables (writes only via SECURITY DEFINER).
- Forbid client EXECUTE on every function (revoke PUBLIC).
- Assume operator/`postgres` and `service_role` **bypass RLS**.
- Assume no product project creation and no drafts/ledger/files/thread/tasks tables.

A D5 migration that matches the comments’ “policy set” would need, at minimum:

1. **`CREATE POLICY ... FOR SELECT`** on each table that is tenant data today (`organizations`, `org_memberships`, `acknowledgments`, `projects`, likely `volunteer_profiles` and maybe own `accounts`). Typical predicates:
   - caller `auth.uid()` is a member of `org_id` (NGO own data);
   - caller is `projects.assigned_volunteer_id` (assigned volunteer, **that project only**);
   - caller’s `accounts.account_type = 'platform_admin'` (AT-001.40 spans all).
   Helper SECURITY DEFINER `STABLE` functions (`is_platform_admin()`, `is_org_member(org_id)`, `is_assigned_volunteer(project_id)`) are the usual way to avoid RLS recursion when policies join the same tables. Those helpers must `SET search_path = ''`, revoke EXECUTE from PUBLIC, and grant EXECUTE only to roles that run the policies (`authenticated`, possibly `anon` if public rows are selected through RLS).

2. **`GRANT SELECT`** on those tables to `authenticated` (otherwise PostgREST fails at privilege and RLS never runs — the inverse of the `accounts` INSERT grant story). `anon` only if a public projection is served from these tables; today nothing public lives here. Do **not** GRANT INSERT/UPDATE/DELETE to `authenticated` or `service_role` unless the write-path doctrine is being changed.

3. **No-existence-oracle shape:** SELECT under RLS already returns empty for both “not yours” and “not found”. Do not add RAISE-on-missing in a client-callable function. Do not distinguish 406/`PGRST116` vs empty if the client uses `.single()`. Do not grant `authenticated` EXECUTE on `has_platform_acknowledgment` or `update_organization`. If new read RPCs exist, one constant for not-found and not-yours.

4. **Unassigned volunteer** (AT-001.22): policy on project-scoped rows must require `assigned_volunteer_id = auth.uid()`, not merely `account_type = 'volunteer'`.

5. **Do not grant `service_role` extra SELECT** unless edge reads are meant to keep bypassing policies. If edge functions remain on the service role, **policies will not enforce AT-001.21 for those functions**; authorization must be duplicated in the definer/edge layer, or those reads must use the user JWT.

6. **Do not `FORCE ROW LEVEL SECURITY`** without an explicit decision: it would break operator provisioning (`platform_admin` insert, unseated org, project seed) unless policies also allow the owner or those paths move.

7. **`REVOKE ALL` then grant the intended DML** on any new table (the `projects`/`volunteer_profiles` lesson), and `NOTIFY pgrst, 'reload schema'`.

8. **Cannot turn AT-001.21/22/23/40 green on drafts/ledger/files/thread/tasks** until those tables (or a documented stand-in) exist. Today the only honest tenant rows are organisations, memberships, acknowledgments, volunteer profiles, and the project identity/assignee. Dashboard is not a table. Tasks are not in this database.

9. **Keep `complete_signup` as the only writer of `accounts`** — no INSERT policy for `authenticated`, no INSERT grant for `service_role`.

---

### Open Questions

- I did not re-query a live catalog. Privilege claims for `organizations`/`acknowledgments` leftover `REFERENCES`/`TRIGGER`/`TRUNCATE` are inferred from the later migrations’ measurement of default privileges, not from a fresh `role_table_grants` dump of those two tables.
- I did not read the reference-branch migration under `.claude/worktrees/ref-66` (assigned to another explorer). Whether that attempt used RLS policies vs definer read functions is unconfirmed here.
- Exact `AT_SUPABASE_DB_URL` user beyond the measured `postgres` / `bypassrls=true` / `superuser=false` on slot 2 is not re-verified in this checkout.
- Whether PostgREST still exposes `rpc/complete_signup` under the 12-parameter signature to `service_role` only is as written in the last migration; I did not hit a running stack.
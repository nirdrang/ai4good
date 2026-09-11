### Components Found

| Name | Path | What it does |
|---|---|---|
| `public.account_type` | `supabase/migrations/20260808120000_accounts_org_membership_and_acknowledgments.sql:27` | Closed enum: `'ngo' \| 'volunteer' \| 'platform_admin'`. |
| `public.org_role` | same file, line 31 | Closed per-org enum: `'admin' \| 'member'`. Not a property of the account. |
| `public.account_lifecycle` | `supabase/migrations/20260908120000_account_lifecycle_audit_and_contact_transfer.sql:4` | `'active' \| 'deactivated'`. Default `'active'`. |
| `public.audit_event_kind` | same file, lines 11–12; later `20260912110000_audit_event_kind_escalation_contact.sql` | `'org_contact_transferred'`, `'account_lifecycle_changed'`, `'org_role_changed'`, then `'org_escalation_contact_recorded'`. |
| `public.accounts` | first migration + lifecycle column | One row per auth user. PK **is** `auth.users.id`. Holds global type and lifecycle. |
| `public.organizations` | first migration, never altered with extra columns | `id`, `name`, `created_at` only. Name is the whole product profile today. |
| `public.org_memberships` | first migration + unique seat index | One seat per org. Composite PK `(org_id, account_id)` plus unique on `org_id` alone. |
| `public.acknowledgments` | first migration + signer columns | Platform ToS record. Signup is the only writer. |
| `public.audit_events` | `20260908120000_…sql:14–26` | Append-only audit log. Written only through `public.append_audit_event`. |
| `public.append_audit_event` | original `20260908120000_…sql:129–155`; replaced `20260912120000_audit_actor_on_product_paths.sql:5–45` | The sole INSERT into `audit_events`. Not granted to `service_role`. |
| `public.assert_account_active` | `20260908120000_…sql:69–91` | Lifecycle gate. `SELECT … FOR SHARE`. Raises `detail = 'account-deactivated'`. |
| `public.write_standing` | `20260908120000_…sql:94–127` | One RPC: caller type+lifecycle, org existence, role-in-target, seat holder, subject. |
| `WRITE_ROUTES` | `supabase/functions/_shared/write-routes.ts:23–58` | Inventory every write must join. Six edge routes + one Discovery stand-in. |
| `writeRoute` | `supabase/functions/_shared/edge.ts:336–380` | Deployed write constructor. Auth, standing, gate, decide, one RPC. |
| `writeGateDecision` | `write-routes.ts:248–265` | Order: unreadable → deactivated → absent-by-design → no-account → type. |
| `scanTenantMigrations` / `TENANT_CATALOG` | `tests/at/suites/req-001/_policy-scan.ts` | Static overlay of every `supabase/migrations/*.sql`. CI oracle. |
| `scanWriteRoutes` / `writeRouteProblems` | `tests/at/suites/req-001/_write-route-scan.ts` | Static bijection: edge folder ↔ `WRITE_ROUTES` ↔ `config.toml` ↔ `writeRoute(`. |
| `ACCOUNT_TYPES` / `parseAccountType` / `ngoOnlyActionAllowed` | `supabase/functions/_shared/accounts.ts` | Global-type decisions. Public signup offers only `ngo` and `volunteer`. |
| `orgAdminActionAllowed` | `supabase/functions/_shared/memberships.ts` | Per-org admin decision. Two refusal kinds: `not-a-member` vs `not-an-admin`. |
| `decideContactTransfer` / `decideEscalationContact` / `decideLifecycleChange` | `supabase/functions/_shared/admin-operations.ts` | Platform-admin write decisions. Template for a founder vetting action. |
| `emailVerifiedFromUser` / `discoveryMessageAllowed` | `supabase/functions/_shared/verification.ts` | Email-verification floor for Discovery. No vetted flag. |
| `callerFromAuthAnswer` | `supabase/functions/_shared/caller.ts` | Pure judgement of `/auth/v1/user`. Fail-closed to `null`. |
| `organizationDashboard` / `projectWorkspace` / `TENANT_NOT_FOUND` | `supabase/functions/_shared/tenant-reads.ts` | Pure projection over already-filtered rows. Holds **no** tenant rule. |
| `callerReads` | `edge.ts:398–420` | Authenticated REST as the **caller**, not the service role. |
| `TAXONOMY` / `vetting.outcome` | `supabase/functions/_shared/notification-taxonomy.ts:56` | Wire name already registered. Recipients `['ngo']`, class `decision`. No producer. |
| `prepareWriteSet` / `EMITTER_COMPONENT` | `supabase/functions/_shared/notifications.ts` | Type-branded sole writer of the outbox. |
| `public.emit_notification` | `20260913120000_notification_taxonomy_and_outbox.sql:191–236` | SQL sole writer. Granted to nobody. Owner/definer only. |
| `discoveryDailyCreditsUnverified` / `Vetted` | `tests/at/harness/atconfig.ts:83–94` | Named constants `10` and `30`. Not stored, not enforced. |

---

### Flow

#### 1. Migrations in filename order (every table, column, constraint, index, policy)

There are **15** SQL files under `supabase/migrations/` (plus `.gitkeep` and `README.md`). Later files overlay earlier ones. What follows is what each file **creates or changes**, not the final overlay (final overlay is in the next section).

**`20260808120000_accounts_org_membership_and_acknowledgments.sql`**

- Types: `account_type ('ngo','volunteer','platform_admin')`; `org_role ('admin','member')`.
- `public.accounts`: `id uuid PK references auth.users(id) on delete cascade`, `account_type account_type not null`, `created_at timestamptz not null default now()`. No extra unique/index.
- `public.organizations`: `id uuid PK default gen_random_uuid()`, `name text not null check (length(btrim(name)) > 0)`, `created_at timestamptz not null default now()`. **No unique on name. No other columns.**
- `public.org_memberships`: `org_id uuid not null references organizations(id) on delete cascade`, `account_id uuid not null references accounts(id) on delete cascade`, `role org_role not null`, `created_at timestamptz not null default now()`, `primary key (org_id, account_id)`.
- `public.acknowledgments`: `id uuid PK default gen_random_uuid()`, `account_id uuid not null references accounts(id) on delete cascade`, `kind text not null check (length(btrim(kind)) > 0)`, `acknowledged_at timestamptz not null default now()`, `ip inet` (nullable), `text_version text not null check (length(btrim(text_version)) > 0)`. Index `acknowledgments_account_id_kind_idx (account_id, kind)`.
- Functions: `has_platform_acknowledgment(uuid)`, `complete_signup(5 args)`, `create_organization(uuid, text)`.
- RLS: enabled on all four tables. **Zero policies.**
- Grants (later revoked/replaced): `grant select, insert on accounts to authenticated`; `grant select on accounts to service_role`; execute on the three functions to `service_role` after `revoke from public`.

**`20260809090000_volunteer_github_link_and_imported_profile.sql`**

- Function `text_array_entries_all_populated(text[])` (immutable; execute revoked from public).
- `public.volunteer_profiles`: `account_id uuid PK references accounts(id) on delete cascade`, `github_handle text not null check (github_handle !~ '^\s*$')`, `top_languages text[] not null check (text_array_entries_all_populated(top_languages))`, `repository_count integer not null check (repository_count >= 0)`, `contribution_summary text not null check (contribution_summary !~ '^\s*$')`, `imported_at timestamptz not null default now()`.
- RLS enabled. No policies. `revoke all from anon, authenticated, service_role`.
- Drops 5-arg `complete_signup`; recreates 9-arg (four GitHub params `default null`). Volunteer branch writes the profile in the same transaction.

**`20260811120000_acknowledgment_signer_identity.sql`**

- `alter table acknowledgments add`: `signer_name text not null check (signer_name !~ '^\s*$')`, `signer_title` same, `authority_attestation` same. **No default. Aborts if the table already has rows.**
- Drops 9-arg `complete_signup`; recreates 12-arg with three signer params `default null` (call-signature tolerance only; `not null` columns refuse omitted values).

**`20260811125000_org_membership_ngo_only_and_organization_rename.sql`**

- Trigger function `org_membership_grantee_must_be_ngo` + trigger `org_memberships_grantee_must_be_ngo` **before insert or update**.
- Function `update_organization(uuid, uuid, text)` — rename only.
- Grant: `select on org_memberships to service_role`. Execute on `update_organization` to `service_role`.
- No new tables, no policies.

**`20260811130000_single_seat_org_and_single_developer_projects.sql`**

- Unique index `org_memberships_one_seat_per_org_idx on org_memberships (org_id)`.
- `public.projects`: `id uuid PK default gen_random_uuid()`, `org_id uuid not null references organizations(id) on delete cascade`, `name text not null check (length(btrim(name)) > 0)`, `assigned_volunteer_id uuid references accounts(id) on delete set null`, `created_at timestamptz not null default now()`.
- Index `projects_org_id_idx (org_id)`.
- Trigger `projects_single_developer_seat` before update → `project_seat_holds_one_developer` (refuses replacing an occupied seat).
- RLS enabled. `revoke all from anon, authenticated, service_role`. No policies yet.

**`20260906120000_tenant_read_posture_and_org_member_policies.sql`** — **the tenant-read rule lives here.**

- Revokes all on the six tables from `anon, authenticated` and from `service_role`.
- Then: `grant select` on `organizations`, `org_memberships`, `projects`, `acknowledgments` **to `authenticated` only**.
- Restores `grant select on accounts, org_memberships to service_role`.
- Function `viewer_is_org_member(p_org_id uuid)` security definer, `set search_path = ''`, execute to `authenticated, service_role`.
- Policies (all `for select to authenticated`):
  - `organizations_select_org_member` `using (public.viewer_is_org_member(id))`
  - `org_memberships_select_org_member` `using (public.viewer_is_org_member(org_id))`
  - `projects_select_org_member` `using (public.viewer_is_org_member(org_id))`
  - `acknowledgments_select_own_account` `using (account_id = (select auth.uid()))`
- Function `read_public_project(uuid)` → `(project_id, project_name, organization_name)`, execute to `service_role` only.
- Index `projects_assigned_volunteer_id_idx`.

**`20260907120000_tenant_read_volunteer_seat_and_admin_reach.sql`**

- Trigger `projects_seat_holds_a_volunteer` before insert or update of `assigned_volunteer_id`.
- `viewer_is_platform_admin()`, `viewer_is_volunteer()` — no argument that names another person.
- Policies:
  - `projects_select_assigned_volunteer` `using (assigned_volunteer_id = (select auth.uid()) and (select public.viewer_is_volunteer()))`
  - `organizations_select_platform_admin` `using ((select public.viewer_is_platform_admin()))`
  - `org_memberships_select_platform_admin` same
  - `projects_select_platform_admin` same
  - `acknowledgments_select_platform_admin` same

**`20260908120000_account_lifecycle_audit_and_contact_transfer.sql`**

- `alter table accounts add lifecycle account_lifecycle not null default 'active'`.
- Index `org_memberships_by_account_idx (account_id, org_id)`.
- `public.audit_events` (schema quoted below).
- `public.org_escalation_contacts`: PK `org_id` references organizations on delete cascade; `contact_name`, `contact_email` not null; `contact_phone` nullable; `recorded_by_account_id uuid not null`; `recorded_at timestamptz not null default now()`; checks populated name/email and email shape `^[^\s@]+@[^\s@]+\.[^\s@]+$`.
- `revoke all` on both new tables from `anon, authenticated, service_role`. RLS on.
- Append-only triggers on `audit_events` (row update/delete + statement truncate).
- Functions: `assert_account_active`, `write_standing`, `append_audit_event`, `change_account_lifecycle`, `transfer_organization_contact`, `set_escalation_contact`. Recreates `create_organization` and `update_organization` with `perform public.assert_account_active(p_account_id)` first.

**`20260909120000_account_lifecycle_setter.sql`**

- `set_account_lifecycle(caller, subject, lifecycle, reason)`. Platform-admin only. Calls `change_account_lifecycle`. Execute to `service_role`.

**`20260910120000_org_membership_role_change_audit.sql`**

- After insert/update/delete trigger on `org_memberships` → `append_audit_event('org_role_changed', …)`. Actor from `current_setting('app.actor_account_id', true)`; missing setting records operator.

**`20260911120000_volunteer_github_identity_is_permanent.sql`**

- Before-delete trigger on `auth.identities` with `when (pg_trigger_depth() = 0)`. Refuses unlinking a volunteer GitHub identity.

**`20260912110000_audit_event_kind_escalation_contact.sql`**

- `alter type public.audit_event_kind add value 'org_escalation_contact_recorded';`  
  **Own file on purpose:** PostgreSQL refuses using a new enum value in the same transaction that adds it.

**`20260912120000_audit_actor_on_product_paths.sql`**

- Replaces `append_audit_event`: label is `operator` or `{account_type}:{id}` looked up from `accounts`.
- Recreates `complete_signup` / `create_organization` to `set_config('app.actor_account_id', …)` before the membership insert.
- Recreates `update_organization` with `detail =` kinds.
- Recreates `set_escalation_contact` to write an audit row of the new kind.

**`20260913120000_notification_taxonomy_and_outbox.sql`**

- Types: `notification_state`, `notification_channel`, `notification_role`.
- `notification_event_types (event text PK, check shape '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$')` — 48 seeded names including `'vetting.outcome'`, `'lovable.credits_low'`, `'lovable.credits_blocked'`.
- `notification_events`, `notification_deliveries`, `notification_ops_items`, sequence `notification_fault_triggers`.
- RLS on all four. `grant select on notification_deliveries to authenticated`.
- Policy `notification_deliveries_own_inapp` `for select to authenticated using (recipient_id = (select auth.uid()) and channel = 'inapp')`.
- `emit_notification(jsonb)`, `apply_delivery_results(jsonb, text)` — execute revoked from public, **granted to nobody**.

**`20260913121000_notification_fixture_producers.sql`**

- `notification_fixture_transitions (scope_id text, event text references notification_event_types, committed boolean, PK (scope_id, event))`.
- `fixture_commit_transition_and_emit` — stand-in producer until real ones exist.

---

#### 2. Final overlay: `organizations`, `org_memberships`, `acknowledgments`

**`public.organizations`** (never gained a column after create)

```sql
id          uuid primary key default gen_random_uuid()
name        text not null check (length(btrim(name)) > 0)
created_at  timestamptz not null default now()
```

No unique on `name`. No `mission`, `country`, `website`, `logo`, vetted flag, or allowance.

Policies (both `for select to authenticated`; no insert/update/delete policy):

```sql
-- 20260906120000:88–92
create policy organizations_select_org_member
  on public.organizations for select to authenticated
  using (public.viewer_is_org_member(id));

-- 20260907120000:122–126
create policy organizations_select_platform_admin
  on public.organizations for select to authenticated
  using ((select public.viewer_is_platform_admin()));
```

Privileges after overlay: `authenticated` = `{select}`; `anon` = `{}`; `service_role` = `{}`. Writes go through owner-definer functions only.

**`public.org_memberships`**

```sql
org_id      uuid not null references public.organizations(id) on delete cascade
account_id  uuid not null references public.accounts(id) on delete cascade
role        public.org_role not null
created_at  timestamptz not null default now()
primary key (org_id, account_id)
```

Indexes: unique `org_memberships_one_seat_per_org_idx (org_id)`; `org_memberships_by_account_idx (account_id, org_id)`.

Triggers: `org_memberships_grantee_must_be_ngo` (before insert/update); `org_memberships_role_change_audit` (after insert/update/delete).

Policies:

```sql
create policy org_memberships_select_org_member
  on public.org_memberships for select to authenticated
  using (public.viewer_is_org_member(org_id));

create policy org_memberships_select_platform_admin
  on public.org_memberships for select to authenticated
  using ((select public.viewer_is_platform_admin()));
```

Privileges: `authenticated` `{select}`; `service_role` `{select}` (the one service-role table grant besides `accounts`); `anon` `{}`.

**`public.acknowledgments`**

```sql
id                     uuid PK default gen_random_uuid()
account_id             uuid not null references accounts(id) on delete cascade
kind                   text not null check (length(btrim(kind)) > 0)
acknowledged_at        timestamptz not null default now()
ip                     inet                    -- nullable
text_version           text not null check (length(btrim(text_version)) > 0)
signer_name            text not null check (signer_name !~ '^\s*$')
signer_title           text not null check (signer_title !~ '^\s*$')
authority_attestation  text not null check (authority_attestation !~ '^\s*$')
```

Index: `acknowledgments_account_id_kind_idx (account_id, kind)`.

Policies:

```sql
create policy acknowledgments_select_own_account
  on public.acknowledgments for select to authenticated
  using (account_id = (select auth.uid()));

create policy acknowledgments_select_platform_admin
  on public.acknowledgments for select to authenticated
  using ((select public.viewer_is_platform_admin()));
```

Privileges: `authenticated` `{select}`; `service_role` `{}`; `anon` `{}`.

---

#### 3. Tenant read posture: “one rule in SQL, reads as the caller”

The rule is stated in the `20260906` migration header (`supabase/migrations/20260906120000_tenant_read_posture_and_org_member_policies.sql:3–27`) and enacted in TypeScript by **not** encoding a tenant check:

```47:49:supabase/functions/_shared/tenant-reads.ts
/**
 * Pure orchestration over caller-bound reads. It holds no tenant rule: the database already filtered.
 * Zero rows for the target is TENANT_NOT_FOUND; any failed read is TENANT_READ_FAILED; rows are projected field by field.
```

**What a new table must do to join:**

1. `create table public.<t> (…)`
2. `revoke all on table public.<t> from anon, authenticated, service_role;` — **all three roles**, or the scan raises `no-baseline-revoke`.
3. `alter table public.<t> enable row level security;` — never `force`.
4. Declare it in `TENANT_CATALOG` (`_policy-scan.ts:21–35`). Undeclared `create table public.X` is `undeclared-table`. A catalog key with no table is `missing-table`.
5. Choose a posture:
   - **`tenant-isolated`**: `grant select on public.<t> to authenticated` (exactly `{select}`), plus at least one `create policy … for select to authenticated` whose `USING` names `auth.uid()` or `public.viewer_…`, is not tautological (`true` / `1=1`), is not `for all`, is not `to anon`, and does not call a non-`viewer_` function.
   - **`unreachable-by-client-roles`**: no remaining grant to `authenticated`. RLS still on. Typical for write-only / owner-only tables (`accounts`, `audit_events`, `notification_events`).
6. `service_role` may keep `SELECT` only (today: `accounts` and `org_memberships`). Any of `insert, update, delete, truncate, references, trigger, all` is `service-role-write`.
7. No `grant … to anon`, `grant … to public`, `grant … on all tables`, `alter default privileges`.
8. Viewer helpers: name `viewer_*`, `security definer`, `set search_path = ''`, no argument that names another person, `revoke execute from public`, `grant execute to authenticated`. Every other definer stays `service_role` only (or nobody).
9. If the table is readable by an org member, the policy should call `public.viewer_is_org_member(<org id column>)` rather than joining `org_memberships` in the policy (that join recurses; the helper exists to cut it).
10. A new authenticated **read** edge function uses `callerReads` + the caller’s `Authorization` header (`edge.ts:398–420`), never the service role. Zero rows and “not yours” are the **same** 404 (`TENANT_NOT_FOUND`).

`caller.ts` is not a tenant module. It only answers “who is calling?” from Auth:

```111:119:supabase/functions/_shared/caller.ts
export function callerFromAuthAnswer(status: number, user: unknown): Caller | null {
  if (!isSuccessStatus(status)) return null;
  if (typeof user !== 'object' || user === null) return null;
  const id = (user as { id?: unknown }).id;
  if (typeof id !== 'string') return null;
  return { id, githubHandle: extractGithubHandle(user) };
}
```

**What `_policy-scan.ts` actually asserts** (via `tenantCatalogProblems()` = `scanTenantMigrations` ∪ `scanWriteGateSql`):

Live CI assertion, copied in four AT-001 tenant ids and the selftest:

```62:65:tests/at/harness/policy-scan.selftest.ts
describe('tenantCatalogProblems over the real migrations', () => {
  it('reports no problems', () => {
    expect(tenantCatalogProblems()).toEqual([]);
```

Problem codes the scan can raise, with the selftest that names each:

| Code | When | Selftest quote |
|---|---|---|
| `undeclared-table` | `create table public.X` not in `TENANT_CATALOG` | `'refuses a create table public.<t> absent from the catalog'` |
| `missing-table` | catalog key with no `create table` | `'refuses a catalog key with no table'` |
| `grant-to-anon` | any `grant … to anon` | `'refuses any grant to anon'` |
| `isolated-no-rls` | tenant-isolated never enables RLS | `'refuses a tenant-isolated table without enable row level security'` |
| `isolated-wrong-privileges` | authenticated holds anything other than `{select}` | `'refuses a tenant-isolated table without grant select to authenticated'` |
| `isolated-no-policy` | tenant-isolated has no `create policy` | `'refuses a tenant-isolated table without a create policy'` |
| `policy-tautological-using` | `using (true)` or `using (1=1)` | `'refuses a tenant-isolated table with using (true)'` |
| `unreachable-client-grant` | unreachable table still grants to authenticated | `'refuses an unreachable table with an un-revoked grant to authenticated'` |
| `policy-non-viewer-function` | USING calls `public.foo` that is not `viewer_` | `'refuses a function a policy using calls that is not public.viewer_…'` |
| `viewer-not-definer` / `viewer-search-path` / `viewer-no-revoke` / `viewer-no-execute-grant` | viewer helper shape | `'refuses a viewer_ function without security definer, search_path, revoke from public, or execute to authenticated'` |
| `policy-using-no-auth` | USING names neither `auth.uid()` nor `public.viewer_` | `'refuses an unqualified viewer_is_org_member call in using'` |
| `policy-to-anon` | `to anon` | `'refuses a policy to anon'` |
| `policy-for-all` | `for all` | `'refuses a policy for all'` |
| `policy-missing-function` | USING calls a dropped `viewer_` | `'refuses drop function of a policy helper'` |
| `grant-all-tables` | `grant … on all tables` | `'refuses grant all on all tables'` |
| `force-row-level-security` | `force row level security` | `'refuses force row level security'` |
| `grant-to-public` | `grant … to public` | `'refuses grant to public'` |
| `alter-default-privileges` | `alter default privileges` | `'refuses alter default privileges'` |
| `no-baseline-revoke` | no `revoke all from anon, authenticated, service_role` after create | `'refuses a catalog table with no baseline revoke'` |
| `anon-privilege` | remaining grant to anon after overlay | (computed in `scanTenantMigrations` 481–486) |
| `service-role-write` | remaining write priv for `service_role` | `'refuses a remaining write privilege for service_role'` |
| `definer-no-revoke` | non-viewer definer without revoke from public | `'refuses a security definer function without revoke execute from public'` |
| `definer-client-execute` | non-viewer definer granted to `anon`/`authenticated`/`public` | `'refuses a non-viewer definer granted to authenticated'` |
| `definer-no-write-gate` | service_role volatile definer without `assert_account_active` | `'refuses a service-role definer that does not call public.assert_account_active'` |
| `audit-mutation-in-definer` | a function `update`s or `delete`s `audit_events` | write-route-scan.selftest `'fails a function that updates or deletes public.audit_events'` |

`TENANT_CATALOG` today (`_policy-scan.ts:21–35`):

- tenant-isolated: `organizations`, `org_memberships`, `projects`, `acknowledgments`, `notification_deliveries`
- unreachable: `accounts`, `volunteer_profiles`, `audit_events`, `org_escalation_contacts`, `notification_event_types`, `notification_events`, `notification_ops_items`, `notification_fixture_transitions`

Live half (`_integration.ts:166–201`) also pins `FORCE RLS = false`, exact privilege sets, `SERVICE_ROLE_SELECT = {accounts, org_memberships}`, and `VIEWER_FUNCTIONS = {viewer_is_org_member, viewer_is_platform_admin, viewer_is_volunteer}`.

`WRITE_GATE_EXEMPT` is only `complete_signup` (`_policy-scan.ts:41–45`).

---

#### 4. Append-only audit table

Exact schema (`20260908120000_…sql:14–26`):

```sql
create table public.audit_events (
  id                 uuid primary key default gen_random_uuid(),
  occurred_at        timestamptz not null default now(),
  event_kind         public.audit_event_kind not null,
  actor_account_id   uuid,                 -- nullable (operator)
  actor_label        text not null,
  subject_account_id uuid,                 -- nullable
  subject_org_id     uuid,                 -- nullable
  reason             text not null,
  detail             jsonb not null default '{}'::jsonb,
  constraint audit_events_reason_populated
    check (btrim(reason, E' \t\r\n\f') <> ''),
  constraint audit_events_actor_label_populated
    check (btrim(actor_label, E' \t\r\n\f') <> '')
);
```

No FKs on actor/subject (so a deleted account still has a row). No client grant. RLS on. Unreachable-by-client-roles.

**How a row is written.** Only `public.append_audit_event` inserts. Current body (`20260912120000_…sql:5–45`): if `p_actor` is null or has no account row, `actor_label = 'operator'`; else `'{account_type}:{id}'`. Execute revoked from public, **not granted to service_role**. Callers are other owner-definers and the membership trigger.

Product writers today:

| Kind | Writer |
|---|---|
| `org_role_changed` | trigger `org_memberships_role_change_audit` on every membership insert/update/delete |
| `org_contact_transferred` | `transfer_organization_contact` after the seat move |
| `account_lifecycle_changed` | `change_account_lifecycle` when the value actually changes (idempotent no-op returns false, no row) |
| `org_escalation_contact_recorded` | `set_escalation_contact` after upsert |

**What enforces append-only.**

```sql
-- 20260908120000:49–67
create function public.audit_events_are_append_only() … raise exception
  'public.audit_events is append-only: % is refused (REQ-001, AT-001.33)', tg_op
  using errcode = '42501';

create trigger audit_events_no_update_or_delete
  before update or delete on public.audit_events
  for each row execute function public.audit_events_are_append_only();

create trigger audit_events_no_truncate
  before truncate on public.audit_events
  for each statement execute function public.audit_events_are_append_only();
```

Comment in the migration: “The owner can drop these triggers; no object protects against its owner.” Static scan `scanAuditAppendOnly` requires both triggers and refuses any write grant on the table. `scanWriteGateSql` also refuses any definer that `update`s or `delete`s `audit_events`.

**Can a new audited action add a row, or does it need its own table?**

It can add a row to **this** table. That is the established pattern. Do **not** INSERT from TypeScript or grant INSERT to `service_role`.

Required steps for a new kind (vet/unvet):

1. **Own migration** `alter type public.audit_event_kind add value '…';` (same-transaction restriction; see `20260912110000`).
2. Next migration: a security-definer product function that performs the state change, then `perform public.append_audit_event(...)`.
3. Put extra evidence (legal name, public link, contact name/title/attestation, evidence type, note) in `detail jsonb`. Precedent: escalation contact stores `{previous, current}` in detail.
4. Current-state (“is this org founder-vetted?”) does **not** belong only in the audit log. Lifecycle used `accounts.lifecycle` **plus** an audit row. Escalation contact used a 1:1 current-state table **plus** an audit row. Vetting will need a current-state column/table as well as the audit row.

A separate audit table is not required and would fight `scanAuditAppendOnly` / “sole writer” unless you also duplicate the append-only machinery.

---

#### 5. Mandatory lifecycle-gate boundary

**Registration contract** (`write-routes.ts:23–58` + `WriteRouteSpec` at 197–205):

Every write is a key of `WRITE_ROUTES`:

```23:58:supabase/functions/_shared/write-routes.ts
export const WRITE_ROUTES = {
  'complete-signup': {
    surface: { kind: 'edge', rpc: 'complete_signup' },
    standing: { kind: 'account-absent-by-design', reason: 'the account row is what this route creates; …' },
  },
  'create-organization': { surface: { kind: 'edge', rpc: 'create_organization' }, standing: { kind: 'account-required', admits: ['ngo'] } },
  'update-organization': { surface: { kind: 'edge', rpc: 'update_organization' }, standing: { kind: 'account-required', admits: ['ngo'] } },
  'transfer-organization-contact': { … admits: ['platform_admin'] },
  'set-escalation-contact': { … admits: ['platform_admin'] },
  'set-account-lifecycle': { … admits: ['platform_admin'] },
  'discovery-message': {
    surface: { kind: 'stand-in', reason: 'REQ-002/004 owns the Discovery route; this tree ships the decision it must consult' },
    standing: { kind: 'account-required', admits: ['ngo', 'volunteer', 'platform_admin'] },
  },
} as const
```

An edge row must have `supabase/functions/<name>/index.ts` constructed as **exactly one** `Deno.serve(writeRoute({ name: '<name>', … }))`, a `[functions.<name>] verify_jwt = true` block, and must not mention `/rest/v1/`, `createClient`, `.rpc(`, or the service-role key itself.

SQL half: a `security definer` granted to `service_role` that is not `stable`/`immutable` must call `public.assert_account_active`, except `complete_signup`.

**Where the check lives**

1. Runtime, at boot of `writeRoute` (`edge.ts:339–341`):

```339:341:supabase/functions/_shared/edge.ts
  if (!(spec.name in WRITE_ROUTES)) throw new Error(`${spec.name} is not a row of WRITE_ROUTES, so it cannot be served`);
  const route = WRITE_ROUTES[spec.name];
  if (route.surface.kind !== 'edge') throw new Error(`${spec.name} is a stand-in row of WRITE_ROUTES and has no deployed function`);
```

2. Static, `scanWriteRoutes` (`_write-route-scan.ts:196–200`) — this is the CI failure an unregistered folder actually hits:

```196:200:tests/at/suites/req-001/_write-route-scan.ts
    if (REACHES_DATABASE.test(stripTsComments(file.text)) && !edgeSet.has(dir)) {
      problems.push({
        code: 'write-route-unregistered',
        detail: `${file.name} reaches the database and is not an edge row of WRITE_ROUTES`,
      });
```

Selftest: `'fails a write route that reaches the database without registering'` expects `write-route-unregistered`.

3. SQL: `definer-no-write-gate` if the RPC is granted to `service_role` and does not call `assert_account_active`.

**What fails when a route is unregistered**

- Folder that fetches `/rest/v1/…` without a `WRITE_ROUTES` edge row → `write-route-unregistered` → `writeRouteProblems()` is not `[]` → AT-001.29 / `at:selftest` red.
- Inventory row with no `index.ts` → `write-route-missing-entry`.
- `index.ts` not `Deno.serve(writeRoute(` → `write-route-not-constructed`.
- Direct RPC from the folder → `write-route-bypasses-boundary`.
- Missing `config.toml` block → `write-route-unconfigured`; `verify_jwt` not true → `write-route-jwt-unverified`.
- Stand-in never driven in `_fixture.ts` → `stand-in-not-gated`.
- SQL definer without the gate → `definer-no-write-gate` (also folded into `tenantCatalogProblems()`).

Read functions (`organization-dashboard`, `project-workspace`, `public-project`) are **not** write routes. They use `edgeHandler` + `callerReads` / `publicProjectReads`. They stay legal because their `index.ts` files do not match `REACHES_DATABASE` themselves; the fetch lives inside allowed constructors in `edge.ts`.

Pipeline once registered (`edge.ts:346–378`): OPTIONS → POST only → `resolveCaller` (401 if null) → JSON body → UUID shape of target/subject/from → `write_standing` RPC → `writePipeline` (gate then `decide`) → `callDatabaseFunction(rpc, args)` → `{ ok: true, …render }` or `{ ok: false, kind, reason }`. SQLSTATE 5-char → HTTP 409 with `kind` from `RAISE … DETAIL`; anything else → 502 `refused`.

Gate order (`write-routes.ts:248–265`), quoted:

```247:265:supabase/functions/_shared/write-routes.ts
/** Deactivation is judged before type and before presence, so a deactivated caller is told it is deactivated and nothing else. */
export function writeGateDecision(name: WriteRouteName, standing: WriteStanding): WriteRouteDecision<'admitted'> {
  const route = WRITE_ROUTES[name];
  if (standing.kind === 'unreadable') {
    return refuseWrite('refused', 502, `the caller's standing could not be read, so no decision was made: ${standing.detail}`);
  }
  if (standing.kind === 'account' && standing.lifecycle === 'deactivated') {
    return refuseWrite('account-deactivated', 403, 'this account is deactivated, so it may perform no write');
  }
  if (route.standing.kind === 'account-absent-by-design') return { ok: true, args: 'admitted' };
  if (standing.kind === 'no-account') {
    return refuseWrite('no-account', 409, 'complete signup before this action — the caller holds no account yet');
  }
  …
```

A new kind must be added to `WRITE_REFUSAL_KINDS` (`write-routes.ts:63–79`) **and** raised as `detail = '<kind>'` in SQL, or the edge maps it to `'refused'`.

---

#### 6. `create-organization` and `update-organization`

**Edge**

```23:27:supabase/functions/create-organization/index.ts
Deno.serve(writeRoute({
  name: 'create-organization',
  decide: decideOrganizationCreation,
  render: (value) => ({ organizationId: (value as { organization_id?: string } | null)?.organization_id ?? null }),
}));
```

```21:29:supabase/functions/update-organization/index.ts
Deno.serve(writeRoute({
  name: 'update-organization',
  target: organizationIdField,
  decide: decideOrganizationRename,
  render: (value) => {
    const result = value as { organization_id?: string; name?: string } | null;
    return { organizationId: result?.organization_id ?? null, name: result?.name ?? null };
  },
}));
```

Header of `update-organization/index.ts:13–14`: “It is not a general organisation-profile editor: one field, one write.”

**Fields the org already holds / accepts:** `name` only.

**Validation**

- TypeScript `validateOrganizationName` (`accounts.ts:331–336`): must be a non-empty trimmed string. Reason: `'an organisation needs a non-empty name'`. Create maps this to kind `invalid-name` status 400.
- Rename also runs `orgAdminActionAllowed(standing.orgRole)` (`memberships.ts:122–131`): missing membership → `not-a-member` 403; `member` role → `not-an-admin` 403.
- Target id from `body.organizationId`. Missing → `invalid-request` 400. Malformed UUID refused in `writeRoute` before decide.
- SQL backstops (`20260912120000`): empty name `22023`/`invalid-name`; no account `23503`/`no-account`; not ngo `42501`/`not-an-ngo-account`; no such org `23503`/`no-such-organisation`; no membership `42501`/`not-a-member`; not admin `42501`/`not-an-admin`. Create also `assert_account_active`. Create trims with default `btrim` (spaces only). Update trims `E' \t\r\n\f'`.

**Response**

- Create 200: `{ ok: true, organizationId: "<uuid>" }`
- Update 200: `{ ok: true, organizationId: "<uuid>", name: "<trimmed>" }`
- Refusal: `{ ok: false, kind, reason }` with 400/403/409/502.

Create always inserts a **new** org and seats the caller as `admin`. An NGO account may hold seats in several orgs (unique is on `org_id`, not `account_id`). Signup already created the first org from `organizationName`.

There is **no** acknowledgment gate on create-org (comment in `create-organization/index.ts:14–17`): AT-001.01 gates **project** creation, via `has_platform_acknowledgment`, which still has no product caller.

---

#### 7. Three account types and “is this caller the platform admin?”

Closed vocabulary (`accounts.ts:48–61` mirrors the SQL enum):

```ts
PUBLIC_SIGNUP_ACCOUNT_TYPES = ['ngo', 'volunteer']
ACCOUNT_TYPES = ['ngo', 'volunteer', 'platform_admin']
```

`parseAccountType` refuses `platform_admin` with: `'platform_admin is not available through public signup — a platform administrator is provisioned, never self-signed-up'`. `complete_signup` raises the same independently (`errcode = '42501'`).

**How “platform admin” is decided**

- **Fact:** `public.accounts.account_type = 'platform_admin'` for `id = caller id`.
- **Writes (edge):** `WRITE_ROUTES[name].standing.admits` includes `'platform_admin'`. `writeGateDecision` compares `standing.accountType`. Single-admin list derives kind `not-a-platform-admin` (`typeRefusalKind`, `write-routes.ts:232–236`).
- **Writes (SQL backstop):** `select account_type from public.accounts where id = p_account_id`; if not `'platform_admin'`, raise `detail = 'not-a-platform-admin'`. Same in `transfer_organization_contact`, `set_escalation_contact`, `set_account_lifecycle`.
- **Reads:** `public.viewer_is_platform_admin()` (`20260907120000:70–83`):

```sql
select exists (
  select 1 from public.accounts a
   where a.id = (select auth.uid())
     and a.account_type = 'platform_admin'::public.account_type
);
```

There is **no** product provision path. Tests insert as operator (`_live.ts:831–845`): Auth admin API creates a confirmed user, then `insert into public.accounts (id, account_type) values (…, 'platform_admin')`. Service role has no INSERT on `accounts`.

Per-org `admin` is a **different axis** (`memberships.ts` header). `ngoOnlyActionAllowed` also refuses `platform_admin` for NGO-only actions. Cross-tenant reach is AT-001.40 via the viewer function, not via minting an org membership (the membership trigger refuses non-`ngo` grantees, including `platform_admin`).

---

#### 8. `verification.ts` — what it already does; vetted/trust/verification-state

Two pure functions, no I/O, no migration, no column:

1. `emailVerifiedFromUser(user: unknown): boolean` — true only if `email_confirmed_at` is a non-blank string. Every other shape is unverified.
2. `discoveryMessageAllowed(caller)` — allow iff `caller?.emailVerified === true`. Refusal names email verification as the remedy. **Type-blind. Says nothing about vetting.**

Quoted:

```153:156:supabase/functions/_shared/verification.ts
 * IT SAYS NOTHING ABOUT VETTING. Decision-8 also says vetting is "never the Discovery wall", so a
 * vetting state is not a second condition hiding in here — verification is the whole floor, and
 * adding anything beside it would be building a wall the ratified text refuses.
```

Header: “THE GATE HAS NO DEPLOYED CALLER YET.” The Discovery stand-in in `_fixture.ts:741–749` is the only consumer. It still does not meter credits.

**Nothing resembling a vetted flag, trust tier, or org verification state exists in product tables or TypeScript decisions.** Closest neighbors:

- Auth email confirmation (`email_confirmed_at`) — a different fact.
- Taxonomy row `vetting.outcome` (name only; no producer).
- `atconfig` constants 10/30 (documentation of the PRD numbers).
- Design docs / REQ-002 brief. Not schema.

`public-project.ts:19–24`: `projectIsPublic` returns `true` for every row because projects have no visibility/lifecycle column.

---

#### 9. Credits, allowance, quota, daily grant, metering

**What exists**

- `tests/at/harness/atconfig.ts:83–94`: `discoveryDailyCreditsUnverified = 10`, `discoveryDailyCreditsVetted = 30`, unit `'credits/day'`. Named numbers for later tests. No reader in product code.
- Notification **names** `lovable.credits_low` and `lovable.credits_blocked` — Lovable-chip events, not Discovery credits. Seeded in `notification_event_types`. No producer except the REQ-016 fixture.
- Design/PRD text describing 10/30, UTC daily reset, no rollover.

**What does not exist**

- No table or column for remaining credits, last-reset day, tier grant, quota, allowance, or meter.
- No SQL function that grants, consumes, or resets credits.
- No edge function that checks a credit balance.
- No UTC-day clock in `_shared/`.
- `discovery-message` is a stand-in that only checks email verification.
- Grep over `supabase/**/*.ts` and `supabase/**/*.sql` for quota/allowance/daily grant/metering hits only the Lovable notification names.

A 13-unit run that adds tier grants must introduce the store and the reset. Nothing is there to extend.

---

#### 10. Edge-function conventions

**Write function (the one a vetting/profile write must copy)**

```ts
import { writeRoute } from '../_shared/edge.ts';
Deno.serve(writeRoute({
  name: '<dir>',                 // must equal the folder and the WRITE_ROUTES key
  target: organizationIdField,   // optional; reads body.organizationId
  subject: …,                    // optional; standing.subject
  from: …,                       // optional; extra UUID
  decide: decideXxx,             // pure, in _shared, imported by the fixture
  render: (value) => ({ … }),    // maps snake_case RPC jsonb to camelCase
}));
```

`writeRoute` owns: CORS, OPTIONS 204, POST-only 405, `resolveCaller` 401, JSON parse, UUID check, `write_standing`, gate, RPC, mapping of SQL `DETAIL` → `kind`.

**Read function (dashboard pattern)** — `edgeHandler` + `resolveCaller` + `callerReads` with the request’s `Authorization`. Not a write route.

**Public read** — `public-project`: `verify_jwt = false`, `publicProjectReads()` as service role through `read_public_project` RPC. No table grant.

**Input:** `readJsonBody` (`edge.ts:443–460`). Empty body → `{}`. Non-object JSON → 400 `'the request body must be a JSON object'`. Invalid JSON → `'the request body is not valid JSON'`. Fields are `unknown`; selectors use `stringField` (trim; empty → null).

**Errors:** `json({ ok: false, reason }, status)` or with `kind`. Thrown exceptions become 502 via `edgeHandler`. A reason always travels.

**Env:** `requireEnv('SUPABASE_URL')`, anon key under `SUPABASE_ANON_KEY` or `SUPABASE_PUBLISHABLE_KEY`, service role under `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY`.

**Constraints on `_shared` decision modules:** relative imports only, no Deno, no I/O, no clock, no randomness. Type-checked because the AT program imports them. `edge.ts` is Deno-only and **no type-checker covers it**.

**SQL companion:** `security definer`, `set search_path = ''`, `perform public.assert_account_active(p_account_id)` first, schema-qualified names, `revoke execute from public`, `grant execute to service_role`, `RAISE … USING DETAIL = '<WriteRefusalKind>'`, `notify pgrst, 'reload schema'`.

---

### Files Read

Migrations: `README.md`; all 15 `*.sql` listed above.

Shared: `accounts.ts`, `memberships.ts`, `admin-operations.ts`, `write-routes.ts`, `edge.ts`, `caller.ts`, `tenant-reads.ts`, `verification.ts`, `notification-taxonomy.ts`, `notification-copy.ts`, `notifications.ts` (partial), `public-project.ts`.

Edge entry points: `create-organization/index.ts`, `update-organization/index.ts`, `complete-signup/index.ts`, `set-account-lifecycle/index.ts`, `transfer-organization-contact/index.ts`, `set-escalation-contact/index.ts`, `organization-dashboard/index.ts`, `project-workspace/index.ts`, `public-project/index.ts`.

Tests/config: `_policy-scan.ts`, `_write-route-scan.ts`, `policy-scan.selftest.ts`, `write-route-scan.selftest.ts`, `shipped-write-gate.selftest.ts`, `_integration.ts` (catalog + deactivation), `_live.ts` (`provisionPlatformAdmin`), `_fixture.ts` (Discovery stand-in), `atconfig.ts` (credit constants), `config.toml` function blocks.

---

### Boundaries

| From | To | In | Out |
|---|---|---|---|
| Browser / app | Edge write | `Authorization` + JSON body | `{ ok: true, … }` or `{ ok: false, kind, reason }` |
| Edge write | GoTrue `/auth/v1/user` | bearer token | `Caller { id, githubHandle }` or null |
| Edge write | `public.write_standing` | caller id, org id, subject id | jsonb standing |
| Edge write | product RPC | judged `p_*` args | jsonb result or raised exception with SQLSTATE + DETAIL |
| Product RPC | tables | owner rights, RLS bypassed | rows; never granted to `service_role` as INSERT/UPDATE |
| Browser | tenant read edge | caller JWT | dashboard/workspace projection, or identical 404 |
| Tenant read edge | PostgREST as **caller** | anon key + user JWT | RLS-filtered arrays |
| Public page | `read_public_project` as service role | project uuid | three fields, or empty |
| Producer definer | `emit_notification` | prepared WriteSet jsonb | event uuid; same transaction as the producer’s transition |
| Operator (tests) | `accounts` INSERT | database connection, not service role | `platform_admin` row |

UI must not touch the DB; every write already obeys that. A new profile/vet/allowance write must be a new (or grown) edge + definer, not a client `insert`.

---

### Non-Obvious Things

1. **`organizations` is not a profile.** Three columns. `update-organization` exists to grade per-org admin (AT-001.16/.36), and its own header forbids reading it as a profile editor. Growing it is a product change, not a missing field.
2. **Single-seat is per org, not per account.** Unique index on `org_id`. One NGO account can own many orgs. Signup already created one.
3. **Service role cannot write tables.** Definers run as owner. Granting `INSERT` to `service_role` would open a path around every refusal and fail `service-role-write`.
4. **New enum values need two migrations.** Proven by `org_escalation_contact_recorded`.
5. **`append_audit_event` is not a public RPC.** A vetting route’s SQL function calls it internally.
6. **Owner can still mutate `audit_events`.** Triggers do not bind the table owner. The scan forbids product functions from updating/deleting it; an operator `psql` session can.
7. **Read routes are not write routes.** Do not put `organization-dashboard` into `WRITE_ROUTES`. Do not mention `/rest/v1/` in a new read `index.ts`; call `callerReads`.
8. **Baseline revoke must name `service_role` too**, even if you immediately grant SELECT back. Otherwise `no-baseline-revoke`.
9. **Create-org trims spaces only; update-org trims a wider set.** A tab-only name can still be stored by `create_organization` / `complete_signup` (`btrim` default). Update refuses it.
10. **`vetting.outcome` is a wire name with no producer.** Emitting it later must go through `prepareWriteSet` → a producer definer → `emit_notification` in the **same** transaction as the vet state change. Copy currently falls through to the generic `eventInWords` template (`notification-copy.ts` has no `vetting.outcome` entry).
11. **Deactivation beats type.** A deactivated platform admin attempting a vet write is `account-deactivated` 403, not `not-a-platform-admin`.
12. **`discovery-message` already occupies the write-gate inventory** as a stand-in. A real Discovery route must replace that row, not add a second name, or two gates exist.
13. **Credit constants are not a grant table.** Using `atconfig` values in a test does not implement UTC reset.
14. **Platform admin is not an org member.** Tenant reach is a second SELECT policy, not a membership row. The membership trigger would refuse seating them.

---

### Open Questions

- Whether REQ-002 wants **new columns on `organizations`** (mission, country, website, logo, vetted, allowance) versus a 1:1 `org_profiles` table. Nothing in the tree decides. `organizationDashboard` currently selects `id,name` only (`edge.ts:403`), so either choice must extend `TenantReads` and the dashboard projection if the UI is to show them.
- Whether the vetting write **grows `update-organization`** (NGO self-serve profile) and adds a **new** platform-admin route (the audited vet/unvet), which matches existing axis split (`ngo` vs `platform_admin` admits lists), or whether one route does both. The existing rename route’s comment argues against growing it into a general editor.
- Whether daily grants live **on the org**, **on the account**, or **on a ledger keyed by UTC date**. No consumption API exists; REQ-004 is declared as the later consumer (`WRITE_ROUTES['discovery-message']` reason string).
- Whether `vetting.outcome` payload keys will be added to `TAXONOMY` (`payloadKeys` is optional today). The REQ-016 oracle in `tests/at/suites/req-016/taxonomy.ts` must stay in bijection with the product array and the SQL seed.
- I did not execute the migrations against a live catalog. Overlay conclusions are from reading SQL in order plus the scan’s own model. I did not read every remaining line of `_fixture.ts` / `_live.ts` beyond the cited spans.
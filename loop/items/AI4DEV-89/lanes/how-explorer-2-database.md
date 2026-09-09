I have enough of the catalog, write-route, and CI paths to write the findings without guessing.

### Components Found

**Local stack (`supabase/config.toml`, `package.json`)**
- One local stack, `project_id = "poancmeitlmxejofwzuu"`.
- Ports sit in the 443xx block: API `44321`, Postgres `44322`, Studio `44323`, mail catcher `44324`, analytics `44327`.
- `[api] auto_expose_new_tables` is unset. New `public` objects are not auto-granted to `anon` / `authenticated` / `service_role`.
- `[db.migrations] enabled = true`, `schema_paths = []`. Schema is only `supabase/migrations/*.sql`.
- `[db.seed] sql_paths = ["./seed.sql"]`. `supabase/seed.sql` does not exist. Reset warns; schema still comes from migrations.
- Auth: `jwt_expiry = 120` (local test pin), `enable_confirmations = true`, Google and GitHub OAuth blocks enabled via `env()`.
- Edge JWT: six write functions and two authenticated reads have `verify_jwt = true`. `public-project` has `verify_jwt = false`.

**Scripts**
- `bun run db:start` → `bunx supabase start --ignore-health-check`
- `bun run db:stop` → `bunx supabase stop`
- `bun run db:reset` → `bunx supabase db reset`
- `bun run at:verify` → `bun tests/at/harness/runner.ts`
- `bun run at:check` → `bun tests/at/harness/check.ts`
- `bun run at:selftest` → vitest over `tests/at/harness/**/*.selftest.ts`

**Migrations (filename order; version is the 14-digit prefix)**

| File | What it lands |
|---|---|
| `20260808120000_accounts_org_membership_and_acknowledgments.sql` | enums `account_type`, `org_role`; tables `accounts`, `organizations`, `org_memberships`, `acknowledgments`; `has_platform_acknowledgment`; first `complete_signup` and `create_organization` |
| `20260809090000_volunteer_github_link_and_imported_profile.sql` | `volunteer_profiles`; recreates `complete_signup` with GitHub params |
| `20260811120000_acknowledgment_signer_identity.sql` | signer columns; recreates `complete_signup` with identity params |
| `20260811125000_org_membership_ngo_only_and_organization_rename.sql` | NGO-only membership trigger; `update_organization` |
| `20260811130000_single_seat_org_and_single_developer_projects.sql` | unique index one seat per org; `projects` + single-developer trigger |
| `20260906120000_tenant_read_posture_and_org_member_policies.sql` | revoke-then-grant posture; `viewer_is_org_member`; org-member SELECT policies; `read_public_project` |
| `20260907120000_tenant_read_volunteer_seat_and_admin_reach.sql` | volunteer seat trigger; `viewer_is_volunteer`, `viewer_is_platform_admin`; assigned-volunteer and platform-admin policies |
| `20260908120000_account_lifecycle_audit_and_contact_transfer.sql` | `account_lifecycle`; `audit_events`; `org_escalation_contacts`; append-only triggers; `assert_account_active`; `write_standing`; `append_audit_event`; `change_account_lifecycle`; `transfer_organization_contact`; `set_escalation_contact`; restates `create_organization` / `update_organization` with the gate |
| `20260909120000_account_lifecycle_setter.sql` | `set_account_lifecycle` |
| `20260910120000_org_membership_role_change_audit.sql` | AFTER trigger that writes `org_role_changed` |
| `20260911120000_volunteer_github_identity_is_permanent.sql` | BEFORE DELETE on `auth.identities` |
| `20260912110000_audit_event_kind_escalation_contact.sql` | enum value `org_escalation_contact_recorded` |
| `20260912120000_audit_actor_on_product_paths.sql` | restates `append_audit_event`, `complete_signup`, `create_organization`, `update_organization`, `set_escalation_contact` |

**Hand-written tenant catalog** (`tests/at/suites/req-001/_policy-scan.ts` lines 21–30)

```21:30:tests/at/suites/req-001/_policy-scan.ts
export const TENANT_CATALOG: { readonly [table: string]: TenantPosture } = {
  organizations: 'tenant-isolated',
  org_memberships: 'tenant-isolated',
  projects: 'tenant-isolated',
  acknowledgments: 'tenant-isolated',
  accounts: 'unreachable-by-client-roles',
  volunteer_profiles: 'unreachable-by-client-roles',
  audit_events: 'unreachable-by-client-roles',
  org_escalation_contacts: 'unreachable-by-client-roles',
};
```

**Write-route inventory** (`supabase/functions/_shared/write-routes.ts` `WRITE_ROUTES`)
- Edge: `complete-signup` → RPC `complete_signup` (account-absent-by-design)
- Edge: `create-organization`, `update-organization` (NGO)
- Edge: `transfer-organization-contact`, `set-escalation-contact`, `set-account-lifecycle` (platform admin)
- Stand-in: `discovery-message` (REQ-002/004)

**Lifecycle gate**
- TypeScript: `writeGateDecision` in `write-routes.ts` (lines 248–265). Deactivation is judged before type and presence.
- SQL: `public.assert_account_active(uuid)` in `20260908120000_…sql` lines 69–91. `FOR SHARE` on `accounts.lifecycle`; raises `42501` / detail `account-deactivated`.
- SQL exemption: `WRITE_GATE_EXEMPT.complete_signup` in `_policy-scan.ts` lines 36–40.

**Audit**
- Table `public.audit_events` in `20260908120000_…sql` lines 14–26.
- Append-only: `audit_events_are_append_only` + BEFORE UPDATE OR DELETE row trigger + BEFORE TRUNCATE statement trigger (lines 49–67).
- Writer: `public.append_audit_event` (recreated in `20260912120000_…sql`). No EXECUTE grant to `service_role`; other definers call it as owner.
- Actor label: `account_type || ':' || id`, or `'operator'` when `p_actor` is null.

**Caller-bound reads**
- `callerReads` in `edge.ts` lines 398–420: GET `/rest/v1/…` with `apikey = anon` and `Authorization` copied from the request.
- `publicProjectReads` in `edge.ts` lines 423–440: POST `/rest/v1/rpc/read_public_project` as service role.
- Surfaces: `organization-dashboard/index.ts`, `project-workspace/index.ts`, `public-project/index.ts`.

**Atomic writes**
- No TypeScript transaction helper. No `begin` / `sql.begin` / client `.rpc` from shared modules.
- Atomicity is one `SECURITY DEFINER` plpgsql function = one implicit transaction. Edge calls it once via `callDatabaseFunction` (`edge.ts` lines 283–317), which is not exported.

**Roles / actors**
- Global type: `public.account_type` = `'ngo' | 'volunteer' | 'platform_admin'`. Row PK `accounts.id` **is** `auth.users.id`.
- Per-org role: `public.org_role` = `'admin' | 'member'` on `org_memberships`. Unique index `org_memberships_one_seat_per_org_idx` forces one seat per org.
- Volunteer seat: `projects.assigned_volunteer_id` → `accounts.id`.
- Taxonomy role `ex_volunteer` (`tests/at/suites/req-016/taxonomy.ts` line 18) is **not** a database type.
- Actor id in audit: `actor_account_id uuid` = that same account id.

---

### Flow

**1. How a migration is authored and applied**

Author a new `supabase/migrations/YYYYMMDDHHMMSS_snake_name.sql`. The 14-digit stamp is the version key in `supabase_migrations.schema_migrations` (`local-stack.ts` `expectedMigrations`, lines 588–596). Two files with the same stamp collide; that already happened (see the header of `20260811125000_…sql`).

Once a migration has run anywhere but a local machine, it is append-only. Fix with a new file, not an edit (`supabase/migrations/README.md` lines 17–18). Recreating a function with a new signature requires `DROP FUNCTION` first or Postgres overloads and PostgREST 404s.

`bun run db:start` starts the stack from `config.toml`. It does **not** reset. Auth reads `jwt_expiry` at container start; a pin change needs stop then start.

`bun run db:reset` (and every integration run) drops the local database and replays every `*.sql` in filename order, then tries seed.

**2. What an integration run does**

`bun run at:verify <req> --tier integration --expect` (`tests/at/harness/runner.ts` + `local-stack.ts` `prepareLocalStack`, lines 975–991):

1. Pin-check `[auth] jwt_expiry` against `AT_CONFIG.accessTokenLifetimeSeconds`.
2. Machine-wide lock keyed by project id + API port.
3. Prove identity from CLI container names (`supabase_<service>_<project_id>`), loopback hosts, locally issued JWTs (`iss = supabase-demo`).
4. `supabase db reset --local` through the pinned CLI (`resetLocalDatabase`, lines 677–730).
5. Prove exact set equality of on-disk timestamps vs `supabase_migrations.schema_migrations` (`proveMigrationsReplayed`, lines 639–654).
6. Run the suite with an allowlisted child env (`AT_SUPABASE_*` only). No `.env.local` secrets.

CI does **not** run this path. CI runs `--tier loop` only.

**3. Static catalog scan (runs in CI)**

`tenantCatalogProblems()` (`_policy-scan.ts` lines 655–670) reads every `*.sql` in name order, splits statements (comments, dollar quotes, strings), overlays later GRANT/REVOKE/DROP/ALTER/POLICY, then unions `scanWriteGateSql`.

It **rejects**:

| code | meaning |
|---|---|
| `undeclared-table` | `CREATE TABLE public.X` not in `TENANT_CATALOG` |
| `missing-table` | catalog names a table no migration creates |
| `alter-default-privileges` | `ALTER DEFAULT PRIVILEGES` |
| `grant-all-tables` | `GRANT … ON ALL TABLES` |
| `grant-to-public` | `GRANT … TO PUBLIC` |
| `grant-to-anon` | any `GRANT … TO anon` |
| `anon-privilege` | leftover anon privileges after overlay |
| `no-baseline-revoke` | no `REVOKE ALL … FROM anon, authenticated, service_role` after create |
| `service-role-write` | leftover INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER/ALL on `service_role` |
| `force-row-level-security` | `FORCE ROW LEVEL SECURITY` |
| `isolated-no-rls` | tenant-isolated table never enables RLS |
| `isolated-wrong-privileges` | authenticated holds anything other than exactly `{select}` |
| `isolated-no-policy` | tenant-isolated table has no `CREATE POLICY` |
| `unreachable-client-grant` | unreachable table still grants to authenticated |
| `policy-to-anon` / `policy-for-all` | policy `TO anon` or `FOR ALL` |
| `policy-tautological-using` | `USING (true)` or `USING (1=1)` |
| `policy-using-no-auth` | USING names neither `auth.uid()` nor `public.viewer_*` |
| `policy-non-viewer-function` | USING calls a non-`viewer_` public function |
| `viewer-not-definer` / `viewer-search-path` / `viewer-no-revoke` / `viewer-no-execute-grant` | `viewer_` shape |
| `definer-no-revoke` | non-viewer definer without `REVOKE EXECUTE FROM public` |
| `definer-client-execute` | non-viewer definer EXECUTE granted to anon/authenticated/public |
| `definer-no-write-gate` | volatile definer executable by `service_role` that does not call `assert_account_active` and is not in `WRITE_GATE_EXEMPT` |
| `audit-mutation-in-definer` | definer body `UPDATE`/`DELETE` on `audit_events` |

**What a new table’s migration must contain**

1. Add the name to `TENANT_CATALOG` in the same change (`_policy-scan.ts` lines 21–30). Also update live helpers `SERVICE_ROLE_SELECT` and `VIEWER_FUNCTIONS` in `_integration.ts` lines 166–167 if those sets change.
2. `CREATE TABLE public.<name> (…)`.
3. Immediately: `REVOKE ALL ON TABLE public.<name> FROM anon, authenticated, service_role;` (all three roles).
4. `ALTER TABLE public.<name> ENABLE ROW LEVEL SECURITY;` (needed for tenant-isolated; unreachable tables in this tree also enable it).
5. **If tenant-isolated** (recipient-visible in-app rows):
   - `GRANT SELECT ON public.<name> TO authenticated;` and nothing else.
   - At least one `CREATE POLICY … FOR SELECT TO authenticated USING (…)` that names `auth.uid()` or `public.viewer_…`.
   - No `TO anon`, no `FOR ALL`, no tautological USING.
6. **If unreachable-by-client-roles** (outbox, ops-item, event log if clients never SELECT it):
   - No GRANT to `authenticated` or `anon`.
   - `service_role` may hold SELECT only if you also add the table to `SERVICE_ROLE_SELECT`. Today that set is `{accounts, org_memberships}`. Do not grant INSERT/UPDATE/DELETE.
7. Do not `GRANT … TO PUBLIC`, `GRANT … ON ALL TABLES`, or `ALTER DEFAULT PRIVILEGES`.
8. Do not `FORCE ROW LEVEL SECURITY` (operator SQL in tests must still bypass).
9. New `viewer_` helpers: `SECURITY DEFINER`, `SET search_path = ''`, `REVOKE EXECUTE FROM public`, `GRANT EXECUTE TO authenticated`, no argument that names another person. Add the short name to `VIEWER_FUNCTIONS` or live catalog fails.
10. New non-viewer definers: `REVOKE EXECUTE FROM public`. Grant EXECUTE to `service_role` only if the edge RPC needs it. If volatile + `service_role` EXECUTE: call `public.assert_account_active` or add a `WRITE_GATE_EXEMPT` row with a reason.
11. End with `NOTIFY pgrst, 'reload schema';`.

**4. Live catalog check (integration only, not CI)**

`sut.tenantTableFacts()` (`_live-tenant-reads.ts` lines 263–329) queries `pg_class` (every `public` relation), seven `has_table_privilege` values × `{anon, authenticated, service_role}`, `relrowsecurity` / `relforcerowsecurity`, `pg_policies`, and `has_function_privilege` EXECUTE for every `prosecdef` function.

`assertTenantCatalog` (`_integration.ts` lines 170–201) asserts:

- Every live public table is in `TENANT_CATALOG` and every catalog key exists live (both directions).
- `forceRowLevelSecurity === false`.
- `anon === []`.
- `service_role === ['select']` iff table is in `SERVICE_ROLE_SELECT`, else `[]`.
- Tenant-isolated: RLS on, authenticated exactly `['select']`, at least one policy, no tautological USING.
- Unreachable: authenticated `[]`.
- Every definer: `anonExecute === false`; `authenticatedExecute === true` iff name is in `VIEWER_FUNCTIONS`.

Called from AT-001.21 / .22 / .23 / .40 integration bodies.

**5. Write-route registration and conformance**

Boundary: `writeRoute` in `edge.ts` lines 336–380.

1. `spec.name` must be a key of `WRITE_ROUTES` and `surface.kind === 'edge'`.
2. Resolve caller via `/auth/v1/user` (`resolveCaller`).
3. Parse JSON body; shape-check UUID target/subject/from.
4. `loadWriteStanding` → RPC `write_standing` as service role.
5. `writePipeline` = `writeGateDecision` then `spec.decide`.
6. `callDatabaseFunction(rpc, args)` as service role. One HTTP round trip = one DB transaction.

Entry point pattern (every current writer):

```23:27:supabase/functions/create-organization/index.ts
Deno.serve(writeRoute({
  name: 'create-organization',
  decide: decideOrganizationCreation,
  render: (value) => ({ organizationId: (value as { organization_id?: string } | null)?.organization_id ?? null }),
}));
```

`scanWriteRoutes` / `writeRouteProblems()` (`_write-route-scan.ts`) refuses:

- `write-route-unregistered`: a `supabase/functions/<dir>/index.ts` that matches `writeRoute|callDatabaseFunction|/rest/v1/|createClient|\.rpc\(|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY` and is not an edge row of `WRITE_ROUTES`.
- `write-route-missing-entry`: inventory names an edge route with no `index.ts`.
- `write-route-not-constructed`: not exactly one `Deno.serve(writeRoute(`.
- `write-route-registered-under-other-name`.
- `write-route-bypasses-boundary`: the index still names `callDatabaseFunction` or a raw DB reach.
- `write-route-unconfigured` / `write-route-jwt-unverified`: missing `[functions.<name>]` or `verify_jwt` is not `true`.
- `stand-in-not-gated`: stand-in never appears in `_fixture.ts` as `writeGateDecision('…')` or a named `writePipeline` spec.
- `shared-module-reaches-database`: any `_shared/*.ts` other than `edge.ts` matches the bypass regex.
- `edge-reaches-database-outside-constructors`: `edge.ts` names a DB reach outside `callDatabaseFunction`, `publicProjectReads`, `callerReads`.
- `rpc-caller-exported`: `callDatabaseFunction` is exported again.
- plus `scanWriteGateSql` on the migrations.

Runs in CI via `write-route-scan.selftest.ts` (`expect(writeRouteProblems()).toEqual([])`) and AT-001.29 (`assertDeactivationGatesEveryWrite` line 2377).

**What a new write route must do**

1. Add a row to `WRITE_ROUTES` with `surface: { kind: 'edge', rpc: '<sql_function>' }` and `standing` (`account-required` + `admits`, or `account-absent-by-design` + reason).
2. Add `supabase/functions/<name>/index.ts` as a single `Deno.serve(writeRoute({ name, decide, … }))`. Do not call `callDatabaseFunction` or fetch `/rest/v1` from the index.
3. Put decisions in a pure `_shared` module (no Deno, no I/O). Put DB reach only in `edge.ts` constructors.
4. Add `[functions.<name>] verify_jwt = true` to `config.toml`.
5. Land a `SECURITY DEFINER` plpgsql function `public.<rpc>` with `SET search_path = ''`, `REVOKE EXECUTE FROM public`, `GRANT EXECUTE TO service_role`, and `PERFORM public.assert_account_active(p_account_id)` unless it is a documented `WRITE_GATE_EXEMPT` case.
6. Do not UPDATE/DELETE `audit_events` inside it. Insert via `append_audit_event`.
7. If it is a stand-in, drive it through `writeGateDecision` / `writePipeline` in `_fixture.ts`.
8. Extend `WRITE_REFUSAL_KINDS` only if a new kind is returned.

Authenticated **reads** (`organization-dashboard`, `project-workspace`) are not write routes. They use `edgeHandler` + `callerReads`. They pass the scan because the index does not match `REACHES_DATABASE`; the GET lives inside `callerReads` in `edge.ts`.

**6. Reads as the caller**

Two clients, two owners:

| Client | Module | Auth | What it may do |
|---|---|---|---|
| Caller / `authenticated` | `edge.ts` `callerReads`; tests `live-stack.ts` `restGet` | `apikey = anon`, `Authorization = caller JWT` | SELECT on tenant-isolated tables, filtered by RLS |
| Service role | `edge.ts` `callDatabaseFunction` (writes, not exported); `publicProjectReads` (one public RPC) | `apikey` + `Bearer` = service role key | EXECUTE on granted definers; SELECT only on `accounts` and `org_memberships`; **no table writes** |
| Operator | `live-stack.ts` `sqlClient` over `dbUrl` as Postgres owner | connection string | Tests/Givens only. Bypasses RLS because FORCE RLS is forbidden |

`resolveCaller` does not decode the JWT. It presents `Authorization` to `/auth/v1/user`. `Caller.id` is `auth.users.id` = `accounts.id`.

An in-app notification read for a recipient should look like `organization-dashboard`:

1. New edge function with `verify_jwt = true` (not a `WRITE_ROUTES` row if it only reads).
2. `resolveCaller`; 401 if null.
3. `callerReads`-style GET `/rest/v1/<inbox_table>?recipient_id=eq.<caller.id>` with the request’s `Authorization`.
4. Table posture `tenant-isolated`: RLS + `GRANT SELECT TO authenticated` + policy `USING (recipient_id = (SELECT auth.uid()) …)`.
5. UI must not use a Supabase client against the table. Project rule: UI goes through an edge function.

If the inbox is `unreachable-by-client-roles`, a caller GET is privilege-denied. Then you would need a `viewer_` / definer read granted to `authenticated`, which the catalog treats as a `viewer_` function, not a generic definer.

**7. Transactions (load-bearing for the outbox)**

The only atomic multi-statement write is a single plpgsql `SECURITY DEFINER` function. Examples:

- `public.complete_signup` (`20260912120000_…sql` lines 48–204): account + org + membership + volunteer profile + acknowledgment, or none.
- `public.create_organization` (same file, lines 209–253): org + admin membership, with `set_config('app.actor_account_id', …)` so the membership audit trigger sees the actor.
- `public.transfer_organization_contact` (`20260908120000_…sql` lines 199–304): `assert_account_active`, seat `FOR UPDATE`, membership update, optional `change_account_lifecycle`, `append_audit_event`.
- `public.set_escalation_contact` (`20260912120000_…sql` lines 313–391): upsert contact + audit row.

A notification / outbox row that must commit with a ledger or state transition must be `INSERT`ed **inside the same definer** as that transition. Two `callDatabaseFunction` calls from TypeScript are two transactions. The REQ-016 loop fixture even names the fault `notifications.between_transition_and_event_write` (`_fixture.ts` line 66) to encode that split.

**8. Roles mapped onto database entities**

| Taxonomy role (`taxonomy.ts` `Role`) | Database fact |
|---|---|
| `ngo` | `accounts.account_type = 'ngo'` and the one `org_memberships` row for that org (`account_id`, `role` admin/member). Recipients for a project event resolve through `projects.org_id` → that seat. |
| `volunteer` | `accounts.account_type = 'volunteer'`. Project-scoped: `projects.assigned_volunteer_id`. Signup requires a GitHub row in `auth.identities`. |
| `platform_admin` | `accounts.account_type = 'platform_admin'`. Public signup refuses this type in SQL and TypeScript. Live adapter `provisionPlatformAdmin` (`_live.ts` ~831–854): Auth admin API with service role, then **operator** `INSERT INTO public.accounts`. Service role has no INSERT. |
| `ex_volunteer` | Not an `account_type`. Resolve at emit time from prior assignment / abandonment state. |

Actor id = `accounts.id` = `auth.users.id`. Audit `actor_label` is `ngo:<uuid>`, `volunteer:<uuid>`, `platform_admin:<uuid>`, or `operator`.

**9. CI (`.github/workflows/ci.yml`, single job `verify`)**

On `pull_request` to `main` and `push` to `main`. Prose-only PRs skip the suite but still run the two guards. Touching `src/`, `supabase/`, `tests/`, `.github/`, `package.json`, `bun.lock`, `tsconfig*`, `vitest*` takes the slow path.

Order of steps:

1. Check out **PR head SHA**, not the merge commit.
2. Decide whether the diff reaches code.
3. `bun install --frozen-lockfile`
4. `bun run typecheck` — app `tsconfig.json`, `tests/at/tsconfig.json`, verify-drive tsconfig. Edge `index.ts` / `edge.ts` are **not** in those programs.
5. `bun run at:selftest` — includes `policy-scan.selftest.ts` (`tenantCatalogProblems() === []`) and `write-route-scan.selftest.ts` (`writeRouteProblems() === []`).
6. For each `tests/at/suites/req-*/`: `bun run at:check $req` (AT-id bijection with `.taskmaster/docs/acceptance/`).
7. For each `tests/at/expected/req-*.json`: `bun run at:verify $req --tier loop --expect`. Then fail if a suite has no manifest.
8. Ownership guard: a PR may not change both Lovable (`src/`) and Claude (`supabase|tests|loop|.claude|.github`) territory.
9. Reference guard: PR title/body may not name an `AI4DEV-` / `AI4PM-` id the branch does not own, except one `Closes AI4DEV-nn` line.

CI does **not** run lint, `db:reset`, or `--tier integration`. Live catalog is not a merge check.

**Checks a new table + new write route newly have to satisfy**

Already in CI, and they fail closed on an undeclared table or unregistered writer:

- `at:selftest` → `tenantCatalogProblems()`, `scanWriteGateSql`, `writeRouteProblems()`, `auditAppendOnlyProblems()`, `identityPermanenceProblems()`.
- `at:verify req-001 --tier loop --expect` → AT-001.21/22/23/40 call `tenantCatalogProblems()`; AT-001.29 calls `writeRouteProblems()`; AT-001.33 calls `auditAppendOnlyProblems()`.
- `at:check` if you add AT ids.
- `at:verify req-016 --tier loop --expect` if the emitter/taxonomy tests start importing product modules.
- Ownership + reference guards (process, not schema).

Not in CI, required before an integration green:

- `bun run at:verify req-001 --tier integration --expect` → `assertTenantCatalog` over `pg_class`.
- `bun run at:verify req-016 --tier integration --expect` once `_live.ts` exists (today every 016 integration id is capability-pending on `sut.notifications`).

---

### Files Read

- `supabase/config.toml`, `supabase/migrations/README.md`, all 13 `supabase/migrations/*.sql`
- `supabase/functions/_shared/{edge,write-routes,caller,tenant-reads,accounts,memberships,admin-operations}.ts`
- `supabase/functions/{complete-signup,create-organization,update-organization,transfer-organization-contact,set-escalation-contact,set-account-lifecycle,organization-dashboard,project-workspace,public-project}/index.ts`
- `tests/at/suites/req-001/{_policy-scan,_write-route-scan,_live-tenant-reads,_live,_integration,_source-scan,d-tenant-isolation,f-lifecycle-and-audit}.ts`
- `tests/at/suites/req-016/{taxonomy,_fixture}.ts`, `loop/decomp/req-016.md`
- `tests/at/harness/{runner,local-stack,live-stack,check,typecheck,atconfig,policy-scan.selftest,write-route-scan.selftest}.ts`, `tests/at/vitest.config.ts`, `tests/at/tsconfig.json`
- `tests/at/expected/{req-001,req-016}.json`
- `.github/workflows/ci.yml`, `package.json`

---

### Boundaries

- **Privilege vs RLS.** `service_role` has `BYPASSRLS` and still cannot INSERT/UPDATE product tables. Writers run as the table owner inside definers. Granting `service_role` INSERT would open a path around `complete_signup`’s `platform_admin` refusal.
- **Default ACLs.** Supabase ships `ALTER DEFAULT PRIVILEGES` on `public`. Absence of GRANT is not absence of privilege. The baseline `REVOKE ALL FROM anon, authenticated, service_role` is what makes the posture true. Measured on `projects` and `volunteer_profiles`.
- **Catalog is an expectation, not derived.** A new `CREATE TABLE public.*` with no `TENANT_CATALOG` row is `undeclared-table`. Updating SQL without the TypeScript map (and without `SERVICE_ROLE_SELECT` / `VIEWER_FUNCTIONS` when those sets change) fails CI or live catalog.
- **Edge TypeScript is untyped.** `bun run typecheck` does not cover `supabase/functions/**` except modules imported by tests (`write-routes.ts`, `accounts.ts`, `tenant-reads.ts`, …). `edge.ts` is Deno-only and explicitly uncovered.
- **UI / Data API.** Authenticated product reads go through edge functions that forward the caller JWT. The one anonymous read is `read_public_project` as service role, returning only id/name/org name.
- **Write routes vs read functions.** A new inbox **read** can follow `organization-dashboard` (not in `WRITE_ROUTES`). A new **write** (emitter RPC, outbox mark-sent, ops-item insert) that lives under `supabase/functions/<dir>/index.ts` and reaches `/rest/v1` or a service-role key **must** be a `WRITE_ROUTES` edge row constructed with `writeRoute`.
- **Worker tension.** `writeRoute` always requires a JWT caller (`verify_jwt = true` is scanned). A delivery worker that is not a user has no current surface kind. Putting raw `/rest/v1` in a new function directory fails `write-route-unregistered`. Extending `edge.ts` needs a new name in `EDGE_ALLOWED_FUNCTIONS`. A `pg_cron` / operator SQL worker would skip the write-route scan and still hit `scanWriteGateSql` if the definer is granted to `service_role`.
- **CI vs live.** Merge CI never replays migrations onto Postgres. A grant the overlay parser misreads can still be wrong on the live catalog. Integration is the only `pg_class` check.
- **Territory.** A PR that adds `supabase/` migrations cannot also edit `src/` UI.

---

### Non-Obvious Things

- `complete_signup` is the only `WRITE_GATE_EXEMPT` SQL writer. TypeScript still refuses a deactivated caller in `writeGateDecision` before the RPC. The SQL function itself does not call `assert_account_active`.
- `scanWriteGateSql` is folded into **both** `tenantCatalogProblems()` and `writeRouteProblems()`. A missing `assert_account_active` fails both selftests.
- `write_standing` is `STABLE`, so the write-gate scan skips it even though `service_role` has EXECUTE.
- First migration granted `SELECT, INSERT` on `accounts` to `authenticated` so a client-key insert would fail at RLS, not privilege. `20260906120000` revoked that. Overlay wins; leftover INSERT would now fail `isolated-wrong-privileges` / `unreachable-client-grant`.
- Membership audit uses `current_setting('app.actor_account_id', true)`. Product inserts must `set_config` in the same transaction or the row is attributed to `operator`.
- Enum values cannot be used in the same transaction that adds them. Escalation audit kind is split across `20260912110000` and `20260912120000`.
- `seed.sql` is configured and missing. Harmless warning today; a real seed would load on every integration reset.
- REQ-016 loop greens run against `_fixture.ts`, which states it is not the product. Integration ids are all capability-pending. Shipping tables does not turn those greens into product evidence until a live adapter exists.
- Operator SQL in tests is a third authority, narrower than service role and wider than RLS. Use it only for Givens no product path can reach.

---

### Open Questions

- **Inbox posture.** Spec asks for an event table, a delivery/outbox table, and an ops-item table. Catalog allows only `tenant-isolated` or `unreachable-by-client-roles`. A recipient inbox SELECT wants the first; outbox and ops-item almost certainly want the second. The tree does not yet record that choice.
- **Delivery worker surface.** No existing pattern for a non-user writer. Options (writeRoute-with-exemption, new `edge.ts` constructor, SQL cron as owner) are all new and would need a scan/inventory change.
- **Who calls `assert_account_active` for emit.** Guarded producers (money, access, completion) do not exist yet. The outbox INSERT must live inside **those** definers, not a second RPC after they return.
- **`ex_volunteer` persistence.** No column or type stores it. Recipient resolution at emit time is unspecified.
- **`SERVICE_ROLE_SELECT` growth.** If the worker reads outbox via PostgREST as service role, that table needs SELECT and a catalog-list update. If it only goes through a definer, leave grants empty.
- **Live catalog not in CI.** A notification migration can merge on a green loop scan and still fail `assertTenantCatalog` on the first integration run.
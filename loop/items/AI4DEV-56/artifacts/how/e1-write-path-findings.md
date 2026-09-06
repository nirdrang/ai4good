### Components Found

- **`Caller`** — `supabase/functions/_shared/caller.ts` lines 58–69. The authenticated identity: Auth user `id` plus a derived `githubHandle`. Built only by `callerFromAuthAnswer`.
- **`callerFromAuthAnswer(status, user)`** — `caller.ts` lines 111–119. Pure judgement: non-2xx, non-object body, or non-string `id` → `null`. Handle comes from `extractGithubHandle(user)` over the **whole** body.
- **`resolveCaller(request, supabaseUrl, anonKey)`** — `supabase/functions/_shared/edge.ts` lines 168–210. Deno I/O: reads `Authorization`, `GET ${supabaseUrl}/auth/v1/user` with the anon key, parses JSON without throwing, then calls `callerFromAuthAnswer`. Missing header → `null` with no round trip.
- **`callDatabaseFunction(url, serviceRoleKey, name, args)`** — `edge.ts` lines 277–310. `POST /rest/v1/rpc/${name}` as the **service role**. One round trip = one implicit transaction. Returns `{ ok, value }` or `{ ok: false, status, message }` from PostgREST’s raised exception.
- **`callerReads(url, anonKey, authorization)`** — `edge.ts` lines 328–350. Caller-bound Data API GETs (`organizations`, `org_memberships`, `projects`) with the **caller’s JWT**, not the service role.
- **`publicProjectReads(url, serviceRoleKey)`** — `edge.ts` lines 353–368. Service-role POST to `read_public_project` only.
- **`validateCompleteSignup` / `parseAccountType` / `ngoOnlyActionAllowed` / `validateOrganizationName`** — `supabase/functions/_shared/accounts.ts`. Pure product judgements. `PUBLIC_SIGNUP_ACCOUNT_TYPES = ['ngo','volunteer']`; `platform_admin` is refused by construction. `PLATFORM_ACKNOWLEDGMENT_KIND = 'platform_tos_and_promise'`.
- **`orgAdminActionAllowed` / `parseOrgRole`** — `supabase/functions/_shared/memberships.ts`. Per-organisation role decision. Two refusal kinds: `not-a-member` and `not-an-admin`.
- **`extractGithubHandle` / `stubGithubStatsFor`** — `supabase/functions/_shared/github.ts`. Reads `identities[].provider === 'github'` → `identity_data.user_name`. Stub import is deterministic; no GitHub HTTP.
- **`discoveryMessageAllowed` / `emailVerifiedFromUser`** — `supabase/functions/_shared/verification.ts`. Discovery write floor. **No deployed function imports this file.**
- **`organizationDashboard` / `projectWorkspace` / `TENANT_NOT_FOUND`** — `supabase/functions/_shared/tenant-reads.ts`. Pure orchestration over already-filtered rows. Holds **no** tenant rule.
- **Write edge functions** — `complete-signup`, `create-organization`, `update-organization` under `supabase/functions/<name>/index.ts`. Each: `edgeHandler` → `resolveCaller` → shared decision → `callDatabaseFunction`.
- **Read edge functions** — `organization-dashboard`, `project-workspace` (caller JWT + `callerReads`); `public-project` (no auth, `publicProjectReads`, `verify_jwt = false`).
- **SECURITY DEFINER write functions** — `public.complete_signup`, `public.create_organization`, `public.update_organization`. Owner-running, `search_path = ''`, EXECUTE revoked from `PUBLIC`, granted only to `service_role`.
- **Triggers** — `org_memberships_grantee_must_be_ngo` (BEFORE INSERT OR UPDATE on `org_memberships`); `projects_seat_holds_a_volunteer` (BEFORE INSERT OR UPDATE OF `assigned_volunteer_id`); `projects_single_developer_seat` (BEFORE UPDATE on `projects`).
- **Tables** — `accounts`, `organizations`, `org_memberships`, `acknowledgments`, `volunteer_profiles`, `projects`. No lifecycle column. No audit table. No escalation-contact table.
- **`AccountsSut`** — `tests/at/suites/req-001/_contract.ts` lines 375–823. The one system-under-test shape. Product ops + Auth mirrors + operator Givens + read-back.
- **Loop adapter** — `tests/at/suites/req-001/_fixture.ts`. Map storage; judgements imported from shipped modules; `sut: { accounts }`.
- **Live adapter** — `tests/at/suites/req-001/_live.ts`. HTTP to Auth and deployed functions; operator SQL via `sqlClient`; `sut: { accounts }`.
- **Static catalog scan** — `tests/at/suites/req-001/_policy-scan.ts` + `tests/at/harness/policy-scan.selftest.ts`.
- **Source naming scan** — `tests/at/suites/req-001/_source-scan.ts` (`inviteOrAddMemberSurface`).
- **Live catalog read** — `tenantTableFacts()` in `_live-tenant-reads.ts` lines 263–329; asserted by `assertTenantCatalog` in `_integration.ts` lines 168–199.
- **Red-by-shape** — `AtPending` / `CapabilityPending` in `tests/at/harness/pending.ts`; prefix rebuild in `tests/at/harness/expected.ts` lines 286–296; ledger `tests/at/expected/req-001.json`.
- **Pending stubs** — `tests/at/suites/req-001/_pending.ts` `notLanded(LEAF.D6_*)`; call sites in `e-admin-operations.test.ts` and `f-lifecycle-and-audit.test.ts`.

### Flow

Authenticated product write, end to end (example: NGO `complete-signup`):

1. **Browser / live adapter** `POST /functions/v1/complete-signup` with `Authorization: Bearer <access token>`, JSON body, optional `x-forwarded-for`. Live path: `functionPost` in `tests/at/harness/live-stack.ts` lines 143–152.
2. **Platform JWT check.** `[functions.complete-signup] verify_jwt = true` in `supabase/config.toml` lines 490–491. Signature must verify before Deno runs. This is **not** “who is calling” and **not** “is the session live”.
3. **`edgeHandler('complete-signup', …)`** — `edge.ts` 101–114. OPTIONS → 204 CORS. Thrown errors → shaped 502. POST-only is the inner handler (`complete-signup/index.ts` line 51).
4. **`resolveCaller`** — `edge.ts` 168–210. Missing `Authorization` → `null` → 401 `"authenticate before completing signup"`. Else `GET /auth/v1/user` with the **same** bearer + anon `apikey`. Revoked/expired token: Auth answers non-2xx (measured 403 in comments). Body parse never throws; unparseable 2xx now 401 (fail-closed vs old 502).
5. **`callerFromAuthAnswer`** — `caller.ts` 111–119. Needs 2xx + object + string `id`. `githubHandle` from `extractGithubHandle` over `identities[]` (`github.ts` 50–65). `null` caller → 401 at every write site.
6. **`readJsonBody`** — `edge.ts` 371–388. Malformed JSON → 400.
7. **Shared decision.** `validateCompleteSignup(body, { githubHandle: caller.githubHandle })` (`accounts.ts` 213–303). Type, org-name rule, volunteer GitHub gate, acknowledgment version, signer name/title/attestation. Handle is **never** a request field. Failure → 400 with the module’s reason.
8. **Stub import (volunteer only).** `stubGithubStatsFor(judgedHandle)` (`github.ts` 124–145). NGO omits the four GitHub RPC keys (`complete-signup/index.ts` 118–125) so an old five-arg function still resolves.
9. **`callDatabaseFunction(..., 'complete_signup', { p_account_id: caller.id, ... })`** — `edge.ts` 277–310. Headers: `apikey` + `Authorization: Bearer` **service role**. Path: `/rest/v1/rpc/complete_signup`.
10. **`public.complete_signup` (SECURITY DEFINER)** — current body in `20260811120000_acknowledgment_signer_identity.sql` lines 112–355. Independent backstops: refuse `platform_admin`; refuse unknown type; NGO name / volunteer name rules; volunteer handle present; **bind handle to `auth.identities`** (`provider = 'github'` AND `identity_data->>'user_name' = handle`); populated import; then INSERT `accounts` (PK = auth user id); NGO: INSERT `organizations` + `org_memberships` role `admin`; volunteer: INSERT `volunteer_profiles`; last: INSERT `acknowledgments` with signer columns. All or none.
11. **Triggers on those inserts.** NGO membership insert fires `org_memberships_grantee_must_be_ngo` (`20260811125000_...sql` 52–98): grantee must have `accounts.account_type = 'ngo'`. Volunteer profile has no trigger; CHECKs refuse empty content.
12. **Row.** Edge maps 4xx RPC → HTTP 409 with the database sentence; transport → 502. Success JSON: `{ ok, accountId, accountType, organizationId }`.

`create-organization` (NGO-only second org):

- Same 1–5.
- **Service-role GET** `accounts?id=eq.<caller.id>&select=account_type` (`create-organization/index.ts` 55–72). Three-way lookup: `found` / `absent` / `failed`. Failed → 502; absent → 409 “complete signup…”; then `ngoOnlyActionAllowed` (`accounts.ts` 336–345) → 403.
- `validateOrganizationName` then `callDatabaseFunction(..., 'create_organization', { p_account_id, p_name })`.
- Definer (`20260808120000_...sql` 260–306): empty-name refuse; re-read `account_type`; refuse missing account / non-`ngo`; INSERT org + admin membership (trigger again).

`update-organization` (admin-only rename):

- Same 1–5.
- **Service-role GET** `org_memberships?org_id=&account_id=&select=role` (`update-organization/index.ts` 60–81); `parseOrgRole` then `orgAdminActionAllowed`. Kinds travel on the wire (`not-a-member` / `not-an-admin`). Unknown org → no row → `not-a-member` (same as live).
- Name validated **after** authz. Then `callDatabaseFunction(..., 'update_organization', { p_account_id, p_organization_id, p_name })`.
- Definer (`20260811125000_...sql` 125–185): whitespace-trimmed name; org exists; role **in that org only**; `admin` required; UPDATE `organizations.name`.

What separates a write route from a read route **in this tree**:

| | Write (`complete-signup`, `create-organization`, `update-organization`) | Authenticated read (`organization-dashboard`, `project-workspace`) | Public read (`public-project`) |
|---|---|---|---|
| Import | `callDatabaseFunction` | `callerReads` | `publicProjectReads` |
| Token to DB | **service role** | **caller JWT** | service role, read-only RPC |
| Decision | `accounts.ts` / `memberships.ts` | `tenant-reads.ts` (projection only) | `public-project.ts` |
| `verify_jwt` | `true` | `true` | `false` |
| Mutates | yes, via definer | no | no |

`verify_jwt = true` is **not** the write discriminator (two reads share it). Mechanical write test: the entry imports `callDatabaseFunction`. Only those three files do (`grep` of `*.ts`).

**Where a lifecycle gate could sit, and what each placement covers / misses:**

1. **Edge entry after `resolveCaller`** (each `index.ts`). Covers HTTP callers of that function. Misses: any new function that forgets the check; **service-role `POST /rest/v1/rpc/<fn>`** (no TypeScript); **operator SQL** (`createOrganizationAsOperator` etc.); loop-only `sendDiscoveryMessage`; Auth itself (sign-in, unlink).
2. **Shared decision module** (new function beside `ngoOnlyActionAllowed`, imported by edge + fixture). Loop-tier green would grade the same code the edge runs. Same misses as (1) for every path that never imports TypeScript.
3. **Definer function body** (backstop, same shape as `complete_signup`’s `platform_admin` raise and `create_organization`’s type re-read). Covers every RPC caller including a raw service-role key. Misses: operator `INSERT`/`UPDATE` that never calls the function; table writes with no definer (`createProjectAsOperator` is a raw insert); Auth endpoints.
4. **BEFORE trigger on writable tables.** This is how AT-001.37 already covers “any path including an operator insert” (`20260811125000_...sql` lines 35–40). Covers operator SQL. A trigger sees `NEW`/`OLD`, not the JWT: it can refuse writes **to** a deactivated account’s rows; it cannot see “who is writing” on an operator connection (`auth.uid()` is null). `FORCE ROW LEVEL SECURITY` is **refused** by the catalog scan (`_policy-scan.ts` 306–311), so the operator (table owner) is meant to bypass RLS.
5. **RLS policy.** `service_role` has `BYPASSRLS`. Owner bypasses unless FORCE, and FORCE is banned. `authenticated` holds **SELECT only** after overlay. Policies do not sit on today’s write path at all.

The deliverable’s stated design (`loop/decomp/req-001.md` D6.L2): **one mandatory boundary every write route registers with**, plus a **conformance check that fails an unregistered write route**, so AT-001.29 stays true as later waves add routes. That is a **registry + static scan**, not a trigger: enumerate write routes from the tree (directory listing + `callDatabaseFunction` import + `[functions.<name>]` in `config.toml`) and fail CI if one is missing from the gate list. Precedent: `_source-scan.ts` and `_policy-scan.ts`.

**How a write route is “registered” today:** there is **no write-route registry**. Presence is:

- directory `supabase/functions/<name>/index.ts` (six names; `_shared/` is not a function);
- `[functions.<name>]` `verify_jwt = …` in `config.toml` 490–506, “stated rather than inherited”.

**Service-role REST writes to tables:** after overlay, `service_role` has SELECT on `accounts` and `org_memberships` only, and **no INSERT/UPDATE/DELETE/TRUNCATE** on any public table (`20260906120000_...sql` 46–60). Direct table writes with the service-role key are privilege-denied. Writes go through definers running as owner.

**Operator path (no TypeScript):** live adapter uses the postgres connection (`sqlClient(stack)`). Used for Givens and probes: unseated org insert, membership insert/update, project insert, assignee update, `platform_admin` account insert, `auth.identities` insert, retype. Hits triggers + unique indexes + FKs. Does **not** hit edge functions, shared modules, or RLS.

**Loop-tier write:** `_fixture.ts` `completeSignup` / `createOrganization` / `updateOrganization` (655–1118) call the **same** shipped judgements, then mutate Maps. `resolveCaller` here renders a fake `/auth/v1/user` body and still calls `callerFromAuthAnswer`. Operator methods **mirror** trigger/index behaviour in TypeScript and say so (`_fixture.ts` 1137–1145): the integration tier is the oracle for that prediction.

**Harness dispatch:**

- Loop: `createHarness` (`tests/at/harness/index.ts` 227–231) → `loadAdapter` → `_fixture.ts` `createFixtureAdapter`.
- Integration: requires `_live.ts` (`liveAdapterExists`); `createLiveAdapter({ stack })` (`index.ts` 234–241). Registration under confirmations issues **no** session; bodies follow register → emailed link → sign-in.
- Suite binding: `bindSuite({ requirement: 'req-001', sut: 'accounts' })` in `_bind.ts` 34–40. Types come from `suite-adapters.ts` map entry `'req-001': typeof import('.../_fixture.ts')`. Adding a **method** means extending `AccountsSut` and implementing it on **both** adapters. Adding a **new sut key** means a new key on `sut: { accounts, … }` **and** a new `bindSuite` (or a second suite). Today there is one key: `accounts`.
- Pending ids: `notLanded(leaf)` throws `AtPending(ctx.atId, 'sut-missing', …)` (`_pending.ts` 86–90). Same function at both tiers (no per-tier map).

**Red by shape:** `AtPending` message is `` `${atId} PENDING [${phase}] — ${detail}` `` (`pending.ts` 3–12). Vitest prints `AtPending: AT-001.25 PENDING [sut-missing] — …`. Ledger (`expected.ts` 286–296) rebuilds only the prefix `AtPending: ${id} PENDING [${phase}] — ` and `startsWith`s it. Tail is free. A green where red was declared fails. A different red (assertion, `CapabilityPending`, timeout) fails. Other shape: `capability-pending` matches the **whole** first line `CapabilityPending: CAPABILITY PENDING — <names>`.

**Auth on the local stack (what this tree actually uses):**

- Identities: GoTrue `/auth/v1/user` JSON `identities[]`. Extractor + SQL backstop both read `identity_data->>'user_name'`. Live Given: operator INSERT into `auth.identities` with `${json}::text::jsonb` (`_live.ts` 285–303).
- Link/unlink: `enable_manual_linking = true` (`config.toml` 212). Comments at 206–211: the same flag opens Auth’s **unlink** surface; nothing in `supabase/functions/` calls link or unlink. Founder ruling recorded in the item brief: volunteer GitHub link is permanent; refusal must sit where Auth deletes the identity row, or in front of it. No call site for `DELETE /auth/v1/user/identities/...` exists in this tree.
- Admin API: **one** use — live `provisionPlatformAdmin` `POST /auth/v1/admin/users` with service role and `email_confirm: true` (`_live.ts` 785–808), then operator `INSERT INTO public.accounts (id, account_type) VALUES (…, 'platform_admin')`. Service role has no INSERT on `accounts`; that insert is the operator connection. Then password grant for a real session.
- Auth hooks: `[auth.hook.before_user_created]` and `[auth.hook.custom_access_token]` are **commented out** (`config.toml` 326–333).
- Bans: **no** `banned_until` / `ban_duration` usage in this tree.
- Rate limits: `[auth.rate_limit]` `email_sent = 2`, `sign_in_sign_ups = 30` per 5 minutes per IP, plus refresh/OTP/web3 (`config.toml` 229–243). Measured on the verification leaf (`loop/items/AI4DEV-59/stack-up.txt` 57–65): running auth container had `GOTRUE_RATE_LIMIT_EMAIL_SENT=360000` while the file said `2`. CLI did not push the file value. AT-001.34 names the **sign-in** cap; whether local GoTrue honours `sign_in_sign_ups = 30` is **not measured in this tree**.
- Sessions: `jwt_expiry = 120` (`config.toml` 180); `enable_confirmations = true` (273); logout modelled as `POST /auth/v1/logout?scope=local` (`_live.ts` 322–330). `[auth.sessions]` timebox/inactivity commented out.

**Privilege posture and the two catalog checks:**

Stated once in `20260906120000_...sql` lines 3–23. Overlay:

- `revoke all` on all six public tables from `anon`, `authenticated`, **and** `service_role`;
- `grant select` on `organizations`, `org_memberships`, `projects`, `acknowledgments` to `authenticated`;
- `grant select` on `accounts`, `org_memberships` to `service_role`;
- all policies `FOR SELECT TO authenticated`; none `FOR INSERT/UPDATE/DELETE`;
- non-viewer definers: EXECUTE to `service_role` only; `viewer_*`: EXECUTE to `authenticated` (+ `service_role` in the SQL).

**Static check** (`_policy-scan.ts`): reads `supabase/migrations/*.sql` in name order, splits statements (comments, dollar quotes, strings), overlays later grants/revokes/drops. `TENANT_CATALOG` is the **expectation**, not derived. Refuses: undeclared `create table public.*`, grant to anon/public, grant on all tables, `alter default privileges`, FORCE RLS, tautological `USING`, policy `to anon` / `for all`, USING that names neither `auth.uid()` nor `public.viewer_*`, missing baseline `revoke all … from anon, authenticated` after create, isolated table not exactly `{select}` for authenticated, unreachable table with leftover authenticated grants, `service_role` remaining **write** privs in `{insert,update,delete,truncate,all}`, definer without revoke from public, non-viewer definer EXECUTE to a client role. Runs at **loop** (CI).

**Live check** (`tenantTableFacts` + `assertTenantCatalog`): `pg_class` every `public` relation; `has_table_privilege` for all **seven** privs including truncate/references/trigger; `relforcerowsecurity`; `pg_policies`; `has_function_privilege` EXECUTE for anon/authenticated on every `prosecdef` function. Walks **both ways**: a live table absent from `TENANT_CATALOG` fails; a catalog key with no live row fails. Pins exact remaining sets: anon `[]`; service_role `{select}` on `accounts`/`org_memberships` else `[]`; isolated authenticated `{select}`; unreachable authenticated `[]`; viewer functions are the only definers executable by `authenticated`.

**Gap vs leftover REFERENCES/TRIGGER:** static `WRITE_PRIVS` does **not** include `references` or `trigger`. A leftover `REFERENCES` grant to `service_role` would pass the static scan and fail the live exact-set assertion. Historical residue (AI4DEV-58 `migration-replay.txt` 154–169): after the first two migrations, `anon`/`authenticated`/`service_role` still held REFERENCES+TRIGGER+TRUNCATE on the first four tables from Supabase `ALTER DEFAULT PRIVILEGES`. `20260906120000` `revoke all` is intended to clear that. Brief fact 4: unit 4 may already be done on `main`; measure before writing another migration. Catalog checks cover **`public` only**, not `auth.users` / `auth.identities`.

**History preservation if an NGO seat moves from account A to account B:**

| Table | Attribution today | If membership `account_id` is UPDATEd (repoint) | If A is DELETEd (`ON DELETE CASCADE` from `auth.users`) |
|---|---|---|---|
| `acknowledgments` | `account_id` = signer | Unchanged: still A. Correct “original acting humans”. | Rows **deleted**. History gone. |
| `org_memberships` | `(org_id, account_id)` seat; unique on `org_id` alone | Seat becomes B; `created_at` of that row remains if UPDATE. Trigger requires B is `ngo`. Cannot hold A and B at once. | Seat row deleted; org can remain. |
| `projects` | `org_id`; `assigned_volunteer_id` is a **volunteer**, not the NGO | Unchanged if `org_id` stays. No `created_by`. | Assignee SET NULL if that volunteer is deleted; NGO delete of A does not delete projects. |
| `volunteer_profiles` | PK = volunteer `account_id` | NGO transfer does not touch. | Volunteer delete cascades the profile. |

Deactivate-without-delete (AT-001.25) is the only shape that keeps acknowledgment rows on A while the seat moves to B. There is **no** lifecycle column to record deactivation today (`accounts` is `id, account_type, created_at` only — `20260808120000_...sql` 13–14, 38–42). `complete_signup` is what **inserts** the account row; there is no trigger on `auth.users`.

`has_platform_acknowledgment` is a SECURITY DEFINER SQL predicate (`20260808120000_...sql` 93–106). Nothing product-side calls it. Loop fixture reimplements the rule over Maps; integration calls the SQL (`_live.ts` 763–767). Project creation is still unlanded.

Role-change audit is explicitly deferred (`20260811125000_...sql` line 31) to AT-001.33.

### Files Read

- `supabase/functions/_shared/edge.ts`, `caller.ts`, `accounts.ts`, `memberships.ts`, `github.ts`, `tenant-reads.ts`, `public-project.ts`, `verification.ts`
- `supabase/functions/complete-signup/index.ts`, `create-organization/index.ts`, `update-organization/index.ts`
- `supabase/functions/organization-dashboard/index.ts`, `project-workspace/index.ts`, `public-project/index.ts`
- All seven files under `supabase/migrations/` plus `README.md`
- `supabase/config.toml` (auth, rate_limit, hooks, `[functions.*]`)
- `tests/at/suites/req-001/_source-scan.ts`, `_policy-scan.ts`, `_pending.ts`, `_bind.ts`, `_contract.ts`, `_fixture.ts` (write + operator sections), `_live.ts` (write + operator + admin), `_live-tenant-reads.ts`, `_integration.ts` (catalog assert + live public order)
- `tests/at/suites/req-001/e-admin-operations.test.ts`, `f-lifecycle-and-audit.test.ts`, `c-membership-and-acknowledgment.test.ts` (AT-001.17 source arm), `d-tenant-isolation.test.ts` (static scan at loop)
- `tests/at/harness/policy-scan.selftest.ts`, `expected.ts`, `pending.ts`, `suite-adapters.ts`, `index.ts` (adapter load), `live-stack.ts`, `registry.ts` (AtPending / atTest)
- `tests/at/expected/req-001.json`
- `.taskmaster/docs/acceptance/at-req-001.md` sections F–H
- `loop/decomp/req-001.md` D6
- `loop/items/AI4DEV-56/brief.md`
- `loop/items/AI4DEV-58/migration-replay.txt` (leftover privs)
- `loop/items/AI4DEV-59/stack-up.txt` (email rate-limit env)

### Boundaries

- **In:** HTTP POST to `/functions/v1/<name>` with JWT (writes + authenticated reads); anonymous POST to `public-project`; service-role POST to `/rest/v1/rpc/<definer>`; operator SQL on the postgres connection; GoTrue `/auth/v1/signup`, `/token`, `/user`, `/logout`, `/recover`, `/admin/users`.
- **Out:** JSON `{ ok, … }` or `{ ok: false, reason[, kind] }`; database rows in the six public tables; Auth rows in `auth.users` / `auth.sessions` / `auth.identities`; mail in the local catcher.
- **To the harness:** `AccountsSut` is the only REQ-001 sut. Loop Map vs live HTTP/SQL. Operator methods exist because product paths cannot construct AT-001.16/36/32 Givens (every product path seats the creator; unique index then refuses a second seat; no product project creation).
- **To Auth:** identity facts (`id`, `identities[]`, `email_confirmed_at`) are **read**, never written, by product code. Linking in tests is operator SQL (live) or a Map field (loop). Unlink is Auth’s surface, uncalled.
- **Not connected:** UI (`src/`) has **zero** references to the three write function names. Discovery send is a stand-in. Concierge onboarding (AT-001.28) has no surface; `create-organization` is the org-creation path today. Virtual keys (AT-001.30/31 × REQ-009/030) are mentioned in no `supabase/` file.

### Non-Obvious Things

- **Service role cannot INSERT `platform_admin`.** By design: no table INSERT for `service_role`; definers refuse that type; provisioning is a **narrower** operator insert (`_contract.ts` 794–807). Granting the service role INSERT to “make admin provisioning work” would punch a hole past `complete_signup`.
- **PostgreSQL default EXECUTE on new functions is PUBLIC.** Every definer migration revokes then grants. First replay found `anon` could RPC `complete_signup`. Drop+recreate **drops the grants**; later migrations restate revoke/grant.
- **`revoke all` is what makes “no privilege” true**, not the absence of a GRANT. Default privileges left REFERENCES/TRIGGER/TRUNCATE on new public tables (measured, not reasoned).
- **`btrim` without a character set strips spaces only.** Tab-only names/handles survived until explicit whitespace sets / `!~ '^\s*$'`.
- **Registration issues a session in the loop fixture and none on the live stack** (`enable_confirmations = true`). Declared divergence. Integration bodies must sign in after the emailed link.
- **Live `signOut` keeps cached tokens** so the next write actually hits Auth with a revoked JWT (`_live.ts` 307–316). Deleting the handle would make AT-001.12 test the adapter, not the stack.
- **`sendDiscoveryMessage` is a write with no edge function.** A lifecycle registry over `supabase/functions/*` would miss it unless the stand-in also consults the gate.
- **`has_platform_acknowledgment` is a hook, not a gate.** Calling it from `create-organization` would invent a requirement AT-001.01 does not ask for (ack before **project** creation).
- **Content pin for authority attestation lives only in TypeScript.** Database floors nonblank. Service-role RPC can store a nonblank non-shipped statement (accepted residual in the identity migration).
- **Source-scan is a naming oracle**, not a semantic one. A renamed invite route escapes it; that residual is stated. It throws if `src/routes/` is missing or empty so a broken instrument cannot report absence.
- **Policy-scan selftest is the negative-direction proof:** synthetic weakening of a valid catalog must produce each `code`; overlay of a later revoke clears an earlier grant; empty/missing directory throws. `_source-scan.ts` has **no** dedicated selftest file.
- **AT-001.32 lives in the lifecycle test file** but is already green; D6 ids around it are still `notLanded`.
- **No UI talks to the DB.** Operator SQL is test-only. Product writes are edge → service-role RPC → definer.

### Open Questions

- I did not run the live catalog against a running stack, so I cannot confirm leftover REFERENCES/TRIGGER/TRUNCATE are gone **on this machine**. The overlay SQL and the live exact-set assertions **should** make them gone on `public`; unit 4 of the brief says to measure before migrating.
- I did not find a documented GoTrue unlink URL in this repo. Standard GoTrue is `DELETE /auth/v1/user/identities/{id}`; that is an inference, not a call site.
- I did not measure whether local GoTrue honours `sign_in_sign_ups = 30`. The only rate-limit measurement in-tree is `GOTRUE_RATE_LIMIT_EMAIL_SENT=360000` vs file `email_sent = 2`.
- I did not read `supabase/seed.sql` or Auth’s `auth` schema grants. Catalog checks do not cover `auth.*`.
- I could not determine how a server-side unlink refusal would hook GoTrue in this CLI version (hook vs proxy vs replacing unlink). `[auth.hook.*]` is unused. That is a design choice the brief assigns to the arena.
- Whether AT-001.30/31 key-revocation clauses should be `capability-pending` on a named capability (pattern used for OAuth/Discovery) or a stub is a founder question in the brief; nothing in `supabase/` implements keys.
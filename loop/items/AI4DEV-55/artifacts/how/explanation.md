# How ai4good decides what a caller may see today

Synthesis of four explorer reports (data model, request path, harness, reference branch) for the tenant-isolation deliverable. Contradictions were checked against the tree at `/home/user/ai4good`. Line numbers are from that checkout on 2026-09-05.

## Overview

The repository has no tenant read path. Six tables exist in `public`. Row-level security is on for all six. There are zero policies (`grep -i "create policy" supabase/migrations/*.sql` returns nothing). Client roles hold almost no privileges. The result is a database that denies every read from a client key, including a caller's read of their own account row. Three edge functions exist, and all three are writes. The front end is one heading at `/`. The five tenant acceptance ids (AT-001.21, .22, .23, .24, .40) throw `AtPending` at both tiers by declaration.

So "who may see what" today has a short answer: the service role and the operator connection see everything, and nobody else sees anything. The first migration says this on purpose: the tenant-isolation policy set is this deliverable's job (`supabase/migrations/20260808120000_accounts_org_membership_and_acknowledgments.sql` lines 318-322). The design that follows must add grants and policies, choose whether reads go through edge functions or through PostgREST with the caller's JWT, and give the harness a way to read as a specific signed-in user. A complete prior attempt exists on an unmerged branch (`.claude/worktrees/ref-66`); its decisions carry, its code does not.

## Key Concepts

- **Two denial layers.** Postgres privilege (`GRANT`/`REVOKE`) runs first. If the role has no privilege, the error is `permission denied for table X` and RLS never runs. If the role has the privilege, RLS runs; with no policy, SELECT returns zero rows and INSERT fails with `new row violates row-level security policy`. Both layers are load-bearing and the tree keeps them distinct on purpose (first migration lines 324-338).
- **Roles.** `anon` (publishable key, no user), `authenticated` (user JWT), `service_role` (BYPASSRLS), and the operator `postgres` connection (`bypassrls=true`, not superuser). Only `anon` and `authenticated` are ever constrained by policies.
- **`account_type`** is a column on `public.accounts` (`ngo | volunteer | platform_admin`), never a JWT claim. There is no custom access token hook, and no migration calls `auth.uid()`. A policy that needs the caller's type must join `accounts`.
- **Tenancy shape.** An NGO owns organisations through `org_memberships` (one seat per org, NGO accounts only, enforced by a unique index and a trigger). A volunteer is tied to a project only through `projects.assigned_volunteer_id`. A platform admin cannot sit in `org_memberships` and has no read reach at all today.
- **`Caller`** (`supabase/functions/_shared/caller.ts` lines 58-69) is `{ id, githubHandle }`, built by `callerFromAuthAnswer` from GoTrue's `/auth/v1/user` answer. Edge functions never decode the JWT themselves.
- **SECURITY DEFINER RPCs** (`complete_signup`, `create_organization`, `update_organization`) are the only writers. `service_role` alone may EXECUTE them; `service_role` holds no INSERT/UPDATE/DELETE on any table.
- **Tiers.** Loop: shipped TypeScript decisions over in-memory `Map`s, no database. Integration: a rebuilt local Supabase stack, deployed functions, real Auth, operator SQL.
- **`--expect` manifest** (`tests/at/expected/req-001.json`): declares each id green or red per tier. A declared red that turns green fails the run.

## How It Works

### 1. The database: fail-closed by construction

Every table enables RLS in its own migration (`20260808120000` lines 313-316; `20260809090000` line 132; `20260811130000` line 110). No table has `FORCE ROW LEVEL SECURITY`. No `CREATE POLICY` exists anywhere.

Privileges today, from the migrations:

| Table | Client role privileges | Service role | Effect for a client read |
|---|---|---|---|
| `accounts` | `authenticated`: SELECT, INSERT (`20260808120000` line 338) | SELECT (line 353) | RLS runs, returns zero rows |
| `organizations` | none | none | privilege denial |
| `org_memberships` | none | SELECT (`20260811125000` line 202) | privilege denial (measured: 401, `permission denied`, `_integration.ts` lines 980-994) |
| `acknowledgments` | none | none | privilege denial |
| `volunteer_profiles` | `REVOKE ALL` from anon, authenticated, service_role (`20260809090000` line 443) | none | privilege denial |
| `projects` | `REVOKE ALL` (`20260811130000` line 123) | none | privilege denial |

The `accounts` grant looks backwards and is explained in place: it exists so that the AI4DEV-57 proof could show RLS as the refusing layer, not so clients can read their row. They cannot. `service_role` SELECT on `accounts` and `org_memberships` exists for two edge-function lookups, and because the service role bypasses RLS those reads see every row.

Two facts matter for the design. `auto_expose_new_tables` is unset, so a new table gets no client DML by default; but `ALTER DEFAULT PRIVILEGES` still hands `REFERENCES`/`TRIGGER`/`TRUNCATE` to the three roles, which is why the two newest tables `REVOKE ALL` first. And `service_role` never reads through policies, so a policy on `accounts` or `org_memberships` will not constrain `create-organization` or `update-organization` unless those reads move to the caller's JWT.

### 2. The edge functions: writes only, service role everywhere

Three functions, all `verify_jwt = true` (`supabase/config.toml` lines 489-496): `complete-signup`, `create-organization`, `update-organization`. The request path is the same for each.

```mermaid
sequenceDiagram
  participant C as Client (test or browser)
  participant K as Kong (verify_jwt)
  participant F as Edge function
  participant A as GoTrue /auth/v1/user
  participant P as PostgREST (service role)
  participant D as Postgres

  C->>K: POST /functions/v1/name, apikey=anon, Bearer user JWT
  K->>K: verify signature; 401 if bad
  K->>F: edgeHandler (edge.ts:96)
  F->>A: resolveCaller (edge.ts:163): GET /auth/v1/user with same Authorization
  A-->>F: 200 user | 403 dead session
  F->>F: callerFromAuthAnswer (caller.ts:111) -> Caller | null (401)
  F->>P: lookup accounts / org_memberships (service role)
  F->>F: pure decision (accounts.ts / memberships.ts)
  F->>P: callDatabaseFunction (edge.ts:272): POST /rest/v1/rpc/name, service role
  P->>D: SECURITY DEFINER re-checks, writes
  D-->>C: {ok:true,...} | {ok:false,reason[,kind]}
```

Kong checks the signature; the function asks GoTrue who is calling and whether the session is live. `callerFromAuthAnswer` is fail-closed: any non-2xx or malformed body is `null`, and the function answers 401. GoTrue itself returns 403 for revoked or expired tokens; the function still says 401.

The authorisation decisions are pure TypeScript: `ngoOnlyActionAllowed` (`supabase/functions/_shared/accounts.ts` lines 327-345, refuses volunteers and `platform_admin`) and `orgAdminActionAllowed` (`supabase/functions/_shared/memberships.ts`, kinds `not-a-member` | `not-an-admin`). The lookups feeding them use the service role (`create-organization/index.ts` line 57; `update-organization/index.ts` line 62). The write goes through `callDatabaseFunction` with the service role (`edge.ts` lines 272-286). The caller's JWT never reaches PostgREST. RLS is not on this path at all; the definer functions are the database backstop.

One precedent matters for "no existence oracle". `update-organization` answers 403 `kind: not-a-member` for both a missing organisation and an organisation the caller does not belong to. The definer RPC underneath distinguishes 23503 from 42501, but only `service_role` can call it. That is an accepted residual (`loop/items/AI4DEV-62/gate2-rulings.md` R1). `_contract.ts` lines 574-579 say explicitly that a green here is operation-surface isolation, not read isolation.

### 3. The front end: one public heading, no session

`src/routeTree.gen.ts` declares one path, `/` (line 15). `src/routes/index.tsx` renders `<h1>ai4good</h1>`. `src/routes/__root.tsx` renders a 404 for anything else. There is no `beforeLoad`, no redirect, no route guard, no sign-in route. `@supabase/supabase-js` is a devDependency only; nothing under `src/` imports it, reads `import.meta.env`, or holds a token. AT-001.24 ("authenticated surfaces redirect to sign-in") names two things that do not exist: an authenticated surface and a sign-in target.

Three written intents for future reads conflict: the project rule "UI never touches the DB, always an edge function" (`CLAUDE.md`); the migration notes saying the project page and NGO dashboard read via `@supabase/ssr` + RLS; and `src/lib/api/example.functions.ts` telling Lovable to use `createServerFn` instead of edge functions. The tree implements none. The design must pick.

### 4. The acceptance harness at both tiers

`bun run at:verify req-001 --tier <loop|integration> [--expect]` runs `tests/at/harness/runner.ts`. Before Vitest, it checks the bijection between `(P0)` ids in `.taskmaster/docs/acceptance/at-req-001.md` and `atTest('AT-…'` call sites, and with `--expect` it validates `tests/at/expected/req-001.json`. Integration additionally locks the one local stack, runs `supabase db reset --local`, proves the migration set, and passes `AT_SUPABASE_URL`, `AT_SUPABASE_DB_URL`, `AT_SUPABASE_ANON_KEY`, `AT_SUPABASE_SERVICE_ROLE_KEY`, `AT_SUPABASE_MAIL_URL` to the child.

`atTest` (`tests/at/harness/registry.ts`) registers one Vitest `it` per id. A body is either one function (runs at every tier) or a per-tier map `{ default, integration }`. The five tenant ids are single `notLanded(LEAF.D5_L1 | D5_L2)` bodies (`tests/at/suites/req-001/d-tenant-isolation.test.ts` lines 14-22), so they throw `AtPending(id, 'sut-missing', …)` at both tiers, and `req-001.json` declares them red `sut-missing` at both (lines 30-34 loop, 73-77 integration). Landing them means replacing the bodies and moving the ids to `green` in the same change, then dropping `D5_L1`/`D5_L2` from `LEAF` in `_pending.ts` (lines 62-63).

**Loop tier** loads `tests/at/suites/req-001/_fixture.ts`. Storage is in-process `Map`s. Product judgements come from the shipped modules (`callerFromAuthAnswer`, `orgAdminActionAllowed`, `validateCompleteSignup`). Operator writes predict the trigger and index in TypeScript. The file header (lines 34-36) says what is not proved: the migration, RLS, Auth configuration. A loop body that "filters rows by org" grades the adapter, not Postgres. Loop can prove a shipped pure decision function and the shape of an edge-function response; it cannot prove any policy, grant, or PostgREST behaviour.

**Integration tier** loads `tests/at/suites/req-001/_live.ts`. `Session` (`_contract.ts`) has no token; `_live.ts` keeps `{ accessToken, refreshToken }` in a private `Map` (line 107) and only SUT methods reach it through `tokensOf` (line 112). Today the live adapter reaches the database three ways:

1. **Edge function with the caller's JWT**: `functionPost` (`tests/at/harness/live-stack.ts` lines 101-121) sends `apikey: anonKey` and `Authorization: Bearer <access token>`. This is how AT-001.16/.36/.37 act. The function then reads with the service role, so this proves the TypeScript rule, not RLS.
2. **Operator SQL**: `sqlClient` (`live-stack.ts` line 275) opens `stack.dbUrl` as `postgres` with `bypassrls=true`. Every read-back (`membership`, `organization`, `membershipsOf`) is this path. It sees every row and cannot deny a cross-tenant read.
3. **Raw PostgREST fetch**: AT-001.17 arm 2 (`_integration.ts` lines 980-994) fetches `/rest/v1/org_memberships` with the anon key as both `apikey` and Bearer, and pins 401 + `permission denied`. There is no `restGet` helper and no SUT method that reads as the caller.

**Exactly how a test body can read as a specific signed-in user today.** Loop: it cannot; the best it can do is call the shipped decision function with the caller's standing and assert the answer, or drive a fixture surface that delegates to that function. Integration: the only RLS-exercising option is a PostgREST GET with `apikey: AT_SUPABASE_ANON_KEY` and `Authorization: Bearer <that user's access token>`. The token comes either from a fresh password grant via `authPost(stack, '/auth/v1/token?grant_type=password', …)` (`live-stack.ts` line 82) or from a new `AccountsSut` method that calls `tokensOf` internally. Under RLS with no matching policy, a keyed GET returns `[]` for both "not yours" and "not found", which is the no-oracle shape for free; a privilege denial returns 401 and must be kept distinct from `[]`. Anything through `sqlClient` or the service-role key bypasses RLS and proves nothing about isolation.

### 5. Which named surfaces exist today

The acceptance text names drafts, ledger, files/reference files, comment thread, dashboard, tasks, and the public project page. Grep of `supabase/migrations` and `src/routes` for `drafts|ledger|thread|reference_files|tasks|dashboard` matches only a README sentence. The tables are `accounts`, `organizations`, `org_memberships`, `acknowledgments` (`20260808120000` lines 38, 47, 57, 72), `volunteer_profiles` (`20260809090000` line 120) and `projects` (`20260811130000` line 57). The routes are `__root.tsx` and `index.tsx`.

| Named surface | Exists today? | Owner |
|---|---|---|
| drafts | No table, no route | REQ-003 |
| ledger / fuel transactions | No | REQ-006 |
| files / reference files | No table; no storage bucket in `config.toml` | REQ-032 |
| comment thread | No | REQ-015 |
| dashboard | No; a UI aggregation, not a table | REQ-013/014 |
| tasks | No; Linear, not Postgres | REQ-026 |
| public project page / listings | No route; `projects` has no visibility or lifecycle column | REQ-010/011 |

The honest tenant rows today are organisations, memberships, acknowledgments, volunteer profiles, and a project's identity plus assignee. Anything else the ids name must be a documented stand-in or a catalog tripwire over tables that do not yet exist.

### 6. What the reference branch decided (ideas that carry)

`.claude/worktrees/ref-66` holds a complete but never-merged attempt (item AI4DEV-66). Its harness code cannot be pasted: it targets the retired slot pool (`db-pool.ts`, `AT_DB_SLOT`, `backedSutMethods`) and main now has one stack with `createLiveAdapter({ stack })`. Its decisions still fit main, because main's schema and routes have not moved:

- One pure decision `tenantReadAllowed(viewer, scope)`: platform admin always; NGO only with a role in the target organisation; volunteer only if assigned to this project; otherwise refused.
- One exported constant `TENANT_NOT_FOUND` (404, one sentence) returned for both "no such row" and "not yours"; handlers have nowhere to put a second refusal, and tests compare the two responses byte for byte. `edgeHandler` turns throws into 502, so the constant is returned, never thrown.
- Target row read last, so an outage cannot depend on existence.
- Public project page is a separate `verify_jwt = false` function that reveals existence on purpose, returning a field-by-field projection.
- SQL side: `GRANT SELECT … TO authenticated` first (otherwise policies never run), then permissive SELECT policies that OR: org member via a `viewer_is_org_member(uuid)` definer helper, assigned volunteer via `assigned_volunteer_id = auth.uid() AND viewer_is_volunteer()`, platform admin via `viewer_is_platform_admin()`. Helpers must be EXECUTE-granted to `authenticated`, unlike the write-path RPCs. `anon` gets nothing. Acknowledgments are own-account only.
- Edge reads still used the service role, so the TypeScript rule and the SQL policies are two rules proved separately: edge functions prove the first, PostgREST-as-user listings prove the second, with positive controls so empty listings cannot pass.
- A catalog tripwire: every `public` table is declared either unreachable by client roles or tenant-isolated, and isolated tables have RLS on, a grant, and no `USING (true)`.
- AT-001.24 at integration was declared `capability-pending` on a UI rendering capability, because `--wired` exits 3 and there is no browser driver.
- Integration never ran on that branch; the merge did not happen. Main's one stack removes that blocker.

## Where Things Live

- `supabase/migrations/` — five migrations; RLS enables, grants, definer RPCs, triggers. Start with `20260808120000_…` lines 300-370 for the access posture.
- `supabase/functions/_shared/edge.ts` — `edgeHandler`, `resolveCaller`, `callDatabaseFunction` (Deno I/O, service role).
- `supabase/functions/_shared/caller.ts`, `accounts.ts`, `memberships.ts` — pure decisions shared with the loop fixture.
- `supabase/functions/{complete-signup,create-organization,update-organization}/index.ts` — the three writes.
- `supabase/config.toml` — `[functions.*] verify_jwt`, auth settings, `auto_expose_new_tables` unset.
- `src/routes/` — `__root.tsx`, `index.tsx`; `src/routeTree.gen.ts`.
- `tests/at/harness/` — `runner.ts`, `registry.ts`, `expected.ts`, `live-stack.ts` (`functionPost`, `authPost`, `sqlClient`), `local-stack.ts`.
- `tests/at/suites/req-001/` — `_contract.ts` (SUT types), `_fixture.ts` (loop), `_live.ts` (integration), `_integration.ts` (integration bodies), `_pending.ts`, `d-tenant-isolation.test.ts`.
- `tests/at/expected/req-001.json` — per-tier green/red declarations.
- `.claude/worktrees/ref-66/` — the reference branch; read `supabase/functions/_shared/visibility.ts` and the two `2026081[23]…` migrations there.

## Gotchas

1. **Grant before policy.** Without `GRANT SELECT … TO authenticated`, PostgREST fails at privilege and a policy is never evaluated. The `projects` and `volunteer_profiles` `REVOKE ALL` must be partially reversed for those tables to be readable.
2. **Service role and operator SQL bypass RLS.** Any test that reads through `sqlClient` or the service-role key cannot prove isolation. All current read-backs are this path.
3. **Do not grant `service_role` INSERT or `FORCE ROW LEVEL SECURITY` casually.** The first would make `complete_signup`'s `platform_admin` refusal skippable; the second would break operator provisioning of platform admins, unseated orgs, and projects.
4. **No `account_type` in the JWT.** Policies join `accounts`; because `accounts` has RLS and no policy, a helper reading it must be SECURITY DEFINER with `SET search_path = ''`, EXECUTE to `authenticated`, and must take no "other person" argument.
5. **Definer-helper grants differ from RPC grants.** The write RPCs are `service_role`-only; policy helpers must be callable by `authenticated` or every policy fails.
6. **Integration error classification is by message text first**, SQLSTATE on `errno` second (`_live.ts` `databaseRefusal`). `code === '42501'` mis-classifies.
7. **`functionPost` parses JSON.** A byte-for-byte no-oracle comparison needs a sibling that returns raw text.
8. **Live signup mints no session.** Integration bodies must register, follow the Mailpit link, then sign in (`registerConfirmAndSignIn`).
9. **AT-001.17's source scan** (`_source-scan.ts`) fails if a file under `src/routes/` is named like invite or add-member. New dashboard routes must not trip it. The CI territory guard also forbids one PR touching both `src/` and `supabase|tests|loop`.
10. **A declared red that turns green fails `--expect`.** Move ids in `req-001.json` in the same change as the bodies.
11. **`update-organization`'s 403 collapse is a write precedent, not a read policy.** Useful shape, not proof of D5.
12. **Assigned volunteer is not type-checked** on write. The reference branch added `viewer_is_volunteer()` on the read policy for that reason.

Open questions the explorers left and this synthesis did not close: whether PostgREST accepts a revoked-but-unexpired JWT; whether `organizations` and `acknowledgments` still carry leftover `REFERENCES`/`TRIGGER`/`TRUNCATE` default privileges (inferred, not dumped); how AT-001.24's redirect half can be proved without a browser driver; and which of the three read architectures (edge function, PostgREST + RLS, `createServerFn`) the design will choose.

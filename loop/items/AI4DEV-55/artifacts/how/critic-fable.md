# Architectural critique — the tenant-isolation leaf against the existing shape

Critic lane: fable. Read the explanation and the four explorer reports, then the code at
`/home/user/ai4good` and the reference checkout at `.claude/worktrees/ref-66`. Line numbers are from
those checkouts on 2026-09-05.

The tree is small and mostly honest about itself. The database is fail-closed by construction. The
write path has one clear doctrine: a pure TypeScript decision makes the user-facing refusal, a
SECURITY DEFINER function is the backstop, and the service role holds no table writes. That doctrine
is sound for writes. The problems below are about what happens when a READ path is added to a tree
that was designed around writes. Most of them are the same problem seen from four places: the tree
has no read architecture, so the deliverable has to choose one, and the reference branch chose one
that duplicates the rule.

## Findings

### 1. [structural] Two authorisation planes that cannot see each other: service-role edge reads and RLS policies

**Components**: `supabase/functions/_shared/edge.ts` (`callDatabaseFunction` 272-286, `resolveCaller`
163-205), `supabase/functions/create-organization/index.ts` (`accountTypeOf` 55-72),
`supabase/functions/update-organization/index.ts` (`roleIn` 60-81), the grants at
`20260808120000_…sql:353` and `20260811125000_…sql:202`, and on the reference branch
`_shared/visibility.ts` (`tenantReadAllowed` 165-220), `_shared/edge.ts` (`readRows`), the two policy
migrations `20260812120000` and `20260813120000`.

**Finding**: Every database read an edge function makes today uses the service-role key. The service
role has BYPASSRLS. So a SELECT policy added by this deliverable constrains PostgREST reads made with
the caller's JWT and constrains nothing an edge function does. The deliverable's own acceptance text
names two probes, "UI" and "direct API/ID probing". If the UI reads through an edge function (the
`CLAUDE.md` rule) and the probe reads PostgREST directly, the two probes hit two different rules. The
reference branch accepted that and wrote the rule twice: `tenantReadAllowed` in TypeScript for the
edge surface, and `viewer_is_org_member` / `viewer_is_platform_admin` / `viewer_is_volunteer`
policies in SQL for the Data API. Its own record shows the two drifted within the same item: the SQL
admitted any seated account while the TypeScript required `ngo` (gate-2 ruling 2), and the
assigned-volunteer type check was added on the SQL side only after a reviewer found it (slice-2
ruling 1). Its loop fixture then needed a third statement, `dataApiRead`, a hand-written mirror of
the SQL.

The write path duplicates its rule too (`complete_signup`, `create_organization`,
`update_organization` re-check in SQL). There the duplication is a backstop with a stated reason:
the service role can call the RPC with no TypeScript in the path. For reads that reason does not
hold. Nothing forces an edge read to use the service role. The function already holds the caller's
`Authorization` header (it forwards it to `/auth/v1/user` at `edge.ts:167-169`); forwarding the same
header to `/rest/v1/…` with `apikey: ANON_KEY` runs the read as `authenticated` and RLS runs. Then
one rule exists, in SQL, and the handler is a projection over whatever rows come back.

**Evidence**: `edge.ts:283` `Authorization: Bearer ${serviceRoleKey}` on every database call.
`update-organization/index.ts:68-69` same headers on the membership read. Reference branch
`organization-dashboard/index.ts` makes four `readRows` calls with `SERVICE_ROLE_KEY` and then calls
`tenantReadAllowed`; the four policies in `20260813120000` never run on that path. The reference
migration `20260812120000` adds `grant select on public.organizations to service_role` and
`grant select on public.projects to service_role` for those reads, so each new read surface widens
the RLS-bypassing read set.

**Impact**: Every tenant table this deliverable or a later one adds needs a policy AND a TypeScript
clause AND a fixture mirror, with a positive control on each so an empty listing cannot pass. The
reference branch needed seventeen adopted review findings across two gates and an audit, and a large
share of them were the two rules disagreeing. Reads made as the caller also make finding 6 mostly
disappear: a keyed GET under RLS returns `[]` for "not yours" and for "not found", so the
no-existence-oracle property becomes a database fact instead of a read-ordering discipline in each
handler. The cost is that `resolveCaller` stays (PostgREST checks signature and expiry, not session
revocation) and that `public.accounts` needs an own-row policy if a handler wants the caller's type
(finding 3).

**Where the deliverable should push back**: choose which layer is THE rule for reads before writing
either. If SQL is the rule, edge reads go as the caller and TypeScript holds no tenant decision. If
TypeScript is the rule, say plainly that the policies are the backstop for direct probing and grade
them as a backstop. "Both enforce" (reference branch decision C) is what produced the drift.

### 2. [structural] Client privileges are set per table, for local reasons, with no stated posture

**Components**: `20260808120000_…sql:324-353`, `20260809090000_…sql:443` (`revoke all` on
`volunteer_profiles`), `20260811130000_…sql:112-123` (`revoke all` on `projects`),
`supabase/config.toml:33` (`auto_expose_new_tables` unset).

**Finding**: Six tables carry four different client-privilege states. `accounts`: `authenticated`
holds SELECT and INSERT, granted so a 2026-08 proof could show RLS as the refusing layer
(`20260808120000_…sql:324-338`). `organizations` and `acknowledgments`: no grant and no revoke, so
they very likely still hold the REFERENCES, TRIGGER and TRUNCATE default privileges the later
migration measured and named (`20260811130000_…sql:112-116`). `org_memberships`: `service_role`
SELECT only. `volunteer_profiles` and `projects`: `revoke all` from all three roles. No migration
states the intended posture for a client role across the schema; each states its own table's reason.
The deliverable must now reverse `revoke all on public.projects` (the reference migration does, and
has to name the reversal in prose), keep `anon` at zero so AT-001.17 arm 2's pinned 401 stands
(`_integration.ts:980-994`), and decide what to do with an INSERT grant on `accounts` that exists for
a proof the tree says is superseded (`_fixture.ts` header: the AI4DEV-57 evidence "is SUPERSEDED").

**Evidence**: `grant select, insert on public.accounts to authenticated;` at
`20260808120000_…sql:338` with the comment that it exists so a message names the RLS layer. No
`revoke all` for `organizations` or `acknowledgments` anywhere under `supabase/migrations/`.
`revoke all on table public.projects from anon, authenticated, service_role;` at
`20260811130000_…sql:123`, reversed by `grant select on public.projects to authenticated` on the
reference branch.

**Impact**: Every new table is a fresh chance to land with TRUNCATE for `anon`. The deliverable's
first migration has to spend its opening paragraphs explaining privilege history instead of stating
the policy set. An INSERT privilege on `accounts` with no INSERT policy is harmless today and becomes
a footgun the day someone adds a permissive policy on that table for the own-row read finding 3
needs. The reference branch answered this with a runtime catalog tripwire
(`_catalog-conformance.ts`: every public table declared unreachable or isolated). That is the right
test, but it is testing for a posture the schema never declares.

**Where the deliverable should push back**: land one normalising step first: `revoke all` from the
three client roles on every table, then grant exactly SELECT where a policy will run. Drop the
`accounts` INSERT grant, and say the proof it served is superseded. Then the tripwire tests a stated
rule rather than reconstructing one.

### 3. [concern] The caller's account type is reachable only through a closed table, so every policy needs a definer helper

**Components**: `public.accounts` (RLS on, no policy, `20260808120000_…sql:313,318`),
`supabase/config.toml` (no `[auth.hook.custom_access_token]`), reference migrations
`20260813120000` (`viewer_is_platform_admin`, `viewer_is_volunteer`) and `20260812120000`
(`viewer_is_org_member`).

**Finding**: `account_type` is a column, never a JWT claim. `accounts` has RLS with no policy, so a
policy expression that reads it as the querying role sees nothing. The reference branch therefore
wrote three SECURITY DEFINER helpers and granted EXECUTE to `authenticated`, the opposite of the
grant posture every other function in the schema carries (`service_role` only,
`20260808120000_…sql:370-376`, `20260811125000_…sql:206-207`). The reference migration says the
helpers are safe because they take no "other person" argument. That is a discipline every future
helper must remember, not a structure.

The helper is forced only because `accounts` stays closed to its own owner. An own-row policy
(`id = (select auth.uid())`) lets a policy on `projects` write
`exists (select 1 from public.accounts where id = auth.uid() and account_type = 'volunteer')` as the
querying role, with no definer and no RPC exposure. The recursion argument for `viewer_is_org_member`
holds only if the `org_memberships` policy itself reads `org_memberships`; an own-rows policy
(`account_id = auth.uid()`) does not recurse, and under the single-seat invariant it admits the same
set of rows as "anyone seated in the organisation". A custom access-token hook that stamps
`account_type` into the JWT is the other way out, and it is the one that scales to many tables.

**Evidence**: `grep -n "auth.uid()" supabase/migrations/*.sql` returns nothing on main. Reference
`20260813120000` comment: "`public.accounts` carries row-level security with NO policy … so a
`security definer` function". Reference `20260812120000`:
`grant execute on function public.viewer_is_org_member(uuid) to authenticated, service_role;`.

**Impact**: Three definer functions callable from `/rest/v1/rpc/` by any signed-in user, each a
future place for an argument to creep in. Two EXECUTE-grant postures in one schema, which a reader of
the first migration's "revoke then grant to service_role" paragraph will copy wrongly (the reference
branch's own comment warns of exactly this). The deliverable inherits "accounts has no policy" as if
it were a decision; it was a default nobody had to revisit until now.

### 4. [concern] The harness has no seam that reads as the caller, and the loop tier cannot express RLS at all

**Components**: `tests/at/suites/req-001/_contract.ts` (`Session` 174-194, read-backs 697-721),
`tests/at/suites/req-001/_live.ts` (`tokensOf` 106-120), `tests/at/harness/live-stack.ts`
(`functionPost` 101-121, `sqlClient` 275-279), `tests/at/suites/req-001/_integration.ts:980-994`,
`tests/at/suites/req-001/_fixture.ts` (header).

**Finding**: `Session` carries no token; tokens live in a private `Map` inside the live adapter and
only SUT methods reach them. Every read-back member (`account`, `organization`, `membership`,
`membershipsOf`, `organizationsNamed`, `projectAssignment`, `acknowledgments`) runs as the operator
over `dbUrl`, which has `bypassrls=true`. The one RLS-touching read in the suite is an inline `fetch`
with the anon key in AT-001.17. `functionPost` and `authPost` parse JSON, so no byte-for-byte
comparison of two refusals is possible through them. At loop tier the fixture is a `Map`; a body
that asserts "NGO B reads nothing of NGO A" grades the fixture's filter. The reference branch's loop
`dataApiRead` was a hand-written SQL mirror, which is a third copy of the rule (finding 1).

**Evidence**: `_contract.ts:578-579` still says "row-level security is on with zero policies and
`org_memberships` reaches no Data API role", a sentence the deliverable falsifies. `_live.ts:583`
still says `public.projects` reaches no Data API role. `live-stack.ts:120` returns
`json: jsonBody(await response.text())`. No `restGet` or caller-scoped read exists in `live-stack.ts`.

**Impact**: The deliverable must add a new class of SUT member (a read that takes a `Session`), a raw
text sibling of `functionPost`, and correct two stale comments. Those are ordinary. The structural
part is that the loop tier will grade a mirror for these five ids whatever the deliverable does. The
manifest's `--expect` file treats a loop green as one kind of claim for every id; for D5 the honest
loop claim is "the response shape and the pure decision, if one exists". If finding 1 resolves toward
RLS as the rule, the loop tier has almost nothing to grade for these ids, and that should be declared
rather than filled with a mirror.

### 5. [concern] The front end has no session, no route guard and no seam the deliverable may touch

**Components**: `src/router.tsx`, `src/routes/__root.tsx`, `src/routes/index.tsx`,
`src/routeTree.gen.ts`, `src/lib/api/example.functions.ts:11-12`, `.github/workflows/ci.yml:260-265`
(territory guard), `tests/at/harness/runner.ts:300-306` (`--wired` exits 3), reference
`_shared/route-visibility.ts`.

**Finding**: One route, one heading, no `beforeLoad`, no redirect, no sign-in target;
`@supabase/supabase-js` is a devDependency and nothing under `src/` imports it. AT-001.24 names a
redirect to a screen that does not exist, and CI forbids a pull request that touches `src/` together
with `supabase/` or `tests/`. So the deliverable cannot land a route guard, and the harness has no
browser driver to grade one. The reference branch answered with `ROUTE_VISIBILITY`, a route registry
placed under `supabase/functions/_shared/` because that is the one territory-neutral folder, and a
source scan that fails when a route file is undeclared. Its own header says no product code imports
it and no router obeys it. That is a declaration in product code that product code does not read: a
bolt-on by the rubric's definition.

Three written intents for future reads disagree: `CLAUDE.md` ("UI never touches the DB … always an
edge function"), `.taskmaster/docs/migration-nextjs-to-tanstack-VERIFIED.md:444,473` ("reads via
@supabase/ssr + RLS"), and `example.functions.ts:11-12` ("Use this pattern instead of Supabase Edge
Functions"). The choice among them is the same choice finding 1 asks for.

**Evidence**: `src/router.tsx` builds `createRouter({ routeTree, context })` and consults nothing
else. `ci.yml:264` "this pull request changes BOTH Lovable territory and Claude territory — split
it". Reference `route-visibility.ts` header: "TWO TESTS IMPORT THIS TODAY, NO PRODUCT CODE DOES, AND
NO ROUTER OBEYS IT."

**Impact**: AT-001.24's redirect half is unprovable in this tree at either tier. The reference branch
declared it `capability-pending` on `ui.logged-out-surface-rendering` at integration and green at
loop over the registry scan; the loop green is a scan of file names, which is a naming oracle like
`_source-scan.ts` and grades no rendering. Shipping a registry the router does not import creates a
second source of truth for route classification the day the auth screens land in a `src/`-only pull
request. The deliverable should declare the UI half pending, resolve the read-architecture conflict
as a written decision, and not ship a registry until a router can import it in the same change.

### 6. [concern] The no-existence-oracle shape is a write-path precedent carried by discipline, and it forks the refusal vocabulary

**Components**: `update-organization/index.ts:111-112` and `_shared/memberships.ts:97-115`
(one 403 `not-a-member` for missing organisation and for non-member); reference
`_shared/visibility.ts:60-68` (`TENANT_NOT_FOUND`, 404), reference `organization-dashboard/index.ts`
(four reads, target last, `readFailed()`).

**Finding**: The tree's one precedent for "do not reveal existence" is a write refusal: `roleIn`
returns `absent` for both cases and `orgAdminActionAllowed(null)` produces one kind. The reference
branch built the read equivalent as a constant plus two disciplines in each handler: read the target
row last so a fault cannot depend on existence, and return an outage sentence that names no
identifier. The dashboard pays a projects read it will discard for a refused caller, and the record
still lists a residual (502 versus 404 under an organisation-read fault distinguishes existing from
absent). These disciplines live in comments and in read order; nothing structural enforces them, and
each new read surface has to get them right again. The reference constant is a 404 while the existing
write refusal is a 403 with `kind: 'not-a-member'`. So after the deliverable lands, "this is not yours"
has two shapes depending on whether the caller reads or writes.

**Evidence**: `memberships.ts:108-115` returns `kind: 'not-a-member'` for `null`. Reference
`visibility.ts:50-54` chooses 404 over 403 and names the 403 precedent as "equally non-oracular".
Reference dashboard header: "IT DOES COST A READ THE ANSWER MAY NOT USE".

**Impact**: With reads as the caller (finding 1), a keyed GET returns `[]` in both cases and the
handler has one read, one outcome and no ordering rule. If the service-role read design is kept, the
ordering and outage disciplines are the price, and they should at least be one shared function
(`readAllThenDecide`) rather than a paragraph per handler. Either way, pick one refusal vocabulary
for "not yours" across reads and writes, or state why the two differ.

### 7. [observation] The tables the acceptance ids name do not exist, and the schema has no public/private axis

**Components**: `.taskmaster/docs/acceptance/at-req-001.md:47-51`, `supabase/migrations/` (six
tables), `public.projects` (`20260811130000_…sql:57-63`), reference `_catalog-conformance.ts:80-82`.

**Finding**: AT-001.21, .22, .23 and .40 name drafts, ledger, files, thread, dashboard, reference
files and tasks. None has a table. The tenant rows today are organisations, memberships,
acknowledgments, volunteer profiles, and a project's identity plus assignee. `projects` has two
tenant keys (`org_id` and `assigned_volunteer_id`) and no column that says which fields are public;
the "public project page versus working data" split is therefore a projection choice in a function,
not a fact the schema states. The reference branch's catalog tripwire is a good answer to "later
tables must be isolated too", but its definition of isolated (RLS on, a grant, no `USING (true)`)
accepts a tautological policy, which its own record notes as a dismissed finding.

**Impact**: The deliverable's green is over four tables and a projection. That is honest if the
bodies and the manifest say so. Each later requirement that lands a table (REQ-003, REQ-006,
REQ-015, REQ-032) will re-decide the tenant key, the helper, and the projection. If finding 3 lands
a JWT claim or an own-row `accounts` policy, those later policies get simpler; if it lands three
definer helpers, each later table copies the helper posture.

### 8. [observation] Two-minute tokens, four-minute integration bodies, and no refresh-before-act

**Components**: `supabase/config.toml:180` (`jwt_expiry = 120`),
`tests/at/suites/req-001/_integration.ts:87` (`INTEGRATION_TIMEOUT_MS = 240_000`),
`_live.ts` (`tokensOf`, `refreshSession` 333).

**Finding**: The local stack issues two-minute access tokens as a test convenience. The integration
bodies for the five tenant ids will register and confirm at least three actors through Mailpit (two
NGOs, a volunteer, and for AT-001.40 an admin), then read as each of them. A body that runs past two
minutes sends an expired token on its later reads. Under the deliverable's own rule, a privilege or
authentication refusal must stay distinct from `[]`, so an expired token reads as a 401 and the id
goes red rather than falsely green. The failure is honest but it is a timing flake, and nothing in
the adapter refreshes a token before a read.

**Impact**: Caller-scoped read members should take the token through one place that refreshes when
the `exp` claim is near, or the bodies should sign in immediately before each probe. Otherwise the
integration tier for D5 will be red intermittently for a reason unrelated to isolation.

## Summary of where the existing shape makes the deliverable bolt-on, and where to push back

Bolt-on if accepted as is: a TypeScript tenant rule beside SQL policies with a fixture mirror as a
third copy (1, 4); three definer helpers with a grant posture the rest of the schema contradicts
(3); per-table privilege reversals explained in prose (2); a route registry no router imports (5);
target-last read ordering repeated per handler (6).

Push back on: the service-role read pattern, which the write path needed and the read path does not
(1); the closed `accounts` table as an inherited default (3); the missing schema-wide privilege
statement (2); the unresolved read-architecture conflict between three documents (5); the two
refusal vocabularies for "not yours" (6).

Sound and worth keeping: RLS on every table with grant-then-policy as the client posture;
SECURITY DEFINER writes with no service-role table writes; `resolveCaller` as the session liveness
gate; `--expect` moving reds to greens in the same change; the catalog tripwire as the test for later
tables, once the schema states the posture it checks.

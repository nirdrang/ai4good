The reference branch is a complete tenant-isolation design that never merged. Main still denies everyone at the privilege or empty-policy layer. Below is what that branch decided, how it proved it, and what of it can still be carried as an idea.

### Components Found

| Name | Path (reference worktree unless noted) | What it does |
|---|---|---|
| `tenantReadAllowed` | `.claude/worktrees/ref-66/supabase/functions/_shared/visibility.ts:165` | One pure decision: may this viewer read this organisation or project. Platform admin always; NGO only with a role in the **target** organisation; volunteer only if assigned to **this** project; everything else refused. |
| `TENANT_NOT_FOUND` | same file, lines 60–68 | The one refusal constant every **non-public** surface returns for both “no such row” and “exists, not yours”. Status 404, one sentence that refuses to say which. |
| `publicProjectView` | same file, lines 247–256 | Builds the public projection field-by-field (`projectId`, `projectName`, `organizationName`). Copies nothing wholesale. |
| `TenantViewer` | same file, lines 91–98 | Viewer standing relative to **this** target: `accountType`, `roleInTargetOrganization`, `assignedVolunteerOfTargetProject`. No membership list. |
| `TenantReadBasis` | same file, lines 117 | Why a grant happened. Consumed only by `shipped-visibility.selftest.ts`. Acceptance outcomes deliberately omit it. |
| `ROUTE_VISIBILITY` / `undeclaredRoutes` | `.claude/worktrees/ref-66/supabase/functions/_shared/route-visibility.ts:63–107` | Declares each `src/routes/` file public or authenticated. Pure. No product code imports it. |
| `viewer_is_org_member(uuid)` | `supabase/migrations/20260812120000_tenant_isolation_policy_set.sql:57–86` | Security-definer helper: is `auth.uid()` seated in that organisation. Cuts RLS recursion on `org_memberships`. |
| `viewer_is_platform_admin()` | `supabase/migrations/20260813120000_tenant_visibility_volunteer_and_admin.sql:45–75` | Security-definer helper: is the caller a `platform_admin` row. Needed because `accounts` has RLS and no policy. |
| `viewer_is_volunteer()` | same file, lines 85–104 | Same posture for `account_type = 'volunteer'`. Added after gate-2 slice-2 ruling 1 so the Data API is no more permissive than `tenantReadAllowed`. |
| Organisation-member `SELECT` policies | `20260812120000_…sql:123–163` | Four policies on `organizations`, `org_memberships`, `projects`, `acknowledgments`. Acknowledgments keyed on `account_id = auth.uid()`, not an organisation. |
| Volunteer + admin policies | `20260813120000_…sql:134–187` | `projects_select_assigned_volunteer` (`assigned_volunteer_id = auth.uid() AND viewer_is_volunteer()`) plus four `viewer_is_platform_admin()` policies. OR’d with slice 1. |
| `organization-dashboard` | `supabase/functions/organization-dashboard/index.ts` | Authenticated POST. Four service-role reads; target organisation last; consults `tenantReadAllowed(..., 'organization')`; returns projection or `TENANT_NOT_FOUND`. |
| `project-workspace` | `supabase/functions/project-workspace/index.ts` | Authenticated POST. Account then project; consults `tenantReadAllowed(..., 'project')`. No membership read. |
| `public-project-page` | `supabase/functions/public-project-page/index.ts` | First `verify_jwt = false` function. No `resolveCaller`. Project then organisation. Answers everyone the same way. Reveals existence on purpose. |
| `resolveCaller` | `supabase/functions/_shared/edge.ts:163` | I/O: `Authorization` header → `/auth/v1/user` → `callerFromAuthAnswer`. Missing header is `null` (401 at call sites). |
| `callerFromAuthAnswer` | `supabase/functions/_shared/caller.ts:111` | Pure judgement of Auth’s status+body. Fail-closed to `null`. |
| `readRows` | `edge.ts:339` | Service-role Data API GET. Catch contains rejected `fetch`. Detail is table-only. `{ok:false}` means the read did not happen. |
| `edgeHandler` | `edge.ts:96` | OPTIONS 204; anything thrown becomes a shaped 502. So `TENANT_NOT_FOUND` must be **returned**, never thrown. |
| `catalogConformanceProblems` | `tests/at/suites/req-001/_catalog-conformance.ts:285` | Tripwire: every `public` table is in exactly one of `unreachableByClientRoles` or `tenantIsolated`, and isolated tables are not trivially open. |
| `undeclaredRoutesInTree` | `tests/at/suites/req-001/_route-scan.ts:60` | Reads real `src/routes/` names and asks the shipped registry what is missing. Throws if it cannot read. |
| Loop fixture tenant members | `tests/at/suites/req-001/_fixture.ts:1339–1608` | Storage + read order matching the handlers. Delegates judgement to `visibility.ts`. `dataApiRead` **mirrors SQL**, does not call `tenantReadAllowed`. `failNextReadOf` is loop-only. |
| Live adapter tenant members | `tests/at/suites/req-001/_live.ts:362–1061` | `callFunctionRaw` (unparsed bytes), `tenantRead`, `dataApiGet` (apikey + caller bearer), `publicSchemaCatalog` (`has_table_privilege` + `pg_policies`). No `failNextReadOf`. |
| AT bodies | `tests/at/suites/req-001/d-tenant-isolation.test.ts` plus `_integration.ts` `at00121`–`at00140` | Five ids, two tiers. Integration AT-001.24 refuses with `ui.logged-out-surface-rendering`. |
| On **main today** | `/home/user/ai4good` | None of the above product files exist. RLS is on, zero policies (`grep "create policy"` in `supabase/migrations/` is empty). Five ids still `notLanded`. |

### Flow

**1. Entry: a POST to an edge function, or a GET to PostgREST.**

UI is required to go through an edge function (`CLAUDE.md`). Direct probing is a GET `/rest/v1/<table>` with the caller’s access token. There is no screen: `src/routes/index.tsx` is one heading.

**2. Gateway JWT check (`supabase/config.toml:493–511` in ref-66).**

- `organization-dashboard` and `project-workspace`: `verify_jwt = true`. Missing/dead token → 401 before handler code.
- `public-project-page`: `verify_jwt = false`. Anonymous POST is forwarded.

**3. `edgeHandler` then the handler (`edge.ts:96`, each `index.ts`).**

Non-POST → 405. Thrown errors → 502 with a sentence.

**4. Caller resolution (authenticated surfaces only).**

`resolveCaller` (`edge.ts:163`) reads `Authorization`, fetches `/auth/v1/user`, hands status+body to `callerFromAuthAnswer` (`caller.ts:111`). `null` → 401 `"authenticate before reading…"`. `public-project-page` skips this.

**5. Body parse.**

`readJsonBody`. Empty/missing `organizationId` or `projectId` → 400.

**6. Reads, in a fixed order. Target last on non-public surfaces (gate-1 ruling 4).**

`organization-dashboard` (`index.ts:82–117`):

1. `accounts?id=eq.<caller>` (caller)
2. `org_memberships?org_id=eq.<id>` (different table, same id)
3. `projects?org_id=eq.<id>` (different table)
4. `organizations?id=eq.<id>` — **target, last**

`project-workspace` (`index.ts:66–77`):

1. caller account
2. `projects?id=eq.<id>` — target last. Assignment is a column of that row, so the target is also a decision input. No membership read (would need `org_id` after the target).

`public-project-page` (`index.ts:64–82`): project first, then organisation keyed on `project.org_id`. Ordering is **not** load-bearing: the surface makes no access decision (audit A1, re-run R1).

All three use `readRows` with the **service role**, so **RLS is not consulted on the edge path**. RLS is the Data API path.

**7. Decision.**

Authenticated handlers call `tenantReadAllowed` (`visibility.ts:165`) with values already in hand:

- unknown account type → refuse
- `platform_admin` → grant, basis `platform-admin` (scope ignored; founder d65)
- `scope === 'organization'` → NGO + `parseOrgRole(roleInTarget)` non-null → grant
- `scope === 'project'` → volunteer + `assignedVolunteerOfTargetProject === true` → grant
- any other scope → refuse (gate-2 ruling 5; selftest drives this via cast)

Then:

```
if (!allowed.ok || target === undefined) return json(TENANT_NOT_FOUND.body, TENANT_NOT_FOUND.status);
```

One constant for both cases. No second refusal exists in the handler.

Public handler: missing project or missing organisation → same constant. Success → `publicProjectView` (three fields only).

**8. Direct Data API path (criterion “ID probing”).**

Live helper `dataApiGet` (`_live.ts:441`): `apikey: slot.anonKey` **and** `Authorization: Bearer <caller token>` (gate-1 ruling 9). Denied keyed read → `[]`, same as a missing row. Privilege refusal (anon, no grant) → `rows: null` and 401, kept distinct from `[]`.

Policies OR:

- org member: `viewer_is_org_member(...)`
- assigned volunteer on `projects` only, plus `viewer_is_volunteer()`
- platform admin on all four tenant tables

`anon` is granted nothing. Public data is the edge function, not a table.

**9. Loop tier.**

Fixture repeats handler read order and calls the **same** `tenantReadAllowed` / `TENANT_NOT_FOUND` / `publicProjectView`. `dataApiRead` is a hand-written SQL mirror (gate-2 ruling 2: the SQL admits any seated account; the TS organisation branch also requires NGO). `failNextReadOf` arms a one-shot store fault; AT-001.21/22 assert foreign and absent still equal under each fault.

**10. Catalog tripwire (integration AT-001.21 arm 7, `_integration.ts:1441`).**

`publicSchemaCatalog` reads live `pg_class` (`relkind in ('r','p')`) + `has_table_privilege` + `pg_policies`. `catalogConformanceProblems` fails undeclared tables, trivially-open `USING (true)`, RLS-off isolated tables, and isolated tables with no authenticated SELECT grant.

**11. Front-end routes today.**

`src/router.tsx` builds a TanStack router over `routeTree.gen.ts` and consults **nothing**. `ROUTE_VISIBILITY` currently lists only `index.tsx` as public. AT-001.24 loop asserts `undeclaredRoutesInTree() === []`. Integration AT-001.24 throws `CapabilityPending(['ui.logged-out-surface-rendering'])` because the criterion’s outcome **is** the rendering (`_integration.ts:1940–1956`). CI territory guard (`.github/workflows/ci.yml:213–277`) still forbids one PR from touching both `src/` and `supabase|tests|loop|.claude|.github`.

### Files Read

**Record (ref-66 item folder):**  
`loop/items/AI4DEV-66/plan.md`, `pr-body.md`, `PHASE-STATE.md`, `rulings-gate1.md`, `rulings-gate2.md`, `rulings-gate2-slice2.md`, `rulings-audit.md` (through A7), `rulings-audit-rerun.md` (R1), `rulings-merge.md` (through section 4).

**Shipped (ref-66):**  
`supabase/functions/_shared/visibility.ts`, `route-visibility.ts`, `caller.ts` (header + `callerFromAuthAnswer`), `edge.ts` (`edgeHandler`, `resolveCaller`, `readRows`), `organization-dashboard/index.ts`, `project-workspace/index.ts`, `public-project-page/index.ts`, migrations `20260812120000_tenant_isolation_policy_set.sql` and `20260813120000_tenant_visibility_volunteer_and_admin.sql`, `supabase/config.toml` functions block.

**Tests (ref-66):**  
`d-tenant-isolation.test.ts` (all five ids), `_contract.ts` tenant types and SUT members, `_fixture.ts` State/`readStore`/three surfaces/`dataApiRead`/`failNextReadOf`, `_live.ts` `backedSutMethods`/`callFunctionRaw`/`tenantRead`/`dataApiGet`/`publicSchemaCatalog`, `_integration.ts` `at00121` catalog arm + `at00124` refusal, `_pending.ts`, `_catalog-conformance.ts`, `_route-scan.ts`, `shipped-visibility.selftest.ts` header+admin case, `tests/at/expected/req-001.json`.

**Main checkout:**  
`tests/at/harness/runner.ts`, `local-stack.ts` header, `index.ts` live loader, `pending.ts`, `live-stack.ts` `functionPost`, `suite-adapters.ts` header, `ci.yml` territory + `at:verify` steps, `src/router.tsx`, `src/routes/index.tsx`, `tests/at/suites/req-001/{d-tenant-isolation.test.ts,_pending.ts,_contract.ts,_live.ts,_fixture.ts,_integration.ts}`, `tests/at/expected/req-001.json`, `loop/decomp/req-001.md` D5, first migration RLS comment, `supabase/functions/_shared/` listing, migrations listing.

### Boundaries

**In**

- HTTP POST body: `{ organizationId }` or `{ projectId }`.
- Bearer token (authenticated functions) or none (public function).
- Data API: caller JWT + anon `apikey`, table + optional `col=eq.id`.
- Operator Givens already on the SUT: `createProjectAsOperator`, `assignVolunteerAsOperator`, `provisionPlatformAdmin`. No new write authority (plan decision H).

**Out**

- Edge: 200 projection, 404 `TENANT_NOT_FOUND`, 401 session, 400 bad body, 405 method, 502 outage (identifier-free sentence).
- Data API: 200 + row array (`[]` is denial), or ≥400 with `rows: null` (privilege).
- Catalog arm: list of problem sentences, empty = pass.
- Route arm: undeclared file names, empty = pass.

**Does not connect**

- `src/router.tsx` does not import `ROUTE_VISIBILITY`.
- Edge reads do not go through RLS (service role).
- Loop Data API arms do not grade the migrations (fixture mirror).
- `functionPost` / `callFunction` on main parse JSON; the no-oracle comparison needs unparsed text.

**Main harness boundary that replaced the slot pool**

ref-66: `createLiveAdapter({ slot, vendors, config, worlds })` + `backedSutMethods` + `pendingMethodProxy` + `db-pool.ts` + `AT_DB_SLOT`.  
main: `createLiveAdapter({ stack: Stack })` (`tests/at/harness/index.ts:117–120`, `_live.ts:200`). Missing members throw `CapabilityPending` **inline** (`_live.ts:808–813`). Integration is **one stack**, lock + identity proof + reset in `local-stack.ts`. No pool, no `AT_DB_SLOT`. CI still runs only `--tier loop --expect` (`ci.yml:185–187`).

### Non-Obvious Things

**Decisions that are the product, not comments**

1. **No-existence-oracle is structural.** One exported constant; handlers have nowhere to put a second refusal. Tests compare the two responses (`toEqual` / raw text), they do not assert “both refused”. 404 chosen over 403 because 403 says something is there to forbid (`visibility.ts:50–54`). Timing is explicitly not claimed.
2. **Target read last** so an outage cannot depend on existence. A lookup after the target would 502 only on existing foreign ids and 404 on absent ones — an oracle outside the constant. Dashboard pays for this by reading projects even when the caller will be refused.
3. **Two layers, two rules, they are not the same.** `viewer_is_org_member` admits any seated account. `tenantReadAllowed` also requires NGO. Gate-2 ruling 2 forbade delegating the fixture’s Data API filter to `tenantReadAllowed`. Membership write is already NGO-only (`org_membership_grantee_must_be_ngo`), so that divergence is theoretical. The developer seat is **not** type-guarded; slice-2 ruling 1 added `viewer_is_volunteer()` on the **read** policy and filed a write trigger as a founder candidate.
4. **Edge path never tests RLS.** Service-role `readRows`. AT-001.40’s dashboard/workspace successes prove the TS rule, not the four admin policies. Those policies are proved only by Data API listings (slice-2 ruling 5, then audit A2 added the non-admin **positive** half so empty listings cannot pass).
5. **Policy set split by branch, not table** (gate-1 ruling 7). A slice does not ship a policy branch it does not test. Slice 1: org-member only. Slice 2: volunteer + admin. Several permissive SELECT policies OR.
6. **Helper grants must include `authenticated`.** Copying the write-path `service_role`-only EXECUTE posture would break every policy, because policy expressions run as the querying role (gate-1 ruling 6). Helpers take no “other person” argument so RPC exposure leaks only the caller’s own standing.
7. **Grant before policy.** `auto_expose_new_tables` is unset; without `GRANT SELECT … TO authenticated`, a client read dies at privilege and RLS never runs. Slice 1 **reverses** `revoke all on public.projects` from `20260811130000_…sql:123` and names that reversal in the migration header.
8. **Acknowledgments are not an org tenant.** Policy is own-account only, so NGO B cannot read NGO A’s ToS row.
9. **Public surface is allowed to be an existence oracle.** Criterion text: “beyond public surfaces”. Keeping public in a **separate** function stops that carve-out contaminating the 404 constant. Under organisation-read fault, 502 vs 404 still distinguishes existing from absent; residual 18 records that as inside residual 4, not beside it.
10. **Later requirements’ tables do not exist.** Criteria name drafts, ledger, files, thread, tasks. Only dashboard-kind tables exist. Isolation of the rest is a **catalog tripwire**, not a test of empty tables. Semantic tautologies (`USING (id is not null)`) still pass the arm (slice-2 ruling 4 **dismissed**; residual 12).
11. **AT-001.21/22 green with `{ surface: 'ui' }`.** Outcome observable at API. AT-001.24 not green at integration: outcome **is** the screen (gate-1 ruling 1). `--wired` still exits 3 on both trees (`runner.ts:300–306` on main).
12. **Vacuous-pass seam.** `expect(ok).toMatchObject({ok:true}); if (!ok || organizationId===null) return;` can PASS with zero arms. Six new sites guarded (gate-2 ruling 4). Six pre-existing sites left alone as a filing candidate.
13. **`readRows` fetch escape** was not an existence oracle (transport fails before row exam) but leaked the REST URL via `edgeHandler`. Contained by construction; no test can import `edge.ts` (`Deno.env.get`). Proved by reading.
14. **Loop Data API green grades the fixture, not SQL.** Named residual. Positive controls on all four tables are a **bracket**, not a proof of correct keys.
15. **Dead session vs never-signed-in.** Fixture answers both 401/`rows:null`. Live `signOut` **keeps** tokens so revocation is testable; a live signed-out Data API call still sends a bearer. Unmeasured whether PostgREST accepts a revoked-unexpired JWT. AT-001.24 never runs live.
16. **Batch close omitted.** Gate-1 ruling 3: no `Closes` for the partner item without a founder answer on AT-001.24’s browser half. Partner work landed; partner item stays open.
17. **Integration never ran on that branch.** One attempt, exit 3, stack down, nothing graded (`rulings-merge.md` section 2). Merge sitting **did not merge**. CI green was loop-only. Founder had to clear the stack or accept loop-only evidence. The branch fell behind main.

**What reviewers objected to, and what was ruled**

- Gate 1 (11/11 adopted): UI path, excluded data kinds, closing partner with AT-001.24 pending, 502 as oracle, `callFunction` parsing, definer grants, slice-1 untested branches, “any policy = isolated”, missing `apikey`, hand `db reset`, stale “no Data API role” comment.
- Gate 2 slice 1 (7/7 adopted): `readRows` throw, fixture vs SQL, one positive control, silent `organizationId===null` pass, unknown scope fail-open, false “both tiers run”.
- Gate 2 slice 2 (7 adopted, 1 dismissed): assigned-volunteer admits any account type; PUBLIC grants invisible to `role_table_grants`; RLS-off isolated tables; **dismissed** tautology blacklist; AT-001.40 one-table admin policy; false “no router”; false signed-out=anon reason; selftest vs S2-F on `TenantReadBasis`.
- Audit: public handler target-not-last (record narrowed, code kept); empty non-admin controls; “nothing imports route-visibility”; fail-closed branch “unreachable”; `dataApiRead` “every caller passes Session”; partitioned tables (`relkind='p'`); stale slice-1 volunteer-policy comment.
- Audit re-run R1: “unsatisfiable on public surface” over-claimed; exemption rests only on “no access decision”. Collapsing reads is possible (FK exists) and unmeasured.

**Main vs ref-66: carry as idea, not as code**

| File | ref-66 | main today | Carry? |
|---|---|---|---|
| `tests/at/harness/runner.ts` | 1467 lines; `db-pool.ts`; occupy/prepare/AT_DB_SLOT; live ledger | 527 lines; `prepareLocalStack` + `stack-lock`; **one stack**; no slots | **Cannot copy.** Integration wiring, env, evidence line all changed. `--wired` exit 3 and `--expect` bijection **ideas** still hold. |
| `_contract.ts` | 1012 lines; tenant types (`TenantReadOutcome`, `DataApiProbe`, `CatalogTable`, `failNextReadOf`) | 774 lines; those members **absent**. Still says “no read surface… zero policies” (`_contract.ts:578–579`) | **Types are an idea.** Patch onto current `AccountsSut`; do not paste the file. Correct that comment when policies land (plan step 18). |
| `_fixture.ts` | 1681 lines; `readFaults`, three surfaces, SQL-mirror `dataApiRead` | 1332 lines; `projects` Map already exists for AT-001.32; no tenant reads, no faults | **Idea:** delegate judgement to shipped `visibility.ts`; mirror SQL separately; clear new State in `teardown`. Cannot paste members. |
| `_live.ts` | 1257 lines; `backedSutMethods`; `createLiveAdapter({slot,vendors,config,worlds})`; `callFunctionRaw`; catalog SQL | 839 lines; `createLiveAdapter({stack})`; HTTP via `authPost`/`functionPost` in `live-stack.ts`; missing methods throw `CapabilityPending` inline; still “`public.projects` reaches no Data API role” (`_live.ts:583`) | **Cannot copy factory or `backedSutMethods`.** Need a **sibling of `functionPost` that returns unparsed text** (`functionPost` still `JSON.parse`s, `live-stack.ts:101–121` — same gate-1 ruling 5 hole). Catalog query and `dataApiGet` (apikey+bearer, `session\|null`) are ideas. Add members to the `accounts` object; do not revive the proxy ledger. |
| `_integration.ts` | 1964 lines; `at00121`–`at00140`; catalog in `at00121`; `at00124 = refusesWith('ui.logged-out-surface-rendering')` | 1278 lines; those exports **absent** | **Bodies are ideas.** Rewrite against current `registerConfirmAndSignIn` / `functionPost`. Vacuous-pass guards, four-table controls, raw-text equality, catalog in AT-001.21 remain the right shape. |
| `_pending.ts` | D5.L1 and D5.L2 **removed** from `LEAF`; 11 pending | Both labels **still in** `LEAF`; 16 pending | Mechanical: drop labels when ids go green, as earlier leaves did. File is still the same device. |
| `expected/req-001.json` | loop 26 green / 11 red; integration 20 green / 17 red with AT-001.24 capability-pending | loop 21/16; integration 16/21; all five ids `sut-missing` | Move ids the same way; expected **counts** on main are the pre-item baseline. |
| `d-tenant-isolation.test.ts` | full four-argument `atTest` bodies | five `notLanded` one-liners | Replace in place; keep one call site per id. |
| Product: `visibility.ts`, two migrations, three functions, `route-visibility.ts` | present | **absent** | These files do not exist on main. Re-implement against current `edge.ts` (no `readRows` on main; 325 vs 381 lines). Helper posture, OR’d policies, target-last order, `TENANT_NOT_FOUND` are the portable design. |
| Harness gone entirely | `capabilities.ts`, `db-pool.ts`, `attestation.ts`, `oracles.ts`, `live-email.ts`, `typeprobes/` | replaced by `local-stack.ts`, `live-stack.ts`, `stack-lock.ts`, `pending.ts`; typeprobes parked under `loop/parked/v1/` | Any snippet that imports those modules **will not compile**. |

**Still true on main, so the design still fits**

- RLS on, zero policies, first migration still assigns the policy set to this deliverable (`20260808120000_…sql:318–322`).
- `auto_expose_new_tables` unset; `accounts` granted, `projects` revoked.
- Six tables; no drafts/ledger/files/thread.
- `src/` still `__root.tsx` + `index.tsx`; territory guard still live.
- Operator Givens already exist.
- `atTest` four-argument form, `surface: 'ui'`, capability-pending exact-string match still exist.
- Decomposition D5.L1 / D5.L2 still own AT-001.21–.24,.40 (`loop/decomp/req-001.md:35–38`).
- Integration **can** run now (one stack, `bun run db:start`); that was the merge blocker in 2026-08-13.

### Open Questions

1. I did not re-read every remaining line of `rulings-merge.md` after section 4, or `rulings-audit-rerun.md` after R1. Dispositions above come from the files named in Files Read plus PHASE-STATE’s residual list.
2. I did not execute either tier. The claim that integration never ran is from the item record, not from a run I made.
3. Whether PostgREST would serve an embedded `projects`→`organizations` select (the collapsed public read) is still unmeasured, as the record says.
4. Whether a revoked-but-unexpired JWT still reads PostgREST is still unmeasured.
5. `has_table_privilege` on a missing role name errors; the record flags that as the first thing to watch on a real integration run.
6. I did not diff `memberships.ts` / `update-organization` beyond the plan’s claim that it already uses one 403 for missing and not-a-member.
7. I did not map every post-2026-08-13 main commit that shrank `runner.ts`; the shape change (pool → one stack, ledger → inline `CapabilityPending`) is what matters for reuse.
8. Whether a later main change added any SELECT policy I missed: `grep "create policy"` on `/home/user/ai4good/supabase/migrations` returned none.
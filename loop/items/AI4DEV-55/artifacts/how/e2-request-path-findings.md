### Components Found

**Edge I/O layer**

- `requireEnv`, `json`, `refusal`, `edgeHandler`, `resolveCaller`, `callerIp`, `callDatabaseFunction`, `readJsonBody`, `RpcOutcome` — `supabase/functions/_shared/edge.ts`. Deno-only I/O: env, CORS, JSON answers, Auth round trip, service-role RPC. No type-checker covers this file (`edge.ts` lines 11–22). Re-exports `Caller`.
- `CORS_HEADERS` — `edge.ts` 67–71. Origin `*`. Allowed headers: `authorization, apikey, content-type, x-client-info`. Methods: `POST, OPTIONS`. Safe only because these endpoints auth by header, not cookie (`edge.ts` 50–65).

**Caller judgement (pure)**

- `Caller` `{ id: string; githubHandle: string | null }` — `supabase/functions/_shared/caller.ts` 58–69. Auth-user id; linked GitHub handle or `null`.
- `callerFromAuthAnswer(status, user)` — `caller.ts` 111–119. Fail-closed: non-2xx, non-object body, or non-string `id` → `null`. Handle from whole body via `extractGithubHandle`. Blank `id` is accepted (`caller.ts` 104–109).
- `extractGithubHandle` — `supabase/functions/_shared/github.ts` 50–65. Walks `identities[]` for `provider === 'github'` and `identity_data.user_name`.

**Account / membership judgements (pure)**

- `Decision<T>` `{ ok: true; value } | { ok: false; reason }` — `supabase/functions/_shared/accounts.ts` 72.
- `parseAccountType`, `validateCompleteSignup`, `validateOrganizationName`, `ngoOnlyActionAllowed`, `PUBLIC_SIGNUP_ACCOUNT_TYPES`, `ACCOUNT_TYPES` — `accounts.ts`. `platform_admin` cannot come out of public signup (`accounts.ts` 84–114). `ngoOnlyActionAllowed` also refuses `platform_admin` (`accounts.ts` 327–345); AT-001.40 is named as a different deliverable, not granted here.
- `OrgRole`, `parseOrgRole`, `OrgAdminRefusalKind` (`'not-a-member' | 'not-an-admin'`), `OrgAdminDecision`, `orgAdminActionAllowed` — `supabase/functions/_shared/memberships.ts`. Two refusal kinds are load-bearing for AT-001.16 vs AT-001.36 (`memberships.ts` 57–73).
- `ACKNOWLEDGMENT_IDENTITY_COPY` — `supabase/functions/_shared/acknowledgment-copy.ts`. `authorityStatement` is the only attestation `validateCompleteSignup` accepts.
- `emailVerifiedFromUser`, `discoveryMessageAllowed` — `supabase/functions/_shared/verification.ts`. **No deployed function imports this module.** It is the hook a future Discovery send route must call (`verification.ts` 8–24).

**Deployed functions (three, all POST, all `verify_jwt = true`)**

- `complete-signup` — `supabase/functions/complete-signup/index.ts`. Completes signup; writes via `public.complete_signup`.
- `create-organization` — `supabase/functions/create-organization/index.ts`. NGO-only extra org; writes via `public.create_organization`.
- `update-organization` — `supabase/functions/update-organization/index.ts`. Admin-only rename; writes via `public.update_organization`. The only function that puts `kind` on the wire.

Config: `supabase/config.toml` 485–496.

**Front end (TanStack Start)**

- `getRouter` — `src/router.tsx`. QueryClient + file route tree. No auth context.
- `startInstance` — `src/start.ts`. SSR error middleware only.
- Default `fetch` — `src/server.ts`. Catastrophic SSR 500 HTML. No session.
- Routes: `src/routes/__root.tsx` (shell, 404, error), `src/routes/index.tsx` (`/` heading “ai4good”), generated `src/routeTree.gen.ts` (`fullPaths: '/'` only).
- `src/lib/api/example.functions.ts` — unused `getGreeting` `createServerFn`. Comment says use this *instead of* Edge Functions.
- `src/lib/config.server.ts` — empty `getServerConfig()`. Comment documents `VITE_*` as public; nothing in `src/` reads `import.meta.env`.
- `src/hooks/use-mobile.tsx` — breakpoint only.
- `src/components/ui/*` — shadcn primitives. No product screens. Sidebar cookie is UI chrome, not auth (`src/components/ui/sidebar.tsx` 85–86).

**Harness (request path at both tiers)**

- `functionPost` — `tests/at/harness/live-stack.ts` 101–121. POST `{api}/functions/v1/{name}` with `apikey`, `Authorization: Bearer {accessToken}`, JSON body, optional `x-forwarded-for`.
- Loop fixture `resolveCaller` — `tests/at/suites/req-001/_fixture.ts` 609–614. Live/dead session → `callerFromAuthAnswer(200|401, …)`. Same judgement as the edge, no HTTP.
- Tenant ATs — `tests/at/suites/req-001/d-tenant-isolation.test.ts`. All five throw `notLanded` for D5.L1 / D5.L2.
- `_contract.ts` 574–579: a green over `updateOrganization` is **operation-surface isolation only**, not read isolation.

---

### Flow

**0. How a JWT reaches a function today**

There is no UI path. `@supabase/supabase-js` is a **devDependency** (`package.json` 79). No `src/` file imports it. No `createClient`, `getSession`, `functions.invoke`, or `Authorization` in `src/`.

The live path (what a browser would do) is the integration adapter:

1. Person (or test) signs in through GoTrue: `POST /auth/v1/token` (`live-stack.ts` `authPost`, `_live.ts` session map).
2. Adapter calls `functionPost(stack, name, body, tokens.accessToken)` (`_live.ts` 418–467).
3. HTTP POST `{AT_SUPABASE_URL}/functions/v1/{complete-signup|create-organization|update-organization}`.
4. Headers: `apikey` = anon key, `Authorization: Bearer <user access token>`, `Content-Type: application/json`, optional `x-forwarded-for`.
5. Kong: `verify_jwt = true` (`config.toml` 489–496) verifies the JWT **before** Deno runs. Measured: anon key as Bearer against `create-organization` is HTTP 401 (`_integration.ts` 965–977).
6. `Deno.serve(edgeHandler(name, handler))` in each `index.ts`.

**1. `edgeHandler` (`edge.ts` 96–108)**

- `OPTIONS` → 204 + CORS, never the inner handler (browser preflight).
- Any throw → `refusal("{name} could not complete the request: {detail}", 502)` — `{ ok: false, reason }`. Never a bare 500.

**2. Method gate (each `index.ts`)**

- Non-POST → `refusal("{name} accepts POST only", 405)` — `{ ok: false, reason }`, no `kind`.

**3. Who is calling — `resolveCaller` then `callerFromAuthAnswer`**

`resolveCaller` (`edge.ts` 163–205):

1. `Authorization` missing → `null` immediately (no Auth round trip).
2. `GET {SUPABASE_URL}/auth/v1/user` with that `Authorization` and `apikey: anonKey`. Does **not** decode the JWT. `verify_jwt` already checked signature; this asks Auth **who** and whether the session is live.
3. Body parsed with `JSON.parse` in try/catch. Unparseable → `user = null` (fail closed as 401, not 502; `edge.ts` 171–203).
4. Returns `callerFromAuthAnswer(response.status, user)`.

`callerFromAuthAnswer` (`caller.ts` 111–119):

- Status not 200–299 → `null`. Live measurement: revoked and expired tokens are Auth **403** (`session_not_found` / `bad_jwt`), not 401 (`caller.ts` 98–101; `shipped-caller.selftest.ts` 98–104).
- Body not a non-null object, or `id` not a string → `null`.
- Else `{ id, githubHandle: extractGithubHandle(user) }`.

Null caller at every function:

| Function | Status | Body |
|---|---|---|
| `complete-signup` | 401 | `{ ok: false, reason: "authenticate before completing signup" }` |
| `create-organization` | 401 | `{ ok: false, reason: "authenticate before creating an organisation" }` |
| `update-organization` | 401 | `{ ok: false, reason: "authenticate before renaming an organisation" }` — **no `kind`** |

Loop tier: fixture `resolveCaller` (`_fixture.ts` 609–614) feeds `callerFromAuthAnswer` a rendered GoTrue shape or 401. Dead-session reason is fixture wording `"this session is no longer valid — sign in again"` (`_fixture.ts` 625), not the deployed sentences. Bodies assert refusal + no write, not the sentence.

**4a. `complete-signup` (`complete-signup/index.ts` 50–170)**

1. `readJsonBody` — empty `{}`; non-object/invalid JSON → 400 `{ ok: false, reason }`.
2. `validateCompleteSignup(body fields, { githubHandle: caller.githubHandle })`. GitHub handle is **never** a request field (`index.ts` 65–67). Fail → 400, `decision.reason`.
3. Volunteer: `stubGithubStatsFor(handle)` (no GitHub HTTP). NGO: omit github RPC keys (`index.ts` 106–125).
4. `callDatabaseFunction(..., 'complete_signup', { p_account_id: caller.id, …, p_ip: callerIp(request), signer fields, optional github })`.
5. DB 4xx → 409 + database `message`. Transport/5xx → 502. Success 200 `{ ok: true, accountId, accountType, organizationId }`.

Client used: **service role** for the RPC (`edge.ts` 262–305). Anon key only for `/auth/v1/user`. Caller JWT never hits PostgREST.

**4b. `create-organization` (`create-organization/index.ts` 74–115)**

1. `accountTypeOf(caller.id)` — GET `/rest/v1/accounts?id=eq.{id}&select=account_type` with **service role** (`index.ts` 55–72). Three outcomes: `found` / `absent` / `failed`.
2. `failed` → 502 “the caller's account could not be read…”. `absent` → 409 “complete signup before creating an organisation”.
3. `ngoOnlyActionAllowed(accountType)` → 403 + reason. Volunteers and `platform_admin` refused (`accounts.ts` 327–345).
4. Body `name` through `validateOrganizationName` → 400.
5. RPC `create_organization` `{ p_account_id, p_name }` service role. 4xx → 409, else 502. Success `{ ok: true, organizationId }`.

**4c. `update-organization` (`update-organization/index.ts` 83–137)**

1. Body: missing/blank `organizationId` → 400 `{ ok: false, kind: "refused", reason: "an organisation rename must name the organisation to rename" }`.
2. `roleIn(orgId, caller.id)` — GET `/rest/v1/org_memberships?org_id=eq.…&account_id=eq.…&select=role` **service role**. Role narrowed with `parseOrgRole` (fail closed → `absent`).
3. Read failed → 502 `{ kind: "refused", … }` so an outage cannot look like isolation.
4. `orgAdminActionAllowed(found role or null)`:
   - `admin` → continue
   - `member` → 403 `{ kind: "not-an-admin", reason }`
   - no row / unknown / **unknown organisation** → 403 `{ kind: "not-a-member", reason }`
5. **Authorisation before name validation** (`index.ts` 114–118): no standing → nothing about whether the name would have been accepted.
6. Bad name → 400 `{ kind: "invalid-name", reason }`.
7. RPC `update_organization`. DB backstop → `{ kind: "refused" }` 409/502. Success `{ ok: true, organizationId, name }`.

Unknown org and not-a-member are the **same** kind. Measured: random uuid → 403 `not-a-member` (`_fixture.ts` 1047–1053). That is the no-existence-oracle shape on this **write**. `_contract.ts` 574–579 says this is **not** D5 read isolation.

**5. Database from the edge**

All product writes: `callDatabaseFunction` = POST `/rest/v1/rpc/{name}` with **service role** (`edge.ts` 272–286). Bypasses RLS; definer functions re-check (`edge.ts` 269–270).

Lookups also service role (accounts, org_memberships). No anon-client Data API. No user-JWT PostgREST from these functions.

**6. Front end today**

1. Request hits `src/server.ts` `fetch` → TanStack Start SSR.
2. Router: only `/` (`routeTree.gen.ts` 20–37).
3. `Index` (`src/routes/index.tsx` 13–18): centered `<h1>ai4good</h1>`. No session, no fetch, no edge call.
4. Unknown path: `NotFoundComponent` (`__root.tsx` 15–34) — 404 copy + link home. No sign-in redirect.
5. No `beforeLoad`, no route guard, no `redirect`.

**7. Tenant-isolation ATs (this slice)**

`d-tenant-isolation.test.ts` 14–22: AT-001.21, .22 → `notLanded(D5.L1)`; AT-001.23, .40, .24 → `notLanded(D5.L2)`. Both tiers red by declaration (`_pending.ts` 62–63). No request path to grade.

---

### Files Read

- `supabase/functions/_shared/edge.ts`
- `supabase/functions/_shared/caller.ts`
- `supabase/functions/_shared/accounts.ts`
- `supabase/functions/_shared/memberships.ts`
- `supabase/functions/_shared/github.ts`
- `supabase/functions/_shared/verification.ts`
- `supabase/functions/_shared/acknowledgment-copy.ts`
- `supabase/functions/complete-signup/index.ts`
- `supabase/functions/create-organization/index.ts`
- `supabase/functions/update-organization/index.ts`
- `supabase/config.toml` (functions + `verify_jwt`)
- `src/router.tsx`, `src/start.ts`, `src/server.ts`, `src/routeTree.gen.ts`
- `src/routes/README.md`, `src/routes/__root.tsx`, `src/routes/index.tsx`
- `src/lib/api/example.functions.ts`, `src/lib/config.server.ts`, `src/lib/utils.ts`, `src/lib/error-capture.ts`, `src/lib/error-page.ts`, `src/lib/lovable-error-reporting.ts`
- `src/hooks/use-mobile.tsx`
- `.taskmaster/docs/architecture-notes.md` (REQ-001, REQ-010–015, REQ-032)
- `.taskmaster/docs/migration-nextjs-to-tanstack-VERIFIED.md` (intended routes)
- `.taskmaster/docs/acceptance/at-req-001.md` (AT-001.21–.24, .40)
- `.taskmaster/docs/requirements/req-001.md`
- `loop/decomp/req-001.md` (D5)
- `tests/at/suites/req-001/d-tenant-isolation.test.ts`
- `tests/at/suites/req-001/_pending.ts`, `_source-scan.ts`, `_live.ts` (headers + functionPost wrappers), `_fixture.ts` (caller + three operations), `_contract.ts` (outcomes), `_integration.ts` (AT-001.17 probes)
- `tests/at/harness/live-stack.ts` (`functionPost`)
- `tests/at/harness/shipped-caller.selftest.ts`
- `package.json`, `.env.example`

---

### Boundaries

**In**

- Browser / test: POST `/functions/v1/{name}` + user JWT + anon `apikey` + JSON body.
- Kong `verify_jwt`.
- GoTrue `GET /auth/v1/user` (liveness + identity + GitHub identities).
- Request body fields only (never identity facts). `complete-signup`: `accountType`, `organizationName`, `acknowledgmentTextVersion`, `signerName`, `signerTitle`, `authorityAttestation`. `create-organization`: `name`. `update-organization`: `organizationId`, `name`.
- `x-forwarded-for` first hop → `callerIp` (untrusted; invalid → null).

**Out (JSON + CORS)**

Shared `refusal`: `{ ok: false, reason }` at 400/401/403/405/409/502.

`update-organization` extra: `{ ok: false, kind, reason }` with kinds `not-a-member` | `not-an-admin` | `invalid-name` | `refused`. 401/405/malformed-body still use `refusal()` and **omit** `kind`.

Success: `{ ok: true, … }` as above.

**To the database**

- Service-role RPC: `complete_signup`, `create_organization`, `update_organization`.
- Service-role REST reads: `accounts`, `org_memberships`.
- RLS is not on this path. Definer functions are the DB backstop.

**To the front end**

None. UI does not call these functions. `VITE_SUPABASE_*` exist for Lovable builds (`.env.example` 11–14, 71–73); `src/` never reads them.

**To the harness**

Loop: shipped modules + in-memory maps; `callerFromAuthAnswer` with no network. Integration: real Kong + functions + Auth. D5 ids are `AtPending` at both.

**Intended later (not built)** — `.taskmaster/docs/migration-nextjs-to-tanstack-VERIFIED.md`:

Public: `/marketplace`, `/projects/$id`, `/volunteers/$handle`, `/help`. Authenticated: `/dashboard/ngo/*`, `/dashboard/volunteer/*`, `/admin/*`, `/projects/$id/lovable-setup`. Writes via new edge functions (`project-comments`, `raise-blocker`, `sign-project-file`, `discovery-stream`, `stripe-checkout`, …). Sign-in screens are D2.LW, not D5.

---

### Non-Obvious Things

1. **Three functions, all writes, no reads.** Tenant ATs name drafts, ledger, files, thread, dashboard, reference files, tasks, listings, project pages. None of those tables, functions, or routes exist. `_contract.ts` 574–579 states that `update-organization` greens do **not** prove D5.

2. **UI never holds a session.** No supabase-js in the app bundle (devDependency only). No route guard. AT-001.24 (“authenticated surfaces redirect to sign-in”) has no sign-in route and no authenticated surface. `/` is a public stub, not listings or a project page.

3. **Identity is never taken from the JWT payload.** Signature is Kong’s; who-is-calling is `/auth/v1/user`. Passing `{ id }` into `callerFromAuthAnswer` would drop GitHub handles and block volunteer completion (`edge.ts` 152–157; `shipped-caller.selftest.ts` 80–89).

4. **Service role everywhere on the write path.** Edge functions do not use the caller JWT against PostgREST. RLS does not constrain these three. Isolation is TypeScript decisions + definer functions. A D5 read that copied this pattern would **bypass** RLS unless the function re-implements grants.

5. **Design conflict for future reads.** Project rule: UI never touches the DB; always an edge function. Migration notes say project page “reads via @supabase/ssr + RLS” and NGO dashboard “Aggregation reads via @supabase/ssr (RLS) or an ngo-dashboard Edge Function” (migration file ~444, ~473). `example.functions.ts` 11–12 tells Lovable to use `createServerFn` *instead of* Edge Functions. D5 has to pick one; the tree currently implements none.

6. **`platform_admin` is refused on NGO writes.** `ngoOnlyActionAllowed` (`accounts.ts` 327–345) cites AT-001.40 as not this leaf. `orgAdminActionAllowed` only sees per-org role; an admin with no membership is `not-a-member`. There is no admin-span **read** path.

7. **Unknown org ≡ not a member** on `update-organization`. Same 403 kind for missing org and other-NGO. Pattern for “no existence oracle” on this write. 502 membership-read failure is deliberately `refused`, not `not-a-member`.

8. **`kind` is only on `update-organization`, and not on all of its refusals.** 401/405/bad JSON have no `kind`. Live adapter maps unknown/missing kind to `'refused'` (`_live.ts` 448–466) so a gateway error page cannot satisfy AT-001.16/36.

9. **Status vocabulary is shared except Auth 403.** App 401 = no caller; 403 = authenticated but not allowed; 400 = bad body; 409 = DB judgement; 502 = outage. GoTrue itself answers **403** for dead tokens; `callerFromAuthAnswer` treats that as no caller; the function still returns **401**.

10. **CORS `*` is explicit, cookie-hostile.** A cookie session would make `*` unsafe (`edge.ts` 58–65). Today there is no cookie session.

11. **`verification.ts` is a hook with no caller.** Discovery send is a loop-tier stand-in only (`_live.ts` 33–37). Unverified-write is not on any deployed function.

12. **AT-001.17 already scans routes.** `_source-scan.ts` fails if `src/routes/` is named like invite/add-member. D5.L2 adding dashboards must not trip that oracle.

13. **Intended public vs authenticated split is documented, not coded.** Architecture notes: REQ-010/011 project page + listings; REQ-013/014 dashboards; REQ-015 comment thread (load on view, no live push); REQ-032 signed URLs after membership check; REQ-006 ledger. REQ-033: public status projection is role-uniform; thread, files, and the NGO bot sit outside that (`architecture-notes.md` 262–264).

---

### Open Questions

- **Kong vs function 401 body** when the JWT is missing vs malformed vs expired: integration pins `create-organization` + anon Bearer as status 401 (`_integration.ts` 965–977). I did not re-read the exact Kong JSON vs `refusal()` body for a missing header. Dead tokens: Auth 403 in, function 401 out — confirmed in comments/selftest, not re-measured here.

- **Whether D5 reads will be edge functions, RLS + user JWT, or TanStack `createServerFn`.** Three written intents conflict. No code to trace.

- **How the UI will attach the JWT.** No client, no cookie, no PKCE, no `functions.invoke`. D2.LW (“wire the auth screens”) is the likely place; it has not landed.

- **Exact HTML/redirect for AT-001.24.** No sign-in route, so the redirect target does not exist.

- **Whether `update-organization`’s not-a-member collapse is the intended D5 probe shape** for GET-by-id. It is a useful precedent, not a read policy.

- **I did not read SQL/RLS/grants.** Out of this slice. `_contract.ts` 578–579 says RLS is on with zero policies and `org_memberships` reaches no Data API role — treat as another explorer’s fact.

- **I did not run the app or the suite.** Route tree and function list are from the tree as read.
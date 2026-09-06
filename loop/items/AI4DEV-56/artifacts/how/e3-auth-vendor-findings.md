### Components Found

- **`supabase/config.toml` `[auth]`** — Local Auth config the CLI reads at container create. Head pins `jwt_expiry = 120`, `enable_manual_linking = true`, `enable_signup = true`, `enable_anonymous_sign_ins = false`, Google and GitHub `enabled = true` via `env()`, `enable_confirmations = true`. Commented hook examples: `[auth.hook.before_user_created]`, `[auth.hook.custom_access_token]` only. Auth image measured as `public.ecr.aws/supabase/gotrue:v2.193.0`.
- **`[auth.rate_limit]`** — File values: `email_sent = 2`, `sms_sent = 30`, `anonymous_users = 30`, `token_refresh = 150`, `sign_in_sign_ups = 30` per 5 minutes per IP, `token_verifications = 30`, `web3 = 30`. Comment on `email_sent`: “Requires auth.email.smtp to be enabled”; `[auth.email.smtp]` is commented out.
- **`[functions.*]`** — Six edge functions. Three writes (`complete-signup`, `create-organization`, `update-organization`) and two authenticated reads have `verify_jwt = true`. `public-project` has `verify_jwt = false`.
- **`resolveCaller`** (`supabase/functions/_shared/edge.ts` 168–210) — I/O only: reads `Authorization`, `GET ${supabaseUrl}/auth/v1/user` with that bearer plus the anon `apikey`, parses JSON without throwing, hands `(status, body)` to `callerFromAuthAnswer`. Missing header → `null` with no round trip.
- **`callerFromAuthAnswer` / `Caller`** (`supabase/functions/_shared/caller.ts` 58–119) — Pure. 2xx + string `id` → `{ id, githubHandle }`. Everything else → `null`. No `account_type`, no ban flag, no identities array on the type. JWT is never parsed here.
- **`extractGithubHandle`** (`supabase/functions/_shared/github.ts` 50–65) — Walks `/auth/v1/user` `identities[]` for `provider === 'github'` and `identity_data.user_name`. Fail-closed: unknown shape → `null`.
- **`live-stack.ts` Auth client** (`tests/at/harness/live-stack.ts`) — `authPost` is POST-only (signup, token, recover). `followLink` is GET with `redirect: 'manual'`. `verifyLinksFor` / `verifyLinksIn` extract `/auth/v1/verify?type=signup|recovery` from Mailpit raw. `sqlClient` is operator SQL on `AT_SUPABASE_DB_URL`. No DELETE helper, no admin PUT helper, no unlink helper.
- **Live adapter Auth surface** (`tests/at/suites/req-001/_live.ts`) — Real HTTP: signup, password grant, logout `?scope=local`, refresh, recover, PUT `/auth/v1/user` for password change, POST `/auth/v1/admin/users` for provisioning. GitHub “link” is operator `INSERT INTO auth.identities`, not OAuth.
- **`provisionPlatformAdmin`** (`_live.ts` 785–808; fixture 1330–1346) — Admin API creates a confirmed auth user; operator SQL inserts `public.accounts (id, 'platform_admin')`; password grant returns a real session.
- **`accountTypeOf`** (`create-organization/index.ts` 55–72) — Service-role REST `GET /rest/v1/accounts?id=eq.…&select=account_type`. This is how a deployed write knows NGO vs volunteer vs admin. `Caller` does not carry type.
- **`viewer_is_platform_admin()`** (`20260907120000_…sql` 70–89) — SECURITY DEFINER SQL: `public.accounts.account_type = 'platform_admin'` for `auth.uid()`. Used by RLS SELECT policies, not by write edge functions.
- **GoTrue admin API (used)** — `POST /auth/v1/admin/users` with service-role bearer and `{ email, password, email_confirm: true }`. No PUT, no ban, no delete in this tree.
- **Kong** — Named as the gateway (`_live.ts` 416: “over the stack's kong”). Container `supabase_kong_poancmeitlmxejofwzuu`. No Kong config file in the tree.

---

### Flow

#### 1. Local stack start — which config actually lands

`bun run db:start` → `bunx supabase start --ignore-health-check` (`package.json` line 17). Auth reads `config.toml` at **container create**, not at `db:reset`. Reset restarts containers but keeps the auth image/env from last start (`AI4DEV-59/stack-up.txt` 15–19, 61–65). After an Auth config change the tree’s own instruction is `db:stop` then `db:start` (`config.toml` 176–179).

**TREE — measured as pushed into the running auth container**

| config.toml | container env | evidence |
|---|---|---|
| `site_url = "http://127.0.0.1:3000"` | `GOTRUE_SITE_URL=http://127.0.0.1:3000` | unit6 env dump |
| `jwt_expiry` | `GOTRUE_JWT_EXP` | AI4DEV-60: 3600 then transient 5 then 3600. Head file is now **120** (`config.toml` 180; `AT_CONFIG.accessTokenLifetimeSeconds` 189–196). This item’s unit6 dump did **not** recapture `GOTRUE_JWT_EXP`. |
| `[auth.email] enable_confirmations = true` | `GOTRUE_MAILER_AUTOCONFIRM=false` (inverted) | AI4DEV-59 stack-up 21–58 |
| `token_refresh = 150` | `GOTRUE_RATE_LIMIT_TOKEN_REFRESH=150` | unit6 |
| `sms_sent = 30` | `GOTRUE_RATE_LIMIT_SMS_SENT=30` | unit6 |
| `anonymous_users = 30` | `GOTRUE_RATE_LIMIT_ANONYMOUS_USERS=30` | unit6 |
| `token_verifications = 30` | `GOTRUE_RATE_LIMIT_VERIFY=30` (number match) | unit6 |
| `web3 = 30` | `GOTRUE_RATE_LIMIT_WEB3=30` | unit6 |
| Google/GitHub `enabled = true` | `/auth/v1/settings` reports `external.github=true`, `google=true`, `apple=false` | AI4DEV-58 proof (f) |
| Unset `env(SUPABASE_AUTH_EXTERNAL_*)` | stack still starts; literal string passes through | config.toml 424–427; db-reset WARN lines |

**TREE — measured as NOT pushed**

- `email_sent = 2` → container `GOTRUE_RATE_LIMIT_EMAIL_SENT=360000` (AI4DEV-59 stack-up 61–65; AI4DEV-60 proof (f); this item unit6). Reproduced across CLI v2.110.0 and GoTrue v2.193.0.
- Sign-in probe: 45 password grants in ~0.66s against `http://127.0.0.1:44321/auth/v1/token?grant_type=password` → **45× HTTP 400** `invalid_credentials`, **zero 429**, no rate-limit headers (`unit6-signin-rate-limit.txt`). File claims `sign_in_sign_ups = 30` per 5 minutes per IP.
- unit6 dump of **every `GOTRUE_RATE_LIMIT*`** var: VERIFY, WEB3, OTP, SMS_SENT, ANONYMOUS_USERS, TOKEN_REFRESH, EMAIL_SENT. **No `GOTRUE_RATE_LIMIT_HEADER`.** `GOTRUE_RATE_LIMIT_OTP=30` matches both `sign_in_sign_ups` and `token_verifications` numerically — mapping is not proven.

**TREE — not measured in any docker inspect**

- `enable_manual_linking` → expected vendor env `GOTRUE_SECURITY_MANUAL_LINKING` (**unconfirmed in this tree**).
- Any `GOTRUE_HOOK_*` (hooks are commented out).
- `enable_refresh_token_rotation`, `refresh_token_reuse_interval`, `minimum_password_length`.
- Current `GOTRUE_JWT_EXP` vs today’s `jwt_expiry = 120`.

**TREE — Auth reads config at start; `db:reset` does not recreate Auth env.** AI4DEV-59 had to stop/start to flip confirmations. AI4DEV-60 phase `d` had to restart to lower `jwt_expiry`.

#### 2. How this tree talks to Auth (live path)

1. **Signup** — `authPost(stack, '/auth/v1/signup', { email, password })` (`_live.ts` 231–237). With confirmations on: HTTP 200, **no session**, `auth.users.email_confirmed_at` NULL, one `identities[]` entry `provider: "email"` (AI4DEV-59 (a)). Adapter returns `{ accountId, sessionId: '' }` — does not fabricate tokens.
2. **Mail** — GoTrue sends confirmation to local Mailpit on the 44324 block (`[local_smtp] port = 44324`). `mailIdentification` requires Mailpit `/api/v1/info` JSON `Version`. `verifyLinksFor` waits up to 20s, quoted-printable-decodes, keeps `/auth/v1/verify` links with `type=signup|recovery`.
3. **Confirm** — `followLink` GET, no follow-redirect. GoTrue 303s to `site_url` with implicit-flow fragment (`access_token` in `#…`). Following the link **mints a session** (AI4DEV-60 ruling 1). Tampered token also 303s; column stays NULL (AI4DEV-59 (b2)). Status is not the oracle.
4. **Sign-in** — `POST /auth/v1/token?grant_type=password`. Unconfirmed → 400 `email_not_confirmed` (AI4DEV-59 (c)). Wrong password → 400 `invalid_credentials`, no tokens, no new `auth.sessions` row (AI4DEV-60 (a)). Right password → 200 + tokens; `exp-iat` must equal pinned 120s or the adapter throws (`lifetimeProblem`, `_live.ts` 154–162). JWT claims used: `sub`, `session_id`, `exp`, `iat`. **No `account_type` claim** — `[auth.hook.custom_access_token]` is commented out.
5. **Caller resolution on a write** — Kong → edge runtime. `verify_jwt = true` checks signature/expiry **before** the function. Expired JWT → platform body `Invalid JWT`, HTTP 401, **never reaches `resolveCaller`** (AI4DEV-60 (d) + fix-rulings ruling 4). Live unexpired token → function runs → `resolveCaller` → `GET /auth/v1/user`.
6. **`GET /auth/v1/user` measured statuses**
   - Live token: 200, body includes `id`, `email`, `email_confirmed_at`, `identities[]` (AI4DEV-59 (d)).
   - Revoked (logout deleted the session, JWT still unexpired): **403** `session_not_found` / “Session from session_id claim in JWT does not exist” (AI4DEV-60 (c), fix-rulings ruling 2).
   - Expired JWT at Auth: **403** `bad_jwt` (AI4DEV-60 (d)).
   - Malformed `auth.identities` row (timestamps null, or `identity_data` as a JSON string): **500**; `resolveCaller` treats non-2xx as no caller → 401 at complete-signup (AI4DEV-58 proof-local.ts 130–138; `_live.ts` 272–283).
7. **Logout** — Default `POST /auth/v1/logout` is **global**: empties `auth.sessions` (AI4DEV-60 (c), ruling 3). Live adapter uses `?scope=local` (`_live.ts` 326). Local: one row gone, sibling session still 200 at `/user`. After local logout, same access token: `/user` 403, refresh 400, deployed complete-signup 401 (`authenticate before completing signup`). Cached tokens are **kept** in the adapter so the post-logout write actually leaves the process (gate-2 S2-2).
8. **Refresh** — `POST /auth/v1/token?grant_type=refresh_token` with no password. Works after access-token expiry. Extends the same `auth.sessions` id set (AI4DEV-60 (d)). Revoked session’s refresh is refused.
9. **Recovery** — `POST /auth/v1/recover` returns 200 for unknown and known addresses (AI4DEV-60 (e)). Flow on this CLI: implicit fragment; `PUT /auth/v1/user` `{ password }` with that access token.

#### 3. Identity link as this tree actually writes it

OAuth `linkIdentity` is **not driven**. No GitHub OAuth app (`AI4DEV-58` (f2) skip). Post-link state is operator SQL:

```294:303:tests/at/suites/req-001/_live.ts
insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (
  ${identityId}::uuid,
  ${githubHandle},
  ${session.accountId}::uuid,
  ${JSON.stringify({ sub: githubHandle, user_name: githubHandle, provider_id: githubHandle })}::text::jsonb,
  'github',
  now(), now(), now()
)
```

Required columns measured: `id`, `user_id`, `provider`, `provider_id`, `identity_data`, **plus** `created_at`, `updated_at`, `last_sign_in_at` even though those three are nullable — GoTrue’s Go struct is non-pointer timestamps; nulls make `/user` 500. `identity_data` must be a JSON **object**; a bound string `::jsonb` becomes a JSON string scalar and `->>'user_name'` is null.

`public.complete_signup` (SECURITY DEFINER, `search_path = ''`) re-reads `auth.identities` for volunteer completions (`20260811120000_…sql` 216–227): `provider = 'github'` AND `identity_data->>'user_name' = v_github_handle`.

#### 4. Platform admin provisioning and “is this caller an admin?”

```
POST /auth/v1/admin/users   Authorization: Bearer <service_role>
  { email, password, email_confirm: true }
→ auth.users row, confirmed, no session, no email
INSERT INTO public.accounts (id, account_type) VALUES (id, 'platform_admin')
  as postgres/operator — service_role has SELECT only on accounts
POST /auth/v1/token?grant_type=password
→ real session
```

`resolveCaller` still returns only `{ id, githubHandle }`. An admin-only edge function **can** tell admin from anyone else the same way `create-organization` already does: `resolveCaller` then `accountTypeOf` (service-role read of `public.accounts.account_type`). `ngoOnlyActionAllowed` **refuses** `platform_admin` today (`accounts.ts` 336–345) — admin is not treated as NGO. JWT has no type claim. RLS helper `viewer_is_platform_admin()` is a **read** path using `auth.uid()`, not a write-path check.

#### 5. (a) Unlink surface — TREE vs vendor

**TREE**

- Flag: `enable_manual_linking = true` at `config.toml` 212. Comment 206–211: the same flag **opens Auth’s unlink surface**; nothing in this item ships calls unlink; product question filed; founder later “For 73 no unlink.”
- No function under `supabase/functions/` calls link or unlink. `_shared/github.ts` only **reads** `identities[]`.
- `live-stack.authPost` is POST-only. No DELETE to identities exists in the harness.
- Signup identity JSON (AI4DEV-59 (a)): `identities[].identity_id` is a UUID distinct from `identities[].id` (for email, `id` equals `user_id`). Unlink must use the identity row id, not the user id.
- First product migration (`20260808120000` lines 8–12) **deliberately has no trigger on `auth.users`**: “a trigger here would be a footgun whose failure mode is a 500 inside Supabase Auth.” No migration creates a trigger on any `auth.*` table. Product triggers exist only on `public.org_memberships` and `public.projects`.
- Schema owner of `auth`: **TREE measurement** of default ACLs (`unit4-privileges-after-reset.txt` 53–55): grantor `supabase_auth_admin`, schema `auth`. Sequences/functions/relations default-grant `postgres` and `dashboard_user`. Relation defaults: `postgres=arwdDxtm` — letters include **`t` = TRIGGER**, **`D` = TRUNCATE**, **`x` = REFERENCES**. That is default ACL for **new** objects created by `supabase_auth_admin` in `auth`, not a `has_table_privilege` reading of existing `auth.identities`.
- Operator (postgres via `sqlClient`) **can INSERT** into `auth.identities` — proved live. Whether postgres can `CREATE TRIGGER` on the existing table is **not measured**.
- Kong: no config in the tree. Custom gateway rules are not a checked-in surface.

**VENDOR (not confirmed by this tree unless noted)**

- HTTP unlink: **`DELETE /auth/v1/user/identities/{identity_id}`**, authenticated, Kong-prefixed. supabase-js `unlinkIdentity` hits this. **Unconfirmed here** — no call was made.
- Setting that opens it: GoTrue `Security.ManualLinkingEnabled` / env `GOTRUE_SECURITY_MANUAL_LINKING`, mapped from `enable_manual_linking`. **Unconfirmed in container env.**
- Last identity: GoTrue refuses deleting the **only** remaining identity (`single_identity_not_deletable` / “Single identity cannot be deleted”). **Unconfirmed here.** Consequence for this product: email-or-Google then link GitHub (AT-001.04) yields **two** identities, so vendor last-identity protection would **not** block GitHub unlink. GitHub-only signup would be blocked by that vendor rule.
- **Where a volunteer-only server refusal can live**
  1. **BEFORE DELETE trigger on `auth.identities`** — fires when GoTrue deletes. Table owner is `supabase_auth_admin` (vendor + default-ACL grantor). A `postgres` migration can SELECT today; TRIGGER on the **existing** table is unmeasured. A RAISE inside Auth’s delete path is the exact 500-inside-Auth footgun the first migration names for `auth.users`. Function would need to join `public.accounts` (account_type = volunteer AND provider = github).
  2. **GoTrue auth hooks** — none fire on identity unlink (vendor). Hooks GoTrue v2.193 supports: `before_user_created`, `custom_access_token`, `send_email`, `send_sms`, `mfa_verification_attempt`, `password_verification_attempt`. This tree’s `config.toml` only **comments** the first two. Whether CLI v2.110.0 accepts the other four keys: **unconfirmed**. No hook is enabled.
  3. **Kong/gateway** — possible in principle to deny DELETE on `/auth/v1/user/identities/*`. No Kong overlay in the tree; local Kong config is CLI-generated inside the container. **Unconfirmed** as a supported local surface.
  4. **Edge function** — cannot wrap Auth’s own DELETE. CORS on shipped functions allows POST/OPTIONS only (`edge.ts` 72–76). Refusal “behind the edge/auth surface” (brief unit 5) means Auth or in front of Auth, not a new write function.

#### 6. (b) Deactivate an auth user through the vendor vs a product column

**TREE:** `public.accounts` has **no lifecycle column** (`20260808120000` lines 13–14; brief fact 5). No code mentions `ban_duration`, `banned_until`, or Auth soft-delete. Deactivation is not implemented.

**VENDOR (unconfirmed in this tree):**

- **Ban:** `PUT /auth/v1/admin/users/{id}` with `{ "ban_duration": "<Go duration>" }` (e.g. `"876600h"`) sets `auth.users.banned_until`. `"ban_duration": "none"` clears it. Requires service-role (same authority as `provisionPlatformAdmin`’s POST).
- **Soft delete:** `DELETE /auth/v1/admin/users/{id}` sets `deleted_at`.
- **Effect on sign-in:** banned/deleted users fail new password grants (vendor).
- **Effect on existing sessions / `/auth/v1/user`:** **unconfirmed here.** This tree **did** measure that **logout** (session row gone) makes `/user` 403 while the JWT is still signed, and that **expiry** is enforced at the edge runtime for `verify_jwt = true` before `resolveCaller`. Ban is a different flag; whether `requireAuthentication` checks `IsBanned()` on GET `/user` and on refresh was **not measured**. Edge `verify_jwt` checks signature and `exp` only — a banned user with a still-valid JWT would pass the platform JWT check and then hit `GET /user` inside `resolveCaller`. Whether that GET refuses is the unconfirmed piece.
- **Product-side lifecycle column** (the deliverable): would live on `public.accounts`, be checked by a write-path gate every route registers with, and would **not** by itself revoke GoTrue sessions or make `/user` 403. Sessions would keep working at Auth until something also bans, logs out, or waits out `jwt_expiry` (120s locally). Combining both is a design choice; they are not equivalent.

#### 7. (c) `password_verification_attempt` as a sign-in attempt limit

**TREE:** hook block is **absent** even as a comment. Only commented hooks are `before_user_created` and `custom_access_token` (`config.toml` 325–333). No `GOTRUE_HOOK_*` measurement. Unit 6’s 45 wrong-password grants all returned 400 with no hook side effects. AT-001.34’s sign-in rate limit is the **config.toml** `sign_in_sign_ups` knob, which the local stack did not honour on that probe.

**VENDOR (unconfirmed in this tree):**

- Fires on password grant when a **user row exists**. Payload: `{ user_id, valid }` (`valid` is whether the password matched).
- May return `{ decision: "reject", message, should_logout_user }`. Reject refuses the grant even if `valid: true`.
- **Wrong password:** yes, `valid: false` — that is the hook’s purpose.
- **Unknown email:** typically **does not fire** (no `user_id`); GoTrue returns `invalid_credentials` first. **Unconfirmed.** If true, a SQL attempt counter keyed only on `user_id` cannot rate-limit unknown-address brute force; IP-based GoTrue limit or a hook that never sees those attempts cannot close that hole alone.
- SQL implementation sketch (vendor): hook URI `pg-functions://postgres/public/…`, SECURITY DEFINER function inserts an attempt row, counts recent failures, returns `reject` past the cap. Needs `revoke execute from public` to pass `_policy-scan.ts`.
- CLI push: when enabled, expected env `GOTRUE_HOOK_PASSWORD_VERIFICATION_ATTEMPT_ENABLED`, `_URI`, `_SECRETS`. **Whether CLI v2.110.0 writes those from `[auth.hook.password_verification_attempt]` is unconfirmed.** Given `email_sent` is ignored, “the key exists in config.toml” is not proof the container receives it.

#### 8. Privilege posture relevant to Auth tables (unit 4 vs auth schema)

Live catalog check (`_live-tenant-reads.ts` 268–288) walks **`public` only**. unit4 dump after reset: public tables have no leftover TRUNCATE/TRIGGER/REFERENCES for anon/authenticated/service_role on the six product tables. Default ACL for **`auth`** still grants postgres `Dxt` (TRUNCATE, REFERENCES, TRIGGER) on new auth relations. That is **not** the leftover-privilege claim unit 4 names (those were `public.accounts|organizations|org_memberships|acknowledgments`). Actual `has_table_privilege` on `auth.identities` / `auth.users` was **not** measured.

---

### Files Read

- `supabase/config.toml` (full)
- `supabase/functions/_shared/edge.ts`, `caller.ts`, `github.ts`, `accounts.ts` (parseAccountType, ngoOnlyActionAllowed), `verification.ts` (emailVerifiedFromUser)
- `supabase/functions/complete-signup/index.ts`, `create-organization/index.ts`, `update-organization/index.ts` (headers)
- `supabase/migrations/20260808120000_accounts_org_membership_and_acknowledgments.sql` (header + accounts PK)
- `supabase/migrations/20260811120000_acknowledgment_signer_identity.sql` (`complete_signup` + `auth.identities` backstop)
- `supabase/migrations/20260907120000_tenant_read_volunteer_seat_and_admin_reach.sql` (`viewer_is_platform_admin`)
- `tests/at/harness/live-stack.ts`, `atconfig.ts` (`accessTokenLifetimeSeconds`)
- `tests/at/suites/req-001/_live.ts` (Auth methods + `provisionPlatformAdmin` + `linkGithubIdentity`)
- `tests/at/suites/req-001/_live-tenant-reads.ts` (JwtClaims, privilege query)
- `tests/at/suites/req-001/_fixture.ts` (provision + vendor mirrors)
- `tests/at/suites/req-001/_contract.ts` (logout/recover docs)
- `tests/at/suites/req-001/_integration.ts` (`at00107`)
- `tests/at/suites/req-001/a-signup-and-signin.test.ts` (AT-001.07)
- `loop/items/AI4DEV-56/brief.md`, `artifacts/measure/unit6-auth-container-env.txt`, `unit6-signin-rate-limit.ts/.txt`, `unit4-privileges-after-reset.txt`, `db-reset.txt`
- `loop/items/AI4DEV-59/stack-up.txt`, `proof-local.ts` (rate-limit notes), `proof-local.txt`
- `loop/items/AI4DEV-58/proof-local.ts` (fabricateGithubIdentity, settings), `proof-local.txt`, `plan.md` §5 unlink, `PHASE-STATE.md`
- `loop/items/AI4DEV-60/proof-local.ts` (logout, 403, expiry layers, identity insert, admin-less), `fix-rulings.md`

---

### Boundaries

| Boundary | In | Out |
|---|---|---|
| Kong `:44321` | Browser / tests / edge `fetch` | Routes `/auth/v1/*` to GoTrue, `/functions/v1/*` to edge, `/rest/v1/*` to PostgREST |
| Edge `verify_jwt` | Bearer JWT | Expired/invalid → `Invalid JWT` **before** function body |
| `resolveCaller` | `Authorization` header | `Caller \| null` from `/auth/v1/user` |
| `callerFromAuthAnswer` | HTTP status + JSON body | `{ id, githubHandle } \| null` |
| `extractGithubHandle` | full user JSON | GitHub login or `null` |
| Write functions | Caller id + body | SERVICE DEFINER RPC as **service_role** |
| `accountTypeOf` | caller id | `public.accounts.account_type` via service-role REST |
| Admin API | service-role JWT | create-user only, today |
| Operator SQL | `postgres` on `:44322` | `auth.identities` insert, `public.accounts` admin insert, catalog reads |
| Mailpit `:44324` | GoTrue mailer | confirmation/recovery links |
| OAuth providers | config advertisement | **no handshake in this environment** |

Inputs this tree never sends: `DELETE …/user/identities/…`, `PUT /auth/v1/admin/users` (ban), Auth hooks, Kong ACL changes.

---

### Non-Obvious Things

1. **`enable_manual_linking` is a dual-use flag.** It is required for AT-001.04’s `linkIdentity`; it also opens unlink. The tree recorded that as deliberate non-guard, then the founder ruled no volunteer unlink.
2. **Config.toml is not the running Auth.** `email_sent = 2` is theatre locally. `jwt_expiry` **is** pushed, but only at container create. `sign_in_sign_ups = 30` did not throttle 45 grants. Designing AT-001.34 against the file value would green-or-red the wrong system.
3. **`GET /auth/v1/user` answers 403, not 401**, for dead tokens. Shipped code treats all non-2xx as no caller, so 401 vs 403 is the same refusal. Do not pin 401 in a new unlink/ban test without measuring.
4. **Two layers refuse dead tokens.** Expiry: platform JWT check. Revocation: `resolveCaller` after `/user` 403. Ban (if used) would be a third, unmeasured layer.
5. **Logout default is global.** Tests that need “one session died” must pass `?scope=local`.
6. **Confirmation link is a sign-in.** It mints `auth.sessions`. Counts of “sessions created by a refused password grant” must snapshot before/after, not assume zero.
7. **Fabricated GitHub rows can break Auth.** Missing timestamps → `/user` 500 → 401 that looks like “not authenticated”. Wrong `::jsonb` cast → handle null. Both were measured after they misled.
8. **Email identity JSON `id` ≠ `identity_id`.** Unlink path parameter is the identity row id (`identity_id`). Using `identities[].id` for an email identity would hit the user id.
9. **`Caller` has no account type.** Admin detection is a second round trip to `public.accounts`. A `custom_access_token` hook could put type in the JWT; it is commented out and the last merge explicitly did not do that.
10. **Admin provisioning is two authorities**, neither of which is “service_role can insert accounts.” Auth admin API creates the user; operator SQL creates the type row. Service_role cannot INSERT `public.accounts`.
11. **Vendor last-identity protection does not save AT-001.04 volunteers** (vendor, unconfirmed): they hold email/Google **plus** GitHub.
12. **A trigger on `auth.identities` can 500 GoTrue** — same class of footgun the first migration refused for `auth.users`.
13. **Ports:** current file uses the 443xx block. Older proofs (AI4DEV-58/59/60) print 543xx from before the 2026-08-13 move. Same project id `poancmeitlmxejofwzuu`.
14. **CLI installed: v2.110.0.** GoTrue image: v2.193.0. Hook and rate-limit mapping claims must be for that pair, not the latest CLI docs.
15. **`authPost` always sends `Authorization: Bearer <anon or user>`.** Anon bearer on signup/token is required by this gateway; omitting it is a different failure than Auth’s own rule.

---

### Open Questions

1. **Does CLI v2.110.0 set `GOTRUE_SECURITY_MANUAL_LINKING`?** Never docker-inspected. Unlink endpoint existence on this stack is inferred from the config comment, not probed.
2. **Exact GoTrue last-identity behaviour on v2.193.0** for email+GitHub vs GitHub-only — not called.
3. **Does postgres have TRIGGER on the existing `auth.identities` table** (vs default ACL for new tables)? unit4 did not query `auth`.
4. **Does a RAISE in a BEFORE DELETE trigger on `auth.identities` become a shaped 4xx or a 500** from GoTrue? Not measured. The `auth.users` comment predicts 500.
5. **Do any of the six hooks fire on unlink?** Vendor: no. Not verified against v2.193.0 source in this tree.
6. **Does `[auth.hook.password_verification_attempt]` in config.toml get written into the container by this CLI?** `email_sent` is a precedent that it might not.
7. **Does `password_verification_attempt` run for unknown emails?** Vendor lean-no; unconfirmed.
8. **Ban vs live JWT:** does GET `/auth/v1/user` refuse a banned user whose access token is still unexpired? Unconfirmed. Directly load-bearing if deactivation is implemented as Auth ban rather than (or in addition to) a product column.
9. **Does ban revoke refresh tokens / delete `auth.sessions`?** Unconfirmed.
10. **What is `GOTRUE_RATE_LIMIT_OTP=30` mapped from?** Number-matches `sign_in_sign_ups` and `token_verifications`. Password grants were not throttled regardless.
11. **Is IP-based sign-in limiting off because `GOTRUE_RATE_LIMIT_HEADER` is unset?** Vendor-plausible; the env dump’s filter would have shown that var if present as `GOTRUE_RATE_LIMIT*`. Probe also sent **no** `X-Forwarded-For`. Unconfirmed which of (no header env, no XFF, limiter not wired to `/token`) is the cause.
12. **Current `GOTRUE_JWT_EXP` on the stack this item measured** — unit6 did not print it. File says 120.
13. **Kong customisation** — can this project inject a request-termination plugin locally without forking CLI templates? No overlay in the tree.
14. **Hosted vs local:** `jwt_expiry = 120` is documented as local-only, never `config push`. Ban, hooks, and rate limits on hosted are a different config surface. Unit 6’s job is the **local** honouring record.
15. **`identities[].id` vs `identity_id` for a fabricated GitHub row** — fabrication sets `auth.identities.id` to a new UUID; GoTrue’s JSON mapping for that row was not captured after insert (only that `/user` returns 200 when timestamps are filled). Unlink tests should read `identity_id` from a live `/user` body, not from the insert UUID, unless that equality is measured.
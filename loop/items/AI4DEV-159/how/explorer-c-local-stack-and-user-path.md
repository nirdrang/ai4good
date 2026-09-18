### Components Found

- **`Stack`** (`tests/at/harness/live-stack.ts` lines 7–13): five runtime coordinates — `apiUrl`, `dbUrl`, `anonKey`, `serviceRoleKey`, `mailUrl`. Shared by verify drives and the integration adapter.
- **`STACK_ENV`** (`live-stack.ts` lines 16–22): maps those fields onto `AT_SUPABASE_URL`, `AT_SUPABASE_DB_URL`, `AT_SUPABASE_ANON_KEY`, `AT_SUPABASE_SERVICE_ROLE_KEY`, `AT_SUPABASE_MAIL_URL`.
- **`stackFromLocalStatus`** (`tests/at/harness/local-stack.ts` lines 440–446): drive constructor. Runs `bunx supabase status -o json` through `runSupabaseCli`, then `parseStackStatus` → `stackFromParsedStatus`. Refuses if the status names no mail catcher.
- **`LocalConfig`** (`local-stack.ts` lines 168–188): `projectId`, `apiPort`, `dbPort`, `jwtExpirySeconds`, optional `mailPort`, all parsed from `supabase/config.toml`.
- **`StackStatus`** (`local-stack.ts` lines 237–257): parsed CLI JSON: `API_URL`, `DB_URL`, `ANON_KEY`, `SERVICE_ROLE_KEY`, plus `MAILPIT_URL` or older `INBUCKET_URL`.
- **`Caller`** (`supabase/functions/_shared/caller.ts` lines 59–76): `{ id, githubHandle, emailVerified }` judged from Auth’s `/auth/v1/user` answer, never from the request body.
- **`callerFromAuthAnswer`** (`caller.ts` lines 118–126): pure fail-closed parse. Non-2xx, missing/`id` not a string, or non-object body → `null`.
- **`resolveCaller`** (`supabase/functions/_shared/edge.ts` lines 166–208): I/O half. Reads `Authorization`, `GET {SUPABASE_URL}/auth/v1/user` with `apikey` + that bearer, hands status+body to `callerFromAuthAnswer`.
- **`orgAdminActionAllowed` / `parseOrgRole`** (`supabase/functions/_shared/memberships.ts`): per-organisation role. `admin` admits; `member` → `not-an-admin`; no row → `not-a-member`. “NGO admin” is admin **in that org**, not a global type.
- **`writeRoute` / `edgeHandler`** (`edge.ts`): shared POST pipeline, OPTIONS 204 + CORS, JWT-resolved caller, `write_standing`, RPC as service role.
- **`WRITE_ROUTES`** (`supabase/functions/_shared/write-routes.ts` lines 24–76): registry. `complete-signup` is `account-absent-by-design` → RPC `complete_signup`. `project-need` admits `ngo` → RPC `project_need`. `discovery-message` admits `ngo`. `discovery-conversation` is **not** in this table; it is a read.
- **`ACKNOWLEDGMENT_IDENTITY_COPY.authorityStatement`** (`supabase/functions/_shared/acknowledgment-copy.ts` lines 37–40): the only attestation `validateCompleteSignup` accepts.
- **`NeedStage`** (`supabase/functions/_shared/need-intake.ts` line 6): `'draft' | 'discovery_in_progress'`.
- **`decideProjectNeed`** (`need-intake.ts` lines 74–130): NGO-admin-of-target-org gate, then `start` / `save` / `attach` / `submit`.
- **`emailVerifiedFromUser` / `discoveryMessageAllowed`** (`supabase/functions/_shared/verification.ts`): Discovery floor. Verified iff `email_confirmed_at` is a non-blank string on the Auth user object.
- **Drive scripts**: `drive-ngo-signup.ts` (signup → confirm → complete), `drive-need-intake.ts` (start/save/submit), `drive-discovery.ts` (shortest path to a submitted need, then Discovery).
- **Vite/Lovable scaffold**: `vite.config.ts` wraps `@lovable.dev/vite-tanstack-config`. Dev server host `::`, port **8080**. `src/routes/index.tsx` is a placeholder heading only. **No file under `src/` calls Auth or edge functions today.**

### Flow

Exact HTTP sequence that produces a confirmed NGO admin, an organisation, a project, and a need in `discovery_in_progress`. `{API}` is `stack.apiUrl` with no trailing slash. Every Auth POST sends `apikey: <ANON_KEY>` and `Authorization: Bearer <ANON_KEY>` (`authPost`, `live-stack.ts` 83–99). Every function POST sends `apikey: <ANON_KEY>` and `Authorization: Bearer <access_token>` (`functionPostRaw`, 138–158).

**0. Doctor (drives refuse before this if it fails)**  
- `GET {API}/auth/v1/health` → 200.  
- `GET {MAIL}/api/v1/info` → 200 JSON with string `Version` (`mailIdentification`).  
- `docker inspect supabase_edge_runtime_{project_id} --format "{{json .Mounts}}"`: a mount whose `Source` ends in `supabase/functions` and starts at **this checkout** (`drive-ngo-signup.ts` 112–145, `drive-discovery.ts` 198–230). WSL2 bind sources `/run/desktop/mnt/host/c/...` are mapped to `c:/...`.

**1. Signup — no session**  
- `POST {API}/auth/v1/signup`  
- Body: `{ "email": "<unique>@example.com", "password": "<6+ chars>" }`  
- Expect 200 with a `user` and **no** `access_token` (`enable_confirmations = true`, `config.toml` 274).  
- Drive emails: `verify-${stamp}@example.com` or `verify-discovery-${stamp}@example.com`. Password: `Verify-Drill-${stamp}!`.  
- Side effect: confirmation mail in Mailpit. **No** `public.accounts` row yet.

**2. Sign-in refused while unconfirmed** (NGO drive only; Discovery drive skips this check)  
- `POST {API}/auth/v1/token?grant_type=password`  
- Body: `{ "email", "password" }`  
- Expect 400 (`email_not_confirmed`).

**3. Mail catcher — confirmation link**  
- Poll up to 20 s, 250 ms (`verifyLinksFor`, `live-stack.ts` 297–316):  
  - `GET {MAIL}/api/v1/search?query=to:<address>&limit=50`  
  - For each `ID`: `GET {MAIL}/api/v1/message/{ID}/raw`  
- Decode quoted-printable: strip `=\r?\n`, then `=XX`, then `&amp;` → `&`. Keep `http(s)://` URLs that contain `/auth/v1/verify` **and** `type=signup`.

**4. Confirm the address**  
- `GET <verify-link>` with `redirect: 'manual'` (`followLink`, line 318).  
- Expect 3xx. `Location` is toward `site_url` (`http://127.0.0.1:3000`). Fragment may carry tokens; drives redact it. Confirmation is the 3xx itself; nothing has to be listening on 3000.  
- After this, `auth.users.email_confirmed_at` is set. Still no `public.accounts` row.

**5. Password sign-in**  
- Same token POST as step 2.  
- Expect 200 with `access_token`, `refresh_token`, `user.id`.  
- Access token lifetime = `[auth] jwt_expiry` = **120 seconds** (`config.toml` 181; `AT_CONFIG.accessTokenLifetimeSeconds.value` = 120, `atconfig.ts` 195–202).  
- Drive comment: call completion promptly or sign in again (`SKILL.md` 114–116; feature file line 37–38).

**6. Complete signup as NGO**  
- `POST {API}/functions/v1/complete-signup`  
- Body (exact keys; attestation imported, never retyped):

```json
{
  "accountType": "ngo",
  "organizationName": "<unique name>",
  "acknowledgmentTextVersion": "tos-platform-promise-v1",
  "signerName": "Verify Drill",
  "signerTitle": "Automated verifier",
  "authorityAttestation": "I attest that I have the authority to make this acknowledgment for my organisation — to bind it, to fund non-refundable model-fuel purchases, and to accept services that carry no SLA."
}
```

- Pipeline: OPTIONS not used by drives. `writeRoute` (`edge.ts` 347–436) → `resolveCaller` → `write_standing` → `decideSignupCompletion` (`accounts.ts` 407–444) → RPC `complete_signup` as service role.  
- 200: `{ ok: true, accountId, accountType: "ngo", organizationId }`.  
- One transaction writes: `accounts` (`ngo`), `organizations`, `org_memberships` (`admin`), `acknowledgments` (`platform_tos_and_promise`), plus `audit_events` `org_role_changed` / `membership granted`.  
- **No project is created here.**

**7. Start a need (creates the project)**  
- `POST {API}/functions/v1/project-need`  
- Discovery drive body (`drive-discovery.ts` 325–330):

```json
{
  "organizationId": "<from complete-signup>",
  "action": "start",
  "title": "Discovery drive need one",
  "description": "Discovery drive need one — need description for the Discovery drive.",
  "urgency": "soon"
}
```

- Need-intake drive omits `description` so the row starts as draft with `description: null`.  
- SQL (`project_need` start arm): insert `projects (org_id, name)` with the title, insert `need_intakes` default `stage = 'draft'`. Requires platform acknowledgment and `org_memberships.role = 'admin'` in **that** org.  
- 200: `{ ok: true, changed: true, need: { projectId, organizationId, title, description, urgency, stage: "draft", ... } }`.

**8. Submit (moves to Discovery)**  
- Same function. Body:

```json
{
  "organizationId": "<org>",
  "action": "submit",
  "projectId": "<from start>"
}
```

- `need_intake_submit` (`20260919120000_project_need_snapshot.sql` 1–27): empty/whitespace description → 409 `missing-description`. Else `stage = 'discovery_in_progress'`, stamp `submitted_at`, one `audit_events` row `need_intake_submitted`. Second submit is a no-op (`changed: false`).  
- Discovery drive can submit immediately because start already carried a description. Need-intake drive must `save` a description first.

After step 8 the caller is a signed-in NGO admin (`accounts.account_type = ngo` + `org_memberships.role = admin`) with a project whose need is `discovery_in_progress`. That is the state `discovery-message` / `discovery-conversation` require.

---

**How `stackFromLocalStatus` gets coordinates**

1. `readLocalConfig(repoRoot)` reads `supabase/config.toml`: `project_id = "poancmeitlmxejofwzuu"`, `[api] port = 44321`, `[db] port = 44322`, `[auth] jwt_expiry = 120`, `[local_smtp] port = 44324` (first `port` in that section).  
2. `runSupabaseCli({ workdir: repoRoot, projectId }, ['status', '-o', 'json'])` with `SUPABASE_PROJECT_ID` set positively and no other `SUPABASE_*` vars (`supabaseInvocation`, `local-stack.ts` 316–329).  
3. `parseStackStatus` takes JSON fields:

| Stack field | CLI JSON key | Config check |
|---|---|---|
| `apiUrl` | `API_URL` | loopback + port 44321 |
| `dbUrl` | `DB_URL` | loopback + port 44322 |
| `anonKey` | `ANON_KEY` | JWT `iss=supabase-demo`, `role=anon`, no hosted `ref` |
| `serviceRoleKey` | `SERVICE_ROLE_KEY` | JWT `iss=supabase-demo`, `role=service_role` |
| `mailUrl` | `MAILPIT_URL` else `INBUCKET_URL` | loopback + port 44324 |

Feature docs state the expected answers on this machine: API `http://127.0.0.1:44321`, Mailpit `http://127.0.0.1:44324`. The harness **never hardcodes** them. Values are not in the tree; they come from a live `status` call. `stackFromParsedStatus` throws if `mailUrl` is missing.

Anon key source: the CLI’s `ANON_KEY`, a local-development JWT, **not** the hosted publishable key in tracked `.env`.

---

**Access token lifetime and a page that stays open**

- Local Auth issues 120-second access tokens. Comment in `config.toml` 175–181: **local only, never a product setting**; Auth reads it at **container start**. Change requires `db:stop` then `db:start`.  
- Integration adapter (`_live-tenant-reads.ts` 136–150) refreshes when fewer than 20 seconds remain: `POST /auth/v1/token?grant_type=refresh_token` with `{ refresh_token }`.  
- Rotation is on (`enable_refresh_token_rotation = true`, reuse interval 10 s).  
- Drive scripts **do not refresh**. A long Discovery drive can die mid-run if it exceeds 120 s from sign-in.  
- A browser page that keeps only `access_token` dies at two minutes. A page that keeps `refresh_token` (or uses `supabase-js` auto-refresh) can stay open. Hosted tokens are not this 120 s pin.

---

**What the drives treat as evidence, and how they redact**

- Evidence dir: `loop/verify-evidence/<timestamp>/transcript.json`, or `outDir`. Written even on failure.  
- Each step records HTTP method, redacted URL, status, redacted body; then SQL readback of product rows over `DB_URL` (not REST — `service_role` has no SELECT on `organizations`/`acknowledgments`; `audit_events` grants are revoked).  
- Redaction (`live-stack.ts` 24–26, 329–356):  
  - Keys matching `token|secret|password|apikey|api_key|jwt|nonce|otp|code$` → `[REDACTED]`  
  - JWT-shaped substrings → `[REDACTED-JWT]`  
  - `sb_(publishable|secret)_…` → `[REDACTED-KEY]`  
  - URL: fragment stripped, **every query value** set to `REDACTED`  
- Skill forbids pasting `db:start` output (contains `SECRET_KEY` / `JWT_SECRET`); GitHub push protection blocks it.  
- Product path only: no admin-API user mint for the NGO, no `--no-verify-jwt`, no SQL to fake signup. Platform admin **is** operator SQL (Discovery drive steps 290–320); transcripts name it.

---

**How an integration run resets the stack**

`bun run at:verify req-0NN --tier integration --expect` (`runner.ts` 385–428):

1. Refuse if `AT_REPO_ROOT` redirects away from the real checkout.  
2. `readLocalConfig`; `lifetimePinProblem` (config `jwt_expiry` vs registry 120) — before the lock.  
3. `acquireStackLock` keyed by project id + API port.  
4. `prepareLocalStack` (`local-stack.ts` 986–1001): prove identity (`status -o json` + container names `supabase_*_{projectId}`), `waitForReady`, re-read config for drift, prove identity **again**, `supabase db reset --local` (`resetLocalDatabase`), wait again, `proveMigrationsReplayed` (disk vs `supabase_migrations.schema_migrations`).  
5. Print `evidenceLine`. Child env is allowlisted + `AT_SUPABASE_*` from `childCoordinates`. `--no-env-file` so `.env.local` hosted secrets never reach tests.  
6. Loop tier does **not** reset. Operator `bun run db:reset` is the same CLI reset without the proof/lock. Seed is enabled but `seed.sql` is missing — warning only. `db:reset` does **not** reset Auth rate limiters; a stack restart does.

Do not drive the live surface while an integration run is resetting it (`SKILL.md` 26–27).

---

**How the edge runtime decides which checkout it serves**

- One stack, `project_id = "poancmeitlmxejofwzuu"`, containers `supabase_<service>_poancmeitlmxejofwzuu`.  
- `[edge_runtime] policy = "per_worker"` (`config.toml` 472–477): hot reload in local dev.  
- Functions are served by **`supabase start`** at `{API}/functions/v1/<name>`. `bunx supabase functions serve` is only extra hot-reload and **must** run from the same checkout.  
- The edge container **bind-mounts** `supabase/functions` from the directory where start ran. Start from another worktree → stale or missing functions (measured 2026-09-02: 34 integration reds with a healthy stack). Fix: `bun run db:stop` then `bun run db:start` **from this checkout**. Brief for this item: restart from this worktree before integration or a browser drive.  
- `verify_jwt = true` on `complete-signup`, `project-need`, `discovery-message`, `discovery-conversation` (`config.toml` 491–588). Unauthenticated POST → 401 from Kong’s JWT gate (measured 2026-08-31).

---

**What a Vite dev server needs to call `http://127.0.0.1:44321/functions/v1/<name>` with a session from `/auth/v1`**

Env:

- Tracked `.env` points at the **hosted** project (`VITE_SUPABASE_URL=https://poancmeitlmxejofwzuu.supabase.co` and a hosted anon JWT with `iss=supabase` and `ref=…`).  
- Lovable config injects only `VITE_*` via `loadEnv(mode, cwd, "VITE_")` (`node_modules/@lovable.dev/vite-tanstack-config/dist/index.js` 400–405). Later files override: `.env` < `.env.local` < `.env.[mode]` < `.env.[mode].local`.  
- To hit the **local** stack, `.env.local` (gitignored) must set:

  - `VITE_SUPABASE_URL` = `API_URL` from `supabase status` (expected `http://127.0.0.1:44321`)  
  - `VITE_SUPABASE_PUBLISHABLE_KEY` = `ANON_KEY` from the same status (local `iss=supabase-demo`)  

- Hosted key + local URL (or the reverse) fails Kong signature / talks to the wrong project.  
- No server secret in the page. `src/lib/config.server.ts` is unused for this path. `src/lib/api/example.functions.ts` is a TanStack `createServerFn` example; Discovery must not use it.

CORS (functions — measured and shipped):

- `CORS_HEADERS` in `edge.ts` 83–87: `access-control-allow-origin: *`, allow-headers `authorization, apikey, content-type, x-client-info`, methods `POST, OPTIONS`.  
- `edgeHandler` answers OPTIONS with 204 (`edge.ts` 117). Proof: `loop/items/AI4DEV-57/proof-local.ts` check (m), Origin `http://localhost:3000`.  
- Origin `*` is deliberate: no cookie auth; caller must already hold the access token.  
- `Accept` is CORS-safelisted, so `Accept: text/event-stream` does not need to be in allow-headers. There is **no** `access-control-expose-headers`; a browser cannot read `x-vercel-ai-ui-message-stream`.  
- No Vite `server.proxy` in `vite.config.ts`. The browser calls 44321 **cross-origin**.

Auth CORS:

- Not configured in this repo. GoTrue/Kong vendor CORS, not `edge.ts`. This tree measures function preflight, not Auth preflight.  
- Browser signup/sign-in: `POST {API}/auth/v1/signup` and `POST {API}/auth/v1/token?grant_type=password` with JSON + `apikey` + `Authorization: Bearer <ANON_KEY>` — that is a preflighted request. Both headers are required (gotcha: 401 with a valid-looking token often means missing `apikey`).

Dev server vs Auth `site_url`:

- Vite (Lovable config) listens on **port 8080**, host `::`.  
- `site_url = "http://127.0.0.1:3000"`; `additional_redirect_urls = ["https://127.0.0.1:3000"]` only.  
- Clicking the confirmation mail in a browser redirects to **3000**, not 8080. Drives only need the 3xx. A human confirmation UX on the Vite origin needs `site_url` / redirect allow-list updated and Auth restarted. `localhost` vs `127.0.0.1` are different origins; functions CORS `*` hides that for functions, not for Auth redirects.

Session for the page:

- Same password grant as the drives, or `supabase-js` `signInWithPassword` against `{API}/auth/v1`.  
- Then every function call: `Authorization: Bearer <access_token>`, `apikey: <local ANON_KEY>`, `Content-Type: application/json`. Streamed send also `Accept: text/event-stream`.  
- Refresh before 120 s: `POST /auth/v1/token?grant_type=refresh_token`.  
- UI must not talk to Postgres. Reads go through `discovery-conversation` / `need-intake` / tenant functions.

### Files Read

- `.claude/skills/verify-ai4good/SKILL.md`
- `.claude/skills/verify-ai4good/features/README.md`, `email-signup-and-confirmation.md`, `ngo-signup-completion.md`, `need-intake.md`, `discovery-message.md`, `discovery-conversation.md`
- `.claude/skills/verify-ai4good/scripts/drive-ngo-signup.ts`, `drive-discovery.ts`, `drive-need-intake.ts` (through start/submit)
- `loop/items/AI4DEV-159/brief.md`
- `tests/at/harness/live-stack.ts`, `local-stack.ts` (through `prepareLocalStack` / `childCoordinates` / `evidenceLine`), `atconfig.ts` (lifetime pin), `runner.ts` (integration path), `local-stack.selftest.ts` (status mapping)
- `tests/at/suites/req-001/_live.ts` (lifetime check), `_live-tenant-reads.ts` (refresh)
- `supabase/config.toml`
- `supabase/functions/_shared/caller.ts`, `memberships.ts`, `edge.ts`, `write-routes.ts` (registry + `organizationIdField`), `acknowledgment-copy.ts`, `accounts.ts` (`validateCompleteSignup` / `decideSignupCompletion`), `need-intake.ts`, `verification.ts`
- `supabase/functions/complete-signup/index.ts`, `project-need/index.ts`, `discovery-message/index.ts`, `discovery-conversation/index.ts`
- `supabase/migrations/20260912120000_audit_actor_on_product_paths.sql` (`complete_signup`), `20260811130000_single_seat_org_and_single_developer_projects.sql` (`projects`), `20260917120000_project_need_intake.sql`, `20260917130000_project_need_save_and_submit.sql`, `20260918120000_project_need_attach.sql`, `20260919120000_project_need_snapshot.sql`
- `package.json`, `vite.config.ts`, `.env.example`, `.env` (public hosted values only), `.gitignore`, `src/lib/config.server.ts`, `src/lib/api/example.functions.ts`, `src/routes/index.tsx`, `src/routes/README.md`, `src/routes/__root.tsx`, `src/router.tsx`, `src/start.ts`
- `node_modules/@lovable.dev/vite-tanstack-config/dist/index.js` (port 8080, `loadEnv` `VITE_*`)
- `loop/items/AI4DEV-57/proof-local.ts` (CORS preflight measurement)

### Boundaries

- **In:** Auth HTTP (signup, verify, password grant, refresh), Mailpit HTTP, edge POSTs, operator SQL over `DB_URL`.  
- **Out:** `organizationId` + `projectId` + user `access_token` for the chat page; need stage `discovery_in_progress`; remaining allowance on later Discovery calls.  
- **Does not touch:** `src/` (placeholder). Discovery send/read is a later call on this user, not part of creating the NGO. Platform admin is a separate operator path.  
- **Harness vs browser:** drives use Bun `fetch` (no CORS). A Vite page is cross-origin to 44321 and must pass preflight.  
- **Hosted vs local:** tracked `.env` is hosted; local drives ignore it and read CLI status. A Vite page follows `VITE_*` and will hit hosted unless `.env.local` overrides.

### Non-Obvious Things

- Signup + confirm create **no** `public.accounts` row. Completion does.  
- “NGO admin” is two facts: global `account_type = ngo` **and** `org_memberships.role = admin` in the target org (`memberships.ts` header).  
- `project-need` `start` is what creates the project (`projects.name` = title). Complete-signup does not.  
- Discovery drive puts `description` on **start** so submit works in one extra call; need-intake drive starts empty and `save`s first. Submit with no description is 409 `missing-description`.  
- 120 s JWT is a **test pin**. Auth reads it at start. A stack started under another config issues the old lifetime; integration then fails 135 s later blaming the product (`_live.ts` `lifetimeProblem`).  
- Edge code is whatever checkout **started** the stack, not the worktree you are editing. Doctor check (a3) is the control.  
- `[auth.rate_limit] email_sent = 2` does **not** apply: `[auth.email.smtp]` is commented out. Applied limits: `sign_in_sign_ups = 30` and `token_verifications = 30` per 5 minutes per IP. Unique emails; if no mail in 20 s, restart the stack. `db:reset` does not reset limiters.  
- Analytics is **off** on purpose: `vector` crash-loop caused Kong 502 on signup (`config.toml` 533–557).  
- Never paste `db:start` keys; GitHub push protection refuses the branch.  
- Tracked `.env` is hosted on purpose (Lovable needs `VITE_*` in git). The test runner allowlist exists so those values cannot reach an integration child. A Vite page **will** use them unless overridden.  
- Vite port is **8080**, Auth `site_url` is **3000**. Confirmation redirect and the dev app are not the same origin.  
- `additional_redirect_urls` is `https://127.0.0.1:3000` (HTTPS), while `site_url` is HTTP.  
- Function CORS allows `*` and does not expose custom stream headers.  
- `discovery-conversation` is a read (`edgeHandler` + `resolveCaller`), not `writeRoute`. It does not spend credits.  
- UI rule: never call the database from `src/`. `callerReads` uses the **user JWT** against PostgREST from the **edge**, not from the browser.  
- `src/` currently has no Supabase client. `@supabase/supabase-js` is a devDependency; unused in the app tree.

### Open Questions

- Auth (GoTrue/Kong) CORS for Origin `http://localhost:8080` / `http://127.0.0.1:8080` is **not measured** in this tree. Function CORS is. I cannot cite a local transcript that an Auth preflight from the Vite origin succeeds.  
- Exact live `API_URL` / `ANON_KEY` / `DB_URL` / `MAILPIT_URL` strings are runtime CLI output, not files. Shape and ports are pinned; values are not committed (and must not be).  
- Whether Kong `verify_jwt` accepts the **anon** JWT as `Authorization` on a function (then `resolveCaller` 401s) vs rejecting it at the gateway: skill text says a request with **no** JWT is 401 from the gate. The anon-as-bearer case is not separately measured here.  
- Exact `supabase-js` auto-refresh offset vs a 120 s token was not read from the library source. Integration code refreshes at 20 s remaining; a hand-rolled page must do something equivalent.  
- How the future proof route will obtain `organizationId` / `projectId` (query params, path, dashboard) is out of this slice; no such route exists yet.
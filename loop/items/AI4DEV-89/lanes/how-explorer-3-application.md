I have the application-layer picture. Compiling the map of where code lives, how functions are wired, and what already exists for email.

### Components Found

**Repository identity.** `package.json` names the package `tanstack_start_ts`. It is a TanStack Start + Vite + React 19 app with a local Supabase stack. There is no npm/bun workspace. The only path alias is `"@/*": ["./src/*"]` in root `tsconfig.json` (lines 23–25), mirrored by `components.json` shadcn aliases (`@/components`, `@/lib`, `@/ui`, `@/hooks`).

**Top-level owners (product-relevant).**

| Path | Owns |
|---|---|
| `src/` | Front end only: TanStack Start router, one placeholder route, shadcn UI primitives, error wrappers. No domain services. |
| `supabase/functions/` | Every deployed HTTP surface and every product decision module. |
| `supabase/functions/_shared/` | Pure domain modules (no Deno, no I/O) plus one Deno-only I/O file (`edge.ts`). |
| `supabase/migrations/` | Schema as code. No notification tables. No triggers, no `pg_cron`, no `pg_net`. |
| `supabase/config.toml` | The one local stack (`project_id = "poancmeitlmxejofwzuu"`), ports, Auth, function JWT flags. |
| `tests/at/` | Acceptance harness, suites, expect manifests. Separate TypeScript program. |
| `tests/at/harness/vendors.ts` | The only email-provider stand-in. |
| `design/` | Screen specs, including a Notifications center that is not implemented. |
| `loop/` | Process, briefs, parked v1. Not product runtime. |
| `.claude/skills/verify-ai4good/` | Live-drive skill against the 44321 stack and Mailpit. |

**There is no `app/`, no `lib/` at repo root, no `src/services/`, no `src/domain/`.** Business logic that is not an edge-function entry point lives in `supabase/functions/_shared/*.ts`.

**Nine edge functions, two construction families.**

Write functions (all `Deno.serve(writeRoute({...}))`):

- `complete-signup` → RPC `complete_signup`
- `create-organization` → RPC `create_organization`
- `update-organization` → RPC `update_organization`
- `transfer-organization-contact` → RPC `transfer_organization_contact`
- `set-escalation-contact` → RPC `set_escalation_contact`
- `set-account-lifecycle` → RPC `set_account_lifecycle`

Read functions (all `Deno.serve(edgeHandler(...))`):

- `organization-dashboard` — caller-bound REST reads
- `project-workspace` — caller-bound REST reads
- `public-project` — service-role RPC `read_public_project`, `verify_jwt = false`

`WRITE_ROUTES` in `supabase/functions/_shared/write-routes.ts` also names a seventh write route that has no folder: `'discovery-message'` with `surface.kind: 'stand-in'` (lines 51–57). That is a decision hook for a future Discovery send, not a deployed function.

**Email today is Auth mail only.** GoTrue sends confirmation/recovery mail into the local Mailpit on port 44324. There is no product notification emitter, no outbox table, no SMTP client, no Resend/SendGrid SDK in `src/` or `supabase/functions/`. The H5 stand-in in `tests/at/harness/vendors.ts` is test-only.

**Background work: none in product code.** No worker process, no cron, no scheduled function, no drain loop, no queue table. The only delivery worker in the tree is the in-memory `drainDeliveries` on the REQ-016 loop fixture (`tests/at/suites/req-016/_fixture.ts`). REQ-016 has no `_live.ts`.

---

### Flow

#### 1. How an edge function is registered

1. Create `supabase/functions/<name>/index.ts`.
2. End it with `Deno.serve(...)`. Folder name is the URL name.
3. Declare `[functions.<name>]` in `supabase/config.toml` and set `verify_jwt`.
4. For writes, also add a row to `WRITE_ROUTES` with `surface: { kind: 'edge', rpc: '<sql_fn>' }`. `writeRoute()` throws if the name is missing or is a stand-in ( `edge.ts` lines 339–341).
5. Local serve: `bun run db:start` starts `[edge_runtime]` (`policy = "per_worker"`, Deno 2). The stack serves `http://127.0.0.1:44321/functions/v1/<name>`. Hot reload: `bunx supabase functions serve` from the same checkout (verify skill, SKILL.md lines 36–40). There is no `deno.json` and no import map; functions use relative imports only.

JWT: eight functions have `verify_jwt = true`; `public-project` has `verify_jwt = false` (`config.toml` lines 490–515). Platform JWT check is not identity. Identity is a second round trip.

#### 2. Anatomy of a write function (complete-signup / create-organization / update-organization)

Entry is thin. Example `complete-signup/index.ts` lines 19–33:

```
Deno.serve(writeRoute({
  name: 'complete-signup',
  decide: decideSignupCompletion,
  render: (value) => ({ accountId, accountType, organizationId }),
}));
```

`writeRoute` in `edge.ts` (lines 336–379) always does:

1. `edgeHandler` — OPTIONS → 204 with CORS; any throw → shaped 502 `{ ok: false, reason }` (lines 111–123).
2. Method must be POST, else 405.
3. `resolveCaller(request, SUPABASE_URL, ANON_KEY)` — read `Authorization`, `GET /auth/v1/user`, parse body without throwing, hand status+body to `callerFromAuthAnswer` (`caller.ts` lines 111–119). No caller → 401 `"authenticate before calling <name>"`.
4. `readJsonBody` — empty body is `{}`; non-object JSON → 400.
5. Optional `target` / `subject` / `from` extractors; non-UUID → 400 `{ kind: 'invalid-request' }`.
6. `loadWriteStanding` → one service-role RPC `write_standing`.
7. `writePipeline(spec, input)` — lifecycle/type gate (`writeGateDecision`) then `spec.decide`.
8. `callDatabaseFunction(rpc, decision.args)` — one `POST /rest/v1/rpc/<name>` with the service-role key. One round trip is one implicit transaction (`edge.ts` lines 271–276). That is the nearest existing pattern for “write the producer’s state and the outbox row atomically.”
9. RPC SQLSTATE → 409 with `parseWriteRefusalKind(details)`; other RPC failure → 502.
10. Success → `{ ok: true, ...render(value) }` status 200.

Auth: `requireEnv('SUPABASE_URL')`, `requireEnv('SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEY')`, `requireEnv('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY')` (`edge.ts` 54–60, 343–344). Dual names exist because the CLI renamed keys.

Errors never throw a bare status. `refusal(reason, status)` and `json({ ok: false, kind, reason }, status)` are the two shapes.

CORS: origin `*`, headers `authorization, apikey, content-type, x-client-info`, methods `POST, OPTIONS` (`edge.ts` 82–86). Comment states this is for `supabase-js` `functions.invoke` preflight. **No UI in `src/` actually calls `functions.invoke`.**

#### 3. Anatomy of a read function (public-project, organization-dashboard)

`public-project/index.ts` (full file, 23 lines): `edgeHandler` → POST only → `readJsonBody` → UUID check on `projectId` → `publicProjectAnswer(projectId, publicProjectReads())` → `json(answer.body, answer.status)`. No caller. Service-role RPC only.

`organization-dashboard/index.ts` and `project-workspace/index.ts`: authenticate via `resolveCaller`, then `callerReads(...)` which GETs PostgREST with the **caller’s** bearer (RLS), then a pure projector (`organizationDashboard` / `projectWorkspace` in `tenant-reads.ts`). Zero rows and “not yours” collapse to the same 404 `TENANT_NOT_FOUND`.

#### 4. Domain-module conventions (`_shared/`)

Split is load-bearing:

- **Pure half** (imported by tests): `accounts.ts`, `caller.ts`, `github.ts`, `verification.ts`, `memberships.ts`, `admin-operations.ts`, `write-routes.ts`, `tenant-reads.ts`, `public-project.ts`, `acknowledgment-copy.ts`. Constraints stated in every header: relative imports only, no `Deno`, no I/O, no clock, no randomness. Type-checked only because `tests/at` imports them. Root `tsconfig.json` `include` is `src/**` plus two config files — **nothing under `supabase/` is in the app program.**
- **I/O half**: `edge.ts` only. Deno-only. No type-checker covers it (`edge.ts` lines 11–16). Coverage is live-stack proof.

File naming: domain noun, kebab-case folders for functions, camelCase exported functions. Types sit next to the function that constructs them (`Caller` in `caller.ts`, `Decision<T>` in `accounts.ts`).

Database handle: there is no client object in domain code. Writes receive RPC argument bags (`SignupCompletionArgs`, `OrganizationCreationArgs`, …). Reads receive a `TenantReads` / `PublicProjectReads` port. `edge.ts` is the only file that `fetch`es PostgREST.

Errors: returned, never thrown.

- `Decision<T> = { ok: true; value: T } | { ok: false; reason: string }` (`accounts.ts` 85).
- `WriteRouteDecision<Args>` adds `kind: WriteRefusalKind` and `status` (`write-routes.ts` 188–195).
- Closed vocabularies: `ACCOUNT_TYPES`, `ACCOUNT_LIFECYCLES`, `ORG_ROLES`, `WRITE_REFUSAL_KINDS`. Unknown values fail closed (`parseAccountLifecycle` returns `null`).

`decideX` functions turn `WriteRouteInput` into RPC args. Example: `decideSignupCompletion` (accounts.ts 407–444) calls `validateCompleteSignup`, maps to `p_account_id`, `p_account_type`, … including stub GitHub stats.

#### 5. How tests invoke functions

- **Loop tier:** fixture adapters. REQ-001’s `_fixture.ts` imports the same `_shared` decide functions and stores in a Map. REQ-016’s `_fixture.ts` is an in-memory notification stand-in, not product code (its own header, lines 1–18).
- **Integration tier:** `tests/at/suites/req-001/_live.ts` `postWrite` → `functionPost` in `live-stack.ts` (lines 136–168): `POST {apiUrl}/functions/v1/{name}` with `apikey`, `Authorization: Bearer <access_token>`, optional `x-forwarded-for`.
- **Live drive:** `bun .claude/skills/verify-ai4good/scripts/drive-ngo-signup.ts` uses the same `functionPost`.
- REQ-016 has no `_live.ts`. `createHarness` above loop refuses (`index.ts` 234–238). Integration cannot grade the notification fixture.

#### 6. Email path as it exists

**A. Auth → Mailpit (real, local only).**

`[local_smtp] enabled = true`, web port 44324 (`config.toml` 114–117). `[auth.email] enable_confirmations = true` (273). GoTrue sends confirmation mail into Mailpit. `[auth.email.smtp]` is commented (284–291) — Auth uses the local catcher, not SendGrid.

`smtp_port = 44325` and `pop3_port = 44326` are **commented**, with the comment “Uncomment to expose additional ports for testing **user applications** that send emails.” Application-sent mail currently has no SMTP listener.

Rate limit: `[auth.rate_limit] email_sent = 2` per hour (231). A third signup in an hour sends no mail. `db:reset` does not reset that limiter; a stack restart does (verify feature file).

**B. Mailpit read (harness).**

`live-stack.ts`:

- `STACK_ENV.mailUrl = 'AT_SUPABASE_MAIL_URL'`
- `mailIdentification`: `GET {mailUrl}/api/v1/info`, require JSON `Version` (Mailpit). If that fails, it probes Inbucket `/api/v1/mailbox/probe` only to name the mismatch (lines 174–219).
- `mailMessagesFor`: `GET /api/v1/search?query=to:<address>&limit=50` then `GET /api/v1/message/{ID}/raw`
- `verifyLinksFor`: poll 20 s at 250 ms for `/auth/v1/verify` links with `type=signup|recovery`

`local-stack.ts` reads `MAILPIT_URL` then `INBUCKET_URL` from `supabase status -o json` (399–407). Config port is the first `[local_smtp] port` only, not `smtp_port`.

**C. H5 email stand-in (test-only, loop tier).**

`createEmailProviderSim()` in `tests/at/harness/vendors.ts` returns two faces over one queue:

- `port: EmailProviderPort` — SUT sees `deliver(send) → 'accepted' | 'rejected' | 'no_ack'`
- `sim: EmailProviderSim` — test sees `rejectNext`, `acceptButLoseAck`, `attempts()`, `accepted()`

The port **cannot see** `'ack_lost'`. Lost ack returns `'no_ack'` (lines 10–15, 119). Idempotency key is `JSON.stringify([eventId, recipientId, channel])` (61–62). Replays of an accepted identity return `'accepted'` without consuming a forced outcome.

`createHarness` at loop (`index.ts` 227–231) builds one sim, hands `port` to the fixture adapter and `sim` to `h.vendors.email`. Above loop, `vendors` is a refusing proxy and is **absent from `TierHarness`** (`contracts.ts` 206–227). Integration bodies cannot compile a `h.vendors.email` access. Live mail is Mailpit via the live adapter, not the vendor seam.

**D. What a real provider client would look like beside the stand-in.**

The seam is `EmailProviderPort` (`vendors.ts` 40–42):

```
deliver(send: { recipientId, eventId, channel }): 'accepted' | 'rejected' | 'no_ack'
```

A product client would implement that port: HTTP/SMTP to a vendor, map 2xx → `'accepted'`, stated refusal → `'rejected'`, timeout/unknown → `'no_ack'`. It would send the same triple as the idempotency key. It would **not** expose `ack_lost` to the worker. The worker marks a row `sent` only on `'accepted'` — already encoded in the fixture’s `runDeliveryPass` (`_fixture.ts` 352–374).

The stand-in is not a product module. Product code would live next to other `_shared` ports or as a Deno I/O helper beside `edge.ts`. Nothing in `src/` or `supabase/functions/` imports `vendors.ts`.

**E. Verification commands that drive the catcher.**

From `.claude/skills/verify-ai4good/SKILL.md`:

```
bun run db:start
bun run db:reset
bun .claude/skills/verify-ai4good/scripts/drive-ngo-signup.ts [outDir]
```

Doctor:

```
Invoke-RestMethod http://127.0.0.1:44321/auth/v1/health
bunx supabase status -o json          # API_URL must be http://127.0.0.1:44321; MAILPIT_URL is the catcher
docker ps --format '{{.Names}}' | Select-String poancmeitlmxejofwzuu
docker inspect supabase_edge_runtime_poancmeitlmxejofwzuu --format "{{json .Mounts}}"
```

Drive recipe (SKILL.md 94–114; `features/email-signup-and-confirmation.md`):

1. `POST {API}/auth/v1/signup`
2. Mailpit `GET /api/v1/search?query=to:<address>&limit=50` then `GET /api/v1/message/{ID}/raw`
3. Follow `/auth/v1/verify` with redirects disabled
4. `POST {API}/auth/v1/token?grant_type=password`
5. Edge function with the access token
6. Read rows over `DB_URL` with Bun `SQL` — **not** REST with the service-role key (`organizations` and `acknowledgments` 403)

Evidence: `loop/verify-evidence/<yyyyMMdd-HHmmss>/transcript.json`, redacted. Feature map lists five HTTP features; no notification feature.

#### 7. Configuration

**No product `ConfigRegistry`.** That type exists only in `tests/at/harness/config.ts` as a reader over `AT_CONFIG`.

Product knobs today:

| Source | What |
|---|---|
| `supabase/config.toml` | Ports, JWT expiry 120, confirmations, OAuth blocks, function JWT flags, Mailpit |
| `Deno.env` via `requireEnv` | `SUPABASE_URL`, anon/publishable key, service-role/secret key |
| `src/lib/config.server.ts` `getServerConfig()` | `process.env.NODE_ENV` only. Comment shows where `DATABASE_URL` / Stripe would go. `.server.ts` suffix keeps it out of the client bundle. |
| Tracked `.env` | Public `VITE_SUPABASE_*` and `SUPABASE_*` hosted project id/url/publishable key. **`src/` does not read them.** |
| Git-ignored `.env.local` | Secrets. `config.toml` `env(SUPABASE_AUTH_EXTERNAL_GOOGLE_*)` etc. CLI does **not** auto-load `.env.local`; values must be in the process env (`/.env.example` lines 58–64). |
| `tests/at/harness/atconfig.ts` | Pinned numbers for tests. Anti-spam: `threadCommentNotificationsMaxPerWindow = 2`, `WindowMs = 60_000`, `Coalesce = false` (lines 161–181). Source text: “TEST-PINNED … production values remain unstandardized”. Dotted keys in `CONFIG_KEYS`: `req-015.thread_comment_notifications.max_per_window` / `window_ms` / `coalesce`. |

The anti-spam guard is not a product setting. REQ-016’s fixture reads those keys at burst time (`_fixture.ts` 451–455). A product pin would be a new module; copying `ConfigRegistry` into `src/` would be inventing a second registry.

Integration children get an allowlisted env only (`local-stack.ts` `ENV_ALLOWLIST` + `AT_SUPABASE_*`). They launch with bun `--no-env-file` so `.env.local` cannot point a test at the hosted project.

#### 8. UI

Front end is TanStack Start, file-based routes in `src/routes/`. Only `__root.tsx` (shell, QueryClient, 404/error) and `index.tsx` (centered `<h1>ai4good</h1>`). `src/routes/README.md` says do not invent `src/pages/` or Next conventions. Generated tree: `src/routeTree.gen.ts`.

`src/components/ui/` is shadcn new-york (including `sonner.tsx` toasts). That is not an in-app inbox.

**Where an in-app list would live (ground, not a design):**

- Implemented routes would be new files under `src/routes/` (e.g. a notifications route per the README table).
- Design spec: screen 22 “Notifications center” in `design/ui-ux-instructions.md` lines 339–343 (Batch 5). Empty state named. Taxonomy is REQ-016.
- App shell: notifications bell on the top bar (same file, line 143). Design only; no shell component in `src/` beyond `__root.tsx`.
- `src/hooks/use-mobile.tsx` is the only hook.

**Project rule (AGENTS.md / CLAUDE.md):** UI never touches the DB; UI always goes through an edge function.

**There is no example in `src/` of UI calling an edge function.** The only file under `src/lib/api/` is `example.functions.ts`, a Lovable template `createServerFn` (`getGreeting`) whose comment says to use that pattern **instead of** Supabase Edge Functions (lines 11–12). That comment conflicts with the project rule. Nothing imports `getGreeting`. Closest real call is `functionPost` from tests and the verify drive.

A future inbox would POST to a new authenticated read function the way `organization-dashboard` posts `{ organizationId }`, not `createClient` from the browser against tables.

#### 9. Background work — nearest patterns if a delivery worker is added

Nothing to host a drain today. Nearest existing shapes:

1. **In-memory worker in the REQ-016 fixture** — `NotificationsSut.drainDeliveries({ passes? })` (`_contract.ts` 164–170, `_fixture.ts` 409–439). Tests invoke it on `h.sut.notifications`. Default is run-to-quiescence; `passes` is a whole number ≥ 1. Email `sent` only on `vendors.email.deliver === 'accepted'`. This is the contract a product worker must satisfy; it is not product code.
2. **HTTP-invoked edge function** — a drain could be another `Deno.serve` handler, invoked from tests with `functionPost` exactly as writes are. No cron block exists in `config.toml`.
3. **Atomic producer write** — `writeRoute` → one RPC. Outbox rows would be inserted inside that SQL function, not from TypeScript after the RPC returns.
4. **Stand-in route row** — `discovery-message` in `WRITE_ROUTES` shows how a route can exist as a decision before it is deployed. A worker is not a write route, but the inventory pattern is there.
5. **Parked v1** (`loop/parked/v1/`) has the old slot pool and ceremony. It is not live and must not be imported.

No `CREATE TRIGGER`, no `pg_cron`, no `pg_net` in migrations.

---

### Files Read

**Root / config:** `package.json`, `tsconfig.json`, `vite.config.ts`, `eslint.config.js`, `bunfig.toml`, `components.json`, `.prettierrc`, `.env`, `.env.example`, `supabase/config.toml`, `supabase/migrations/README.md`.

**App:** `src/router.tsx`, `src/start.ts`, `src/server.ts`, `src/routes/__root.tsx`, `src/routes/index.tsx`, `src/routes/README.md`, `src/lib/api/example.functions.ts`, `src/lib/config.server.ts`, `src/lib/utils.ts`, `src/lib/error-capture.ts`, `src/lib/error-page.ts`, `src/lib/lovable-error-reporting.ts`, `src/hooks/use-mobile.tsx`.

**Edge functions (full):** `complete-signup/index.ts`, `create-organization/index.ts`, `update-organization/index.ts`, `public-project/index.ts`, `organization-dashboard/index.ts`, `project-workspace/index.ts`, `set-account-lifecycle/index.ts`, `set-escalation-contact/index.ts`, `transfer-organization-contact/index.ts`.

**Shared:** `edge.ts` (full), `caller.ts` (full), `write-routes.ts` (full), `accounts.ts` (header + decide functions), `tenant-reads.ts` (full), `public-project.ts` (full), `memberships.ts` (header + rename), `admin-operations.ts` (header + transfer), `verification.ts` (header + emailVerifiedFromUser), `github.ts` (header + extractGithubHandle + stub), `acknowledgment-copy.ts` (full).

**Harness / email:** `tests/at/harness/vendors.ts` (full), `vendors.selftest.ts` (header), `config.ts` (full), `atconfig.ts` (full), `contracts.ts` (vendor + harness types), `index.ts` (adapter load + createHarness), `live-stack.ts` (full), `local-stack.ts` (config/status/mail/childCoordinates), `runner.ts` (usage + vitest spawn), `check.ts` (header), `clock.ts` (header), `suite-adapters.ts`, `typecheck.ts` (full), `tests/at/vitest.config.ts`, `tests/at/tsconfig.json`, `tests/at/README.md`.

**REQ-016 fixture:** `_fixture.ts` (header + worker), `_contract.ts` (SUT + drain), `taxonomy.ts` (channel types, sampled).

**REQ-001 live:** `_live.ts` (header + `postWrite`), `_write-route-scan.ts`.

**Verify skill:** `SKILL.md` (full), `features/README.md`, `features/email-signup-and-confirmation.md`, `scripts/drive-ngo-signup.ts` (header + doctor), `scripts/tsconfig.json`.

**Design / brief:** `design/ui-ux-instructions.md` (shell + screen 22), `loop/items/AI4DEV-89/brief.md` (header), `loop/parked/v1/README.md` (header).

---

### Boundaries

| Boundary | In | Out |
|---|---|---|
| Browser / UI | React routes, shadcn, `createServerFn` template | Must not `createClient` against tables. Must not import `_shared/edge.ts`. |
| Edge entry (`index.ts`) | HTTP Request | `Deno.serve(writeRoute\|edgeHandler)`. No decide logic, no fetch. |
| Pure `_shared` | Plain data (`Caller`, body, standing) | `Decision` / `WriteRouteDecision` / projected DTO. No Deno, no DB. |
| `edge.ts` | Request, env, Auth/DB HTTP | `Response`. Owns CORS, caller I/O, RPC. |
| Database RPC | `p_*` args from decide | One transaction. Service role. Functions re-check what TypeScript already decided. |
| Test loop fixture | Harness clock, config, `EmailProviderPort` | In-memory SUT. Not product. |
| Test live adapter | `Stack` (api, db, anon, service role, mail) | HTTP to Auth + `/functions/v1/*` + Mailpit + SQL. |
| EmailProviderPort vs Sim | Worker sees only accept/reject/no_ack | Test sees forced outcomes including `ack_lost` and the attempt trace. |
| Auth mail vs app mail | GoTrue → Mailpit 44324 | No product SMTP. 44325 not exposed. |
| ConfigRegistry | Dotted keys over `AT_CONFIG` | Tests only. No product twin. |
| Typecheck programs | `src/**`; `tests/at/**` (and what it imports); verify scripts | Edge `index.ts` and `edge.ts` are unchecked. |

`writeRoute` is the only allowed database reach for write functions. `_write-route-scan.ts` fails a write `index.ts` that names `callDatabaseFunction`, `/rest/v1/`, `createClient`, `.rpc(`, or the service-role key.

---

### Non-Obvious Things

1. **REQ-016 product code does not exist.** Loop greens are against `tests/at/suites/req-016/_fixture.ts`, which says so in its first paragraph. There is no `_live.ts`, so integration refuses.

2. **`edge.ts` and function `index.ts` files are not type-checked.** `bun run typecheck` runs three programs: app `tsconfig.json`, `tests/at/tsconfig.json`, verify-drive tsconfig. Shared modules are checked only via test imports.

3. **One RPC = one transaction.** Four Data API writes would be four transactions (`edge.ts` 271–276). An outbox row that must commit with a ledger write belongs inside the SQL function, not after `callDatabaseFunction` returns.

4. **Mailpit is Auth’s catcher, not a notification provider.** Application SMTP port is commented out. A real provider client talking HTTP to Resend would never appear in Mailpit unless something extra is wired.

5. **CLI renamed the catcher.** Status JSON may carry `MAILPIT_URL` or `INBUCKET_URL`. Identification requires Mailpit’s `/api/v1/info` `Version`. Inbucket is only used to explain a refusal.

6. **`email_sent = 2` per hour** stalls live drives. Reset does not clear it; restart does.

7. **Lovable template vs project rule.** `example.functions.ts` tells authors to prefer `createServerFn` over edge functions. AGENTS.md / CLAUDE.md require UI → edge function, never DB. No `src/` code has chosen yet; the placeholder UI calls neither.

8. **`discovery-message` is a stand-in in `WRITE_ROUTES`.** `verification.ts` `discoveryMessageAllowed` is the hook that route must call. No function folder exists. Same shape a notification emit route could use before it is deployed — but emit is not a user-facing write.

9. **GitHub stats on volunteer signup are a stub** (`stubGithubStatsFor` in `github.ts`). Header forbids reading a green as a real GitHub call.

10. **`.env.example` still documents the Auth callback as `http://127.0.0.1:54321/...`.** The live API port is 44321. The 543xx block was abandoned because it sat in Windows’ dynamic TCP range (`config.toml` lines 11–18).

11. **`supabase/seed.sql` is referenced and absent.** `db:reset` warns; migrations are the state.

12. **Service-role REST SELECT is not universal.** Verify skill: `organizations` and `acknowledgments` 403; readback is Postgres over `DB_URL`.

13. **`verify_jwt = true` does not identify the user.** `resolveCaller` still asks `/auth/v1/user` so the function does not decode JWT `sub`.

14. **Anti-spam knobs are test pins owned by REQ-015 names inside REQ-016’s suite.** Product has no matching setting.

15. **Static provider scan (`h.static.providerClientImporters`) is a refusing capability.** AT-016.01 is declared red on that name in the expect manifest (`index.ts` 214–215). A source scan of product importers is not implemented.

16. **Parked v1 is not a spare worker runtime.** `loop/parked/v1/README.md` says do not run or import it.

17. **No Deno import map.** Shared modules must stay in the Node∩Deno intersection (plain TypeScript, relative imports). A product `EmailProviderPort` implementation that needs `npm:` / `jsr:` cannot live in a file `tests/at` imports unless it stays off that program the way `edge.ts` does.

18. **Write functions must be exactly `Deno.serve(writeRoute(` once.** The write-route scan rejects `edgeHandler` construction for write names. A notification *emit* that is a write would follow `writeRoute`. A *drain worker* that only reads the outbox and calls a provider would more closely follow `organization-dashboard`’s `edgeHandler` — or a new pattern, because none exists.

---

### Open Questions

1. **Where the product emitter module should live** is not settled by existing code. Closest convention is a new `_shared/notifications.ts` (pure decide + taxonomy) plus either a `writeRoute` emit surface or in-process calls from other decide functions. The suite’s sole-writer claim (AT-016.01) also wants a source scan that no product file can pass yet.

2. **Where the delivery worker process lives** is unset. Options that already have invocation paths: another edge function POSTed by tests via `functionPost`; a SQL function + HTTP drain; a Node worker next to the Vite server. None of those exist. Cron is not configured.

3. **How a real email client is configured** is unset. There is no `RESEND_API_KEY` / SMTP env in `.env.example`. `getServerConfig()` has no mail fields. Mailpit 44325 is off, so a local SMTP client would have nowhere to connect unless that port is enabled.

4. **In-app channel storage** has no table and no read function. Screen 22 is design-only. A list would need a new authenticated read like `organization-dashboard`, not a direct table grant.

5. **Whether TanStack `createServerFn` is ever allowed** for notifications is in tension: the Lovable file says yes, the standing project rule says UI goes through edge functions. No shipped UI call exists to copy.

6. **Product-side pin for the thread-comment guard** does not exist. `AT_CONFIG` says production values are unstandardized until REQ-015.

7. **I did not run the stack or Mailpit.** Port numbers and Mailpit API shapes are from config and code, plus comments that cite earlier live proofs (`loop/items/AI4DEV-58`, `AI4DEV-59`, `AI4DEV-60`). I did not re-measure `/api/v1/info` on this machine.

8. **I did not read every migration SQL file.** Grep found no `notification`, `outbox`, `pg_cron`, or `CREATE TRIGGER`. A notification schema would be a new timestamped file under `supabase/migrations/`.
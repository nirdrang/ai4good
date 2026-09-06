### Components Found

**Registration and suite binding**

- `atTest` (`tests/at/harness/registry.ts:861`) — the only place an AT id becomes a vitest `it()`. Parses the id, checks it against the suite binding, registers once, wraps the body with `open()` / teardown / `expect.hasAssertions()`.
- `bindSuite` (`registry.ts:1005`) — REQ-001’s one harness contact. Names `requirement: 'req-001'` and `sut: 'accounts'`. Returns a bound `atTest` so bodies write `atTest(id, title, body)` and never name seam types.
- `parseAtId` (`registry.ts:44`) — grammar `AT-<requirement>.<number>`; last dot-segment is the test number (`AT-005.5.03` is valid).
- `SuiteBinding` (`registry.ts:111`) — `{ requirement, sut, sutMissingDetail? }`. Requirement must be a `SuiteId`; `sut` must be a `SutKeyOf<R>`.
- `AtPending` (`tests/at/harness/pending.ts:3`) — `name = 'AtPending'`, message `${atId} PENDING [${phase}] — ${detail}`. Phases: `harness-missing | sut-missing | tier-unset`.
- `CapabilityPending` (`pending.ts:14`) — `name = 'CapabilityPending'`, message `CAPABILITY PENDING — ${names joined by ', '}`.
- `chooseTierBody` / `tierBodyProblem` (`registry.ts:740–771`) — a per-tier map must cover every tier or supply `default`. A hole reports MISSING, which no declaration can describe.
- `OpenWorld` / `AtContext` (`registry.ts:312–342`) — what `open()` hands a body: `{ h, w, sut }`. `sut` is already the bound member (`AccountsSut`), not `{ accounts: … }`.

**Type derivation (forbids a seam nothing supplies)**

- `AdapterModules` (`tests/at/harness/suite-adapters.ts:108`) — one compile-time map. REQ-001’s types are `typeof import('../suites/req-001/_fixture.ts')`.
- `SutOf<R,K>` / `WorldOf<R>` (`suite-adapters.ts:126–137`) — read off the fixture adapter’s return type. `bindSuite` / `atTest` take no shape arguments.
- `AccountsSut` (`tests/at/suites/req-001/_contract.ts:375`) — the accounts system under test. Both adapters annotate their object as this type (`_fixture.ts:791`, `_live.ts:227`). Excess-property check forbids extra methods; a missing method is a compile error on that adapter.

**Expected-state and bijection**

- `loadTierExpectation` (`tests/at/harness/expected.ts:519`) — read, parse, bijection with P0 ids; throws before any test runs.
- `declaredDetail` / `detailMatches` (`expected.ts:286–296`) — two shapes only:
  - `capability-pending` → whole first line `CapabilityPending: CAPABILITY PENDING — <names joined by ', '>`
  - `pending` → **anchored prefix** `AtPending: ${atId} PENDING [${phase}] — ` (em dash U+2014). Tail is free.
- `inspectBijection` (`tests/at/harness/check.ts:107`) — static regex over `atTest('AT-…'` call sites vs P0 ids in `.taskmaster/docs/acceptance/at-req-001.md`.
- `tests/at/expected/req-001.json` — the committed contract. Loop: 25 green / 12 red. Integration: 20 green / 17 red. All 37 P0s appear at both tiers.

**Runner and stack**

- `main` (`tests/at/harness/runner.ts:288`) — `bun run at:verify req-0NN --tier <loop|integration|drill> [--expect]`.
- `prepareLocalStack` (`tests/at/harness/local-stack.ts:975`) — identity proof, wait, config-drift check, second proof, `supabase db reset --local`, wait, migration-set proof.
- `lifetimePinProblem` (`local-stack.ts:907`) — `config.toml` `[auth] jwt_expiry` must equal `AT_CONFIG.accessTokenLifetimeSeconds.value` (120). Asked **before** the lock.
- `acquireStackLock` (`tests/at/harness/stack-lock.ts:120`) — machine-wide exclusive create keyed by project id + api port. Only a dead pid can be taken over.
- `createHarness` (`tests/at/harness/index.ts:190`) — loop: `ControlledClock` + `_fixture.ts`. Integration: `RealClock` + `_live.ts`; vendors seam is a refusing proxy.
- `AT_CONFIG` (`tests/at/harness/atconfig.ts:35`) — single source for pinned numbers. `accessTokenLifetimeSeconds` is **not** in `CONFIG_KEYS` (`config.ts:31`); suites read `AT_CONFIG` directly, not `h.config.get()`.

**REQ-001 adapters and pending ledger**

- `createFixtureAdapter` (`tests/at/suites/req-001/_fixture.ts:439`) — Map storage. Every product judgement imported from `supabase/functions/_shared/*`. Clock stamps session expiry from `AT_CONFIG.accessTokenLifetimeSeconds`.
- `createLiveAdapter` (`tests/at/suites/req-001/_live.ts:200`) — HTTP to Auth and deployed functions; operator SQL via `sqlClient(stack)` on `dbUrl`.
- `liveTenantReads` (`tests/at/suites/req-001/_live-tenant-reads.ts:123`) — caller-bound Data API GETs, dashboard/workspace/public-project POSTs, and `tenantTableFacts`.
- `LEAF` / `notLanded` (`tests/at/suites/req-001/_pending.ts:47–90`) — remaining pending labels: `D3_L3`, `D6_L1`, `D6_L2`, `D6_L3`. `notLanded` throws `AtPending(ctx.atId, 'sut-missing', \`REQ-001 ${leaf} has not landed\`)`.
- Operator Givens on `AccountsSut` (`_contract.ts:628–706`): `provisionPlatformAdmin`, `createOrganizationAsOperator`, `grantMembershipAsOperator`, `repointMembershipAsOperator`, `createProjectAsOperator`, `assignVolunteerAsOperator`, `retypeAccountAsOperator`.

---

### Flow

**1. `bun run at:check req-001`**

`check.ts:main` → `normalizeRequirement` → `inspectBijection`. Reads P0 ids with `/AT-001\.(\d+[a-z]?)\*?\*?\s*\(P0\)/` from `.taskmaster/docs/acceptance/at-req-001.md`. Reads every `atTest(\s*['"\`](AT-[\d.]+[a-z]?)` in `tests/at/suites/req-001/*.test.ts`. Exit 0 iff exact bijection (37 P0s, 37 call sites, no extras, no duplicates). Does not import or run tests.

**2. `bun run at:verify req-001 --tier <tier> --expect`**

`runner.ts:parseArgs` (no default tier). `--wired` + `--expect` refused (exit 2).

Bijection preflight (`inspectBijection`). Any problem → exit 2, no tests.

If `--expect`: `loadTierExpectation('001', tier, expected)`. Missing/malformed file, unknown tier, or ids not in bijection with P0s → exit 2, no tests, no lock.

Loop: no lock, no stack, no reset.

Integration (`runner.ts:385–429`):

1. Refuse if `AT_REPO_ROOT !== INSTALL_ROOT`.
2. `readLocalConfig` (`project_id`, `[api] port`, `[db] port`, `[auth] jwt_expiry`, optional `[local_smtp] port`).
3. `lifetimePinProblem` — if `jwt_expiry !== AT_CONFIG.accessTokenLifetimeSeconds.value`, refuse **before** the lock.
4. `acquireStackLock(config, 'req-001')`.
5. `prepareLocalStack`:
   - `proveTarget` (`supabase status -o json` through `supabaseInvocation`, which sets `SUPABASE_PROJECT_ID` positively and allowlists the env).
   - `identityVerdict`: foreign container names refuse; no JSON → “run `bun run db:start`”; loopback/ports/local JWT issuer `supabase-demo`; at least one own container name.
   - `waitForReady` (Postgres `select 1` + gateway `/rest/v1/`).
   - Re-read `config.toml`; `configDriftProblems` refuses if identity fields moved.
   - Second `proveTarget` immediately before reset.
   - `resetLocalDatabase` → pinned CLI `db reset --local` (same work as `bun run db:reset`, not the npm script).
   - `waitForReady` again.
   - `proveMigrationsReplayed` — disk `supabase/migrations/<14-digit>_*.sql` vs `supabase_migrations.schema_migrations`.
6. Evidence line: project, api port, reset OK, migration counts, lock file, git head.

Drill: infrastructure refusal, no database (`runner.ts:378`).

Then spawn vitest (`runner.ts:439`): `--root tests/at`, `--config tests/at/vitest.config.ts`, `suites/req-001/`, env `childEnv({ AT_TIER, AT_REGISTRATION_DIR, AT_SUPABASE_* })`. Child is bun `--no-env-file`.

**3. `atTest` registration and one body**

Suite file imports `{ atTest }` from `_bind.ts`, which is `bindSuite({ requirement: 'req-001', sut: 'accounts', sutMissingDetail: … })`.

`atTest('AT-001.25', title, body)`:

1. Resolve body: function → every tier; map → this process’s `AT_TIER` (or `default` / `loop` if unset).
2. `parseAtId`; `requirementMismatch` (`AT-001.25` → `"001"` must equal bound `"req-001"`).
3. Duplicate id throws at registration.
4. `it('AT-001.25 — <title>', …, timeout)`. Timeout from `timeoutMs[tier]` or vitest 30s. Integration AT-001.12/13 raise to `INTEGRATION_TIMEOUT_MS = 240_000`.
5. Body gets `ctx.open(fixture?, { config? })`. Default fixture name: `req-001/base`.
6. `openWorld`: if `TIER === null` → `AtPending(…, 'tier-unset')`. If no harness module → `harness-missing`. If above loop and no `_live.ts` → `CapabilityPending(['fixtures.worlds', 'sut.accounts'])`. Else `createHarness` → `h.sut.accounts`; missing → `AtPending(…, 'sut-missing', sutMissingDetail)`. Then `h.fixtures.world(name)`.
7. `open()` returns `{ h, w, sut }` with `sut` already `AccountsSut`. Bodies write `const { w, sut } = await ctx.open()`.
8. After the body: `testUseProblem` — zero opens and zero captures → `INVALID`. A thrown `AtPending` / `CapabilityPending` wins first, so a pending stub that never opens is still that class (AT-001.24 loop). `refusesWith` still opens first so the id is exercised.
9. `runTrackedTest` tears worlds then harnesses; a teardown rejection fails the test if the body passed.

Runtime registrations are appended as JSONL under `AT_REGISTRATION_DIR`. The runner requires exactly one registration and exactly one vitest result per expected id, with title `AT-001.NN — <registered title>`.

**4. Loop vs integration `sut`**

Loop (`index.ts:227` → `_fixture.ts`):

- Storage: Maps for auth users, sessions, accounts, orgs, memberships, projects, acknowledgments, volunteer profiles, discovery messages.
- Judgements: `validateCompleteSignup`, `callerFromAuthAnswer`, `orgAdminActionAllowed`, `discoveryMessageAllowed`, `emailVerifiedFromUser`, `stubGithubStatsFor`, `organizationDashboard` / `projectWorkspace` / `publicProjectAnswer`.
- Clock: `ControlledClock.now()` stamps `expiresAtMs = now + ACCESS_TOKEN_TTL_MS`. AT-001.12 loop body `advance`s exactly the TTL.
- Registration **mints a session** (declared divergence vs live confirmations).
- Viewer Data-API methods and `tenantTableFacts` throw `CapabilityPending(['sut.accounts.tenantReadAsViewer'])`.
- World: `AccountsFixtureWorld.email(local)` → `${local}+w${serial}@example.test`.

Integration (`index.ts:234` → `_live.ts`):

- Auth over HTTP: `/auth/v1/signup`, `/token?grant_type=password|refresh_token`, `/logout?scope=local`, `/recover`, `/user`, `/admin/users`.
- Product writes: `functionPost` to `complete-signup`, `create-organization`, `update-organization`.
- Registration returns `{ sessionId: '' }` — no fabricated tokens. Session-taking ops `tokensOf` refuse that handle by name.
- First real access token: `lifetimeProblem` must equal the pin or the adapter throws “run `db:stop` then `db:start`”.
- Unbacked methods throw named `CapabilityPending` (`_live.ts:820–825`): `registerWithProvider`, `registerWithGithub`, `signInWithProvider`, `sendDiscoveryMessage`, `discoveryMessagesBy`, `publicSignupAccountTypes`.
- World: email namespace from fixture name + timestamp + random. `teardown` is a no-op; the run’s reset already emptied the database.
- Mail: Mailpit identification probe, then `verifyLinksFor`.

**5. Operator Givens — authority**

| Method | Loop | Live |
|---|---|---|
| `provisionPlatformAdmin` | `register(…, confirmedByTheCreator=true)` then write `accounts` row of type `platform_admin`, bypassing `completeSignup` | `POST /auth/v1/admin/users` with **service-role JWT** (`email_confirm: true`), then **operator SQL** `insert into public.accounts (id, account_type) values (…, 'platform_admin')`. Service role has no INSERT. Then password grant; returns a real session. |
| `createOrganizationAsOperator` | Map insert, no membership. Throws on bad name. | `insert into public.organizations (name) … returning`. Throws if no row. |
| `grantMembershipAsOperator` | Mirrors BEFORE trigger then unique index; returns outcome. | Plain `insert into public.org_memberships`. Classifies `42501` + “NGO accounts only” → `not-an-ngo-account`; `23505` + index name → `org-already-seated`. |
| `repointMembershipAsOperator` | Re-keys the Map row. | `update public.org_memberships set account_id = …`. Same trigger classification. |
| `createProjectAsOperator` | Map insert, seat null. Throws. | `insert into public.projects (org_id, name)`. |
| `assignVolunteerAsOperator` | Mirrors two BEFORE UPDATE triggers in name order. | `update public.projects set assigned_volunteer_id = …`. Sentence-primary classification: volunteer-only vs single-developer-seat. |
| `retypeAccountAsOperator` | Mutate Map type. Throws if missing. | `update public.accounts set account_type = …`. |

Live SQL is `sqlClient(stack)` on `AT_SUPABASE_DB_URL` — the Postgres superuser connection, **not** the service-role JWT. Service role holds SELECT on `accounts` and `org_memberships` only (pinned by `assertTenantCatalog` in `_integration.ts:164–199`).

`linkGithubIdentity` on live is also operator SQL into `auth.identities` (double-cast `::text::jsonb`). Used as scenery for AT-001.06/09/37, not as the act for AT-001.04/05.

**6. `tenantTableFacts` and privilege pinning**

Live query (`_live-tenant-reads.ts:263–329`): `pg_class` + `has_table_privilege` for select/insert/update/delete/**truncate/references/trigger** × anon / authenticated / service_role; `pg_policies`; `pg_proc` where `prosecdef`.

`assertTenantCatalog` (`_integration.ts:168–199`) pins:

- Every live public table is in `TENANT_CATALOG` (`_policy-scan.ts:21`): orgs/memberships/projects/acknowledgments = `tenant-isolated`; accounts/volunteer_profiles = `unreachable-by-client-roles`.
- `FORCE ROW LEVEL SECURITY` is false.
- anon: `[]` on every table.
- service_role: `['select']` on `accounts` and `org_memberships`, else `[]`.
- tenant-isolated: RLS on, authenticated `['select']`, ≥1 policy, no tautological `USING`.
- unreachable: authenticated `[]`.
- SECURITY DEFINER functions: anon execute false; authenticated execute only `viewer_is_org_member`, `viewer_is_platform_admin`, `viewer_is_volunteer`.

Static half: `tenantCatalogProblems()` over `supabase/migrations/*.sql`, graded at loop by AT-001.21/22 and by `policy-scan.selftest.ts`.

**7. `--expect` comparison**

After vitest: `analyzeReportedTests` builds per-id green/red/missing. Then `expectationDeviations` + `reportAccountingDeviations`.

A declared red that is green is a failure (“update the declaration in this same change”). A red whose first line is not the rebuilt shape is a failure. A redacted detail (`<redacted-token>` etc.) is undeclarable.

Prefix for `pending`: `AtPending: AT-001.25 PENDING [sut-missing] — ` — class, id, phase, em dash; tail free. That is why a stub saying “todo” would still match, which is why each leaf writes `loop/items/<item>/pending-ledger.txt`.

Arithmetic: failed tests = declared reds, passed = greens, total = sum, pending/todo = 0. File-level: a failed file with zero failed tests, or a non-empty `message`, is a deviation.

**8. How a leaf flips an id from red to green**

Must change, in the **same** change:

1. **The one `atTest` call site.** Today:
   - `e-admin-operations.test.ts:12–20` — AT-001.25, .26, .27, .28, .35 = `notLanded(LEAF.D6_L1)`.
   - `f-lifecycle-and-audit.test.ts:44–48, 127–129` — AT-001.29/.30/.31 = `D6_L2`; .33/.34 = `D6_L3`.
   - AT-001.18 stays `notLanded(LEAF.D3_L3)` in `c-membership-and-acknowledgment.test.ts:399`.
   Replace `notLanded(…)` with a real body (single function, or `{ default, integration }` like AT-001.01). Integration bodies that wait real time also set `timeoutMs: { integration: INTEGRATION_TIMEOUT_MS }`.
2. **`LEAF` map in `_pending.ts`.** If the leaf has no remaining pending id, **delete the key**. A leftover label with nothing pointing at it is a false pending claim. D1.L2, D2.L1/L2, D3.L1/L2, D4.L1, D5.L1/L2 were removed that way.
3. **`tests/at/expected/req-001.json` both tiers.** Move the id from `red` to `green`. A red that turned green without this edit fails `--expect`. If the honest result is still a named missing capability, keep `red` with `{ "kind": "capability-pending", "capabilities": ["exact name"] }` — names must match the thrown `CapabilityPending` order and spelling, no commas in a name.
4. **New `loop/items/<item>/pending-ledger.txt`.** Never edit an old ledger. One line per **still-pending** id, each leaf named in `loop/decomp/req-001.md`. Landed ids are listed as gone. Count must be 37 with greens.

Then `bun run at:check req-001` and `bun run at:verify req-001 --tier loop --expect` (and integration with the stack) must match.

If the body needs a new SUT member:

1. Add it to `AccountsSut` in `_contract.ts`.
2. Implement it on `const sut: AccountsSut` in `_fixture.ts` (loop: Maps + shipped judgements).
3. Implement it on `const accounts: AccountsSut` in `_live.ts` (HTTP / operator SQL), **or** throw `new CapabilityPending(['sut.accounts.<method>'])` like `_live.ts:820–825`.
4. Types flow from `_fixture.ts` through `suite-adapters.ts`. A method only on the type, or only on one adapter, does not compile. A method only on the fixture object is an excess-property error against `AccountsSut`.

**9. Declaring a real red for a capability this environment does not have**

Two live precedents:

**AT-001.10** (`b-verification-and-sessions.test.ts:198–278`, `_integration.ts:1749–1757`):

- Loop `default`: stand-in `sendDiscoveryMessage` over shipped `discoveryMessageAllowed`. **Green** at loop. Expected json loop green list includes it.
- Integration: `at00110 = refusesWith('sut.accounts.sendDiscoveryMessage')` — `open()` then `throw new CapabilityPending([capability])`. Live adapter’s `sendDiscoveryMessage` also throws the same name (`_live.ts:823`).
- Expected integration: `{ "kind": "capability-pending", "capabilities": ["sut.accounts.sendDiscoveryMessage"] }`.

**AT-001.24** (`d-tenant-isolation.test.ts:395–405`, `_integration.ts:1680–1710`):

- Loop `default`: `throw new CapabilityPending(['ui.authenticated-surface-rendering'])` **without** `open()` (the thrown class wins before the “never opened” check).
- Integration `at00124`: real anon Data-API privilege denials + public project page, **then** the same `CapabilityPending`. Partial live proof, then refuse the UI-render clause.
- Expected **both** tiers: `{ "kind": "capability-pending", "capabilities": ["ui.authenticated-surface-rendering"] }`.

Related: AT-001.05 integration uses `refusesWith('vendors.github-public-statistics')` even though the deployed path would populate `stubGithubStatsFor` — a live green would claim public GitHub stats. AT-001.02/.03/.04 are **single-body** loop procedures; at integration they call `registerWithGithub` / `registerWithProvider`, which the live adapter throws as `sut.accounts.registerWithGithub` / `registerWithProvider`. No per-tier map required.

`captureFailure` (`registry.ts:452`) **must not wrap** `AtPending` / `CapabilityPending` — wrapping turns them into `Error: evidence capture "…" failed — …`, which is undeclarable.

**10. `at:selftest`**

`package.json`: `bunx vitest run --root tests/at --config vitest.config.ts harness/`.

`vitest.config.ts` includes `suites/**/*.test.ts` and `harness/**/*.selftest.ts`. `at:verify` filters to one suite directory, so selftests never join an acceptance run. `at:selftest` filters to `harness/`, so suite tests never join.

What it covers today (each file is `tests/at/harness/*.selftest.ts`):

| File | What it grades |
|---|---|
| `expected.selftest.ts` | Manifest parse refusals; bijection; **shape match vs substring**; red-turned-green; redaction; report arithmetic and file-level failures |
| `runner-expect.selftest.ts` | Assembled runner + `--expect` as a black box under `AT_REPO_ROOT` (loop only) |
| `runner-blackbox.selftest.ts` | Preflight refusals, adapter self-declaration, false greens |
| `runner.selftest.ts` | Child env allowlist (real bun child); non-zero process vs all-green rows; integration refuses redirected data root; lifetime pin before lock; lock release if report cleanup throws |
| `conformance.selftest.ts` | Never-opened body; teardown failure fails the test; sentinel/fault/clock/fixture guards |
| `local-stack.selftest.ts` | Local-stack proofs, container-name identity, branded proof, config drift, **jwt_expiry vs registry**, live-adapter lifetime exactness, child coordinates, redaction, migration-set equality |
| `live-stack.selftest.ts` | Mail link parse, `stackFromEnv`, redactors, HTTP helper shapes |
| `live-refusal.selftest.ts` | Above-loop stand-in refusal through the real path (req-016, no stack) |
| `stack-lock.selftest.ts` | Atomic takeover; live holder never displaced |
| `policy-scan.selftest.ts` | Static tenant catalog overlay over real migrations |
| `shipped-caller.selftest.ts` | `callerFromAuthAnswer` fail-closed on malformed Auth answers |
| `shipped-verification.selftest.ts` | `emailVerifiedFromUser` / `discoveryMessageAllowed` fail-closed |
| `shipped-tenant-reads.selftest.ts` | Dashboard / workspace / public-project cores |
| `vendors.selftest.ts` | Email provider simulator |
| `req016-oracles.selftest.ts` | REQ-016 oracle conformance |

**A new harness helper gets a selftest by dropping `tests/at/harness/<name>.selftest.ts`.** No script or CI change: the glob already includes it. Precedent stated in `shipped-caller.selftest.ts:19–22`. Drive the helper as a pure function or through `createHarness()`; do not register an AT id.

`db:*` scripts (for operators, not the runner): `db:start` = `bunx supabase start --ignore-health-check`; `db:stop`; `db:reset` = `bunx supabase db reset`. The integration runner talks to the pinned CLI at `node_modules/supabase/dist/supabase.js` with `--workdir` and `SUPABASE_PROJECT_ID`.

---

### Files Read

Harness: `tests/at/README.md`, `tests/at/expected/README.md`, `tests/at/expected/req-001.json`, `tests/at/vitest.config.ts`, `package.json` (scripts), `tests/at/harness/{registry,pending,expected,check,index,contracts,suite-adapters,runner,fixtures,atconfig,config,clock,local-stack,live-stack,stack-lock}.ts`, plus selftest headers/describes for `expected`, `runner-expect`, `runner`, `conformance`, `local-stack`, `shipped-caller`.

REQ-001: `_bind.ts`, `_contract.ts`, `_pending.ts`, `_fixture.ts` (header, clock TTL, `AccountsSut` object, operator methods, teardown), `_live.ts` (header, Auth, deployed functions, operator SQL, CapabilityPending stubs), `_live-tenant-reads.ts`, `_integration.ts` (timeout, catalog pin, `at00101`/`at00112`/`at00124`/`refusesWith`/`at00105`/`at00110`), `_policy-scan.ts` (`TENANT_CATALOG`), `e-admin-operations.test.ts`, `f-lifecycle-and-audit.test.ts`, slices of `a-signup-and-signin.test.ts`, `b-verification-and-sessions.test.ts`, `c-membership-and-acknowledgment.test.ts`, `d-tenant-isolation.test.ts`.

Docs: `.taskmaster/docs/acceptance/at-req-001.md` (F/G/H), `loop/decomp/req-001.md` (D6), `loop/items/AI4DEV-62/pending-ledger.txt`, `loop/items/AI4DEV-65/pending-ledger.txt`, `loop/items/AI4DEV-56/brief.md` (context only).

---

### Boundaries

**In**

- Acceptance file P0 set → bijection and `--expect` id set.
- `AT_TIER` env from the runner; no default.
- Loop: in-process Maps + shipped `_shared` modules + `ControlledClock`.
- Integration: runner-validated `AT_SUPABASE_{URL,DB_URL,ANON_KEY,SERVICE_ROLE_KEY,MAIL_URL}`; Auth HTTP; three write functions; operator SQL; Mailpit.
- `supabase/config.toml` `[auth] jwt_expiry` held to `AT_CONFIG.accessTokenLifetimeSeconds`.

**Out**

- Per-id green/red/missing table; `--expect` exit 0 only on exact match.
- Loop green: shipped **decisions** over Maps. Does not prove migrations, RLS, Auth, or edge functions.
- Integration green: deployed path + rebuilt schema + real Auth. Does not imply loop, and vice versa.
- Operator Givens are not product surfaces. `member` role and unseated orgs are unreachable through product paths (single-seat).
- `sendDiscoveryMessage` is a stand-in; no Discovery route exists.
- OAuth consent is not performed at any tier.
- `h.config` cannot read `accessTokenLifetimeSeconds` (`CONFIG_KEYS` only has three req-015 keys).

**Board / leaf bookkeeping (not mechanical)**

- `LEAF` map, `expected/req-001.json`, `loop/items/<item>/pending-ledger.txt`. The prefix matcher does not check the pending tail.

---

### Non-Obvious Things

1. **`sut` in the body is `AccountsSut`, not `h.sut`.** `openWorld` already indexes `h.sut[opts.sut]`. `h.sut.accounts` is not what bodies use.

2. **Types come only from `_fixture.ts`.** `_live.ts` is a runtime load. Both adapters are independently checked against `AccountsSut`. Adding a member without both implementations does not compile.

3. **Pending prefix is free after the em dash.** `notLanded`’s detail is a human/ledger check, not a machine one.

4. **A red that turns green is a `--expect` failure** until the json moves in the same change.

5. **Registration issuance diverges.** Loop mints a session at signup; live with `enable_confirmations = true` does not. Integration bodies follow register → emailed link → sign-in. Loop AT-001.10 deliberately uses the registration session to build completed-but-unverified.

6. **AT-001.02/.03/.04 have no integration body.** The live adapter method throw supplies the `capability-pending` shape. AT-001.05/.10/.24 use explicit `refusesWith` / end-of-body throw so the capability name is the criterion’s missing article, not whichever method was hit first.

7. **`refusesWith` opens a world first**; AT-001.24’s loop body does not. Both are declarable because `CapabilityPending` is thrown before / instead of the never-opened `Error`.

8. **Wrapping a pending error in `Error` makes it undeclarable.** Shared evidence captures must pass `AtPending` / `CapabilityPending` through (`captureFailure`).

9. **Service role is not the operator.** Provisioning an admin uses admin Auth API then **SQL INSERT**. Granting the service role INSERT on `accounts` would bypass `complete_signup`’s `platform_admin` refusal.

10. **`accessTokenLifetimeSeconds` is a harness pin, not an `h.config` key.** Loop clock, integration waits, `lifetimePinProblem`, and the live adapter’s first-token check all read `AT_CONFIG` directly. A stack started before the last config change fails 135s later blaming the product.

11. **Integration reset is `supabase db reset --local` through the pinned CLI**, not `bun run db:reset`. Identity is forced via `SUPABASE_PROJECT_ID`; no other `SUPABASE_*` may leak (`childEnv` allowlist).

12. **Per-tier maps must name every tier or `default`.** A loop-only map makes the id MISSING at integration — undeclarable.

13. **Old pending ledgers are historical.** Each leaf writes a new file. AI4DEV-56 does not yet have one; the current remaining D6 ids are still in `_pending.ts` / expected json as `sut-missing`.

14. **`tenantTableFacts` at loop throws `sut.accounts.tenantReadAsViewer`.** Catalog pinning is an integration-body concern plus the static scan. Truncate/trigger/references are already queried; AT-001.29’s “no leftover privilege” proof can reuse this query rather than invent a second catalog.

15. **Single-body form is typed at loop.** An integration-only procedure that must not call `h.clock.advance` needs the per-tier map so the integration body is typed `TierHarness<'integration'>` (clock control and vendors subtracted).

---

### Open Questions

- Whether AT-001.30’s virtual-key clause should be `capability-pending` on a named capability or a stub is a **founder question** in `loop/items/AI4DEV-56/brief.md` fact 7 / todo 1b. This tree has no virtual-key or gateway surface. Not traced further here.
- Whether local Auth actually honours `sign_in_sign_ups = 30` (AT-001.34) is a measurement the brief assigns to another slice. This harness exploration did not read GoTrue env or run the stack.
- I did not read every line of `_fixture.ts` product operations (`completeSignup`, `sendDiscoveryMessage`) or every integration body after AT-001.17. Operator methods, pending path, expected json, and the two capability-pending precedents were read in full.
- `suite-adapters.ts` does not type-check `_live.ts`. A live method that exists only at runtime would be a `sut-missing` / throw, not a compile error, unless it is on `AccountsSut`. The current file annotates `const accounts: AccountsSut`, which closes that hole **if that annotation stays**.
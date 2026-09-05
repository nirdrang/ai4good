### Components Found

- **`atTest` / `bindSuite`** — `tests/at/harness/registry.ts`. The only place an AT id becomes a Vitest `it()`. `bindSuite({ requirement: 'req-001', sut: 'accounts' })` in `tests/at/suites/req-001/_bind.ts` derives `SutOf` / `WorldOf` from the adapter map and returns a bound `atTest` so suite files write `atTest(id, title, body)`.
- **`SuiteBinding` / `AtTestBodies` / `chooseTierBody`** — `tests/at/harness/registry.ts` (`SuiteBinding` ~111, `AtTestBodies` ~722, `chooseTierBody` ~768). One id, one registration, one Vitest result. A per-tier map must name every tier or supply `default`. Choice is `bodies[tier] ?? bodies.default ?? bodies.loop`.
- **`AdapterModules` / `SutOf` / `WorldOf`** — `tests/at/harness/suite-adapters.ts`. Compile-time list of suites. `'req-001'` is `typeof import('../suites/req-001/_fixture.ts')`. Types are read off the producer, not restated by the suite.
- **`createHarness` / `loadAdapter` / `loadLiveAdapterModule` / `liveAdapterExists`** — `tests/at/harness/index.ts`. Loop loads `_fixture.ts`. Above loop, file presence of `_live.ts` is checked before construction (`aboveLoopStandInRefusal` in `registry.ts` ~773). Integration then loads `_live.ts` and never falls back to the Map adapter.
- **`AccountsSut` / `Session` / `World`** — `tests/at/suites/req-001/_contract.ts`. The accounts surface: product ops, Auth mirrors, operator Givens, operator-style read-backs. `Session` is `{ accountId, email, provider, sessionId }` — no access token.
- **`createFixtureAdapter`** — `tests/at/suites/req-001/_fixture.ts`. Loop storage: `Map`s for auth users, sessions, accounts, orgs, memberships, projects. Product judgements come from shipped modules (`orgAdminActionAllowed`, `callerFromAuthAnswer`, …). Operator grants **predict** the DB trigger/index in TypeScript.
- **`createLiveAdapter`** — `tests/at/suites/req-001/_live.ts`. Integration SUT: Auth HTTP, `functionPost` to deployed functions with the caller JWT, operator SQL over `stack.dbUrl`. Unbacked methods throw `CapabilityPending`.
- **`at00116` / `at00136` / `at00137` / `twoMembershipGiven` / `registerConfirmAndSignIn`** — `tests/at/suites/req-001/_integration.ts`. Integration procedures for the per-org role ids. Wired as the `integration:` key of the per-tier map in `c-membership-and-acknowledgment.test.ts`.
- **`notLanded` / `LEAF` / `AtPending`** — `tests/at/suites/req-001/_pending.ts` and `tests/at/harness/pending.ts`. Unlanded ids throw `AtPending(id, 'sut-missing', …)`. Tenant ids 21/22/23/40/24 use this today.
- **`ExpectedManifest` / `loadTierExpectation` / `expectationDeviations`** — `tests/at/harness/expected.ts`. `--expect` contract. Reds match by rebuilt shape, not substring. A declared red that reports green is a failure.
- **`inspectBijection` / `acceptanceP0Ids` / `registeredIds`** — `tests/at/harness/check.ts`. Static bijection: every `(P0)` in `.taskmaster/docs/acceptance/at-req-001.md` has exactly one `atTest('AT-…'` call site under `*.test.ts`.
- **`prepareLocalStack` / `childCoordinates` / `childEnv`** — `tests/at/harness/local-stack.ts`. Integration: machine lock, identity proof, `supabase db reset --local`, migration-set proof, allowlisted child env with `AT_SUPABASE_*`.
- **`stackFromEnv` / `authPost` / `functionPost` / `sqlClient`** — `tests/at/harness/live-stack.ts`. The live client. There is **no** `restGet`. SQL uses the Postgres connection string (bypasses RLS).
- **`orgAdminActionAllowed`** — `supabase/functions/_shared/memberships.ts` ~97. Two refusal kinds: `not-a-member` vs `not-an-admin`. The oracle for AT-001.16 and AT-001.36.
- **`FixtureWorldStore`** — `tests/at/harness/fixtures.ts`. Generic seed (`ngo-1`, actors, projects). REQ-001 wraps it for email namespacing and **does not use** that seed as product state.

### Flow

1. **Command.** `bun run at:verify req-001 --tier <loop|integration> [--expect]` → `tests/at/harness/runner.ts` `main()` (~288). `--tier` is required. `--wired` exits 3 (no screen driver). `--expect` and `--wired` cannot combine.

2. **Bijection preflight.** `inspectBijection('001')` (`check.ts` ~107) reads P0 ids from `.taskmaster/docs/acceptance/at-req-001.md` and `atTest('AT-…'` sites under `tests/at/suites/req-001/*.test.ts`. Any missing/extra/duplicate → exit 2, no tests.

3. **`--expect` preflight (if set).** `loadTierExpectation('001', tier, expected)` (`expected.ts` ~519) reads `tests/at/expected/req-001.json`. Refuses (exit 2, no tests) if the file is missing, the tier is undeclared, JSON/kind is bad, or declared ids are not in bijection with P0. Then the stack lock is taken.

4. **Tier split before Vitest.**
   - **loop:** no lock, no Docker, no reset.
   - **integration:** refuse if `AT_REPO_ROOT` ≠ checkout; `readLocalConfig` + `lifetimePinProblem`; `acquireStackLock`; `prepareLocalStack` (prove identity, wait ready, re-read config, prove again, `db reset --local`, wait, prove migrations); `childCoordinates` writes `AT_SUPABASE_URL`, `AT_SUPABASE_DB_URL`, `AT_SUPABASE_ANON_KEY`, `AT_SUPABASE_SERVICE_ROLE_KEY`, `AT_SUPABASE_MAIL_URL`.
   - **drill:** infrastructure refusal; no DB.

5. **Vitest spawn.** `suites/req-001/` under `tests/at/vitest.config.ts`, env `AT_TIER` + `AT_REGISTRATION_DIR` + allowlisted stack coords. Child launched with bun `--no-env-file`.

6. **Id registration (load time).** Suite files import `{ atTest }` from `_bind.ts`. `atTest` (`registry.ts` ~861):
   - parses `AT-001.NN`;
   - checks the id’s requirement matches the binding (`req-001`);
   - refuses duplicate ids and holey per-tier maps;
   - `chooseTierBody` picks the body for `AT_TIER`;
   - appends one JSONL registration `{ atId, title, surface }`;
   - registers `it(\`${atId} — ${title}\`)` with `expect.hasAssertions()` and optional `timeoutMs[tier]`.

7. **Per-test handshake.** Body gets `ctx.open(fixture?)`. Default fixture name is `req-001/base` (`registry.ts` ~929). `openWorld`:
   - `AT_TIER` unset → `AtPending` `tier-unset`;
   - above loop and no `_live.ts` → `CapabilityPending(['fixtures.worlds', 'sut.accounts'])`;
   - `createHarness({ requirement: 'req-001', tier })`.

8. **Adapter choice (`index.ts` `createHarness` ~190).**
   - **loop:** `ControlledClock` + email vendor sim + `loadAdapter` → `tests/at/suites/req-001/_fixture.ts` `createFixtureAdapter`. Storage is in-process `Map`s. `h.clock` has `freezeAt` / `advance`.
   - **integration:** `loadLiveAdapterModule` → `_live.ts` `createLiveAdapter({ stack: stackFromEnv() })`. `RealClock` (`now()` only). `vendors` is a refusing proxy.

9. **How `_integration.ts` is wired.** Not auto-selected by filename. The `.test.ts` file registers one `atTest` with a map, e.g. AT-001.16 in `c-membership-and-acknowledgment.test.ts` ~82–167:

```ts
atTest('AT-001.16', '…', { surface: 'backend', timeoutMs: { integration: INTEGRATION_TIMEOUT_MS } }, {
  default: async ({ open }) => { /* loop procedure */ },
  integration: at00116,  // exported from _integration.ts
});
```

`INTEGRATION_TIMEOUT_MS` is 240_000 (`_integration.ts` ~87). Loop keeps Vitest’s 30s. A single-function body (pending stubs, AT-001.20, AT-001.02) runs at **every** tier; at integration it hits whatever `_live.ts` implements or throws.

10. **Body runs, teardown, report.** `runTrackedTest` tears worlds then harnesses; a teardown failure after a green body fails the id. Runner parses Vitest JSON + JSONL registrations. `analyzeReportedTests` requires **exactly one** registration and **exactly one** Vitest result per P0 id, title `AT-001.NN — <title>`.

11. **Verdict.**
    - Without `--expect`: every P0 green and process exit 0 → exit 0; else 1.
    - With `--expect`: `expectationDeviations` (id vs declaration, **including green-that-was-declared-red**) plus `reportAccountingDeviations` (passed = declared green, failed = declared red, no skip/todo, failed files must contain a failed test). Match → exit 0. Any deviation → exit 1.

12. **`at:check`.** `bun run at:check req-001` → `check.ts` only. No harness, no stack. Call-site bijection.

---

#### How an id is registered through `atTest`

Call site in a `*.test.ts` (underscore files are not scanned):

```ts
atTest('AT-001.21', 'one NGO cannot reach…', notLanded(LEAF.D5_L1));
```

or with options and a per-tier map (16/36/37). `parseAtId` (`registry.ts` ~44) enforces `AT-<digits>.<number>`. The runner’s JSONL + Vitest title bijection is the runtime twin of `at:check`’s static scan.

Pending ids: `notLanded` (`_pending.ts` ~82) throws `AtPending(ctx.atId, 'sut-missing', 'REQ-001 D5.L1 (cross-NGO denial…) has not landed')`. That is a **red**, not a skip. `--expect` matches the anchored prefix `AtPending: AT-001.21 PENDING [sut-missing] — `.

---

#### Loop `_fixture.ts` vs integration `_live.ts`

| | Loop | Integration |
|---|---|---|
| Module | `_fixture.ts` `createFixtureAdapter` | `_live.ts` `createLiveAdapter` |
| World | `AccountsFixtureWorld.email()` → `local+wN@example.test` | namespace from name + time + random |
| Auth | in-memory users/sessions; registration **mints** a session (declared divergence) | `POST /auth/v1/signup` (no session); confirm via Mailpit; password grant |
| Product writes | local Maps after shipped validators | `functionPost(stack, '<fn>', body, accessToken)` |
| Operator writes | Map insert / predicted refusals | `sqlClient(stack)` on `dbUrl` (Postgres; **bypasses RLS**) |
| Read-backs (`membership`, `account`, …) | Map get, **no caller** | same SQL operator read, **no caller JWT** |
| Clock | `ControlledClock` | wall `RealClock` |
| Missing methods | all `AccountsSut` members exist | OAuth / Discovery / `publicSignupAccountTypes` throw `CapabilityPending` |

`_live.ts` header (~7–18): loop green = decisions over a Map; integration green = rebuilt DB + deployed functions + real Auth.

---

#### `tests/at/expected/req-001.json` and what a leaf changes when ids go green

Shape (`expected.ts` `ExpectedManifest` ~55):

```json
{ "requirement": "001", "tiers": { "loop": { "green": [...], "red": { "AT-001.21": { "kind": "pending", "phase": "sut-missing" } } }, "integration": { ... } } }
```

Two red kinds only: `pending` + phase, or `capability-pending` + `capabilities[]`. Capability match is the **whole** first line `CapabilityPending: CAPABILITY PENDING — a, b`. Pending match is the **prefix** `AtPending: <id> PENDING [<phase>] — `.

**Today for tenant ids (both tiers):** `AT-001.21`, `.22`, `.23`, `.40`, `.24` are in `red` as `{ "kind": "pending", "phase": "sut-missing" }` (`req-001.json` loop ~30–35, integration ~73–78).

**AT-001.16, .36, .37** are in `green` at **both** tiers (loop ~19–21, integration ~58–60).

When a leaf lands ids, in the **same change**:

1. Replace `notLanded(...)` with real bodies (and an `integration:` procedure if the live procedure differs).
2. Move each id from `tiers.<tier>.red` to `tiers.<tier>.green`. A red that reports green **fails** `--expect` until the file is updated (`expected.ts` ~327–332; README “A red that turns green is a FAILURE”).
3. Keep bijection: every P0 still appears exactly once per tier.
4. If the live adapter lacks a method, either back it or declare `capability-pending` with the exact `sut.accounts.<method>` name `_live.ts` throws (pattern: AT-001.02/03/04/05/10 at integration).
5. Drop the leaf key from `_pending.ts` `LEAF` if nothing still points at it (comment at `_pending.ts` ~45–60).

Loop green and integration green are **different claims**. An id can be loop-green and integration-red; that is declared, not a defect (`expected/README.md` ~154–161).

---

#### AT-001.16, .36, .37 at both tiers

**Shared Given (both procedures).** One NGO account, three orgs:

- **A** — product `completeSignup` seats the caller as `admin`.
- **B** — `createOrganizationAsOperator` (org, no membership) then `grantMembershipAsOperator(..., 'member')`. No product path writes `'member'` (single-seat).
- **C** (16 only) — operator org, left unseated.

Loop builds this after `registerWithEmailPassword` (session at register). Integration uses `registerConfirmAndSignIn` (`_integration.ts` ~140): register (empty `sessionId`), Mailpit link, sign-in, then act.

**AT-001.16 — membership/role per NGO; acting in one grants nothing in another.**

Loop (`c-membership-and-acknowledgment.test.ts` ~86–165): Map memberships; `sut.updateOrganization` → `_fixture.ts` ~1055: `resolveCaller` (shipped `callerFromAuthAnswer`) → Map membership in **target** org → shipped `orgAdminActionAllowed` → mutate org name on allow. Asserts: admin in A, member in B, null in C; rename A succeeds; B → `kind: 'not-an-admin'`; C → `kind: 'not-a-member'`; membership count still 2.

Integration (`at00116`, `_integration.ts` ~717–768): same assertions. `updateOrganization` → `_live.ts` ~453 `functionPost(..., 'update-organization', { organizationId, name }, accessToken)`. Deployed function (`supabase/functions/update-organization/index.ts`): `resolveCaller` with **anon** key against Auth; membership **PostgREST with service_role JWT** (`roleIn` ~60–81); `orgAdminActionAllowed`; `callDatabaseFunction(..., 'update_organization', …)` as service_role. Read-backs (`membership`, `organization`, `organizationsNamed`) are **operator SQL**, not the caller JWT.

What the green claims (`_contract.ts` ~565–580 and `at00116` comment ~710–715): **operation-surface** isolation on this rename. Not read isolation over drafts/ledgers/files. “This tree has no read surface to leak through: RLS on, zero policies, `org_memberships` reaches no Data API **client** role.” Service_role **does** have `GRANT SELECT` on `org_memberships` (migration `20260811125000_…sql` ~202).

**AT-001.36 — admin in A and member in B succeeds only where admin.**

Same Given minus C. Discriminator is the **`member` row** asserted before the action. Success in A; B refusal `kind === 'not-an-admin'` and **not** `not-a-member`. Loop: Map + shipped decision. Integration: same deployed `update-organization` path.

**AT-001.37 — volunteer cannot hold a per-NGO role on every path.**

Four arms + NGO control (`_integration.ts` ~839–917; loop twin ~240–328):

| Arm | Loop | Integration DB reach |
|---|---|---|
| 1 `createOrganization` as volunteer | Map + shipped `ngoOnlyActionAllowed` | Deployed `create-organization` with **user JWT** (`functionPost`) |
| 2 volunteer `completeSignup` with org name | Map + shipped `validateCompleteSignup` | Deployed `complete-signup` with **user JWT** |
| 3 `grantMembershipAsOperator` admin and member | TypeScript **prediction** of BEFORE trigger (`_fixture.ts` ~1111: if `accountType !== 'ngo'` → `not-an-ngo-account`) | **Direct SQL INSERT** via `sqlClient` / `dbUrl` — no edge, no TS. Trigger `org_memberships_grantee_must_be_ngo`. Classified by sentence + SQLSTATE `42501` (`_live.ts` ~505–533) |
| Control: grant NGO as `member` | Map insert | Same SQL INSERT, must succeed |
| 4 `repointMembershipAsOperator` NGO seat → volunteer | Map prediction of trigger UPDATE half | **SQL UPDATE** of `org_memberships.account_id`; trigger UPDATE half; index never sees it (row count unchanged) |

Read-back after refusals: `membershipsOf` empty for the volunteer. Loop cannot prove the SQL trigger; integration arm 3/4 is the “no TypeScript on the path” clause.

---

#### How a new test can read the database as a signed-in user (integration)

There is **no** harness helper that runs PostgREST as the session. `Session` has no token. `_live.ts` keeps `{ accessToken, refreshToken }` in a private `Map` (`LiveSession` ~106–109); only SUT methods call `tokensOf`.

Practical options, in order of what already exists:

1. **PostgREST with the user JWT (the path that actually exercises RLS).** Precedent: AT-001.17 arm 2 (`_integration.ts` ~979–994) already `fetch`es `${AT_SUPABASE_URL}/rest/v1/org_memberships` with the **anon** key. For a signed-in user:
   - Re-issue a password grant: `authPost(stackFromEnv(), '/auth/v1/token?grant_type=password', { email, password })` (`live-stack.ts` ~82).
   - `fetch(\`${api}/rest/v1/<table>?select=…\`, { headers: { apikey: anonKey, Authorization: \`Bearer ${access_token}\` } })`.
   - Child already has `AT_SUPABASE_URL` / `AT_SUPABASE_ANON_KEY` (`local-stack.ts` `childCoordinates` ~998).
   - Do **not** use `sqlClient` / `dbUrl` for the assertion — that connection is the operator and bypasses RLS. Current 16/36/37 read-backs are this operator path and cannot prove tenant isolation.

2. **New `AccountsSut` method** that uses `tokensOf` internally and calls PostgREST (or a new edge function) as that session. Cleaner for loop/integration to share a body; loop would still be a Map filter, not RLS.

3. **Edge function via `functionPost` with the caller JWT.** This is how 16/36 work. `update-organization` then reads membership with **service_role**, which is not an RLS-as-user proof. A tenant-isolation edge function must not use service_role for the data read if the criterion is “direct API/ID probing” as that user.

4. **Anon/unauthenticated PostgREST** — AT-001.17 arm 2: privilege denial (`401` + `permission denied`) because `org_memberships` is not granted to anon/authenticated. After D5 adds policies, tables that should be readable need **grants** as well (`20260808120000_…sql` ~326–338: without a grant, RLS never runs).

Logged-out visitor (AT-001.24): public HTTP / future `--wired` UI. `--wired` currently exits 3 (`runner.ts` ~300–306). Loop cannot prove redirects.

---

#### What loop can and cannot prove about RLS (`_fixture.ts` is a Map)

**Can prove (and 16/36/37 do):** shipped TypeScript decisions (`orgAdminActionAllowed` kinds; volunteer completion/org-create refusals); adapter bookkeeping (two membership rows, rename applied or not); a **prediction** of trigger/index behaviour in `grantMembershipAsOperator` / `repointMembershipAsOperator`.

**Cannot prove:** Postgres RLS policies; `GRANT`/`REVOKE`; PostgREST privilege vs policy; service_role vs `authenticated` vs anon; SECURITY DEFINER vs invoker; “no existence oracle” on REST (empty list vs 404 vs distinct error); UI/id-probing; FORCE RLS vs service_role bypass. Operator read-backs in the fixture have **no caller**, so they cannot deny a cross-org read. A loop body that “filters by org” would grade the adapter, not the database. `_fixture.ts` header ~34–36 states this: storage is a Map; RLS is not reachable.

Generic `FixtureWorldStore` seed (`fixtures.ts` `createFixtureSeed`) is unused by REQ-001 product state; isolation is empty Maps plus `w.email()` namespacing.

---

#### Commands and what `--expect` checks

From `package.json` ~14–19:

| Script | What it runs |
|---|---|
| `bun run at:verify` | `bun tests/at/harness/runner.ts` |
| `bun run at:check` | `bun tests/at/harness/check.ts` (bijection only) |
| `bun run db:start` | `bunx supabase start --ignore-health-check` (operator; integration does not start the stack, it resets it) |
| `bun run db:stop` / `db:reset` | stop / reset; integration reset is `supabase db reset --local` inside `prepareLocalStack` |

`--expect` (`runner.ts` ~334–341, ~500–519; `expected.ts`):

- **Before tests:** declaration file exists, tier declared, well-formed, ids ↔ P0 bijection.
- **After tests, per id:** declared green must be green; declared red must be red **with the rebuilt shape**; missing/extra ids fail; redacted detail is undeclarable.
- **Report arithmetic:** `numPassedTests === green.length`, `numFailedTests === redCount`, total = sum, pending/todo = 0, `success === (redCount === 0)`.
- **Files:** a failed file with zero failed tests (import/hook) fails; a non-empty file-level `message` fails.
- **Process:** launch error always fails; if no reds declared, non-zero Vitest exit fails.
- A red that turned green is a **deviation**. Update `req-001.json` in the same change.

Without `--expect`, any red fails the run. REQ-001 cannot gate on honest reds unless `--expect` is used.

Tenant ids today: both tiers declare 21/22/23/40/24 red `sut-missing`. `bun run at:verify req-001 --tier loop --expect` and `--tier integration --expect` pass **while those ids stay pending**. Landing D5 without moving them to `green` makes `--expect` fail.

### Files Read

- `tests/at/README.md`
- `tests/at/expected/README.md`, `tests/at/expected/req-001.json`
- `tests/at/harness/registry.ts`, `contracts.ts`, `runner.ts`, `expected.ts`, `pending.ts`, `check.ts`, `index.ts`, `suite-adapters.ts`, `fixtures.ts`, `live-stack.ts`, `local-stack.ts` (through `evidenceLine`), `clock.ts`, `vitest.config.ts`
- `tests/at/suites/req-001/_bind.ts`, `_contract.ts`, `_fixture.ts`, `_live.ts`, `_integration.ts`, `_pending.ts`, `_source-scan.ts` (header)
- `tests/at/suites/req-001/c-membership-and-acknowledgment.test.ts`, `d-tenant-isolation.test.ts`, `a-signup-and-signin.test.ts` (header + AT-001.01/02 wiring), `f-lifecycle-and-audit.test.ts` (header)
- `package.json` (scripts)
- `.taskmaster/docs/acceptance/at-req-001.md` (section E)
- `loop/decomp/req-001.md` (D5)
- `supabase/functions/update-organization/index.ts`
- `supabase/functions/_shared/memberships.ts`
- `supabase/migrations/20260808120000_accounts_org_membership_and_acknowledgments.sql` (RLS + grants)
- `supabase/migrations/20260811125000_org_membership_ngo_only_and_organization_rename.sql` (trigger + service_role select)

### Boundaries

- **In:** `AT_TIER`, optional `--expect`, suite dir `tests/at/suites/req-001/`, acceptance file P0 list, `tests/at/expected/req-001.json`, for integration the one stack from `supabase/config.toml`.
- **Out:** per-id green/red/missing table; `--expect` EXPECTED vs DEVIATION; evidence line (project, reset, migrations).
- **Product:** loop → shipped TS modules + Maps. Integration product writes → Kong `/functions/v1/*` with user JWT. Integration operator → Postgres `dbUrl`. Integration Auth → `/auth/v1/*`. Mail → Mailpit.
- **Not this harness:** UI driver (`--wired` refused); PostgREST-as-user helper; RLS policy set (D5); front-end route guards for AT-001.24.

### Non-Obvious Things

- **One registration, two procedures.** `_integration.ts` is not a second suite. The `.test.ts` `atTest` map selects the body. `at:check` still sees one call site.
- **Default fixture name `req-001/base` is unused as a world catalog.** REQ-001 worlds are empty Maps + unique emails. The generic seed in `fixtures.ts` is not REQ-001’s Given.
- **Loop registration still mints a session; live signup does not.** Integration bodies must follow register → verify link → sign-in. Using the registration handle calls `tokensOf` and throws (`_live.ts` ~112–120).
- **16/36 integration is not an RLS test.** Caller JWT authenticates the edge function; membership is read with **service_role** PostgREST; write is SECURITY DEFINER. Operator SQL read-backs also bypass RLS.
- **37’s load-bearing arms are operator SQL**, classified by **message text first**, SQLSTATE as agreement (`errno` not `code` — `_live.ts` `databaseRefusal` ~184). A new tenant test that treats `code === '42501'` will mis-classify.
- **`grantMembershipAsOperator` at loop is a prediction**, not the trigger. Integration is what grades the prediction (`_fixture.ts` ~1092–1100).
- **RLS is on with (almost) no policies** since the first accounts migration. `authenticated` has `SELECT, INSERT` on `public.accounts` only, so a client insert fails **by policy**. Orgs/memberships/acknowledgments/projects have no client grant, so client REST fails at **privilege** (AT-001.17 measured 401 + `permission denied`). D5 policies without grants will never run.
- **Service_role SELECT on `org_memberships` is the one extra grant** from the roles leaf, for `update-organization`, not for tenant reads.
- **Pending stubs are real reds.** `notLanded` opens nothing until `ctx.atId` is read; `executeRegisteredBody` still requires `open()` or `capture()` — wait: `notLanded` does **not** call `open()`. `testUseProblem` (`registry.ts` ~525–527) fails if `opens === 0 && captures === 0`. So how do pending tests pass that check?

Let me re-read notLanded and executeRegisteredBody...

```ts
export function notLanded(leaf: LeafLabel): (ctx: AtContext) => Promise<void> {
  return async (ctx: AtContext): Promise<void> => {
    throw new AtPending(ctx.atId, 'sut-missing', `REQ-001 ${leaf} has not landed`);
  };
}
```

And executeRegisteredBody:
```
await body(ctx);
const problem = testUseProblem(usage.opens, usage.captures);
if (problem) throw new Error(`${atId} INVALID — ${problem}`);
```

If body throws AtPending, executeRegisteredBody never reaches testUseProblem - the throw propagates. runTrackedTest catches body error, tears down, rethrows body error. So pending tests never need open(). Good.

Capability-pending integration bodies (`refusesWith` in _integration.ts ~1247) DO call `await ctx.open()` then throw CapabilityPending - because they need a real handshake so the red isn't "never opened".

- **AT-001.20 is one body at both tiers** (content of a shipped constant). Opening a world is only to satisfy the handshake.
- **`--expect` residual:** a hook throw in a file that also has a declared red is invisible (`expected.ts` ~371–376).
- **Title grammar:** Vitest title must be `AT-001.NN — ` (em dash). `assertionId` regex `^(AT-[\d.]+[a-z]?)\s+—`.
- **D5 ids live in `d-tenant-isolation.test.ts` as five `notLanded` single bodies**, so they run at both tiers and stay `sut-missing` at both. No `integration:` map yet.

### Open Questions

- Whether `service_role` bypasses RLS on this stack (typical unless `FORCE ROW LEVEL SECURITY`). If D5 tests use service_role PostgREST or `dbUrl` SQL, they will not see policies. I did not re-measure `FORCE RLS` on these tables.
- Whether D5 should add SUT read methods or keep raw `fetch` in integration bodies like AT-001.17. No existing `AccountsSut` member reads as the caller; all read-backs are operator-scoped.
- How AT-001.24 (and the UI half of AT-001.21) will be proved: `--wired` has no driver; there is no browser in this harness. A source-scan arm (AT-001.17 / `_source-scan.ts`) is the only in-tree UI-adjacent pattern.
- I did not run `at:verify` in this exploration; green/red status is from the committed `req-001.json` and the bodies, not a fresh run.
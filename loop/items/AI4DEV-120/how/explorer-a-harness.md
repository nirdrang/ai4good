## Components Found

| Name | Path | What it does |
|---|---|---|
| `atTest` / `bindSuite` | `tests/at/harness/registry.ts` | The only registration API. `bindSuite({ requirement, sut })` returns a bound `atTest` whose types come from the fixture adapter, not from suite-written shapes. |
| `AdapterModules` / `SuiteId` | `tests/at/harness/suite-adapters.ts` | Compile-time list of suites. A new suite is one map line plus `export const requirement = 'req-0NN' as const` in `_fixture.ts`. |
| `createHarness` / `liveAdapterExists` | `tests/at/harness/index.ts` | Loop loads `suites/<req>/_fixture.ts`. Integration loads `suites/<req>/_live.ts` by file presence. No live file → every `open()` throws `CapabilityPending(['fixtures.worlds', 'sut.<key>'])`. |
| `AtPending` / `CapabilityPending` | `tests/at/harness/pending.ts` | The only two red shapes `--expect` can declare. Message text is rebuilt and matched exactly. |
| `inspectBijection` / `acceptanceP0Ids` / `registeredIds` | `tests/at/harness/check.ts` | `at:check`: P0 ids from `at-req-0NN.md` vs `atTest('AT-…'` call sites in `*.test.ts` only. |
| `loadTierExpectation` / `expectationDeviations` / `reportAccountingDeviations` | `tests/at/harness/expected.ts` | `--expect`: bijection of declared ids to P0s, exact red shape, test arithmetic, file-level failures. |
| `main` (runner) | `tests/at/harness/runner.ts` | `bun run at:verify`. Preflight bijection, optional declaration, loop vs integration stack, per-id report. |
| `prepareLocalStack` / `childEnv` / `evidenceLine` | `tests/at/harness/local-stack.ts` | Integration: lock, identity, `db reset`, migration proof, allowlisted child env. |
| `Stack` / `authPost` / `functionPost` / `functionPostRaw` / `verifyLinksFor` / `followLink` / `sqlClient` / `mailIdentification` | `tests/at/harness/live-stack.ts` | Shared HTTP/SQL/mail client for live adapters and `verify-ai4good`. JSON POSTs only. No multipart or Storage helper. |
| `AT_CONFIG` / `CONFIG_KEYS` / `createConfigRegistry` | `tests/at/harness/atconfig.ts`, `config.ts` | Pinned numbers. Suites read dotted keys. Discovery grants are on the map. File-size caps exist in `AT_CONFIG` but are **not** in `CONFIG_KEYS`. |
| `OrganizationsSut` / `World` / `WriteRefusal` | `tests/at/suites/req-002/_contract.ts` | REQ-002 seam: type aliases only. Four member kinds: provisioning, product routes, operator Givens, pure policy. |
| `createFixtureAdapter` | `tests/at/suites/req-002/_fixture.ts` | Loop: in-memory Maps, judgements from shipped modules, wraps REQ-001’s fixture for signup. |
| `createLiveAdapter` | `tests/at/suites/req-002/_live.ts` | Integration: Auth + edge functions + operator SQL. Reimplements NGO/volunteer/admin provision; does not wrap REQ-001 live. |
| `awaiting` / `AWAITED` | `tests/at/suites/req-002/_pending.ts` | Honest red: throws `CapabilityPending` with named surfaces. No `open()` needed. |
| `_source-scan.ts` + four arm files | `tests/at/suites/req-002/_source-*.ts` | Static oracles over product text. Throw if the instrument cannot read. Empty problem list is the assertion. |
| Oracle selftests | `tests/at/harness/req002-*-oracles.selftest.ts` | Prove the instrument can fail on injected text, and that the real tree is clean. |
| `WRITE_ROUTES` | `supabase/functions/_shared/write-routes.ts` | Mandatory write-route inventory. Unregistered DB-reaching routes fail REQ-001’s scan. |
| `TENANT_CATALOG` | `tests/at/suites/req-001/_policy-scan.ts` | Every `public` table must be declared. AT-001.21 loop body asserts `tenantCatalogProblems() === []`. |
| `LIFECYCLE_STATES` | `tests/at/harness/fixtures.ts` | H2 seed data (`draft`, `discovery_in_progress`, …). Not the product lifecycle engine. |

## Flow

### 1. Suite authoring (compile time)

1. Add `'req-003': typeof import('../suites/req-003/_fixture.ts')` to `AdapterModules` in `suite-adapters.ts` (lines 108–112).
2. `_fixture.ts` exports `requirement = 'req-003' as const` and `createFixtureAdapter`.
3. `_bind.ts` calls `bindSuite({ requirement: 'req-003', sut: '<key>' })`. The sut key must exist on the fixture’s `sut` map (`SutKeyOf<'req-003'>`).
4. `_live.ts` (required for any id that `open()`s at integration) exports the same `requirement` literal and `createLiveAdapter({ stack })`.
5. Per-id files `*.test.ts` call `atTest('AT-003.NN', title, body)` or the four-argument form with options / a per-tier map.

`bindSuite` (`registry.ts` 1005–1036) merges the binding into every `atTest` so bodies never name shapes.

### 2. `atTest` registration (load time)

`atTest` (`registry.ts` 861–969):

1. Parses `AT-<requirement>.<number>` (`AT_ID` at line 34). Last dot-segment is the test number.
2. `requirementMismatch` (802–817): id’s `003` must match binding `req-003`.
3. Duplicate id throws at the call site.
4. A per-tier map must cover `loop|integration|drill` or supply `default` (`tierBodyProblem`, 740–757). A hole reports **MISSING**, which no declaration can describe.
5. Registers with vitest as `` `${atId} — ${title}` ``. `expect.hasAssertions()` is set.
6. Optional `surface: 'ui'` is only for a later `--wired` re-run. `--wired` today exits **3** (`runner.ts` 300–306).
7. Optional `timeoutMs: { integration: N }` only. Loop stays at vitest’s 30s.

The body must `open()` or `capture()`, unless it throws first (`testUseProblem`, 525–527). `awaiting()` throws `CapabilityPending` before that check, so red ids need no world.

### 3. `open()` handshake (per test)

`openWorld` (`registry.ts` 654–691):

1. `AT_TIER` unset → `AtPending(..., 'tier-unset', ...)`.
2. Harness module missing → `AtPending(..., 'harness-missing', ...)`.
3. `aboveLoopStandInRefusal` (773–776): integration and no `_live.ts` → `CapabilityPending(['fixtures.worlds', 'sut.<key>'])` **before** construction.
4. `createHarness({ requirement: 'req-003', tier, configOverrides })`.
5. `h.sut[sutKey]` absent → `AtPending(..., 'sut-missing', ...)`.
6. `h.fixtures.world(fixture)` then track teardowns (worlds first, then harnesses). A teardown that rejects after a green body fails the id (`runTrackedTest`, 605–637).

**Loop `createHarness`** (`index.ts` 227–231): `ControlledClock`, email vendor sim, `loadAdapter` → `_fixture.ts`. `loadAdapter` (58–104) re-checks `module.requirement === requirement`.

**Integration `createHarness`** (`index.ts` 234–249): `RealClock` (only `now()`), vendors refused, `createLiveAdapter({ stack: stackFromEnv() })`. Clock control methods are **absent from the type** for integration bodies (`TierHarness`, `contracts.ts` 220–227). A single-body form is typed at loop, so clock commands compile but do nothing useful against GoTrue.

### 4. `at:check` bijection

`check.ts` 48–83, 107–122, CLI 124–172:

1. `acceptanceP0Ids`: regex `AT-<req>.(\d+[a-z]?)\*?\*?\s*\(P0\)` over `.taskmaster/docs/acceptance/at-req-003.md`. Retired lines 06/08/13/15 have no `(P0)` and are excluded. Expected set is the thirteen P0s: 01, 02, 03, 04, 17, 05, 07, 09, 10, 11, 12, 14, 16.
2. `registeredIds`: only files ending `.test.ts` in the suite dir. Regex `atTest\(\s*['"`](AT-[\d.]+[a-z]?)['"`]`. `_bind.ts`, `_pending.ts`, `_source-*.ts` are invisible.
3. Missing / extra / duplicate → exit 1. Unreadable requirement → exit 2.

`at:verify` runs the same preflight and **runs no tests** if it fails (exit 2, `runner.ts` 315–322).

### 5. `--expect`

`runner.ts` 328–342, 493–519; `expected.ts` 45–58, 243–268, 286–296, 378–451:

1. File `tests/at/expected/req-003.json` with `"requirement": "003"` (not `req-003`).
2. Both `loop` and `integration` keys. Unknown tier key refused. Missing tier for the run → exit 2, no tests.
3. Declared ids must be in exact bijection with P0s. An id in both green and red is refused.
4. A red is an object, never a string:
   - `{ "kind": "capability-pending", "capabilities": ["ui.discovery-surface"] }` matches the **whole** first line `CapabilityPending: CAPABILITY PENDING — ui.discovery-surface` (em dash U+2014, names joined with `, ` in listed order).
   - `{ "kind": "pending", "phase": "sut-missing" }` matches the **prefix** `AtPending: AT-003.NN PENDING [sut-missing] — `.
5. A red that turns green is a failure. A green that turns red is a failure. A red whose detail is an `Error: …` is undeclarable.
6. Accounting: failed tests = declared reds, passed = greens, total = sum, no skip/todo. A failed file with zero failed tests (import/hook) is a deviation.
7. Author the declaration **before** the first run (`expected/README.md` 37–45).

REQ-002 pattern for “full proof waits elsewhere”:

```json
"AT-002.05": { "kind": "capability-pending", "capabilities": ["ui.discovery-surface"] }
```

only on **integration**. Loop stays green (`req-002.json` 41 vs 26–35). AT-002.12/19/20/23/10/26/31 are red on **both** tiers via `awaiting(AWAITED.…)` in the test file (`c-vetting-action.test.ts` 299, `e-gates.test.ts` 56–58, `f-public-claims.test.ts` 17, `b-allowance.test.ts` 457, 624–626).

REQ-001 still uses `AtPending` / `sut-missing` for one leaf (`req-001/_pending.ts` 56–59). REQ-002’s later style is `CapabilityPending` + named surfaces. Follow REQ-002.

### 6. Loop vs integration adapters (REQ-002, the template)

**Loop `_fixture.ts`**

- Wraps `createAccountsFixtureAdapter` (REQ-001). World `email(local)` → `local+w<serial>@example.test`.
- `provisionNgo`: register → optional verify link → `completeSignup` NGO + signer copy. Seats the admin.
- `provisionVolunteer`: verify + GitHub identity + volunteer completion.
- `provisionPlatformAdmin`: inner factory.
- `setMembershipRoleAsOperator`: the unique seat; a “member” is the same row with role `member` (AT-002.02 comment, `a-org-profile.test.ts` 176–180).
- Product writes go through `writePipeline` + shipped `decide*` modules over Maps (vetting, allowance).
- `readAllowance` / `debitAllowance`: `utcDayOf(clock.now())`, `dailyGrantFor`, high-water grant. Unverified pin 10, vetted 30 from `AT_CONFIG` via `h.config.get('req-002.discovery.daily_credits.*')` **or** `createConfigRegistry()` in the body (`b-allowance.test.ts` 168–170, 415–427).
- `fundingAllowed: notLanded(...)` throws a plain `Error` — **undeclarable**. Idle members must not be called; use `awaiting()` instead.
- Clock can be commanded. Autosave for REQ-003 is a write-then-read contract, so the clock is not required.

**Integration `_live.ts`**

- `mailIdentification` first. `sqlClient(stack)` for operator SQL. Tokens held in a `Map` keyed by `sessionId`.
- `provisionNgo` (`_live.ts` 216–250): Auth signup → Mailpit confirm link → password grant → `complete-signup` edge function. If `emailVerified: false`, operator SQL clears `auth.users.email_confirmed_at` **after** completion so the session still exists (AT-002.22).
- `provisionVolunteer`: confirm + insert `auth.identities` GitHub row + complete as volunteer.
- `provisionPlatformAdmin`: Auth admin API + insert `public.accounts` `platform_admin`.
- `readAllowance` / `debitAllowance` (`592–601`): `POST functions/v1/discovery-allowance` with `{ organizationId, action: 'read'|'debit', credits? }`. Parses through shipped `allowanceOf`.
- `setMembershipRoleAsOperator`: `UPDATE org_memberships SET role`.
- `createProjectAsOperator`: `INSERT INTO public.projects (org_id, name)` — auth-run table; comment on the table says product project creation is **not** landed there (`20260811130000_…sql` 65–66).
- JWT lifetime is 120s (`atconfig.ts` 189–196). Default test timeout 30s is enough unless a body waits on real time.

REQ-003 should compose the same way REQ-002 composes REQ-001: inner adapter for provision / allowance / membership; new SUT key for intake. Do not add intake members onto `OrganizationsSut`.

### 7. Static `_source-*.ts` arm + selftest

Pattern (`_source-scan.ts` 1–21, `_source-pins.ts` 63–78, `req002-oracles.selftest.ts` 29–43):

1. Helper module, underscore name, **not** `*.test.ts`.
2. Pure `scanX(input): string[]` over injected text.
3. `xProblems(): string[]` reads the real tree (`productFiles` under `supabase/functions`, `supabase/migrations`, `src`).
4. **Throws** if it cannot see what it claims to have read (empty tree, missing function). Empty list ≠ broken instrument.
5. AT body: `expect(xProblems(), '…').toEqual([])` then `open()` for the behavioral half (AT-002.16, `d-evidence-rule.test.ts` 161–164; AT-002.04/05 pin arms).
6. Harness selftest: real tree is clean **and** injected disagreement is non-empty (`req002-pins-oracles.selftest.ts` 37–80). AT-002.05’s comment (`b-allowance.test.ts` 434–436) says the instrument’s ability to fail is proved in the selftest, not in the AT body.

`h.static` is a refusing proxy (`index.ts` 197, 214) named `H3 static provider scan`. Suites do **not** use it. They write `_source-*.ts`.

### 8. CI (`.github/workflows/ci.yml`)

On code territory (`src/`, `supabase/`, `tests/`, `.github/`, root build files):

1. `bun run typecheck` — app + `tests/at` + verify-drive (`typecheck.ts`).
2. `bun run at:selftest` — `harness/**/*.selftest.ts` only (`vitest.config.ts` 16; `at:verify` filters to `suites/req-N/`).
3. `at:check` every `tests/at/suites/req-*/`. Empty glob is a failure.
4. `at:verify $req --tier loop --expect` every `tests/at/expected/req-*.json`. A suite directory without a manifest is a failure (lines 198–207).

**CI never runs the integration tier.** Local `bun run at:verify req-003 --tier integration --expect` is the integration gate. `live-refusal.selftest.ts` (lines 4–8) states that explicitly.

Also: ownership guard (Lovable `src/` vs Claude `supabase|tests|loop|.claude|.github`), PR id guard (only the branch’s item).

### 9. `verify-ai4good`

`.claude/skills/verify-ai4good/SKILL.md`: drives the **real** stack on the 44321 block (Auth, edge functions, Postgres, Mailpit). It is **not** `at:verify`. Helpers: `tests/at/harness/live-stack.ts`. Shipped drive: `scripts/drive-ngo-signup.ts` (and `drive-vetting.ts`). Feature map (`features/README.md`) covers signup and org routes only — no intake. Doctor: auth health, Mailpit identity, edge-runtime mount of **this** checkout. Evidence under `loop/verify-evidence/` or the item folder. Never paste `db:start` keys.

The skill text still names three write functions; the tree now also has profile, vetting, allowance. Treat the skill as the drive protocol, not the function inventory.

## Files Read

- `loop/items/AI4DEV-120/brief.md`
- `loop/decomp/req-003.md` (head)
- `.taskmaster/docs/acceptance/at-req-003.md`
- `tests/at/README.md`, `tests/at/tsconfig.json`, `tests/at/vitest.config.ts`, `tests/at/typecheck.ts`
- `tests/at/expected/{README.md,req-001.json,req-002.json,req-016.json}`
- `tests/at/suites/req-002/` — `_bind.ts`, `_contract.ts`, `_fixture.ts`, `_live.ts`, `_pending.ts`, `_source-scan.ts`, `_source-pins.ts`, `_source-absences.ts`, `_source-documents.ts`, `_source-vetting.ts`, `a-org-profile.test.ts` through `f-public-claims.test.ts`
- `tests/at/suites/req-001/` — `_bind.ts`, `_pending.ts`, `_live.ts` (head), `_fixture.ts` (world), `_policy-scan.ts` (catalog), `_write-route-scan.ts`, `d-tenant-isolation.test.ts` (AT-001.21)
- `tests/at/suites/req-016/_bind.ts`
- `tests/at/harness/` — `registry.ts`, `suite-adapters.ts`, `index.ts`, `check.ts`, `expected.ts`, `pending.ts`, `contracts.ts`, `config.ts`, `atconfig.ts`, `runner.ts`, `live-stack.ts`, `local-stack.ts` (head + `prepareLocalStack`), `fixtures.ts` (head), `expected.selftest.ts` (head), `runner-expect.selftest.ts` (head), `live-refusal.selftest.ts` (head), `write-route-scan.selftest.ts` (head), `req002-oracles.selftest.ts`, `req002-pins-oracles.selftest.ts` (head), `conformance.selftest.ts` (head), `shipped-lifecycle.selftest.ts` (head)
- `supabase/functions/_shared/write-routes.ts` (inventory)
- `supabase/functions/project-workspace/index.ts`
- `supabase/migrations/20260811130000_single_seat_org_and_single_developer_projects.sql` (projects table)
- `.github/workflows/ci.yml`
- `.claude/skills/verify-ai4good/{SKILL.md,features/README.md}`
- `src/routes/index.tsx` (placeholder UI)
- `package.json` scripts

## Boundaries

**Inputs to a new REQ-003 suite**

- P0 set from `at-req-003.md` (13 ids). Retired 06/08/13/15 must have **no** `atTest` call site.
- Harness: `bindSuite`, `atTest`, `CapabilityPending`, `createConfigRegistry` / `h.config.get` for Discovery pins only.
- Inner SUT from REQ-002: `provisionNgo` / `provisionVolunteer` / `setMembershipRoleAsOperator` / `readAllowance` (and debit only if a body spends credits). Do not rebuild the ledger.
- Shipped write pipeline + inventory if new write routes land.
- `live-stack.ts` for Auth, edge JSON POST, SQL, mail.
- Static oracles over `supabase/functions`, `supabase/migrations`, `src`.

**Outputs**

- `tests/at/suites/req-003/**` and `tests/at/expected/req-003.json`.
- One line in `suite-adapters.ts`.
- If source arms exist: `tests/at/harness/req003-*-oracles.selftest.ts` so `at:selftest` grades the instrument.
- Product tables must be added to `TENANT_CATALOG` or AT-001.21 goes red at loop (CI).
- New edge write routes must register in `WRITE_ROUTES`, have `[functions.<name>] verify_jwt = true`, and not bypass `writeRoute`. Stand-ins must appear in **REQ-001’s** `_fixture.ts` text (`_write-route-scan.ts` 254–266).
- CI will pick the suite up from directory + manifest globs.

**Not this harness**

- Screen driver (`--wired` exit 3). `src/routes/index.tsx` is a placeholder heading.
- REQ-032 format/size/metadata listing (caps sit in `AT_CONFIG` but are not `CONFIG_KEYS`).
- REQ-004 cause-taxonomy producer and Tier-2 classification event (stub or declare red).
- REQ-005.5 transition engine (`draft → discovery_in_progress`).
- H3 sentinels, faults, new vendor sims, new fixture-world kinds, new harness capabilities (CLAUDE.md: harness takes none of those).
- Multipart upload / Supabase Storage client (`live-stack.ts` has neither).

## Non-Obvious Things

1. **`notLanded` vs `awaiting()`.** Adapter `notLanded` throws `Error` (`_fixture.ts` 119–123, `_live.ts` 81–85). That red is undeclarable. Honest “owned elsewhere” reds must throw `CapabilityPending` from the **test body**, as `_pending.ts` `awaiting()` does.

2. **Per-tier split is normal.** Loop green + integration red means the decision is right and a live surface is missing (README 156–161). AT-002.05 is the template: loop asserts the exhausted **sentence**; integration `awaiting('ui.discovery-surface')`.

3. **Static oracles scan the whole product tree.** Adding Storage, `bytea`, or document-named columns fails **AT-002.16** (`_source-documents.ts` 70–130), which is green today. Adding a `state` / `lifecycle` / `status` column on a table whose name contains `project` fails `absentPublishFlowProblems()` and thus `at:selftest` (`_source-absences.ts` 392–401, `req002-oracles.selftest.ts` 41–42), even though AT-002.19/20 stay red via `awaiting()`. A need table should not be named like a publish store.

4. **`projects` is the single-developer seat, not a need.** Comment at migration lines 65–66. `createProjectAsOperator` inserts `(org_id, name)` only. Intake is a new shape; read `project-workspace` and `public-project` before adding a second project write route (brief fact 5).

5. **Unique org seat.** There is one membership. “Member without admin” is `setMembershipRoleAsOperator(..., 'member')` on that row, not a second grant.

6. **Unverified NGO with a session** is a live-only trick: confirm, complete, then clear `email_confirmed_at`. AT-003.03’s Given is the opposite: verified **and** remaining credits > 0. A fresh verified NGO has remaining = unverified pin (10). Do not debit first.

7. **`h.config.get` does not see file caps.** `filePerFileSizeCapMb` is in `AT_CONFIG` (125–137) but not in `CONFIG_KEYS` (31–37). Inventing a key throws. REQ-003 must not pin REQ-032 numbers.

8. **Declaration `requirement` field is `"003"`**, matching `normalizeRequirement`. Copy-paste `"req-003"` fails the loader (`expected.ts` 213–214).

9. **Em dash U+2014** in `CAPABILITY PENDING —`. ASCII hyphen will not match (`expected.selftest.ts` 32–33).

10. **CI loop-only.** Integration green is a local (or later CI) claim. First integration declaration is authored from analysis, not copied from a run.

11. **Compose adapters, don’t extend REQ-002’s contract.** REQ-002 fixture wraps REQ-001; live **reimplements** provision. REQ-003 should add its own SUT key and delegate provision/allowance inward.

12. **`expect.hasAssertions()` + `awaiting()` works** because a throw fails the test before the “no assertions” check. REQ-002’s red ids are CI-green under `--expect`.

13. **Harness `LIFECYCLE_STATES` is not the engine.** Using that seed as product state would be a new fixture world, which this run must not add.

14. **Write-route stand-in needle is REQ-001 `_fixture.ts` only.** A stand-in listed in `WRITE_ROUTES` must appear in that one file, not in REQ-003’s fixture.

15. **SKILL.md function list is stale.** Protocol (confirmations on, Mailpit, no service-role REST for orgs) is still the live path.

## Open Questions

- I did not run `at:check` / `at:verify`; this is a code reading.
- I did not fully read REQ-001 live provision helpers beyond the header and grep, or every `local-stack.ts` identity proof. Integration reset/lock behavior is taken from `prepareLocalStack` (986–1001) and `runner.ts` 385–429.
- Whether AT-003.09/02 “renders” is a backend read (REQ-002.01 dashboard pattern) or an integration-only `ui.*` red is a design choice the brief leans toward **backend copy/flag**.
- Whether AT-003.10/12/17 are stubbed green or declared red is a design choice. The brief allows stubs for classification and cause labels, and asks the design to decide how to prove the transition until REQ-005.5’s engine exists. The harness can support either: operator SQL + in-memory stub, or `awaiting('…')` + matching `--expect` red.
- I could not find a shipped file-policy / disclosure module. Copy will be a suite/product fixture until REQ-032 lands.
- Multipart upload at integration: no helper exists. A JSON metadata attach would prove “attached” without tripping AT-002.16; storing bytes would not, unless the document oracle is narrowed (out of this item’s harness rules).

## Harness constraints a REQ-003 suite must respect

1. Register in `suite-adapters.ts` + `export const requirement` on **both** `_fixture.ts` and `_live.ts`.
2. One `atTest` call site per P0 in a `*.test.ts` file; no retired ids; no extras.
3. Types from the adapter; `bindSuite` names two strings.
4. `_contract.ts`: type aliases, not interfaces; judgement types imported from shipped modules when they exist.
5. `_pending.ts` + `awaiting()` for reds; capabilities listed once and copied into `req-003.json` in the same order.
6. Manifest before first run; both tiers; bijection with the 13 P0s; `requirement: "003"`.
7. Every `open()` body must observe something (`expect.hasAssertions` + open/capture).
8. Per-tier maps: every tier or `default`.
9. No new harness sentinels, faults, vendors, fixture worlds, or capabilities.
10. New tables → `TENANT_CATALOG`. New write routes → `WRITE_ROUTES` + jwt config + no bypass.
11. Do not call `notLanded` members. Do not command the clock in a single body that also runs at integration.
12. Source arms: throw on blind instruments; selftest the refusal; AT body asserts `[]`.
13. Unique emails via `w.email`. Compose REQ-002 for NGO/admin/allowance.
14. `--wired` is not available. Do not mark `surface: 'ui'` unless a later wiring leaf will select those ids.
15. Adding the suite without `tests/at/expected/req-003.json` fails CI even if `at:check` passes.

## Harness gaps that can stop an integration green for the thirteen ids

| Id | Gap |
|---|---|
| All that `open()` | No `_live.ts` → every id red as `fixtures.worlds, sut.<key>` (wrong shape unless you declare that). |
| AT-003.01, .02, .04, .03, .05 | No product write route for a need. `projects` insert is not intake. Until a registered route exists, loop can still green over a fixture that delegates to shipped decisions; integration cannot. |
| AT-003.04 | Live **can** provision volunteer / visitor / demote admin. Not a gap if the route exists. |
| AT-003.03 | Live **can** give verified + remaining > 0. Isolation is a test Given, not a harness hole. |
| AT-003.05 | Data contract is write-then-read. No UI. Not a harness hole. Session-close as Auth expiry is the wrong proof (120s pin; don’t). |
| AT-003.17 | No cause producer. Negative read of empty labels can green on a stub column/array. If the body calls a missing member, undeclarable. |
| AT-003.07 | No Storage/multipart client. JSON/metadata attach can green. Byte storage likely fails AT-002.16 at **loop** (CI) as well as integration. |
| AT-003.09 | No screen. Route-returned copy/flag can green both tiers (brief). If the body requires DOM, only a `ui.*` red is declarable; `--wired` cannot prove it. |
| AT-003.10 | No classification event. Operator stub can green both tiers. No stub and a missing member → undeclarable. Honest wait: `CapabilityPending` on a named REQ-004 surface. |
| AT-003.11, .12 | No lifecycle engine; `projects` has no state column. Adding `projects.state`/`lifecycle` breaks REQ-002’s absence selftest. Transition must live on a name the publish oracle does not treat as a publish store, or the ids stay declared red on the engine. `fundingAllowed` is `notLanded`; free remaining credits are enough for “capacity”. |
| AT-003.14, .16 | No intake snapshot table. Append-only `audit_events` exists (REQ-001). A new table must join `TENANT_CATALOG` and the append-only posture. Operator “later edit” is required for .16; there is no Discovery editor to drive. |
| CI | Integration is never run in GitHub Actions. A local integration green is not a CI gate. |

The harness will not block a well-shaped suite of thirteen call sites and a matching declaration. What blocks **integration proof** is missing product surfaces (need write route, attach, snapshot, transition), plus REQ-002’s tree-wide oracles if storage or a project `state` column is added under ordinary names.
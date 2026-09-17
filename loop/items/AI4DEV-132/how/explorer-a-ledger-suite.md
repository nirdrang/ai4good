The allowance ledger is one per-organisation, per-UTC-day row with remaining computed, not stored. Daily reset is lazy (a new day key), not a cron. The req-003 suite is the registration template: one `atTest` per P0, pending via `CapabilityPending`, expected-state bijection.

### Components Found

| Name | Path | Role |
|---|---|---|
| `public.discovery_spend` | `supabase/migrations/20260916120000_discovery_allowance.sql` lines 4–13 | Ledger table: one row per organisation per UTC day. Remaining is never a column. |
| `public.discovery_daily_grant` | same file, lines 20–27 | SQL grant: 30 if vetted, else 10. Immutable. Execute revoked from all client roles. |
| `public.apply_discovery_grant_mark` | same file, lines 32–53 | Upserts today's row; on conflict sets `granted = greatest(old, new)`. Used by debit and by vetting. |
| `public.discovery_allowance` | same file, lines 58–211 | Security-definer RPC for `read` and `debit`. Service role only. |
| `DISCOVERY_DAILY_GRANT`, `dailyGrantFor`, `highWaterGrant`, `remainingCredits`, `utcDayOf` | `supabase/functions/_shared/discovery-allowance.ts` | TypeScript twin of the SQL grant, high-water, remaining, and UTC day. |
| `dailyAllowanceExhaustedReason`, `debitExceedsRemainingReason`, `emailUnverifiedReason` | same file, lines 50–78 | One copy of the three debit sentences. SQL raises the same words. |
| `Allowance`, `SpendRow`, `DiscoveryAllowanceArgs` | same file, lines 80–119 | Response and RPC-arg types. |
| `decideDiscoveryAllowance` | same file, lines 153–202 | TypeScript write decision: action, org, admin, credits. Does **not** check email verification. |
| `renderDiscoveryAllowance` | same file, lines 121–151 | Maps SQL snake_case jsonb to camelCase `Allowance`; refuses if remaining ≠ granted − spent. |
| `discovery-allowance` route | `supabase/functions/discovery-allowance/index.ts` | `Deno.serve(writeRoute({ name, target: organizationIdField, decide, render }))`. |
| `WRITE_ROUTES['discovery-allowance']` | `supabase/functions/_shared/write-routes.ts` lines 63–66 | Inventory row: edge RPC `discovery_allowance`, NGO accounts only. |
| `WRITE_REFUSAL_KINDS` | same file, lines 78–103 | Includes `invalid-credit-amount`, `daily-allowance-exhausted`, `debit-exceeds-remaining`, `email-unverified`. |
| `writeRoute` | `supabase/functions/_shared/edge.ts` lines 337–380 | Auth → standing → `writePipeline` → RPC → JSON. SQLSTATE 5-char → HTTP 409, `kind` from `details`. |
| `AT_CONFIG.discoveryDailyCreditsUnverified` / `…Vetted` | `tests/at/harness/atconfig.ts` lines 83–93 | Pins 10 and 30. Suites must not hard-code these. |
| `CONFIG_KEYS` | `tests/at/harness/config.ts` lines 32–33 | Dotted keys `req-002.discovery.daily_credits.unverified` / `.vetted`. |
| `atTest`, `bindSuite`, `TIER` | `tests/at/harness/registry.ts` | One call site per id; types derived from `suite-adapters.ts`. |
| `CapabilityPending`, `AtPending` | `tests/at/harness/pending.ts` | The two declarable red shapes. |
| `loadTierExpectation`, `expectationDeviations` | `tests/at/harness/expected.ts` | `--expect` matcher. Red that turns green fails. |
| `inspectBijection` | `tests/at/harness/check.ts` | `at:check`: P0 ids in the acceptance file ↔ `atTest('AT-…'` in `*.test.ts`. |
| `runner.ts` | `tests/at/harness/runner.ts` | `at:verify`: bijection preflight, optional `--expect`, loop vs integration stack reset. |
| `AdapterModules` | `tests/at/harness/suite-adapters.ts` lines 108–113 | Live suites: req-001, 002, 003, 016 only. **req-004 is not registered.** |
| `TENANT_CATALOG.discovery_spend` | `tests/at/suites/req-001/_policy-scan.ts` line 32 | `unreachable-by-client-roles`. A new table without a row fails CI. |
| `OrganizationsSut.readAllowance` / `debitAllowance` | `tests/at/suites/req-002/_contract.ts` lines 305–323 | Product operations the live adapter posts to the edge route. |
| `awaiting()` | `tests/at/suites/req-002/_pending.ts` and `req-003/_pending.ts` | Throws `CapabilityPending` with named surfaces. |
| `grantPinProblems`, `exhaustedSentenceProblems` | `tests/at/suites/req-002/_source-pins.ts` | Static bijection: pins ↔ TS constants ↔ SQL literals and raise sentences. |
| `discoveryWalletProblems`, `scanTrustWording`, `absentPublishFlowProblems` | `tests/at/suites/req-002/_source-absences.ts` | Naming oracles that throw if they cannot measure. |
| `createEmailProviderSim` | `tests/at/harness/vendors.ts` | Only vendor stand-in. Anthropic is not here. |
| Parked `createSemanticOracle` | `loop/parked/v1/tests/at/harness/oracles.ts` | **Not live.** v1 is parked. |

---

### Flow

#### Ledger table and per-UTC-day row

`discovery_spend` columns (`20260916120000_discovery_allowance.sql` 4–13):

- `org_id uuid` → `organizations(id)` ON DELETE CASCADE
- `utc_day date`
- `spent integer` default 0
- `granted integer`
- **Primary key `(org_id, utc_day)`** — one row per organisation per UTC calendar day
- Checks: `spent >= 0`, `granted > 0`, **`spent <= granted`** (balance cannot go negative at the table)

No `remaining` column. Comment at line 2: remaining is `granted - spent`.

RLS enabled; `REVOKE ALL` from `anon`, `authenticated`, `service_role`. Client roles cannot read the table. The definer runs as owner.

#### HTTP request / response

**Request** (POST `/functions/v1/discovery-allowance`), JWT required (`config.toml` 515–516 `verify_jwt = true`):

```json
{ "organizationId": "<uuid>", "action": "read" }
{ "organizationId": "<uuid>", "action": "debit", "credits": <positive integer> }
```

**Success** (`edge.ts` 379: `{ ok: true, ...render(sql jsonb) }`):

```json
{ "ok": true, "organizationId", "utcDay", "vetted", "dailyGrant", "spentToday", "remaining" }
```

SQL returns snake_case (`organization_id`, `utc_day`, `daily_grant`, `spent_today`). `renderDiscoveryAllowance` converts.

#### TypeScript decision (`decideDiscoveryAllowance`)

1. Missing `organizationId` → `invalid-request` 400
2. Action not `read` or `debit` → `invalid-request` 400
3. Org does not exist → `no-such-organisation` 409
4. Caller not org admin → `not-a-member` / `not-an-admin` 403 (`orgAdminActionAllowed`)
5. Read with `credits` set → `invalid-request` 400
6. Debit with non-positive integer → `invalid-credit-amount` 400

Email verification is **not** in this function. The gate (`writeGateDecision`) still refuses deactivated / wrong account type before `decide`.

#### SQL definer (`public.discovery_allowance`)

1. `assert_account_active`
2. `FOR SHARE` on the organisation; missing → `no-such-organisation` (23503)
3. Membership `FOR SHARE`; none → `not-a-member`; role ≠ `admin` → `not-an-admin`
4. **UTC day from `clock_timestamp() at time zone 'utc'`, after the lock, never `now()`** (comment C1, lines 106–109)
5. Vet flag from `org_vetting`; missing row → `vetted = false`
6. Action not read/debit → `invalid-request`

**Read** (no write):

- Credits on a read → `invalid-request`
- No row today → spent=0, granted=current-tier grant, **no insert**
- Row exists → `granted = greatest(stored, current-tier grant)` (high-water on read too)
- Returns jsonb. Remaining = granted − spent.

**Debit:**

- `auth.users.email_confirmed_at` null → `email-unverified` (42501)
- credits null or ≤ 0 → `invalid-credit-amount`
- `apply_discovery_grant_mark` (insert or raise granted)
- `SELECT … FOR UPDATE` on today's row
- `v_remaining = granted - spent` **before** adding (avoids int32 overflow)
- `remaining <= 0` → `P0001` / detail `daily-allowance-exhausted`
- `p_credits > remaining` → `P0001` / detail `debit-exceeds-remaining`
- else `spent = spent + p_credits`, return the new allowance

HTTP maps SQLSTATE to 409 and `kind` from `details` (`edge.ts` 373–376, `rpcRefusalStatus` in `write-routes.ts` 239–241).

#### High-water grant (same-day vet raise)

Two writers:

1. **Vet/unvet** (`20260914120000_org_vetting.sql` 406–413): `apply_discovery_grant_mark(org, utc_day, previous_vetted OR current.vetted)`. An unvet on a day with no row would otherwise write 10 and take credits already held. Founder ruling 2026-09-09.
2. **Debit** always marks at the current tier.
3. **Read** applies `greatest` in memory; it does not persist.

Loop fixture twin: `applyGrantMark` in `req-002/_fixture.ts` 354–369, called from `commitVetting` at 454 with `(existing.vetted || record.vetted)`.

AT-002.07: consume k, vet → `dailyGrant` becomes 30, `spent` stays k, remaining = 30 − k. AT-002.08: unvet then re-vet same day does **not** mint extra credits; granted stays at the high-water 30.

#### Daily reset: lazy, not cron

No `cron.schedule` on this table. A new UTC day is a new primary-key value.

- Read with no row for today: remaining = grant, spent = 0, **no row written**. AT-002.06 asserts this (`b-allowance.test.ts` 142–146).
- First debit of the day inserts via `apply_discovery_grant_mark`.
- Yesterday’s spent stays on yesterday’s key. No rollover.

Integration cannot command time (`RealClock` has only `now()`; `ControlledClock.advance` is loop-only). Reset is simulated by `writeSpendRowAsOperator`: write yesterday, **delete today’s row** (`_contract.ts` 314–322; live SQL at `_live.ts` 616–634). Comment: no midnight event exists to observe.

Loop clock default is `2026-01-01T00:00:00.000Z` (`clock.ts` 12), not wall “today”. Integration uses real UTC via SQL `clock_timestamp()`.

#### Block at zero and remedy copy

Copy lives in **two places that must match**:

1. TypeScript `dailyAllowanceExhaustedReason` (`discovery-allowance.ts` 50–59)
2. SQL raises (`20260916120000_discovery_allowance.sql` 172–185)

Unverified (remaining ≤ 0):

> `discovery_allowance refuses: organisation {id} has no Discovery credits left today — get vetted (daily grant becomes 30), fund project fuel to continue now, or wait for the next UTC day`

Vetted:

> `… — fund project fuel to continue now, or wait for the next UTC day`

No “get vetted”. The 30 is `dailyGrantFor('vetted')` / `discovery_daily_grant(true)`, never a numeral in the format string (`_source-pins.ts` `checkNoNumeral`).

`shipped-discovery-allowance.selftest.ts` already asserts the two-remedy vetted sentence. AT-002.05 only proves the **unverified** three-remedy sentence at loop; at integration it is red pending `ui.discovery-surface`.

Oversize debit: `debitExceedsRemainingReason` — “still has N Discovery credits remaining today — this debit is larger than what remains”.

#### at-config pins

```83:93:tests/at/harness/atconfig.ts
  discoveryDailyCreditsUnverified: { value: 10, unit: 'credits/day',
    source: 'prd-mvp.md REQ-002 — "within 10 credits/day"' },
  discoveryDailyCreditsVetted: { value: 30, unit: 'credits/day',
    source: 'prd-mvp.md REQ-002 — "Allowance 30/day"' },
```

Note: the pin **name** says “email-verified NGO” for the 10. The product grant is **vetting tier** (unverified vs founder-vetted), not email confirmation. Email confirmation is a separate debit gate. Suites read via `h.config.get('req-002.discovery.daily_credits.unverified')` or `createConfigRegistry()`. `_source-pins.ts` `grantPinProblems()` fails if AT_CONFIG, `DISCOVERY_DAILY_GRANT`, and SQL `when p_vetted then 30 else 10` disagree.

---

#### Req-002 ids that read this ledger

From `tests/at/suites/req-002/` (allowance + gates):

| Id | What it asserts | If you change the ledger |
|---|---|---|
| **AT-002.04** | Unverified grant = pin 10; consume 1..10; extra debit `daily-allowance-exhausted`; oversize `debit-exceeds-remaining` with exact sentence; refused oversize writes **no row**; integration also 2147483647 overflow as `debit-exceeds-remaining`; draft project still allowed | Changing 10, remaining math, or writing a row on a refused debit breaks it |
| **AT-002.05** | Loop: debit past 0, reason matches `/get vetted/i`, `daily grant becomes ${vettedPin}`, `/fund project fuel/i`, `/wait for the next UTC day/i`; `exhaustedSentenceProblems() === []`. Integration: `awaiting(ui.discovery-surface)` | Changing the unverified sentence or dropping the pin scan breaks loop green |
| **AT-002.06** | From remaining 0, half, and full: after “rollover” (yesterday row, today deleted) remaining = grant, spent = 0, **read does not insert today’s row**, first debit writes it, second read in the same day does not reset again. Unvet on a day with no row keeps vetted grant (high-water). Integration compares `utcDay` to `utcDayOf(Date.now())` | Cron, storing remaining, writing on read, or lowering grant on unvet breaks it |
| **AT-002.07** | Mid-day vet: remaining = 30 − k; next day (operator backdate) remaining = 30 | High-water / new-day key |
| **AT-002.08** | Re-vet same day mints no extra credits; still one spend row | High-water |
| **AT-002.27** | After zero block, “next day” first debit succeeds at unverified pin − 1 | Reset simulation |
| **AT-002.10, .26, .31** | Declared red: `checkout.project-fuel` (± `billing.funded-turn`) | Fuel, not this ledger |
| **AT-002.18** | Concierge vet → remaining = vetted pin, spent = 0 (`e-gates.test.ts` 117–128) | Grant mark on vet |
| **AT-002.21** | Unvetted NGO can debit the full unverified grant; publishing still forbidden; in-grant debits never refused | Mixing vetting into debit |
| **AT-002.22** | Email-unverified: debit `email-unverified`, no spend row; still blocked after vet; verified control debit succeeds | Debit email gate |

AT-003.03 also **reads** remaining > 0 before starting a need (`b-gate-and-autosave.test.ts` 8–9). It does not debit.

---

### Suite shape (req-003, the template)

Directory `tests/at/suites/req-003/`:

| File | Job |
|---|---|
| `_bind.ts` | `bindSuite({ requirement: 'req-003', sut: 'needs' })`. Re-exports `atTest`, `CapabilityPending`, `TIER`. |
| `_contract.ts` | `NeedsSut`. Reuses req-002 `NgoActor`, `Session`, `WriteRefusal`, `AllowanceOutcome`. Judgement types imported from shipped modules. **Type aliases, not interfaces.** |
| `_fixture.ts` | `export const requirement = 'req-003' as const`. Loop adapter: in-memory needs, **delegates** `provision*` and `readAllowance` to req-002’s adapter. Drives `writePipeline` + shipped `decideProjectNeed`. |
| `_live.ts` | Same `requirement` literal. `createLiveAdapter({ stack })`. Real Auth, edge `project-need` / `need-intake`, SQL. NGO: signup → confirm → complete-signup → optionally clear `email_confirmed_at`. |
| `_pending.ts` | `AWAITED` names + `awaiting(...surfaces)` → `throw new CapabilityPending(surfaces)`. |
| `_source-need.ts` | Static pin: last `public.project_need` must call `has_platform_acknowledgment`. Throws if the function cannot be found. |
| `a-`…`f-*.test.ts` | Only these are scanned by `at:check` (files ending `.test.ts`). |

**Green at both tiers:** `a-capture.test.ts` `AT-003.01` — single body, `open()`, `provisionNgo`, start/read/public 404.

**Green at loop, declared red at integration:** `d-reference-files.test.ts` `AT-003.07`:

```8:41:tests/at/suites/req-003/d-reference-files.test.ts
  atTest('AT-003.07', '…', { surface: 'ui' }, {
    default: async ({ open }) => { /* attach files against the fixture */ },
    integration: awaiting(AWAITED.referenceUpload),
  });
```

`tests/at/expected/req-003.json` integration red:

```json
"AT-003.07": { "kind": "capability-pending", "capabilities": ["storage.reference-upload"] }
```

Same pattern: AT-003.09 / .10 → `ui.reference-upload-surface`.

Per-tier map must name every tier or `default`. A hole reports MISSING, which **no declaration can describe** (`registry.ts` `tierBodyProblem`, 740–757).

---

### Capability names used so far (all four expected files)

**req-001.json**

- `ui.authenticated-surface-rendering`
- `gateway.virtual-key-revocation`
- `gateway.virtual-key-reissue`
- `vendors.gotrue-sign-in-rate-limit`
- `sut.accounts.registerWithGithub`
- `sut.accounts.registerWithProvider`
- `vendors.github-public-statistics`
- `sut.accounts.sendDiscoveryMessage`
- plus `{ kind: "pending", phase: "sut-missing" }` on AT-001.18

**req-002.json**

- `checkout.project-fuel`
- `billing.funded-turn`
- `publish.flow`
- `triage.queue`
- `ui.public-listing-screens`
- `ui.discovery-surface` (AT-002.05, **integration only**)

**req-003.json**

- `storage.reference-upload`
- `ui.reference-upload-surface`

**req-016.json** — none (all green both tiers)

Brief: reuse names already in `tests/at/expected/`, `ui.discovery-surface` among them; add new ones only where none fit.

---

### How registration, `at:check`, `--expect`, pending, static arms, live adapter, CI work

**`atTest` bijection.** `at:check` (`check.ts` 48–83) parses P0s from `.taskmaster/docs/acceptance/at-req-0NN.md` with `AT-{req}.{n} (P0)`, then every `atTest(\s*['"\`](AT-…)['"\`]` in `tests/at/suites/req-0NN/*.test.ts`. Underscore files are ignored. One call site per P0, none extra, none duplicated. Empty P0 set is a failure.

**Pending with a stated shape.** Not `it.skip`. The body throws:

- `new CapabilityPending(['checkout.project-fuel', 'billing.funded-turn'])` → first line exactly `CapabilityPending: CAPABILITY PENDING — checkout.project-fuel, billing.funded-turn`
- or `new AtPending(id, phase, detail)` with phase `harness-missing` \| `sut-missing` \| `tier-unset`

Per-tier: `default`/`loop` can prove; `integration: awaiting(AWAITED.x)` is the intake pattern for “decision green at loop, surface missing at integration”.

**`--expect`.** `runner.ts` 334–341 loads `tests/at/expected/req-0NN.json` **before** spawning tests. Manifest `requirement` must match. Each tier: `green[]` ∪ `red{}` = exact P0 set. After the run: every declared green is green; every declared red matches rebuilt first line; a red that is green fails; vitest pass/fail counts must equal declared green/red; no pending/todo; no extra tests; file-level import/hook failures fail. Declaration authored **before** first run (`expected/README.md` §3).

**Static arm.** `_source-*.ts` (not `.test.ts`) export `*Problems(): string[]`. The test calls `expect(fn()).toEqual([])`. Empty list = pass. **Throws** if it cannot read the artefact (missing function, empty product tree) so a broken instrument cannot look like an absence. Pins: extract last SQL definition, compare to TS and AT_CONFIG. Absences: naming sweep over routes, SQL objects, quoted strings, JSX, cron, triggers.

**Live adapter provisioning (req-002 `_live.ts`, reused by req-003):**

| Given | How |
|---|---|
| NGO | Auth signup → Mailpit confirm → password grant → `complete-signup` (creates org + admin seat). `emailVerified: false`: operator `UPDATE auth.users SET email_confirmed_at = null` **after** session exists (GoTrue will not issue a session to an unconfirmed address). |
| Volunteer | Signup + confirm + insert `auth.identities` github + `complete-signup` volunteer (no org). |
| Platform admin | Auth admin API `email_confirm: true` + `INSERT accounts (platform_admin)` + password grant. |
| Membership role | Operator `UPDATE org_memberships.role`. |
| Vetted tier | `POST set-organization-vetting` as the admin session. |
| Allowance read/debit | `POST discovery-allowance` with the access token. JSON rendered through `allowanceOf`. |
| Spend rows / reset Given | Direct SQL as operator (service role). |

Loop fixture: in-memory Maps; `utcDayOf(clock.now())`; same `writePipeline(decideDiscoveryAllowance)`; email check and exhausted sentences duplicated in the adapter so loop matches SQL.

**CI** (`.github/workflows/ci.yml`): on PR/push to main, if the diff touches `src/`, `supabase/`, `tests/`, `.github/`, or root build files: bun install, `bun run typecheck`, `bun run at:selftest`, `at:check` **every** `tests/at/suites/req-*/`, `at:verify --tier loop --expect` **every** `tests/at/expected/req-*.json`, then fail if a suite directory has no expected file. **Integration is not run in CI.** Ownership guard (Lovable `src/` vs Claude `supabase|tests|loop|.claude|.github`). PR must not name a Linear id the branch does not own.

Scripts (`package.json` 15–16): `at:verify` → `tests/at/harness/runner.ts`; `at:check` → `check.ts`; `at:selftest` → vitest `harness/`.

---

### Harness constraints the req-004 suite must respect

1. **Register the suite** in `suite-adapters.ts` `AdapterModules` (`'req-004': typeof import('../suites/req-004/_fixture.ts')`) or `bindSuite` will not type-check.
2. `_fixture.ts` and `_live.ts` must `export const requirement = 'req-004' as const` matching the loader.
3. **58 P0 call sites** in `*.test.ts` (retired 07, 23, 40 excluded). `at:check` and `--expect` bijection both fail otherwise.
4. Expected file **authored first**, both `loop` and `integration` tiers, 20 intended greens + 38 pending with `{ kind: "capability-pending", capabilities: [...] }` (or `pending`/`sut-missing` only if the SUT key is absent).
5. Pending body must **throw** `CapabilityPending` / `AtPending`, not skip. Names joined with `", "` in declaration order.
6. Per-tier maps: every tier or `default`.
7. Do not hard-code 10/30; use `req-002.discovery.daily_credits.*`. New knobs (cost-to-credit ratio) need an `AT_CONFIG` entry + `CONFIG_KEYS` dotted key.
8. New tables → `TENANT_CATALOG`. New write routes → `WRITE_ROUTES` + `supabase/functions/<name>/index.ts` as **one** `Deno.serve(writeRoute(` + `[functions.<name>] verify_jwt = true` in `config.toml`. Unregistered DB reach fails `writeRouteProblems()` (req-001 suite + selftest).
9. New refusal kinds → `WRITE_REFUSAL_KINDS`.
10. Do **not** build a second spend ledger. Unit 1 extends this one.
11. Do not write a row on `read`. Do not lower `granted` on unvet. Do not store remaining.
12. Exhausted / exceeds / email-unverified sentences: keep TS and SQL in lockstep (`exhaustedSentenceProblems`).
13. Loop clock is commandable; integration is not. UTC reset = operator backdate, as AT-002.06.
14. `--wired` exits 3. `drill` exits 3. CI only runs loop `--expect`.
15. Integration live adapter required or every id is `CapabilityPending: CAPABILITY PENDING — fixtures.worlds, sut.<key>` (`aboveLoopStandInRefusal`).
16. Types: aliases, not interfaces; import judgement types from shipped modules.
17. `at:selftest` plus req-001/002/003/016 at both tiers: write-route scan and NGO allowance ids will move if this run extends the ledger.

---

### Harness / product gaps that can stop the twenty ids at integration

| Id | Can be green at integration today? | Gap |
|---|---|---|
| **AT-004.01** | Yes, if “converses” is debiting this ledger at 10/30 | If the criterion needs a real Discovery send, the send route is still `WRITE_ROUTES['discovery-message']` **stand-in**. |
| **AT-004.02** | **No, as specified** | No cost-to-credit ratio, no per-turn cost record, no Anthropic usage stand-in (`contracts.ts` 13–17: Anthropic is built with the first consuming suite). “Shown to the NGO” is UI → `ui.discovery-surface` (AT-002.05). |
| **AT-004.03a** | Backend debit: yes (AT-002.05 loop already). “Shown”: no | Same split as AT-002.05. Integration UI is `ui.discovery-surface`. Do **not** duplicate the three-remedy sentence; reuse `dailyAllowanceExhaustedReason`. |
| **AT-004.03b** | Backend debit: yes (SQL already drops get-vetted). UI: no | AT-002.05 never covers vetted-at-zero. Selftest does. Brief: this may be a change to that reason, not a second copy — the change is **already in SQL**. |
| **AT-004.04, .05, .06, .48** | Routing **decision** can be green; **fuel debit** cannot | No fuel ledger in `supabase/`. Taxonomy has `fuel.*` events only. Expected names already: `checkout.project-fuel`, `billing.funded-turn`. |
| **AT-004.08** | Yes, same operator-backdate as AT-002.06 | Do not invent a cron. |
| **AT-004.09** | Allowance-unchanged: yes. Model id / priority: **no surface** | Nothing stores a Discovery model id. Funding-does-not-change-allowance is the only observable half. |
| **AT-004.47** | Yes | Debit has **no project id**; the grant is already per-org. Two unfunded projects cannot split the pool because the pool is not per-project. |
| **AT-004.49** | Bound/never-negative: yes (`spent <= granted` + `debit-exceeds-remaining`) | Underfunded turn refuse vs cap is a **design choice** the id accepts either way. Needs per-turn metering from unit 1. |
| **AT-004.10** | **Blocked** | No Anthropic call in product. No live vendor stand-in. Semantic-oracle code is **parked** at `loop/parked/v1/tests/at/harness/oracles.ts`; live `tests/at/harness/` has no H4 module. Brief says the harness is built; the live tree does not export it. Integration against the real model needs a key; `.env.example` is the secret slot; committed files must not contain keys. |
| **AT-004.11** | **Blocked** | No conversation table or resume route. Intake only moves the need to `discovery_in_progress`. |
| **AT-004.41** | Debit: yes (AT-002.22). “Any Discovery message”: stand-in | `sut.accounts.sendDiscoveryMessage` is already a pending capability in req-001. A real send route is unit 4. |
| **AT-004.42** | **Blocked until the write route exists** | No kill switch. New admin write must join `WRITE_ROUTES` + config.toml + `writeRoute`. |
| **AT-004.43, .44** | Yes as **static absences** | Copy `_source-absences.ts`: throw if the tree cannot be read; refuse grant/breaker names. |
| **AT-004.45** | Partial | `discoveryWalletProblems()` already refuses a Discovery wallet/SKU. “Outside the money ledger” needs a scan of money tables that do not exist yet — likely `capability-pending` on `checkout.project-fuel` like AT-002.10. |
| **AT-004.46** | Read remaining: yes. Turn cost + UI: no | No turn-cost records. Rendering: declare red `ui.discovery-surface` (brief). Zero-cost attach exists in req-003 and does not call debit; regeneration/error-retry do not exist (later leaves). |

**Clock gap for AT-004.08 / .11 “next day”:** integration cannot `advance()`. Use `writeSpendRowAsOperator`, not the clock. AT-004.11 “next day, new session” also needs `signInAgain` (req-003 live has it) **and** persisted conversation state, which does not exist.

**Integer overflow:** only the integration body of AT-002.04 sends `2147483647`. Loop JS will not overflow. Keep remaining-then-compare; do not `spent + credits` in SQL.

**Req-002 regression:** extending `discovery_allowance` (new actions, extra columns, changing remaining, writing on read, changing exhausted copy, changing 10/30) will fail AT-002.04–.08, .18, .21, .22, .27 and `grantPinProblems` / `exhaustedSentenceProblems`.

---

### Boundaries

- **In:** JWT caller, `{ organizationId, action, credits? }`, org membership, `org_vetting.vetted`, `auth.users.email_confirmed_at`, UTC clock.
- **Out:** camelCase `Allowance` or `{ ok: false, kind, reason }` 400/403/409/401.
- **Not this route:** conversation, Anthropic, fuel billing, UI, kill switch, per-turn cost. Comment in `discovery-allowance/index.ts` lines 4–5.
- **Vetting → ledger:** `set_organization_vetting` calls `apply_discovery_grant_mark`.
- **Intake → Discovery:** submit sets `discovery_in_progress`; no conversation starts.
- **Harness:** loop fixture Maps + `ControlledClock`; integration one local stack, reset every run (`local-stack.ts`).
- **Money:** no fuel table. Notification taxonomy already names `fuel.threshold_*` / `fuel.depleted`.

---

### Non-Obvious Things

1. **Remaining is never stored.** A column named remaining would fight `discovery_spend_within_grant`.
2. **Read is not lazy-insert.** Tests require no row after a pure read.
3. **UTC day is `clock_timestamp()`, not `now()`**, after the org lock, so a pre-midnight transaction does not debit yesterday.
4. **High-water uses OR of previous and current vetted** on unvet, so unvet cannot drop today’s grant.
5. **Email gate is SQL-only** (and the loop adapter). `decideDiscoveryAllowance` will admit an unverified debit; the definer refuses.
6. **AT_CONFIG name “email-verified NGO” = 10** is the **unverified vetting tier**, not email confirmation.
7. **Remedy copy is already split by tier** in SQL. AT-004.03b is not a new sentence; AT-002.05 simply never asserted the vetted arm.
8. **Reset is simulated by deleting today**, not by moving the clock, at integration.
9. **`at:check` only sees `.test.ts`.** Pending ids must be `atTest(...)` in a test file; `_pending.ts` is only the helper.
10. **Semantic oracle is parked**, not in live harness, despite the brief.
11. **CI never runs integration.** An integration-only bug can merge if loop `--expect` is green.
12. **Integer-max debit** is a Postgres-only proof.
13. **`discovery-message` is already a stand-in row** so the write-route scan expects it to appear in a fixture `writePipeline` spec.
14. **Capability names with commas are illegal** in the expected file.
15. **A red that turns green fails `--expect`** until the JSON moves in the same change.

---

### Open Questions

- I did not find a live H4 semantic-oracle module under `tests/at/harness/`. The parked v1 copy exists. I could not determine how AT-004.10 is supposed to call `createSemanticOracle` without restoring parked code or rebuilding it in this branch (the brief says the stand-in rides in this branch).
- I could not determine the intended cost-to-credit ratio or rounding; it is not pinned in `AT_CONFIG`.
- I could not determine whether AT-004.03a/03b at integration should stay red on `ui.discovery-surface` (AT-002.05) or go green on the debit `reason` string. Both are consistent with existing practice; they are different claims.
- I could not determine how funded routing is proven with no fuel table beyond “pure function + capability-pending debit”, which is what the brief already says.
- I did not execute `at:check` or `at:verify`; this is a read of the tree only.

---

### Files Read

`loop/items/AI4DEV-132/brief.md`; `loop/decomp/req-004.md`; `supabase/functions/_shared/discovery-allowance.ts`; `supabase/functions/discovery-allowance/index.ts`; `supabase/migrations/20260916120000_discovery_allowance.sql`; `supabase/migrations/20260914120000_org_vetting.sql` (grant mark); `supabase/functions/_shared/write-routes.ts`; `supabase/functions/_shared/edge.ts` (writeRoute); `supabase/config.toml` (function block); `tests/at/harness/{atconfig,config,registry,check,pending,expected,runner,suite-adapters,contracts,index,vendors,clock,live-stack,write-route-scan.selftest,shipped-discovery-allowance.selftest}.ts`; `tests/at/expected/{req-001,req-002,req-003,req-016}.json` and `README.md`; `tests/at/suites/req-002/{_bind,_pending,_contract,_fixture,_live,_source-absences,_source-pins,_source-scan,b-allowance,e-gates}.ts`; `tests/at/suites/req-003/{_bind,_pending,_contract,_fixture,_live,_source-need,a-capture,d-reference-files,b-gate-and-autosave}.ts`; `tests/at/suites/req-001/{_policy-scan,_write-route-scan}.ts`; `.taskmaster/docs/acceptance/at-req-004.md`; `package.json`; `.github/workflows/ci.yml`; parked `loop/parked/v1/tests/at/harness/oracles.ts` (existence only).
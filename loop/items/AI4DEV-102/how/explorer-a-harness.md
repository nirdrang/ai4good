### Components Found

- **`atTest`** (`tests/at/harness/registry.ts`, exported const at lines 852–969) — the only place an AT id becomes a vitest `it()`. Signature: `(atId, title, opts & SuiteBinding, body | per-tier body map)`. Registers one runtime row, opens/tears down worlds, stamps failures with the id.
- **`bindSuite`** (`registry.ts` 998–1037) — a suite’s one harness contact. It bakes `{ requirement, sut, sutMissingDetail }` into every `atTest` so bodies write `atTest(id, title, body)`.
- **`SuiteBinding` / `AtTestOptions` / `AtTestBodies`** (`registry.ts` 67–86, 111–118, 722–732) — binding is requirement + sut key; options are `surface?` and per-tier `timeoutMs?`; a body map is `{ default?, loop?, integration?, drill? }` and must cover every tier.
- **`parseAtId` / `AT_ID`** (`registry.ts` 34–53) — grammar `AT-<requirement>.<number>` with optional letter suffix (`AT-002.11b`, `AT-005.5.03`).
- **`inspectBijection` / `acceptanceP0Ids` / `registeredIds`** (`tests/at/harness/check.ts` 48–122) — static AT↔code bijection: P0 ids in `.taskmaster/docs/acceptance/at-req-0NN.md` vs `atTest('AT-…'` call sites in `*.test.ts`.
- **`main` of `runner.ts`** (`tests/at/harness/runner.ts` 288–525) — `bun run at:verify`. Preflight bijection, optional `--expect` load, optional integration stack prepare, spawn vitest, grade per id.
- **`ExpectedManifest` / `TierExpectation` / `RedDeclaration`** (`tests/at/harness/expected.ts` 46–59) — committed green/red contract. A red is `{ kind: 'capability-pending', capabilities }` or `{ kind: 'pending', phase }`.
- **`AT_CONFIG` / `AtConfigEntry`** (`tests/at/harness/atconfig.ts` 19–204) — pinned numbers. `value: null` means unpinned (read must throw). `provisional: true` is usable but not founder-settled.
- **`CONFIG_KEYS` / `createConfigRegistry`** (`tests/at/harness/config.ts` 31–84) — dotted-key reader `h.config.get()`. Only keys listed here are addressable from a test. An override may re-tune, never invent.
- **`ControlledClock` / `RealClock`** (`tests/at/harness/clock.ts`) — loop clock: `freezeAt` + `advance` + `now`. Integration clock: `now()` only (`Date.now()`).
- **`Clock` / `RealClock` types / `TierHarness`** (`tests/at/harness/contracts.ts` 54–75, 220–227) — at integration, `h.clock.advance` is a compile error; `vendors` is omitted.
- **`createHarness` / `liveAdapterExists` / `loadAdapter`** (`tests/at/harness/index.ts` 54–250) — loop loads `suites/req-0NN/_fixture.ts` with a controlled clock; above loop loads `_live.ts` or refuses before construction.
- **`AdapterModules` / `SuiteId` / `SutOf` / `WorldOf`** (`tests/at/harness/suite-adapters.ts` 107–137) — compile-time suite registry. Today only `'req-001'` and `'req-016'`. A new suite cannot `bindSuite` until a line is added here.
- **`AtPending` / `CapabilityPending`** (`tests/at/harness/pending.ts`) — the two declarable red shapes. Phases: `harness-missing` | `sut-missing` | `tier-unset`.
- **`prepareLocalStack` / `lifetimePinProblem` / `evidenceLine` / `childEnv`** (`tests/at/harness/local-stack.ts`) — integration: lock, prove identity, reset DB, prove migrations, allowlisted child env.
- **`acquireStackLock`** (`tests/at/harness/stack-lock.ts`) — machine-wide lock keyed by project id + api port.
- **`stackFromEnv` / `STACK_ENV`** (`tests/at/harness/live-stack.ts` 16–79) — child reads `AT_SUPABASE_URL`, `AT_SUPABASE_DB_URL`, `AT_SUPABASE_ANON_KEY`, `AT_SUPABASE_SERVICE_ROLE_KEY`, `AT_SUPABASE_MAIL_URL`.
- **`notLanded` / `LEAF`** (`tests/at/suites/req-001/_pending.ts`) — a full body that throws `AtPending(id, 'sut-missing', …)` so a not-yet-landed P0 still has a call site.
- **Fixture adapters** (`tests/at/suites/req-001/_fixture.ts`, `req-016/_fixture.ts`) — loop SUT: in-memory storage + shipped decision modules. Must `export const requirement = 'req-0NN' as const`.
- **Live adapters** (`req-001/_live.ts`, `req-016/_live.ts`) — integration SUT: real Auth, edge functions, SQL, mail catcher.

### Flow

1. **Authoring.** Write P0 lines in `.taskmaster/docs/acceptance/at-req-0NN.md` as `- **AT-0NN.MM (P0)** — …`. Retired/P1 lines are ignored by the checker.
2. **Register the suite.** Add `'req-0NN': typeof import('../suites/req-0NN/_fixture.ts')` to `AdapterModules` (`suite-adapters.ts` 108–111). Export `requirement` from `_fixture.ts`. `_bind.ts` calls `bindSuite({ requirement: 'req-0NN', sut: '<key>' })`.
3. **Call site.** A `*.test.ts` file calls `atTest('AT-0NN.MM', title, opts?, body)`. `atTest` (`registry.ts` 861–969) parses the id, refuses a requirement/binding mismatch, stores one `Registration`, emits JSONL if `AT_REGISTRATION_DIR` is set, and registers `it(\`${atId} — ${title}\`)`.
4. **`bun run at:check req-0NN`** (`package.json` → `check.ts`). `normalizeRequirement` → `inspectBijection`: parse P0 ids from the acceptance file, scan `tests/at/suites/req-0NN/*.test.ts` for `atTest('AT-…'`. Exit 0 only if the two sets match with no duplicates. **Red vs green is irrelevant here.** Every P0, including honest reds, needs exactly one call site.
5. **`bun run at:verify req-0NN --tier <loop|integration|drill> [--expect]`** (`runner.ts` `main`).
   - Parse args. `--tier` is required. `--wired` exits 3 (no screen driver). `--wired` + `--expect` is refused.
   - Bijection preflight (`inspectBijection`). Any problem → exit 2, no tests.
   - If `--expect`: `loadTierExpectation` reads `tests/at/expected/req-0NN.json`, validates JSON/schema/tier, and requires declared ids = acceptance P0 set. Failure → exit 2, no tests.
   - **loop:** no database. Spawn vitest.
   - **integration:** refuse if `AT_REPO_ROOT` redirects; `readLocalConfig`; `lifetimePinProblem` (jwt_expiry vs `AT_CONFIG.accessTokenLifetimeSeconds`); `acquireStackLock`; `prepareLocalStack` (prove identity, wait, re-read config, prove again, `supabase db reset`, prove migrations); print `evidenceLine`; pass stack coords via `childEnv`.
   - **drill:** infrastructure refusal (`runner.ts` 378–382). No tests.
   - Spawn: `bun --no-env-file node_modules/vitest/vitest.mjs run --root tests/at --config tests/at/vitest.config.ts --reporter=json suites/req-0NN/` with `AT_TIER` and `AT_REGISTRATION_DIR`.
6. **Per test** (`registry.ts` `it` callback). `open(fixture?)` → `openWorld` → `createHarness`. Loop: `ControlledClock` + `_fixture.ts`. Integration: `RealClock` + `_live.ts`. Body runs. Worlds then harnesses tear down. A body that returns without `open()` or `capture()` throws `INVALID — test body never opened…`.
7. **Grading.** `analyzeReportedTests` (`runner.ts` 145–209) wants exactly one runtime registration and one vitest result per expected P0, title `AT-id — <registered title>`. Without `--expect`, any red/missing/extra or non-zero vitest exit → exit 1. With `--expect`, `expectationDeviations` + `reportAccountingDeviations` must be empty (including “declared red, reported GREEN”).
8. **CI** (`.github/workflows/ci.yml` 131–211, code diffs only): `bun run typecheck`, `bun run at:selftest`, `at:check` for every `tests/at/suites/req-*/`, `at:verify $req --tier loop --expect` for every `tests/at/expected/req-*.json`. **Integration is not in CI.** A suite without a manifest fails the uncovered-suite check.

### Files Read

**Harness / config:** `package.json`; `tests/at/README.md`; `tests/at/vitest.config.ts`; `tests/at/typecheck.ts`; `tests/at/harness/{registry,check,expected,atconfig,config,clock,contracts,suite-adapters,pending,index,runner,local-stack,live-stack,fixtures,stack-lock}.ts` (local-stack/live-stack/fixtures/stack-lock sampled around exported functions); `tests/at/expected/{README.md,req-001.json,req-016.json}`; `.github/workflows/ci.yml`; `.taskmaster/docs/acceptance/{README.md,at-req-001.md,at-req-002.md,at-req-016.md}`; headers of `runner-blackbox.selftest.ts`, `expected.selftest.ts`.

**req-001 suite (every file, headers + representative bodies):** `_bind.ts`, `_contract.ts`, `_pending.ts`, `_fixture.ts`, `_integration.ts`, `_live.ts`, `_live-tenant-reads.ts`, `_policy-scan.ts`, `_source-scan.ts`, `_write-route-scan.ts`, `a-signup-and-signin.test.ts`, `b-verification-and-sessions.test.ts`, `c-membership-and-acknowledgment.test.ts`, `d-tenant-isolation.test.ts`, `e-admin-operations.test.ts`, `f-lifecycle-and-audit.test.ts`.

**req-016 suite (every file, headers + representative bodies):** `_bind.ts`, `_contract.ts`, `_fixture.ts`, `_integration.ts`, `_live.ts`, `_fault-switch.ts`, `_fixture-producers.ts`, `_mail-witness.ts`, `_oracles.ts`, `_provider-faults.ts`, `_source-scan.ts`, `taxonomy.ts`, `a-emitter-and-taxonomy.test.ts`, `b-delivery-defaults.test.ts`, `c-reliability-guard.test.ts`, `d-taxonomy-evidence.test.ts`.

Not fully line-read: the long middle of `_fixture.ts` / `_live.ts` / `_integration.ts` / `_policy-scan.ts` (roles taken from headers and the functions the tests import).

### Boundaries

**In**
- Acceptance P0 text under `.taskmaster/docs/acceptance/`.
- Suite call sites in `tests/at/suites/req-0NN/*.test.ts`.
- Manifest `tests/at/expected/req-0NN.json`.
- `AT_TIER` (no default), `AT_REPO_ROOT` (data root only; integration refuses it), `AT_REGISTRATION_DIR`.
- Integration: `supabase/config.toml`, Docker/CLI stack, `supabase/migrations/`, `_live.ts`.
- Pinned numbers: `atconfig.ts` (+ `CONFIG_KEYS` if read via `h.config`).
- Shipped product modules under `supabase/functions/_shared/` imported by adapters.

**Out**
- Per-id report (green/red/missing) and exit 0/1/2/3/4.
- Loop: in-memory SUT over shipped decisions.
- Integration: HTTP Auth, deployed edge functions, SQL, Mailpit.
- CI: typecheck + selftest + `at:check` + **loop `--expect` only**.

**Does not connect to:** UI screens (`--wired` is a stub), drill-tier database, hosted Supabase (child env is allowlisted), TaskMaster JSON.

### Non-Obvious Things

**Bijection vs declared red are two machines.** `at:check` never reads `tests/at/expected/`. A deliberately red id still needs a real `atTest('AT-…'` call site. The red lives in the manifest and in a throwing body.

**Declared-red syntax (quote from `tests/at/expected/req-001.json`):**

```json
"red": {
  "AT-001.24": { "kind": "capability-pending", "capabilities": ["ui.authenticated-surface-rendering"] },
  "AT-001.18": { "kind": "pending", "phase": "sut-missing" },
  "AT-001.30": { "kind": "capability-pending", "capabilities": ["gateway.virtual-key-revocation"] },
  "AT-001.31": { "kind": "capability-pending", "capabilities": ["gateway.virtual-key-reissue"] },
  "AT-001.34": { "kind": "capability-pending", "capabilities": ["vendors.gotrue-sign-in-rate-limit"] }
}
```

Loop vs integration reds differ (e.g. AT-001.02 is green at loop, red at integration as `sut.accounts.registerWithGithub`). `req-016.json` currently has `"red": {}` at both tiers.

**Two body patterns that keep bijection + `--expect` green:**

```399:399:tests/at/suites/req-001/c-membership-and-acknowledgment.test.ts
atTest('AT-001.18', 'every NGO-side action succeeds under the one account with its own preconditions met', notLanded(LEAF.D3_L3));
```

```55:58:tests/at/suites/req-001/_pending.ts
export function notLanded(leaf: LeafLabel): (ctx: AtContext) => Promise<void> {
  return async (ctx: AtContext): Promise<void> => {
    throw new AtPending(ctx.atId, 'sut-missing', `REQ-001 ${leaf} has not landed`);
```

```97:97:tests/at/suites/req-001/f-lifecycle-and-audit.test.ts
      throw new CapabilityPending(['gateway.virtual-key-revocation']);
```

Match is exact first-line / anchored prefix, rebuilt with em dash U+2014. A red that turns green is a failure until the manifest moves the id.

**`at:check` only sees `*.test.ts`.** `_integration.ts` bodies do not count. The regex is `/atTest\(\s*['"`](AT-[\d.]+[a-z]?)['"`]/g` (`check.ts` 78).

**Acceptance parser** (`check.ts` 53): `AT-<req>.(\d+[a-z]?)**?\s*\(P0\)`. Letter suffixes work (`AT-002.11b`). Retired and P1 are skipped. `at-req-002.md` already has 27 P0 ids.

**Per-tier maps must cover `loop|integration|drill` or supply `default`.** `{ loop, integration }` without `default` throws at registration (`tierBodyProblem`, `registry.ts` 740–757). Existing suites use `default` + `integration`.

**Single-body form is typed at loop.** `h.clock.advance` compiles in a shared body even though it is absent at integration. Protection is opt-in via an `integration:` body.

**`h.config` is not the whole registry.** `AT_CONFIG` already pins `discoveryDailyCreditsUnverified` (10) and `discoveryDailyCreditsVetted` (30) (`atconfig.ts` 84–93), but `CONFIG_KEYS` only maps the three req-015 anti-spam keys. Suites that need `h.config.get('req-002.…')` must add dotted keys. Auth token lifetime is read as `AT_CONFIG.accessTokenLifetimeSeconds.value` directly.

**Loop clock is only as real as the adapter.** req-001 stamps session expiry from `clock.now()`; req-016 passes `{ now: () => clock.now() }` into `createNotifications`. Integration live adapter uses `{ now: () => Date.now() }` (`req-016/_live.ts` 482) and does not take the harness clock.

**Integration waits real time, with a per-id timeout raise.** Precedent: AT-001.12/13 `timeoutMs: { integration: 240_000 }` and `wait(ACCESS_TOKEN_LIFETIME_MS + …)` against jwt_expiry=120s; AT-016.08 `timeoutMs: { integration: 60_000 }` and `waitMs` against 3s/5s pins. There is no time travel at integration.

**CI never runs integration.** A new suite’s integration declaration is not gated by GitHub CI. Loop `--expect` is.

**`--expect` is additive.** Without it, any red fails the run. With it, the declared reds must occur with the declared shape.

**New suite compile gate:** until `suite-adapters.ts` and `_fixture.ts`’s `requirement` literal exist, `bindSuite({ requirement: 'req-002', … })` is `Type '"req-002"' is not assignable to type 'SuiteId'`.

**Default fixture name** is `req-<NNN>/base` (`registry.ts` 929). Worlds are isolated per `open()`.

**`static` on the harness is still a refusing proxy** (`index.ts` 197, `'H3 static provider scan'`). req-016 does not use `h.static`; it uses `_source-scan.ts`.

### Open Questions

- I did not execute `at:check` / `at:verify` / `at:selftest` in this pass; behaviour is from source.
- I did not count req-001 P0s by running the parser; the expected manifest lists 32 loop greens + 5 reds = 37 ids, matching `_pending.ts`’s “all 37”.
- Whether a UTC-day reset at integration could be proved by writing past timestamps into a grant table (operator SQL) is a product-schema question, not a harness feature. No such helper exists today.
- How REQ-002’s live adapter will inject time into Postgres `now()` / GoTrue is untraced: no current live adapter takes a clock.
- `drill` remains an infrastructure refusal; a per-tier map still needs a drill body or `default`.
- Exact selftest file count: `package.json` runs vitest on `harness/` with include `harness/**/*.selftest.ts`. I listed the files on disk but did not run the suite.
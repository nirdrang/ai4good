I have the suite map, the loop/integration split, and the slot coupling. Compiling the findings now.

### Components Found

- **`atTest` / `bindSuite`** — `tests/at/harness/registry.ts`. One registration per AT id. Suite names two strings (`requirement`, `sut` key). Types come from `suite-adapters.ts`. `AT_TIER` has no default. A function body runs at every tier. A `{ default, integration }` map picks the body for the current tier.
- **`createHarness` / `buildCapabilityLedger` / `buildLiveLedger`** — `tests/at/harness/index.ts`. Loop loads `suites/<req>/_fixture.ts`. Above loop, attests the slot, builds live mail, then loads `suites/<req>/_live.ts` if it exists. If `_live.ts` is missing, it falls back to the loop fixture (every adapter-derived capability is stand-in).
- **`AccountsSut` / `World`** — `tests/at/suites/req-001/_contract.ts`. REQ-001 SUT: Auth, signup, membership, operator Givens. World is `WorldSeam & { email(local) }`.
- **`NotificationsSut` / `World`** — `tests/at/suites/req-016/_contract.ts`. REQ-016 SUT: emitter, taxonomy, deliveries, drain. World adds `actors`, `fire`, `transitionCommitted`, `reassignRole`, `burstThreadComments`.
- **Loop fixture adapters** — `req-001/_fixture.ts` (Map storage + shipped modules) and `req-016/_fixture.ts` (taxonomy-derived stand-in, not the product). Both export `requirement` and `createFixtureAdapter`.
- **Live adapter** — `req-001/_live.ts` only. Talks to Auth HTTP, deployed functions, operator SQL, Mailpit via `LiveVendors`. REQ-016 has no `_live.ts`.
- **Integration bodies** — `req-001/_integration.ts`. Alternate procedures for ids whose live path differs (confirm-then-sign-in, wait for real JWT, supabase-js auto-refresh, absence probes). Also `CapabilityPending` refusals for ids this environment cannot prove live.
- **`--expect` manifests** — `tests/at/expected/req-001.json`, `req-016.json`. Loaded by `tests/at/harness/expected.ts`. Exact bijection with P0 ids. A red that turns green fails.
- **`TAXONOMY` / `PAYLOAD_PREDICATES` / `GUARDED_ROWS`** — `req-016/taxonomy.ts`. Spec oracle transcribed from the requirement. AT-016.02 asserts exact equality.
- **`countPairs` / `expectedPairs` / `pairProblems`** — `req-016/_oracles.ts`. Pure comparison. No harness import.
- **`notLanded` / `LEAF`** — `req-001/_pending.ts`. Throws `AtPending(id, 'sut-missing', …)` for 16 unlanded ids.
- **`inviteOrAddMemberSurface`** — `req-001/_source-scan.ts`. Naming oracle over `src/routes/` and `src/routeTree.gen.ts`. Shared by both tiers of AT-001.17.
- **Slot pool (outside suites, consumed via env)** — `tests/at/harness/db-pool.ts`. Occupies a slot, mirrors `supabase/`, overlays identity, pins `jwt_expiry = 120`, resets, writes attestation nonce. `stackEnv` refuses ports 44320–44329 (the repo stack on `poancmeitlmxejofwzuu` / API 44321).
- **Attestation** — `tests/at/harness/attestation.ts`. `writeAttestation` (runner, after reset) + `attestSlot` (child, read-back of `AT_SLOT_ATTESTATION`). Brands live capabilities.
- **Live mail** — `tests/at/harness/live-email.ts`. `createLiveEmail` probes Mailpit `/api/v1/info` and **requires** the slot attestation brand. `_live.ts` only imports the `LiveVendors` type.
- **Shipped-module selftests** — `tests/at/harness/shipped-caller.selftest.ts`, `shipped-verification.selftest.ts`. Plain vitest `it()` against shipped modules. Included by `tests/at/vitest.config.ts` as `harness/**/*.selftest.ts`. `at:verify` filters to `suites/req-*/`, so they never join an acceptance run.

### Flow

1. **Entry.** `bun run at:verify req-00N --tier <loop|integration> [--expect]` → `tests/at/harness/runner.ts` `parseArgs`. `--tier` is required. CI (` .github/workflows/ci.yml` lines 195–236) runs loop + `--expect` for every `tests/at/expected/req-*.json`. Integration is not a CI step.

2. **`--expect` preflight (if flagged).** `loadTierExpectation` reads `tests/at/expected/req-00N.json`. Missing file, missing tier, bad JSON, or ids not in exact bijection with P0s → exit 2, no tests.

3. **Loop vs integration stack.**
   - Loop: no database. Child env is the allowlist + `AT_TIER=loop`.
   - Integration: `occupy(req-NNN, AT_DB_SLOT?)` → `prepare(occupancy)` (mirror, identity overlay including `jwt_expiry = 120`, prove loopback/not-personal, reset, prove migrations, `writeAttestation`) → `stackEnv` emits `AT_SUPABASE_{URL,DB_URL,ANON_KEY,SERVICE_ROLE_KEY}`, `AT_SLOT_ATTESTATION`, `AT_SUPABASE_MAIL_URL`.

4. **Child vitest.** `vitest run --root tests/at --config tests/at/vitest.config.ts suites/req-00N/`. `include` is `suites/**/*.test.ts` plus `harness/**/*.selftest.ts`; the path filter keeps selftests out of `at:verify`.

5. **Registration.** Each `atTest('AT-00N.MM', …)` in `*.test.ts` registers once. `chooseTierBody` picks `integration` if present and `AT_TIER=integration`, else `default` / the function. `_integration.ts` is not scanned by `at:check` (underscore, not `*.test.ts`).

6. **`open()`.** `registry.ts` `openWorld` → `createHarness({ requirement, tier })`.
   - Loop: `_fixture.ts` `createFixtureAdapter`. Ledger stamps `fixtures.worlds` and `sut.<key>` stand-in. Registry allows stand-in at loop.
   - Integration: `attestSlot` then `createLiveEmail`. If `_live.ts` exists (req-001), `createLiveAdapter({ slot: liveCoordinatesFromEnv(), vendors, … })` and `backedSutMethods` grants `real` only on that closed list; other methods throw `CapabilityPending('sut.accounts.<method>')`. If `_live.ts` is absent (req-016), loop fixture is loaded; `stubbedCapabilities()` is non-empty; `aboveLoopStubbedRefusal` throws `CapabilityPending(['fixtures.worlds', 'sut.notifications'])` **before the body runs**.

7. **Body.** Loop bodies drive the Map fixture (req-001: shipped `validateCompleteSignup`, `callerFromAuthAnswer`, …; req-016: taxonomy stand-in). Integration bodies for req-001 follow live public order: register → Mailpit confirmation link → sign-in → deployed function / SQL read-back.

8. **Report.** Runner maps vitest results onto P0 ids. Without `--expect`, any red → exit 1. With `--expect`, green set, red set, and red **shape** (`CapabilityPending: CAPABILITY PENDING — a, b` or `AtPending: <id> PENDING [<phase>] —`) must match the manifest exactly, plus test-arithmetic and file accounting (`tests/at/expected/README.md` §5).

### Files Read

- `tests/at/suites/req-001/`: `a-signup-and-signin.test.ts`, `b-verification-and-sessions.test.ts`, `c-membership-and-acknowledgment.test.ts`, `d-tenant-isolation.test.ts`, `e-admin-operations.test.ts`, `f-lifecycle-and-audit.test.ts`, `_bind.ts`, `_contract.ts`, `_fixture.ts` (header + factory), `_integration.ts` (header, all exported bodies, refusals), `_live.ts` (header, `backedSutMethods`, factory, Auth/mail/SQL/world), `_pending.ts`, `_source-scan.ts`
- `tests/at/suites/req-016/`: `a-emitter-and-taxonomy.test.ts`, `b-delivery-defaults.test.ts`, `c-reliability-guard.test.ts`, `d-taxonomy-evidence.test.ts`, `taxonomy.ts`, `_bind.ts`, `_contract.ts`, `_fixture.ts` (header + factory), `_oracles.ts`
- `tests/at/expected/req-001.json`, `req-016.json`, `README.md`
- `tests/at/vitest.config.ts`, `tests/at/harness/index.ts`, `registry.ts` (tiers, `atTest`, `openWorld`), `runner.ts` (header + occupy/prepare), `expected.ts` (header), `attestation.ts`, `live-email.ts`, `db-pool.ts` (header, `PERSONAL_PORT_*`, `SLOT_JWT_EXPIRY_SECONDS`, `stackEnv`, `evidence`), `suite-adapters.ts`, `contracts.ts` (header), `check.ts` (header), `shipped-caller.selftest.ts`, `shipped-verification.selftest.ts`
- `package.json` scripts, `.github/workflows/ci.yml` (twin-guard + loop `--expect`), `supabase/config.toml` (`project_id`, API 44321, `jwt_expiry = 3600`)
- `loop/items/AI4DEV-86/brief.md`, `canon.md` (item intent; not suite behaviour)

### Boundaries

**In (what suites take from the harness)**

| Suite file | Exact harness imports |
|---|---|
| `req-001/_bind.ts` | `bindSuite`, types `AtContext`/`OpenWorld` from `registry.ts`; re-exports `AtPending`, `TIER`, `TIERS` |
| `req-001/_contract.ts` | type `WorldSeam` + re-exports from `contracts.ts` |
| `req-001/_fixture.ts` | type `ControlledClock` from `clock.ts`; types `FixtureWorld`, `FixtureWorldStore` from `fixtures.ts` |
| `req-001/_live.ts` | type `LiveVendors` from `live-email.ts` |
| `req-001/_integration.ts` | `CapabilityPending` from `capabilities.ts`; type `AtContext` from `registry.ts` |
| `req-001/*.test.ts` | `atTest` from `_bind.ts` only (no direct harness path). Plus `_integration.ts` / `_pending.ts` / shipped modules as listed below |
| `req-016/_bind.ts` | same pattern as req-001, bound to `'notifications'` |
| `req-016/_contract.ts` | types from `contracts.ts` |
| `req-016/_fixture.ts` | `clock.ts`, `faults.ts`, `fixtures.ts`, `sentinels.ts`, `vendors.ts` (`EmailProviderPort`) |
| `req-016/*.test.ts` | `_bind.ts` + suite-local `taxonomy.ts` / `_oracles.ts` / `_contract.ts` |
| `req-016/_oracles.ts` | none |

**Out (what a green claims)**

- Loop req-001: shipped decisions over Map storage. Not migration, RLS, Auth, or edge runtime.
- Integration req-001: deployed `complete-signup` / `create-organization` / … + real GoTrue + SQL predicate `public.has_platform_acknowledgment` + Mailpit-held links. Not OAuth consent, not real GitHub stats, not a Discovery route.
- Loop req-016: oracles and machinery against a taxonomy-conformant **stand-in**. Header of `_fixture.ts` says this is not the product.
- Integration req-016: every id red, named `fixtures.worlds` + `sut.notifications`.

**Env the live path reads (not db-pool itself)**

- `_live.ts`: `opts.slot.{apiUrl,dbUrl,anonKey,serviceRoleKey}` from `index.ts` `liveCoordinatesFromEnv()` (`AT_SUPABASE_*`). Mail via `opts.vendors` (`AT_SUPABASE_MAIL_URL` already consumed by `createLiveEmail`).
- `_integration.ts` AT-001.13 / AT-001.17: `process.env.AT_SUPABASE_URL`, `AT_SUPABASE_ANON_KEY`.

### Per-file: what each test proves

**REQ-001 — all 37 P0s register in `*.test.ts` and run at both tiers.** Difference is procedure + adapter, not which files vitest loads.

**`a-signup-and-signin.test.ts`** (imports: vitest `describe`/`expect`, `./_bind.ts`, `./_integration.ts` `{ at00101, at00105, at00106, at00107 }`, shipped `github.ts`, `acknowledgment-copy.ts`)

| Id | Proves | Loop body | Integration |
|---|---|---|---|
| AT-001.01 | NGO email signup: account, org, admin membership, acknowledgment (version/IP/time), pre-project gate false→true, return sign-in; no-ack refuses and writes nothing | `default` Map fixture | `at00101`: confirm-sign-in then deployed `complete-signup`; `hasPlatformAcknowledgment` is the SQL function |
| AT-001.02 | GitHub volunteer: type, linked handle, return GitHub sign-in | single body `registerWithGithub` | **same body**; method **not backed** → `CapabilityPending: sut.accounts.registerWithGithub` |
| AT-001.03 | Google session completes same as email | single body `registerWithProvider` | same; **not backed** → `registerWithProvider` |
| AT-001.04 | Volunteer completion without GitHub link refuses; after link succeeds; NGO control without GitHub still works | single body | same; hits unbacked GitHub register/link-as-act |
| AT-001.05 | Link+complete fires onboarding; profile equals `stubGithubStatsFor` | `default` | `at00105` = `refusesWith('vendors.github-public-statistics')` |
| AT-001.06 | Volunteer refused NGO-only `createOrganization`; NGO control succeeds; no leftover rows | `default` | `at00106`: live public order + operator GitHub link as Given |
| AT-001.07 | Provisioned platform admin signs in with type; public path refuses `platform_admin` | `default` also asserts `publicSignupAccountTypes() === ['ngo','volunteer']` | `at00107`: refusal is the live oracle; constant **not backed** |

**`b-verification-and-sessions.test.ts`** (vitest `expect`, `_bind.ts`, `_integration.ts` `{ at00109, at00110, at00112, at00113, at00114, at00138, INTEGRATION_TIMEOUT_MS }`, type `AccountsSut`, shipped `accounts.ts`, `acknowledgment-copy.ts`)

| Id | Proves | Loop | Integration |
|---|---|---|---|
| AT-001.09 | Unverified until emailed link; parameterized NGO+volunteer | `default` | `at00109`: real Mailpit link; volunteer Given via operator `linkGithubIdentity` |
| AT-001.10 | Unverified NGO blocked from Discovery; verification named; writes nothing; verify unblocks | `default` via stand-in `sendDiscoveryMessage` | `at00110` = `refusesWith('sut.accounts.sendDiscoveryMessage')` |
| AT-001.38 | Wrong password refuses; no session created | `default` | `at00138` live Auth |
| AT-001.12 | Expiry **or** revocation ends access; re-auth is the remedy | `default` uses `h.clock.advance(3600*1000)` | `at00112` waits `SLOT_JWT_EXPIRY_MS + 15_000` (120s pin); timeout 240s |
| AT-001.13 | Refresh without credentials; sibling expires | `default` `h.clock` + explicit `refreshSession` (does **not** prove “automatically”) | `at00113` real `@supabase/supabase-js` `autoRefreshToken: true`; coords from env; timeout 240s |
| AT-001.14 | Emailed reset: new password works, old does not | `default` | `at00114` Mailpit recovery link |

Harness use in this file only: `h.clock.advance` in AT-001.12 and AT-001.13 **loop** bodies (the only `h.*` in the whole req-001 suite).

**`c-membership-and-acknowledgment.test.ts`** (`_bind.ts`, `_integration.ts` `{ at00116, at00117, at00119, at00136, at00137, at00139, INTEGRATION_TIMEOUT_MS }`, `_pending.ts`, `_source-scan.ts`, `acknowledgment-copy.ts`)

| Id | Proves | Loop | Integration |
|---|---|---|---|
| AT-001.16 | Acting in org A is `not-a-member` in org B | `default` | `at00116` deployed + operator memberships |
| AT-001.36 | `member` in the target org is `not-an-admin` (distinct kind) | `default` | `at00136` |
| AT-001.37 | One account can be admin of two NGOs | `default` | `at00137` |
| AT-001.17 | Single seat: no invite surface; API/DB refuse second member | `default` + `inviteOrAddMemberSurface()` | `at00117`: same source arm + live 404 `invite-member` (control: `create-organization` exists) + Data API deny + unique index |
| AT-001.18 | Cross-surface single-seat integration | `notLanded(LEAF.D3_L3)` both tiers | same red `sut-missing` |
| AT-001.19 | Name, title, authority statement on every acknowledgment | `default` NGO **and** GitHub volunteer | `at00119` NGO-only (GitHub path not live) |
| AT-001.39 | Omit/blank/wrong identity field refuses and writes nothing | `default` seven variants | `at00139` three omissions + control |
| AT-001.20 | Shipped copy prohibits shared credentials and recommends org email | **one body both tiers**: `open()` then read `ACKNOWLEDGMENT_IDENTITY_COPY` | same (no deployed copy surface) |

**`d-tenant-isolation.test.ts`** — AT-001.21, .22, .23, .40, .24 → `notLanded(D5.L1/L2)` both tiers.

**`e-admin-operations.test.ts`** — AT-001.25–.28, .35 → `notLanded(D6.L1)` both tiers.

**`f-lifecycle-and-audit.test.ts`** — AT-001.29–.31 `notLanded(D6.L2)`; AT-001.32 single-dev seat (`default` + `at00132` operator project/assign); AT-001.33–.34 `notLanded(D6.L3)`.

**REQ-016 — 12 P0s, single-body form, no `_live.ts`, no `_integration.ts`.** Every id runs at both tiers. Integration: all 12 fail at `open()` with `CapabilityPending: fixtures.worlds, sut.notifications`.

**`a-emitter-and-taxonomy.test.ts`** (`_bind.ts`, `taxonomy.ts`)

- AT-016.01: sole writer. `h.static.providerClientImporters()` (still `pendingCapability('H3 static provider scan')` in `index.ts` ~500) → **loop red**; then `sut.senders()`, sentinels in three domains, `h.vendors.email.attempts()` orphan check.
- AT-016.02: registered events = `TAXONOMY` exactly; forbidden CR/donation patterns; unregistered emit refused; `runtimeRegistrationSurface()` empty.

**`b-delivery-defaults.test.ts`** (`_bind.ts`, `_oracles.ts`)

- AT-016.07: one logical event; restart mid-flight via `h.faults.processRestart()`; deliveries stamped with post-restart `deliveredByProcess`. File itself says the duplicate-pair assertion cannot fail at loop against this fixture.
- AT-016.08: anti-spam from at-config; two configs; `h.clock.freezeAt` / `advance`; `open(_, { config: overrides })`.

**`c-reliability-guard.test.ts`** (`_bind.ts`, `_oracles.ts`, `taxonomy.ts`)

- AT-016.09: every `GUARDED_ROWS` event: control both-commit, then `h.faults.at('notifications.between_transition_and_event_write', 'crash')` rolls back transition, event, delivery, ops item.
- AT-016.10: recipients resolved at fire; reassign NGO; old holder only.
- AT-016.11: `h.vendors.email.rejectNext` / `acceptButLoseAck`; drain `{ passes: 1 }` then quiescence; pair oracles on SUT and provider.

**`d-taxonomy-evidence.test.ts`** (`_bind.ts` `atTest`+`defineEvidenceCapture`, `_contract.ts`, `_oracles.ts`, `taxonomy.ts`)

- Shared capture fires **every** taxonomy row once (`describe.sequential`; `evidenceBuilds === 1`).
- AT-016.03: recipients/channels/payloads/ops items; fuel.depleted roles; no penalty lexicon on auto-revert.
- AT-016.04: no candidacy to NGO; no vetting to volunteer; no donation event/copy.
- AT-016.05: critical classes email; low-tone in-app; provider trace matches owed email pairs.
- AT-016.06: documented defaults exist, sourced, match class rules and named channels.
- AT-016.12: `lovable.credits_blocked` → exactly ngo + platform_admin.

**`taxonomy.ts`** — spec table (~40 events), `GUARDED_ROWS`, `CLASS_CHANNEL_RULE`, `PAYLOAD_PREDICATES`, `FORBIDDEN_EVENT_PATTERNS`. No harness.

**`--expect` manifests**

`req-001.json` loop: 21 green (the written ids), 16 red `pending/sut-missing`. Integration: 16 green (written minus .02 .03 .04 .05 .10); those five `capability-pending` with names `sut.accounts.registerWithGithub`, `registerWithProvider` (twice), `vendors.github-public-statistics`, `sut.accounts.sendDiscoveryMessage`; same 16 `sut-missing`.

`req-016.json` loop: 11 green, AT-016.01 red `capability-pending` `["H3 static provider scan"]`. Integration: green `[]`; all 12 red `capability-pending` `["fixtures.worlds", "sut.notifications"]`.

### `_integration.ts` and `_live.ts` vs database and slots

**`_live.ts` does not import `db-pool.ts` or `attestation.ts`.** It receives five strings (`Slot`) and a `LiveVendors` already built. It:

- `fetch`es `${api}/auth/v1/...` and `${api}/functions/v1/...`
- Opens `Bun.SQL(slot.dbUrl)` for operator reads/writes (`auth.identities`, `public.accounts`, `has_platform_acknowledgment`, memberships, projects, …)
- Reads confirmation/recovery URLs from `vendors.email.messagesFor` (Mailpit), quoted-printable decode, 20s poll
- World = namespaced `email()`; teardown only `sql.close()`. Comment assumes **`prepare()` already reset the slot** — no per-test DB wipe
- `backedSutMethods.accounts` is the closed live claim (no OAuth, no Discovery, no `publicSignupAccountTypes`)

**`_integration.ts` does not import db-pool/attestation/live-email.** It:

- Uses `sut.*` from `_live.ts` after `open()`
- Hard-codes `SLOT_JWT_EXPIRY_MS = 120_000` to match **slot generator** `SLOT_JWT_EXPIRY_SECONDS = 120` in `db-pool.ts`, **not** `supabase/config.toml` `jwt_expiry = 3600`
- AT-001.13 / AT-001.17 read `AT_SUPABASE_URL` / `ANON_KEY` (comments: “slot coordinates”)
- `INTEGRATION_TIMEOUT_MS = 240_000` sized for a 2-minute JWT, not a 1-hour JWT

### If `db-pool.ts` and slot parts of `attestation.ts` / `live-email.ts` go away, and integration points at the one 44321 stack

**Suite files that must change for req-001 integration to stay green**

1. **`tests/at/suites/req-001/_integration.ts` (functional, not comments)**  
   `SLOT_JWT_EXPIRY_MS = 120_000` is wrong for 44321 (`jwt_expiry = 3600`). AT-001.12 waits 135s and expects expiry; the token is still live. AT-001.13 polls 150s for supabase-js auto-refresh (designed around 120s). `INTEGRATION_TIMEOUT_MS = 240_000` cannot cover a 3600s wait. Either pin 44321 to 120s (today that pin **is** the slot generator this item parks) or change wait/timeout here. Comments “slot’s mail catcher / slot coordinates / slot’s generated config” would be stale.

2. **`tests/at/suites/req-001/_live.ts` (mostly comments + reset assumption)**  
   `Slot` is already a bag of URLs/keys; 44321 fits. Type import `LiveVendors` from `live-email.ts` stays if that type stays. World teardown is a no-op because **`prepare()` reset the slot**. If the runner no longer resets, tests share Auth users and rows across ids unless something else (`bun run db:reset`, or a new wipe) runs first. Mailpit decode/poll does not care that the catcher used to be “the slot’s”.

3. **Harness, not suite, but it gates the live adapter:** `createLiveEmail` currently refuses without `SLOT_ATTESTATION_BRAND`. If that brand dies with slot attestation, either `index.ts` stops requiring it or `_live.ts` still receives a `LiveVendors` built another way. `_live.ts` itself never calls `attestSlot`.

**Suite files that do not need a behaviour change for loop `--expect`**

- All `*.test.ts`, `_bind.ts`, `_contract.ts`, `_fixture.ts`, `_pending.ts`, `_source-scan.ts`
- Entire **req-016** suite (`_oracles.ts`, `taxonomy.ts`, `_fixture.ts`, four test files). Loop never touches slots. Integration is already all-red without `_live.ts`; the frozen manifest keeps that. No req-016 file imports db-pool/attestation/live-email.

**Comments-only / no code**

- `_fixture.ts` cites “measured on slot 1/2”
- Test file headers saying “slot’s own stack”

**What the runner must still give the child (or `_live.ts` / AT-001.13/17 break)**

`AT_SUPABASE_URL` (44321), `AT_SUPABASE_DB_URL`, anon + service-role keys, `AT_SUPABASE_MAIL_URL`. Today `stackEnv` **throws** if those URLs sit in 44320–44329. That refusal lives in `db-pool.ts`, not in the suites. Pointing integration at 44321 is an inversion of that guard.

**`AT_DB_SLOT=1` vs 44321.** Slot 1 is the **pool** image (comment in `supabase/config.toml`: 453xx), not the repo stack. `AT_DB_SLOT=1` occupies pool slot 1. The 44321 block is `project_id = "poancmeitlmxejofwzuu"` and is currently **untouchable** by the pool. The brief’s “one database, AT_DB_SLOT=1 … 44321 block” names two different stacks in current code.

### What a plain-vitest acceptance test looks like here

`tests/at/vitest.config.ts`: `include: ['suites/**/*.test.ts', 'harness/**/*.selftest.ts']`, `environment: 'node'`, 30s timeouts. `at:verify` passes `--root tests/at --config vitest.config.ts suites/req-00N/`. `at:selftest` is `vitest run … harness/`.

**Shipped-module pattern (already in tree):** `shipped-caller.selftest.ts` / `shipped-verification.selftest.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { callerFromAuthAnswer } from '../../../supabase/functions/_shared/caller.ts';

describe('the shipped caller module fails closed', () => {
  it('resolves a caller from a 2xx whose body carries a string id', () => {
    const caller = callerFromAuthAnswer(200, PLAIN_USER);
    expect(caller).not.toBeNull();
  });
});
```

No `atTest`, no `open()`, no ledger. Header states why: malformed shapes cannot arise through the fixture; a direct call from an AT body would be testing a helper. Lives under `harness/` so `at:check` / `--expect` never see it.

**Against the one stack, same grain as `_live.ts` / `at00117`, without the registry:** a `harness/*.selftest.ts` or a non-`atTest` file that `fetch`es `http://127.0.0.1:44321`, uses `Bun.SQL` on the local DB URL, reads Mailpit. That does **not** satisfy `at:check` bijection or `--expect` unless it is also an `atTest('AT-00N.MM')` in `suites/req-00N/*.test.ts`. A plain `it()` inside a suite `*.test.ts` is the extra-failure case `--expect` file-accounting tries to catch (`expected/README.md` §5).

New ATs under a frozen harness, per the item: either keep `atTest` + existing adapters (loop Map / live 44321) with **no new** sentinels/faults/oracles/fixture-world code, or add shipped-module / one-stack selftests in `harness/` and leave the two `--expect` manifests as the P0 floor.

### Non-Obvious Things

- **Every id runs at both tiers.** There is no integration-only file. “Only at integration” means “this **procedure** is the integration map entry.” Single-body ids (AT-001.02/03/04, all req-016, all `notLanded`, AT-001.20) run the same function; live colour comes from pending methods, stub ledger, or `AtPending`.
- **Loop req-016 green is not product green.** `_fixture.ts` is derived from `taxonomy.ts` “by construction.”
- **AT-016.01 is the only loop red** because `createHarness` still installs `static: pendingCapability('H3 static provider scan')`. Sentinels, faults, and email sim are real at loop; the static scan is not.
- **Slot JWT 120s vs tree JWT 3600s** is the standing reason AT-001.12/13 can be integration-green today. Parking the generator without another 120s pin (or rewriting the waits) turns those two declared greens into hangs/false reds on 44321.
- **`stackEnv` forbids 44321.** Identity proofs (loopback, not hosted, migrations replayed) are still wanted; the “not the personal block” proof is the opposite of the new target.
- **Live world does not isolate tests.** Isolation is `prepare()` reset + namespaced emails. Dropping `prepare()` without a replacement couples ids.
- **`at:check` only reads `atTest('AT-…'` in `*.test.ts`.** Bodies in `_integration.ts` are invisible to bijection; the call site in the test file is the id.
- **`--expect` is CI’s loop gate, not integration.** Integration green is a local/Done-contract command.
- **OAuth ids have no integration map.** They are red via `pendingMethodProxy` when the loop body calls an unbacked method, matching the manifest names.
- **AT-001.20 opens a world it does not use**, so the handshake still runs (and at integration would still require a live ledger / attestation today).

### Open Questions

- Whether 44321 will get a standing `jwt_expiry = 120` (today only the parked generator does that) or `_integration.ts` will stop waiting 120s. Unresolved in suite code; both AT-001.12 and AT-001.13 depend on the answer.
- Whether integration will still wipe the one stack every run. `_live.ts` does not. Without `prepare()`, leftover Auth users/`example.test` addresses can collide.
- Whether `createLiveEmail`’s attestation-brand requirement is considered a “slot part” to remove. If yes, `index.ts` `buildLiveLedger` and the `LiveVendors` construction change; `_live.ts` only needs a catcher that implements `messagesFor`.
- I did not run the suites. Colour claims are from manifests + code paths, not a fresh `at:verify`.
- I did not trace Mailpit’s port on the 44321 stack in `config.toml` beyond the live-email comment that the URL must come from `supabase status`, not from slot arithmetic.
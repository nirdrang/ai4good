The harness is a per-id gate: `atTest` registers one vitest `it()` per acceptance id, `open()` builds a fresh world, and `--expect` grades the report against a committed manifest. Req-016 is red at integration because it has no `_live.ts`; adding product code is not enough until the live adapter, per-tier bodies, and the manifest all move together.

### Components Found

**Harness package (`tests/at/harness/`)**

| Module | Role |
|---|---|
| `registry.ts` | `bindSuite`, `atTest`, `defineEvidenceCapture`, `openWorld`, `TIER`, `chooseTierBody`, `aboveLoopStandInRefusal` |
| `index.ts` | `createHarness`, `loadAdapter` / `loadLiveAdapterModule`, `liveAdapterExists`, `refusing()` |
| `suite-adapters.ts` | Compile-time map of suites; `SutOf` / `WorldOf` derived from each `_fixture.ts` |
| `contracts.ts` | Shared seam types: `Clock`, `RealClock`, `Faults`, `Sentinels`, `Vendors`, `StaticScan`, `AtHarness`, `TierHarness` |
| `pending.ts` | `AtPending`, `CapabilityPending`, `PendingPhase` |
| `guards.ts` | Shared predicates: sentinel quality, unknown fault point, already-armed, never-fired, process epoch, provider force-count |
| `faults.ts` | `createFaults(seam?)` wrapping `AdapterFaultSeam` |
| `sentinels.ts` | `createSentinels(seam?)` wrapping `AdapterSentinelSeam` |
| `vendors.ts` | `createEmailProviderSim()` — test face `sim` + SUT face `port` |
| `clock.ts` | `ControlledClock` (loop) / `RealClock` (integration, `now()` only) |
| `fixtures.ts` | `FixtureWorldStore` seed (NGO, actors, lifecycle projects, ledger, blockers, thread messages) |
| `config.ts` / `atconfig.ts` | Dotted-key reader over pinned numbers |
| `check.ts` | `bun run at:check` — P0 ids vs `atTest('AT-…'` call sites in `*.test.ts` |
| `expected.ts` | `--expect` manifest load, bijection, exact red-shape match, report accounting |
| `runner.ts` | `bun run at:verify` — args, preflight, vitest spawn, per-id grading |
| `local-stack.ts` | Integration stack: lock, identity, reset, migrations, `childEnv`, evidence line |
| `live-stack.ts` | Shared HTTP/SQL/Mailpit client (`Stack`, `stackFromEnv`, `authPost`, `functionPost`, `sqlClient`) |
| `stack-lock.ts` | Machine-wide lock keyed by project id + API port |

**Suite contact**

- `tests/at/suites/req-0NN/_bind.ts` — one `bindSuite({ requirement, sut })` call.
- `tests/at/suites/req-0NN/_fixture.ts` — loop adapter: `export const requirement` + `createFixtureAdapter`.
- `tests/at/suites/req-0NN/_live.ts` — integration adapter: same `requirement` literal + `createLiveAdapter({ stack })`. **Req-016 has none.**
- `tests/at/suites/req-0NN/*.test.ts` — the only files `at:check` counts.
- `tests/at/suites/req-001/_integration.ts` — named integration bodies, wired through per-tier maps.
- `tests/at/expected/req-0NN.json` — committed green/red contract per tier.

**Capability names in `tests/at/expected/req-016.json`**

- Loop: AT-016.01 is `capability-pending` on `"H3 static provider scan"`.
- Integration: all twelve ids are `capability-pending` on `["fixtures.worlds", "sut.notifications"]`.

There is **no live capability ledger**. `tests/at/harness/capabilities.ts` was parked at `loop/parked/v1/tests/at/harness/capabilities.ts` on merge `aa9a2a4` (2026-09-03, pull request 64). Presence is now: file existence of `_live.ts`, explicit `throw new CapabilityPending([...])`, or the `refusing()` proxy.

---

### Flow

**1. `bun run at:verify req-016 --tier integration --expect`**

`package.json` line 14 → `tests/at/harness/runner.ts` `main()` (288).

1. Parse args (`parseArgs`, 63–91). `--tier` is required. No default.
2. `--wired` exits 3 with no tests (300–306). Combined with `--expect` is a usage error (exit 2).
3. Suite directory must exist (`suiteDir` in `check.ts`).
4. **Bijection preflight** (`inspectBijection`, `check.ts` 107–122). Exit 2, no tests, if P0 ids in `.taskmaster/docs/acceptance/at-req-016.md` are not exactly the `atTest('AT-…'` call sites in `tests/at/suites/req-016/*.test.ts`.
5. **`--expect` preflight** (`loadTierExpectation`, `expected.ts` 519–538). Exit 2 if the manifest is missing, malformed, has no declaration for this tier, or its ids are not in bijection with the P0 set. Happens **before** the stack lock.
6. **`drill`** refuses as infrastructure (exit 3, 378–382).
7. **`loop`**: empty `stackEnv`. No lock, no Docker, no reset.
8. **`integration`**: refuse if `AT_REPO_ROOT !== INSTALL_ROOT` (390–395); `readLocalConfig`; `lifetimePinProblem` (jwt_expiry vs `AT_CONFIG.accessTokenLifetimeSeconds`); `acquireStackLock`; `prepareLocalStack` (identity, wait, re-read config, identity again, **reset**, wait, migration proof); print `evidenceLine`; put five `AT_SUPABASE_*` coords into `stackEnv` via `childCoordinates`.
9. Spawn pinned vitest (`spawnSync`, 439–458):
   - `bun --no-env-file node_modules/vitest/vitest.mjs run --root tests/at --config tests/at/vitest.config.ts --reporter=json suites/req-016/`
   - env = `childEnv({ ...stackEnv, AT_TIER: tier, AT_REGISTRATION_DIR })` — allowlist only (`local-stack.ts` 65–112). No `.env.local` secrets.
10. Grade: JSONL registrations vs vitest assertions vs P0 ids (`analyzeReportedTests`, 145–209). Without `--expect`, any red/missing/unexpected/non-zero process exit is exit 1 (`runVerdict`, 234–258). With `--expect`, both `expectationDeviations` and `reportAccountingDeviations` must be empty; **a declared red that went green is a failure**.

**2. Registration: `bindSuite` → `atTest`**

`tests/at/suites/req-016/_bind.ts` 42–48:

```ts
export const { atTest, defineEvidenceCapture } = bindSuite({
  requirement: 'req-016',
  sut: 'notifications',
  sutMissingDetail: `REQ-016's notification emitter is not implemented — …`,
});
```

`bindSuite` (`registry.ts` 1005–1037) closes over that binding and returns a 3-arg `atTest(id, title, body)` plus a bound `defineEvidenceCapture(name, producer)`.

`atTest` (`registry.ts` 861–969):

- Parses the id (`AT-(\d{3}(?:\.\d+)*)\.(\d+[a-z]?)`).
- `requirementMismatch`: id `AT-016.01` must belong to bound `'req-016'`.
- Duplicate id throws at registration.
- **Body selection** (`chooseTierBody`, 768–771): named tier, else `default`, else `loop`. A per-tier map with a hole and no `default` throws at the call site (`tierBodyProblem`, 740–757). A bare function is the single-body form and covers every tier, **typed at `'loop'`**.
- Emits a JSONL row if `AT_REGISTRATION_DIR` is set.
- Registers `it(\`${atId} — ${title}\`, …, timeout)` with `expect.hasAssertions()`.

**3. What `open()` returns**

Default fixture name: `req-${parsed.requirement}/base` (929).

`openWorld` (`registry.ts` 654–691):

1. If `TIER === null` → `AtPending(id, 'tier-unset', …)`. `AT_TIER` has **no default** (`registry.ts` 138–146).
2. If harness module failed to load → `AtPending(id, 'harness-missing', …)`.
3. **`aboveLoopStandInRefusal(TIER, liveAdapterExists('req-016'), 'notifications')`** (`773–776`):
   - loop, or `_live.ts` exists → `null`.
   - otherwise → `new CapabilityPending(['fixtures.worlds', 'sut.notifications'])`.
   - This runs **before** `createHarness`. That is why every req-016 integration id is that exact red today (`liveAdapterExists('req-016')` is false; `conformance.selftest.ts` 148–150).
4. `createHarness({ requirement: 'req-016', tier, configOverrides })`.
5. `h.sut.notifications` missing → `AtPending(id, 'sut-missing', sutMissingDetail)`.
6. `w = await h.fixtures.world(fixture)`.
7. Return `{ h, w, sut }` with `sut` non-null. Types are `SutOf<'req-016','notifications'>` and `WorldOf<'req-016'>` from `suite-adapters.ts`.

Teardown: worlds first, then harnesses, last-opened-first, all attempted (`drainTeardowns` 576–591). A teardown failure after a green body fails the test (`runTrackedTest` 605–637). A body that never `open()`s and never `capture()`s throws `INVALID — never opened a fixture world…` (`testUseProblem` 525–527).

**4. `createHarness` (`index.ts` 190–250)**

Always builds `FixtureWorldStore`, `createConfigRegistry`, and `static = refusing<StaticScan>('H3 static provider scan')` — **at every tier**.

- **loop**: `ControlledClock` + `createEmailProviderSim()`. Loads `tests/at/suites/<req>/_fixture.ts`. Checks `module.requirement === requirement`. Calls `createFixtureAdapter({ clock, worlds, config, vendors: { email: provider.port } })`. Wires `createSentinels` / `createFaults` from optional adapter seams. Hands `vendors: { email: provider.sim }` to the test.
- **integration**: loads `_live.ts` via `createLiveAdapter({ stack: stackFromEnv() })`. Clock is `RealClock` (`now()` only). `vendors` is `refusing('vendors.email')`. If `_live.ts` is absent, throws `no live adapter for req-016; the registry refuses this tier before construction` (235–238) — but `openWorld` already refused, so this path is a backstop.

`refusing()` (`index.ts` 169–180): a Proxy whose every get throws `CapabilityPending(names)`.

**5. `ctx.capture` / `defineEvidenceCapture`**

`defineEvidenceCapture` (`registry.ts` 522–523) builds an `EvidenceCaptureImpl`. First `ctx.capture(evidence)` runs the producer once, requires it to have called `open()` (`captureProducerProblem` 421–423), then `freezeEvidence` (386–418): primitives, arrays, plain objects only — Map/Set/Date/class instances throw. `CapabilityPending` and `AtPending` pass through unwrapped (`captureFailure` 452–459) so `--expect` can still match them. Req-016 uses this in `d-taxonomy-evidence.test.ts` 80–113 (`taxonomyEvidence`), which reads `h.vendors.email` — a loop-only seam.

**6. Two tiers — what actually changes**

| | `AT_TIER=loop` | `AT_TIER=integration` |
|---|---|---|
| Adapter | `_fixture.ts` `createFixtureAdapter` | `_live.ts` `createLiveAdapter({ stack })` |
| Clock type | `Clock` (`freezeAt`, `advance`) | `RealClock` (`now()` only). `h.clock.advance` is a **compile** error in an `integration:` body |
| Vendors | `EmailProviderSim` (arm + traces) | **Absent from `TierHarness`**. Runtime: refusing proxy `vendors.email` |
| Fixture world | In-memory `FixtureWorldStore` clone | Live adapter’s world (req-001: namespaced email, teardown no-op; DB already reset) |
| Static scan | Always the refusing proxy `'H3 static provider scan'` | Same |
| Stack | None | One local stack, reset every run |
| Stand-in | Allowed (req-016 loop is a conforming stand-in) | Refused unless `_live.ts` exists. Harness no longer classifies stand-in vs real |
| Timeout | vitest 30s unless `timeoutMs.loop` | Same, unless `timeoutMs.integration` (req-001 uses 240_000 for AT-001.12/13) |

**7. Capabilities — declare, detect, turn green**

`PendingPhase` (`pending.ts` 1): `'harness-missing' | 'sut-missing' | 'tier-unset'`.

Two error classes, and `--expect` rebuilds their first line (`expected.ts` `declaredDetail` 286–290):

- `capability-pending` → exact line `CapabilityPending: CAPABILITY PENDING — <names joined by ", ">` in declared order.
- `pending` → anchored prefix `AtPending: <id> PENDING [<phase>] — ` (tail is free).

**Where a capability is “declared present” today (no ledger):**

| Name | How it becomes pending | How it becomes green |
|---|---|---|
| `fixtures.worlds`, `sut.notifications` | `aboveLoopStandInRefusal` when `_live.ts` is missing | Add `tests/at/suites/req-016/_live.ts` so `liveAdapterExists` is true, **and** the live adapter’s `fixtures.world` + `sut.notifications` actually work |
| `H3 static provider scan` | `refusing<StaticScan>(…)` in `createHarness` (`index.ts` 197, 215). Any read of `h.static.*` | Replace that proxy with a real `StaticScan.providerClientImporters()` implementation. Loop is already red on this; it is not an integration-only gap |
| `sut.<key>.<method>` | Explicit `throw new CapabilityPending(['sut.accounts.registerWithGithub'])` in `_live.ts` or an integration body | Implement the method (or stop throwing) **and** move the id from `red` to `green` in the manifest in the same change |
| Suite-authored names (`ui.authenticated-surface-rendering`, `gateway.virtual-key-revocation`, …) | Thrown from the body itself (req-001 `_integration.ts` 1754, 2470, …) | Same: implement, then update the manifest |

A `capability-pending` id turns green only when (a) nothing throws that `CapabilityPending`, (b) the body actually asserts and passes, and (c) `tests/at/expected/<req>.json` moves the id to `green` in the **same** change. `--expect` treats a surprise green as a deviation (`expected.ts` 327–332).

**8. Suite adapter registration**

`suite-adapters.ts` 107–111 — the whole list:

```ts
export type AdapterModules = CheckedAdapterModules<{
  'req-001': typeof import('../suites/req-001/_fixture.ts');
  'req-016': typeof import('../suites/req-016/_fixture.ts');
}>;
```

Adding a suite is that one line plus `export const requirement = 'req-0NN' as const` in `_fixture.ts`. Types `SutOf<R,K>` / `WorldOf<R>` are `Awaited<ReturnType<createFixtureAdapter>>['sut'][K]` and the world `fixtures.world()` returns.

**Exact loop adapter shape** (`index.ts` `FixtureAdapter` 17–30, `suite-adapters.ts` `AdapterShape` 66–79):

```ts
{
  sut: Record<string, unknown>;           // e.g. { notifications: NotificationsSut }
  fixtures: { world(name: string): Promise<WorldLike> };
  faults?: AdapterFaultSeam;              // optional; absence → faults.at refuses "Exposed points: (none)"
  sentinels?: AdapterSentinelSeam;        // optional; absence → scan refuses "Exposed scopes: (none)"
  teardown(): Promise<void>;
}
```

Loop factory signature (`index.ts` 35–45):

```ts
createFixtureAdapter(opts: {
  clock: ControlledClock;
  worlds: FixtureWorldStore;
  config: ConfigRegistry;
  vendors: { email: EmailProviderPort };
}): Promise<FixtureAdapter> | FixtureAdapter
```

**Exact live adapter shape** (`index.ts` `LiveAdapterModule` 115–121):

```ts
export const requirement = 'req-016' as const;
export async function createLiveAdapter(opts: { stack: Stack }): Promise<FixtureAdapter>
```

`Stack` (`live-stack.ts` 7–13): `{ apiUrl, dbUrl, anonKey, serviceRoleKey, mailUrl }`, filled from `AT_SUPABASE_*` by `stackFromEnv()`.

Req-001’s live factory (`_live.ts` 211–215, 1060–1066) returns `{ sut: { accounts }, fixtures: { world }, teardown }` and **does not** export faults/sentinels. Unbacked methods are written out as throws (1027–1032). World is an email namespace (`_live.ts` 1052–1058), not in-memory product state.

**9. Faults, sentinels, clock, vendors**

**Arming a fault.** `h.faults.at(point, 'crash')` (`faults.ts` 61–95):

1. No seam → `faultPointProblem(point, [])` → `"the product exposes no fault point named … Exposed points: (none)"`.
2. Point not in `seam.points()` → same guard (`guards.ts` 74–80).
3. Point already live → `faultAlreadyArmedProblem` (`guards.ts` 93–104).
4. `seam.arm(point, kind)` must return `{ triggerCount(), disarm() }`. Count is incremented **only when execution reaches the point**, never on arm. Req-016 stand-in: `reachFaultPoint` (`_fixture.ts` 216–221) increments then throws `induced fault: crash at …`.
5. `clear()` disarms, then `faultFiredProblem` (`guards.ts` 111–118): triggerCount < 1 → `"the fault at … never fired — execution did not reach the armed point"`.

To expose `notifications.between_transition_and_event_write` so the harness accepts it, the **adapter** (loop `_fixture.ts` already does; a live adapter must too) must:

```ts
faults: {
  points: () => ['notifications.between_transition_and_event_write'],
  arm(point, kind): ArmedFault,   // req-016 stand-in accepts only kind === 'crash'
  processEpoch: () => string,     // must change across processRestart
  processRestart: () => void,
}
```

and the product path must actually **reach** that point (stand-in: commit transition, then `reachFaultPoint`, then write event — `_fixture.ts` 267–284). A live product must do the same in real code, or `clear()` fails `faultFiredProblem`.

**Vendors (`vendors.ts` 64–123).** One queue, call order of `rejectNext` / `acceptButLoseAck`. `providerForceCountProblem` refuses non-integers and counts < 1.

- `rejectNext(n)` / `acceptButLoseAck(n)` — test-facing `sim`.
- `attempts()` / `accepted()` — fresh copies of the out-of-band trace.
- SUT-facing `port.deliver(send)` returns `'accepted' | 'rejected' | 'no_ack'`. It never sees `'ack_lost'`. Idempotency key is `JSON.stringify([eventId, recipientId, channel])`. A replay of an already-accepted identity returns `'accepted'`, records an attempt, does **not** re-add to `accepted()`, consumes no forced outcome.

At integration, `h.vendors` is not on the type. Mail is the stack’s catcher via `live-stack.ts` (`mailIdentification`, `verifyLinksFor`, …), the way req-001’s live adapter does.

**10. Tooling**

| Script | Command | What it does |
|---|---|---|
| `at:check` | `bun tests/at/harness/check.ts` | P0 regex `AT-<req>.<n>**?(P0)` in `.taskmaster/docs/acceptance/at-req-0NN.md` vs `atTest(\s*['"\`](AT-…)['"\`]` in `suites/req-0NN/*.test.ts` only. `_integration.ts` does **not** count. Exit 0 bijection, 1 mismatch, 2 bad args/IO. |
| `at:selftest` | `vitest run --root tests/at … harness/` | Harness `*.selftest.ts` only (vitest include also has `suites/**/*.test.ts`, but the path filter is `harness/`). |
| `at:verify` | `bun tests/at/harness/runner.ts` | Above. Exit 0 match; 1 reds/deviations; 2 usage/bijection/declaration; 3 infra/`--wired`/drill; 4 missing/unreadable vitest report. |

`--expect` compares `tests/at/expected/<req>.json`:

- Manifest `requirement` field must equal the numeric id (`"016"`).
- Declared ids ↔ P0 ids (and green ∩ red empty).
- Per id: green stays green; red stays red **with the rebuilt first line**; missing/extra fail.
- Vitest `numFailedTests === |red|`, `numPassedTests === |green|`, total = sum, pending=0, todo=0, `success === (red===0)`.
- A failed file with zero failed tests, or a non-empty file-level `message`, is a deviation.

**11. Integration-body rules after the per-id-gate shrink (merged 2026-09-03)**

Commit `aa9a2a4` — “AI4DEV-87: the acceptance harness shrinks to the per-id gate over the drive (#64)”, AuthorDate Thu Sep 3 08:11:56 2026 +0300.

What changed for how an integration body is written (`loop/items/AI4DEV-87/artifacts/design.md`, `pr/body.md`):

- **Path is short.** Before: `atTest` → `open()` → `createHarness` → capability ledger → attestation brand → method proxy → `_live.ts`. After: `atTest` → `open()` → `createHarness` → `_live.ts` method. No ledger, no nonce, no `AT_SLOT_ATTESTATION`, no `backedSutMethods`.
- **Liveness is file presence of `_live.ts`**, decided before construction. A `_live.ts` that returned the loop stand-in would run above loop; the harness no longer classifies that.
- **Unbacked methods are explicit throws**, not a proxy over an enumeration. Req-001 `_live.ts` 1027–1032 writes each one as `() => { throw new CapabilityPending(['sut.accounts.<method>']); }`.
- **`h.vendors` is gone at integration** (type and runtime). Email is Mailpit through `live-stack.ts`.
- **`h.clock` cannot be commanded.** Real-time criteria wait (`timeoutMs: { integration: INTEGRATION_TIMEOUT_MS }`) instead of `advance()`.
- **Bodies stay assertions over `sut` / `w`.** The item text said “thin `atTest` over the drive helpers”; the design kept `AccountsSut` methods that themselves call `authPost` / `functionPost` / SQL, so bodies do not parse JSON twenty times.
- **`createLiveAdapter({ stack })` only.** No attested vendors, no clock, no fixture store.

Req-016 still uses the **single-body form** in every `*.test.ts` (no `integration:` map). Those bodies are typed at loop and call `h.static`, `h.vendors.email`, `h.clock.freezeAt`/`advance`, `h.faults.at`/`processRestart`. After `_live.ts` exists they would **compile** (single-body is loop-typed) and then **fail at runtime** on the refusing static/vendors seams and on `RealClock` missing `advance`. Turning integration green therefore requires **rewriting bodies the way req-001 did**, not only shipping product code.

**12. Req-001 as the green integration model**

Binding (`_bind.ts` 34–40): `bindSuite({ requirement: 'req-001', sut: 'accounts' })`.

Loop adapter (`_fixture.ts`): `export const requirement = 'req-001' as const`; `createFixtureAdapter({ clock, worlds })` drives **shipped** modules over Map storage. Clock is actually read for session TTL.

Live adapter (`_live.ts`): `createLiveAdapter({ stack })`. Every operation is Auth HTTP, deployed edge `functionPost`, or operator SQL. World: `email(local) => \`${local}+${namespace}@example.test\``. Registration returns `sessionId: ''` (confirmations on). Session-taking ops refuse a handle with no tokens and name the live public order.

Registration in `*.test.ts` (example `a-signup-and-signin.test.ts` 68–180):

```ts
atTest('AT-001.01', '…', { surface: 'ui' }, {
  default: async ({ open }) => { /* loop: Map fixture, may use registration session */ },
  integration: at00101,  // from _integration.ts
});
```

Integration body (`_integration.ts` 234+):

- Typed `Ctx = HarnessAtContext<'req-001', 'accounts', 'integration'>`.
- `registerConfirmAndSignIn`: register → `emailedVerificationLink` (Mailpit) → `useVerificationLink` → `signInWithEmailPassword`. Asserts as it goes.
- Then drives deployed `complete-signup` / writes / catalog facts through `sut`.
- Genuinely unbacked criteria throw `CapabilityPending` with the **exact** names the manifest lists.
- Real-time ids pass `timeoutMs: { integration: 240_000 }` at the `atTest` call site (`b-verification-and-sessions.test.ts` 366–371).

That is the style a new suite must copy: **one id, two procedures, live public order, Mailpit not the email sim, no clock control, explicit named refusals, manifest updated in the same change.**

**What a real req-016 system under test must supply to turn integration green**

1. `tests/at/suites/req-016/_live.ts` with `requirement = 'req-016'` and `createLiveAdapter({ stack })`.
2. `sut.notifications` implementing `NotificationsSut` (`_contract.ts` 150–171): `senders`, `taxonomy`, `documentedDefaults`, `runtimeRegistrationSurface`, `emit`, `events`, `deliveries`, `opsItems`, `drainDeliveries`.
3. A live `World` (`_contract.ts` 181–195): `actors`, `fire`, `transitionCommitted`, `reassignRole`, `burstThreadComments`, `teardown`.
4. Product behavior the oracles actually check: sole writer, static taxonomy, atomic outbox write, mark `sent` only on provider acceptance, recipients frozen at create time, restart-safe delivery.
5. If AT-016.07/09 stay at integration: a live `AdapterFaultSeam` exposing `notifications.between_transition_and_event_write` that execution really hits, plus `processRestart` that changes `processEpoch`.
6. If AT-016.01’s sentinel arm stays: a live `AdapterSentinelSeam` with scope `notifications.delivery_bodies`.
7. Per-tier bodies: loop may keep the stand-in + vendor sim + controlled clock; integration must prove email on the catcher, time by waiting, and must not read `h.vendors` / `h.clock.advance`.
8. A real `h.static.providerClientImporters()` (or leave AT-016.01 declared red). Today the proxy is unconditional.
9. Move ids from `red` to `green` in `tests/at/expected/req-016.json` when they actually pass. `--expect` will fail if you only implement and leave the declaration.

---

### Files Read

**Harness (full or near-full):** `index.ts`, `contracts.ts`, `suite-adapters.ts`, `registry.ts`, `pending.ts`, `guards.ts`, `faults.ts`, `sentinels.ts`, `vendors.ts`, `clock.ts`, `fixtures.ts`, `config.ts`, `atconfig.ts`, `check.ts`, `expected.ts`, `runner.ts`, `local-stack.ts` (header, `childEnv`, `prepareLocalStack`, `childCoordinates`, `evidenceLine`, `lifetimePinProblem`), `live-stack.ts` (header through HTTP helpers), `stack-lock.ts` (header), `live-refusal.selftest.ts`, `conformance.selftest.ts` (through stand-in refusal), `vitest.config.ts`, `tests/at/README.md`, `tests/at/expected/README.md`, `tests/at/expected/req-016.json`, `tests/at/expected/req-001.json` (partial).

**Suites:** req-016 `_bind.ts`, `_fixture.ts`, `_contract.ts` (through `World`), `a-emitter-and-taxonomy.test.ts`, `b-delivery-defaults.test.ts` (partial), `c-reliability-guard.test.ts`, `d-taxonomy-evidence.test.ts` (capture). Req-001 `_bind.ts`, `_pending.ts`, `_fixture.ts` (header + factory start), `_live.ts` (header, factory, unbacked throws, world), `_integration.ts` (header, `registerConfirmAndSignIn`, `at00101`, one CapabilityPending), `a-signup-and-signin.test.ts` (header + AT-001.01 map), `b-verification-and-sessions.test.ts` (AT-001.12 map).

**History / design:** `loop/items/AI4DEV-87/brief.md`, `artifacts/design.md`, `artifacts/pr/body.md`; `loop/parked/v1/README.md` (ledger section); `loop/parked/v1/tests/at/harness/capabilities.ts` (header); git `aa9a2a4`; `loop/items/AI4DEV-89/brief.md` (harness note).

**Skimmed / not fully traced:** `local-stack.ts` identity/reset internals after the exported API; `live-stack.ts` Mailpit poll implementation; all remaining `*.selftest.ts`; req-001 `_fixture.ts` method bodies; remaining req-001 test files; `taxonomy.ts` row table; shipped-module selftests.

---

### Boundaries

- **Suite → harness:** two strings (`requirement`, `sut` key). No shape type arguments.
- **Harness → loop product:** `_fixture.ts` `createFixtureAdapter`. Types flow `suite-adapters.ts` → `bindSuite`. Runtime load is a path built from the requirement string, then re-checked against `export const requirement`.
- **Harness → live product:** `_live.ts` `createLiveAdapter({ stack })`. File presence is the above-loop gate. Child only sees allowlisted env + proven `AT_SUPABASE_*`.
- **Test body → product:** `sut` and `w` from `open()`. Loop-only control: `h.clock`, `h.vendors`. Shared control: `h.faults`, `h.sentinels`, `h.config`, `h.static` (currently always pending).
- **Fault/sentinel/vendor judgement → `guards.ts`:** implementations must route through those predicates, not re-derive them.
- **Acceptance file ↔ suite ↔ manifest:** three bijections (`at:check`, declaration vs P0, report vs declaration). `_integration.ts` is invisible to the first.
- **`--expect` vs reality:** the manifest is the contract. Improving the product without editing the JSON is a failed run.
- **What the harness will not do:** default `AT_TIER`; run `--wired`; run `drill`; load the loop fixture above loop; classify a live adapter as stand-in; let `open()` succeed without a world/capture; swallow teardown failures; match a red by substring.

---

### Non-Obvious Things

1. **`CapabilityPending` was kept on purpose.** The original item text said to remove it. Merge `aa9a2a4` kept the class and the exact message because `expected.ts` rebuilds `CapabilityPending: CAPABILITY PENDING — …`. Parking the ledger did not park the red kind.
2. **Loop can no longer tell stand-in from real.** That cost is stated in the parked README and the PR body. Req-016 loop greens are against a conforming stand-in derived from `taxonomy.ts`, not the product.
3. **`h.static` is refusing at every tier**, including loop. That is why AT-016.01 is the one loop red (`H3 static provider scan`). Adding `_live.ts` does not fix it.
4. **Single-body form is typed at the richest tier (loop).** An `integration:` body loses `clock.advance` and `vendors` at compile time. A bare function does not. Req-016 is all bare functions, so the type system will not force the rewrite.
5. **`at:check` greps only `*.test.ts`.** Per-tier implementation files do not register ids.
6. **A red that turns green fails `--expect`.** The expected README states this as the whole point of the file.
7. **Vendor `ack_lost` is test-only.** The port returns `no_ack`. Marking sent on a lost ack would be invisible to the SUT and is the defect AT-016.11 hunts.
8. **Fault trigger count is owned by the adapter at the point**, not by `createFaults`. A handle that counted “armed” as “fired” would green every atomicity test.
9. **Live world teardown is a no-op in req-001** because `prepareLocalStack` already reset the database. Isolation is namespaced emails, not per-test DB wipe.
10. **`createHarness` integration path still constructs `FixtureWorldStore` and then ignores it** for the live adapter (index.ts 195 vs 241). The live factory does not receive `worlds` or `clock`.
11. **Req-001 live adapter omits faults/sentinels.** That is valid; those seams then refuse by name. Req-016’s reliability ids need them if those procedures stay at integration.
12. **`--expect` cannot see a hook failure in a file that also has a failing test** (`expected.ts` 371–376). Stated residual gap.

---

### Open Questions

1. **Whether AT-016.01’s static scan is in scope for this product item or still a harness slice.** `createHarness` hard-codes the refusing proxy; a product `_live.ts` cannot replace `h.static` today.
2. **How a live product exposes `notifications.between_transition_and_event_write`.** The stand-in injects inside `emitKnown`. A real outbox write would need an equivalent in-process hook (or a different integration procedure that does not arm `h.faults`).
3. **Whether integration AT-016.08 waits real time** (like AT-001.12) or stays loop-only for the anti-spam window. No `timeoutMs.integration` exists in the req-016 suite yet.
4. **Whether a live adapter may keep using the email sim.** `TierHarness` removes `vendors` at integration by design; Mailpit is the intended witness. A product that still needs `rejectNext` / `acceptButLoseAck` has no supported integration seam.
5. **I did not run `at:verify`.** Integration reds for req-016 are inferred from `liveAdapterExists`, `aboveLoopStandInRefusal`, `live-refusal.selftest.ts`, and `req-016.json`, not from a fresh run in this session.
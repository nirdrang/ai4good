The test seam is one `NotificationsSut` plus one `World`. The runner picks the adapter by `AT_TIER`. The same twelve ids run at both tiers; three of them swap procedure.

### Components Found

- **`NotificationsSut`** — `tests/at/suites/req-016/_contract.ts` (lines 150–171). The suite-facing system under test: `senders`, `taxonomy`, `documentedDefaults`, `runtimeRegistrationSurface`, `emit`, `events`, `deliveries`, `opsItems`, `drainDeliveries`. Both adapters wrap `createNotifications` from `supabase/functions/_shared/notifications.ts` and expose this shape.

- **`World`** — `_contract.ts` (lines 181–201). Intersection of `WorldSeam` with REQ-016 extras: `actors`, `addresses`, `fire`, `transitionCommitted`, `reassignRole`, `burstThreadComments`. Types are aliases, not interfaces, so `declare module` cannot merge optional members.

- **`NotificationEvent` / `Delivery` / `EmitResult` / `OpsItem` / `RegisteredRow` / `DocumentedDefault` / `SenderProbe`** — `_contract.ts`. The row shapes assertions read. Recipients on an event are “resolved at event CREATION (AT-016.10), never at send time”. `Delivery.emittedBy` is the sole-writer stamp; `deliveredByProcess` is the process epoch, `null` until a send.

- **`bindSuite` / `atTest` / `AtContext` / `OpenWorld`** — `tests/at/harness/registry.ts` and `tests/at/suites/req-016/_bind.ts`. The suite’s only harness contact. `_bind.ts` names two strings (`requirement: 'req-016'`, `sut: 'notifications'`). Seam types are derived from `suite-adapters.ts`, never restated.

- **`AdapterModules` / `SutOf` / `WorldOf`** — `tests/at/harness/suite-adapters.ts`. Compile-time registry. REQ-016’s types come from `typeof import('.../req-016/_fixture.ts')` only. `_live.ts` is not in this map.

- **`createFixtureAdapter`** — `tests/at/suites/req-016/_fixture.ts`. Loop binding: six ports to memory (arrays, harness email sim, current world’s actors, controlled clock, process epoch).

- **`createLiveAdapter`** — `tests/at/suites/req-016/_live.ts`. Integration binding: same six ports to the one local stack (SQL outbox, SMTP to Mailpit, SQL directory, wall clock).

- **`createHarness` / `loadAdapter` / `loadLiveAdapterModule` / `liveAdapterExists` / `refusing`** — `tests/at/harness/index.ts`. Factory that picks loop vs live. Loop loads `_fixture.ts`. Above loop loads `_live.ts` or never builds.

- **`TierHarness<T>`** — `tests/at/harness/contracts.ts` (lines 220–227). At `'loop'` this is full `AtHarness`. Above loop it is `Omit<..., 'clock' | 'vendors'> & { clock: RealClock }` — no `freezeAt`/`advance`, no `vendors` on the type.

- **`CapabilityPending` / `AtPending`** — `tests/at/harness/pending.ts`. The only two red shapes `--expect` can declare. Capability pending is `CAPABILITY PENDING — <names joined by ", ">`. Phase pending is `<id> PENDING [<phase>] — <detail>`.

- **`chooseTierBody` / `tierBodyProblem` / `aboveLoopStandInRefusal`** — `registry.ts` (lines 740–776). Procedure selection and the stand-in refusal.

- **`assertEmitterIsSoleWriter` / `at01601` / `at01608` / `at01611`** — `tests/at/suites/req-016/_integration.ts`. Shared sole-writer arms plus the three integration procedures.

- **`countPairs` / `expectedPairs` / `pairProblems`** — `tests/at/suites/req-016/_oracles.ts`. Multiset comparison. Counts, never de-dupes, so a duplicate pair is a named problem.

- **`messagesAddressedTo`** — `tests/at/suites/req-016/_mail-witness.ts`. Mailpit reader, scoped by recipient address. Counts physical messages; never collapses duplicates.

- **`bindProviderFaults` / `withIdempotentReplay` / `recordedProviderAttempts`** — `tests/at/suites/req-016/_provider-faults.ts`. Live provider decorator: forced `reject`/`lose_ack`, attempt log, Mailpit replay by idempotency key.

- **`ExpectedManifest` / `loadTierExpectation` / `expectationDeviations` / `reportAccountingDeviations`** — `tests/at/harness/expected.ts`. `--expect` contract.

- **`tests/at/expected/req-016.json`**. Current declaration: all twelve P0 ids green at `loop` and at `integration`; both `red` objects empty.

- **`sqlClient` / `stackFromEnv` / `mailIdentification`** — `tests/at/harness/live-stack.ts`. Stack coordinates, Bun SQL, Mailpit identity probe.

- **`prepareLocalStack`** — `tests/at/harness/local-stack.ts`. Integration preflight: lock, identity, `supabase db reset`, migration-set proof, then child env `AT_SUPABASE_*`.

### Flow

1. **Command.** `bun run at:verify req-016 --tier <loop|integration> [--expect]` in `tests/at/harness/runner.ts`. `--tier` is required. No default. `parseArgs` (lines 63–91).

2. **Preflight.** `inspectBijection` (`check.ts` 107–121) reads P0 ids from `.taskmaster/docs/acceptance/at-req-016.md` and `atTest('AT-…'` call sites under `tests/at/suites/req-016/*.test.ts`. A mismatch exits 2, no tests.

3. **`--expect` preflight (if flagged).** `loadTierExpectation('016', tier, acceptanceIds)` (`expected.ts` 519–537) reads `tests/at/expected/req-016.json`, checks JSON, known tier keys, AT-id grammar, and bijection with the P0 set. Refusal exits 2, no tests, no stack lock.

4. **Tier setup.**
   - `loop`: no database, no lock (`runner.ts` 357–358).
   - `integration`: refuse if `AT_REPO_ROOT` is not the checkout; acquire stack lock; `prepareLocalStack` resets the one database and proves migrations (`runner.ts` 385–429).
   - `drill`: infrastructure refusal, no tests (`runner.ts` 378–382).

5. **Spawn vitest.** Child env gets `AT_TIER` and, at integration, `AT_SUPABASE_*` (`runner.ts` 439–457). Vitest loads `suites/req-016/*.test.ts`. `AT_TIER` is read once at module load in `registry.ts` line 138 into `TIER` (line 146). Unset or misspelled `TIER` is `null`.

6. **Registration.** Each `atTest(id, title, body)` in the suite files calls `bindSuite`’s bound `atTest`, which merges `{ requirement: 'req-016', sut: 'notifications' }` (`_bind.ts` 42–48). `atTest` in `registry.ts` (861–968):
   - Parses the id (`AT-016.01` → requirement `"016"`).
   - `requirementMismatch` requires `req-016` == bound requirement.
   - If `body` is a function, that function is the procedure at every tier.
   - If `body` is a map, `tierBodyProblem` refuses a hole (an id with no body at a tier would report `missing`, which no declaration can describe). `chooseTierBody` (768–771) picks `bodies[TIER] ?? bodies.default ?? bodies.loop`.
   - Registers exactly one vitest `it()` whose title is `` `${atId} — ${title}` ``.

7. **Which procedure runs (REQ-016).**
   - **Single body (same procedure both tiers):** AT-016.02, .03, .04, .05, .06, .07, .09, .10, .12.
   - **Per-tier map (same criterion, different procedure):**
     - AT-016.01 — `default` reads `h.vendors.email.attempts()`; `integration: at01601` reads Mailpit (`a-emitter-and-taxonomy.test.ts` 13–27).
     - AT-016.08 — `default` commands `h.clock.freezeAt`/`advance`; `integration: at01608` waits real time (`b-delivery-defaults.test.ts` 100–176).
     - AT-016.11 — `default` arms `h.vendors.email.rejectNext` / `acceptButLoseAck`; `integration: at01611` arms `h.faults.at('notifications.provider_send', …)` (`c-reliability-guard.test.ts` 158–294).
   - Shared AT-016.01 arms (`providerClientImporters`, `strayNotificationWriters`, `sut.senders()`, per-domain sentinels) live in `assertEmitterIsSoleWriter` (`_integration.ts` 52–107) and run at both tiers.
   - AT-016.03–.06 and .12 share one `defineEvidenceCapture` producer (`d-taxonomy-evidence.test.ts` 82–126). That producer is a single body that branches on `TIER !== 'loop'` only for the provider-side trace (simulator vs catcher). `describe.sequential` plus `evidenceBuilds === 1` force one capture.

8. **`open()`.** Default fixture name is `req-016/base` (`registry.ts` 929). Each `open()`:
   - Throws `AtPending(id, 'tier-unset', …)` if `TIER` is null.
   - Throws `AtPending(id, 'harness-missing', …)` if `createHarness` did not resolve.
   - **Stand-in refusal before construction** (`registry.ts` 670–671): `aboveLoopStandInRefusal(TIER, liveAdapterExists('req-016'), 'notifications')`. File presence of `_live.ts` is the boolean. If the file is absent above loop, throw `CapabilityPending(['fixtures.worlds', 'sut.notifications'])` — red by capability name, not by assertion failure. REQ-016 has `_live.ts`, so this path does not fire.
   - Calls `createHarness({ requirement: 'req-016', tier: TIER, configOverrides })`.
   - Asserts `h.tier === TIER`.
   - Reads `h.sut.notifications`; missing throws `AtPending(id, 'sut-missing', …)` with the suite’s `sutMissingDetail`.
   - `h.fixtures.world(fixture)` then returns `{ h, w, sut }`.
   - Casts to `OpenWorld<'req-016','notifications'>` (the one surviving assertion, `registry.ts` 941–958). Types always come from `_fixture.ts`, even at integration.

9. **Loop factory** (`index.ts` 227–231). `ControlledClock`, `createEmailProviderSim()`, `loadAdapter` → `_fixture.ts` `createFixtureAdapter`. `h.vendors.email` is the sim. `h.static` is `refusing('H3 static provider scan')` at **both** tiers (line 197, 215). REQ-016 bodies never call `h.static`; they import `_source-scan.ts` instead. The comment at line 214 (“AT-016.01 stays red…”) is stale against current `req-016.json`.

10. **Integration factory** (`index.ts` 234–249). `loadLiveAdapterModule` imports `_live.ts`, checks `export const requirement = 'req-016'`. `createLiveAdapter({ stack: stackFromEnv() })`. Clock is `RealClock` (`now()` only). `h.vendors` is `refusing('vendors.email')` — a body that reaches it throws `CapabilityPending(['vendors.email'])`. Live factory does **not** receive `config`; `h.config` still exists on the harness.

11. **Loop world and SUT** (`_fixture.ts`).
    - `fixtures.world(name)` clones the harness seed (`actor-ngo`, …), builds addresses `${actor}@${slug}.example.test`, sets `currentWorld`.
    - `w.fire(event)` → `core.emit` with `producerPayload`.
    - `OutboxPort.append`: commit transition in a `Map`, then crash switch, then push event/deliveries/ops. Crash restores the previous transition value and throws. That is the loop “one transaction”.
    - Directory resolves from `currentWorld.actors` / `addresses` at emit time.
    - Provider is `vendors.email.deliver`.
    - Clock is `clock.now()` (controlled). Process epoch is `delivery-process-N`; `processRestart` increments it. Durable arrays survive the restart.
    - `events` / `deliveries` / `pending` are the whole in-memory store. Isolation is structural: each `open()` builds a new harness, so a new empty `MutableState`.

12. **Live world and SUT** (`_live.ts`).
    - `mailIdentification(stack)` probes Mailpit `/api/v1/info` and refuses if it is not Mailpit (lines 250, and `live-stack.ts` 174–219).
    - One Bun SQL client per process (`acquireSql` / `releaseSql`, lines 134–149) because twenty-two adapters would otherwise exhaust slots.
    - `world(name)` provisions four confirmed auth users, an organisation, a project; namespaces emails as `${role}+${namespace}@example.test`; `scopeId` is `req-016/${namespace}`.
    - Guard pins: `req-016/guard?cap=&window=&coalesce=` parsed by `guardConfigFromWorldName` (173–194). A name with no query has no guard; `burstThreadComments` then throws.
    - `w.fire` → same `core.emit`. `OutboxPort.append` calls `public.fixture_commit_transition_and_emit(scopeId, write, armed)` in one SQL call (304–321). Crash is `p_induce_fault`; reach is counted by sequence `public.notification_fault_triggers` vs refusals whose `detail` is `induced-fault:notifications.between_transition_and_event_write`. `triggerCount()` throws if those two disagree.
    - Directory: NGO from `org_memberships`, volunteer from `projects.assigned_volunteer_id`, admin and ex-volunteer from the world record; emails from `auth.users`.
    - Provider: `createSmtpProvider` to Mailpit host + `smtp_port` from `supabase/config.toml` `[local_smtp]`, wrapped by `withIdempotentReplay` then `bindProviderFaults`.
    - Clock: `Date.now()`. Process epoch: UUID string; restart replaces it.

13. **How a live world scopes its reads** (`_live.ts` 19–24, 257, 324–432).
    - `scopedActors()` = unique `knownActorIds` across **this adapter’s** opened worlds (includes reassigned successors, line 566).
    - `pending`, `deliveries`: `recipient_id = any(scopedActors)`.
    - `events`: `id in (select event_id from notification_deliveries where recipient_id = any(scopedActors))`. An event with no delivery is invisible.
    - `opsItems`: same, via `linked_event_id`.
    - Mail: `messagesAddressedTo(Object.values(w.addresses))` searches Mailpit `to:"<address>"` per world address (`_mail-witness.ts` 85–117).
    - World `teardown` is a no-op (236–238). Rows stay in the shared database. The next `open()` is a new adapter with new UUIDs, so it does not see the previous world’s rows. AT-016.09’s twenty-two worlds depend on this.

14. **Drain / provider / sent.** `sut.drainDeliveries({ passes? })` → `core.drain`. Default is to quiescence; `{ passes: 1 }` is what makes AT-016.11’s unconfirmed state observable. Loop `applyPassResults` stamps `deliveredByProcess` only on first accept (`_fixture.ts` 297–317). Live `applyPassResults` calls `public.apply_delivery_results(results, epoch)`.

15. **After vitest.** Runner parses the JSON report, matches titles to runtime registrations (`analyzeReportedTests`, `runner.ts` 145–209). Without `--expect`, any red/missing/extra or non-zero process exit fails (`runVerdict`). With `--expect`, `expectationDeviations` plus `reportAccountingDeviations` must be empty. A declared red that is green is a failure. A declared red must match the rebuilt first line exactly (`declaredDetail`, `expected.ts` 286–296).

### Files Read

- `tests/at/suites/req-016/_contract.ts`
- `tests/at/suites/req-016/_bind.ts`
- `tests/at/suites/req-016/_fixture.ts`
- `tests/at/suites/req-016/_live.ts`
- `tests/at/suites/req-016/_integration.ts`
- `tests/at/suites/req-016/_oracles.ts`
- `tests/at/suites/req-016/_mail-witness.ts`
- `tests/at/suites/req-016/_provider-faults.ts`
- `tests/at/suites/req-016/_source-scan.ts`
- `tests/at/suites/req-016/_fault-switch.ts`
- `tests/at/suites/req-016/_fixture-producers.ts`
- `tests/at/suites/req-016/a-emitter-and-taxonomy.test.ts`
- `tests/at/suites/req-016/b-delivery-defaults.test.ts`
- `tests/at/suites/req-016/c-reliability-guard.test.ts`
- `tests/at/suites/req-016/d-taxonomy-evidence.test.ts`
- `tests/at/expected/req-016.json`
- `tests/at/expected/README.md`
- `tests/at/README.md`
- `tests/at/harness/registry.ts`
- `tests/at/harness/pending.ts`
- `tests/at/harness/expected.ts`
- `tests/at/harness/suite-adapters.ts`
- `tests/at/harness/index.ts`
- `tests/at/harness/contracts.ts`
- `tests/at/harness/runner.ts`
- `tests/at/harness/live-stack.ts`
- `tests/at/harness/local-stack.ts` (prepare/reset/evidence)
- `tests/at/harness/faults.ts`
- `tests/at/harness/sentinels.ts`
- `tests/at/harness/fixtures.ts`
- `tests/at/harness/config.ts`
- `tests/at/harness/atconfig.ts`
- `tests/at/harness/clock.ts`
- `tests/at/harness/vendors.ts`
- `tests/at/harness/check.ts`
- `tests/at/harness/conformance.selftest.ts` (stand-in refusal + requirement mismatch)
- `tests/at/vitest.config.ts`
- `.taskmaster/docs/acceptance/at-req-016.md` (P0 id list, via grep)
- `.claude/pstack-models.md` (session start)

### Boundaries

**In**

- Runner: `--tier`, optional `--expect`, requirement id. Child: `AT_TIER`, at integration `AT_SUPABASE_URL|DB_URL|ANON_KEY|SERVICE_ROLE_KEY|MAIL_URL`.
- Test body: `ctx.open(fixture?, { config? })` and `ctx.capture(evidence)`.
- Config overrides: only keys in `CONFIG_KEYS` (`config.ts` 31–35). Loop adapter reads them for the thread-comment guard. Live adapter does not receive them; AT-016.08 encodes the same numbers in the world name and asserts `h.config.get` matches.
- Faults: loop exposes `notifications.between_transition_and_event_write` (`crash` only). Live also exposes `notifications.provider_send` (`reject`, `lose_ack`).
- Product core: both adapters call `createNotifications({ taxonomy: TAXONOMY_PORT, outbox, provider, directory, clock, process })`.

**Out**

- Vitest JSON report + `AT_REGISTRATION_DIR` jsonl → per-id green/red/missing.
- `--expect` compares that report to `tests/at/expected/req-016.json`.
- Loop out-of-band send witness: `h.vendors.email.attempts()` / `accepted()` (`vendors.ts`).
- Integration out-of-band send witness: Mailpit via `_mail-witness.ts`, plus `_provider-faults.ts` attempt log for rejected/unacked sends that never arrive at the catcher.
- Source oracles (`_source-scan.ts`) read `supabase/functions`, `supabase/migrations`, `src` directly, not `h.static`.
- Live SQL: `public.fixture_commit_transition_and_emit`, `public.apply_delivery_results`, `public.notification_{events,deliveries,ops_items,fixture_transitions}`, `auth.users`, `public.accounts|organizations|org_memberships|projects`.
- Live mail: SMTP to catcher; HTTP ` /api/v1/search` and `/api/v1/message/:id/raw`. Headers: `x-notification-key`, `x-notification-event-id`, `x-notification-recipient-id`, `x-notification-channel`.

**Not on this seam**

- UI, edge-function HTTP as the product path, `h.static` (always the refusing proxy).
- Drill tier (runner refuses before spawn).
- `_live.ts` types (runtime only). `WorldOf<'req-016'>` is `NotificationFixtureWorld` even when the object is `NotificationLiveWorld`.

### Non-Obvious Things

1. **Criterion does not fork; procedure may.** `_integration.ts` lines 4–10. A map that names only `loop` is refused at registration, not skipped (`tierBodyProblem`, `registry.ts` 740–756). `missing` is undeclarable.

2. **Single-body form is typed at loop.** `registry.ts` 840–850. TypeScript will not stop a shared body from calling `h.clock.advance` or `h.vendors.email`. At integration those are absent (`TierHarness`) or a refusing proxy. Protection is opt-in via the per-tier map. AT-016.03’s capture is the exception that branches on `TIER` inside one producer.

3. **Red by capability name.** `CapabilityPending` is thrown, not `expect()` failure. `--expect` rebuilds `CapabilityPending: CAPABILITY PENDING — a, b` and compares the **whole first line**, order-sensitive (`expected.ts` 272–296). A fixture-reset `Error` cannot satisfy a capability-pending declaration. `AtPending` matches only the prefix `AtPending: <id> PENDING [<phase>] — ` because the tail is suite- or machine-specific.

4. **Stand-in refusal is file presence, not a harness member.** `liveAdapterExists` is `existsSync(.../_live.ts)` (`index.ts` 127–129). `openWorld` throws before `createHarness` (`registry.ts` 666–671). If `_live.ts` exists and is broken, that is an ordinary `Error` (undeclarable).

5. **`--expect` is a contract, not a filter.** Current `req-016.json`: `requirement: "016"` (must equal the normalized id), both tiers list AT-016.01 through AT-016.12 in `green`, `red: {}`. Empty `red` means the run must be fully green: `failed === 0`, `passed === 12`, `total === 12`, `success === true`, process exit 0, no file-level messages. A red that turns green is a failure; today there is no declared red. Arithmetic also catches untagged `it()` failures hiding behind declared reds (none declared here). Residual hole: a hook throw in a file that already has a failing test is invisible (`expected.ts` 371–376).

6. **Loop isolation ≠ live isolation.** Loop: new harness ⇒ empty arrays; actor ids are reused (`actor-ngo`). Live: one DB and one catcher for the run; isolation is actor UUID + namespaced addresses. Live `events()` only returns events that have a delivery to a scoped actor (`_live.ts` 361). A crash that committed an event row and no delivery would look like “no event” to AT-016.09 at integration. The file states this as intentional (lines 19–24). Loop `events()` would still show that row.

7. **Live world teardown does not delete rows.** Isolation is the next world’s new ids. AT-016.09’s timeout is `timeoutMs: { integration: 240_000 }` because it opens twenty-two worlds of four accounts each.

8. **Live config does not reach the adapter.** `createLiveAdapter` takes `{ stack }` only (`index.ts` 117–120, `_live.ts` 241). AT-016.08 therefore pins the guard in the **world name** and asserts that name equals `h.config.get` (`_integration.ts` 141–176). Loop reads `h.config` directly (`_fixture.ts` 375–379).

9. **Sentinel scan on live is a named refusal that no body hits.** `AdapterSentinelSeam.read` is synchronous; SQL is not. Live `read` throws `CapabilityPending(['sentinels.scan'])` (`_live.ts` 516–520). AT-016.01 plants via `h.sentinels.plant` and looks in `sut.deliveries()`, so that refusal is unused. Loop `read` returns delivery bodies (`_fixture.ts` 200–203).

10. **Provider attempt log on live is module-global.** `_provider-faults.ts` 44–85: `attempts` / `accepted` arrays; `bindProviderFaults` calls `resetLogs()`. Each `open()` constructs a new adapter. Harnesses are torn down only at end of test (`registry.ts` 605–637). A later `open()` in the same test resets the log. AT-016.11 opens once; AT-016.08 finishes assertions before the second `open()`. AT-016.09 does not read this log.

11. **Oracles count, they do not unique.** `_oracles.ts` 10–13. Set comparison would hide AT-016.07’s duplicate-delivery defect.

12. **Mail witness does not de-dupe by Message-ID or key.** `_mail-witness.ts` 11–15. Identity is Mailpit’s storage id. Two messages with one idempotency key are two rows. `withIdempotentReplay` asks that reader before SMTP (`_provider-faults.ts` 91–102); a failed skip would fail the physical count in AT-016.11.

13. **`h.static` is still a refusing proxy** named `H3 static provider scan`. The suite moved those arms to `_source-scan.ts`. `index.ts` line 214 and `expected/README.md` examples still describe AT-016.01 as red on that name. The committed manifest does not.

14. **Types always come from `_fixture.ts`.** `suite-adapters.ts` 107–111. Runtime at integration is `_live.ts`. The cast in `open()` is what makes `NotificationLiveWorld` look like `NotificationFixtureWorld`. Bodies use the `World` surface; they do not call fixture-only methods.

15. **AT-016.07’s “cannot fail at loop” comment** (`b-delivery-defaults.test.ts` 79–87). In-memory `append` writes one row per pair and `drain` mutates in place. Duplicate suppression is a regression guard for a real worker with volatile in-flight state.

16. **Shared SQL pool.** Twenty-two adapters sharing one client was a measured fix (`_live.ts` 126–132). Auth provisioning uses admin API with `email_confirm: true` so it does not hit the auth mail limit.

17. **`captureFailure` must not wrap `CapabilityPending` / `AtPending`.** `registry.ts` 435–447. Wrapping would make the first line undeclarable. Measured on an earlier integration run.

### Open Questions

- I did not read `createNotifications` / `core.drain` / `public.emit_notification` / `public.fixture_commit_transition_and_emit`. How emit, recipient resolution, and `apply_delivery_results` work inside the product is outside this angle.

- I did not execute `--expect` or either tier. The claim that all twelve ids are green is the **declaration’s** claim, not a run I observed.

- Whether a live crash that wrote `notification_events` and not `notification_deliveries` can actually occur depends on the producer definer. The live read path would hide that event. I did not confirm the SQL function’s write order.

- I did not confirm Mailpit search `to:"address"` vs leftover mail from a previous run that used the same address namespace. Namespaces include `Date.now().toString(36)` and a random suffix (`_live.ts` 585), which makes collision unlikely; I did not prove catcher reset on `db reset`.

- Concurrent live adapters’ module-global provider log is a hazard I inferred from the code. I did not find a current body that asserts on that log while a second `open()` is in flight.

- `WorldOf` vs live class: I did not compile-check whether `NotificationLiveWorld` is assignable to `NotificationFixtureWorld` without the `open()` cast. The cast is documented as necessary because `h.sut[key]` is `unknown`.
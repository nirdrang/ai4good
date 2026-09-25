### Components Found

**Suite seam (`tests/at/suites/req-016/`)**
- `_contract.ts` — REQ-016's local slice of the harness seam. Defines `NotificationsSut` (9 methods: `senders`, `taxonomy`, `documentedDefaults`, `runtimeRegistrationSurface`, `emit`, `events`, `deliveries`, `opsItems`, `drainDeliveries`), `World` (= `WorldSeam & { actors, addresses, fire, transitionCommitted, reassignRole, burstThreadComments }`), and the row shapes `SenderProbe`, `RegisteredRow`, `DocumentedDefault`, `NotificationEvent`, `Delivery`, `OpsItem`, `EmitResult`. Shared seams (`Clock`, `Faults`, `Sentinels`, `Vendors`, `Tier`…) are re-exported from `../../harness/contracts.ts`. All types are aliases, never interfaces, so a suite cannot merge a fake member in (lines 41–77 explain this at length).
- `_bind.ts` — the suite's one line of harness contact: `bindSuite({ requirement: 'req-016', sut: 'notifications', sutMissingDetail })` (lines 42–48). Exports the bound `atTest` / `defineEvidenceCapture` and re-exports `AtContext` / `OpenWorld` already specialized to `<‘req-016’, ‘notifications’>`.
- `_fixture.ts` — **loop binding**: `createFixtureAdapter()` binds the product core's six ports to memory; exports `requirement = 'req-016' as const`; declares `FAULT_POINT = 'notifications.between_transition_and_event_write'` and sentinel scope `notifications.delivery_bodies`.
- `_live.ts` — **integration binding**: `createLiveAdapter({ stack })` binds the *same six ports* to the local Supabase stack via SQL and SMTP; also exports its own `requirement` literal.
- `_integration.ts` — *not* a binding despite the name: it holds the integration-tier **test bodies** (`at01601`, `at01608`, `at01611`) plus the shared arms `assertEmitterIsSoleWriter`, `traceFromCatcherMessage`, and `DOMAIN_PROBES`.
- `_oracles.ts` — dependency-free comparison oracles: `countPairs` (counted `recipientId:channel` multiset), `expectedPairs`, `pairProblems` (exactly-one per expected pair; missing, duplicate, unexpected are distinct failures).
- `_mail-witness.ts` — `messagesAddressedTo(addresses)` reads Mailpit's HTTP API, never de-duplicates, parses `X-Notification-Key/Event-Id/Recipient-Id/Channel` headers into `WitnessedMessage`.
- `_provider-faults.ts` — live provider decorators: `withIdempotentReplay` (asks Mailpit if a message with the delivery's key already arrived and answers `accepted` without sending) and `bindProviderFaults` (forced `reject`/`lose_ack`, attempt/accepted logs). `PROVIDER_FAULT_POINT = 'notifications.provider_send'`.
- `_fault-switch.ts` — `createCrashSwitch`, the shared arming object; a point declares which `FaultKind`s it implements.
- `_fixture-producers.ts` — `producerPayload(event, params)` fills every `payloadKeys` entry with a sample value.
- `taxonomy.ts` — the suite's spec oracle: 48 `TAXONOMY` rows (recipients, channels|null, tone, class, payloadKeys, guarded/opsItem/escalation), `GUARDED_ROWS`, `CLASS_CHANNEL_RULE` + `channelRuleProblems`, `PAYLOAD_PREDICATES`, `PENALTY_LEXICON`, `FORBIDDEN_EVENT_PATTERNS`.
- Test files: `a-emitter-and-taxonomy.test.ts` (01–02), `b-delivery-defaults.test.ts` (07–08), `c-reliability-guard.test.ts` (09–11), `d-taxonomy-evidence.test.ts` (03–06, 12).

**Harness (`tests/at/harness/`)**
- `registry.ts` — `atTest`, the AT id grammar, `TIER` (from `AT_TIER`, no default), per-tier body maps, `chooseTierBody`, pending/refusal errors, runtime registration emission, per-test world/harness teardown tracking.
- `suite-adapters.ts` — `AdapterModules` map (`req-001`, `req-016`); derives `SutOf`/`WorldOf` from `_fixture.ts`'s annotated return; `requirement` literal ties map key, type source and runtime module.
- `index.ts` — `createHarness({ requirement, tier, configOverrides })`: loop builds `ControlledClock` + email sim and loads `_fixture.ts`; every other tier loads `_live.ts` and `stackFromEnv()`. `refusing()` proxy throws `CapabilityPending` on any access.
- `contracts.ts` — `AtHarness`, `TierHarness<T>` (integration subtracts `clock.freezeAt/advance` and the whole `vendors` member), `Clock`/`RealClock`, `Faults`, `Sentinels`, `EmailProviderSim`, `Vendors`; aliases for the merge reason.
- `pending.ts` — `AtPending` (`<id> PENDING [<phase>] — <detail>`) and `CapabilityPending` (`CAPABILITY PENDING — <names joined by ", ">`).
- `guards.ts` — centralized judgements: `sentinelValueProblem`, `faultPointProblem`, `faultAlreadyArmedProblem`, `faultFiredProblem`, `processEpochProblem`, `providerForceCountProblem`.
- `faults.ts`, `sentinels.ts`, `config.ts`, `fixtures.ts`, `vendors.ts`, `live-stack.ts`, `local-stack.ts`, `expected.ts`, `runner.ts`, `check.ts`, `atconfig.ts`.
- `tests/at/expected/req-016.json`, `tests/at/vitest.config.ts` (`testTimeout: 30_000`), `tests/at/tsconfig.json`, `tests/at/typecheck.ts`.

**Product under test (read to understand the seam)**
- `supabase/functions/_shared/notifications.ts` — `createNotifications(deps)` over the six ports (`TaxonomyPort`, `OutboxPort`, `ProviderPort`, `DirectoryPort`, `ClockPort`, `ProcessPort`); `prepareWriteSet` (branded `WriteSet`), `emit`, `runPass`, `drain`, `threadCommentGuard`.
- `supabase/functions/_shared/notification-provider.ts` — `createSmtpProvider`, the only sender; stamps `X-Notification-*` headers and `Message-ID` from the idempotency key.
- `supabase/migrations/20260913120000_notification_taxonomy_and_outbox.sql` — tables, closed event-type set, `emit_notification`, `apply_delivery_results`, `notification_fault_triggers` sequence, unique constraints (`(event_id, recipient_id, channel)`, `idempotency_key`) and the `emitted_by = 'notifications.emitter'` check.
- `supabase/migrations/20260913121000_notification_fixture_producers.sql` — `fixture_commit_transition_and_emit(scope, write, p_induce_fault)`, the stand-in producer definer.

### Flow

**1. The runner drives a tier.**
`bun run at:verify req-016 --tier <loop|integration> [--expect]` → `tests/at/harness/runner.ts:main` (line 288). It first runs the *code* bijection preflight `inspectBijection` (check.ts:107): P0 ids parsed from `.taskmaster/docs/acceptance/at-req-016.md` vs the `atTest('AT-…'` call sites under `tests/at/suites/req-016/`; any mismatch exits 2 before anything runs. If `--expect`, `loadTierExpectation(requirement, tier, expected)` (expected.ts:519) reads and validates `tests/at/expected/req-016.json` and requires it to be in exact bijection with the P0 set — again before any test or database work (runner.ts:328–342).

Loop tier touches no database (runner.ts:357). Integration tier takes a machine-wide stack lock and runs `prepareLocalStack` (local-stack.ts:986): prove the CLI resolved *this* project from its own container names, wait for readiness, re-read `config.toml` and refuse if it drifted, prove identity again, `resetLocalDatabase` (a `supabase db reset --local` that replays all migrations), wait again, and `proveMigrationsReplayed`. The proven coordinates become `AT_SUPABASE_{URL,DB_URL,ANON_KEY,SERVICE_ROLE_KEY,MAIL_URL}` in the child environment (runner.ts:421, local-stack.ts:1009).

The runner then spawns the pinned vitest (runner.ts:439) with `--root tests/at --config tests/at/vitest.config.ts --reporter=json`, directory filter `suites/req-016/`, and environment `AT_TIER`, `AT_REGISTRATION_DIR`, and the stack coordinates.

**2. `atTest` picks the tier's procedure.**
Each test file calls the bound `atTest(id, title, bodyOrMap)` from `_bind.ts`. In `registry.ts:atTest` (line 861):
- `TIER` is `process.env.AT_TIER` validated against `['loop','integration','drill']`, **no default** (registry.ts:138–146); unset is reported later as `tier-unset`.
- A bare function is the single-body form and runs at every tier. A map (`{default?, loop?, integration?, drill?}`) is the per-tier form: `tierBodyProblem` refuses a map with a hole and no `default` at the call site; otherwise `chooseTierBody` picks `bodies[TIER] ?? bodies.default ?? bodies.loop` (registry.ts:740–771).
- The chosen body is registered once with vitest; the id is checked against the id grammar and against the suite's bound requirement (`requirementMismatch`); duplicate ids throw. A JSONL registration `{atId, title, surface}` is appended under `AT_REGISTRATION_DIR` (registry.ts:778–783) — this is how the runner later knows what *actually registered* at this tier.
- Each test gets `expect.hasAssertions()`, a per-test teardown stack, and a per-tier timeout (`tierTimeout`); `vitest.config.ts` pins 30 s, AT-016.09 raises integration to 240 s, AT-016.08 to 60 s.

Which req-016 ids use maps: AT-016.01 (`default` loop arm + `integration: at01601`), AT-016.08 (`default` + `integration: at01608`), AT-016.11 (`default` + `integration: at01611`). Everything else is a single body. AT-016.03–.06/.12 share one `defineEvidenceCapture` producer, which reads `TIER !== 'loop'` **inside the producer** to choose between the provider simulator trace and the mail catcher (d-taxonomy-evidence.test.ts:89–117) — a runtime branch, not a per-tier map.

**3. `open()` builds a harness and a world through the one seam.**
`ctx.open(fixture?, opts?)` → `openWorld` (registry.ts:654):
- `TIER === null` → `AtPending(id, 'tier-unset', …)`.
- If the harness module is unresolvable → `AtPending(id, 'harness-missing', …)`.
- `aboveLoopStandInRefusal(TIER, liveAdapterExists('req-016'), 'notifications')` (registry.ts:773): above loop, a suite whose `_live.ts` file is absent throws `CapabilityPending(['fixtures.worlds', 'sut.notifications'])`. This is the "declared red by capability name" path.
- `createHarness({ requirement: 'req-016', tier, configOverrides })` (index.ts:190). Loop: `ControlledClock` + `createEmailProviderSim()`, then `loadAdapter` imports `tests/at/suites/req-016/_fixture.ts` by `REPO_ROOT` path and **checks the module's own `requirement` literal** against the requested one (index.ts:93–101). Above loop: `loadLiveAdapterModule` imports `_live.ts`, checks its literal, and calls `createLiveAdapter({ stack: stackFromEnv() })`; the clock is `RealClock` and `vendors` is a `refusing` proxy (index.ts:234–249).
- `h.sut['notifications']` must exist, else `AtPending(id, 'sut-missing', sutMissingDetail)` — this is the req-016-specific "the emitter has not landed" red.
- `h.fixtures.world(fixture)` runs; default name is `req-016/base` (registry.ts:929).
- One survival assertion: `h.tier` must equal `TIER`; then `opened as OpenWorld<R,K>` — the single relabelling, documented at registry.ts:941–958.

Types come from `_fixture.ts` (via `suite-adapters.ts` `WorldOf<'req-016'>` = `NotificationFixtureWorld`) even at integration, where the runtime object is `_live.ts`'s `NotificationLiveWorld`; both implement `World`, and the relabel above is what bridges them.

**4. The two bindings implement the same six ports.**
Product core (`notifications.ts:createNotifications`): `emit` finds the taxonomy row, `directory.resolve(row.recipients)`, `prepareWriteSet` (one `PreparedDelivery` per role×channel, subject/body from `renderCopy`), then `outbox.append(write)`. `drain` loops passes: `outbox.pending()` → `runPassOver` (email goes to `provider.deliver`; non-email self-accepts with `outcome: 'accepted'`) → one `outbox.applyPassResults(results, epoch)` per pass.

- Loop (`_fixture.ts:229–324`): memory arrays. `append` = set transition, read the crash switch, and only then mint `event-N`, write event, one delivery per write-set delivery (`idempotencyKey: ntf:<eventId>:<recipientId>:<channel>`), and the ops item; a crash restores the transition's previous value and throws. `applyPassResults` marks sent on `accepted`, otherwise `retrying`; `deliveredByProcess` is written only on first acceptance; the event's `attempts` increments once per touched event and the event state becomes `retrying`/`sent`. `pending` returns state ≠ sent. Reads clone `state`. Provider port delegates to `h.vendors.email.deliver`. Directory resolves `currentWorld.actors`/`addresses` at emit time.
- Live (`_live.ts:296–433`): `append` is **one SQL call**, `select public.fixture_commit_transition_and_emit(scopeId, write::jsonb, armed)`; `pending`/`events`/`deliveries`/`opsItems` are SQL reads over the outbox tables; `applyPassResults` is `select public.apply_delivery_results(results::jsonb, epoch)`. The directory is SQL: NGO = the org-membership seat, volunteer = `projects.assigned_volunteer_id`, admin/ex-volunteer = the world record; addresses come from `auth.users.email`. The provider is `bindProviderFaults(withIdempotentReplay(createSmtpProvider(...)))`; the clock is `Date.now()`; the epoch is `delivery-process-<uuid>`.

**5. Reads are world-scoped at integration.**
`_live.ts` keeps `openedWorlds` and `knownActorIds` (actors ever seated, including reassigned holders). `scopedActors()` (line 257) emits a Postgres array literal of all of them; every read filters `recipient_id = any(...)` — deliveries directly, events via their deliveries, ops items via their events, and the worker's `pending` the same way. Because each `ctx.open()` constructs a fresh harness and adapter, one test never sees another test's rows even though one database is shared across the 22 worlds of AT-016.09. A crashed emit leaves no delivery, hence no event, which is exactly what the atomicity oracle reads. The loop binding has no per-world reads — its `state` is per adapter (per `open()`), and `currentWorld` is a single mutable pointer.

**6. Provider-side witnesses.**
Loop: `h.vendors.email.attempts()` / `.accepted()` are recorded by the simulator, never by the sender; the sim applies idempotency first (an already-accepted `eventId:recipientId:channel` is a replay: recorded as an arrival, never added to `accepted`, consumes no armed outcome) (vendors.ts:94–120). Integration: `messagesAddressedTo` reads Mailpit by the world's namespaced addresses and parses the notification headers; the adapter's own `recordedProviderAttempts()`/`recordedProviderAccepted()` cover refusals and lost acks that never reach the catcher.

**7. Faults.**
Loop crash: `crash.armed()` is read inside `append` between transition and write; the ledger counts reaches, incremented at the reach and nowhere else. Live crash: the switch is read in `append` and passed as `p_induce_fault`; the product's definer does `nextval('notification_fault_triggers')` (outside transactional control) then raises with `detail = 'induced-fault:notifications.between_transition_and_event_write'`. The adapter counts both the sequence delta and the refusals it received carrying that detail, and `triggerCount()` refuses if they disagree (`_live.ts:267–292`). `faults.clear()` always disarms first, releases the point, then refuses if `triggerCount() < 1` (harness/faults.ts:78–95). `processRestart()` changes the epoch string and `processEpochProblem` refuses an unchanged identity.

**8. Results and `--expect`.**
After vitest, `analyzeReportedTests` (runner.ts:145) requires, for every expected P0 id: exactly one runtime registration (from the JSONL), exactly one vitest result, title equal to `<id> — <registration title>`, and status `passed` for green. Without `--expect`, `runVerdict` is the plain rule. With `--expect`, two deviation sets are computed:
- `expectationDeviations` (expected.ts:305): declared green reported red; declared red reported green (a red that turned green is a failure); missing; undeclared; and for reds, the exact detail shape.
- `reportAccountingDeviations` (expected.ts:378): `numFailedTests == declared reds`, `numPassedTests == declared greens`, `numTotalTests == green + red`, zero pending, zero todo, `success == (reds == 0)`, process exit for the no-red case, and file-level failures/messages that no test claims.

**Red declared by capability name, not by failure.** `RedDeclaration` (expected.ts:46) is `{kind:'capability-pending', capabilities:[…]}` or `{kind:'pending', phase: 'harness-missing'|'sut-missing'|'tier-unset'}`. `declaredDetail` (expected.ts:286) rebuilds the first line exactly: capability-pending must equal `CapabilityPending: CAPABILITY PENDING — <names joined by ", ">`, pending must start with `AtPending: <id> PENDING [<phase>] — `; capability-pending is whole-line equality, pending is anchored-prefix (the tail embeds machine-specific module-resolution text). Names containing commas or the redaction sentinel are refused (expected.ts:142–157). A redacted detail fails closed. The mechanism lives in the suite as thrown `CapabilityPending` (e.g. `aboveLoopStandInRefusal`, `_live.ts`'s sentinel read, `refusing()`), and req-001's manifest is the worked example of declaring by capability name (`sut.accounts.registerWithGithub`, `vendors.github-public-statistics`, …).

**What `tests/at/expected/req-016.json` asserts.** Its shape is `{ requirement: "016", tiers: { loop: {green:[12 ids], red:{}}, integration: {green:[same 12], red:{}} } }`. It asserts that all twelve P0 ids are green at *both* loop and integration with no declared reds, and — via `loadTierExpectation` — that this declared set is in exact bijection with the acceptance file's P0 ids, that both ids are well-formed, that no id is both green and red, and that none is listed twice. (At the head of this tree the live adapter exists, so unlike REQ-016's earlier honest-red phase there is nothing red to declare.)

### Files Read
- `tests/at/suites/req-016/_contract.ts`, `_bind.ts`, `_fixture.ts`, `_live.ts`, `_integration.ts`, `_oracles.ts`, `_mail-witness.ts`, `_provider-faults.ts`, `_fault-switch.ts`, `_fixture-producers.ts`, `_source-scan.ts`, `taxonomy.ts`
- `tests/at/suites/req-016/a-emitter-and-taxonomy.test.ts`, `b-delivery-defaults.test.ts`, `c-reliability-guard.test.ts`, `d-taxonomy-evidence.test.ts`
- `tests/at/expected/req-016.json`, `tests/at/expected/req-001.json`
- `tests/at/harness/registry.ts`, `suite-adapters.ts`, `index.ts`, `contracts.ts`, `expected.ts`, `runner.ts`, `check.ts`, `pending.ts`, `guards.ts`, `faults.ts`, `sentinels.ts`, `config.ts`, `fixtures.ts`, `vendors.ts`, `live-stack.ts`, `local-stack.ts` (through line 1044), `atconfig.ts`
- `tests/at/vitest.config.ts`, `tests/at/tsconfig.json`, `tests/at/typecheck.ts`
- `supabase/functions/_shared/notifications.ts`, `notification-provider.ts`
- `supabase/migrations/20260913120000_notification_taxonomy_and_outbox.sql`, `20260913121000_notification_fixture_producers.sql`
- `.taskmaster/docs/acceptance/at-req-016.md` (id lines), `package.json` (scripts)

### Boundaries
- **Suite → harness**: only through `_bind.ts` (`atTest`/`defineEvidenceCapture`) and the `ctx.open()` the body receives. The body never imports the harness factory, the tier, or the binding directly (except `TIER` re-exported by `_bind.ts`, which `d-taxonomy-evidence.test.ts` uses for its witness branch).
- **Harness → suite adapter**: `index.ts:loadAdapter` / `loadLiveAdapterModule` resolve `tests/at/suites/req-016/_fixture.ts` / `_live.ts` by path from `REPO_ROOT`; `suite-adapters.ts` reads the *types* from `_fixture.ts` only. The `requirement` literal is the join between map key, type source, and runtime module.
- **Adapter → product core**: imports `createNotifications`, `TAXONOMY_PORT`, and port/row types from `supabase/functions/_shared/notifications.ts`; `_live.ts` also imports `createSmtpProvider`.
- **Integration adapter → stack**: SQL via Bun's `Bun.SQL(stack.dbUrl)` (one shared pool per process; last adapter out closes it); SMTP to `host = new URL(stack.mailUrl).hostname` and `port = supabase/config.toml [local_smtp] smtp_port` (read from the file, refusing when absent); Mailpit HTTP API for reads; admin auth API (`/auth/v1/admin/users`, `email_confirm: true`) plus direct operator SQL to provision worlds.
- **Runner → OS/stack**: pinned Supabase CLI, allowlisted child environment, machine-wide lock keyed by project id + api port, `AT_REPO_ROOT` for data-root redirection (refused at integration).

### Non-Obvious Things
- **`_integration.ts` is not the integration binding.** The binding is `_live.ts`. `_integration.ts` holds the integration-tier test bodies; the same name pattern in other suites is a binding file.
- **The suite's types are derived from the loop adapter even at integration.** `WorldOf<'req-016'>` resolves to `NotificationFixtureWorld`; at integration `open()` casts the `NotificationLiveWorld` into that type (the "one surviving assertion", registry.ts:941–958). Both classes structurally implement the same `World`.
- **Single bodies are typed at the loop tier.** `default`/single bodies may reach `h.clock.advance` and `h.vendors.email`; only per-tier maps written for `integration` get the reduced `TierHarness<'integration'>`. One body that needs less capability but doesn't take a map would fail at run time, not compile time (registry.ts:840–851).
- **`d-taxonomy-evidence.test.ts` branches on `TIER` inside a single shared capture producer** (`const live = TIER !== 'loop'`), whereas AT-016.01/.08/.11 use per-tier bodies. Same id, same acceptance text, different mechanism.
- **The live guard config travels in the world name.** `createLiveAdapter` receives only `{ stack }`, so AT-016.08 opens world `req-016/guard?cap=<n>&window=<ms>&coalesce=<bool>` and `guardConfigFromWorldName` parses it; the body asserts the name it opened equals the pins it read from `h.config` (one value, read once).
- **One mutable `currentWorld` pointer per adapter.** `directory.resolve` reads it at emit time. Opening a second world before firing through the first would resolve to the second. Req-016 bodies always fire immediately after `open()`, so this is latent rather than exercised.
- **The live crash counter is two witnesses.** `nextval` survives rollback; the adapter also counts refusals carrying the raise's own `detail`; `triggerCount()` throws when they disagree, and `clear()` throws when zero reaches occurred. Arming writes nothing to the ledger.
- **In-app never reaches the provider.** The core synthesizes `accepted` for non-email channels; the suite's provider oracles bound "email provider saw exactly the email pairs" with empty expectations for in-app-only rows (AT-016.05 and AT-016.11 check both directions).
- **Duplicates are caught by counting, never de-duplicating.** `countPairs`/`pairProblems` deliberately multiset; `_mail-witness.ts` keys only on Mailpit's own storage id so two physical messages with one idempotency key stay two rows. Live duplicate suppression is done by `withIdempotentReplay` asking Mailpit by key before sending, plus the DB unique constraints.
- **`deliveredByProcess` is first-send-only** (`coalesce` in SQL, `if null` in memory) so it names the process that actually sent, not the last drain; the restart test asserts every pending delivery was completed by the post-restart epoch.
- **The live sentinel scope refuses by name.** `sentinels.read` throws `CapabilityPending(['sentinels.scan'])` because the seam is synchronous and SQL is not; no req-016 body scans, and the manifest declares no red for it. This is the seam's documented limitation, not a failure.
- **The 22-pool incident is encoded in the code.** `_live.ts` shares one SQL client per process with a holders counter because 22 adapters × ~10-connection pools exhausted the database's 100 slots and broke Auth provisioning.
- **`--expect` is a preflight.** A malformed or non-bijective declaration exits 2 before the lock, Docker, or any reset; a red that turned green is itself a declared failure. The known residual gap: a hook that throws in a file which also has a failing test is invisible to report accounting (expected.ts:371–376).

### Open Questions
- I did not read `notification-taxonomy.ts` or `notification-copy.ts` bodies; the product taxonomy's exact contents are known only through the suite's mirror (`taxonomy.ts`), the seed list in the migration, and `TAXONOMY_PORT`. The static equality check between them is `_source-scan.ts:taxonomySeedProblems`.
- I could not run anything (read-only, no shell), so "green" statements are from the committed manifest and code structure, not from an executed run.
- `local-stack.ts` was truncated at line 1044 (the tail of `evidenceLine`), which is cosmetic for this angle.
- The `typeprobes`/`loop/parked/v1` attack transcripts referenced in comments were not read; I took the registry's account of them as documented.
### Components Found

**Product core (the same code at both tiers)**
- `createNotifications(deps)` — `supabase/functions/_shared/notifications.ts:332`. The one emitter and one delivery worker. Decides everything, stores nothing; six ports injected.
- `OutboxPort` — `notifications.ts:247`. `append(WriteSet)` applies the producer transition and notification write "as one unit"; `pending()` lists unsent deliveries; `applyPassResults(results, epoch)` applies one worker pass.
- `ProviderPort` / `ProviderAnswer` — `notifications.ts:259`, `:224`. `deliver()` returns `accepted | rejected | no_ack`; `no_ack` is documented as silence, not a refusal.
- `prepareWriteSet` — `notifications.ts:174`. Sole constructor of the branded `WriteSet` (`:155`), the type half of "sole writer". Refuses a role nobody resolved and an email delivery with no address.
- `NotificationEventRow` / `DeliveryRow` / `PendingDelivery` — `notifications.ts:89`, `:99`, `:210`. `PendingDelivery.idempotencyKey` is "read off the row, never derived here, so a retry cannot derive it differently" (`:218`).
- `createSmtpProvider` — `supabase/functions/_shared/notification-provider.ts:206`. The only product module that speaks SMTP; puts `X-Notification-Key`, event/recipient/channel headers and a `Message-ID` derived from the key on the wire (`:140-159`).
- Taxonomy/copy — `notification-taxonomy.ts` (`TAXONOMY`, `channelsFor`, class rules enforced at import, `:233-245`) and `notification-copy.ts` (`renderCopy`).

**The reliability harness (test tree)**
- `createCrashSwitch<Ledger>` — `tests/at/suites/req-016/_fault-switch.ts:28`. The one arming object both bindings use; the binding supplies the ledger, the reach-write, and the judgement.
- `createFaults(seam)` / `ArmedFault` / `FaultHandle` — `tests/at/harness/faults.ts:47`, `:27`. Owns the per-harness live-arming reservation and routes all judgements to `guards.ts`; `clear()` disarms/releases first, then refuses a fault that never fired (`:81-92`).
- `guards.ts:74,93,111,143` — `faultPointProblem`, `faultAlreadyArmedProblem`, `faultFiredProblem`, `providerForceCountProblem`. The centralized refusals; their conformance tests live in `tests/at/harness/conformance.selftest.ts:288-315`, `:409-533`.
- `bindProviderFaults` — `tests/at/suites/req-016/_provider-faults.ts:105`. The live decorator implementing `reject` and `lose_ack` with a one-outcome ledger, plus an adapter-side attempt/accept log (`:44-85`).
- `withIdempotentReplay` — `_provider-faults.ts:91`. Live-only wrapper that asks Mailpit whether a message carrying this key already exists before sending.
- `messagesAddressedTo` — `tests/at/suites/req-016/_mail-witness.ts:85`. Reads Mailpit raw sources, keyed by Mailpit's storage id, never deduplicating by `Message-ID`.
- `createEmailProviderSim` — `tests/at/harness/vendors.ts:65`. Loop-tier provider stand-in: one forced-outcome queue, `attempts()`/`accepted()` traces, an `acceptedIdentities` set for idempotency. The port deliberately cannot see `ack_lost`.
- Loop binding `createFixtureAdapter` — `_fixture.ts:157`; live binding `createLiveAdapter` — `_live.ts:241`. Both build the same `createNotifications`.

**Database**
- `supabase/migrations/20260913120000_notification_taxonomy_and_outbox.sql`: event-type seed, `notification_events`, `notification_deliveries` (unique `(event_id, recipient_id, channel)`, unique `idempotency_key`, `emitted_by = 'notifications.emitter'` check, `:139-142`), `notification_ops_items`, `notification_fault_triggers` sequence (`:166`), `emit_notification(jsonb)` (`:191`), `apply_delivery_results(jsonb, text)` (`:244`).
- `supabase/migrations/20260913121000_notification_fixture_producers.sql`: `notification_fixture_transitions` ledger and `fixture_commit_transition_and_emit(scope, write, p_induce_fault)` (`:33`) — transition, fault point, emit, one transaction.

### Flow

**Emission (both tiers).** `world.fire(event)` → `core.emit(...)` → `notifications.ts:374`: look up the taxonomy row; `directory.resolve(roles)` reads holders **now**; `prepareWriteSet` resolves channels via `channelsFor(row)` and freezes recipients/addresses into the write set; `outbox.append(write)`.
- Loop: `_fixture.ts:230` sets `state.transitions[event]=true`, checks `crash.armed()`, and on a crash restores the transition to its previous value and throws (`:234-240`); otherwise allocates `event-N`, writes event, one delivery per recipient-channel pair, ops item, key `ntf:${eventId}:${recipientId}:${channel}` (`:242-275`).
- Live: `_live.ts:304` reads the sequence before/after and calls `select public.fixture_commit_transition_and_emit(scopeId, write, armed)`. The definer performs the transition, `perform nextval('public.notification_fault_triggers')` then `raise … detail='induced-fault:notifications.between_transition_and_event_write'` if armed, else calls `public.emit_notification` (`20260913121000:44-57`), which inserts event, deliveries (key `'ntf:'||event_id||':'||recipient||':'||channel`, `20260913120000:225`), and ops item.

**Delivery pass.** `core.runPass()` = `outbox.pending()` → `runPassOver` (`notifications.ts:335`): in-app rows are accepted by the pass itself (`:340-343`); email rows call `provider.deliver(key,to,subject,body,eventId,recipientId,channel)` (`:344-353`); then one `outbox.applyPassResults(results, process.epoch())` (`:355`). `drain({passes})` loops until quiescent or the budget runs out; `passes` must be a positive integer (`:387-392`).
- Loop apply (`_fixture.ts:297`): `accepted` → `state='sent'` (stamp `deliveredByProcess` only if still null); anything else → `'retrying'`; event `attempts += 1` per touched event, event state `'retrying'` if any delivery unsent else `'sent'`.
- Live apply: one `apply_delivery_results(results, epoch)` call (`_live.ts:352`). SQL accepted branch (`20260913120000:257-264`): `state='sent'`, `delivered_by_process = coalesce(delivered_by_process, epoch)`, `accepted_at`, `provider_receipt`; non-accepted branch: `state='retrying'`. Event `attempts+1` and derived state (`:276-283`).

**Provider faults.**
- Loop: the body arms `h.vendors.email.rejectNext(1)` / `acceptButLoseAck(1)` (`c-reliability-guard.test.ts:169,227`); the sim consumes one forced outcome per send; the port returns `rejected` / `no_ack` while the trace separately records `rejected` / `ack_lost`.
- Live: `h.faults.at('notifications.provider_send', kind)` → `_live.ts:503-505` dispatches to `providerFaults.faults.arm(kind)`; the decorator consumes `remaining=1`, increments `reaches`; `reject` skips the inner provider; `lose_ack` calls the inner chain (so the physical message is sent) then answers `no_ack` (`_provider-faults.ts:117-144`). The inner chain is `withIdempotentReplay(smtp)`, which returns `{outcome:'accepted', receipt:{replayed:true,…}}` without sending when Mailpit already holds that `to` + `X-Notification-Key` (`:91-103, _live.ts:475`).

**Tier driving.** `registry.ts` reads `AT_TIER` (no default, `:138-146`); `harness/index.ts:227-249` builds the loop adapter with a `ControlledClock` + email sim and the live adapter with `stackFromEnv()`; `openWorld` refuses above loop unless `_live.ts` exists (`registry.ts:670-671`, `index.ts:128`). The suite registers AT-016.11 with a per-tier map (`c-reliability-guard.test.ts:161-163`), so the same criterion runs two different procedures. `bun run at:verify req-016 --tier integration` locks the one stack, proves identity, **resets the database from `supabase/migrations`** and then runs vitest with `AT_TIER` (`runner.ts:385-455`).

### The reliability path, point by point

**1. How a fault is armed and how "it actually fired" is proved.**
- The harness first validates the request: `faultPointProblem` against the adapter's `points()`, `faultAlreadyArmedProblem` against live armings, and `_fault-switch.ts:40-44` refuses a kind the point does not implement (`crash` at the provider point, or vice versa). The provider point is only on the live adapter's list (`_live.ts:502`); the loop list is the crash point only (`_fixture.ts:191`).
- Crash point, loop tier: one witness. `_fixture.ts:234-239` increments `armed.reaches` exactly where the fault point is reached (between transition and write) and nowhere else. `createCrashSwitch` opens the ledger at `arm` but adds nothing to it (`_fault-switch.ts:36-46`); the conformance test proves arming alone leaves `triggerCount()` at 0 and that clearing an unfired handle throws `never fired` (`conformance.selftest.ts:432-446`).
- Crash point, integration: **two witnesses on opposite sides of the wire**, and `triggerCount()` refuses when they disagree (`_live.ts:267-280`). Witness A is the product's own sequence: `nextval('public.notification_fault_triggers')` immediately before the raise (`20260913121000:49`), which rollback cannot undo, read via `pg_sequence_last_value` before/after the call (`_live.ts:284-289, 307-317`). Witness B is the adapter's count of refusals whose `detail` equals `induced-fault:notifications.between_transition_and_event_write` (`_live.ts:291-292, 314`). If the sequence moved with no refusal, or a refusal arrived without the sequence moving, `triggerCount` throws (`_live.ts:271-277`). The count returned is the sequence advance; `FaultHandle.clear()` then requires it ≥ 1 (`faults.ts:90`, `guards.ts:111-118`).
- AT-016.09 calls `fault.clear()` in a `finally` (`c-reliability-guard.test.ts:67-75`), so a run whose crash never reached the point fails at cleanup, not silently passes.

**2. What the atomicity claim rests on, and how many independent witnesses.**
- Per guarded row (11 rows, `taxonomy.ts:84-121`, enforced against `MUST_BE_GUARDED` at `c-reliability-guard.test.ts:13-25`): (a) a **control run** in its own world with no fault — the transition must commit and an event must exist, or the fixture is a no-op (lines 50-63); (b) a **fault run** in a fresh world — arm crash, fire, clear, then assert the transition, event, deliveries **and** ops item are all absent (lines 65-121). The oracle rejects `transition || event || delivery || opsItem` committed, not merely mismatched outcomes.
- The fault-fired evidence (above) is what keeps the "none committed" read from being the result of a fault that never happened; the control run is what keeps it from being a no-op fixture. On state: the transition comes from `notification_fixture_transitions`, the event/delivery/ops reads from the outbox tables via the live adapter SQL (`_live.ts:356-432`) — all product-side data read by the adapter; the crash itself is witnessed independently.
- The oracle's strength is itself on file: `loop/items/AI4DEV-19/proof-oracle.txt` records the falsification runs — a fault moved after both writes passes the old `transition !== event` form and fails the current four-read form (Part One), and a rollback that restores transition+event but leaves a delivery committed passes the two-read form and fails the current form (Part Two, quoted at `c-reliability-guard.test.ts:89-92`). `proof-red.txt` is the red transcript (transition committed only). A harness conformance case keeps the loop fixture's id counter honest: a crashed emit must leave the next event id at `event-1` (`conformance.selftest.ts:501-533`).

**3. Sent only on provider acceptance.**
- Only `outcome === 'accepted'` writes `sent`; `rejected` and `no_ack` both write `retrying` (`_fixture.ts:302-307`; `20260913120000:257-270`). In-app is accepted without a provider by the pass itself (`notifications.ts:340-343`). AT-016.11(a) asserts after one pass that the event is `pending|retrying`, the email delivery is not `sent`, and something observable remains (`c-reliability-guard.test.ts:198-206`; integration equivalent `_integration.ts:281-289`). After the retry the event must read `sent` (`:222-224`).

**4. Rejection, lost acknowledgment, retry.**
- A rejection leaves the delivery `retrying`; `pending()` reselects it (`state <> 'sent'`); the next pass physically calls the provider again. The tests require `>= 2` attempts and the last outcome `accepted` (`c-reliability-guard.test.ts:210-216`; `_integration.ts:297-303`).
- A lost ack is the ambiguous case: the provider took the message but answered `no_ack`; `no_ack` marks the delivery `retrying`, never `sent` (`vendors.ts:40-42`; `notification-provider.ts:196-198`). The retry **does** reach the provider again; what prevents the duplicate is idempotency at the provider seam, not a skipped call and not a stored receipt (`_provider-faults.ts:5-11`): the loop sim answers an already-accepted identity `accepted` without adding a second `accepted()` entry (`vendors.ts:98-109`), and the live `withIdempotentReplay` finds the key at Mailpit and returns `accepted` without sending (`_provider-faults.ts:91-103`). AT-016.11(c) demands the attempt sequence `['ack_lost','accepted']`, exactly one logical event, one delivery per expected pair all `sent`, and exactly the expected accepted pairs (`c-reliability-guard.test.ts:257-292`; `_integration.ts:345-371`). The integration body additionally reads Mailpit **physical message counts per idempotency key** and requires exactly `[1]` after the retry for both the rejected and the lost-ack events (`_integration.ts:373-381`); the witness never collapses duplicates (`_mail-witness.ts:11-15`).

**5. Evidence provenance — who could fake what.**

| Evidence | Written by | Could be faked by |
|---|---|---|
| `triggerCount` at crash point, loop tier | the loop binding itself at the reach (`_fixture.ts:238`) | the test-tree fixture (single witness; the guard only guarantees arming is not counted) |
| Sequence advance at crash point, live | product definer `nextval` before raise | product SQL (but then the refusal witness must also move or `triggerCount` throws) |
| Refusal detail at crash point, live | product `raise … detail` (`20260913121000:50-52`) | a different error could not match the detail; a swallowed error yields disagreement |
| Provider point reach, live | the adapter decorator consuming one forced outcome (`_provider-faults.ts:120-123`) | the adapter — single witness, by design ("it would be wrong if the decorator recorded a sequence it did not perform") |
| Provider attempts/accept, loop | harness email sim (`vendors.ts:91-92,106-118`) | the harness sim (the SUT holds only the port face, and cannot see `ack_lost`) |
| Physical arrival, live | Mailpit's store, read over HTTP (`_mail-witness.ts`) | the catcher or another sender; not the product sender |
| SUT row state, attempts counter | product DB, read by the adapter as operator | the product itself; the tests explicitly cross-check the SUT's counter against the provider trace (`_contract.ts:106-113`) |
| Faulted-run "none committed" rows | product DB, read via the adapter | same as above, but constrained by the fault-fired proof and the control run |

### Files Read

- `supabase/functions/_shared/notifications.ts`
- `supabase/functions/_shared/notification-provider.ts`
- `supabase/functions/_shared/notification-taxonomy.ts`
- `supabase/functions/_shared/notification-copy.ts`
- `supabase/migrations/20260913120000_notification_taxonomy_and_outbox.sql`
- `supabase/migrations/20260913121000_notification_fixture_producers.sql`
- `tests/at/suites/req-016/_fault-switch.ts`
- `tests/at/suites/req-016/_provider-faults.ts`
- `tests/at/suites/req-016/_mail-witness.ts`
- `tests/at/suites/req-016/c-reliability-guard.test.ts`
- `tests/at/suites/req-016/_integration.ts`
- `tests/at/suites/req-016/_bind.ts`
- `tests/at/suites/req-016/_live.ts`
- `tests/at/suites/req-016/_fixture.ts`
- `tests/at/suites/req-016/_contract.ts`
- `tests/at/suites/req-016/_oracles.ts`
- `tests/at/suites/req-016/_fixture-producers.ts`
- `tests/at/suites/req-016/taxonomy.ts`
- `tests/at/suites/req-016/b-delivery-defaults.test.ts`
- `tests/at/suites/req-016/a-emitter-and-taxonomy.test.ts`
- `tests/at/harness/faults.ts`
- `tests/at/harness/guards.ts`
- `tests/at/harness/vendors.ts`
- `tests/at/harness/registry.ts`
- `tests/at/harness/index.ts`
- `tests/at/harness/contracts.ts`
- `tests/at/harness/live-stack.ts`
- `tests/at/harness/runner.ts` (lines 1-120, 320-519)
- `tests/at/harness/conformance.selftest.ts` (lines 30-149, 260-559)
- `tests/at/expected/req-016.json`
- `loop/decomp/req-016.md`
- `loop/items/AI4DEV-19/proof-oracle.txt` (lines 1-60)

### Boundaries

- **In:** a producer definer's transaction (`fixture_commit_transition_and_emit` today, real money/key/completion producers later, `20260913121000:1-8`), the SMTP catcher (`supabase/config.toml` `[local_smtp].smtp_port`, read at `_live.ts:101-112`), the stack SQL connection (`stack.dbUrl`), the taxonomy/copy modules, the harness fault/sentinel/vendor seams.
- **Out:** the notification tables — no client role or service role holds any privilege; `emit_notification` and `apply_delivery_results` are `security definer` with execute revoked from public and granted to nobody (`20260913120000:19-23, 170-187, 237, 286`); the one exception is `authenticated` `select` on `notification_deliveries` for the recipient's own in-app rows via policy (`:183-187`).
- **No product entry point at HEAD:** `createNotifications`, `emit`, `runPass` and `drain` are called only from `_fixture.ts:346` and `_live.ts:477`; there is no edge function, cron or HTTP worker. The delivery worker runs only when the acceptance suite calls `drainDeliveries`. The declared sibling components (`blockers.service`, `scope.service`, `lifecycle.service`) are declarations in `SENDER_DECLARATIONS` and `NOTIFICATION_COMPONENTS` (`notifications.ts:53-70`); their files do not exist yet.

### Non-Obvious Things

- **The crash fault is not read from a control table.** It travels as `p_induce_fault` — the adapter reads its own switch immediately before the call and passes a boolean (`_live.ts:304-312`). Earlier design notes (see `loop/items/AI4DEV-89/lanes/...`) proposed a `notification_fault_armings` table; the shipped code does not have one.
- **The sequence exists solely because rollback erases counters.** Anything the definer writes before `raise` disappears; `nextval` does not (`20260913120000:163-166`).
- **The crash point only proves atomicity because the reads are all-false, not merely equal.** The old oracle `transition !== event` accepted a fault firing after both writes; the file documents this history and its falsification (`c-reliability-guard.test.ts:96-107`).
- **The live "none committed" reads are not four independent sources.** Events, deliveries and ops items are all selected through deliveries scoped to the world's known actor ids (`_live.ts:356-432`); an ops item leaking without a delivery leak would be invisible. The fixture producer's insert order (event → deliveries → ops item, one transaction) makes that particular shape unreachable from this producer.
- **Loop-tier "atomicity" is ordering, not a transaction.** The memory outbox restores the transition by hand and writes everything else only after the point (`_fixture.ts:229-276`); the only harness test that the id counter survives is the conformance `event-1` case.
- **Loop tier does not expose the provider fault point.** `points()` returns only the crash point (`_fixture.ts:191`); the loop AT-016.11 arms the vendor sim directly. The integration procedure arms `notifications.provider_send` through `h.faults`.
- **`attempts` is worker passes, not sends.** A pass that touched only in-app increments it (`_contract.ts:106-113`); tests compare it beside, never instead of, the provider trace.
- **The provider decorator's attempt log is module-global** and reset each time `bindProviderFaults` runs, i.e. once per `open()` (`_provider-faults.ts:109`). The integration body reads it after its own `ctx.open()`, which is why that works despite the state being shared.
- **The rejected identity is deliberately not remembered by the sim** (`vendors.ts:113-115`): a rejected send's retry must be able to succeed. Only a physical acceptance closes an identity.
- **`accepted_at` and `provider_receipt` are written but nothing reads them yet.** On the live `lose_ack` path the durable acceptance fact is *not* written; the recovery is the adapter's Mailpit replay. The migration comment anticipates a recovery path that does not exist in this tree (`20260913120000:31-35`).
- **The mail witness counts physical messages and never dedupes.** Two messages with one key stay two rows keyed on Mailpit's storage id; this is deliberate so a broken replay cannot hide (`_mail-witness.ts:11-15`).
- **`--passes: 1` is load-bearing.** A run-to-quiescence drain hides the unconfirmed state, so the clause cannot tell a correct sender from one that marked sent on `no_ack` (`c-reliability-guard.test.ts:166-168, 232-236`).
- **The integration runner rebuilds the DB every run**, and `REPO_ROOT !== INSTALL_ROOT` is refused so a redirected data root cannot choose which database is reset (`runner.ts:385-399`).
- **The mail witness empty means searched-and-nothing**; a non-200 from the catcher throws rather than returning empty (`_mail-witness.ts:92-94`).

### Open Questions

- **Acceptance text not in this checkout.** Every suite header cites `.taskmaster/docs/acceptance/at-req-016.md`, and the decomp cites `requirements/req-016.md`, but glob found no `.taskmaster` directory in the working tree. I used test titles and comments as the statement of the criteria; the exact P0 wording could not be read.
- **No production worker schedule.** Nothing in the tree calls `runPass`/`drain` outside tests; how/when deliveries run in the real product is unbuilt and I found no design note that pins it.
- **Two-witness timing.** The live crash count reads `pg_sequence_last_value` before and after the RPC on the same connection (`_live.ts:307-317`). With the default sequence cache of 1 this is fine; a future `CACHE n` on `notification_fault_triggers` would make `last_value` lag and the two witnesses could disagree spuriously. Nothing in the migration sets a cache, so this is a latent coupling, not a current defect.
- **The provider point has no second witness by construction**; its `triggerCount` is the decorator's own `reaches`, so an adapter that recorded a reach it did not perform would go unnoticed. The code names this explicitly (`_provider-faults.ts:14-16`), but no independent check exists.
- **I did not trace `_source-scan.ts` or the sentinel scope in depth** (out of my reliability angle); both appear in `_integration.ts` and `_live.ts` but do not touch the fault/retry path.
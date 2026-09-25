I have the reliability path end to end. The remaining gap is how the live adapter scopes event and ops reads through deliveries, which changes how independent the atomicity witnesses really are.

### Components Found

- **`createCrashSwitch` / `CrashSwitch<Ledger>`** — `tests/at/suites/req-016/_fault-switch.ts` (lines 22–55). Per-point arming object. `arm()` opens a ledger and does not count a trigger. The binding writes witnesses into the ledger at the reach. `triggerCount(ledger)` is the binding’s judgement.

- **`createFaults` / `ArmedFault` / `FaultHandle`** — `tests/at/harness/faults.ts`. Harness wrapper around the adapter seam. `at()` refuses unknown points and a second live arming. `clear()` disarms first, then refuses if `triggerCount < 1`.

- **`faultPointProblem` / `faultFiredProblem` / `faultAlreadyArmedProblem` / `providerForceCountProblem`** — `tests/at/harness/guards.ts` (lines 74–154). Central refusals so “armed” cannot be counted as “fired”, and `rejectNext(0)` cannot be a no-op.

- **`createNotifications` / `OutboxPort` / `ProviderPort` / `ProviderOutcome`** — `supabase/functions/_shared/notifications.ts`. Product core. `emit` prepares a `WriteSet` and calls `outbox.append`. `drain` / `runPass` call the provider and then `applyPassResults`. `'accepted'` is the only outcome that may mark sent. `'rejected'` and `'no_ack'` may not.

- **`prepareWriteSet`** — same file, lines 174–206. Resolves recipients and channels at emit time. Brands the write set so only this constructor can build one.

- **`createEmailProviderSim` / `EmailProviderPort`** — `tests/at/harness/vendors.ts`. Loop-tier provider. The port returns `'no_ack'` for a lost ack. The sim’s `attempts()` / `accepted()` keep the physical truth. Idempotency is `JSON.stringify([eventId, recipientId, channel])`.

- **`bindProviderFaults` / `withIdempotentReplay` / `PROVIDER_FAULT_POINT`** — `tests/at/suites/req-016/_provider-faults.ts`. Integration-tier wrappers around `ProviderPort`. Fault decorator consumes one forced `reject` or `lose_ack`. Replay wrapper asks Mailpit by key before SMTP.

- **`messagesAddressedTo` / `WitnessedMessage`** — `tests/at/suites/req-016/_mail-witness.ts`. Integration out-of-band reader over Mailpit. Counts physical messages. Does not collapse duplicates. Scopes by address.

- **`createSmtpProvider` / `deliverOverSmtp`** — `supabase/functions/_shared/notification-provider.ts`. Product SMTP. `250` after DATA is `'accepted'`. 4xx/5xx is `'rejected'`. Timeout, refused connect, or closed connection is `'no_ack'`. No idempotency of its own.

- **`public.fixture_commit_transition_and_emit`** — `supabase/migrations/20260913121000_notification_fixture_producers.sql`. Stand-in producer: upsert transition, optional `nextval` + raise, then `emit_notification`, one transaction.

- **`public.emit_notification` / `public.apply_delivery_results` / `public.notification_fault_triggers`** — `supabase/migrations/20260913120000_notification_taxonomy_and_outbox.sql`. One-writer insert of event + deliveries + ops item. Worker pass marks `'sent'` only when `outcome = 'accepted'`. Sequence is outside transactional control.

- **Loop outbox `append` / `applyPassResults`** — `tests/at/suites/req-016/_fixture.ts` (lines 229–317). In-memory one-transaction stand-in. Crash restores the previous transition and throws before any event write.

- **Live outbox `append` / `applyPassResults`** — `tests/at/suites/req-016/_live.ts` (lines 267–353, 469–514). SQL producer call with two-witness crash ledger. Provider stack is `bindProviderFaults(withIdempotentReplay(smtp))`.

- **`at01611`** — `tests/at/suites/req-016/_integration.ts` (lines 257–382). Integration procedure for AT-016.11. Same three clauses as the loop body, with Mailpit as the physical-message witness.

- **`pairProblems` / `countPairs` / `expectedPairs`** — `tests/at/suites/req-016/_oracles.ts`. Multiset equality of `recipientId:channel`. Names missing, duplicate, and unexpected pairs.

- **`GUARDED_ROWS`** — `tests/at/suites/req-016/taxonomy.ts` line 136. Eleven rows with `guarded: true`. Only `chargeback.opened` also has `opsItem: true`.

### Flow

**0. Entry.** Acceptance bodies in `c-reliability-guard.test.ts` call `open()`, which builds a new harness per call (`registry.ts` `openWorld` 654–686 → `createHarness` in `tests/at/harness/index.ts`). Loop loads `_fixture.ts`. Integration loads `_live.ts`. `AT-016.09` and `AT-016.10` are one body at both tiers. `AT-016.11` is a per-tier map: `default` is the loop body, `integration` is `at01611`.

**1. Arm a crash (AT-016.09).** Body calls `h.faults.at('notifications.between_transition_and_event_write', 'crash')` (`c-reliability-guard.test.ts` 68). `createFaults.at` (`faults.ts` 61–95) runs `faultPointProblem` against `seam.points()`, then `faultAlreadyArmedProblem`, then `seam.arm`. Loop `points()` is only that crash point (`_fixture.ts` 191–193). Live `points()` is that crash point plus `notifications.provider_send` (`_live.ts` 501–508). `createCrashSwitch.arm` (`_fault-switch.ts` 37–52) refuses a kind the point does not implement, opens a ledger, and returns `triggerCount` / `disarm`. Arming writes nothing into the ledger.

**2. Reach the crash.** `w.fire(row.event)` → `core.emit` (`notifications.ts` 374–381) → `directory.resolve` at emit time → `prepareWriteSet` → `outbox.append(write)`.

- Loop `append` (`_fixture.ts` 230–240): sets `transitions[event]=true`, then if armed restores the previous value, `armed.reaches += 1`, throws `induced fault: crash at …`. Event, deliveries, and ops are not written.

- Live `append` (`_live.ts` 304–322): reads `crash.armed()`, snapshots `pg_sequence_last_value('public.notification_fault_triggers')`, calls `public.fixture_commit_transition_and_emit(scope, write, armed !== null)`. SQL (`20260913121000_…sql` 44–57): upserts `notification_fixture_transitions.committed=true`, then if `p_induce_fault` does `nextval` and `raise exception … detail = 'induced-fault:notifications.between_transition_and_event_write'`. `emit_notification` is not called. The whole function rolls back, including the upsert. `nextval` survives. The adapter, in `catch`, increments `refusals` only when `error.detail` matches that string; in `finally`, adds the sequence delta to `sequenceAdvances`.

**3. Prove the fault fired, not merely that it was requested.** `fault.clear()` (`c-reliability-guard.test.ts` 74, `faults.ts` 81–92) reads `armed.triggerCount()`, disarms, then `faultFiredProblem(point, count)` (`guards.ts` 111–119). Count `< 1` throws `never fired`. Loop count is `ledger.reaches`, incremented only at the throw site (`_fixture.ts` 238). Live count is `sequenceAdvances` only if it equals `refusals`; otherwise `triggerCount` itself throws (`_live.ts` 270–278). Conformance wall: `conformance.selftest.ts` 432–456 arms, asserts count `0` before fire, `clear()` refuses, then fire, count `1`. That wall is what stops “armed === fired”.

**4. Atomicity oracle after the crash.** Body still calls `sut.drainDeliveries()`, then four reads (`c-reliability-guard.test.ts` 78–108): `w.transitionCommitted`, `sut.events({type})`, `sut.deliveries({type})`, `sut.opsItems()` matched by `kind === row.event`. Any one true fails. A control world per row, with no fault, must commit transition and event first (lines 50–62); otherwise “neither committed” is a no-op.

**5. Recipients frozen (AT-016.10, same reliability file).** `fire('pm_item.completed')` resolves NGO at emit. `reassignRole('ngo', …)` then `drainDeliveries`. Deliveries for that `eventId` must be the original id only (`c-reliability-guard.test.ts` 136–154). Directory is read again only on the next emit (`_fixture.ts` 334–344; live directory reads `org_memberships` / `projects` at emit, `_live.ts` 437–464).

**6. Worker pass (send path).** `drain({passes})` (`notifications.ts` 385–401) loads `outbox.pending()` (`state <> 'sent'`). For each pending row: in-app is recorded `'accepted'` without a provider (338–342); email calls `provider.deliver` with `key = idempotencyKey` (`ntf:{eventId}:{recipientId}:{channel}`). Then one `applyPassResults`.

**7. Mark sent only on provider acceptance.**

- Core passes the provider’s `outcome` through unchanged (`notifications.ts` 353).
- Loop `applyPassResults` (`_fixture.ts` 302–316): `'accepted'` → delivery `'sent'` and first-send process stamp; else `'retrying'`. Event `attempts += 1`. Event `'sent'` only when every delivery of that event is `'sent'`.
- SQL `apply_delivery_results` (`20260913120000_…sql` 257–283): same split on `outcome = 'accepted'`. Also writes `accepted_at` and `provider_receipt` in the same `UPDATE` that marks sent. `'no_ack'` and `'rejected'` both take the else branch.

**8. Rejection (AT-016.11 a/b).**

- Loop: `h.vendors.email.rejectNext(1)` (`vendors.ts` 78–87, 111–115). Count must be a positive integer (`providerForceCountProblem`). First `deliver` returns `'rejected'`, identity is not protected, `attempts` records `'rejected'`. Body drains `{passes: 1}` so quiescence cannot hide the unconfirmed state (`c-reliability-guard.test.ts` 169–206).
- Integration: `h.faults.at('notifications.provider_send', 'reject')` (`_integration.ts` 264–270). Decorator decrements `remaining`, increments `reaches`, records `'rejected'`, returns `{outcome:'rejected'}` **without** calling SMTP (`_provider-faults.ts` 123–126). Mailpit must be empty for that event (`_integration.ts` 291–295).
- After pass 1: event still exists in `'pending'|'retrying'`; email deliveries exist and `state !== 'sent'`; every provider attempt is the volunteer on email.
- Then unbounded `drainDeliveries()`. Retry must reach the provider again (`attempts` length ≥ 2, last `'accepted'`). Rejected identities are not idempotent (`vendors.ts` 113–115). Event `state === 'sent'` and `attempts >= 2`.

**9. Lost acknowledgment (AT-016.11 c).**

- Loop: `acceptButLoseAck(1)`. Port returns `'no_ack'` to the sender; sim records `'ack_lost'` in both `attempts()` and `accepted()` and **does** protect the identity (`vendors.ts` 106–119). Sender cannot see `'ack_lost'`.
- Integration: `faults.at(..., 'lose_ack')`. Decorator **does** call inner SMTP, records `'ack_lost'`, `rememberAccepted` if inner accepted, returns `{outcome:'no_ack', receipt:null}` (`_provider-faults.ts` 127–130). Pass 1: attempts `['ack_lost']`; email not `'sent'`; Mailpit has **exactly one** physical message for that event’s keys (`_integration.ts` 339–343).
- Second drain: attempts `['ack_lost','accepted']`. One logical event. Delivery pairs = volunteer × `{email,inapp}` exactly once, all `'sent'`. Provider-accepted pairs = volunteer × email exactly once (`pairProblems` equality, not uniqueness). Integration: still one physical message per key after the retry (`_integration.ts` 373–381).

**10. What stops a duplicate on retry.** Retry is a second worker pass over the **same** delivery row (`pending` is `state <> 'sent'`; unique `(event_id, recipient_id, channel)` and unique `idempotency_key` in SQL, lines 139–140). No second logical row is inserted.

- Loop physical de-dupe: sim `acceptedIdentities`. A replay acks `'accepted'`, is logged on `attempts()`, is **not** added to `accepted()`, and consumes no forced outcome (`vendors.ts` 106–109).
- Integration physical de-dupe: `withIdempotentReplay` (`_provider-faults.ts` 91–103) asks Mailpit whether a message with this `key` already exists for `message.to`. If yes, returns `'accepted'` with `{replayed:true}` and does not send. Product SMTP has no idempotency (`notification-provider.ts` 15–23, 178–204). The SQL comment at `20260913120000_…sql` 31–35 says the provider’s idempotency on the key stops duplicates; on the live path that “provider” is the test wrapper plus Mailpit, not SMTP.

### Files Read

- `tests/at/suites/req-016/_fault-switch.ts`
- `tests/at/suites/req-016/_provider-faults.ts`
- `tests/at/suites/req-016/_mail-witness.ts`
- `tests/at/suites/req-016/c-reliability-guard.test.ts`
- `tests/at/suites/req-016/_fixture.ts`
- `tests/at/suites/req-016/_live.ts`
- `tests/at/suites/req-016/_integration.ts`
- `tests/at/suites/req-016/_bind.ts`
- `tests/at/suites/req-016/_oracles.ts`
- `tests/at/suites/req-016/taxonomy.ts`
- `tests/at/suites/req-016/_contract.ts` (partial)
- `tests/at/suites/req-016/_fixture-producers.ts` (partial)
- `tests/at/harness/guards.ts`
- `tests/at/harness/faults.ts`
- `tests/at/harness/vendors.ts`
- `tests/at/harness/vendors.selftest.ts`
- `tests/at/harness/contracts.ts` (partial)
- `tests/at/harness/conformance.selftest.ts` (partial)
- `tests/at/harness/index.ts`
- `tests/at/harness/registry.ts` (partial)
- `tests/at/harness/live-stack.ts` (partial)
- `tests/at/expected/req-016.json`
- `supabase/functions/_shared/notifications.ts`
- `supabase/functions/_shared/notification-provider.ts`
- `supabase/functions/_shared/notification-taxonomy.ts` (partial)
- `supabase/migrations/20260913120000_notification_taxonomy_and_outbox.sql`
- `supabase/migrations/20260913121000_notification_fixture_producers.sql`
- `.taskmaster/docs/acceptance/at-req-016.md` (section C)

### Boundaries

**In**

- Taxonomy row + directory holders → `WriteSet` (core).
- Fixture `fire(event)` as stand-in producer (real payment/key/completion definers are not in this tree; the SQL file says so).
- Harness fault arming: crash at `notifications.between_transition_and_event_write`; loop provider via `h.vendors.email`; integration provider via `notifications.provider_send`.
- Worker: pending delivery rows, process epoch, provider answer.

**Out**

- Event / delivery / ops rows (memory or SQL).
- Provider attempt log (loop sim or `_provider-faults` module log).
- Physical mail (Mailpit, integration only).
- Sequence `notification_fault_triggers` (live crash witness).
- Fixture ledger `notification_fixture_transitions` (live `transitionCommitted`).

**Not on this path**

- `createNotifications` is constructed only from `_fixture.ts` and `_live.ts`. There is no product edge worker calling `drain` in this tree.
- Integration `h.vendors` is a `CapabilityPending` refusal (`index.ts` 248). The loop AT-016.11 body cannot run as-is above loop.
- Live sentinel `read()` is pending; bodies do not scan it.

### Non-Obvious Things

1. **Arming is not firing.** `createCrashSwitch.arm` only installs a ledger (`_fault-switch.ts` 45–46). Loop increments `reaches` only after restoring the transition (`_fixture.ts` 235–239). Live increments only from `nextval` and a matching exception `detail` (`_live.ts` 314–318). `clear()` is the judgement (`faults.ts` 81–92). A handle that counted “armed” as “fired” would green every atomicity test; `guards.ts` 10–14 and `conformance.selftest.ts` 305–308, 432–446 exist to stop that.

2. **Live crash has two witnesses; loop has one.** Live `triggerCount` refuses if sequence advances ≠ refusals (`_live.ts` 270–276). A raise without `nextval`, or `nextval` without the adapter seeing the `detail`, is a disagreement, not a silent green. Loop has no second witness: the same `append` both throws and increments.

3. **Atomicity “four reads” are not four independent witnesses everywhere.**
   - Control run: transition + event (2).
   - Fault-fired: `triggerCount` (1, two-sided only live).
   - Post-state: transition, events, deliveries, ops (4 names).
   - Ops is discriminating only for `chargeback.opened` (`taxonomy.ts` 91 vs 84–95, 121). The other ten guarded rows never write an ops item, so `opsItemWritten` is always false.
   - Live `events()` and `opsItems()` are selected **through deliveries** (`_live.ts` 359–363, 419–422). An event or ops row with no delivery is invisible. `_live.ts` 23–24 states this as intended. Loop arrays are independent (`_fixture.ts` 319–323).
   - Historical: the oracle used to be `transition !== event` (equal committed both would pass). Then two-false on those two. Then deliveries + ops after AI4DEV-19, with `loop/items/AI4DEV-19/proof-oracle.txt` as the falsification. Comments at `c-reliability-guard.test.ts` 80–107.

4. **`passes: 1` is load-bearing.** Default drain runs to quiescence (`notifications.ts` 385–400). A reject or lost-ack followed by a retry inside one `drain()` would leave “one logical row, all sent, one accepted pair” for both an honest retry and a sender that marked sent on `no_ack`. Pass 1 makes the unconfirmed state observable (`c-reliability-guard.test.ts` 166–168, 230–235; `_integration.ts` 266–268, 315–318).

5. **In-app is marked sent with no provider.** `runPassOver` auto-accepts non-email (`notifications.ts` 338–342). After a rejected email pass, the in-app row is already `'sent'`; the event stays `'retrying'` until email is accepted. AT-016.11’s unconfirmed checks filter `channel === 'email'`.

6. **Lost ack is a physical accept plus a lie.** Loop sim adds the identity to `acceptedIdentities` then returns `'no_ack'` (`vendors.ts` 10–15, 117–119). Live decorator sends, then returns `'no_ack'` with `receipt: null` (`_provider-faults.ts` 7–11, 127–130). The sender has no receipt to store. Retry must hit the provider again. Duplicate suppression is the inner idempotency, not a skipped call.

7. **Live duplicate suppression is a test adapter, not product SMTP.** `withIdempotentReplay` lives in `tests/at/suites/req-016/_provider-faults.ts` and wraps SMTP only in `_live.ts` 475. `notification-provider.ts` always sends. Mailpit is used as an idempotency store because “SMTP has no idempotency key” (`_provider-faults.ts` 88–89). A production worker that called `createSmtpProvider` without that wrapper would re-send on lost ack.

8. **Attempt log vs catcher.** Rejections and lost acks never appear in Mailpit as failures. The decorator’s `recordedProviderAttempts()` is the only witness for those outcomes (`_provider-faults.ts` 13–16). The catcher is the only witness that a rejected send did **not** produce a message, and that a lost-ack retry did not produce a second one. Loop has no catcher; the sim is both provider and trace.

9. **`accepted()` means physically accepted, including `ack_lost`.** Pair equality in AT-016.11(c) uses `accepted()` / `recordedProviderAccepted()`, which keep the lost-ack pair and drop replays. Filtering that list to `outcome === 'accepted'` would hide the first physical take.

10. **Fixture producer is a stand-in.** `20260913121000_…sql` 1–11: no real payment, key, or completion definer exists. AT-016.09 proves this one-transaction shape, not those future producers.

11. **Each `open()` is a new harness**, but AT-016.09 keeps all twenty-two until the test ends (`registry.ts` 923–939). Isolation is per-adapter state (loop) or per-world actor ids (live). `_provider-faults.ts` attempt/accepted arrays are **module-level** and reset on every `bindProviderFaults()` (lines 44–46, 109). A second live adapter in the same process would wipe the first’s log.

12. **Event `attempts` is worker passes, not provider sends** (`_contract.ts` 107–112; SQL 276–277). AT-016.11 asserts both this counter and the provider trace because they can disagree.

13. **There is no `failed` path in apply.** Enum includes `'failed'` (`20260913120000_…sql` 39). `apply_delivery_results` only writes `'sent'` or `'retrying'`. Unbounded `drain()` retries until acceptance or a pass budget. “Never silently dropped” is “stays pending/retrying”, not a dead-letter.

14. **Loop fixture `arm` ignores the point name** (`_fixture.ts` 193: `arm: (_point, kind) => crash.arm(kind)`). Safe today because only one point is exposed. Live dispatches on the name.

### Open Questions

- I did not run the suite. I did not watch `postgres.js` attach `detail` on a `P0001` raise. Live two-witness counting depends on that field surviving to `_live.ts` 291–292.

- I could not determine how a **real** producer (payments, keys, completion) will call `emit_notification`. The stand-in is explicit. AT-016.09 does not currently bind those definers.

- I could not find a product delivery worker outside the two test adapters. Lost-ack idempotency on a future edge drain is therefore not implemented in product SMTP; only in the live test wrapper.

- Live atomicity cannot see an event or ops row that leaked without a delivery, because both reads join through `notification_deliveries`. I did not find a second operator query that would catch that leak.

- I did not verify that Bun SQL’s `error.detail` matches Postgres `DETAIL` exactly under this stack’s client. If it does not, live AT-016.09 would fail closed on witness disagreement rather than false-green.

- Post-state cannot tell “wrote then rolled back” from “skipped the write when armed”. Live `nextval` after the insert makes “reached the point” mean the insert ran in that transaction in the current SQL order. A producer that `nextval`s then skips the insert would still look like a rollback. I did not find a test that reads the sequence relative to the insert order.
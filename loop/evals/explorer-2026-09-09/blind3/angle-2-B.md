### Components Found

**Application core — `supabase/functions/_shared/notifications.ts`**

| Name | Location | What it is |
|---|---|---|
| `Notifications` | lines 312–330 | The system under test's public shape: `senders`, `taxonomy`, `documentedDefaults`, `runtimeRegistrationSurface`, `emit`, `runPass`, `drain`, `events`, `deliveries`, `opsItems`, `threadCommentGuard`. |
| `createNotifications(deps)` | 332–434 | The one factory. Builds the emitter and the worker around six ports. Pure: no I/O, no clock read, no randomness, relative imports only. |
| `emit(request)` | 374–381 | Finds the taxonomy row, resolves holders, prepares the write set, appends it. Returns `{accepted:false, reason}` for an unregistered event. |
| `runPassOver(pending)` (closure) | 335–357 | One worker pass. In-app deliveries are accepted locally; email deliveries call `provider.deliver`; then one `outbox.applyPassResults(results, process.epoch())`. |
| `runPass()` | 383 | `runPassOver(await outbox.pending())`. |
| `drain({passes})` | 385–401 | Runs passes until no pending delivery or until the `passes` bound. Rejects a bound that is not a whole number ≥ 1. |
| `threadCommentGuard(config)` | 407–432 | Per-instance sliding window. Holds `windowStart`, `commentsInWindow`, `coalescedInWindow` in memory. Reads `clock.now()` only. |
| `prepareWriteSet(row, request, holders)` | 174–206 | The sole constructor of a `WriteSet`. Refuses a role the directory did not resolve, and an email delivery whose holder has no address. |
| `WriteSet` | 158–168 | Branded with an unexported `declare const WRITE_SET: unique symbol` (line 155). `OutboxPort.append` accepts nothing else. The type half of "sole writer". |
| `EmitRequest` / `EmitOutcome` | 121–129 | `{event, actor, params}` in; `{accepted:true, eventId}` or `{accepted:false, reason}` out. |
| `PendingDelivery` | 210–220 | What one send needs: id, eventId, recipientId, address, channel, subject, body, `idempotencyKey`. The comment at 218–219 says the key is "read off the row, never derived here". |
| `ProviderAnswer` / `ProviderOutcome` | 222–229 | `outcome: 'accepted' | 'rejected' | 'no_ack'`, plus a `receipt` object or null. `no_ack` is silence, not refusal. |
| `PassResult` | 231–235 | `{id, outcome, receipt}` — one row per attempted delivery. |
| `OutgoingMessage` | 237–245 | `{key, to, subject, body, eventId, recipientId, channel}` handed to the provider. |
| `SENDER_DECLARATIONS` | 53–58 | Four rows: emitter `canSendDirectly:true`; `blockers.service`, `scope.service`, `lifecycle.service` `false`. |
| `NOTIFICATION_COMPONENTS` | 60–70 | Path prefixes per component, used by the source scan to attribute files. The emitter owns the four `_shared/notification*.ts` files. |
| Six port types | `OutboxPort` 247–257, `ProviderPort` 259–261, `DirectoryPort` 263–266, `TaxonomyPort` 268–271, `ClockPort` 273–275, `ProcessPort` 277–280 | Storage, wire, directory, taxonomy, time, process identity. |
| `TAXONOMY_PORT` | 296–299 | The only taxonomy binding either tier uses: `rows: () => TAXONOMY`, `documentedDefaults`. |

**Taxonomy — `supabase/functions/_shared/notification-taxonomy.ts`**

- `Role`, `Channel`, `Tone`, `EventClass` (26–30).
- `TaxonomyRow` (32–49): `event`, `recipients`, `channels` (null = class default), `tone`, `class`, optional `payloadKeys`, `guarded`, `opsItem`, `escalation`.
- `TAXONOMY` (51–123): 48 rows, one per wire event.
- `CLASS_CHANNEL_RULE` (137–146): money/deadline/blocker/completion/decision `mustInclude:['email']`; lowtone `mustEqual:['inapp']`; access and other carry no rule.
- `channelRuleProblems(row, channels)` (148–160).
- `DEFAULT_BY_CLASS` (173–206): per-class channel default with a documented `source` sentence.
- `channelsFor(row)` (209–211): named channels, or the class default.
- `documentedDefaults()` (221–227): one `{event, channels, source}` per row.
- `taxonomyRow(event)` (229–231): exported but unused by product code.
- `assertTaxonomyIsLegal()` (233–243), called at module load on line 245: rejects a duplicate wire name and any row whose effective channels break its class rule.

**Copy — `supabase/functions/_shared/notification-copy.ts`**

- `eventInWords(event)` (20–23): `blocker.aging_48h` → `Blocker aging 48h`.
- `NAMED` (30–71): ten rows with bespoke subject/body text.
- `renderCopy(row, payload)` (73–83): named text when present; otherwise a general sentence plus every non-empty string value in the payload.

**SMTP provider — `supabase/functions/_shared/notification-provider.ts`**

- `createSmtpProvider(options)` (206–210) returns `{deliver: message => deliverOverSmtp(options, message)}`.
- `SmtpProviderOptions` (31–38): `host`, `port`, `sender`, `timeoutMs`. All arrive as constructor arguments. No environment read at module level.
- `SmtpSession` (53–118): buffers socket data as UTF-8, resolves one reply per command; `takeReply` (102–117) completes a reply at the first line matching `/^\d{3}( |$)/`; `fail` rejects all waiters and destroys the socket on `error` or premature `close`.
- `connect(options)` (120–129): `node:net` `createConnection`.
- `expectReply(reply, ...codes)` (131–134): throws `SmtpRefusal` on any other code.
- `encodedHeader(value)` (136–138): RFC 2047 base64 for a non-ASCII subject.
- `messageIdFor(key)` (140–142): `<key with [^A-Za-z0-9.-] replaced by dots @notifications.ai4good.local>`.
- `renderMessage(sender, message, date)` (145–165): CRLF headers (`From`, `To`, `Subject`, `Message-ID`, `X-Notification-Key`, `X-Notification-Event-Id`, `X-Notification-Recipient-Id`, `X-Notification-Channel`, `Date`, `MIME-Version`, `Content-Type: text/plain; charset=utf-8`, `Content-Transfer-Encoding: 8bit`), body split on CRLF/LF and dot-stuffed (a leading `.` becomes `..`).
- `exchange(session, options, message)` (167–176): expects `220` greeting, `EHLO notifications.ai4good.local` `250`, `MAIL FROM` `250`, `RCPT TO` `250|251`, `DATA` `354`, message + `\r\n.` `250`; sends `QUIT` fire-and-forget; returns `{code, reply, messageId}`.
- `deliverOverSmtp(options, message)` (178–204): races `connect` and `exchange` against one `timeoutMs` deadline. `accepted` on final 250; `rejected` on `SmtpRefusal`; `no_ack` on timeout, refused connection, or close before reply. `finally` clears the timer and closes the session.

**Storage — `supabase/migrations/20260913120000_notification_taxonomy_and_outbox.sql`**

- Enums `notification_state ('pending','retrying','sent','failed')`, `notification_channel`, `notification_role` (39–41).
- `notification_event_types(event text primary key, shape check regex)` seeded with the 48 names (45–101).
- `notification_events` (105–116): `id uuid`, `event` FK, `actor_account_id`, `payload jsonb`, `recipients jsonb` (check: array, length > 0), `state`, `attempts`, `created_at`.
- `notification_deliveries` (121–143): `event_id`, `event`, `role`, `recipient_id`, `recipient_address`, `channel`, `state`, `emitted_by`, `delivered_by_process`, `payload`, `subject`, `body`, `idempotency_key`, `accepted_at`, `provider_receipt`. Constraints: unique `(event_id, recipient_id, channel)`, unique `idempotency_key`, `emitted_by = 'notifications.emitter'`, `channel <> 'email' or recipient_address is not null`.
- `notification_ops_items` (151–158): one per event via unique `linked_event_id`.
- `notification_fault_triggers` sequence (166): non-transactional witness for the injected crash.
- Posture (170–187): all tables revoked from `anon`, `authenticated`, `service_role`; RLS enabled; the only client access is `select` on `notification_deliveries` for `authenticated` under policy `notification_deliveries_own_inapp` (`recipient_id = auth.uid() and channel = 'inapp'`).
- `public.emit_notification(p_write jsonb) returns uuid` (191–236): security definer, `search_path=''`, execute revoked from public. Inserts the event, loops deliveries (minting `'ntf:' || event_id || ':' || recipientId || ':' || channel`), inserts the ops item when `p_write->'opsItem'` is an object, returns the event id.
- `public.apply_delivery_results(p_results jsonb, p_epoch text)` (244–285): security definer, execute revoked. For `accepted`: `state='sent'`, `delivered_by_process=coalesce(delivered_by_process, p_epoch)`, `accepted_at=coalesce(accepted_at, now())`, `provider_receipt=coalesce(nullif(receipt,'null'), provider_receipt)`. Otherwise `state='retrying'`. Then, per touched event, `attempts = attempts + 1` and `state = 'retrying'` if any delivery is not `'sent'`, else `'sent'`.

**Fixture producer — `supabase/migrations/20260913121000_notification_fixture_producers.sql`**

- `notification_fixture_transitions` (19–24): one row per `(scope_id, event)` stand-in ledger.
- `public.fixture_commit_transition_and_emit(p_scope, p_write, p_induce_fault)` (33–59): upserts the transition, optionally takes `nextval` and raises with `detail = 'induced-fault:notifications.between_transition_and_event_write'`, then returns `public.emit_notification(p_write)`. One SQL call, one transaction.

**Acceptance bindings — `tests/at/suites/req-016/`**

| File | Role |
|---|---|
| `_contract.ts` | `NotificationsSut` (150–171) and `World` (181–201) — the suite-facing shapes. Type aliases, not interfaces, on purpose. |
| `_fixture.ts` | `createFixtureAdapter` (157) — the LOOP binding. In-memory outbox (`append` 229–276, `pending` 278–290, `applyPassResults` 297–317), provider over the harness email simulator (327–332), directory over the open world's actors (335–344), core built at 346–353. Also the thread-comment guard and the crash switch. |
| `_live.ts` | `createLiveAdapter` (241) — the INTEGRATION binding. `append` calls `fixture_commit_transition_and_emit` (304–322), `pending` and the three reads are scoped operator SQL (324–432), directory is SQL (437–465), provider is `createSmtpProvider` wrapped by `withIdempotentReplay` and `bindProviderFaults` (469–475), core at 477–484. |
| `_source-scan.ts` | `providerClientImporters()` (127–140), `taxonomySeedProblems()` (158–176), `strayNotificationWriters()` (197–228). |
| `_provider-faults.ts` | `withIdempotentReplay` (91–103) and `bindProviderFaults` (105–146) — the integration provider decorators. |
| `taxonomy.ts` | The suite's own spec oracle: `TAXONOMY` (52–130), `GUARDED_ROWS` (136), `CLASS_CHANNEL_RULE` (186–195), `PAYLOAD_PREDICATES` (234–310). |
| `_fixture-producers.ts` | `producerPayload` (26–31) — sample values for every named payload key. |
| `_integration.ts` | The integration-tier bodies `at01601`, `at01608`, `at01611`, plus `assertEmitterIsSoleWriter` shared at both tiers. |
| `_mail-witness.ts` | Reads Mailpit's HTTP API and returns physical messages with the notification headers. |
| `a/b/c/d-*.test.ts` | AT-016.01…12 bodies. |
| `_bind.ts` | `bindSuite({requirement:'req-016', sut:'notifications'})`; supplies `atTest`. |

**Harness — `tests/at/harness/`**

- `vendors.ts` `createEmailProviderSim` (65–123): one forced-outcome queue, one attempt log, idempotency-first by JSON-encoded `[eventId, recipientId, channel]`; `acceptButLoseAck` records an acceptance but answers `'no_ack'`.
- `index.ts` `createHarness` (190–250): `loop` tier loads `_fixture.ts` and gives the adapter `{email: provider.port}`, the suite sees `{email: provider.sim}`; integration loads `_live.ts` and refuses `vendors`.
- `suite-adapters.ts` (108–111): the adapter map that lets the suite's types be read off the `_fixture.ts` module rather than restated.

### Flow

**Tier selection.** `AT_TIER` (registry.ts:138–149, no default) decides. `createHarness` (harness/index.ts:227–249) loads `suites/req-016/_fixture.ts` when the tier is `loop`, and `_live.ts` when it is anything else. Both factories return the same `NotificationsSut` shape, and both construct the same `createNotifications` object from `notifications.ts`.

**Step 1 — a world opens.**
- Loop: `createFixtureAdapter` builds `MutableState` (three arrays, transitions map, id counter). A world is `NotificationFixtureWorld` over the shared `FixtureWorld` actors (fixture.ts:116–155, 373–389).
- Integration: `createLiveAdapter` provisions four real auth users, an organisation, an `org_memberships` seat, and a project with `assigned_volunteer_id` (live.ts:539–626). `currentWorld` is the adapter's only world pointer.

**Step 2 — fire an event.**
- Loop: `NotificationLiveWorld.fire` (fixture.ts:130–133) → `fireThroughCore` (110–114) → `core.emit({event, actor:null, params: producerPayload(event, params)})`.
- Integration: `NotificationLiveWorld.fire` (live.ts:211–215) does the same `core.emit`.

**Step 3 — `Notifications.emit` (notifications.ts:374–381).**
1. `taxonomy.rows()` through `TAXONOMY_PORT` (296–299) → the `TAXONOMY` const. `.find(row => row.event === request.event)`. A miss returns `{accepted:false, reason:'unregistered event type'}` and writes nothing.
2. `directory.resolve(row.recipients)` — loop: reads `currentWorld.actors[role]` and the namespaced address (fixture.ts:335–344); live: SQL over `org_memberships` → `projects.assigned_volunteer_id` → `auth.users.email`, with `platform_admin` and `ex_volunteer` taken from the world record because the schema stores neither per scope (live.ts:437–465).
3. `prepareWriteSet(row, request, holders)` (notifications.ts:174–206): `channelsFor(row)` (taxonomy.ts:209–211) → `renderCopy(row, payload)` (copy.ts:73–83) → one `ResolvedRecipient` per role and one `PreparedDelivery` per role-channel pair, each carrying the same payload copy, subject and body. It throws on an unresolved role (line 182) and on an email delivery with a null address (line 183).
4. `outbox.append(write)`:
   - Loop (fixture.ts:230–276): sets the transition first, reads the crash switch; if armed, restores the transition's previous value (or deletes a key that did not exist before), increments `reaches`, and throws — nothing else was written. Otherwise mints `event-${nextId}`, pushes the event, the delivery rows with `idempotencyKey = 'ntf:' + eventId + ':' + recipientId + ':' + channel` (line 269), and the ops item; returns `{eventId}`.
   - Integration (live.ts:304–322): reads `crash.armed()`, snapshots `public.notification_fault_triggers` when armed, then one SQL call `select public.fixture_commit_transition_and_emit(scopeId, write::jsonb, armed)`. That function upserts the transition ledger, may raise, and calls `public.emit_notification`, which inserts the event, every delivery (minting the same `ntf:` key at migration line 225), and any ops item, all in the transaction. The adapter counts refusals whose `detail` matches the raise, and the sequence delta, and requires the two witnesses to agree (createCrashSwitch callback at live.ts:267–280).
5. `emit` returns `{accepted:true, eventId}`.

**Step 4 — drain to a sent row.**
- `sut.drainDeliveries(opts)` is the suite's name for `core.drain` (contract.ts:170; fixture.ts:365; live.ts:496).
- `drain` (notifications.ts:385–401): validate the pass bound; loop while `outbox.pending()` is non-empty. Loop `pending` is a filter over `state !== 'sent'` (fixture.ts:278–290); live it is `select ... where recipient_id = any(...) and state <> 'sent' order by created_at, id` (live.ts:324–350).
- `runPassOver(pending)` (notifications.ts:335–357): for each pending delivery:
  - channel `inapp`: push `{id, outcome:'accepted', receipt:null}` and never touch the provider (lines 340–342).
  - channel `email`: call `provider.deliver({key: idempotencyKey, to: address ?? '', subject, body, eventId, recipientId, channel})` (lines 344–352).
    - Loop provider (fixture.ts:327–332): `vendors.email.deliver(...)` → the harness sim (vendors.ts:94–120). Idempotency is checked first on `JSON.stringify([eventId, recipientId, channel])`; a known identity answers `'accepted'` and records an arrival with no new acceptance. Otherwise it consumes one forced outcome or answers `'accepted'`.
    - Integration provider (live.ts:475): `bindProviderFaults(withIdempotentReplay(createSmtpProvider(...), stack))`. `bindProviderFaults.deliver` (provider-faults.ts:117–145) may force `rejected` without sending, or call the inner provider and answer `no_ack`. `withIdempotentReplay.deliver` (91–103) asks Mailpit whether a message to that address already carries the key; if yes it answers `accepted {replayed:true}` and sends nothing. Otherwise `createSmtpProvider.deliver` (notification-provider.ts:206–210) → `deliverOverSmtp` (178–204) → `connect` (120–129) → `SmtpSession` (53–118) → `exchange` (167–176) with `expectReply`, `command`, `renderMessage`, `messageIdFor`, `encodedHeader`.
  - Push each answer as a `PassResult`.
- After the loop, one call: `outbox.applyPassResults(results, process.epoch())` (notifications.ts:355).
  - Loop (fixture.ts:297–317): `accepted` → `state='sent'`, `deliveredByProcess` stamped only if it is still null; anything else → `'retrying'`. Then per touched event `attempts += 1` and `state = 'retrying'` unless every delivery of the event is `'sent'`, in which case `'sent'`.
  - Integration (live.ts:352–354): one SQL call `select public.apply_delivery_results(results::jsonb, epoch)` doing the same, plus `accepted_at` and `provider_receipt` (coalesced so a later pass cannot erase them).

**Step 5 — read back.** `sut.events/deliveries/opsItems` → `core.*` → `outbox.*`. Loop returns clones of the arrays; live returns scoped SQL reads (live.ts:356–432).

**Suite bodies at the two tiers.** `atTest(id, name, {default, integration})` in `_bind.ts` registers each id once; `_integration.ts` holds the bodies that must fork. AT-016.01's shared arm (`assertEmitterIsSoleWriter`, `_integration.ts:52–107`) runs the two source scans and the self-report at both tiers, then plants a sentinel per domain. The tier fork is only the provider-side witness: loop reads `h.vendors.email.attempts()` (a.test.ts:21–24); integration reads `messagesAddressedTo` from Mailpit (`at01601`, lines 121–139). AT-016.08 forks on the clock: loop commands `h.clock`; integration waits real time against pins read back from `h.config` and passed through the world name (`at01608`, lines 151–212; `guardConfigFromWorldName`, live.ts:173–194). AT-016.11 forks on fault arming: loop uses `h.vendors.email.rejectNext/acceptButLoseAck`; integration arms `notifications.provider_send` and reads the adapter's own attempt log and the catcher (`at01611`, lines 257–382). All other ids (`.02`–`.07`, `.09`, `.10`, `.12`) run one body at both tiers. `tests/at/expected/req-016.json` declares all twelve green at both tiers.

### Files Read

- `supabase/functions/_shared/notifications.ts`
- `supabase/functions/_shared/notification-taxonomy.ts`
- `supabase/functions/_shared/notification-provider.ts`
- `supabase/functions/_shared/notification-copy.ts`
- `supabase/migrations/20260913120000_notification_taxonomy_and_outbox.sql`
- `supabase/migrations/20260913121000_notification_fixture_producers.sql`
- `tests/at/suites/req-016/_fixture.ts`
- `tests/at/suites/req-016/_live.ts`
- `tests/at/suites/req-016/_contract.ts`
- `tests/at/suites/req-016/_bind.ts`
- `tests/at/suites/req-016/_integration.ts`
- `tests/at/suites/req-016/_source-scan.ts`
- `tests/at/suites/req-016/_provider-faults.ts`
- `tests/at/suites/req-016/_fixture-producers.ts`
- `tests/at/suites/req-016/_mail-witness.ts`
- `tests/at/suites/req-016/taxonomy.ts`
- `tests/at/suites/req-016/a-emitter-and-taxonomy.test.ts`
- `tests/at/suites/req-016/b-delivery-defaults.test.ts`
- `tests/at/suites/req-016/c-reliability-guard.test.ts`
- `tests/at/suites/req-016/d-taxonomy-evidence.test.ts`
- `tests/at/harness/vendors.ts`
- `tests/at/harness/index.ts` (lines 1–260)
- `tests/at/harness/suite-adapters.ts`
- `tests/at/expected/req-016.json`
- `.taskmaster/docs/acceptance/at-req-016.md` (grep for the twelve texts)

### Boundaries

- **Core → storage.** `OutboxPort` is the only write path. The producer's state transition and the notification rows commit in one unit: in memory, one function body in `append`; live, one definer call. The core cannot open a database transaction, so `prepareWriteSet` finishes all decisions before `append` runs (notifications.ts:11–16).
- **Core → provider.** `ProviderPort.deliver` only. The core never imports a provider client; `notification-provider.ts` imports only types from `notifications.ts` (line 29). The live adapter imports `createSmtpProvider` from the test tree (live.ts:59); `tests/` is outside the scanned product roots.
- **Core → directory.** `DirectoryPort.resolve` runs once per emit, in `emit`, never in the pass (notifications.ts:374–378). AT-016.10 proves the freeze.
- **Database privileges.** No role except the owner reaches the tables; `execute` is revoked from public on both definers; the only client read is a recipient's own in-app deliveries under RLS (migration lines 170–187).
- **Which module may speak to a provider, and how the rule is enforced.** `notification-provider.ts` is the one product module holding a mail client. `providerClientImporters()` (`_source-scan.ts:127–140`) reads every `.ts/.tsx/.sql` file under `supabase/functions`, `supabase/migrations`, and `src`, matches `SEND_PATH_PATTERNS` (`deliver(`, `ProviderPort`, `node:net|node:tls|nodemailer|resend|postmark|@sendgrid/*|mailgun*|smtp*`) and `CREDENTIAL_PATTERNS` (`RESEND_API_KEY`, `SENDGRID_API_KEY`, `POSTMARK_SERVER_TOKEN`, `MAILGUN_API_KEY`, `SMTP_PASSWORD`, `SMTP_PASS`), maps each hit through `NOTIFICATION_COMPONENTS`, and throws when it finds nothing at all. AT-016.01 asserts the result equals `['notifications.emitter']` at both tiers (`_integration.ts:62–66`). A companion oracle, `strayNotificationWriters()` (197–228), rejects any insert into the three outbox tables outside `public.emit_notification`. This is a test-time text scan, not a compiler or runtime guard; the file header of `_source-scan.ts` states that a renamed import escapes it.
- **No production entry point at HEAD.** A grep over `supabase/functions` finds `createNotifications` only in `notifications.ts` itself; `createSmtpProvider` only in `notification-provider.ts`. A grep over `src/` finds no notification reference. The only constructors of the core are `_fixture.ts:346` and `_live.ts:477`, and only `_live.ts` imports the provider. No edge function, cron, or HTTP handler calls `emit`, `runPass`, or `drain`. The subsystem is exercised end to end only through the acceptance suite at this commit.
- **In-app read surface.** `notification_deliveries` has an RLS policy for recipients, but nothing in `src/` reads it. The policy is in place with no consumer.

### Non-Obvious Things

1. **Storage mints the idempotency key, not the core.** `PreparedDelivery` carries no key. The loop `append` computes `ntf:${eventId}:${recipientId}:${channel}` (fixture.ts:269) and SQL does the same (migration line 225). The worker reads the key off the pending row and passes it to the provider unchanged (notifications.ts:218–219, 345).
2. **In-app deliveries never reach a provider.** The pass itself records `accepted` for them (notifications.ts:340–342). "Sent" for an in-app row means the worker processed it.
3. **`attempts` counts worker passes, not provider sends.** A pass that touched only an in-app delivery increments it. The suite reads both this counter and the provider trace because they can disagree (contract.ts:106–114; AT-016.11 checks both).
4. **`'failed'` is declared but never assigned.** `NotificationState` includes it (notifications.ts:74) and the database enum includes it (migration line 39), but no code path writes it. A permanently refusing provider leaves rows at `'retrying'` forever.
5. **`drain()` with no bound has no cap and no backoff.** It loops while `pending()` is non-empty. Against a provider that never accepts, `pending()` never empties and the drain never returns. The suite avoids this by using `{passes: 1}` where it needs to observe an unconfirmed state, and by clearing the fault before the run-to-quiescence drain.
6. **Nothing claims or locks a pending row.** `pending()` is a plain `select` (live.ts:324–350) and `apply_delivery_results` is a plain `update`. Two concurrent worker passes could hand the same row to the provider. The uniqueness constraints stop a duplicate row, not a duplicate send. The physical duplicate protection is the provider key: the loop sim dedupes by `[eventId, recipientId, channel]`, and the live path dedupes by asking Mailpit whether the key arrived (`withIdempotentReplay`, provider-faults.ts:91–103). Product SMTP itself has no idempotency. A production worker calling bare `createSmtpProvider` would re-send after `no_ack`.
7. **The migration comment about provider idempotency is aspirational on the live path.** Migration lines 31–35 say "the provider's own idempotency on the key is what stops a duplicate". At the integration tier that "provider" is the test wrapper plus Mailpit, not SMTP.
8. **The crash fault is an argument of the producer call, not a control table.** `p_induce_fault` travels into `fixture_commit_transition_and_emit` (migration 121000, lines 33–59). The reach is witnessed on both sides: the product takes `nextval` before raising (not transactional), and the adapter counts refusals carrying the raise's `detail`; `createCrashSwitch` throws if the two counts disagree (live.ts:267–289). The loop count is incremented at the reach, not at arming (fixture.ts:179–189).
9. **The loop crash restores the previous transition value, not absence.** An earlier firing of the same event must survive (fixture.ts:218–240). `conformance.selftest.ts` asserts the survivor of a crashed emit is still `event-1`.
10. **Taxonomy metadata the core ignores.** `tone` is only echoed by `taxonomy()` (notifications.ts:367) and drives no decision; the low-tone behavior comes from `channels: ['inapp']`. `payloadKeys`, `guarded`, and `escalation` are read only by the suite and the fixture producers. `renderCopy`'s named text is keyed by event name, not by `payloadKeys`.
11. **The taxonomy has two independent copies, compared two ways.** The product `TAXONOMY` (notification-taxonomy.ts) is the implementation; the suite `TAXONOMY` (tests/at/suites/req-016/taxonomy.ts) is the spec oracle. AT-016.02 compares the registered event names (through `sut.taxonomy()`) against the suite list and runs the source-text oracle `taxonomySeedProblems()` comparing the migration seed with the product const. Recipients, channels, and payloads are checked behaviorally by firing every row (AT-016.03, .05, .06). The header of notification-taxonomy.ts says "AT-016.02 compares them both ways"; the file-level comparison is in fact the seed oracle plus the registered-name comparison, while per-row content is AT-016.03's job.
12. **The taxonomy's class rule is enforced at import.** `assertTaxonomyIsLegal()` runs when the module loads (line 245). An illegal default someone adds throws before any test runs. The database holds only the wire names; the recipients/channels/copy live in TypeScript. The seed and the const can drift, and `taxonomySeedProblems()` is the oracle that catches it.
13. **The provider receipt is durable only at integration.** The loop binding answers `receipt: null` (fixture.ts:328–331). SQL stores `accepted_at` and `provider_receipt` with `coalesce`, so a later pass cannot overwrite the first acceptance. `delivered_by_process` is first-send-wins in both bindings.
14. **SMTP does its own protocol work and delegates content.** No TLS, no STARTTLS, no AUTH, no mail library. It implements multi-line reply framing, dot-stuffing, RFC 2047 subject encoding, CRLF line ends, and the `X-Notification-*` headers. The key travels verbatim as `X-Notification-Key`; `Message-ID` carries a sanitized form. `Host`, `port`, `sender`, and timeout come from the constructor; nothing reads an environment variable at module level.
15. **The worker trusts the outbox's ids.** The loop `applyPassResults` throws if a result names a delivery the outbox does not hold (fixture.ts:301); SQL silently updates zero rows and touches no event in that case. The two bindings differ here.
16. **`sut.emit` is a probe, not the normal firing path.** The suite fires registered events through `w.fire`, which calls `core.emit` with `producerPayload`. `sut.emit` is used at AT-016.02 to confirm an unregistered type is rejected (`a-emitter-and-taxonomy.test.ts:55–60`). Even at the integration tier, the event still goes through the TypeScript core's `emit` before it reaches the SQL producer.

### Open Questions

- I did not read `tests/at/harness/registry.ts` in full. I saw the mechanism (tier read at 138–149, `AT_TIER` has no default; `default`/`integration` body selection referenced around line 883) but did not trace the dispatch code line by line.
- Why `'failed'` exists in both the type and the database enum is not stated anywhere I read. No writer assigns it, and no test asserts it.
- What will call `drain`/`runPass` in production is not in this tree. The design notes say real producers will be definers calling `emit_notification` after their own transition, but no worker scheduler or edge function exists at HEAD.
- `taxonomyRow()` (notification-taxonomy.ts:229–231) is exported and unused inside the product; the core uses `taxonomy.rows().find(...)` instead. It may be dead code.
- I did not read the acceptance text beyond the grep excerpts, nor the requirement document `req-016.md`; the suite files quote both.
- The actual value of `[local_smtp] smtp_port` in `supabase/config.toml` is not something I read. `smtpPortFromConfig` (live.ts:101–112) is the single reader of it.
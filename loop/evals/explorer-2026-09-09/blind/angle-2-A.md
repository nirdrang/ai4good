### Components Found

**Core — `supabase/functions/_shared/notifications.ts` (pure, no I/O/clock/Deno, relative imports only):**

- `EMITTER_COMPONENT` (`notifications.ts:38`) — constant `'notifications.emitter'`, stamped on every `PreparedDelivery.emittedBy` and `DeliveryRow.emittedBy`.
- `SENDER_DECLARATIONS` (`notifications.ts:53-58`) — architecture's self-statement of who may send: emitter `canSendDirectly:true`, `blockers.service` / `scope.service` / `lifecycle.service` `false`.
- `NOTIFICATION_COMPONENTS` (`notifications.ts:60-70`) — maps each component to owned path prefixes; the source-scan oracle uses it to attribute a send path to a component.
- `WriteSet` + `WRITE_SET` brand (`notifications.ts:155-168`) — branded type; symbol declared and never exported, so `prepareWriteSet` is the only constructor (type half of "sole writer").
- `prepareWriteSet(row, request, holders)` (`notifications.ts:174-206`) — the one `WriteSet` constructor; resolves channels, clones payload, renders copy, fans out one `PreparedDelivery` per role×channel, refuses unresolved role or email-without-address.
- `OutboxPort` (`notifications.ts:247-257`) — `append(write):{eventId}`, `pending():PendingDelivery[]`, `applyPassResults(results, epoch)`, plus `events/deliveries/opsItems` reads.
- `ProviderPort` (`notifications.ts:259-261`) — `deliver(message:OutgoingMessage):ProviderAnswer`.
- `DirectoryPort` (`notifications.ts:263-266`) — `resolve(roles):Partial<Record<Role,RoleHolder>>`, read at emit time, never at send time.
- `TaxonomyPort` (`notifications.ts:268-271`), `ClockPort` (`273-275`), `ProcessPort` (`277-280`, `epoch()` = delivery-process identity, restart = new identity).
- `TAXONOMY_PORT` (`notifications.ts:296-299`) — `rows:()=>TAXONOMY`, `documentedDefaults`, the only taxonomy either binding uses.
- `createNotifications(deps)` (`notifications.ts:332-434`) — builds `Notifications`: `senders/taxonomy/documentedDefaults/runtimeRegistrationSurface/emit/runPass/drain/events/deliveries/opsItems/threadCommentGuard`.
- `runPassOver(pending)` (`notifications.ts:335-357`, closure inside `createNotifications`) — the worker pass; in-app short-circuit vs `provider.deliver`, then one `outbox.applyPassResults`.
- `PendingDelivery` (`210-220`, carries `idempotencyKey` read off the row), `ProviderOutcome` (`222`: `'accepted'|'rejected'|'no_ack'`), `ProviderAnswer` (`224-229`), `PassResult` (`231-235`), `OutgoingMessage` (`237-245`: `key/to/subject/body/eventId/recipientId/channel`).
- `ThreadCommentGuard` / `threadCommentGuard(config)` (`290-294`, `407-432`) — producer-local anti-spam (`cap/windowMs/coalesce`), clock-driven, not part of emit.

**Taxonomy — `supabase/functions/_shared/notification-taxonomy.ts` (pure data):**

- `TAXONOMY` (`taxonomy:51-123`) — 48-row closed `const`, one per wire event; `channels:null` = bind to class default.
- `channelsFor(row)` (`209-211`) — effective channels: named channels or `DEFAULT_BY_CLASS[row.class].channels`.
- `DEFAULT_BY_CLASS` (`173-206`) — per-class default + one-sentence `source`; the same table computes behaviour and documentation so they cannot disagree.
- `documentedDefaults()` (`221-227`) — one `{event,channels,source}` per row via `channelsFor`.
- `CLASS_CHANNEL_RULE` (`137-146`) + `channelRuleProblems(row,channels)` (`148-160`) — `money/deadline/blocker/completion/decision` must include `email`; `lowtone` must equal `['inapp']`; `access/other` = `{}` (no rule).
- `assertTaxonomyIsLegal()` + top-level call (`233-245`) — import-time validator; throws on duplicate event or class-rule violation.
- `taxonomyRow(event)` (`229-231`), `TaxonomyRow/Role/Channel/Tone/EventClass` types (`26-49`).

**Copy — `supabase/functions/_shared/notification-copy.ts` (pure):**

- `renderCopy(row,payload)` (`73-84`) — named wording if `NAMED[row.event]`, else general template.
- `NAMED` (`30-71`) — 10 rows with requirement-named payload meaning (e.g. `triage.approved`, `discovery.fit_declined`, `access.key_revoked`, `pm_item.status_auto_reverted`).
- `eventInWords(event)` (`20-23`) — `blocker.aging_48h` → `Blocker aging 48h`; general subject; body = lead sentence + every non-empty payload string.

**Provider — `supabase/functions/_shared/notification-provider.ts` (the one product I/O exception):**

- `createSmtpProvider(options)` (`206-210`) — `ProviderPort` over SMTP; `SmtpProviderOptions` (`31-38`): `host/port/sender/timeoutMs` as constructor args, no module-level env read, no DB.
- `deliverOverSmtp(options,message)` (`178-204`) — whole-exchange timeout via `Promise.race` + `setTimeout`; `SmtpRefusal` → `rejected`, any other error/timeout/close → `no_ack` (never pretends).
- `exchange(session,options,message)` (`167-176`) — `220 → EHLO → MAIL FROM → RCPT TO → DATA → <bytes>\r\n. → 250=accepted`; `QUIT` fire-and-forget; receipt = `{code, reply, messageId}`.
- `SmtpSession` (`53-118`) — `command/nextReply/drain/takeReply`; multiline reply complete at first line matching `/^\d{3}( |$)/`, code = first 3 digits.
- `renderMessage/maxIdFor/encodedHeader/expectReply/connect` (`120-165`) — headers, dot-stuffing, subject encoding, dial.

### Flow

One event (e.g. `blocker.raised`) from emit call to a delivery row marked `sent`:

1. **Entry: `Notifications.emit(request)`** (`notifications.ts:374-381`). Caller is a test world `fire(event,params)` (`_fixture.ts:130-133`, `_live.ts:211-215`) via `fireThroughCore` → `core.emit({event, actor:null, params:producerPayload(...)})` (`_fixture.ts:110-114`). No production cron/edge entry point exists in these four files; the worker is driven by `runPass/drain` (see step 5). Rejection path: `taxonomy.rows().find(candidate.event===request.event)` misses → `{accepted:false, reason:'unregistered event type'}` with no storage touch.
2. **Recipient resolution (emit time, frozen thereafter):** `await directory.resolve(row.recipients)` (`notifications.ts:377`). Loop: open world's actors/addresses (`_fixture.ts:335-344`). Live: SQL — NGO = org seat holder, volunteer = project's `assigned_volunteer_id`, admin/ex-volunteer = world record, addresses from `auth.users` (`_live.ts:437-465`).
3. **Decision (pure, before any transaction):** `prepareWriteSet(row, request, holders)` (`notifications.ts:378` → `174-206`):
   - `channelsFor(row)` (`notification-taxonomy.ts:209`) resolves `null` via `DEFAULT_BY_CLASS`.
   - `payload = {...request.params}` cloned; `renderCopy(row,payload)` (`notification-copy.ts:73`) picks `NAMED` wording or `eventInWords` + payload strings.
   - Per `role` in `row.recipients`: throw if `holders[role]` missing; throw if `channels` includes `email` and `holder.address===null`; push `ResolvedRecipient`; fan out one `PreparedDelivery` per channel with `emittedBy: EMITTER_COMPONENT`, cloned payload, `subject/body` from copy. Plus `opsItem:{kind:event,detail:{}}` iff `row.opsItem`.
4. **Atomic store: `await outbox.append(write)`** (`notifications.ts:379`) → returns `{eventId}` → `{accepted:true, eventId}`. Core stores nothing; atomicity is the port contract ("producer transition + write set as one unit"). Loop impl (`_fixture.ts:230-276`): commit `transitions` map → fault point → mint `event-N`, push event row (`pending`, `attempts:0`, frozen recipients), push `delivery-N` rows (`pending`, `deliveredByProcess:null`, `idempotencyKey: ntf:<eventId>:<recipientId>:<channel>`), push `ops-N` iff `write.opsItem`. Live impl (`_live.ts:304-322`): one SQL call `fixture_commit_transition_and_emit(scopeId, write-json, induce-fault-bool)` which runs the transition then `emit_notification(write)` in the same transaction; DB `emit_notification` (`migration 20260913120000:191-236`) inserts event, per-delivery rows (key built as `'ntf:'||event_id||':'||recipient||':'||channel`), ops item, returns uuid.
5. **Worker pass: `runPass()` / `drain(opts)`** (`notifications.ts:383-401`). `runPass = runPassOver(await outbox.pending())`. `drain` loops `pending()` → `runPassOver` to quiescence (or `passes` bound, validated as integer ≥1). `pending()` = all rows `state<>'sent'`, oldest first, with everything a send needs (`_fixture.ts:278-290`, `_live.ts:324-350`, migration index `notification_deliveries_unsent_idx`).
6. **Provider call — the only place it happens: `runPassOver`** (`notifications.ts:335-357`):
   - `if (delivery.channel!=='email') results.push({id, outcome:'accepted', receipt:null})` — in-app never reaches the provider; the pass records acceptance itself.
   - Else `await provider.deliver({key:idempotencyKey, to:address??'', subject, body, eventId, recipientId, channel})` (`344-352`) → `results.push({id, outcome:answer.outcome, receipt:answer.receipt})`. Product provider = `createSmtpProvider(...).deliver → deliverOverSmtp → connect → exchange` (see Components). Loop binds `provider` to harness email simulator (`_fixture.ts:327-332`); live binds to `createSmtpProvider({host from mailUrl, port from config.toml, sender, timeoutMs:10000})` wrapped in `withIdempotentReplay` + `bindProviderFaults` decorator (`_live.ts:469-476`, `_provider-faults.ts:91-147`).
7. **State transition: `await outbox.applyPassResults(results, proc.epoch())`** (`notifications.ts:355`) — one call, one unit. Loop (`_fixture.ts:297-317`) and DB (`apply_delivery_results`, migration `244-285`) share semantics: per result `accepted` → delivery `sent` (+ `deliveredByProcess=coalesce(existing,epoch)`, `accepted_at`, `provider_receipt` in DB; first-send-owns-stamp in memory), else → `retrying`; then per touched event `attempts+=1`, event `sent` iff no delivery remains `<> 'sent'` else `retrying`. `NotificationState` = `pending|retrying|sent|failed` (`notifications.ts:74`, DB enum migration:39) but neither binding ever writes `failed` — observed states are `pending → retrying ↔ sent`.
8. **Reads:** `events/deliveries/opsItems(filter)` delegate to `outbox` (`notifications.ts:403-405`); live scopes every read to the world's actor ids (`_live.ts:356-432`).

### Files Read

- `supabase/functions/_shared/notifications.ts` — ports, `WriteSet`, `prepareWriteSet`, `createNotifications` (emitter + worker pass).
- `supabase/functions/_shared/notification-taxonomy.ts` — 48-row table, class rule, defaults, import-time check.
- `supabase/functions/_shared/notification-copy.ts` — subject/body rendering.
- `supabase/functions/_shared/notification-provider.ts` — raw SMTP `ProviderPort`.
- `tests/at/suites/req-016/_fixture.ts` — loop binding (memory outbox, simulator provider, fixture directory, crash switch, `processEpoch`).
- `tests/at/suites/req-016/_live.ts` — integration binding (SQL outbox, product SMTP at catcher, SQL directory, fault decorators).
- `tests/at/suites/req-016/_source-scan.ts` — `providerClientImporters/taxonomySeedProblems/strayNotificationWriters` oracles.
- `tests/at/suites/req-016/_provider-faults.ts` — `withIdempotentReplay` + `bindProviderFaults` (`reject`/`lose_ack`).
- `tests/at/suites/req-016/_contract.ts` — `NotificationsSut`/`World` seam (incl. `attempts` = worker passes, not sends).
- `tests/at/suites/req-016/taxonomy.ts` — suite's independent spec oracle + `CLASS_CHANNEL_RULE/PAYLOAD_PREDICATES`.
- `tests/at/suites/req-016/_bind.ts` — suite registration (context only).
- `supabase/migrations/20260913120000_notification_taxonomy_and_outbox.sql` — closed vocabularies, outbox tables/constraints, `emit_notification`, `apply_delivery_results`, privilege posture.

### Boundaries

- **In:** `EmitRequest{event,actor,params}` from a producer (currently fixture producers via `producerPayload`; real `blockers/scope/lifecycle` services declare `canSendDirectly:false` and hold no send path); `DirectoryPort.resolve` (actors/addresses); `TaxonomyPort` (the 48 rows); `ClockPort` (guard only); `ProcessPort.epoch`.
- **Out:** `OutboxPort` writes/reads (memory arrays at loop; `notification_events/deliveries/ops_items` + `emit_notification/apply_delivery_results` at integration); `ProviderPort.deliver` → SMTP to catcher (live) or simulator (loop); reads `events/deliveries/opsItems/senders/taxonomy/documentedDefaults`.
- **Suite tiers, same core:** loop (`_fixture.ts`) binds six ports to memory + simulator + controlled clock; integration (`_live.ts`) binds the same six ports to the one local stack over SQL + product SMTP + wall clock. Header comment (`notifications.ts:4-9`, `_fixture.ts:5-14`, `_live.ts:5-18`): loop green = decisions right; integration green additionally = schema/definers/privileges/SMTP path behave.
- **Enforcement boundary:** DB holds only wire names (`notification_event_types` seed, FK target); recipients/channels/class/copy live only in TypeScript. Privilege half: tables revoked from `anon/authenticated/service_role`, both functions `security definer` with execute revoked (migration:170-176,237,286); schema half: `emitted_by='notifications.emitter'` check + two delivery uniques + email-requires-address check (migration:139-142); type half: `WRITE_SET` brand.

### Non-Obvious Things

- **Deciding is separated from writing on purpose** (`notifications.ts:11-16`): core cannot run in a DB transaction, so `emit` prepares the whole `WriteSet` pure and `append` applies producer transition + write set in one call. The crash fault sits inside `append` between the two; core never learns faults exist.
- **The brand is the sole-writer type** (`18-21`, `155-157`): unexported `WRITE_SET` symbol, `prepareWriteSet` sole constructor, `append` takes nothing else. A second sender needs an explicit cast — a decision, not a mistake.
- **`notification-provider.ts` is the documented exception** to "`edge.ts` is the only I/O module in `_shared`" (header `1-8`): the send path lives in product so AT-016.01's source scan counts a real file; the live adapter constructs it pointed at the catcher rather than reimplementing it.
- **In-app never touches the provider** (`notifications.ts:338-342`): the pass synthesizes `accepted`. Hence `attempts` (worker passes) can exceed physical sends — stated explicitly in `_contract.ts:106-114`.
- **`idempotencyKey` is read off the row, never derived in the pass** (`PendingDelivery` comment `218-219`): `ntf:<eventId>:<recipientId>:<channel>`, unique-constrained in DB, carried as `X-Notification-Key` verbatim and as sanitized `Message-ID` (`notification-provider.ts:20-23,140-155`). A retry must re-reach the provider; dedup is the key (live: `withIdempotentReplay` catcher check), not a skipped call or stored receipt (`_provider-faults.ts:7-21`, migration:31-35).
- **`no_ack` is silence, not refusal** (`ProviderAnswer` comment `225`): timeout/refused connection/early close. Both `rejected` and `no_ack` map to `retrying`; only `accepted` maps to `sent`. `lose_ack` fault sends then answers `no_ack`, forcing a provider-visible retry.
- **First send owns the stamp** (`_fixture.ts:292-296`, migration `260-261`): `deliveredByProcess=coalesce(existing,epoch)`; re-stamping would record the last drain, not the actual sender. `null` = no process has sent yet.
- **`runtimeRegistrationSurface()` returns `[]`** (`notifications.ts:372`) because there is no add path — closed `const` array by construction, not a flag.
- **Taxonomy duplicated by design:** product `TAXONOMY` vs suite oracle `tests/at/suites/req-016/taxonomy.ts` vs DB seed of bare names; AT-016.02 + `taxonomySeedProblems()` compare both ways so drift is red.
- **`'failed'` exists in the enum/type but is never written** by either `applyPassResults`; terminal failure semantics are unasserted in what was read.
- **Live fault counting uses two witnesses** (`_live.ts:34-43,267-293`): `nextval` on `notification_fault_triggers` (survives rollback) vs adapter refusals carrying the raise's `detail`; `triggerCount` refuses when they differ.

### Open Questions

- **Production driver of the worker:** `runPass/drain` are invoked by the suite (`drainDeliveries`); I found no cron, queue trigger, or edge route in the four application-layer files that drives `runPassOver` in production. Where the live worker is scheduled is not determined from this slice.
- **Real producers:** `blockers/scope/lifecycle` services are declared (`canSendDirectly:false`) but the actual definer calls (`fixture_commit_transition_and_emit` is the fixture stand-in) and their payload wiring were not traced in this slice.
- **`failed` state transition:** the condition (if any) under which an event/delivery becomes `failed` rather than staying `retrying` is not defined in the core, both bindings, or the migration body read here.
- **SMTP specifics beyond the code:** TLS/STARTTLS and AUTH are absent from `notification-provider.ts` (plain `node:net` socket, no `node:tls` import); whether the catcher/local stack requires them, and the exact `smtp_port` value in `supabase/config.toml`, were not verified beyond the reader function (`_live.ts:101-112`).

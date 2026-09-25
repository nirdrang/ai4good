The application layer is a ported TypeScript core with two bindings. There is no product edge function that emits or drains; the suite adapters are the only callers at HEAD of main.

### Components Found

- **`createNotifications` / `Notifications`** — `supabase/functions/_shared/notifications.ts` (332–434). The one emitter and one worker. Pure: no I/O, no clock, no Deno. Both AT bindings construct this same object.
- **`NotificationDeps` / six ports** — same file (247–310). `TaxonomyPort`, `OutboxPort`, `ProviderPort`, `DirectoryPort`, `ClockPort`, `ProcessPort`. The core decides; the ports write, send, resolve, and time.
- **`WriteSet` + unexported `WRITE_SET` brand** — same file (155–168, 174–206). Compile-time sole-writer type. Only `prepareWriteSet` constructs it. `OutboxPort.append` takes nothing else.
- **`prepareWriteSet`** — same file (174–206). Resolves channels, clones payload, renders copy, fans out one `PreparedDelivery` per role×channel, stamps `emittedBy: 'notifications.emitter'`. Throws if a role has no holder or an email delivery has no address.
- **`EmitRequest` / `EmitOutcome`** — same file (121–129). `emit` returns `{ accepted: false, reason: 'unregistered event type' }` for unknown events; otherwise `{ accepted: true, eventId }`. Missing directory data throws, it does not return a soft reject.
- **`runPassOver` (closure inside `createNotifications`)** — same file (335–357). One worker pass: in-app is accepted locally; email calls `provider.deliver`; then `outbox.applyPassResults(results, process.epoch())`.
- **`NotificationState`** — same file (74): `'pending' | 'retrying' | 'sent' | 'failed'`. Product writers only ever set pending → retrying or sent. `'failed'` is on the type and the SQL enum and is never assigned.
- **`TAXONOMY` / `TaxonomyRow`** — `supabase/functions/_shared/notification-taxonomy.ts` (51–123). Forty-eight closed rows. Recipients, channels, class, tone, payload keys, `guarded` / `opsItem` / `escalation` flags.
- **`channelsFor` / `DEFAULT_BY_CLASS` / `CLASS_CHANNEL_RULE`** — same file (137–211). Named channels win; otherwise the class default. Critical classes default to `['email','inapp']`; `lowtone` and `other` default to `['inapp']`.
- **`assertTaxonomyIsLegal`** — same file (233–245). Runs at import. Duplicate event names or class-rule violations throw and the module does not load.
- **`renderCopy` / `NAMED`** — `supabase/functions/_shared/notification-copy.ts`. Ten events have named subject/body templates. Every other event uses `eventInWords` plus every non-empty string in the payload.
- **`createSmtpProvider` / `deliverOverSmtp` / `SmtpSession`** — `supabase/functions/_shared/notification-provider.ts`. The one product `ProviderPort` over SMTP. The documented `_shared` I/O exception.
- **`TAXONOMY_PORT`** — `notifications.ts` (296–299). The only taxonomy either binding uses.
- **`SENDER_DECLARATIONS` / `NOTIFICATION_COMPONENTS`** — `notifications.ts` (53–70). Architecture self-report for AT-016.01. Emitter may send; `blockers.service`, `scope.service`, `lifecycle.service` may not. Path prefixes map files to components for the source scan.
- **`threadCommentGuard`** — `notifications.ts` (407–432). Producer-side, not inside `emit`. Cap / coalesce / window. Uses `ClockPort` only.
- **`public.emit_notification` / `public.apply_delivery_results`** — `supabase/migrations/20260913120000_notification_taxonomy_and_outbox.sql` (191–289). Security-definer SQL writer and worker apply. Execute revoked from public; granted to nobody.
- **`public.fixture_commit_transition_and_emit`** — `supabase/migrations/20260913121000_notification_fixture_producers.sql` (33–59). Stand-in producer: transition, optional fault, then `emit_notification`, one transaction.
- **Loop outbox / provider / directory** — `tests/at/suites/req-016/_fixture.ts`. Memory arrays; harness email simulator; current world’s actors.
- **Live outbox / provider / directory** — `tests/at/suites/req-016/_live.ts`. SQL definers; product SMTP pointed at Mailpit; org seat + project volunteer + world admin/ex-volunteer.
- **`withIdempotentReplay` / `bindProviderFaults`** — `tests/at/suites/req-016/_provider-faults.ts`. Live-only wrappers around the product SMTP port. Not product code.
- **`providerClientImporters` / `strayNotificationWriters` / `taxonomySeedProblems`** — `tests/at/suites/req-016/_source-scan.ts`. Text oracles over `supabase/functions`, `supabase/migrations`, `src`.

### Flow

End-to-end path for one registered event, e.g. `access.key_issued` (volunteer, email + in-app), from `w.fire` to a delivery row marked `sent`.

**1. Test / producer entry**

- Loop: `NotificationFixtureWorld.fire` (`_fixture.ts` 130–133) → `fireThroughCore` (110–114) → `core.emit({ event, actor: null, params: producerPayload(...) })`.
- Live: `NotificationLiveWorld.fire` (`_live.ts` 211–215) → same `core.emit`.
- Direct probe: `sut.emit({ type })` (`_fixture.ts` 360–361 / `_live.ts` 491–492) maps `type` → `event`. Used for unregistered-type rejection (AT-016.02).
- `producerPayload` (`_fixture-producers.ts` 26–31) fills named payload keys. Fixture data, not emitter behaviour.

There is no product edge function, cron, or HTTP handler that calls `createNotifications`, `emit`, `runPass`, or `drain`. At HEAD of main the AT adapters are the only callers.

**2. `Notifications.emit`** (`notifications.ts` 374–381)

1. `taxonomy.rows().find` — `TAXONOMY_PORT.rows()` returns the product `TAXONOMY`. Miss → `{ accepted: false, reason: 'unregistered event type' }`. No write.
2. `directory.resolve(row.recipients)` — emit-time snapshot, never at send time.
   - Loop (`_fixture.ts` 335–344): current world’s `actors[role]` and `addresses[role]`.
   - Live (`_live.ts` 437–464): NGO from `org_memberships` for this world’s org; volunteer from `projects.assigned_volunteer_id`; `platform_admin` / `ex_volunteer` from the world record; email from `auth.users`.
3. `prepareWriteSet(row, request, holders)` (174–206):
   - `channelsFor(row)` (taxonomy.ts 209–211): named channels, else `DEFAULT_BY_CLASS[row.class].channels`.
   - `renderCopy(row, payload)` (notification-copy.ts 73–84).
   - For each taxonomy role: require a holder; if channels include `email`, require `address !== null`.
   - Push one `ResolvedRecipient` (role, id, address, channels frozen).
   - For each channel: one `PreparedDelivery` with `emittedBy: EMITTER_COMPONENT`, cloned payload, same subject/body.
   - If `row.opsItem`: `{ kind: row.event, detail: {} }`, else `null`.
4. `outbox.append(write)` — the transaction boundary. Core never opens a transaction and never sees faults.

**3. `OutboxPort.append` — store the write set**

Loop (`_fixture.ts` 230–276):

1. Mark `state.transitions.set(event, true)` (stand-in ledger).
2. If crash armed at `notifications.between_transition_and_event_write`: restore previous transition, increment reach, throw. No event id, no deliveries, no ops item.
3. Else mint `event-${n}`, push event `pending` / attempts 0, one stored delivery per prepared delivery with `idempotencyKey = ntf:${eventId}:${recipientId}:${channel}`, optional ops item.

Live (`_live.ts` 304–322):

1. `select public.fixture_commit_transition_and_emit(scope, write::jsonb, armed)`.
2. SQL (`fixture_commit_transition_and_emit`, producers migration 43–57): upsert `notification_fixture_transitions` committed=true; if `p_induce_fault` then `nextval(notification_fault_triggers)` and `raise exception`; then `return public.emit_notification(p_write)`.
3. SQL `emit_notification` (outbox migration 191–235): insert `notification_events` (uuid, payload, frozen recipients JSON); for each delivery insert `notification_deliveries` with `idempotency_key = 'ntf:' || event_id || ':' || recipientId || ':' || channel`; if `opsItem` is a JSON object, insert `notification_ops_items`. Check `emitted_by = 'notifications.emitter'`. Unique `(event_id, recipient_id, channel)` and unique `idempotency_key`.

The TypeScript `WriteSet` brand is erased at `JSON.stringify`. SQL trusts the JSON document plus table checks.

**4. Worker: `drain` / `runPass`** (`notifications.ts` 335–400)

Tests call `sut.drainDeliveries({ passes? })` → `core.drain`. Default: loop until `outbox.pending()` is empty. `passes: 1` is how AT-016.11 observes `retrying` before a later pass.

`runPassOver(pending)`:

- `pending` = deliveries with `state <> 'sent'`, oldest first on live (`created_at, id`).
- Non-email: push `{ outcome: 'accepted', receipt: null }`. No provider call.
- Email: `provider.deliver({ key: idempotencyKey, to: address ?? '', subject, body, eventId, recipientId, channel })`.
- Then one `applyPassResults` for the whole pass, with `ProcessPort.epoch()`.

**5. Where the provider is actually called**

Only here: `runPassOver` → `provider.deliver` (`notifications.ts` 344–352). In-app never reaches it.

Loop provider (`_fixture.ts` 327–332): `vendors.email.deliver({ recipientId, eventId, channel })` → harness `createEmailProviderSim` (`tests/at/harness/vendors.ts` 95–120). Identity `JSON.stringify([eventId, recipientId, channel])`. Forced `rejected` / `ack_lost` from a queue; default `accepted`. A previously accepted identity replays as `accepted` and does not consume a forced outcome. `ack_lost` is recorded on the sim and returned to the core as `no_ack`. Receipt is always `null`.

Live provider stack (`_live.ts` 469–480):

`createSmtpProvider({ host: mailUrl hostname, port: config.toml [local_smtp].smtp_port (44325), sender: notifications@ai4good.local, timeoutMs: 10000 })`
→ `withIdempotentReplay(smtp, stack)` (`_provider-faults.ts` 91–103): if Mailpit already holds this `X-Notification-Key` for `message.to`, return `{ accepted, receipt: { replayed: true, key } }` and do not send
→ `bindProviderFaults` (105–147): one-shot `reject` (does not call inner) or `lose_ack` (calls inner, then answers `no_ack` with no stored receipt).

Product SMTP (`notification-provider.ts` 178–209) `deliverOverSmtp`:

1. Race connect + exchange against `timeoutMs`. Late connect is closed (`connecting.then` if `settled`).
2. `connect` → `node:net.createConnection` → `SmtpSession`.
3. `exchange` (166–176): wait 220; `EHLO notifications.ai4good.local` expect 250; `MAIL FROM:<sender>` 250; `RCPT TO:<to>` 250 or 251; `DATA` 354; body + `\r\n.` expect 250; fire-and-forget `QUIT`.
4. `renderMessage` (145–165): From/To/Subject (RFC 2047 `=?utf-8?B?...?=` if non-ASCII), `Message-ID` from key with non `[A-Za-z0-9.-]` replaced by `.`, `X-Notification-Key/Event-Id/Recipient-Id/Channel`, Date via `new Date().toUTCString()` (wall clock, not `ClockPort`), MIME text/plain utf-8 8bit, CRLF, dot-stuffing.
5. Outcomes: final 250 → `accepted` with `{ code, reply, messageId }`; `SmtpRefusal` (4xx/5xx on any command) → `rejected`; timeout, connect fail, or close before reply → `no_ack`.

What SMTP does itself vs delegates:

- Itself: SMTP dialogue, multiline reply parse (`takeReply`, complete at `ddd` + space), command/response, DATA terminator, headers, encoded-word, Message-ID sanitization, notification headers, dot-stuffing, timeout race, outcome mapping.
- Delegates: TCP to `node:net.Socket`; base64 to `node:buffer.Buffer`; Date header to JS `Date`.
- Does not: AUTH, STARTTLS/TLS, pipelining, connection reuse (one connection, one message), SMTP-level idempotency.

**6. Mark sent** — `OutboxPort.applyPassResults`

Loop (`_fixture.ts` 297–317): `accepted` → `state = 'sent'`, first-wins `deliveredByProcess = epoch`; else `state = 'retrying'`. Touched events: `attempts += 1`; event `sent` iff every delivery of that event is `sent`, else `retrying`.

Live (`_live.ts` 352–354) → `public.apply_delivery_results` (outbox migration 244–284): same rules in one SQL function. On accept also `accepted_at = coalesce(accepted_at, now())` and `provider_receipt = coalesce(new, old)`. First process stamp wins (`coalesce(delivered_by_process, p_epoch)`).

`pending()` is `state <> 'sent'`, so `retrying` is retried. Unbounded `drain()` loops until every delivery is `sent`. There is no max-attempt, no backoff, and no transition to `'failed'`.

**Named functions on the path (email delivery, live, happy path)**

`NotificationLiveWorld.fire` → `producerPayload` → `Notifications.emit` → `taxonomy.rows` → `DirectoryPort.resolve` → `prepareWriteSet` → `channelsFor` → `renderCopy` → `OutboxPort.append` → `fixture_commit_transition_and_emit` → `emit_notification` → (later) `Notifications.drain` → `outbox.pending` → `runPassOver` → `ProviderPort.deliver` → `bindProviderFaults.deliver` → `withIdempotentReplay.deliver` → `createSmtpProvider.deliver` → `deliverOverSmtp` → `connect` → `SmtpSession` → `exchange` → `expectReply` / `command` / `renderMessage` / `messageIdFor` / `encodedHeader` → `outbox.applyPassResults` → `apply_delivery_results`.

### Files Read

- `supabase/functions/_shared/notifications.ts`
- `supabase/functions/_shared/notification-taxonomy.ts`
- `supabase/functions/_shared/notification-copy.ts`
- `supabase/functions/_shared/notification-provider.ts`
- `supabase/migrations/20260913120000_notification_taxonomy_and_outbox.sql`
- `supabase/migrations/20260913121000_notification_fixture_producers.sql`
- `supabase/config.toml` (`[local_smtp]` only)
- `tests/at/suites/req-016/_fixture.ts`
- `tests/at/suites/req-016/_live.ts`
- `tests/at/suites/req-016/_contract.ts`
- `tests/at/suites/req-016/_source-scan.ts`
- `tests/at/suites/req-016/_provider-faults.ts`
- `tests/at/suites/req-016/_fixture-producers.ts`
- `tests/at/suites/req-016/_integration.ts`
- `tests/at/suites/req-016/_bind.ts`
- `tests/at/suites/req-016/_mail-witness.ts`
- `tests/at/suites/req-016/taxonomy.ts` (oracle table + class rule)
- `tests/at/suites/req-016/a-emitter-and-taxonomy.test.ts`
- `tests/at/suites/req-016/b-delivery-defaults.test.ts`
- `tests/at/suites/req-016/c-reliability-guard.test.ts`
- `tests/at/harness/vendors.ts`
- `tests/at/harness/index.ts` (adapter load / tier split)
- `tests/at/harness/suite-adapters.ts` (req-016 registration)

### Boundaries

**In**

- Taxonomy: closed `TAXONOMY` const + DB seed of wire names only (`notification_event_types`). Recipients/channels/class/copy are TypeScript, not SQL.
- Directory: role → account id + email, read at emit.
- Producer context: `EmitRequest.params` frozen onto event and every delivery.
- Clock: only `threadCommentGuard`. Emit/drain/SMTP Date do not use `ClockPort`.
- Process epoch: stamped on first successful send.
- Live crash arm: boolean argument to the producer definer, not a control table.
- Live provider faults: decorator outside product send code.

**Out**

- Event row, N delivery rows, optional ops item.
- Email: SMTP to Mailpit (integration) or harness sim (loop).
- In-app: delivery row `sent` with no provider. RLS on `notification_deliveries` lets the recipient `select` own in-app rows (`recipient_id = auth.uid()`). Nothing in this tree reads that policy yet.
- Catcher headers: `X-Notification-Key`, `X-Notification-Event-Id`, `X-Notification-Recipient-Id`, `X-Notification-Channel`, `Message-ID`.

**Who may import a provider client, and how that is enforced**

Not a TypeScript visibility rule. Enforcement is AT-016.01 via `providerClientImporters()` (`_source-scan.ts` 127–140):

- Scan `supabase/functions`, `supabase/migrations`, `src` for `\bdeliver\b\s*\(`, `\bProviderPort\b`, imports of `node:net` / `node:tls` / nodemailer / resend / postmark / sendgrid / mailgun / smtp*, and credential names (`RESEND_API_KEY`, `SMTP_PASSWORD`, …).
- Map path → component through `NOTIFICATION_COMPONENTS`. Undeclared path → `undeclared:<path>`.
- Assertion: the set equals `['notifications.emitter']`. Empty set throws (instrument failure).
- `strayNotificationWriters()`: `insert into public.notification_{events,deliveries,ops_items}` allowed only inside `public.emit_notification`. Product modules must not insert those tables.
- Schema: `emitted_by = 'notifications.emitter'` check.
- Privilege: definers, execute revoked from public and not granted to client or service_role.
- Type: unexported `WRITE_SET` brand.

`notifications.ts` does not import `notification-provider.ts` at runtime; it only lists the path in `NOTIFICATION_COMPONENTS`. The live adapter in `tests/at` imports `createSmtpProvider`; `tests/` is outside `PRODUCT_ROOTS`, so the scan does not count it. `notifications.ts` itself matches `deliver(` and `ProviderPort`; both files belong to `notifications.emitter`.

**Taxonomy validation, when**

1. Import time: `assertTaxonomyIsLegal()` (taxonomy.ts 245) — unique events + `channelRuleProblems(row, channelsFor(row))`.
2. AT-016.02: product `TAXONOMY` event set equals suite oracle `tests/at/suites/req-016/taxonomy.ts`; `taxonomySeedProblems()` compares product events to the migration seed both ways; `runtimeRegistrationSurface()` must be `[]`; unregistered `sut.emit` is rejected and writes nothing.
3. Class rule is duplicated in the suite oracle; AT-016.03/05/06 use the suite copy, not the product function.

**Loop vs integration (same core)**

- `createHarness` (`tests/at/harness/index.ts` 227–249): `tier === 'loop'` loads `_fixture.ts` with `ControlledClock` + `createEmailProviderSim`; otherwise loads `_live.ts` with `stackFromEnv()` and refuses `vendors.email`.
- Loop green: decisions against oracles. No schema, definers, RLS, or SMTP.
- Integration green: same emitter/taxonomy/copy/worker plus SQL, privileges, SMTP, Mailpit.
- Some ids share a body; AT-016.01 / .08 / .11 fork the procedure (`_integration.ts`) because the out-of-band witness differs (sim vs catcher; commanded clock vs real time).

### Non-Obvious Things

- **Deciding is separated from writing on purpose.** The core cannot run inside a DB transaction. Atomicity is `OutboxPort.append` applying producer transition + write set as one unit. The core never learns faults exist.
- **`'failed'` is dead.** Enum and TypeScript union include it. `apply_delivery_results` and the memory outbox never set it. Unbounded `drain()` retries `retrying` forever.
- **SMTP has no idempotency.** Product sender always sends. Loop de-dupe is the harness sim’s identity set. Live de-dupe is `withIdempotentReplay` asking Mailpit. Migration comment says “the provider’s own idempotency on the key”; at HEAD that key is honoured by the adapter + catcher, not by SMTP.
- **`accepted_at` / `provider_receipt` are not a skip-on-retry.** Comment in the migration: a crash after accept and before the sent mark leaves a receipt; a retry must still reach the provider; the key stops a duplicate.
- **Idempotency key is minted at persist, not in `prepareWriteSet`.** Formula `ntf:{eventId}:{recipientId}:{channel}`. Worker reads the stored key (`PendingDelivery.idempotencyKey`) and must not re-derive it.
- **`attempts` is worker passes per event, not provider sends.** An in-app-only pass increments it. AT-016.11 checks the SUT counter and the provider trace because they can disagree.
- **First process stamp wins.** Restart after send does not re-stamp. AT-016.07 requires drain to happen after restart while still pending so the post-restart epoch is what gets written.
- **Thread-comment guard is not in `emit`.** `burstThreadComments` calls `allow()` then `fire()`. A direct `emit('thread.comment')` always writes.
- **Stand-in producers, not real ones.** Eleven guarded rows have no payment/key/completion definer. `fixture_commit_transition_and_emit` is the shape a real producer must take. `blockers.ts` / `scope.ts` / `lifecycle.ts` do not call `emit`.
- **Live sentinel seam throws `CapabilityPending`.** Integration bodies read copy through `sut.deliveries()` and Mailpit, not `h.sentinels.scan`.
- **`h.static.providerClientImporters` is a refused harness seam.** The suite calls `_source-scan.ts` directly.
- **SMTP Date uses wall clock.** Loop clock control does not affect the provider (loop does not use SMTP).
- **`takeReply` treats a reply as complete at `^\d{3}( |$)`** (first line whose code is followed by space, i.e. RFC 5321 last line). Continuation `250-…` is accumulated. No AUTH/TLS.
- **WriteSet brand is compile-time only.** Live `JSON.stringify(write)` drops it. SQL checks `emitted_by` and uniques.
- **Live pending/events/deliveries are scoped by this run’s actor ids.** One DB, many worlds; a crashed emit leaves no delivery so no event for that world (atomicity read).

### Open Questions

- I did not find a product scheduler, edge function, or queue that invokes `runPass` / `drain` outside the AT suite. I cannot say how a production process would pick up pending rows after emit.
- I did not find any assignment of `'failed'`, a retry cap, or backoff. I cannot say when (or whether) a permanently rejecting provider is supposed to stop.
- Real domain producers (payments, blockers, lifecycle) do not call `emit` yet. Whether they will call `emit_notification` from their own definers the same way the fixture does is specified in comments, not present as code.
- I did not trace Mailpit’s own handling of duplicate `Message-ID` beyond `withIdempotentReplay`’s HTTP search on `X-Notification-Key`. If that wrapper were removed, I cannot say whether Mailpit would still suppress a second DATA.
- `apply_delivery_results` on an unknown delivery id is a silent no-op in SQL (no `event_id` returned, event not touched). The memory outbox throws. I did not find a test that drives the unknown-id SQL path.
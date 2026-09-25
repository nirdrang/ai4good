Exploration complete. Findings below.

---

## Components Found

### Product core (all in `supabase/functions/_shared/`)

- **`notifications.ts`** — the subsystem's single implementation: one emitter (`emit`), one delivery worker (`runPass`/`drain`), six ports (`OutboxPort`, `ProviderPort`, `DirectoryPort`, `TaxonomyPort`, `ClockPort`, `ProcessPort`), and the sole-writer declarations. Pure TypeScript: no I/O, no clock read, no randomness, no Deno, relative imports only (lines 23–24 header).
  - `createNotifications(deps)` (`notifications.ts:332`) — the factory both bindings construct.
  - `emit` (`notifications.ts:374–381`) — taxonomy lookup → directory resolve → `prepareWriteSet` → `outbox.append`.
  - `runPassOver(pending)` (closure, `notifications.ts:335–357`) — the worker pass: in-app accepted locally, email goes to the provider, then one `outbox.applyPassResults`.
  - `drain(opts)` (`notifications.ts:385–401`) — loop of `outbox.pending()` + `runPassOver` until empty or pass budget (`passes`) exhausted; validates `passes` is an integer ≥ 1.
  - `threadCommentGuard(config)` (`notifications.ts:407–432`) — stateful per-window producer guard (`cap`, `windowMs`, `coalesce`), clock-driven via `ClockPort`.
  - `prepareWriteSet(row, request, holders)` (`notifications.ts:174–206`) — the only constructor of the branded `WriteSet` (brand `WRITE_SET` is a `declare const` unique symbol, never exported, `notifications.ts:155–168`).
  - `WriteSet` — the entire write for one event: event row data + frozen recipients + all `PreparedDelivery` rows + optional ops item.
  - `SENDER_DECLARATIONS` / `NOTIFICATION_COMPONENTS` (`notifications.ts:53–70`) — the architecture's self-report of who may send and which paths each component owns.
  - `TAXONOMY_PORT` (`notifications.ts:296–299`) — the one taxonomy port over this tree's taxonomy, used by both bindings.
  - `runtimeRegistrationSurface()` (`notifications.ts:372`) — returns `[]` always: the closed set has no add path by construction.
- **`notification-taxonomy.ts`** — the closed 48-row event table (`TAXONOMY`, lines 51–123), types `Role`/`Channel`/`Tone`/`EventClass`/`TaxonomyRow`, `CLASS_CHANNEL_RULE` (lines 137–146), `DEFAULT_BY_CLASS` (lines 173–206) with per-class documented `source` strings, `channelsFor(row)` (line 209), `documentedDefaults()` (line 221), `taxonomyRow(event)` (line 229), and `assertTaxonomyIsLegal()` (lines 233–243).
- **`notification-copy.ts`** — `renderCopy(row, payload)` (line 73): 10 named per-event templates (`NAMED`, lines 30–71) plus one general template (subject = event name in words via `eventInWords`, body = joined non-empty string payload values); `Copy` type `{subject, body}`.
- **`notification-provider.ts`** — the one product module that speaks to a mail provider: `ProviderPort` over raw SMTP. `createSmtpProvider(options)` (line 206), `deliverOverSmtp` (lines 178–204), `SmtpSession` (lines 53–118), `exchange` (lines 167–176), `renderMessage` (lines 145–165), `messageIdFor` (line 140), `encodedHeader` (line 136), `SmtpRefusal` (lines 43–51).

### Database (migrations)

- **`supabase/migrations/20260913120000_notification_taxonomy_and_outbox.sql`** — three enums (`notification_state/channel/role`), the seed table `notification_event_types` (48 wire names, shape check on the name, lines 45–101), `notification_events`, `notification_deliveries` (unique `(event_id, recipient_id, channel)` and unique `idempotency_key`, check `emitted_by = 'notifications.emitter'`, check email-has-address, lines 121–143), `notification_ops_items`, the `notification_fault_triggers` sequence, full RLS/revoke posture, and two security-definer functions: `emit_notification(p_write jsonb)` (lines 191–236) and `apply_delivery_results(p_results jsonb, p_epoch text)` (lines 244–285).
- **`supabase/migrations/20260913121000_notification_fixture_producers.sql`** — the stand-in producer `fixture_commit_transition_and_emit(p_scope, p_write, p_induce_fault)` (lines 33–59) over the `notification_fixture_transitions` ledger table, with the fault point inside the transaction.

### Acceptance-suite bindings (the only callers of the core)

- **`tests/at/suites/req-016/_fixture.ts`** — the loop-tier binding: `createFixtureAdapter` binds all six ports to memory (`outbox` = three arrays + transitions map, lines 229–324; `provider` delegates to the harness email sim, lines 327–332; `directory` reads the open world's actors, lines 335–344; controlled clock; restartable epoch string).
- **`tests/at/suites/req-016/_live.ts`** — the integration-tier binding: `createLiveAdapter` binds `OutboxPort` to `fixture_commit_transition_and_emit` / `apply_delivery_results` + scoped operator SQL reads (lines 296–433), `DirectoryPort` to SQL (`org_memberships`, `projects.assigned_volunteer_id`, `auth.users`, lines 437–465), `ProviderPort` to `createSmtpProvider` wrapped in `withIdempotentReplay` then `bindProviderFaults` (lines 469–475), wall clock, random-UUID epoch.
- **`tests/at/suites/req-016/_provider-faults.ts`** — the two provider wrappers stacked outside product SMTP: `withIdempotentReplay` (lines 91–103, Mailpit pre-send check on `X-Notification-Key`) and `bindProviderFaults` (lines 105–147, forced `reject`/`lose_ack` decorator plus the attempt/accepted logs).
- **`tests/at/suites/req-016/_source-scan.ts`** — the three static oracles: `providerClientImporters()` (lines 127–140), `taxonomySeedProblems()` (lines 158–176), `strayNotificationWriters()` (lines 197–229).
- **`tests/at/suites/req-016/_contract.ts`** — `NotificationsSut` (lines 150–171), the suite-facing shape both adapters wrap; `Delivery.deliveredByProcess` semantics (lines 125–132); `NotificationEvent.attempts` semantics (lines 106–114).
- **`tests/at/suites/req-016/_fault-switch.ts`** — `createCrashSwitch<Ledger>` (lines 28–55), the arming object both tiers read immediately before the one write that can crash.
- **`tests/at/suites/req-016/_fixture-producers.ts`** — `producerPayload(event, params)` (lines 26–31): fills a sample value for every `payloadKeys` entry the suite's own taxonomy row names.
- **`tests/at/suites/req-016/_mail-witness.ts`** — `messagesAddressedTo` (lines 85–118): reads Mailpit raw messages, counts physical messages without dedup, extracts `X-Notification-Key` and sibling headers.
- **`tests/at/suites/req-016/_integration.ts`** — `assertEmitterIsSoleWriter` (lines 52–80): the both-tier arms of AT-016.01 including the `providerClientImporters() === ['notifications.emitter']` assertion (lines 62–66).
- **`tests/at/harness/vendors.ts`** — `createEmailProviderSim` (line 65): the loop-tier provider stand-in with two faces (`sim` for the test, `port.deliver` for the SUT), idempotent by JSON-encoded identity (lines 61–63, 106–109), forced-outcome queue, `ack_lost` answered to the sender as `no_ack`.

## Flow

### A. Taxonomy validation — when it happens

1. **At module import, before anything runs.** `assertTaxonomyIsLegal()` is called at module level (`notification-taxonomy.ts:245`). It throws if any event is registered twice (line 236) or if any row's *effective* channels break its class rule via `channelRuleProblems` (lines 238–241: `money`/`deadline`/`blocker`/`completion`/`decision` must include `email`; `lowtone` must equal `['inapp']`; `access`/`other` unconstrained). The header (lines 15–19) states the intent: an illegal documented default is *unconstructable* — module load throws — rather than caught by a test later.
2. **At emit time, again per row.** `channelsFor(row)` resolves `row.channels` (requirement-named) or `DEFAULT_BY_CLASS[row.class].channels`; `documentedDefaults()` computes the per-row channel list from the *same* function the emitter uses, so documentation and behavior are one expression (`notification-taxonomy.ts:209–227`).
3. **Cross-check against the database.** The migration seeds only the 48 wire names into `notification_event_types` (`20260913120000....sql:53–101`); `taxonomySeedProblems()` (`_source-scan.ts:158–176`) parses that seed and compares both ways against `TAXONOMY`, throwing when the seed can't be read. It is asserted empty in AT-016.02 (`a-emitter-and-taxonomy.test.ts:45`).

### B. One event, emit call → delivery row marked sent (integration tier, email channel)

1. **Test body** calls `w.fire('payment.succeeded', params)` → `NotificationLiveWorld.fire` (`_live.ts:211–215`) → `core.emit({ event, actor: null, params: producerPayload(event, params) })`.
2. **`producerPayload`** (`_fixture-producers.ts:26–31`) adds a named sample for every `payloadKeys` entry of the event (e.g. `reason` → "The scope needs a clearer measurable outcome"). This is producer data, deliberately in the test tree.
3. **`createNotifications.emit`** (`notifications.ts:374`):
   a. `taxonomy.rows().find(row => row.event === request.event)` — unknown event → `{ accepted: false, reason: 'unregistered event type' }`, nothing written (AT-016.02 asserts exactly that, `a-emitter-and-taxonomy.test.ts:52–60`).
   b. `directory.resolve(row.recipients)` — **emit-time, never send-time**. Live binding: SQL seat reads — ngo from `org_memberships` for the world's organisation, volunteer from `projects.assigned_volunteer_id`, platform_admin and ex_volunteer from the world record — then one `auth.users` read for email addresses (`_live.ts:437–465`). Loop binding: `currentWorld.actors[role]` and the namespaced address (`_fixture.ts:335–344`).
   c. **`prepareWriteSet(row, request, holders)`** (`notifications.ts:174–206`):
      - `channelsFor(row)` decides the channel list.
      - `renderCopy(row, payload)` renders `{subject, body}` once; every delivery of the event gets the same copy.
      - Throws if the directory resolved nobody for a role, or if a role has no email address while the row delivers by email (`notifications.ts:182–185`) — a delivery the worker could never perform is refused at construction.
      - Produces: frozen `recipients` (role → recipientId/address/channels), one `PreparedDelivery` per role×channel stamped `emittedBy: 'notifications.emitter'`, and an ops item when the row raises one.
   d. `outbox.append(write)`:
      - **Live**: reads the crash switch (`crash.armed()`), then **one SQL call**: `select public.fixture_commit_transition_and_emit(scopeId, write::jsonb, armed)` (`_live.ts:304–322`). That definer upserts the transition ledger row, then if `p_induce_fault` takes `nextval('public.notification_fault_triggers')` and raises (the sequence value survives the rollback — that's why a sequence, not a table; `20260913121000....sql:48–53,163–166`); otherwise calls `public.emit_notification(p_write)`, which inserts the event row, one delivery row per role×channel with `idempotency_key = 'ntf:' || event_id || ':' || recipientId || ':' || channel` (SQL lines 211–227), and the ops item. Transition + event + deliveries + ops item = one transaction.
      - **Loop tier**: `append` (`_fixture.ts:230–276`) commits the transition into `state.transitions` first, then the fault point (restore the *previous* transition value on crash, count the reach, throw), then mints `event-N` and pushes the event row, one `StoredDelivery` per `PreparedDelivery` with the same key shape `ntf:<eventId>:<recipientId>:<channel>` (line 269), and the ops item.
4. **Worker pass.** The test body calls `sut.drainDeliveries()` → `core.drain()` (`notifications.ts:385–401`) → per iteration: `outbox.pending()` (live: SQL `where recipient_id = any(scopedActors()) and state <> 'sent' order by created_at, id`, `_live.ts:324–350`) → **`runPassOver(pending)`** (`notifications.ts:335–357`):
   - `channel !== 'email'` → the pass itself records `{ outcome: 'accepted', receipt: null }`; in-app never reaches a provider.
   - `channel === 'email'` → `provider.deliver({ key: delivery.idempotencyKey, to, subject, body, eventId, recipientId, channel })` — the key is **read off the row, never derived in the pass** (`PendingDelivery` comment, `notifications.ts:218–219`).
   - Provider chain, integration tier: `bindProviderFaults(...).deliver` (`_provider-faults.ts:117–145`; may force `rejected` without sending, or send then answer `no_ack`) → `withIdempotentReplay(...).deliver` (`_provider-faults.ts:91–103`; asks `messagesAddressedTo([to])` whether a message with this `X-Notification-Key` already exists; if yes, answers `accepted {replayed:true}` and sends nothing) → `createSmtpProvider.deliver` → `deliverOverSmtp` → `connect` → `SmtpSession` → `exchange`: waits 220, `EHLO`, `MAIL FROM`, `RCPT TO` (250/251), `DATA` (354), message + `.` terminated, final `250` → `{ outcome: 'accepted', receipt: {code, reply, messageId} }`; `SmtpRefusal` (4xx/5xx) → `rejected {code, reply}`; timeout/conn-refused/conn-closed → `no_ack {error}` (`notification-provider.ts:167–204`).
   - Provider chain, loop tier: `_fixture.ts:327–332` delegates to `vendors.email.deliver({recipientId, eventId, channel})`; the sim (`harness/vendors.ts:94–121`) checks the JSON identity set, consumes a forced outcome if armed, else defaults `accepted`; a physical acceptance closes the identity; `ack_lost` is answered as `no_ack` (the port deliberately cannot see the truth, `vendors.ts:10–15`).
5. **Marking sent, one unit.** `outbox.applyPassResults(results, proc.epoch())`:
   - **Live**: one SQL call → `public.apply_delivery_results(jsonb, epoch)` (`20260913120000....sql:244–285`): per result, `accepted` → `state='sent'`, `delivered_by_process = coalesce(delivered_by_process, epoch)` (first send owns the stamp), `accepted_at = coalesce(accepted_at, now())`, `provider_receipt = coalesce(...)`; otherwise `state='retrying'`. Then one update over touched events: `attempts = attempts + 1`, `state = 'retrying'` if any delivery ≠ 'sent', else `'sent'`. One statement/transaction.
   - **Loop**: `_fixture.ts:297–317` mirrors it in memory, including first-wins `deliveredByProcess` (comment lines 292–296).
6. **`drain`** repeats until `pending()` is empty (i.e., all deliveries `sent`) or the `passes` budget expires — the bounded form exists so a test can observe the state *between* attempts (`_contract.ts:164–170`).

### C. Failure semantics

- Only `'accepted'` may mark a delivery sent. `'rejected'` (provider stated a refusal) and `'no_ack'` (timeout/refused connection/closed connection — the sender doesn't know if the message was taken) both become `'retrying'`.
- A retry always reaches the provider again (`pending()` returns everything not `sent`, including `retrying`). Duplicate suppression is the provider's idempotency on the key — the sim's identity set at loop tier, Mailpit's `X-Notification-Key` lookup at integration tier — never a skipped call or a stored receipt (`migration comment lines 31–35`; `_provider-faults.ts:7–21`).
- `accepted_at`/`provider_receipt` are written in the same statement that marks sent, so a crash between provider acceptance and the sent mark leaves a durable record — but they are explicitly *not* a way to skip the provider on retry.

## Files Read

- `supabase/functions/_shared/notifications.ts` (full)
- `supabase/functions/_shared/notification-taxonomy.ts` (full)
- `supabase/functions/_shared/notification-copy.ts` (full)
- `supabase/functions/_shared/notification-provider.ts` (full)
- `supabase/functions/_shared/edge.ts` (lines 1–80, to verify it has no notification wiring)
- `supabase/functions/_shared/` (directory listing)
- `supabase/migrations/20260913120000_notification_taxonomy_and_outbox.sql` (full)
- `supabase/migrations/20260913121000_notification_fixture_producers.sql` (full)
- `tests/at/suites/req-016/_fixture.ts` (full)
- `tests/at/suites/req-016/_live.ts` (full)
- `tests/at/suites/req-016/_contract.ts` (full)
- `tests/at/suites/req-016/_source-scan.ts` (full)
- `tests/at/suites/req-016/_provider-faults.ts` (full)
- `tests/at/suites/req-016/_fault-switch.ts` (full)
- `tests/at/suites/req-016/_fixture-producers.ts` (full)
- `tests/at/suites/req-016/_mail-witness.ts` (full)
- `tests/at/suites/req-016/_integration.ts` (lines 1–80)
- `tests/at/suites/req-016/a-emitter-and-taxonomy.test.ts` (lines 1–80)
- `tests/at/harness/vendors.ts` (lines 1–130)
- `supabase/config.toml` (grep for `[local_smtp]` / `smtp_port`)
- Grep sweeps over `supabase/functions`, `src`, `tests/at/harness` for notification symbols.

## Boundaries

- **Inputs to the core**: an `EmitRequest {event, actor, params}` from a producer (at HEAD, only the fixture producers — `w.fire(...)` via `producerPayload`); a taxonomy row; a directory answer `Partial<Record<Role, RoleHolder>>`. Real product producers don't exist yet; the migration file `20260913121000` is the explicit stand-in, designed so real producer definers later call `public.emit_notification` from their own transaction in the same shape.
- **Outputs**: a `WriteSet` handed to `OutboxPort.append`; provider sends over `ProviderPort`; three query surfaces (`events`/`deliveries`/`opsItems`) for assertions and a future in-app reader. In-app rows are readable by their recipient via the RLS policy `notification_deliveries_own_inapp` (authenticated, `recipient_id = auth.uid()`, channel `inapp`; `20260913120000....sql:185–187`); nothing in the app reads it yet at HEAD.
- **The subsystem vs the rest of the tree**: no file in `src/` mentions notifications (grep confirmed). No edge function, cron, or HTTP handler calls `createNotifications`, `emit`, `runPass`, or `drain` — the grep over `supabase/functions` shows the only notification references inside `_shared` itself. The declared sibling components (`blockers.service`, `scope.service`, `lifecycle.service`) have `NOTIFICATION_COMPONENTS` entries pointing at `supabase/functions/_shared/blockers.ts`, `scope.ts`, `lifecycle.ts` and `supabase/functions/<name>/`, **none of which exist on disk yet** — the declarations anticipate future components.
- **Port topology**: the core decides everything and stores nothing; storage (`OutboxPort`), wire (`ProviderPort`), directory (`DirectoryPort`), clock and process identity are ports, each with two bindings — memory/harness-sim at loop tier, SQL/SMTP/wall-clock at integration tier.

## Non-Obvious Things

1. **The subsystem has no production driver at HEAD.** `createNotifications` is constructed in exactly two places: `_fixture.ts:346` and `_live.ts:477`. A "real" producer would be a SQL definer calling `emit_notification` after its own transition — none exists outside the fixture-producer migration. The notifications system is exercised end to end only through the acceptance suite. Any statement about scheduled sends at runtime would be speculation.
2. **The provider-client import rule is enforced by a test-time source scan, not by a compiler or runtime check.** `providerClientImporters()` (`_source-scan.ts:127–140`) scans `supabase/functions`, `supabase/migrations`, and `src` for `deliver(`, `ProviderPort`, mail-client imports (`node:net|node:tls|nodemailer|resend|postmark|@sendgrid/*|mailgun*|smtp*`), and credential names, mapping hits to components via `NOTIFICATION_COMPONENTS`; AT-016.01 asserts the result is exactly `['notifications.emitter']` at both tiers (`_integration.ts:62–66`). The scan throws rather than returning empty when it finds nothing (an empty answer would mean the instrument went blind, since the product provider module exists and sends). `notifications.ts` lists the provider file's path in `NOTIFICATION_COMPONENTS` but does not import it at runtime — only `_live.ts` (outside the scanned product roots) imports `createSmtpProvider`. The header comment in `notification-provider.ts:4–8` asserts the same rule in prose; the scan is the mechanical half. The file header also states this is "the documented exception" to the `_shared` rule that `edge.ts` is the only I/O module (I verified `edge.ts` itself is Deno-only plumbing with no notification references).
3. **What product SMTP does itself vs delegates**: it does the entire protocol conversation itself over a raw `node:net` socket — no mail library, no TLS, no AUTH (no `node:tls` import; `EHLO` with no authentication). It implements multi-line SMTP reply framing (`takeReply` completes at the first line whose fourth character is a space, `notification-provider.ts:102–117`), dot-stuffing (`renderMessage` doubles leading dots), RFC 2047 base64 encoding for non-ASCII subjects, CRLF line ends, and the `X-Notification-*` header stamping. It delegates: message *content* and recipients come from the core; idempotency on the key is not its job (the sim/Mailpit wrappers do it); TLS/AUTH/SASL would be delegated to nothing — they're simply absent. Host/port/sender/timeout arrive as constructor arguments; no env read at module level, so the pure acceptance program can import and type-check it.
4. **Mailpit-as-idempotency-store is a test adapter, not product behavior.** `withIdempotentReplay` (`_provider-faults.ts:91–103`) asks the catcher before each send. The migration's comment ("the provider's own idempotency on the key is what stops a duplicate") is aspirational on the live path: at HEAD that "provider" is the test wrapper plus the catcher. A hypothetical production worker calling bare `createSmtpProvider` would re-send after a lost ack.
5. **`attempts` counts worker passes, not provider sends** — an in-app-only event's pass increments it with zero provider traffic (`notifications.ts:339–342`, `_contract.ts:106–114`). `'failed'` exists in the state enum/types but nothing on the traced path ever sets it.
6. **The atomicity fault point is *inside* the outbox's `append`, between the producer transition and the notification write** — the name `notifications.between_transition_and_event_write` is a claim about position, and the loop binding's `append` honors it in-memory (`_fixture.ts:219–228`) while the live binding arms it as the definer's third argument (`p_induce_fault`), with a `nextval` witness the rollback cannot undo plus a refusal-count witness whose disagreement the adapter refuses (`_live.ts:267–292`). Nothing in product SQL reads a control table or session setting; the fault is an argument of the call.
7. **The idempotency key is minted by the outbox binding, not the core**, in both tiers with the same shape `ntf:<eventId>:<recipientId>:<channel>` (`_fixture.ts:269`; SQL line 225), unique-constrained in SQL. The core only carries it verbatim into `X-Notification-Key` and a sanitized `Message-ID`.
8. **Recipients are resolved and frozen at emit time** (`NotificationEventRow.recipients` comment, `notifications.ts:92`); a later role reassignment (`reassignRole`) never rewrites an existing event's deliveries — the live binding keeps old holders in `knownActorIds` precisely so earlier deliveries stay visible in scoped reads (`_live.ts:157–158`).
9. **Copy is rendered once at emit** and frozen on every delivery row; the general template carries every non-empty string in the payload, and 10 events have named templates (`notification-copy.ts`).
10. Prior explorer reports for this same question exist under `loop/evals/explorer-2026-09-09/`; I verified all load-bearing claims above against the code rather than those reports.

## Open Questions

- **`tests/at/suites/req-016/taxonomy.ts`** — the suite's own 48-row oracle table and `FORBIDDEN_EVENT_PATTERNS` — I read only its use in `producerPayload` and the AT-016.02 body; its full contents and how the suite's table is kept in step is the suite-angle slice, not verified here.
- **`_bind.ts` / `tests/at/harness/registry.ts`** — how a tier loads the adapter and how `atTest` dispatches `default` vs `integration` bodies — not read; that is the harness angle.
- **The `Notifications.drain` scheduling story for production** — nothing in the tree schedules a worker; how `drain`/`runPass` would be invoked by a deployed worker is undefined at HEAD.
- **`emittedBy` in the SQL `apply_delivery_results` path** — the delivery's `emitted_by` comes only from `emit_notification`'s insert of `emittedBy` from the WriteSet; I confirmed the check constraint but did not exhaustively search for any other writer of `emitted_by` beyond the `strayNotificationWriters` oracle's `insert into` scope (updates are out of that oracle's scope by design; the worker updates rows, only the emitter creates them).
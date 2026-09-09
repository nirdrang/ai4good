The suite is an executable specification of a closed 48-row notification system: one emitter, a frozen taxonomy, documented delivery defaults, and a reliability guard. AT-016.01 is the only loop-tier red; the other eleven ids already pass against the in-memory stand-in.

### Components Found

**Suite (the specification)**

| Path | Role |
|---|---|
| `tests/at/suites/req-016/taxonomy.ts` | Spec oracle. 48-row `TAXONOMY`, types, class-channel rules, payload predicates. |
| `tests/at/suites/req-016/_contract.ts` | REQ-016 SUT / world / delivery shapes. Shared harness types re-exported. |
| `tests/at/suites/req-016/_oracles.ts` | Pure pair-count oracles: `countPairs`, `expectedPairs`, `pairProblems`. |
| `tests/at/suites/req-016/_bind.ts` | Only harness contact. `bindSuite({ requirement: 'req-016', sut: 'notifications' })`. |
| `tests/at/suites/req-016/_fixture.ts` | Loop-tier stand-in. Conforms by construction from `TAXONOMY`. Not the product. No `_live.ts`. |
| `tests/at/suites/req-016/a-emitter-and-taxonomy.test.ts` | AT-016.01, AT-016.02 |
| `tests/at/suites/req-016/b-delivery-defaults.test.ts` | AT-016.07, AT-016.08 |
| `tests/at/suites/req-016/c-reliability-guard.test.ts` | AT-016.09, AT-016.10, AT-016.11 |
| `tests/at/suites/req-016/d-taxonomy-evidence.test.ts` | AT-016.03, .04, .05, .06, .12 over one frozen capture |

**Written sources**

- `.taskmaster/docs/acceptance/at-req-016.md` — 12 P0 criteria, sections A/B/C.
- `.taskmaster/docs/requirements/req-016.md` — PRD isolate the taxonomy was transcribed from (lines 6–19).
- `.taskmaster/docs/architecture-notes.md` lines 200–203 — sole writer + outbox reliability.
- `loop/decomp/req-016.md` — three deliverables, leaves, cross-contracts, `sync-stamp: 5d74fad · d84`.
- `tests/at/expected/req-016.json` — loop: 11 green + AT-016.01 red on `H3 static provider scan`; integration: all 12 red on `fixtures.worlds` + `sut.notifications`.

**Harness seams the suite actually drives**

- `tests/at/harness/contracts.ts` `StaticScan` (lines 118–121): `{ providerClientImporters(): Promise<string[]> }`.
- `tests/at/harness/index.ts` line 197: `staticScan = refusing<StaticScan>('H3 static provider scan')` at every tier.
- `tests/at/harness/registry.ts` `freezeEvidence` / `EvidenceCaptureImpl` / `ctx.capture`.
- `tests/at/harness/vendors.ts` email sim + SUT-facing `EmailProviderPort`.
- `tests/at/harness/sentinels.ts`, `faults.ts`, `atconfig.ts` (guard pins), `fixtures.ts` (actors).
- Existing static-scan *precedents* (not this seam): `tests/at/suites/req-001/_source-scan.ts`, `_policy-scan.ts`. No suite implements `h.static.providerClientImporters`.

---

### Flow

**Emit path the tests require**

1. Owning-domain fixture calls `World.fire(event, params)` (or `sut.emit` for the unregistered-type probe).
2. Emitter looks up a *registered* taxonomy row. Unknown type → `{ accepted: false }`, no event, no delivery.
3. Recipients resolve **at creation** from current `World.actors[role]`. Channels = named `row.channels`, else documented default.
4. Guarded rows: ledger/state transition commits, then fault point `notifications.between_transition_and_event_write`, then event + deliveries + optional ops item. A crash at the point rolls **all four** back.
5. Delivery worker (`drainDeliveries`, default to quiescence; `{ passes: N }` for mid-attempt observation):
   - in-app never hits the email provider; marked `sent` locally.
   - email calls `vendors.email.deliver({ recipientId, eventId, channel })`. `accepted` → `sent`. `rejected` / `no_ack` → `retrying`. Provider idempotency (identity = JSON `[eventId, recipientId, channel]`) stops a lost-ack retry minting a second physical accept.
6. Process restart (`h.faults.processRestart`) must change `processEpoch`; pending sends completed after restart carry that new identity on `Delivery.deliveredByProcess`.

**Evidence path (AT-016.03/04/05/06/12)**

`d-taxonomy-evidence.test.ts` defines one capture `'REQ-016 taxonomy execution'`. First `ctx.capture` opens one world, fires every `TAXONOMY` row, drains, snapshots per-row events/deliveries/ops/provider traces, then `freezeEvidence`. Later ids in the same `describe.sequential` reuse that frozen object. Nothing is written to disk.

**Loop vs integration**

Loop loads `_fixture.ts`. Integration: `liveAdapterExists('req-016')` is false (`no _live.ts`), so `open()` throws `CapabilityPending(['fixtures.worlds', 'sut.notifications'])` before `createHarness`.

---

### 1. Taxonomy matrix (`taxonomy.ts`) — every row

**Exported types**

- `Role` = `'ngo' | 'volunteer' | 'ex_volunteer' | 'platform_admin'`
- `Channel` = `'email' | 'inapp'`
- `Tone` = `'normal' | 'low'`
- `EventClass` = `'money' | 'deadline' | 'blocker' | 'completion' | 'decision' | 'access' | 'lowtone' | 'other'`
- `TaxonomyRow`: `event`, `recipients`, `channels` (`null` = bind to documented default), `tone`, `class`, optional `payloadKeys`, `guarded`, `opsItem`, `escalation`
- `ChannelRule`: optional `mustInclude` / `mustEqual`

**Channel-binding rule used by the fixture and by AT-016.03/05/06** (`CLASS_CHANNEL_RULE` + fixture `channelsFor`):

- Named `channels` win.
- Else class `lowtone` → `['inapp']` exactly.
- Else class in `{money, deadline, blocker, completion, decision}` → must include `email`; fixture documents `['email']` only (in-app is *not* implied).
- Else `access` / `other` with `channels: null` → fixture documents `['inapp']`; **no class rule**.

Critical vs low-tone in AT-016.05: critical = those five classes (must go out by email); low-tone = in-app only. `access` and `other` are neither.

`channels: null` in the table means the requirement did not name channels. Effective channels come from `sut.documentedDefaults()`.

| # | event | recipients | named channels | tone | class | critical/low | ops item | escalation | guarded | payloadKeys |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `triage.approved` | ngo | email, inapp | normal | decision | critical | no | no | no | `marketplaceVisibility` |
| 2 | `triage.returned_to_scoped` | ngo | email, inapp | normal | decision | critical | no | no | no | `reason` |
| 3 | `triage.declined_terminal` | ngo | email, inapp | normal | decision | critical | no | no | no | — |
| 4 | `vetting.outcome` | ngo | *null → email* | normal | decision | critical | no | no | no | — |
| 5 | `discovery.fit_declined` | ngo | email, inapp | normal | decision | critical | no | no | no | `declineCause`, `reshapingSuggestion`, `oversightSentence` |
| 6 | `discovery.fit_decline_review` | platform_admin | email, inapp | normal | decision | critical | **yes** | no | no | `declineCause` |
| 7 | `discovery.decline_overturned` | ngo | email, inapp | normal | decision | critical | no | no | no | `discoveryReopened` |
| 8 | `candidacy.marked` | platform_admin | *null → inapp* | normal | other | neither | no | no | no | — |
| 9 | `match.created` | volunteer | email, inapp | normal | decision | critical | no | no | no | `consentCta` |
| 10 | `match.consented` | ngo | email, inapp | normal | decision | critical | no | no | no | `fundToKickOff` |
| 11 | `match.declined_or_expired` | platform_admin | *null → inapp* | normal | other | neither | no | no | no | — |
| 12 | `open_project.unmatched_aging` | platform_admin | *null → inapp* | normal | other | neither | no | no | no | — |
| 13 | `abandonment.reminder_14d` | volunteer, ngo | *null → email* | normal | deadline | critical | no | no | no | — |
| 14 | `abandonment.released` | ngo, ex_volunteer | *null → email* | normal | deadline | critical | no | no | no | — |
| 15 | `abandonment.rematch_available` | ngo | *null → inapp* | normal | other | neither | no | no | no | — |
| 16 | `funding.pre_deadline_reminder` | ngo | *null → email* | normal | deadline | critical | no | no | no | — |
| 17 | `funding.deadline_expired` | ngo, volunteer | *null → email* | normal | deadline | critical | no | no | **yes** | — |
| 18 | `payment.succeeded` | ngo, volunteer | *null → email* | normal | money | critical | no | no | **yes** | — |
| 19 | `payment.failed` | ngo | *null → email* | normal | money | critical | no | no | **yes** | — |
| 20 | `fuel.threshold_20` | ngo | *null → email* | normal | money | critical | no | no | **yes** | — |
| 21 | `fuel.threshold_5` | ngo, volunteer | *null → email* | normal | money | critical | no | no | **yes** | — |
| 22 | `fuel.depleted` | ngo, volunteer, platform_admin | *null → email* | normal | money | critical | no | no | **yes** | — |
| 23 | `leftover.released` | ngo | *null → email* | normal | money | critical | no | no | **yes** | — |
| 24 | `chargeback.opened` | ngo, platform_admin | *null → email* | normal | money | critical | **yes** | no | **yes** | — |
| 25 | `access.key_issued` | volunteer | email, inapp | normal | access | neither (named both) | no | no | **yes** | — |
| 26 | `access.key_revoked` | volunteer | email, inapp | normal | access | neither (named both) | no | no | **yes** | `replacementOnDashboard` |
| 27 | `gateway.watchdog_failed_closed` | platform_admin | email, inapp | normal | other | neither | no | no | no | — |
| 28 | `prd_gate.below_threshold_gap_report` | volunteer | email, inapp | normal | decision | critical | no | no | no | — |
| 29 | `prd_gate.passed` | ngo | email, inapp | normal | decision | critical | no | no | no | — |
| 30 | `backlog.live` | ngo | email, inapp | normal | other | neither | no | no | no | — |
| 31 | `reconciliation.large_drift` | platform_admin | email, inapp | normal | money | critical | no | no | no | — |
| 32 | `reconciliation.undecidable_drift` | platform_admin | email, inapp | normal | money | critical | no | no | no | — |
| 33 | `pm_item.status_changed` | ngo | inapp | **low** | lowtone | **low-tone** | no | no | no | — |
| 34 | `pm_item.completed` | ngo | email, inapp | normal | completion | critical | no | no | no | — |
| 35 | `requirement.comment` | volunteer | inapp | normal | other | neither | no | no | no | — |
| 36 | `thread.comment` | volunteer | inapp | normal | other | neither | no | no | no | — |
| 37 | `blocker.raised` | ngo | email, inapp | normal | blocker | critical | no | no | no | — |
| 38 | `blocker.resolved` | ngo, volunteer | email, inapp | normal | blocker | critical | no | no | no | — |
| 39 | `blocker.aging_48h` | ngo | email, inapp | normal | blocker | critical | no | no | no | — |
| 40 | `blocker.aging_7d` | ngo, platform_admin | email, inapp | normal | blocker | critical | no | no | no | — |
| 41 | `pm_item.status_auto_reverted` | volunteer | inapp | **low** | lowtone | **low-tone** | no | no | no | `whatToDoInstead` |
| 42 | `project.completed` | ngo, volunteer | *null → email* | normal | completion | critical | no | no | **yes** | — |
| 43 | `provisioning.failed` | ngo, volunteer, platform_admin | *null → inapp* | normal | other | neither | **yes** | no | no | — |
| 44 | `lovable.setup_reminder` | ngo | *null → inapp* | normal | other | neither | no | no | no | — |
| 45 | `lovable.credits_low` | ngo | *null → inapp* | normal | other | neither | no | no | no | — |
| 46 | `lovable.credits_blocked` | ngo, platform_admin | *null → inapp* | normal | other | neither | no | **yes** | no | — |
| 47 | `lovable.setup_pending_raised` | ngo | *null → inapp* | normal | other | neither | no | no | no | — |
| 48 | `lovable.setup_complete` | ngo, volunteer | *null → inapp* | normal | other | neither | no | no | no | — |

48 rows. Wire names are defined by this suite; renaming is a spec change.

**Other exports (complete)**

- `TAXONOMY` — the 48-row array.
- `GUARDED_ROWS` = `TAXONOMY.filter(r => r.guarded === true)` — 11 rows: `funding.deadline_expired`, `payment.succeeded`, `payment.failed`, `fuel.threshold_20`, `fuel.threshold_5`, `fuel.depleted`, `leftover.released`, `chargeback.opened`, `access.key_issued`, `access.key_revoked`, `project.completed`. Reconciliation money rows are **not** guarded.
- `CRITICAL_CLASS_FIXTURES`: money=`payment.succeeded`, deadline=`funding.deadline_expired`, blocker=`blocker.raised`, completion=`project.completed`, decision=`triage.approved`.
- `LOW_TONE_FIXTURE` = `'pm_item.status_changed'`.
- `PENALTY_LEXICON` = `['penalty','penalis','penaliz','violation','infraction','warning issued','strike','fault','blame']`.
- `FORBIDDEN_EVENT_PATTERNS` = `/change[._-]?request/i`, `/\bcr\b/i`, `/scope[._-]?change/i`, `/donat/i`.
- `CLASS_CHANNEL_RULE` — as above; `access: {}`, `other: {}`.
- `channelRuleProblems(row, channels)` — returns problem strings.
- `PAYLOAD_PREDICATES` — per-event, per-key `(value, body) => string | null`:
  - `triage.approved.marketplaceVisibility`: must be boolean `true` (body **not** checked).
  - `triage.returned_to_scoped.reason`: non-placeholder, length ≥ 12, substring of body.
  - `match.created.consentCta`: matches `/consent|accept|confirm/i`, in body.
  - `match.consented.fundToKickOff`: `/fund/i` and `/kick|start|begin/i`, in body.
  - `discovery.fit_declined.declineCause`: `'ongoing_developer_maintenance' | 'confidential_codebase'`.
  - `discovery.fit_declined.reshapingSuggestion`: non-placeholder, length ≥ 12, in body.
  - `discovery.fit_declined.oversightSentence`: `/person|human|someone/i` and `/review|read|look/i`, in body.
  - `discovery.fit_decline_review.declineCause`: same two causes.
  - `discovery.decline_overturned.discoveryReopened`: boolean `true`.
  - `access.key_revoked.replacementOnDashboard`: `/dashboard/i` in value **and** body.
  - `pm_item.status_auto_reverted.whatToDoInstead`: non-placeholder, length ≥ 12, none of `PENALTY_LEXICON`, in body.
- Helpers used only inside predicates: `norm`, `PLACEHOLDERS` (`''`, `'-'`, `'n/a'`, `'na'`, `'tbd'`, `'none'`, `'null'`, `'undefined'`, `'todo'`), `text`, `carriedInBody`.

No other exports.

---

### 2. Fixture (`_fixture.ts`) as a design vs a shortcut

**Data model** (`MutableState`, lines 76–82): in-memory `events[]`, `deliveries[]`, `opsItems[]`, `transitions: Map<string, boolean>`, `nextId`. Shared across worlds of **one** adapter; each `open()` builds a new harness/adapter.

**World** (`NotificationFixtureWorld`): wraps `FixtureWorld`. Actors from seed (`actor-ngo`, `actor-volunteer`, `actor-ex-volunteer`, `actor-platform-admin`). Methods: `fire`, `transitionCommitted`, `reassignRole` (mutates `actors[role]` in place), `burstThreadComments`, `teardown`.

**Emitter (`emitKnown`)**

1. Unknown event throws (world.fire) / `{ accepted: false, reason: 'unregistered event type' }` (`sut.emit`).
2. Recipients = `row.recipients.map(role => { role, recipientId: world.actors[role], channels })`.
3. Sets `transitions[event]=true`, hits fault point, on crash restores previous map value.
4. **After** the point: allocates `event-N`, pushes pending event + one pending delivery per recipient-channel, optional `ops-{eventId}` if `row.opsItem`.
5. Always stamps `emittedBy: 'notifications.emitter'`. `deliveredByProcess: null` until send.

**Delivery worker (`runDeliveryPass` / `drainDeliveries`)**

- Skip already-`sent`.
- Non-email: `markSent` (first process identity wins).
- Email: `vendors.email.deliver`. `accepted` → sent; else `retrying`.
- Event `attempts++` only if this pass touched it; event `state` = `sent` iff every delivery is `sent`, else `retrying`.
- Default drain = until all sent (bounded by finite forced-outcome queue + idempotent accepts). `passes` must be an integer ≥ 1.

**Retry / idempotency**

- Worker retries unsent email. Duplicate suppression of *logical* deliveries is by construction (one row per pair, mutated in place).
- Physical no-duplicate on lost-ack is the **provider sim** (`acceptedIdentities`), not the fixture.

**Faults**

- One point: `'notifications.between_transition_and_event_write'`. Kind `'crash'` only.
- `processEpoch` starts `delivery-process-1`; restart increments.

**Sentinels**

- Scope `'notifications.delivery_bodies'`; `read` returns delivery bodies. AT-016.01 does **not** call `scan()`; it searches `sut.deliveries()`.

**Providers**

- Only email. In-app never calls the port (AT-016.05 oracle).

**Anti-spam (`burstThreadComments`)**

- Reads `req-015.thread_comment_notifications.{max_per_window,window_ms,coalesce}` at evaluation time.
- Registry defaults: cap 2, window 60_000 ms, coalesce false (`atconfig.ts`).
- Coalesce true → one `thread.comment` per window. Else cap then suppress. Window from `clock.now()`.

**Senders probe:** hardcoded four components; only `notifications.emitter` has `canSendDirectly: true`.

**Payload/body shortcuts:** named strings/booleans for predicate keys; leftover body is the fixed sentence “Unused fuel was released to the NGO general balance.”; other bodies are `"${event with dots/underscores as spaces} notification."` plus string payload values (so a `sentinel` param appears in the body).

**Genuine designs a real implementation should mirror**

- Transition-then-fault-then-event order; one rollback unit including deliveries and ops items.
- Recipients frozen on the event at creation.
- Email sent only on provider `'accepted'`; `'rejected'` and `'no_ack'` stay retrying; sender cannot see `'ack_lost'`.
- In-app never touches the email provider.
- Drain-to-quiescence vs bounded `passes`.
- Process identity on the send that actually completed the delivery.
- Documented defaults as a real surface (`source` non-empty, channels non-empty), not implicit behaviour.
- Closed taxonomy; empty `runtimeRegistrationSurface()`.
- Guard reads config + controlled clock; two configs must produce different counts.
- Provider-side trace is the out-of-band witness.

**Shortcuts that only work because this is in memory**

- No durable outbox / DB; restart only changes a string epoch; duplicate-pair assertion **cannot fail** here (comment at `b-delivery-defaults.test.ts` 78–86).
- `World.fire` **is** the emitter (`emitKnown`); domain services never exist. `SENDERS` is a list, not an architecture probe.
- `transitions` is a boolean map keyed by event name, not a ledger.
- `reassignRole` mutates the same object the world holds.
- Burst comments do not post thread messages; they call `emitKnown('thread.comment')`.
- Guard window state lives on the adapter instance.
- Taxonomy/defaults copied from the suite’s own `TAXONOMY`.
- No credentials, no product source, no `_live.ts`.
- Shared `state` for all worlds of one adapter (tests isolate via new `open()`).

---

### 3. The twelve ids as requirements

**AT-016.01** (`a-emitter-and-taxonomy.test.ts` 18–74)

Asserts the emitter is the sole writer. **Harness:** `h.static.providerClientImporters()` must equal `['notifications.emitter']` (sorted); `h.sentinels.plant('notification-body', …)` per domain; `h.vendors.email.attempts()` has no `eventId` outside `sut.events()`. **SUT:** `senders()`, `deliveries()`, `drainDeliveries()`, `events()`. **World:** `fire(event, { sentinel })` for `blocker.raised`, `thread.comment`, `pm_item.status_changed`. Real product: only the emitter imports a provider client / holds its credential; blockers/scope/lifecycle appear in `senders()` with `canSendDirectly: false`; a sentinel raised in each domain reaches a delivery body stamped `emittedBy: 'notifications.emitter'`; no orphan provider send. **Currently red:** first call throws `CapabilityPending: CAPABILITY PENDING — H3 static provider scan`.

**AT-016.02** (`a-emitter-and-taxonomy.test.ts` 76–108)

Registered event **set equality** with `TAXONOMY` (no extra, no missing, no duplicate names). No registered name matches `FORBIDDEN_EVENT_PATTERNS`. `emit({ type: 'at-016.02.sentinel.unregistered' })` → `accepted: false`, no `eventId`, deliveries and events counts unchanged after drain. `runtimeRegistrationSurface()` is `[]`. **SUT only** (`taxonomy`, `emit`, `deliveries`, `events`, `drainDeliveries`, `runtimeRegistrationSurface`). Real product: static closed table of exactly those 48 wire names, immutable at runtime.

**AT-016.03** (`d-taxonomy-evidence.test.ts` 116–185)

Reads frozen `taxonomyEvidence` (must be built once). For every row: no deliveries existed before fire; effective channels exist and satisfy `channelRuleProblems`; `pairProblems(expectedPairs(actors, recipients, channels), countPairs(deliveries))` is empty; every `payloadKeys` entry passes `PAYLOAD_PREDICATES` (or non-empty string) **on every delivery**, value **and** body where the predicate says so; `opsItem` rows have exactly one linked ops item. Extra: `fuel.depleted` roles exactly `{ngo, platform_admin, volunteer}`; `pm_item.status_auto_reverted` bodies contain none of `PENALTY_LEXICON`. **SUT (inside capture):** `deliveries`, `fire` via world, `drainDeliveries`, `events`, `opsItems`, `taxonomy`, `documentedDefaults`. Real product: fire all 48 from fixtures; exact recipient-channel pairs; named payloads actually appear in copy; ops items for the three flagged rows; depleted includes admin.

**AT-016.04** (same file 187–221)

Same capture. `candidacy.marked` and `match.declined_or_expired` deliver to someone but never `role==='ngo'` / NGO actor. `vetting.outcome` delivers but never volunteer. `registered` has no `/donat/i`. `leftover.released` delivers and body has no `/donat/i`. Real product: match-log is admin-only; vetting is NGO-only; leftover is not framed as a donation; no donation event name.

**AT-016.05** (223–274)

Same capture. Each `CRITICAL_CLASS_FIXTURES` event has at least one `channel==='email'` delivery. `pm_item.status_changed` channels exactly `['inapp']`. Then **all 48 rows**: no provider attempt with `channel !== 'email'`; `providerAccepted` pairs equal email pairs the taxonomy owes (empty if channels exclude email). Real product: critical classes actually mail; low-tone never mails; in-app never hits the email provider; accepted email pairs match the taxonomy.

**AT-016.06** (276–313)

Same capture. Every taxonomy event has a documented default; none have empty `source` or empty `channels`; no default for an event outside `TAXONOMY`; documented channels satisfy class rules; if the row **names** channels, documented equals named. Real product: a documented per-event default matrix, not implicit behaviour, consistent with the requirement.

**AT-016.07** (`b-delivery-defaults.test.ts` 19–97)

Fires `payment.succeeded`. Event exists, **no** delivery already `sent`. `processEpoch` changes across `processRestart`. After drain, every delivery of that event has `deliveredByProcess === afterRestart`; exactly one logical event; each resolved `recipientId:channel` exactly once; delivered pair set equals the pairs on the event. **SUT:** `events`, `deliveries`, `drainDeliveries`. **World:** `fire`. **Harness:** `faults.processEpoch/processRestart`. Real product: durable outbox that survives a mid-flight delivery-process restart without duplicating a pair, with the post-restart process actually performing the pending sends.

**AT-016.08** (99–172)

Two worlds: registry defaults, then overrides cap=4, window=120_000, coalesce=true. Burst = cap+5 inside a frozen window. Delivered `volunteer:inapp` `thread.comment` count = `coalesce ? 1 : cap` (must be `< burst`). Advance `windowMs`, one more comment → count + 1. The two variants must disagree. **World:** `burstThreadComments`, `actors`. **Harness:** `config.get`, `clock.freezeAt/advance`. **SUT:** `drainDeliveries`, `deliveries`. Real product: honour those three knobs and the clock; a no-op or hard-coded cap fails the two-variant + window-reset checks.

**AT-016.09** (`c-reliability-guard.test.ts` 29–125)

`GUARDED_ROWS` must contain all 11 `MUST_BE_GUARDED` names. Per row: control `open`+`fire`+drain → `transitionCommitted` true **and** an event exists. Fresh world, `h.faults.at('notifications.between_transition_and_event_write', 'crash')`, `fire` (may throw), `clear`, drain → transition, event, delivery, **and** ops item (`kind === row.event`) are **all false/empty**. Real product: an induced crash between transition and event write leaves none of the four committed. (Stricter than the written “roll back both or commit both”.)

**AT-016.10** (127–152)

`fire('pm_item.completed')` while NGO is `original`; `reassignRole('ngo', 'at-016.10-successor')`; drain. All deliveries of that event go to `original`; none to successor. Real product: freeze recipient ids at creation.

**AT-016.11** (154–288)

(a) `rejectNext(1)`, fire `access.key_issued`, drain `{passes:1}`: provider outcomes `['rejected']` for volunteer/email only; event state in `{pending, retrying}`; email deliveries exist and none `sent`. Full drain: ≥2 attempts, last `accepted`, event `sent`, `attempts >= 2`. (b) `acceptButLoseAck(1)`, fire `access.key_revoked`, one pass: outcomes `['ack_lost']`; email not `sent`; event not `sent`. Full drain: `['ack_lost','accepted']`; one logical event; exactly volunteer email+inapp deliveries all `sent`; provider `accepted()` exactly volunteer:email once. Real product: mark sent only on provider acceptance; retry unconfirmed; lost ack indistinguishable from silence; provider idempotency prevents a duplicate accept.

**AT-016.12** (`d-taxonomy-evidence.test.ts` 315–328)

Same capture. `lovable.credits_blocked` deliveries non-empty; roles exactly `{ngo, platform_admin}`; recipient ids exactly the fixture NGO and platform admin. Real product: that escalation event notifies those two actors, not the volunteer.

---

### 4. Written spec vs tests (sections A, B, C)

Quoted from `.taskmaster/docs/acceptance/at-req-016.md`:

**A**

- **AT-016.01:** one shared emitter is the sole writer; blockers, scope additions, and lifecycle hold no direct send; a sentinel in each domain reaches recipients only via the emitter; no other component holds sender credentials/paths.
- **AT-016.02:** registered set **exactly** equals the taxonomy (incl. d81 PRD-gate + money-corrections); unregistered sentinel rejected with nothing sent; no runtime registration; no dedicated scope-change/CR event (informal scope rides thread-comment).
- **AT-016.03:** every row, parameterized: exact recipients and channels (named, else AT-016.06 documented defaults); no extra/missing recipient or extra channel; depleted-fuel also asserts admin escalation with NGO+volunteer; chargeback-opened and provisioning-failure each create exactly one linked ops item. Representative rows listed. Payload: returned-to-scoped reason; match created consent CTA; consented fund-to-kick-off; key revoked replacement-on-dashboard; PM auto-revert instructive, no penalty language.
- **AT-016.04:** NGO never gets candidacy/match-log; volunteer never gets vetting outcome; no donation event on leftover release.

**B**

- **AT-016.05:** one critical event of each class (money, deadline, blocker, completion, decision) goes out by **email** (plus any named in-app); low-tone (task status changed) is in-app only.
- **AT-016.06:** a per-event documented default exists for every taxonomy row.
- **AT-016.07:** one committed event, including after mid-flight process restart: one logical notification; each recipient-channel pair exactly once (email+in-app → two deliveries, not two on the same pair).
- **AT-016.08:** test-pinned cap/window/coalesce; burst exceeding it delivers the configured count, measurably fewer than one-per-comment; production values unstandardized. `[cross: REQ-015]`

**C**

- **AT-016.09:** every guarded money / both access / completion row, fault between transition and event write: atomicity — “rolls back both or commits both”; no transition-without-event.
- **AT-016.10:** role X at creation, Y before delivery → X receives, Y does not.
- **AT-016.11:** provider reject/fail → not marked sent, retry, never dropped, unconfirmed observable as pending/retrying; on acceptance marked sent; accepted-but-lost-ack → retry preserves one logical notification and no duplicate pair.
- **AT-016.12:** Lovable credits blocked → NGO **and** platform admin.

**Spec says, tests do not check**

- Discovery ops item “carrying the project, the cause, and the full Discovery conversation” (`req-016.md` line 7) — tests only `opsItems.length === 1`.
- “The NGO never sees the review row, the ops item, or the admin’s deliberation” as a dedicated probe (recipients of `discovery.fit_decline_review` happen to exclude NGO via the matrix).
- Upheld disposition “sends the NGO nothing” — no event and no negative test.
- Vetting payload “vetted/unvetted”.
- Fuel “sessions warned/cut”.
- Key issued “instant at kickoff”.
- “PM-TREE events only — dev-tree events never notify the NGO”.
- Thread comment “the other party” (taxonomy is volunteer-only).
- AT-016.03 listed “approval means marketplace visibility” as copy meaning; test only `payload === true`.
- AT-016.06 does not require the default to be a human document, only `DocumentedDefault.source` non-empty.
- AT-016.08 “production values remain unstandardized”.
- AT-016.09 **allows** “commits both”; the test **rejects** any commit after the crash (control run is the positive).
- AT-016.09 “no transition-without-event” as XOR; test also forbids leftover deliveries/ops items.
- Chargeback/provisioning are the only ops items the written AT-016.03 names; tests also require `discovery.fit_decline_review` (taxonomy `opsItem: true`, coverage map d89).

**Tests check, spec does not say (or only implies)**

- Source-level `providerClientImporters() === ['notifications.emitter']`.
- `senders()` must **include** the three domain components.
- Provider-orphan check; provider-side exact pair equality on **all** rows (AT-016.05).
- In-app must not arrive at the email provider.
- Duplicate event names; leftover **body** must not match `/donat/i`.
- `runtimeRegistrationSurface() === []` as an explicit empty list.
- `evidenceBuilds === 1`.
- Documented-default **orphans**, class-rule on defaults, named-channels must equal documented.
- AT-016.07: no send before restart; `deliveredByProcess` equals post-restart epoch.
- AT-016.08: **two** configurations, clock freeze, window reset, volunteer:inapp pair.
- AT-016.09 control run; `MUST_BE_GUARDED` vs `GUARDED_ROWS`; four-way rollback.
- AT-016.10 uses `pm_item.completed` specifically.
- AT-016.11 binds traces to volunteer/email; `attempts` counter; `{passes:1}` observability; `ack_lost` vs port `'no_ack'`.
- AT-016.12 “exactly those” two roles and matching actor ids (excludes volunteer).
- Payload predicates’ length/placeholder/lexicon rules and “must appear in body”.
- Penalty lexicon on auto-revert **body** as well as the instruction field.

---

### 5. Evidence capture path

`defineEvidenceCapture` is bound in `_bind.ts` from `bindSuite`. Implementation: `tests/at/harness/registry.ts`.

- `defineEvidenceCapture(name, producer)` → `EvidenceCaptureImpl`.
- `ctx.capture(evidence)` (`registry.ts` 960–964) calls `evidence.consume(ctx)`, increments `usage.captures`.
- First consume: run producer (must call `open()` or it throws `capture producer completed without open()`), then `freezeEvidence(value)`. Later consumes return the same `Promise`.
- `freezeEvidence` (386–418): deep-freeze primitives / arrays / plain objects only. Map, Set, Date, class instances, functions, symbols throw. That is why provider traces are copied as plain objects.
- Failures wrap as `Error: evidence capture "…" (req-016) produced by AT-016.NN failed — …`, except `CapabilityPending` / `AtPending` pass through unwrapped so `--expect` can match them.
- **Not written to disk.** In-process, frozen, memoized. `describe.sequential` + `evidenceBuilds` enforce one producer for five ids.

**Shape (`TaxonomyEvidence`)**

```ts
{
  actors: Record<Role, string>,
  registered: string[],           // sut.taxonomy() event names
  defaults: DocumentedDefault[],  // { event, channels, source }
  rows: Record<event, {
    eventId, before: Delivery[], events: NotificationEvent[],
    deliveries: Delivery[], opsItems: OpsItem[],
    providerAttempts: ProviderTrace[],  // h.vendors.email.attempts() for this eventId
    providerAccepted: ProviderTrace[],  // h.vendors.email.accepted() for this eventId
  }>
}
```

**Who reads what**

| Id | Fields used |
|---|---|
| .03 | `defaults` (effective channels), every `rows[*].before/deliveries/opsItems`, payload+body, `fuel.depleted` roles, auto-revert bodies |
| .04 | `rows[candidacy/match.declined/vetting/leftover].deliveries`, `registered`, leftover `body` |
| .05 | `rows[CRITICAL_CLASS_FIXTURES + LOW_TONE].deliveries.channel`; all rows’ `providerAttempts` / `providerAccepted` vs `defaults` |
| .06 | `defaults` vs `TAXONOMY` (presence, source, channels, class rules, named-channel equality) |
| .12 | `rows['lovable.credits_blocked'].deliveries` roles and `recipientId` vs `actors` |

---

### 6. AT-016.01 static provider scan

**Seam** (`contracts.ts` 113–121): `StaticScan.providerClientImporters(): Promise<string[]>` — “components whose SOURCE imports a comms-provider client or reads a provider credential.” Comment: sole-writer is unfalsifiable from `senders()` / `emittedBy` alone.

**Harness wiring** (`index.ts` 197, 214–215): `refusing<StaticScan>('H3 static provider scan')` — a Proxy that throws `CapabilityPending` with that single name on any get. Same object at loop and integration. Confirmed by `vendors.selftest.ts` 268–283: still pending, capabilities exactly `['H3 static provider scan']`.

**What the test requires** (`a-emitter-and-taxonomy.test.ts` 27–30):

```ts
(await h.static.providerClientImporters()).sort()
  .toEqual(['notifications.emitter'])
```

Result shape: `string[]` of component ids. After sort, exactly one element, that id.

**What is missing**

1. Any implementation of `providerClientImporters`. The seam never answers.
2. Product notification source to scan. The loop fixture is declared not to count (H3 ruling in `loop/items/AI4DEV-19/brief.md` 103–107 and `AI4DEV-21/plan.md` 202–205): scanning the stand-in would be self-report.
3. File-walk roots, import patterns, credential-env patterns, and the mapping from a source file to a component name such as `'notifications.emitter'` — **not specified** in `StaticScan`. The test only constrains the return value.
4. `h.sentinels.scan` is unused by this id; plant + `sut.deliveries()` body search is the dynamic half. That half is implemented; the static half is not.

**Existing static-scan precedents (different seams)**

- `tests/at/suites/req-001/_source-scan.ts`: suite-local naming oracle over `src/routes/` + `src/routeTree.gen.ts`. Throws if the tree is missing/empty. Returns `SourceHit[]`. **Not** `h.static`.
- `tests/at/suites/req-001/_policy-scan.ts`: text oracle over `supabase/migrations/*.sql`. Also not `h.static`.

Neither is a drop-in for provider-client imports. The REQ-016 scan must inspect **product** TypeScript (and likely edge functions) for comms-provider SDK imports and credential reads, map hits to component ids, and return only `notifications.emitter`. Until that exists, `--expect` at loop **declares** AT-016.01 red as `capability-pending: ["H3 static provider scan"]` (`tests/at/expected/req-016.json` 18–22). First line compared exactly: `CapabilityPending: CAPABILITY PENDING — H3 static provider scan` (`expected.ts` 275–288).

---

### 7. Decomposition `loop/decomp/req-016.md`

- **Header:** pm-item AI4PM-20; wave W1 Foundation; surface mixed; `sync-stamp: 5d74fad · d84`; depends-on none.
- **Revision:** that sync-stamp / d84 line is the revision marker in the file.
- **Cross-contracts (verbatim substance):** foundational emitter — taxonomy events fire from owning requirements; live-event assertions ride each owning suite’s `[cross: REQ-016]` tests. Guarded producers (AT-016.09: money rows, both access rows, completion) are all in-wave — edges: REQ-006 D2.L1 (money ledger), REQ-009 D2.L3 (key issued/revoked), REQ-005.5 D6.L1–L2 (completion) → D3.L1. Emitter/outbox (D1.L1) lands first; those producers integrate against it. Anti-spam config (AT-016.08) is a pinned config fixture until REQ-015 (W4).
- **Done contract:** all 12 P0 green at integration + wiring leaf’s wired re-run + founder attestation. Verify: `bun run at:verify req-016 --tier integration` (+ `--wired` for in-app).
- **D1 — Emitter core & static taxonomy**
  - L1: one shared emitter sole writer; registered events = static table, immutable. Verify AT-016.01,02.
  - L2: full matrix recipients/channels/payloads, depleted-admin, ops-item events, sensitive negatives. Verify AT-016.03,04. Blocked-by L1.
- **D2 — Delivery semantics**
  - L1: critical email + in-app, low-tone in-app only; documented default per row. Verify AT-016.05,06. Blocked-by D1.L1.
  - L2: one logical notification; one delivery per pair; anti-spam conforms to pinned config `[cross: REQ-015]`. Verify AT-016.07,08. Blocked-by L1.
  - LW: wire in-app surface fixtures → edge functions. Verify wired re-run of ui-tagged P0s (no new ids). Blocked-by D1.L2, L1, L2.
- **D3 — Critical-event reliability guard**
  - L1: emitter/outbox atomic write; guarded producers integrate; full matrix fault-injected; recipients at creation. Verify AT-016.09,10. Blocked-by D1.L1 + those cross-manifest producers.
  - L2: sent only on provider acceptance; retry; never drop; lost-ack no duplicate; escalation → NGO + platform admin. Verify AT-016.11,12. Blocked-by L1.
- **Coverage:** D1 01–04, D2 05–08, D3 09–12. 12 = suite P0; each id in exactly one leaf (LW re-runs, adds none).

Note: D2.L1’s “critical events email + in-app” is stronger than the suite. Unspecified critical rows document **email only**; in-app is required only where the row names it.

---

### Files Read

- `tests/at/suites/req-016/{taxonomy,_fixture,_contract,_oracles,_bind}.ts`
- `tests/at/suites/req-016/{a-emitter-and-taxonomy,b-delivery-defaults,c-reliability-guard,d-taxonomy-evidence}.test.ts`
- `.taskmaster/docs/acceptance/at-req-016.md` (full)
- `.taskmaster/docs/requirements/req-016.md` (full)
- `.taskmaster/docs/architecture-notes.md` (REQ-016 section)
- `loop/decomp/req-016.md` (full)
- `tests/at/expected/req-016.json`
- `tests/at/harness/{contracts,index,registry,vendors,sentinels,faults,fixtures,atconfig,config,pending,expected}.ts` (relevant slices)
- `tests/at/suites/req-001/_source-scan.ts`, `_policy-scan.ts` (precedent)
- `tests/at/harness/vendors.selftest.ts` (static-scan still pending)
- `loop/items/AI4DEV-19/brief.md`, `loop/items/AI4DEV-21/plan.md` (why the scan stays pending)
- `loop/bringup/AI4DEV-3-at-harness.md` (capture-once rule)

### Boundaries

- REQ-016 owns emitter, taxonomy, defaults, reliability guard. Owning requirements fire the events; this suite asserts who/how.
- UI must not touch the DB; in-app wiring is D2.LW via edge functions. No `supabase/functions` notification code exists yet.
- `h.static` is harness-global and always refusing; it is not an adapter seam.
- Loop fixture cannot be the evidence gate; integration refuses the stand-in.
- `h.sentinels.scan` is unused by the suite; AT-016.01 uses plant + SUT bodies.
- Guard knobs are REQ-015-named, test-pinned in at-config until REQ-015 lands.

### Non-Obvious Things

- Unspecified critical-class channels are **email-only**, not email+in-app. Decomp D2.L1 disagrees with the suite.
- Reconciliation money events are class money (must email) but **not** in `GUARDED_ROWS`.
- AT-016.09 test requires **neither** side committed; written spec allows both committed.
- AT-016.07’s no-duplicate assertion cannot fail against this fixture; it is a regression guard for a real outbox.
- `PAYLOAD_PREDICATES` for `marketplaceVisibility` / `discoveryReopened` / `declineCause` do not require the value in the body; the others do.
- Fixture `bodyFor` only concatenates **string** payload values, so booleans never appear in copy.
- `describe.sequential` is load-bearing for the five capture consumers.
- Provider port returns `'no_ack'` for a lost ack; the test-facing trace records `'ack_lost'`. The sender must not treat `'no_ack'` as sent.
- `drainDeliveries({ passes: 0 | 1.5 | NaN })` is refused, not coerced.
- Integration red names `sut.notifications` (prefix added in `aboveLoopStandInRefusal`), not the loop’s `H3 static provider scan`.

### Open Questions

- How to map product files to component ids (`notifications.emitter`, `blockers.service`, …) for the static scan, and which import/credential patterns count. The contract does not say.
- Whether implementing the scan before product source exists should stay `CapabilityPending` (current declaration) or return `[]` and fail the equality (honest assertion red). The H3 ruling chose pending.
- Whether D2.L1 “email + in-app for critical events” should be tightened in the suite or loosened in the decomp.
- Whether `thread.comment` recipients should become “the other party” (REQ-015 / requirement prose) rather than volunteer-only.
- Ops-item **contents** (Discovery conversation, project, cause) are specified in the requirement isolate and not in AT-016.03’s body.
- No product notification module exists in this worktree to attach the scan to.
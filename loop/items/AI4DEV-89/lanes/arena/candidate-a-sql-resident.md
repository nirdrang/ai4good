### Direction

Postgres owns the notification domain. A migration seeds an immutable taxonomy table. One private `SECURITY DEFINER` emitter resolves recipients, chooses documented channels, validates facts, renders copy, creates ops items, and inserts deliveries inside the producer’s transaction. TypeScript moves committed delivery rows through a provider protocol. The bet is that notification correctness becomes easier to enforce when the state transition and its complete notification plan share one database transaction.

### The data shape

The organising structure is a table. The deployed database reads the table directly. It does not reconstruct notification rules from TypeScript.

The existing `tests/at/suites/req-016/taxonomy.ts` remains the sole authored declaration of the 48 specification rows. A build script generates the migration’s seed block from it. The generated SQL is a deployment artifact, not a second editable registry. Payload predicates and class channel rules remain independent acceptance oracles.

This choice makes runtime closure and transactional lookup simple. It creates a deliberate build dependency from product migrations to a test-owned specification file.

**Public tables**

All identifiers below are proposed names.

| Table | Core columns | Invariants |
|---|---|---|
| `notification_taxonomy` | `event text PK`, `recipients text[]`, `named_channels text[] nullable`, `effective_channels text[]`, `tone`, `event_class`, `payload_keys text[]`, `guarded boolean`, `ops_item boolean`, `escalation boolean`, `default_source text`, `default_explanation text` | Exactly 48 seeded rows. Arrays contain distinct permitted values. Effective channels are nonempty. Named channels equal effective channels when present. No runtime role can mutate the table. |
| `notification_events` | `id uuid PK`, `source_namespace text`, `source_id text`, `type FK`, `project_id uuid`, `actor_account_id uuid nullable`, `facts jsonb`, `recipients jsonb`, `created_at`, `state`, `attempts int`, `lease_token uuid nullable`, `lease_until timestamptz nullable`, `last_pass_id uuid nullable` | Unique `(source_namespace, source_id, type)`. Recipients and facts freeze at creation. Attempts count worker passes that attempted the event. |
| `notification_deliveries` | `id uuid PK`, `event_id FK`, `recipient_id uuid`, `role text`, `channel text`, `destination text nullable`, `payload jsonb`, `subject text`, `body text`, `provider_key text UNIQUE`, `state`, `emitted_by text`, `delivered_by_process text nullable`, `accepted_receipt jsonb nullable`, `next_attempt_at`, `last_error text nullable` | Unique `(event_id, recipient_id, channel)`. Frozen destination and copy. `emitted_by` is constrained to `notifications.emitter`. Email cannot become sent without an accepted receipt. |
| `ops_items` | `id uuid PK`, `linked_event_id uuid UNIQUE FK`, `kind text`, `project_id uuid`, `detail jsonb`, `created_at` | Exactly one item for an event whose taxonomy row requires one. No item for another row. |
| `notification_comment_policy` | `project_id uuid PK`, `max_per_window int`, `window_ms int`, `coalesce boolean`, `source text` | Positive cap and window. Explicit configuration. No inferred production values. |
| `notification_comment_windows` | `project_id`, `thread_id`, `recipient_id`, `window_started_at`, `comments_seen`, `notifications_created`, `coalesced_event_id nullable` | Primary key `(project_id, thread_id, recipient_id)`. Locked while evaluating a comment. Windows use database time. |
| `notification_comment_sources` | `project_id`, `comment_id`, `recipient_id`, `event_id nullable`, `disposition` | Primary key `(project_id, comment_id, recipient_id)`. Records emitted, coalesced, or capped comments. Replaying a comment cannot consume the cap again. |
| `notification_delivery_attempts` | `id uuid PK`, `delivery_id FK`, `pass_id uuid`, `process_epoch text`, `started_at`, `finished_at nullable`, `outcome nullable`, `provider_receipt jsonb nullable`, `error text nullable` | Records each attempted delivery, including uncertainty. Unique `(delivery_id, pass_id)`. An unfinished attempt remains observable after a crash. |

`state` uses the seam’s values `pending`, `retrying`, `sent`, and `failed`. The first implementation never silently moves an unconfirmed delivery to `failed` or deletes it.

`recipients` contains the seam’s creation snapshot.

```ts
type ResolvedRecipient = {
  role: 'ngo' | 'volunteer' | 'ex_volunteer' | 'platform_admin';
  recipientId: string;
  channels: ('email' | 'inapp')[];
};
```

Email destinations also freeze on delivery rows. Moving an organisation seat or changing the successor’s address cannot redirect old notifications.

**Fixture tables**

`tests/at/suites/req-016/_fixture-producers.sql` installs the private schema `at_req016` into the local stack.

It contains `transitions`, keyed by world, source identity, and event type. It stores representative committed facts and the previous volunteer when relevant. These are explicit fixture producers. They do not pretend to be Stripe, the gateway, or project lifecycle implementations.

The local provider fixture uses `at_req016.provider_requests` and `at_req016.provider_acceptances`. They record requests to the provider protocol and durable acceptance receipts. They are not the acceptance suite’s email-count oracle. Mailpit is that oracle.

### The design

**Files and ownership**

Create these product files.

| Path | Responsibility |
|---|---|
| `supabase/migrations/20260913120000_notification_domain.sql` | All eight public tables, seed block, privileges, emitter, and delivery-state functions. The timestamp is a proposed unused version after the existing migrations. |
| `supabase/notifications/emitter/worker.ts` | Provider-independent worker orchestration. No recipient, channel, payload, or rendering decisions. |
| `supabase/notifications/emitter/provider.ts` | Private idempotent provider protocol client. Accepts only persisted delivery envelopes. |
| `supabase/notifications/emitter/database.ts` | Fixed database calls for claiming and completing delivery work. No arbitrary query or notification-insert API. |
| `supabase/notifications/emitter/main.ts` | Background process entry point. Owns process identity and polling. |
| `supabase/notifications/delivery-defaults.generated.md` | Generated human-readable matrix containing all 48 delivery defaults and their explanations. |
| `scripts/generate-notification-taxonomy.ts` | Generates and checks the migration seed and delivery-default documentation. |

Create these suite files.

| Path | Responsibility |
|---|---|
| `tests/at/suites/req-016/_live.ts` | Factory receiving only `{ stack }`. Real database reads, fixture-world construction, worker control, faults, and sentinels. |
| `tests/at/suites/req-016/_integration.ts` | Eight integration procedures and their single shared taxonomy capture. |
| `tests/at/suites/req-016/_source-scan.ts` | Provider ownership, SQL writer ownership, taxonomy artifact equality, and background-entry inventory. |
| `tests/at/suites/req-016/_fixture-producers.sql` | Private local fixture transitions and atomic producer function. |
| `tests/at/suites/req-016/_provider-fixture.ts` | Local idempotent provider endpoint backed by Supabase and SMTP delivery to Mailpit. |
| `tests/at/suites/req-016/_mailpit.ts` | Independent catcher reads, MIME decoding, pagination, and envelope correlation. |
| `tests/at/suites/req-016/_evidence.ts` | Shared plain-data evidence shapes and assertion projections. No harness machinery. |
| `tests/at/suites/req-016/_source-scan.selftest.ts` | Discriminating scanner tests with rogue imports, SQL writers, grants, and seed drift. |

Change these existing files.

- `tests/at/suites/req-016/_contract.ts` gains required world methods for comment configuration and provider evidence. Seam types remain aliases.
- `tests/at/suites/req-016/_fixture.ts` implements those methods while remaining an explicitly labelled loop stand-in.
- The four existing `.test.ts` files retain the twelve registrations and select per-tier procedures.
- `tests/at/suites/req-001/_policy-scan.ts` gains the eight public catalog rows.
- `tests/at/suites/req-001/_write-route-scan.ts` checks the explicitly registered background entry and its fixed database port.
- `supabase/config.toml` exposes Mailpit SMTP on `44325`.
- `package.json` adds worker and generation-check commands.
- `.github/workflows/ci.yml` runs the generation check and scanner selftests.
- `tests/at/expected/req-016.json` records actual tier results as they become green.

There is no notification screen, route, or generic public emit endpoint.

**One taxonomy and documented defaults**

The generator preserves every specification field, including nullable named channels, payload keys, guarded flags, ops flags, and escalation flags.

It emits effective defaults as follows.

1. Explicit channels win exactly.
2. Null-channel critical rows receive email and in-app.
3. Null-channel `other` rows receive in-app.
4. Low-tone rows receive in-app only.

The second choice satisfies both the suite and the brief’s stronger wording. Access rows already name both channels.

Every generated row contains a nonempty documentation source and a complete explanation. For example, a payment row links to its entry in `delivery-defaults.generated.md` and states that the critical money default is email plus in-app.

The documentation is delivered as data through `documentedDefaults()`. It is not reconstructed from the worker’s behaviour.

Equality has three checks.

- CI regenerates the seed in memory and compares it byte-for-byte with the checked-in generated block.
- AT-016.02 compares the product’s registered names with the existing oracle, as today. Its source arm also checks the complete generated row projection.
- Integration reads the actual seeded table and compares all specification fields against `TAXONOMY`. It also checks effective defaults against the independent channel rules.

A changed event name fails AT-016.02. A changed recipient or payload obligation fails full-row equality and AT-016.03. A changed default fails generation checking or AT-016.06.

The notification implementer owns regeneration and deployment drift. The requirement owner owns changes to the specification rows. Updating the oracle to match faulty SQL is not a repair.

Runtime immutability comes from grants. No client, worker, or emitter role receives taxonomy mutation privileges. There is no registration function. Migration ownership remains the explicit administrative escape hatch.

**The atomic emit path**

The internal contract is deliberately narrower than arbitrary recipients and arbitrary copy.

```sql
public.emit_notification(
  p_source_namespace text,
  p_source_id text,
  p_type text,
  p_project_id uuid,
  p_facts jsonb
) returns uuid
```

A producer supplies a durable source identity and facts from its own transition. It supplies neither channels nor recipient arrays nor rendered bodies.

The emitter performs these steps.

1. Look up the taxonomy row. Reject an unknown type before notification writes.
2. Find an existing event for the source identity. Return it unchanged on an identical replay. Reject conflicting facts under the same identity.
3. Validate required facts.
4. Resolve recipient accounts and destinations.
5. Apply the comment guard when this is `thread.comment`.
6. Construct audience-safe payloads and plain-text bodies in PL/pgSQL.
7. Insert the logical event.
8. Insert one delivery per distinct recipient and channel.
9. Insert the linked ops item when required.
10. Return the event ID.

Concurrent producer replay is arbitrated by the unique source constraint. The loser reads the existing result after the winner commits. Recipient resolution and rendering do not run again for a committed replay.

The fixture producer has this shape.

```sql
begin
  perform public.assert_account_active(p_actor_id);
  perform set_config('app.actor_account_id', p_actor_id::text, true);

  insert into at_req016.transitions (...);

  if p_fault_token is not null then
    raise exception 'induced notification atomicity fault'
      using errcode = 'P1609', detail = p_fault_token;
  end if;

  return public.emit_notification(
    p_source_namespace, p_source_id, p_type, p_project_id, p_facts
  );
end;
```

The adapter executes one function call. Its implicit transaction includes the transition, emitter, deliveries, and ops item. The fixture does not catch the exception inside SQL.

The fault token is supplied on that same call. It does not rely on a GUC set by a previous pooled request. The adapter increments the armed handle’s trigger count only when it receives SQLSTATE `P1609` with the matching token. That count lives outside the rolled-back transaction.

Each of the eleven guarded rows gets both a control run and a fault run. All observations are scoped to that world. Previous controls cannot satisfy a later world’s assertions.

A real producer later replaces the fixture’s transition statements and calls the same emitter before its existing transaction returns. User-facing producer routes continue through `writeRoute`, their `WRITE_ROUTES` entry, and `assert_account_active`. Notification SQL never becomes a second round trip after a committed transition.

**Recipient resolution**

The emitter reads the real account and assignment tables.

- NGO comes from the project organisation’s current `org_memberships` seat.
- Volunteer comes from `projects.assigned_volunteer_id`.
- Platform admin resolves to the platform administrators eligible at creation. The integration world provisions one shared eligible administrator.
- Ex-volunteer comes from a validated `previousVolunteerId` transition fact captured before release. It is not an account type.

The producer locks assignment state while changing it. The emitter locks the relevant seat and account rows while taking its snapshot. A concurrent contact transfer therefore has a defined ordering relative to notification creation.

The snapshot is authoritative after commit. Delivery never joins memberships or project assignments to choose recipients again.

The current oracle fixes `thread.comment` to the volunteer. This run implements that exact row. General bidirectional “other party” routing requires a future explicit specification change.

**Payload meanings and SQL copy**

`p_facts` contains domain facts, not finished notification payloads. The emitter uses an explicit per-event `CASE` and `jsonb_build_object`. It never copies the entire input JSON into every audience’s payload.

| Event family | SQL-produced meaning |
|---|---|
| Triage approval | Boolean `marketplaceVisibility = true` and a sentence that the project is visible in the marketplace. |
| Returned to scope | Validated producer reason, included literally in the body. |
| Match created | `consentCta` and copy asking the volunteer to confirm consent. |
| Match consented | `fundToKickOff` and copy directing the NGO to fund the project to begin. |
| Discovery decline | Validated cause, producer reshaping suggestion, and SQL-owned human-review promise. |
| Discovery review | Admin payload and ops detail containing project, cause, and full Discovery conversation. |
| Discovery overturned | Boolean `discoveryReopened = true` and explicit reopened copy. |
| Key revoked | SQL-owned dashboard replacement instruction. No key material. |
| PM status auto-reverted | SQL-owned supported-action instruction without penalty language. |
| Leftover released | Copy describing release to the NGO’s general balance. No donation framing. |

The fixture supplies meaningful reasons, suggestions, conversation contents, and other transition facts. Product SQL supplies their payload structure and wording.

Discovery decline and review remain separate events from the same producer transaction. Admin deliberation and the full conversation never enter the NGO event. An upheld review creates no additional NGO event.

The sentinel parameter maps to a permitted plain-text message fragment for the three domain probes. It does not unlock arbitrary payload merging.

Bodies are plain text in v1. TypeScript performs MIME encoding only. Integration decodes the Mailpit copy and applies the payload predicates to the text that actually arrived.

**Comment coalescing**

Configuration is stored per project. `w.configureThreadCommentGuard(...)` writes the fixture’s pinned configuration through operator setup and reads it back. The live adapter never assumes it received `h.config`.

For each comment, the emitter locks the window for project, thread, and resolved recipient.

With coalescing disabled, it creates at most `max_per_window` events. With coalescing enabled, it creates one notification for the window and maps later comment sources to it. A sent body is never rewritten. The copy tells the recipient to open the thread for its current comments.

The comment source table records suppressed and coalesced inputs. This makes source replay deterministic.

AT-016.08 retains the two actual configurations.

- Registry defaults use cap 2, window 60 seconds, and no coalescing.
- The override uses cap 4, window 120 seconds, and coalescing.

Integration passes those values through the world, reads the database’s window start, and waits across the real window boundary. It does not shorten the test pin or manipulate delivery results. Its timeout accounts for both windows.

Comment suppression is an explicit exception to one notification per raw domain input. The guard determines notification-worthy events. Critical events never pass through that guard.

**Delivery and provider acceptance**

The worker claims whole events through `public.claim_notification_events`. SQL uses row locking, `SKIP LOCKED`, and expiring leases. Claiming increments `attempts` once per event and pass. A repeated call with the same pass ID cannot increment it twice.

The returned envelopes already contain recipients, channels, destination, payload, subject, body, and provider key.

For in-app delivery, the worker records successful publication through `public.record_notification_delivery_result`. That updates the existing row to sent. It never invokes the provider.

For email, it submits the persisted envelope to the provider using:

```text
notification:v1:<event UUID>:<recipient UUID>:email
```

The same key also appears in a stable message header. The provider rejects reuse of a key with different envelope contents.

The result function checks the claim token and records acceptance or uncertainty. It sets the event to sent only when every delivery is sent. It preserves the first successful process stamp. An expired worker cannot overwrite a successor’s progress.

Each send has an attempt row before external I/O. Rejections and missing acknowledgments remain retrying. An abandoned claim expires and another process resumes from database rows.

`processRestart()` stops the worker process and starts a fresh process with a new epoch. It does not merely change a label. The replacement holds no in-memory delivery queue.

**The Mailpit provider boundary**

SMTP does not provide the required application idempotency contract by itself. A stable `Message-ID` is correlation data, not a promise that the catcher will deduplicate it.

The local provider fixture exposes an idempotent submission endpoint. It persists requests and receipts in `at_req016`, sends actual SMTP messages to Mailpit, and returns replayed acceptance for an already accepted key.

Its two injected outcomes are precise.

- `reject` records an explicit provider rejection before SMTP submission.
- `lose_ack` sends to Mailpit, observes acceptance, durably stores the receipt, and drops the response to the worker.

The worker then makes a second real request to that endpoint. The endpoint returns the stored acceptance without a second SMTP message. Mailpit independently proves that exactly one message exists.

If the provider fixture itself crashes between SMTP acceptance and receipt persistence, it searches Mailpit for the stable key and exact envelope. A positive match repairs the receipt. A missing or unavailable search result does not authorize a blind resend.

Mailpit provides APIs for searching and reading stored messages. The implementation verifies the installed version’s API before using it. [Mailpit API documentation](https://mailpit.axllent.org/docs/api-v1/)

This is an explicit provider fixture around a real catcher. It does not turn a production provider into a tested dependency. A hosted provider must supply equivalent durable idempotency and acceptance lookup before deployment can claim the same guarantee.

The irreducible limitation is stated plainly. With an unresolved SMTP outcome and no authoritative acceptance lookup, eventual delivery and guaranteed absence of duplicate physical email cannot both be promised. This implementation keeps that case visible and retries acceptance resolution.

**Independent integration evidence**

`_mailpit.ts` reads the catcher independently of the worker and provider fixture. It paginates results, decodes MIME, and correlates the stable key, event ID, actual address, and body.

It never deduplicates the observed message list. Two physical messages with the same key must fail the test.

The provider fixture’s request trace proves rejected requests and repeated protocol requests. Mailpit proves actual acceptance, recipient, body, and physical count. Product attempt rows provide a third observation, not a substitute for either.

The taxonomy capture still runs once. The five projections for .03, .04, .05, .06, and .12 share frozen plain data. Their assertions stay equivalent across tiers.

**Sole writer and database posture**

The emitter is one component with two private parts. SQL creates the notification plan. Its transport process delivers that plan. The component identifier `notifications.emitter` covers an exact file allowlist, not every file under a convenient directory.

Database roles separate capabilities.

- `notification_emit_owner` is `NOLOGIN`. It can read required domain rows and insert notification events, deliveries, and ops items. It owns `emit_notification`.
- `notification_delivery_owner` is `NOLOGIN`. It can update delivery progress and insert attempt rows. It cannot insert events, deliveries, or ops items.
- `notification_worker` is the background execution role. It has no table writes. It can execute only the fixed claim and result functions.

Every new definer has `SET search_path = ''` and explicit execute revocation from `PUBLIC`, `anon`, `authenticated`, and `service_role`.

`emit_notification` receives no client execute grant. Fixture producers execute it as the trusted database operator. Future producer definers execute it through their trusted owner.

Claim and result functions grant execute only to `notification_worker`. They are background processing boundaries, not user-account writes. No `WRITE_GATE_EXEMPT` entry is needed because `service_role` cannot execute them.

All public tables first revoke all privileges from the three client roles and `PUBLIC`. All enable RLS without FORCE.

| Table | `TENANT_CATALOG` posture | Client grants and policy |
|---|---|---|
| `notification_taxonomy` | `unreachable-by-client-roles` | None. |
| `notification_events` | `unreachable-by-client-roles` | None. |
| `notification_deliveries` | `tenant-isolated` | Authenticated SELECT only. Policy requires `recipient_id = (select auth.uid())`, `channel = 'inapp'`, and `state = 'sent'`. |
| `ops_items` | `unreachable-by-client-roles` | None. |
| `notification_comment_policy` | `unreachable-by-client-roles` | None. |
| `notification_comment_windows` | `unreachable-by-client-roles` | None. |
| `notification_comment_sources` | `unreachable-by-client-roles` | None. |
| `notification_delivery_attempts` | `unreachable-by-client-roles` | None. |

No new `service_role` SELECT grants are introduced. The auth suite’s live select allowlist remains unchanged.

The `at_req016` schema is an explicit test-only exception to the public migration catalog. The fixture installer revokes schema, table, and function access from client roles. `_source-scan.ts` and live privilege checks verify that exclusion. Product modules cannot import fixture modules. Teardown removes the private fixture schema after its workers stop.

The background process is also an explicit extension to the current HTTP-only write inventory. `_write-route-scan.ts` registers its exact entry file, database port, role, and allowed function names. It rejects additional background database access. Existing HTTP route checks remain intact. No new HTTP write route is introduced.

The suite-local source oracle checks:

- Provider imports, provider endpoints, credentials, raw send operations, and transitive imports.
- Domain code importing the emitter’s private transport.
- Inserts into notification event, delivery, and ops tables outside `emit_notification`.
- Worker grants that permit notification creation.
- Runtime taxonomy mutation functions or grants.
- Fixture code imported by product code.

It returns the single sender component only after finding the expected provider client. Missing directories or an unreadable migration fail the scan.

This is a practical structural oracle. It does not prove absence of deliberately disguised network code. Database grants provide the stronger creation boundary.

The acceptance read path ends at SQL projections and the recipient RLS policy. A later screen must use a caller-bound edge read. No UI code receives direct database access in this run.

### Per-id plan

| ID | Product requirement | Seam requirement | `integration:` procedure | Integration witness |
|---|---|---|---|---|
| AT-016.01 | Private SQL writer and emitter-owned transport | Sender probes, domain fixtures, sentinel bodies | Yes. Replace `h.static` and vendor reads. | Suite-local source scan, live grants, delivered sentinel text, provider request trace with no orphan event. |
| AT-016.02 | Closed seeded table and unknown-type rejection | Real taxonomy query and private rejection probe | No. Strengthen the shared source arm. | Actual table equality, unchanged database counts, no new catcher message, absent mutation grants and routes. |
| AT-016.03 | All recipients, channels, SQL payloads, bodies, and three ops items | Full-world fixtures and shared capture | Yes. | Database rows plus decoded Mailpit copies and exact physical email pairs. |
| AT-016.04 | Audience isolation and no donation event or framing | Negative projections of shared evidence | Yes. | Frozen recipients, actual mail recipients and copy, closed taxonomy. |
| AT-016.05 | Critical email and low-tone in-app only | Provider evidence from shared capture | Yes. | Exact Mailpit email pairs and no provider requests for in-app deliveries. |
| AT-016.06 | Explicit per-row delivery documentation | Actual seeded defaults and generated-source check | Yes, because it shares the integration capture. | All 48 documented rows, nonempty sources, independent class rules. |
| AT-016.07 | Durable source identity, pair uniqueness, restart recovery | Stop and replace the real worker process | No. | Event committed before restart, unsent rows, changed epoch, successor stamps, one row per pair. |
| AT-016.08 | SQL cap and coalescing state | World configuration setter and readback | Yes. | Actual database policy, real window timestamps, prescribed counts before and after the boundary. |
| AT-016.09 | One producer transaction containing the emitter | Eleven fixture transitions and exact fault-token counting | No. | Raised SQLSTATE, external trigger count, four absent outcomes, successful controls. |
| AT-016.10 | Frozen recipient and address snapshot | Real account creation and membership reassignment | No. | Original account receives; successor is absent from deliveries and email. |
| AT-016.11 | Acceptance-gated progress and persistent provider key | Provider reject/lost-response faults and request trace | Yes. | Retry states after one pass, second provider request, one Mailpit message, accepted final rows. |
| AT-016.12 | Exact escalation recipients | Shared taxonomy capture | Yes. | NGO and platform admin account IDs, in-app rows, and email if documented. |

At loop, the existing stand-in continues to exercise each criterion with the controlled clock and email simulator. AT-016.01 additionally runs the real source oracle. Loop greens do not establish PL/pgSQL correctness.

The eight integration procedures are exactly .01, .03, .04, .05, .06, .08, .11, and .12. No integration procedure reads `h.vendors` or controls `h.clock`. Neither tier accesses the refusing `h.static` proxy.

### The six units

The brief’s order is retained. Its green boundaries cannot be retained literally without pulling substantial dependencies forward.

| Unit | Files touched | Acceptance outcome |
|---|---|---|
| One shared emitter and static table | Migration, generator, worker skeleton, provider client, `_source-scan.ts`, scanner selftests, policy catalog, background inventory, package and CI commands | .01 and .02. Their verification requires a working emit and delivery path, so the durable schema and basic provider protocol already exist here. |
| Full taxonomy matrix | Emitter validation and rendering in migration, `_fixture-producers.sql`, `_live.ts`, `_integration.ts`, `_mailpit.ts`, `_evidence.ts`, `_contract.ts`, `_fixture.ts`, taxonomy evidence test file | .03 and .04. All 48 events now execute against SQL and Mailpit. |
| Delivery defaults | Generated default documentation, seed verification, default projections and assertions | .05 and .06. Defaults necessarily exist earlier because the matrix cannot deliver unspecified channels without them. This unit completes their documentation and evidence. |
| Idempotency and comment guard | Comment tables and emitter branch, worker restart control, world configuration methods, delivery-default test file | .07 and .08. Source and pair uniqueness were prerequisites in the first unit. |
| Atomic producers and recipient snapshots | Guarded fixture matrix, fault bridge, reassignment world method, reliability test file | .09 and .10. Atomic emission and recipient snapshots already exist. This unit proves every required fault case. |
| Provider acceptance and escalation | `_provider-fixture.ts`, retry recovery, receipt handling, integration reliability procedure, escalation projection | .11 and .12. Basic acceptance handling exists earlier. This unit proves rejection, lost acknowledgment, and replay. |

`supabase/config.toml` changes before the first live send. The stack must restart before integration verification. A database reset alone does not expose the commented SMTP port.

`_live.ts` cannot be introduced casually between these units. Its existence opens all twelve integration bodies. I would develop the six units in order and run their targeted checks, then introduce the complete live gate and final manifest together. This is a concrete exception to “each unit independently green under the full manifest before the next starts.”

The alternative is to move nearly the whole subsystem into unit one. I would not manufacture capability refusals merely to preserve commit boundaries. Early greens are recorded honestly.

Final verification runs:

- `bun run typecheck`
- `bun run at:check req-016`
- `bun run at:selftest`
- Taxonomy generation and source-scan checks
- REQ-016 verification at loop and integration with `--expect`
- REQ-001 verification at both tiers with its existing expectations

Generated documentation follows the repository’s documentation sync process. No file, test, stack, or board was changed during this design.

### Rubric answers

**1. Atomicity by construction**

The transaction is the single producer function call. The fault raises after its transition insert and before `emit_notification`. PostgreSQL rolls back the whole statement. The adapter counts the matching exception outside that transaction, so rollback cannot erase proof that the point fired.

**2. Sole writer, structurally**

Only the emitter owner has notification-creation privileges. Delivery processing has progress privileges only. Domain code has neither transport credentials nor a notification-table insert capability. The source oracle independently checks SQL writes, transport imports, credentials, grants, and private-module access.

**3. One taxonomy, one source**

The existing suite file owns the authored rows. SQL seeds and documentation are generated artifacts. CI checks generation. Integration compares the actual table with the full oracle projection. AT-016.02 detects registration drift, .03 detects behaviour drift, and .06 detects default drift. The implementer repairs artifacts; the requirement owner approves specification changes.

**4. Honest at both tiers**

Loop runs the reference stand-in. Integration runs shipped SQL and the real worker against local Supabase. Eight procedures replace unavailable harness seams. Mailpit independently proves physical email delivery. The local provider fixture supplies the idempotent protocol and fault injection, and is explicitly identified as such.

**5. Passes the standing gates**

Every new public table has a catalog row, baseline revokes, and RLS. Only recipient deliveries grant authenticated SELECT. No new table grants anything to `service_role`. Every definer has explicit execute revocation and an empty search path. The background entry receives an explicit inventory check. The private fixture schema receives its own privilege checks. Existing HTTP write-route and lifecycle gates remain intact.

**6. Retry without duplication**

Source identity prevents duplicate logical events. The triple constraint prevents duplicate delivery rows. The persisted provider key prevents accepted protocol replays from submitting a second physical message. Leases, receipts, and attempts survive worker restart. Lost acknowledgment leaves retrying state until replay returns acceptance. An unresolved SMTP outcome triggers acceptance lookup, never an unqualified resend.

### Rationale

I rejected a hand-maintained SQL taxonomy alongside the suite array. Equality tests would detect drift, but writers would still maintain the same 48 decisions twice. Generating the seed gives one authored declaration while keeping runtime ownership in Postgres.

I rejected triggers on future domain tables. Those tables do not exist, and triggers would obscure the point where a producer promises atomic notification. An explicit internal emitter call makes that contract reviewable.

I rejected separate transition and emit RPCs. No retry policy can repair the atomicity claim after the first transaction has committed alone.

I rejected TypeScript recipient resolution and body rendering. They would force the emitter to trust a precomputed plan or split the transaction. This direction earns its simplicity by keeping both decisions in SQL.

I rejected copying arbitrary producer JSON into delivered payloads. The Discovery audience split makes that unsafe. Explicit SQL projections prevent admin context from leaking into NGO copy.

I rejected a service-role outbox writer and an anonymous worker edge function. Both fight standing gates. A constrained background role exposes only progress functions.

I rejected changing the harness to implement `h.static`. The suite-local oracle already has a repository precedent and works at both tiers.

I rejected treating the delivery unique constraint or a repeated `Message-ID` as physical-email deduplication. Neither provides provider acceptance replay.

I also rejected shortening the comment windows merely for speed. The existing pins are practical to test with real time and remove an unnecessary difference between tiers.

### Where this direction strains

PL/pgSQL loses TypeScript’s discriminated payload types. JSON validation becomes explicit SQL. A misspelled field can survive compilation and fail only when that event executes. The full 48-row integration capture is therefore essential.

SQL copy is harder to review and localise. Escaping, punctuation, audience selection, and transaction logic share one function. Plain text keeps the first version manageable. Rich email templates would make this direction substantially less attractive.

Loop tests cannot execute the SQL domain without a database. They remain tests of the acceptance machinery and stand-in. Product confidence comes from integration, which CI currently does not run.

The source-owned seed generator introduces build coupling to `tests/at`. Moving the authored rows into a neutral specification package later is possible, but must preserve independent class and payload oracles. It should not make expected behaviour derive from deployed behaviour.

The background role and inventory are new infrastructure. They are a bounded extension to the current HTTP route model, but they still require review. Hiding a host worker outside the existing scan would be cheaper and less honest.

Mailpit cannot remove the distributed acceptance problem. The local idempotent provider fixture proves the worker’s protocol behaviour and actual catcher delivery. It does not prove an unspecified hosted provider. Switching providers requires verified idempotency retention, conflicting-key behaviour, and acceptance lookup.

Fixture-producer greens establish the emitter transaction contract. They do not establish that future ledger, gateway, or lifecycle producers call it correctly. Those producers must run the same fault matrix when they replace their fixtures.

If SQL rendering later becomes too costly, retain SQL recipient resolution and atomic plan creation. Replace body generation with versioned templates whose inputs and template version are frozen transactionally. That would be a deliberate departure from this direction, with new tests proving that rendering cannot change audience or payload meaning.
The twelve ids have to go green on one shared database, with no vendor simulator. Candidate D is the only design that actually observes that.

### Scores

| Criterion | A | B | C | D |
|---|---|---|---|---|
| 1. Atomicity by construction | 4 | 3 | 2 | 5 |
| 2. Sole writer, structurally | 4 | 3 | 5 | 4 |
| 3. One taxonomy, one source | 5 | 4 | 3 | 4 |
| 4. Honest at both tiers | 4 | 4 | 3 | 5 |
| 5. Passes the standing gates | 3 | 5 | 2 | 4 |
| 6. Retry without duplication | 4 | 3 | 5 | 4 |
| **Total** | **24** | **22** | **20** | **26** |

**1. Atomicity.** D names the one-call transaction, raises the fault as a call argument, keeps the trigger count on a sequence plus the matching refusal, and filters every SUT read by the open world's actors. A has the same transaction and a refusal count, but only claims world scoping in words. B's fixture ledger is world-keyed, yet `events()`, `deliveries()`, and `opsItems()` are unscoped operator selects, so AT-016.09's crash world still sees the control world. C's transaction is right and the sequence survives rollback, but `notification_fixture_ledger` is keyed only by event name, so the crash world reads the control world's `committed = true`.

**2. Sole writer.** C is the only design that stops a postgres-owned definer from inserting a delivery. A GUC trigger fires even for the table owner. A splits roles, but this tree's definers run as postgres and roles do not bind a superuser. D's branded `WriteSet` dies at the JSON boundary. B's emitter trusts any batch it is handed.

**3. Taxonomy.** A authors the 48 rows once in the suite file, generates the seed, and fails CI on byte drift. B and D author a product const and prove equality at run time. D also checks migration seed names. C lists the 48 names twice, in the migration and in the suite, with no generator.

**4. Honest at both tiers.** All four name the same eight integration procedures and none reads `h.vendors` above loop. D is the only one that also names the self-test pin on `_live.ts`, the `--expect` rule on a red that went green, and a Mailpit witness the body reads itself. A and B delay AT-016.12's manifest flip after the capture already makes it pass. C shortens the pinned anti-spam windows.

**5. Gates.** B is the only design a writer could land without inventing posture. Three public tables, catalog rows, baseline revokes, one in-app select policy, no `service_role` write, no function directory, fixture schema outside `public`. D would pass CI, but it marks deliveries unreachable and the brief wants a recipient select policy. A adds eight tables plus cluster roles this repo has never created. C puts fourteen tables in `public`, including test fixtures.

**6. Retry.** C makes a second physical send unrepresentable. A receipt row is unique on the triple, and lost-ack occupancy is `retrying` with `receipt_id` set, so the next pass does not call SMTP. A persists receipts in a provider fixture and states the SMTP gap honestly. D and B search Mailpit for the key. That is a catcher trick, not a product fact, and it dies if the search misses.

### Per candidate

**A.** Strongest is taxonomy. Weakest is the standing gates. To be the base it must drop `CREATE ROLE`, say how `sut.events()` is scoped to one world, and move the self-test that pins `liveAdapterExists('req-016') === false`.

**B.** Strongest is the standing gates. Weakest is atomicity as a test you can actually run. To be the base it must filter every SUT read by the open world's actors. Without that, AT-016.09 is red at integration.

**C.** Strongest is sole writer and retry. Weakest is atomicity and the gates. To be the base it must key the fixture ledger by world, take `notification_fault_point()` off the production path, and move fixture tables out of `public`.

**D.** Strongest is atomicity and honesty at both tiers. Weakest is a cluster of fours (sole writer, taxonomy, gates, retry). To be the base it needs no structural change. It still needs a durable receipt and a recipient select policy.

### Factual errors

**A.** `CREATE ROLE` is cluster-wide. `supabase db reset` drops the database and replays migrations. The role is still there, so the second reset fails unless the statement is `IF NOT EXISTS`. No migration in this tree creates a role. Unit 2 fires all 48 rows, which turns AT-016.12 green, while unit 6 still holds that id's manifest flip. `--expect` fails a declared red that went green. The document never mentions `tests/at/harness/conformance.selftest.ts`, which asserts `liveAdapterExists('req-016')` is false.

**B.** "Worlds have no teardown work because the runner reset the database before the run" is false for worlds inside one body. The runner resets once per verify run. AT-016.09 opens twenty-two worlds against that one database. Unscoped `sut.events({ type })` and `sut.opsItems()` then see the control world. `_shared/notifications-provider.ts` uses `fetch`. The load-bearing split in this tree is that every `_shared` module except `edge.ts` is pure (no fetch, no Deno, no clock). The same `_live.ts` self-test pin is omitted. Holding AT-016.12 red until unit 6 after unit 2's capture is the same `--expect` miss as A.

**C.** `notification_fixture_ledger` has `event` as primary key. AT-016.09's crash world then reads the control world's committed row. The same document says previous controls cannot satisfy a later world. Those two claims cannot both be true. `notification_fixture_bindings` is also keyed only by role, so one world's `reassignRole` mutates every world. `notification_fault_point()` always calls `nextval` and real producers are told to call it, so production emit increments a test sequence. SMTP lives in `_shared/notification-smtp.ts`, which breaks the same purity split as B. The loop self-test pin is omitted.

**D.** Deliveries as `unreachable-by-client-roles` is a posture choice, not a false tree claim, but it contradicts the brief's rule that a recipient reads in-app rows as the caller. The product tree has no send-path file. The source scan throws on zero hits, so AT-016.01 depends on counting a `ProviderPort` mention as a send path. That tension is inside the document. The strains section is truncated. No false claim I checked against the tree was false. `relkind = 'r'` hiding a sequence, and `configDriftProblems` not locking `smtp_port`, are both true.

### Unique catches

**A.** One authored taxonomy in the suite file, with a generated seed and a byte-for-byte CI check. Emit owner, delivery owner, and worker as separate database roles. Durable comment windows plus a comment-source table so a replay cannot consume the cap twice. Unique `(source_namespace, source_id, type)` so a producer replay returns the committed event. An independent Mailpit reader that never collapses two physical messages with the same key. A local provider fixture that stores receipts and repairs them from Mailpit if it crashes after SMTP 250. The SMTP honesty line (eventual delivery and no duplicate cannot both be promised without acceptance lookup). SQL-owned payload projections so Discovery admin copy cannot leak into the NGO event. Seat rows locked while the snapshot is taken. Refusal to shorten the pinned anti-spam windows. An explicit write-route-scan extension for a background entry.

**B.** Mailpit HTTP send on the web port, so `smtp_port` stays commented and the stack is not restarted. `computeBatch` as the only constructor of a batch, with dumb SQL insert. Idempotency key computed in `notification_pending_deliveries()`. Optional guard configuration on `burstThreadComments` for a live factory that never sees `h.config`. Version gate through `mailIdentification` if the send API is missing. Explicit rejection of a second SQL list of the 48 names.

**C.** Occupancy as the only state row, with identity holding none. Legal-transition catalog with a foreign key, so `sent → anything` and in-app `retrying` cannot be inserted. Lost acknowledgment as `retrying` occupancy with `receipt_id` set. Event state as a view, so a writer cannot store `sent` on an event that still has a pending child. AT-016.01 can pass with a no-op drain, because bodies and `emittedBy` are written at emit. AT-016.05 must stay declared red until the worker exists. AT-016.12 goes green with the unit 2 capture, so the manifest must move it then. Class channel rules as table checks. Append-only transition log on the audit-events pattern. Attempts table as the integration replacement for `h.vendors.email.attempts()`, which Mailpit cannot store. GUC insert triggers so even the table owner cannot mint a delivery.

**D.** Faults are an adapter that misbehaves. The core never learns they exist. Provider `reject` and `lose_ack` are a decorator around `ProviderPort`, so product send code does not read a test arming. Two-witness trigger count (sequence delta and refusal detail must agree). SUT reads scoped by the open world's actor ids, which is the only complete answer to twenty-two worlds on one database. Configuration passed through the world name because the live factory receives only `{ stack }`. The self-test that pins `liveAdapterExists('req-016') === false` and must be re-pointed when `_live.ts` appears. `taxonomySeedProblems()` as a static name check. `configDriftProblems` does not lock `smtp_port` (true in `local-stack.ts`). The live catalog query uses `relkind = 'r'`, so a sequence is invisible (true in `_live-tenant-reads.ts`). Mail witness imported by the test body from `live-stack.ts`, not hung on the SUT, because `SutOf` is derived from the loop fixture. Guard kept on the thread-comment producer, not inside `emit`, because `w.fire('thread.comment')` must still deliver. Fixture producers in their own migration so they can be dropped later. `timeoutMs` of 240 seconds for AT-016.09's twenty-two worlds. Capability-pending methods on the live adapter so units can land behind a file whose existence opens every id.

### Convergence

All four put the producer's transition and the notification write in one `SECURITY DEFINER` call. All four use fixture producers for the eleven guarded rows. All four add `_live.ts`, `_integration.ts`, and a suite-local source scan instead of implementing `h.static`. All four give integration procedures to AT-016.01, .03, .04, .05, .06, .08, .11, and .12, and keep .02, .07, .09, and .10 as a single body. All four witness email on Mailpit, not on `h.vendors`. All four unique `(event_id, recipient_id, channel)` and constrain `emitted_by` to `notifications.emitter`. All four add no write-route directory and no `service_role` table write. All four freeze recipients at emit and skip the provider for in-app. All four provision actors with the admin API and `email_confirm: true`. All four name the fault `notifications.between_transition_and_event_write` and add `notifications.provider_send` for AT-016.11. All four treat `processRestart` as a new worker object over durable rows. That shape is the right shape.

### Divergence

Taxonomy home. A and C put the live rules in SQL. B and D put them in a TypeScript const. A generates SQL from the suite file, which is the only "declared once" that is literally true. C hand-maintains two lists. For this run, a product const plus a seed check (D) is enough, because the loop tier can grade it without a database. A's generator is the one to graft if the emitter moves into SQL later.

Recipient resolution. A and C resolve inside the transaction and lock seats. B and D resolve before the call. AT-016.10 reassigns after fire, so both pass that id. A's lock is the one that survives a concurrent contact transfer. B names the staleness window and accepts it.

Send path. A, C, and D use SMTP on 44325 and restart the stack. B posts to Mailpit HTTP on 44324. The tree comments 44325 for application mail. Mailpit's send API is not in this tree. SMTP is the conservative choice. B's HTTP path is a real option only after `mailIdentification` proves the version.

State. C uses occupancy plus a legal catalog. The other three use a state column. C is the better AT-016.11 model and the worse gate surface. Graft the receipt, not the fourteen tables.

Loop fixture. B and D rebind it onto the product core, so a loop green starts to grade product code. A and C leave the stand-in in place, which is honest for a SQL domain the loop cannot run.

Fault arming. A, B, and D pass the crash as an argument of the fixture call. C writes a public arming table. The argument is correct. A session GUC is not visible across PostgREST's pool. A control table is what the exploration expected, and it is the worse of the two surviving options.

Deliveries posture. A, B, and C grant `authenticated` select under an in-app policy. D leaves the table unreachable. Isolated is the brief's read path.

Comment guard. A and C store windows in SQL. B and D keep them in the adapter. The brief says the configuration is a fixture until the comment-thread requirement lands. Memory is in scope. A's tables are extra gate surface.

### Recommendation

Use **D as the base**. This task is twelve ids green at integration on one local stack. D wins atomicity and honesty at both tiers, and those two are what make AT-016.09 and the eight vendor, clock, and static bodies pass. It is the only design that scopes SUT reads to one world, the only one that names the `_live.ts` self-test pin, and the only one that treats a fault as adapter misbehaviour so product SQL does not contain a test hook. C is the weakest overall. Its retry machine is the best of the four, and its fixture ledger cannot prove the crash it exists to prove. B would pass CI on day one and then fail AT-016.09 because it reads the whole database. A has the best taxonomy story and the only emitter that does not trust a precomputed plan, and it would fail the first `at:selftest` the moment `_live.ts` exists.

Graft three things into D.

1. From **C**, the provider receipt unique on `(event_id, recipient_id, channel)` and lost-ack occupancy that stays `retrying` with `receipt_id` set. Mailpit search is then a backup, not the product's memory of acceptance.
2. From **B**, deliveries as tenant-isolated, `grant select` to `authenticated`, policy `recipient_id = (select auth.uid()) and channel = 'inapp'`. That is the brief's in-app read path and the catalog scan's isolated posture, and it costs three statements now.
3. From **A**, the Mailpit reader that never collapses two messages with the same key, plus the source scan that also refuses an `INSERT` into the notification tables outside the emitter. Keep D's product const as the authored taxonomy. Add A's closed event-name seed as a foreign-key target, which D already sketched, and keep A's independent catcher so a duplicate physical send fails the test.
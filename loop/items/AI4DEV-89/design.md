# The design for the notifications backend run

This is the lead's synthesis. It is the design the six units are built from.

**The base is candidate D**, `loop/items/AI4DEV-89/lanes/arena/candidate-d-ports-and-adapters.md`.
Read that document in full first. It is the design. Everything below either overrides a part of it or
adds to it, and where this file and candidate D disagree, this file wins.

The other three candidates are kept beside it for their rationale. The cross-judge verdict is
`loop/items/AI4DEV-89/lanes/arena/cross-judge.md`. Scores were D 26, A 24, B 22, C 20.

## Why candidate D is the base

The task is twelve acceptance ids green at the integration tier, on one shared local database, with
no vendor simulator. Candidate D is the only design that faces all three of those facts at once.

It wins atomicity because it names the transaction, raises the fault as an argument of the call
rather than as a hook inside product SQL, and keeps the trigger count on a sequence, which survives
the rollback that erases every other in-transaction write. It cross-checks that count against the
refusals the adapter received, so one witness never stands alone.

It wins honesty at both tiers because it scopes every system-under-test read to the open world's
actor ids. AT-016.09 opens twenty-two worlds against one database. Every other candidate reads the
whole database somewhere, so a fresh world sees the previous world's committed transition, and the
crash the id exists to prove is unprovable. That is not a style difference. It is the difference
between a green that means something and a green that does not.

It is also the only candidate that found the harness selftest that breaks the moment `_live.ts`
exists.

## Overrides and grafts

### 1. The deliveries table is tenant-isolated, not unreachable

Candidate D marks all five new tables `unreachable-by-client-roles`. That is wrong for one of them.

`public.notification_deliveries` takes the isolated posture:

```sql
revoke all on table public.notification_deliveries from anon, authenticated;
revoke all on table public.notification_deliveries from service_role;
alter table public.notification_deliveries enable row level security;
grant select on table public.notification_deliveries to authenticated;
create policy notification_deliveries_own_inapp on public.notification_deliveries
  for select to authenticated
  using (recipient_id = (select auth.uid()) and channel = 'inapp');
```

Its `TENANT_CATALOG` row says `tenant-isolated`. The other four tables stay
`unreachable-by-client-roles` with no grant at all.

The reason is the brief's own rule. A recipient reads in-app rows as the caller, through a policy on
the rows, never through a service-role read in an edge function. The screen is out of this run, so
nothing reads the policy yet, but the policy belongs with the table that it governs. Landing it now
costs three statements and encodes the rule where a later reader will find it. Grafted from candidate
B, which the judge scored highest on the standing gates.

### 2. A durable acceptance receipt, and the reason it is NOT what the judge asked for

Add two columns to `public.notification_deliveries`.

| column | type | meaning |
|---|---|---|
| `accepted_at` | `timestamptz` | when the provider confirmed, null until it did |
| `provider_receipt` | `jsonb` | what the provider answered |

Both are written in the same `apply_delivery_results` call that sets `state = 'sent'`. They make the
acceptance a durable fact rather than a value that lived only in the worker's memory, so a crash
after acceptance and before the sent mark is recoverable.

**Do not adopt candidate C's rule that a stored receipt lets the next pass skip the provider.** The
judge recommends it and the judge is wrong on the evidence. AT-016.11 asserts that the lost-ack
event's provider trace equals exactly `['ack_lost', 'accepted']`. Two attempts. A design that reads a
receipt and marks the row sent without calling the provider again produces one attempt and fails the
id. The retry must physically reach the provider. What stops it duplicating is the provider's own
idempotency on the key, which is candidate D's mechanism and is also what the loop simulator does.

The receipt is for the crash-after-acceptance case. It is not for the lost-ack case, because in the
lost-ack case the sender never learns it was accepted and therefore has no receipt to store. Those
are two different failures and one mechanism does not serve both.

Do not adopt the rest of candidate C. No occupancy table, no legal-transition catalog, no
event-state view, no transition log. Fourteen tables to enforce what two unique indexes and four
check constraints already enforce is not a domain model, it is gate surface.

### 3. The product owns the send path

This closes a hole in candidate D that the judge found.

AT-016.01's source oracle asserts that the components importing a provider client are exactly
`['notifications.emitter']`. In candidate D every product module is pure and the sending code lives in
the live adapter, which is in the test tree. The oracle would find zero product hits and throw, and
AT-016.01 would rest on counting a type mention as a send path. That is not a send path.

So the product owns one sending module.

`supabase/functions/_shared/notification-provider.ts` implements `ProviderPort` over SMTP using
`node:net`. It type-checks under `tests/at/tsconfig.json`, which is a Node-typed project, and it runs
under Bun and under Deno, both of which serve `node:net`. Its host, port, sender address and timeout
arrive as constructor arguments. It reads no environment variable at module level, so it stays
importable by the pure test project.

This module is the single expected entry in the source oracle's result, mapped to
`notifications.emitter`. The live adapter constructs it pointed at Mailpit on 44325. The live adapter
does not reimplement sending. That is what makes the oracle mean something, because the file the scan
names is the file that actually sends at integration.

Every other `_shared` notification module stays pure, so the tree's existing split, where `edge.ts`
is the only I/O module, gains exactly one documented exception and the reason is written next to it.

### 4. An independent mail witness that never collapses duplicates

`tests/at/suites/req-016/_mail-witness.ts` reads Mailpit's own message list and counts physical
messages. It never groups or de-duplicates by `Message-ID`. Two messages carrying one key are two
rows in its result and the assertion fails.

Grafted from candidate A. The point of an out-of-band witness is to catch the duplicate send. A
reader that de-duplicates on the way in cannot see the defect it exists to see.

### 5. The source scan refuses a stray insert as well

`tests/at/suites/req-016/_source-scan.ts` exports three oracles, not two.

- `providerClientImporters()` as candidate D describes it.
- `taxonomySeedProblems()` as candidate D describes it.
- `strayNotificationWriters()`, new, grafted from candidate A. It reports any `insert into
  public.notification_` in the migrations that is not inside `public.emit_notification`, and any
  product module that writes those tables outside the emitter path.

The sole-writer claim is then proved against the tree twice, once for sending and once for writing.

### 6. The class channel rule refuses an illegal default at construction

Candidate C encodes the class channel rules as check constraints on a taxonomy table, so an illegal
documented default cannot be inserted. The base has no taxonomy table, so that exact mechanism does
not transfer. Take the intent instead.

`notification-taxonomy.ts` validates every row against `CLASS_CHANNEL_RULE` when the module loads and
throws naming the offending row. An illegal documented default is then unconstructable rather than
merely caught by a test. This is a few lines and it moves a class of mistake from run time to import
time.

### 7. Declare a manifest id green in the unit that makes it pass

`bun run at:verify --expect` fails a declared red that goes green. Two ids pass earlier than the
brief's unit order suggests.

- **AT-016.10** passes as soon as recipients are frozen on the event row, which is unit 2, not unit 5.
- **AT-016.12** passes as soon as the unit 2 capture fires all forty-eight rows, not unit 6.

Declare each green in the commit that makes it pass. Units 5 and 6 still own their verify lines and
re-prove those ids; they simply do not own the manifest flip. Candidates A and B both got this wrong
and the judge caught it.

## What was rejected, and why

**Candidate A's generator from the suite file into the product migration.** It is the only design
where the forty-eight rows are literally authored once, and that is genuinely attractive. It is
rejected because it makes a product migration a build artifact of a test-owned specification file.
The dependency runs the wrong way. A product that cannot be built without reading its own test suite
is a product that cannot be shipped separately from it. Candidate D's authored product const plus a
static oracle proving the seed names equal is one more artifact and the right dependency direction.

**Candidate A's `CREATE ROLE` split between an emit owner, a delivery owner and a worker.** Roles are
cluster-wide. `supabase db reset` drops the database and replays the migrations, and the role
survives, so the second reset fails on a duplicate unless the statement is guarded. No migration in
this tree creates a role. The judge checked this and it is correct.

**Candidate B's Mailpit HTTP send API.** It would avoid the config change and the stack restart, which
is real value. It is rejected because the endpoint's presence in this stack's bundled Mailpit is
unverified from the tree, and because it puts the sending code in the test tree, which is the same
hole as override 3. SMTP on 44325 is the conservative choice and it is what three of four candidates
chose.

**Candidate C's `notification_fault_point()` on the production emit path.** Real producers would call
a function that increments a test sequence. A test hook in product SQL is the thing the fault-as-
adapter insight exists to avoid.

**A fault control table.** The exploration expected one. It needs a `create table public.X`, a catalog
row, and a second writer of test state into the product schema, and the arming has to be visible
across PostgREST's connection pool, which a session setting is not. Passing the arming as an argument
of the fixture producer's own call needs none of that.

## Standing corrections to the brief

Two, both found while grounding, neither a blocker.

1. The brief maps AT-016.05, .06 and .12 to `b-` and `c-` test files. All three are registered in
   `d-taxonomy-evidence.test.ts`.
2. The taxonomy has forty-eight rows. The brief and the item text do not give a number, but forty-six
   was my own miscount early in this run and it is wrong.

## How the units are cut

Candidate D's unit section stands, including its three honest statements about where the brief's
boundaries cut across something indivisible. In short.

- **Unit 1 is the spine, not the emitter alone.** AT-016.01 at the integration tier fires an event,
  drains it and reads the delivered copy, so unit 1 lands the tables, the emitter, the worker, the
  provider, the world and the seam. It goes to the hardest-tasks lane.
- **Units 2 and 3 cannot be separated.** AT-016.03 binds twenty-five null-channel rows to the
  documented defaults that are AT-016.06's own subject, and five ids share one evidence capture that
  asserts its producer ran exactly once. They land as one commit group of two commits with their
  verify lines unchanged.
- **The `_live.ts` gate is all or nothing.** Unit 1 creates it and every id starts running. Later
  units' methods throw `CapabilityPending` naming themselves, and the manifest declares each id red on
  exactly those names until its unit lands. That is how `req-001` already works and it is what keeps
  each unit independently verifiable.
- **Unit 1 changes one harness file.** `tests/at/harness/live-refusal.selftest.ts` and two assertions
  in `tests/at/harness/conformance.selftest.ts` name `req-016` as the example of a suite with no live
  adapter. That stops being true. The assertions are re-pointed at a requirement id that has no
  adapter. Nothing is added to the harness. No new sentinel, fault, vendor stand-in, fixture world or
  capability.

## Lane routing

Unit 1 and unit 5 go to the hardest-tasks lane, because each must still design something: unit 1 the
spine, unit 5 the fault mechanism, which has no precedent in this tree. Units 2, 3, 4 and 6 apply a
fixed contract and go to the feature lane.

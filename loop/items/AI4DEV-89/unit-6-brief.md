# Unit brief: sent only on provider acceptance, retried, never duplicated

You are the writer for unit 6 of item AI4DEV-89, the notifications backend run, and the last unit of
this run. You work in the worktree that is already checked out on the item branch. You commit. You
do not push, you do not open a pull request, and you do not touch the board.

## Where the run is

Units 1 through 5 have landed and are green. The integration tier is eleven green and one red, and
the one red is yours. `--expect` exits 0, so the manifest describes reality exactly.

Read these first, in this order.

1. `loop/items/AI4DEV-89/design.md`. The lead's synthesis. Its override 2 is about your id
   specifically and it is binding.
2. `loop/items/AI4DEV-89/lanes/arena/candidate-d-ports-and-adapters.md`. The base design.
3. `loop/items/AI4DEV-89/lanes/unit-5-report.md`, the whole "The fault mechanism" section. Unit 5
   built the crash switch you are about to reuse, and it explains why the reads sit where they sit.
4. `loop/items/AI4DEV-89/lanes/unit-2-report.md`, the section "The limit handed to units 5 and 6".

## What you deliver

Unit 6 is AI4DEV-98. A notification is marked sent only on provider acceptance. An unconfirmed send
retries and is never dropped. A lost acknowledgment mints no duplicate. Escalation-tier events reach
both the NGO and the platform admin.

Its ids are AT-016.11 and AT-016.12. AT-016.11 is declared red on `vendors.email` and goes green.
AT-016.12 is already green from unit 2 and is re-verified here, not re-earned.

The design names your files. The provider fault decorator. The Mailpit idempotent replay.
`_integration.ts` gains the AT-016.11 procedure.

## Why this id needs an integration procedure at all

Its loop body drives `h.vendors.email` directly: `rejectNext(1)`, `acceptButLoseAck(1)`, and
`attempts()`. Above loop there is no simulator, so none of those exist. You write the procedure that
proves the same claims against the real stack.

Unit 2 named the limit you inherit, and it is the crux of your unit. The taxonomy capture derives
every provider trace from a message that arrived in the catcher, so it can never observe a rejected
or unacknowledged attempt. **Your evidence must come from the adapter's own record of what the
provider answered, not from the catcher.** The catcher is still your witness for one thing only: how
many physical messages exist per idempotency key.

## What the procedure must prove, in three clauses

Read the loop body in `c-reliability-guard.test.ts` from line 158 and reproduce its claims.

**(a) The provider refuses.** Arm a rejection, fire `access.key_issued`, and drain **one pass only**.
A run-to-quiescence drain would reject, retry and succeed inside the same call, which makes the
unconfirmed state unobservable, and that state is what the clause is about. Then: the provider-side
outcomes for that event are exactly `['rejected']`, the event still exists, its state is `pending` or
`retrying` and never `sent`, and at least one delivery row exists that is not `sent`.

**(b) A real retry reaches the provider.** Drain to quiescence. The provider-side outcomes are at
least two, the last is `accepted`, the event state is `sent`, and the event's own attempt counter is
at least two.

**(c) The lost acknowledgment.** Arm an accept-but-lose-ack, fire `access.key_revoked`, drain one
pass. The outcomes are exactly `['ack_lost']`, the delivery is not `sent`, and the event is `pending`
or `retrying`. A sender cannot tell a lost acknowledgment from silence, so it must not mark it sent.
Then drain to quiescence: the outcomes are exactly `['ack_lost', 'accepted']`.

**Every attempt is bound to the pair the taxonomy resolved.** Both access rows are volunteer only, on
email and in-app, and in-app never reaches the provider. So every provider attempt owes exactly the
volunteer, on email. Assert that, because outcomes alone say a send happened and never that it was
this send. A fixture that mails the wrong party while writing an honest delivery row produces an
identical outcome sequence, and the provider's record is the one witness that is not the sender.

## The design's binding constraint, and the trap in it

Design override 2 exists because the judge got this wrong and the design corrected it.

`AT-016.11` asserts the lost-ack trace equals exactly `['ack_lost', 'accepted']`. **Two attempts.**
A design that reads a stored receipt and marks the row sent without calling the provider again
produces one attempt and fails the id. **The retry must physically reach the provider.** What stops
it duplicating is the provider's own idempotency on the key, not a skipped call.

The durable receipt columns unit 1 landed, `accepted_at` and `provider_receipt`, are for the
crash-after-acceptance case. They are not for the lost-ack case, because in the lost-ack case the
sender never learns it was accepted and therefore has no receipt to store. Two different failures,
and one mechanism does not serve both. Do not collapse them.

## Follow unit 5's precedent rather than inventing a second one

`_fault-switch.ts` already exists, it is generic over the ledger, and it is the shape a fault takes
in this suite. The provider point is `notifications.provider_send`. In `_live.ts` today, arming it
still throws `CapabilityPending(['faults.at'])`.

Unit 5's two-witness rule was specific to a fault the database records. Yours is a fault the adapter
itself induces, so the sequence witness has no analogue here. Say plainly in your report what your
evidence rests on and what would have to be true for it to be wrong. If there is only one witness,
say so; an honest single witness beats an invented second one.

## The Mailpit half

Exactly one physical message must exist per idempotency key after the retry. `_mail-witness.ts`
counts physical messages, keys on the catcher's own storage id, and never collapses duplicates, so
it can see a duplicate send. It parses `x-notification-key`. Use it.

## The manifest

AT-016.11 moves to green. After your unit the integration tier should be twelve green and zero red.
Reconcile `tests/at/expected/req-016.json` in the same commit that changes what runs. If any id's
first refusal changes because of your work, re-declare it on the true name and say so.

## Rules you cannot break

- **No new harness machinery.** No new sentinel, fault, vendor stand-in, fixture world or
  capability. The fault seam, the fault point and the crash switch all exist.
- **A new table or write route joins the standing checks.**
- **Reads reach the database as the caller.**
- **Write no narrating comments.** Keep a comment only for a non-obvious reason the code cannot
  show.
- **Never name any board item id except `AI4DEV-89`** in a commit message.
- **Write your report as you go**, to `loop/items/AI4DEV-89/lanes/unit-6-report.md`, and **commit as
  soon as something is green**. An earlier lane in this item had its final message discarded and its
  work survived only because it was on disk.

## Verify before you say you are done

```
bun run typecheck
bun run at:check req-016
bun run at:selftest
bun run at:verify req-016 --tier loop --expect
bun run at:verify req-016 --tier integration --expect
bun run at:verify req-001 --tier loop --expect
bun run at:verify req-001 --tier integration --expect
```

The counts before your work are req-016 loop twelve green and zero red, req-016 integration eleven
green and one red, req-001 loop thirty three green and five red, req-001 integration twenty seven
green and eleven red. Every one exits 0.

Run the integration tier **twice** and report both. Your clauses depend on pass boundaries and on a
real provider round trip, so a pass that happens once has not been shown to repeat.

Unit 5 found that each SQL client holds about ten connections and that the database has ninety seven
usable slots. `_live.ts` now shares one client per process, reference counted. If you add a client,
you will starve the auth service and see a 500 from provisioning. Do not add one.

A red you did not cause is still a red you report. Do not fix an unrelated failure; name it.

## Environment

The Docker engine and the local Supabase stack are running. Every integration run resets the
database.

If a run fails with `INFRASTRUCTURE: REFUSING TO RESET` naming a stopped edge runtime, run
`docker start supabase_edge_runtime_poancmeitlmxejofwzuu`, wait about eight seconds, and run the
command again. Record every time you had to.

Never start or stop Docker Desktop. Never run `bun run db:stop`. Never run `bun run db:start`, and
never quote any value beginning `sb_secret_` in any file, commit or reply.

Ignore every container whose name contains `ai4good-slot`.

Do not spin on an environment failure. Stop, leave the tree typechecking, commit what is green, and
report it.

## Your report and your reply

Then reply with AT MOST six lines.

line 1: the commit SHAs and whether the tree is clean
line 2: the integration tier green and red counts, both runs
line 3: the ids that flipped
line 4: what your evidence rests on, and whether you have one witness or two
line 5: how many physical messages the catcher held per idempotency key after the retry
line 6: the report path

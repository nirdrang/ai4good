# Unit brief: the atomic emitter and outbox contract under an induced fault

You are the writer for unit 5 of item AI4DEV-89, the notifications backend run. You work in the
worktree that is already checked out on the item branch. You commit. You do not push, you do not
open a pull request, and you do not touch the board.

This unit is routed to the hardest tasks lane, and the reason is the rule: a unit goes there only
when the writer must still design something. The fault mechanism has no precedent in this tree. The
design tells you what it must not be, and leaves you the shape.

## Where the run is

Units 1 through 4 have landed and are green. The branch head is `93c435a`. The integration tier is
ten green and two red, verified twice, and `--expect` exits 0 so the manifest describes reality.

Read these first, in this order.

1. `loop/items/AI4DEV-89/design.md`. The lead's synthesis. It wins wherever it disagrees with a
   candidate. Its "What was rejected, and why" section is binding on you, not advisory.
2. `loop/items/AI4DEV-89/lanes/arena/candidate-d-ports-and-adapters.md`. The base design.
3. `loop/items/AI4DEV-89/lanes/unit-1-report.md`, the deviations section. Item 6 says the fault
   branch and the sequence bump were landed in unit 1 rather than deferred to you. Verify that
   against the migration before you plan; part of your unit may already exist.
4. `loop/items/AI4DEV-89/lanes/unit-2-report.md`, the section "The limit handed to units 5 and 6".

## What you deliver

Unit 5 is AI4DEV-97. The emitter and outbox atomic write contract, with each guarded producer
integrated against it. A notification event is written atomically with its ledger or state
transition. Recipients resolve at event creation, not at send time.

Its ids are AT-016.09 and AT-016.10. AT-016.09 is declared red on `faults.at` and goes green.
AT-016.10 is already green from unit 2 and is re-verified here, not re-earned.

The design names your files. `fixture_commit_transition_and_emit` gains its fault branch and the
sequence. `_live.ts` gains the fault switch and the two-witness trigger count. `_fixture.ts`'s fault
switch is re-expressed through the same seam.

## What AT-016.09 actually does, so you size it correctly

It runs the full guarded matrix, eleven rows, not one sample per class. For every row it opens
**two** worlds. A control world with no fault, which must commit both sides, and a fault world where
`h.faults.at('notifications.between_transition_and_event_write', 'crash')` is armed before the fire.

That is twenty two worlds against one database, each provisioning four accounts, an organisation and
a project. The design budgets it at `timeoutMs: { integration: 240_000 }`, the same value the auth
suite uses for its two real-time bodies. Set that.

The control run exists because without it a row that silently does nothing satisfies "neither side
committed" and the atomicity oracle passes on a transition that never happened. The fault run then
asserts that nothing survived: no transition, no event, no delivery, and no ops item. All four, not
the two halves, because a fault path that rolled back the transition and the event while leaving a
delivery committed used to pass the two-read form, and the drain would then have sent it.

Every system under test read must be scoped to the open world's actor ids. This is the reason the
base design was chosen. Twenty two worlds share one database, so an unscoped read lets a fresh world
see the previous world's committed transition, and the crash the id exists to prove becomes
unprovable. A green from an unscoped read is worth nothing.

## The design's constraints on the fault mechanism, which are binding

The arena rejected three shapes. Do not rediscover them.

- **No test hook in product SQL.** A `notification_fault_point()` function that real producers call,
  which increments a test sequence, is exactly what the fault as adapter insight exists to avoid.
- **No fault control table.** It needs a table, a catalog row, and a second writer of test state into
  the product schema, and the arming has to be visible across PostgREST's connection pool, which a
  session setting is not.
- **The arming travels as an argument of the fixture producer's own call.** That needs none of the
  above.

**Two witnesses, and this is the part you must get right.** A sequence does not roll back. That is
what makes a sequence based trigger count survive the crash that erases every other in-transaction
write, and it is why the design chose one. But a count alone is one witness. Cross-check it against
the refusals the adapter itself received, so neither witness ever stands alone. If your two witnesses
can only ever agree, they are one witness wearing two hats, and you have proved nothing. Say in your
report how they could disagree.

## The harness already polices you

`harness/guards.ts` owns three obligations and checks them itself: that the requested fault point is
one the product actually exposes, that a handle is armed where it was asked to be, and that the
fault genuinely fired. A stub that returns a handle and arms nothing fails before the test reaches
an assertion. Do not try to satisfy these; satisfy the behaviour and they follow.

## The manifest

`tests/at/expected/req-016.json` declares what the run produces and `--expect` fails a declared red
that goes green. Reconcile it in the same commit that changes what runs.

AT-016.09 moves to green. AT-016.11 stays red on `vendors.email` and belongs to unit 6. Do not touch
it. If your work changes that id's first refusal, re-declare its red on the true name and say so.

## Rules you cannot break

- **No new harness machinery.** No new sentinel, fault, vendor stand-in, fixture world or
  capability. The fault seam and the fault point already exist. Work inside them.
- **A new table or write route joins the standing checks.** Revoke then grant per client role, the
  static catalog scan, the live catalog check, the append-only audit, and the lifecycle gate whose
  conformance check lives in the auth suite.
- **Reads reach the database as the caller.**
- **Write no narrating comments.** Keep a comment only for a non-obvious reason the code cannot
  show. The reason a sequence survives a rollback is worth a comment. A comment restating the line
  below it is not.
- **Never name any board item id except `AI4DEV-89`** in a commit message.

## Two rules learned earlier in this run, and they are not optional

A writer lane earlier in this item finished its work and had its final message discarded by the
runner. The work survived only because it had been committed and left on disk.

- **Write your report file as you go.** Create `loop/items/AI4DEV-89/lanes/unit-5-report.md` early
  and keep adding to it. Never leave it to the end.
- **Commit as soon as something is green.** Do not hold finished, verified work uncommitted while
  you start the next piece.

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

The counts before your work are req-016 loop twelve green and zero red, req-016 integration ten
green and two red, req-001 loop thirty three green and five red, req-001 integration twenty seven
green and eleven red. Every one exits 0.

Your id waits on real work across twenty two worlds, so the integration run will take noticeably
longer than it did before. That is expected. A timeout is not a red to route around; if you hit one,
report the measured duration.

Run the integration tier **twice** and report both. Your id is the most expensive and most
state-sensitive in the suite, and a pass that only happens once has not been shown to repeat.

A red you did not cause is still a red you report. Do not fix an unrelated failure; name it.

## Environment

The Docker engine and the local Supabase stack are running. Every integration run resets the
database, which is normal.

If a run fails with `INFRASTRUCTURE: REFUSING TO RESET` naming a stopped edge runtime, run
`docker start supabase_edge_runtime_poancmeitlmxejofwzuu`, wait about eight seconds, and run the
command again. Record every time you had to.

Never start or stop Docker Desktop. Never run `bun run db:stop`. Never run `bun run db:start`, and
never quote any value beginning `sb_secret_` in any file, commit or reply. Those are local service
keys and quoting one blocks every future push to this repository.

Ignore every container whose name contains `ai4good-slot`.

Do not spin on an environment failure. Stop, leave the tree typechecking, commit what is green, and
report it.

## Your report and your reply

Your full report goes to `loop/items/AI4DEV-89/lanes/unit-5-report.md`, written as you go. Cover the
commits, the files you changed, the fault mechanism you designed and the two shapes you rejected,
how your two witnesses could disagree, every manifest change with its reason, the measured duration
of the integration run, every deviation from the design and why, and every command with its output.

Then reply with AT MOST six lines.

line 1: the commit SHAs and whether the tree is clean
line 2: the integration tier green and red counts, both runs
line 3: the ids that flipped
line 4: the fault mechanism in one sentence, and how the two witnesses can disagree
line 5: the measured duration of the integration tier, and any edge runtime restarts
line 6: the report path

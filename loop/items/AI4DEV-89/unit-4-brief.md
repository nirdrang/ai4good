# Unit brief: one notification per committed event, and the anti-spam guard

You are the writer for unit 4 of item AI4DEV-89, the notifications backend run. You work in the
worktree that is already checked out on the item branch. You commit. You do not push, you do not
open a pull request, and you do not touch the board.

## Where the run is

Units 1, 2 and 3 have landed and are green. The branch head is `521779c`. The integration tier is
eight green and four red, and `--expect` exits 0, so the manifest describes reality exactly.

Read these first, in this order.

1. `loop/items/AI4DEV-89/design.md`. The lead's synthesis. It wins wherever it disagrees with a
   candidate.
2. `loop/items/AI4DEV-89/lanes/arena/candidate-d-ports-and-adapters.md`. The base design. Your unit
   is named in its unit section, and its two procedure notes are the contract you implement.
3. `loop/items/AI4DEV-89/lanes/unit-2-report.md`, sections "Deviations and findings" and "The limit
   handed to units 5 and 6".

## What you deliver

Unit 4 is AI4DEV-95. One logical notification per committed event, meaning one delivery per
recipient and channel pair, and the thread comment anti-spam guard conforming to its pinned
configuration. Its ids are AT-016.07 and AT-016.08. Both are declared red today and both go green.

The design names your files. The worker moves into the core. `applyPassResults` lands in the
migration. The guard lands in `notifications.ts`. `_live.ts` gains `processRestart`.
`_integration.ts` gains the AT-016.08 procedure.

### AT-016.07, across a process restart

This id has a single body at both tiers. Every seam it touches exists at both, so you write no
integration procedure for it.

The test fires `payment.succeeded`, then asserts three preconditions before it asserts anything
else. The event was committed. Nothing was delivered yet, because a restart after delivery
completed proves nothing and is a red rather than a pass. And the restart actually happened, which
it checks by reading `h.faults.processEpoch()` either side of `h.faults.processRestart()` and
requiring the identity to change.

In `_live.ts` today, `processEpoch` is a constant fixed when the adapter is created, at line 186,
and `processRestart` throws `CapabilityPending(['faults.processRestart'])`. Make the epoch mutable
and make a restart mint a new one, the way the loop fixture already does with its `epochSeq`. The
harness refuses a restart that left the identity unchanged, so a stub cannot pass.

What survives the restart is the point. The idempotency lives in the database, not in a worker's
memory. After the restart exactly one logical event and one delivery per recipient and channel pair
remain, enforced by the schema rather than by the code that happens to be running.

Check the mid-flight precondition early. If `w.fire()` at the integration tier already runs delivery
to completion, the restart is not mid-flight and the id cannot pass. Find that out before you build
on it.

### AT-016.08, the guard on two configurations

This id needs an integration procedure, because its loop body commands `h.clock`, and above loop the
clock has `now()` and nothing else. Unit 1 left a placeholder at `_integration.ts` line 145 that
refuses by name. You replace it.

The design specifies the mechanism, and you follow it rather than inventing one. The live factory
receives only `{ stack }`, so `h.config` never reaches it. The world name does reach it, through
`h.fixtures.world(name)`. So the procedure reads the pinned values back from `h.config` and opens a
world named `req-016/guard?cap=<cap>&window=<ms>&coalesce=<bool>`. The numbers the body asserts
against and the numbers the guard runs on are then one value, read once.

Use two explicit configurations with short windows, three seconds and five seconds, and wait real
time. Two materially different configurations are the whole point. A product that hard-coded the
registry's own defaults satisfies a single run exactly as well as one that reads its configuration,
and only the pair tells them apart.

The id carries `timeoutMs: { integration: 60_000 }`.

The configuration keys live under `req-015.thread_comment_notifications`. That requirement has not
landed, so the configuration is a fixture here. Do not build the comment thread feature.

## The manifest

`tests/at/expected/req-016.json` declares what the run produces, and `--expect` fails a declared red
that goes green. Reconcile it in the same commit that changes what runs.

AT-016.07 and AT-016.08 move to green. AT-016.09 stays red on `faults.at` and belongs to unit 5.
AT-016.11 stays red on `vendors.email` and belongs to unit 6. Do not touch either.

If an id you do not own changes its first refusal because of your work, re-declare its red on the
true name and say so in your report. A manifest that lies about why an id is red is worse than a red.

## Rules you cannot break

- **No new harness machinery.** No new sentinel, fault, vendor stand-in, fixture world or
  capability. Work inside the seams that exist.
- **A new table or write route joins the standing checks.** Revoke then grant per client role, the
  static catalog scan, the live catalog check, the append-only audit, and the lifecycle gate whose
  conformance check lives in the auth suite. `applyPassResults` lands in a migration, so read how
  the existing migrations declare their posture and match it.
- **Reads reach the database as the caller.** A recipient reads in-app rows through a policy on the
  rows, never a service-role read in an edge function.
- **Write no narrating comments.** No comment that restates the line below it. Keep a comment only
  for a non-obvious reason the code cannot show.
- **Never name any board item id except `AI4DEV-89`** in a commit message.

## Two rules learned from the last lane, and they are not optional

The writer before you finished its work and the runner discarded its final message. The work
survived only because it had been committed and left on disk.

- **Write your report file as you go.** Create
  `loop/items/AI4DEV-89/lanes/unit-4-report.md` early and keep adding to it. Never leave it to the
  end. If your final message is lost, that file is the only record of what you did and why.
- **Commit as soon as something is green.** Do not hold finished, verified work uncommitted while
  you start the next piece.

## Verify before you say you are done

Run every one of these from the worktree root and put the exact output tail of each in your report.

```
bun run typecheck
bun run at:check req-016
bun run at:selftest
bun run at:verify req-016 --tier loop --expect
bun run at:verify req-016 --tier integration --expect
bun run at:verify req-001 --tier loop --expect
bun run at:verify req-001 --tier integration --expect
```

The auth suite runs because the lifecycle gate's conformance check lives there and a new write route
changes its result. The expected counts before your work are req-016 loop twelve green and zero red,
req-016 integration eight green and four red, req-001 loop thirty three green and five red, req-001
integration twenty seven green and eleven red. Every one exits 0.

A red you did not cause is still a red you report. Do not fix an unrelated failure; name it.

## Environment

The Docker engine and the local Supabase stack are running. Every integration run resets the
database, which is normal.

One known fragility. The container `supabase_edge_runtime_poancmeitlmxejofwzuu` sometimes exits
after a reset. If a run fails with `INFRASTRUCTURE: REFUSING TO RESET` naming a stopped edge
runtime, run `docker start supabase_edge_runtime_poancmeitlmxejofwzuu`, wait about eight seconds,
and run the command again. Record every time you had to.

Never start or stop Docker Desktop. Never run `bun run db:stop`. Never run `bun run db:start`, and
never quote any value beginning `sb_secret_` in any file, commit or reply. Those are local service
keys and quoting one blocks every future push to this repository.

Ignore every container whose name contains `ai4good-slot`. They are unrelated leftovers.

Do not spin on an environment failure. If the stack fails in a way the restart above does not fix,
stop, leave the tree typechecking, commit what is green, and report it.

## Your report and your reply

Your full report goes to `loop/items/AI4DEV-89/lanes/unit-4-report.md`, written as you go. Cover the
commits, the files you changed, every manifest change with its reason, the mid-flight precondition
finding, every deviation from the design and why, and every command with its exact output.

Then reply with AT MOST five lines.

line 1: the commit SHAs and whether the tree is clean
line 2: the integration tier green and red counts after your work
line 3: the ids that flipped, and any id you left red that this brief expected to flip
line 4: how many times you had to restart the edge runtime, and any deviation from the design
line 5: the report path

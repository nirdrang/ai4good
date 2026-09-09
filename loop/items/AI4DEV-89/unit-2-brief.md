# Unit brief: the taxonomy matrix and the delivery defaults

You are the writer for units 2 and 3 of item AI4DEV-89, the notifications backend run. You work
in the worktree that is already checked out on the item branch. You commit. You do not push, you
do not open a pull request, and you do not touch the board.

## Where the run is

Unit 1 landed the spine and is green. Five commits, head `cfb74a6`. It built the tables, the
emitter, the worker, the SMTP provider, the live adapter and the integration seam. The suite runs
end to end at both tiers today.

Read these three files first, in this order. They are the design you implement.

1. `loop/items/AI4DEV-89/design.md`. The lead's synthesis. It wins wherever it disagrees with a
   candidate.
2. `loop/items/AI4DEV-89/lanes/arena/candidate-d-ports-and-adapters.md`. The base design.
3. `loop/items/AI4DEV-89/lanes/unit-1-report.md`, sections "Deviations from the design" and
   "The largest risk handed to unit 2".

## Why units 2 and 3 are one job

The design says they cannot be separated. AT-016.03 grades twenty-five null-channel rows against
the documented defaults that are AT-016.06's own subject, and five ids share one evidence capture
that asserts its producer ran exactly once. Splitting them means grading a row against a default
that does not exist yet.

You deliver them as one commit group of two commits. The first commit is the taxonomy matrix. The
second is the documented defaults. Both are green before you stop.

## What you deliver

**Unit 2, AI4DEV-93.** The full taxonomy matrix at the integration tier: exact recipients, channels
and payloads per event, the depleted-adds-admin escalation, and the ops-item events. The sensitive
negatives hold. An NGO never sees candidacy or the match log, a volunteer never sees a vetting
outcome, and no donation event exists. Its ids are AT-016.03 and AT-016.04.

**Unit 3, AI4DEV-94.** Delivery defaults. Critical events go by email and in-app, low-tone events
in-app only, and a documented default exists for every row of the taxonomy. Its ids are AT-016.05
and AT-016.06. AT-016.06 reads the documentation, so a documented default per row is a
deliverable, not a comment. `documentedDefaults()` is already wired in `_live.ts` to
`core.documentedDefaults()`; the product side is what you fill in.

The grading table is `tests/at/suites/req-016/taxonomy.ts`, forty-eight rows. The PRD slice quoted
in `loop/items/AI4DEV-89/brief.md` is the source of every row. Do not edit the suite's table to
make a row pass. If a row in the suite contradicts the PRD slice, stop and report it.

## Measure before you write

This is the largest risk handed to you, and unit 1 named it. The integration capture fires all
forty-eight rows in one world and drains after each, and every email row is a real SMTP round trip
to Mailpit plus a Mailpit read. Nothing has yet measured what forty-eight fires and drains cost
under vitest's thirty second default timeout.

Measure it before you write the capture. Fire a handful of rows at the integration tier, time them,
and extrapolate. If the capture will not fit, budget the producer id with `timeoutMs` rather than
thinning the capture. Put the measured number in your report.

Nothing has yet fired a row whose recipient is the ex-volunteer against the stack.
`abandonment.released` resolves `ex_volunteer` from the world's own record. Prove that row.

## The manifest, and the two ids that flip early

`tests/at/expected/req-016.json` declares what the run produces. `--expect` fails a declared red
that goes green, so you reconcile it in the same commit that changes what runs.

The integration tier is two green today, AT-016.01 and AT-016.02, with ten declared reds.

- **AT-016.03, .04, .05, .06 and .12 are declared red on `vendors.email`.** All five share your
  capture. They go green in this unit. AT-016.12 is not your unit's id and you do not own its
  behaviour, but the capture fires `lovable.credits_blocked` like every other row, so the id
  passes and the manifest must say so. The design calls this out.
- **AT-016.10 is declared red on `fixtures.world.reassignRole`.** The design says this id passes
  as soon as recipients are frozen on the event row, which is your contract, and that is right
  about the ownership. It does not name the mechanism, so here it is. `_live.ts` line 142 throws
  `CapabilityPending(['fixtures.world.reassignRole'])`, and the test at
  `c-reliability-guard.test.ts` line 136 calls `w.reassignRole('ngo', 'at-016.10-successor')`.
  The id flips only if the live world gains that method. Implement it if it is cheap and correct
  here, because the behaviour it proves is yours: the old holder receives and the new holder is
  excluded. If it is not cheap, leave the id red and say why in your report. Do not fake it.
- **AT-016.11 is declared red on `vendors.email` and is NOT yours.** It belongs to unit 6. Once
  your capture makes email work, `vendors.email` stops being that id's first refusal and it will
  fail on something else. Find the true first refusal and re-declare its red on that name. A
  manifest that lies about why an id is red is worse than a red.

Every other declared red stays as it is. AT-016.07 on `faults.processRestart` and AT-016.08 on
`fixtures.world.burstThreadComments` belong to unit 4. AT-016.09 on `faults.at` belongs to unit 5.

## Rules you cannot break

- **No new harness machinery.** No new sentinel, fault, vendor stand-in, fixture world or
  capability. The project forbids it. Work inside the seams that exist.
- **A new table or write route joins the standing checks.** Revoke-then-grant per client role, the
  static catalog scan, the live catalog check, the append-only audit and the lifecycle gate. If
  you add neither, say so in your report.
- **Reads reach the database as the caller.** A recipient reads in-app rows through a policy on
  the rows, never a service-role read in an edge function.
- **Comments.** Write none that narrate. No `// step 1` above the block it describes. Keep a
  comment only for a non-obvious why the code cannot show.
- **Never name another board item's id in a commit message.** Use the branch's own id,
  `AI4DEV-89`, and nothing else.

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

The auth suite runs too, because the lifecycle gate's conformance check lives there and a new
write route changes its result. The stack is local and every integration run resets it.

A red you did not cause is still a red you report. Do not fix an unrelated failure; name it.

## Commit shape

Two commits, in order, each one green before the next.

1. `AI4DEV-89: <the taxonomy matrix, in words>`
2. `AI4DEV-89: <the documented delivery defaults, in words>`

Body of each: what changed and why, in plain sentences. No long dashes. No mid-sentence colons.

## Your report

Write your full report to `loop/items/AI4DEV-89/lanes/unit-2-report.md`. Cover the commits, the
files you changed, the measured capture timing, every manifest change with its reason, every
deviation from the design and why, and every command with its exact output.

Then reply to the lead with AT MOST five lines.

line 1: the two commit SHAs and whether the tree is clean
line 2: the integration tier green and red counts after your work
line 3: the ids that flipped, and any id you left red that the design expected to flip
line 4: the measured capture timing, and whether you needed a timeout budget
line 5: the report path

If you hit a blocker you cannot pass, stop, leave the tree in a state that typechecks, and say so
in line 1. Do not spin on an environment failure. Report it and stop.

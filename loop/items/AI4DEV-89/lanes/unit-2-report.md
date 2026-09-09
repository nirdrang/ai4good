# Unit 2 and 3 report: the taxonomy matrix and the delivery defaults

Written by the lead, not by the writer lane. The lane finished its work and its final message was
discarded by the runner, so this report is reconstructed from the tree, the commits, the trail and
the evidence run. Every command and its exact output is in
`loop/items/AI4DEV-89/lanes/unit-2-evidence.md`.

## Commits, oldest first

- `4ff63ba` the taxonomy copy and recipients frozen at emit. Written and committed by the lane.
- `cdc36ec` the taxonomy capture reads the mail catcher above loop. Written by the lane, reviewed
  and committed by the lead after the lane died between verifying and committing.

## What the lane died of, and why the work stands

The runner returned exit 65 with receipt status `malformed-output` and the message "grok reported
an error result". It wrote no output file. Grok's own log records
`shell.handle_prompt.done` with `ok: true` after thirty eight loops and 931 seconds, so the model
completed its turn. `parse-output.ts` line 102 rejects a terminal event whose `subtype` is not
exactly `success`, and the runner keeps only a six kilobyte prefix of the stream in its receipt, so
the subtype itself is unrecoverable.

A short probe lane on the same descriptor returned `complete` with `modelVerified: true` and
`reportedModel: grok-4.6-build`. Grok lanes work. This was one long run, not the provider.

The work was verified before it was trusted. Typecheck exit 0, the loop tier twelve green, and the
integration tier eight green and four red at `--expect` exit 0 on the uncommitted tree.

## What landed

**Unit 2, the taxonomy matrix.** Named payload rows carry their own wording, so the meaning the
requirement names reaches the recipient. Leftover release is worded as a general balance move and
never as a donation. The live world can reassign a role: it mints a successor, moves the seat the
directory reads, and keeps the old holder in the world's known accounts so deliveries already
addressed to them stay visible.

**Unit 3, the delivery defaults.** A documented default exists for every taxonomy row, and the
capture reads them through `documentedDefaults()`, which unit 1 had already wired.

**The capture above loop.** At the loop tier the simulator holds every send and the capture filters
it by the event id the row just fired. Above loop there is no simulator, so the capture reads the
catcher once after the loop and groups messages by that same event id. `_integration.ts` gains
`traceFromCatcherMessage`.

## The manifest

The integration tier moves from two green and ten red to eight green and four red.

Flipped green: AT-016.03, AT-016.04, AT-016.05, AT-016.06, AT-016.10, AT-016.12.

Still red, unchanged: AT-016.07 on `faults.processRestart`, AT-016.08 on
`fixtures.world.burstThreadComments`, AT-016.09 on `faults.at`, AT-016.11 on `vendors.email`.

AT-016.10 flipped because the lane implemented `reassignRole` on the live world. The design assigned
that flip to this unit but never named the mechanism; the lead's unit brief supplied it, from
`_live.ts` line 142 against `c-reliability-guard.test.ts` line 136.

AT-016.11 keeps its declared red on `vendors.email`. The lead's brief warned that making email work
might change that id's first refusal. It did not. `--expect` exits 0, and that check compares the
declared capability names against the refusals the run actually produced, so the name is still true.

## The measured risk, retired

Unit 1 handed over one risk. Forty eight rows fired in one world, each email row a real SMTP round
trip to Mailpit plus a Mailpit read, against vitest's thirty second default timeout, unmeasured.

Measured: forty eight rows extrapolate to **1568 milliseconds**. No timeout budget was needed. The
throwaway probe that measured it has been deleted, as its own header instructed.

## Deviations and findings

1. **A tier branch inside the shared capture.** The capture now behaves differently above loop. This
   is not a style choice. There is no simulator above loop, so the provider side of the evidence has
   to come from the catcher. The witness keys on the catcher's own storage id and never collapses
   duplicates, so the design's override 4 property survives: two messages carrying one key stay two
   entries and a duplicate send is still visible.
2. **Above loop, attempts and acceptances are the same list.** `traceFromCatcherMessage` returns
   `outcome: 'accepted'` as a constant, because a message that reached the catcher was accepted and
   a refusal never arrives there. No id in units 2 or 3 asserts a rejection, so this is sound here.
   It is a real limit for later units and it is named below.
3. **`d-taxonomy-evidence.test.ts` and `_integration.ts` were edited.** Both are suite files. Neither
   edit touches `taxonomy.ts`, the grading table, which the brief forbade changing. The edits are to
   the capture producer and the integration binding, which is where a tier difference belongs.

## What this unit does not deliver

No fault arming seam, no process restart, no anti-spam burst procedure, no provider fault decorator,
no idempotent replay, no `src/` change, no function directory, no new table and no new write route.
The auth suite's lifecycle gate conformance check is therefore unchanged, and the evidence run
confirms it at both tiers.

## The limit handed to units 5 and 6

Above the loop tier the capture cannot observe a rejected provider attempt, because it derives every
trace from a message that arrived. AT-016.09 and AT-016.11 assert on provider outcomes, including a
lost acknowledgment whose trace must equal `['ack_lost', 'accepted']`. Those units cannot read their
outcomes from this capture. They need the provider fault decorator the design describes, and their
evidence has to come from the adapter's own record of what the provider answered, not from the
catcher.

## Evidence

All seven commands green at the final head. Counts: req-016 loop twelve green and zero red, req-016
integration eight green and four red, req-001 loop thirty three green and five red, req-001
integration twenty seven green and eleven red. Every one exits 0. Full output in
`loop/items/AI4DEV-89/lanes/unit-2-evidence.md`.

# Brief for AI4DEV-87 (harness shrinks to the per-id gate)

Chain: AI4DEV-3 (AT harness bring-up) > AI4DEV-87 (harness shrinks to the per-id gate). The
root is the bring-up parent (label `attr:bringup`, project W0 Bring-up) and has no
requirement above it by design. The founder placed this item under it on 2026-09-02.
Branch: nirdrang/ai4dev-87-the-acceptance-harness-shrinks-to-the-per-id-gate-over-the
PRD slice: none. A machinery item with no PRD requirement above it. Provenance: the founder
rulings of 2026-09-02 quoted in the item text below.
Item text: (verbatim from the board)

> pstack's verify skill proves the running app. The one thing it lacks is an honest red per
> acceptance id under CI. Keep that and drop the rest.
>
> Founder ruling, 2026-09-02: "We talked about moving the rest of the way for verify" and "Ok
> so use linear to place the item". Ground and design are reused from the item that parked the
> v1 ceremony (its folder under `loop/items/`, artifacts `how/` and `interrogate/`): no
> explorers, no critics, no arena. Keep tests first per unit, one four-model review panel on
> the diff, one verify pass on the final head, one pull request.
>
> ## Scope, park never delete
>
> One section per part in `loop/parked/v1/README.md`.
>
> 1. Keep `at:check`, `atTest`, per-id grading in the runner, and the `--expect` manifests.
> 2. Remove the capability ledger and provenance machinery (`capabilities.ts`, the witness
>    table, `CapabilityPending`, the stubbed-capability refusal in `registry.ts`) and the
>    type-invention probes that guard them. An unbacked integration id becomes a declared red
>    in the manifest, by id.
> 3. Every req-001 integration body becomes a thin `atTest` over the verify-ai4good drive's
>    HTTP and database helpers. The `_live.ts` adapter and the attestation round trip go; the
>    drive helpers become one small shared module the suite and the skill both import.
> 4. The stack lifecycle (config read, lock, CLI seam, identity read, reset, migration proof,
>    coordinates, evidence line) moves out of `runner.ts` into its own module. The runner
>    keeps arguments, grading, and main.
> 5. The req-016 stand-in fixture, and the sentinels, faults, vendor stand-in, guards, and
>    fixture-world modules only it uses, leave when req-016's product code lands. Until then
>    they stay frozen. This step may close as "not yet".
>
> ## Done contract
>
> * CI green.
> * `bun run at:verify req-001 --tier loop --expect` and `req-016` green with unchanged
>   manifests.
> * `bun run at:verify req-001 --tier integration --expect` green on the one stack with the
>   same 16 ids.
> * The harness selftests shrink by the parked modules.
> * The verify-ai4good drive still passes 11 of 11.
>
> ## Cost stated
>
> About 5,000 lines of selftests and provenance machinery leave. The loop tier can no longer
> tell a real capability from a stand-in; an integration green rests on the drive helpers
> hitting the real stack, which the identity read and the reset already prove.

Acceptance tests: `tests/at/suites/req-001/` and `tests/at/suites/req-016/`. This item writes
no new acceptance ids. Both suites stay green at the loop tier with `--expect` and unchanged
manifests. req-001 passes at the integration tier with `--expect` on the one stack, with the
same 16 ids. The drive skill `.claude/skills/verify-ai4good/` passes all its checks on the final
head: 11 of 11 when the item was written; 13 of 13 since the review panel added two Doctor checks
to the drive (the mail catcher's identification and the edge runtime's functions mount), ruled on
2026-09-03 in `artifacts/interrogate/rulings.md` item 4.

## The ask
Run this item in poteto-mode, end to end, and open one pull request from this branch.
The founder ruled the lighter ceremony in the item text: no explorers, no critics, no arena.
The ground and the design come from the item that parked the v1 ceremony. Its folder is
`loop/items/AI4DEV-86/`: read `artifacts/how/` (the explanation and the four critic reports),
`artifacts/interrogate/` (the three reviews and the rulings), and `artifacts/canon.md` before
the first unit. Never copy that folder name into the pull request title or body; say "the
item that parked the v1 ceremony".
Keep tests first per unit. One four-model review panel, the interrogate skill, on the diff.
One verify pass on the final head, driven by the mechanical agent with the verify-ai4good
skill. One pull request.
Run every unit on the sheet's feature lane. Send a unit to the hardest-tasks lane only when
the writer must still design something, and say so in the decision trail. This item is the
trial of the feature lane on harness code: the pull request's Verification section names the
review findings per unit.
Tool-heavy work without judgment goes to the mechanical agent with exact instructions: the
rebase into ordered commits, the per-commit builds and tests, driving the verify skill and
capturing its evidence, and the closing commands. You decide and you judge the evidence; it
types; you check each result once.
Every delegated lane writes its full report to a file under `loop/items/AI4DEV-87/artifacts/`
and replies with five lines and the path. Read the file only when the summary names a
deviation, a blocker, or a red.
Do not name any other item's id in the pull request title or body.
The pull request body carries Why, Scope, Tradeoffs, Blast Radius, and Verification. Scope
part 5 may close as "not yet"; if it does, say so under Scope and list its work under "Not
done here".
Then close the item as the Closing section says. You close it, nobody else.

## Closing (the git part is yours, the board is not)
1. Wait for CI to be green on the exact head of the pull request, and for the founder to
   say "merge". Both, never one.
2. Hand the git mechanics to the `mechanical` agent with exact commands. You decide, it
   types: `gh pr merge <n> --squash`, and after you leave the worktree, the worktree removal
   and the remote branch deletion. The merge closes the item on the board through the pull
   request link. Never touch the board yourself.
3. Leave the worktree with `ExitWorktree(action: "keep")`.
4. Invoke `/controller done AI4DEV-87`. That skill does the board steering. Do not do it
   yourself.

## Mechanics never spend your calls
Fable calls are scarce. Tool-heavy work without judgment, the station 7 rebase, the merge
and cleanup commands, goes to the `mechanical` agent (sonnet, inherits the worktree,
executes exact instructions, rules on nothing). Write the exact plan, let it run, check the
result with one read. Do not use a fork for this: a fork runs on your own model.

## The evidence bar
- The Done contract in the item text is the bar. Name each check and its timestamp in the
  pull request's Verification section: `bun run typecheck`; `bun run at:check`; `bun run
  at:selftest` with the before and after counts; `bun run at:verify req-001 --tier loop
  --expect`; `bun run at:verify req-016 --tier loop --expect`; `bun run at:verify req-001
  --tier integration --expect` with its evidence line; the drive, every check (13 of 13 after the
  review panel's two Doctor checks; see the Acceptance tests paragraph above).
- CI is green on the final head.
- Discovered work goes in a "Not done here" list in the pull request body, never in the diff.

## Environment facts
- One database, the stack `supabase/config.toml` describes, local and cloud alike. Start it
  with `bun run db:start`; every integration run resets it. The drive manual is
  `.claude/skills/verify-ai4good/SKILL.md`.
- The Grok CLI is `C:\Users\nirdr\.grok\bin\grok.exe` and is not on the tool shell PATH.
  Prepend `~/.grok/bin` to PATH in the same command that launches a grok lane.
- codex is logged in on this machine. On a fresh cloud VM it needs `codex login
  --device-auth` once.
- The first commit on this branch carries this brief, one sentence in the controller's brief
  template, and the model record for today's sheet changes. It is machinery riding along, as
  section 5 of the project CLAUDE.md says.

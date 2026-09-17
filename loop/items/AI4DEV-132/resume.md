# Resume note for AI4DEV-132 (credits engine and funded routing)

Rewritten after every unit. Read this first, then `decisions.tsv`.

## Where the run is

The Feature playbook, one run for the whole item, six units. Grounding (`how/explanation.md`,
forty-four constraints), the four-lane design arena, the blinded judge and the synthesis are
finished and committed at `c9a1ccc`. The design of record is `design/SYNTHESIS.md`; it wins
over anything that disagrees with it, and it names `design/candidate-4-reserve-settle.md` as
its base. The founder ruled at the design gate (commit `71f5cb8`): the official SDK for the
model client, refusal fallbacks on, skills as prompt files.

**Units done: four.**

| what | commit | acceptance ids green |
|---|---|---|
| grounding, arena, synthesis, three founder rulings | `71f5cb8` | none, by design |
| unit 1, per-turn metering with a reserved turn record, plus its fix commit | `d925dad`, `000a22d` | AT-004.01, .02, .08, .47, .49 at loop; .01, .08, .47, .49 at integration, .02 pending on `ui.discovery-surface`; AT-001.10 turned green at integration |
| unit 2, funded projects route to fuel and never the free pool | `e601230` | AT-004.04, .05, .06, .48, .09 at loop; .48 at integration, the other four pending on `checkout.project-fuel` (and `billing.funded-turn` for .04, .05, .06) |
| unit 3, zero-credit remedies by tier | `dd75526` | AT-004.03a, .03b at loop; both pending on `ui.discovery-surface` at integration after the operator proof |
| unit 4, the conversation on Opus, persisted, resumable, streamed, plus its fix commit | `c2353b3`, `de4f2ba` | AT-004.10, .11 at loop; .11 at integration, .10 pending on `vendors.anthropic`; streaming and the live Opus call unverified at runtime (no key yet); the grant-tracker fixture is handwritten |

Item branch `nirdrang/ai4dev-132-credits-engine-and-funded-routing-d1`. The brief commit is
`4ddf524`; `6ead3d0` carries the sheet change (the writer row is grok at xhigh again). The lane
worktree is `.claude/worktrees/AI4DEV-132-unit0` on `lane/ai4dev-132`, at the item head. Both worktrees have `node_modules`. The local stack is up, started from the lane worktree.

Three founder rulings landed on 2026-09-17 between units, all in `decisions.tsv` and the
decision paper `research/chat-ui.md`: the send route streams in unit 4 (the Vercel UI message
stream over SSE behind `Accept: text/event-stream`, JSON by default, stop settles with the
measured usage, per-turn regenerate is a paid new turn this run); the front end may be built
in this tree as well as through Lovable as long as it deploys on Lovable or Vercel; the chat UI
itself stays the later `ui.discovery-surface` item. The unit 4 brief must carry the streaming
port, the stream variant of `settle.act`, settle on cancel in `EdgeRuntime.waitUntil`, and the
stand-in's `stream` method; two facts the paper could not verify (the beta namespace's
`.stream()` helper with `betas` and `fallbacks`; billing of a client-aborted stream) are the
writer's to prove with the key in `.env.local`.

## The first action on resume

Read `decisions.tsv` from the bottom. The next unit is the first one not in the table above.
Every unit brief follows `units/unit1.md` in shape; the design of record is `design/SYNTHESIS.md`
with its corrections 1 to 13 and the founder rulings.

## The per-unit loop

1. Create or fast-forward the lane worktree `.claude/worktrees/AI4DEV-132-unit0` on
   `lane/ai4dev-132` to the item head. That one worktree serves every unit. It needs
   `node_modules` (`bun install --frozen-lockfile`, output to a file).
2. Write the unit brief to `units/unitN.md`. Name the files, the scope, the checks, the must-nots.
3. Dispatch one writer lane through the external runner in `isolated-write` mode with `--cwd`
   set to the lane worktree. The feature lane is `grok:grok-4.6@xhigh`; the hardest-tasks lane is `codex:gpt-6-astra@medium`. Pass `--output reports/unitN-reply.md` (the runner's captured reply); the writer writes `reports/unitN.md` in the lane, which you copy into the item worktree and delete from the lane before the ff-merge.
4. Review the diff yourself. Run every check yourself as a background command writing to a
   file; read back the exit code and the counts. The runner is the scratchpad's
   `run-checks.ps1` (`-Lane -Out -Checks`); it writes `<check>.log` and `summary.txt`. If the
   scratchpad is gone, it is twenty lines: for each check, `cmd /c "bun run <check> > <log>
   2>&1"` from the lane, then the exit code and the last lines into the summary.
5. Commit in the lane worktree citing the item, then `git merge --ff-only lane/ai4dev-132` in
   the item worktree. If the item branch moved while the lane ran, rebase the lane first.
6. Rewrite this file. Open the compaction gate with the `AskUserQuestion` tool: one question
   whose options are continue or compact, with what the unit landed and the remaining context
   budget in the question text, plus any open decision the next unit needs as a second
   question. Never open the gate as prose alone.

## The thirteen checks every unit must pass

```
bun run typecheck
bun run at:check req-004
bun run at:selftest
bun run at:verify req-004 --tier loop --expect
bun run at:verify req-001 --tier loop --expect
bun run at:verify req-002 --tier loop --expect
bun run at:verify req-003 --tier loop --expect
bun run at:verify req-016 --tier loop --expect
bun run at:verify req-004 --tier integration --expect
bun run at:verify req-001 --tier integration --expect
bun run at:verify req-002 --tier integration --expect
bun run at:verify req-003 --tier integration --expect
bun run at:verify req-016 --tier integration --expect
```

## The units, in the brief's order

| unit | item | ids | lane | notes |
|---|---|---|---|---|
| 1 | AI4DEV-138 (per-turn metering at a constant ratio) | 01, 02, 08, 47, 49 | decided in SYNTHESIS | extends the allowance ledger, lands the suite scaffold and the manifest |
| 2 | AI4DEV-139 (funded projects bill fuel, never the pool) | 04, 05, 06, 48, 09 | decided in SYNTHESIS | routing decision behind a fuel seam; fuel-debit ids red by name |
| 3 | AI4DEV-140 (zero-credit remedies by tier) | 03a, 03b | feature | may be a change to the existing block-at-zero reason |
| 4 | AI4DEV-141 (the conversation on Opus, persisted and resumable) | 10, 11 | hardest tasks | the one-way door; framework choice to the founder at the gate before it |
| 5 | AI4DEV-156 (abuse guardrails and the kill switch) | 41 to 45 | feature | two static absence arms, one admin write route |
| 6 | AI4DEV-157 (transparency read contract) | 46 | feature | rendering half red on `ui.discovery-surface` |

## Gotchas

- PowerShell only. This project forbids the Bash tool.
- `grok.exe` is not on the tool shell PATH. Prepend `$env:USERPROFILE\.grok\bin` per call.
- Launch the external runner as `bun <path to pstack-runner> ...`, never as the bare path.
- A codex lane in a lane worktree cannot run vitest (sandbox denies ancestor reads). A grok lane can: measured 2026-09-16 on the unit 1 fix, it ran at:selftest and two loop suites green. The lead still runs every check as a background command; the writer's run is not the evidence.
- The read gate refuses an unbounded read over 350 lines. Page it with offset and limit.
- The edge runtime serves functions from the folder the stack was STARTED in. Start the stack
  from the lane worktree, and restart it whenever a unit adds a route folder.
- Never paste the output of `bun run db:start`.
- An integration run resets the stack; a check that starts in that window reports every id
  red with a 502. Run it again before looking for a cause.
- The PR body must not name any id but the parent's. Units are named in words.





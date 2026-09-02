# Brief for AI4DEV-86 (v1 ceremony out, CI aligned)

Chain: AI4DEV-86 (v1 ceremony out, CI aligned) — standalone, founder ruling at pickup 2026-09-01
Branch: nirdrang/ai4dev-86-the-v1-ceremony-leaves-the-codebase-and-ci-aligns-with-the
PRD slice: none — a machinery item with no PRD requirement above it. Provenance: the founder
rulings recorded in `.claude/skills/work/pstack-workflow-ai4good.md`, section 12, the entries
dated 2026-09-01.
Item text: (verbatim from the board)

> Two ways of work coexist in the tree. pstack (v2) supplies the discipline through its
> stations. The v1 relay supplied it through machinery, and that machinery still sits in the
> harness, the agents, the scripts, and CI.
>
> Founder rulings, 2026-09-01: "no more slots machinery this should be moved out" and "i want
> to clean the codebase with the v1 ceremony and align with what is does on CI as well". Both
> are recorded in the changelog of `.claude/skills/work/pstack-workflow-ai4good.md`.
>
> ## Scope — park, never delete
>
> 1. **Slot machinery out of `tests/at`**: `harness/db-pool.ts` and its selftest, the
>    slot-shaped parts of `attestation.ts` and `live-email.ts`, the runner's integration-tier
>    slot occupancy, `loop/work/db-slots.ps1`. The integration tier targets the one stack on
>    the 44321 block (project id `poancmeitlmxejofwzuu`), keeping its identity proofs:
>    loopback host, this project's ports, migrations replayed.
> 2. **v1 agents parked**: conductor, orchestrator, orchestrator-opus, executor,
>    reviewer-runner, distiller. `mechanical` stays — the v2 workflow uses it.
> 3. **v1 scripts in `loop/work/` parked**: twin-check, stamp-hook, attribution-report
>    (+ selftest, epoch file), watch-items, work-lib, materialize. Check `banner`,
>    `ci-status`, `context-gauge`, `statusline` against `.claude/settings.json` first —
>    anything settings still reference stays.
> 4. **Old `/work` skill prose parked**; project CLAUDE.md section 5 rewritten to name the v2
>    entry points (`/controller`, poteto-mode). The three standing rules stay.
> 5. **Harness freeze**: sentinels, faults, vendor sims, oracles (+ `AT_JUDGE_API_KEY`
>    plumbing), fixture worlds, capabilities take no new code. New acceptance tests are plain
>    vitest: against the shipped module when the id is pure logic, against the one stack when
>    it is wiring.
> 6. **CI aligned**: drop the twin-guard step; `at:selftest` shrinks with the parked files;
>    everything else stays — typecheck, `at:check` bijection, `at:verify --tier loop
>    --expect` per manifest, the prose fast lane, the ownership guard, the reference guard.
>
> ## Keep untouched
>
> The AT ids and `.taskmaster/docs/acceptance/`, `loop/decomp/` pins, the `--expect`
> manifests, the shipped-module selftests, `verify-ai4good`.
>
> ## Done contract
>
> - CI green on the branch with the aligned workflow.
> - `bun run typecheck` green; `at:verify req-001 --tier loop --expect` and `req-016` green.
> - `at:verify req-001 --tier integration` green against the 44321 stack with no slot code on
>   the path.
> - Parked files under one parked folder with a README naming what moved and why.
> - Project CLAUDE.md names the v2 way of work.
>
> ## Risk to weigh at the design station
>
> The integration-tier repoint is the hard half — `runner.ts` is deep in slot assumptions.
> Weigh "repoint in place" against "a thin new integration entry that reuses the identity
> checks".

Acceptance tests: `tests/at/suites/req-001/` and `tests/at/suites/req-016/`. This item writes
no new acceptance tests. Both suites must stay green at the loop tier with `--expect`, and
req-001 must also pass at the integration tier against the one stack, with no slot code on
the path.

## The ask
Run this item in poteto-mode, end to end, and open one pull request from this branch.
Ground it with /how in critique mode first: explorers, explainer, then the critics, on
every item.
In the design arena, give every runner a distinct structural direction, so the candidates
do not converge on one design. This item touches more than one subsystem, so add
deepseek@max and glm@max runner lanes on top of the sheet's three.
Tool-heavy work without judgment goes to the mechanical agent with exact instructions: the
rebase into ordered commits, the per-commit builds and tests, driving the verify skill and
capturing its evidence, and the closing commands. You decide and you judge the evidence; it
types; you check each result once.
Do not name any other item's id in the pull request title or body.
The pull request body carries Why, Scope, Tradeoffs, Blast Radius, and Verification.
Then close the item as the Closing section says. You close it, nobody else.

## The harness ruling is yours (founder, 2026-09-02: "i want the poteto-mode to decide this
whole test harness")
The item text freezes the acceptance-test harness under `tests/at/harness/` and parks the
slot machinery. The founder is not sure the rest of the harness earns its place. You decide
its fate, with evidence, at the critique and design stations:
- The harness is about 15,000 lines and serves two suites, `req-001` and `req-016`. Its parts:
  the runner and `at:check` bijection; the `--expect` manifests and registry; the semantic
  judge in `oracles.ts` (an Opus call with a rubric, structured output, record and replay,
  used by `req-016` only); the vendor stand-ins, sentinels, faults, fixtures, guards, clock;
  and about 5,600 lines of harness selftests.
- The alternative on the table is plain vitest against the shipped modules and the one stack,
  with `verify-ai4good` as the drive skill for evidence on the running app.
- Rule on each part: keep frozen, park, or remove. Say what each ruling costs: what stops
  being checked (the id bijection, the `--expect` floor, judging AI-written text) and what
  gets simpler. The judge is a ruling of its own, not a footnote.
- Where the ruling stays inside this item's scope, do it here. Where it widens the item, put
  the ruling and its reasons in the pull request body under a "Harness ruling" heading and the
  work in "Not done here". The Done contract above does not change either way: both suites
  green at the loop tier with `--expect`, `req-001` green at the integration tier.

## Closing (the git part is yours, the board is not)
1. Wait for CI to be green on the exact head of the pull request, and for the founder to
   say "merge". Both, never one.
2. Hand the git mechanics to the `mechanical` agent with exact commands. You decide, it
   types: `gh pr merge <n> --squash`, and after you leave the worktree, the worktree removal
   and the remote branch deletion. The merge closes the item on the board through the pull
   request link. Never touch the board yourself.
3. Leave the worktree with `ExitWorktree(action: "keep")`.
4. Invoke `/controller done AI4DEV-86`. That skill does the board steering. Do not do it
   yourself.

## Mechanics never spend your calls
Fable calls are scarce. Tool-heavy work without judgment, the station 7 rebase, the merge
and cleanup commands, goes to the `mechanical` agent (sonnet, inherits the worktree,
executes exact instructions, rules on nothing). Write the exact plan, let it run, check the
result with one read. Do not use a fork for this: a fork runs on your own model.

## The evidence bar
- The Done contract in the item text is the bar. Name each check and its timestamp in the
  pull request's Verification section: `bun run typecheck`; `bun run at:verify req-001 --tier
  loop --expect`; `bun run at:verify req-016 --tier loop --expect`; `bun run at:verify
  req-001 --tier integration` against the 44321 stack.
- CI is green on the final head.
- Discovered work goes in a "Not done here" list in the pull request body, never in the diff.

## Environment facts
- One database, `AT_DB_SLOT=1`, local and cloud alike. The local stack is up on the 44321
  block (project id `poancmeitlmxejofwzuu`); `bun run db:start` and `bun run db:reset` manage
  it. The drive manual is `.claude/skills/verify-ai4good/SKILL.md`.
- The v1 setup command `bun tests/at/harness/db-pool.ts setup` is part of what this item
  parks. Never run it.
- The grok probe failed at opencode's upstream on 2026-08-31. Re-probe grok before its first
  panel use; a failed lane is a recorded dropout, never a silent substitute.
- codex is logged in on this machine. On a fresh cloud VM it needs `codex login
  --device-auth` once.

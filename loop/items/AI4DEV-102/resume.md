# Resume note for AI4DEV-102 (the vetting action and its audit record)

Rewritten after every unit. Read this first, then `decisions.tsv`.

## Where the run is

The Feature playbook, one run for the whole item. Grounding, the design arena, the blinded judge and
the synthesis are all finished and committed. The design of record is
`loop/items/AI4DEV-102/design/SYNTHESIS.md`, and it wins over anything that disagrees with it.

**Units done: the suite scaffold, and unit 1 of 13.**

| what | commit | acceptance ids now green |
|---|---|---|
| the suite scaffold, all red | `cd0cf72` | none, by design |
| unit 1, the vetting record | `2c6d415` | AT-002.11, AT-002.11b, at both tiers |

Item branch `nirdrang/ai4dev-102-the-vetting-action-and-its-audit-record-d3`, head `2c6d415`, tree
clean, nothing pushed since the brief commit. The local Supabase stack is up.

## The first action on resume

Unit 2, AI4DEV-112 (only the platform admin vets), for AT-002.29 and AT-002.30. Write its brief the
way `C:\Users\nirdr\AppData\Local\Temp\claude\ai4dev102\unit1.md` is written, or copy that file's
shape from the committed report if the scratchpad is gone.

Unit 2 is mostly proofs over behaviour unit 1's definer already enforces, plus the source oracles
that show no automated verification path exists.

## The per-unit loop

1. Reset the lane worktree to the item head:
   `git -C .claude/worktrees/AI4DEV-102-unit0 reset --hard <item head>`. That one worktree serves
   every unit, because a worktree cannot be removed without a founder decision.
2. Write the unit brief to the scratchpad. Name the files, the scope boundaries, the checks, and what
   the unit must not do.
3. Dispatch one writer lane. The feature lane is `grok:grok-4.6@xhigh` in `isolated-write` mode
   through the external runner, with `--cwd` set to the lane worktree.
4. Review the diff yourself. Re-run every check yourself; do not trust the writer's report.
5. Commit in the lane worktree, then `git merge --ff-only lane/ai4dev-102` in the item worktree.
6. Rewrite this file. Send one push notification naming the unit and the context used.
7. Start the next unit. **Do not stop between units.** The founder ruled on 2026-09-10 that a unit
   boundary notifies and never blocks.

## The eight checks every unit must pass

```
bun run typecheck
bun run at:check req-002
bun run at:selftest
bun run at:verify req-002 --tier loop --expect
bun run at:verify req-001 --tier loop --expect
bun run at:verify req-016 --tier loop --expect
bun run at:verify req-002 --tier integration --expect
bun run at:verify req-001 --tier integration --expect
```

The last two matter most. Every new table and every new write route changes what the authentication
suite's static scans and live catalog checks see, and that suite must stay green.

## The remaining units, in the founder's fixed order

| unit | item | ids | notes |
|---|---|---|---|
| 2 | AI4DEV-112 (only the admin vets) | .29, .30 | mostly proofs over unit 1's definer |
| 3 | AI4DEV-113 (unvet and the notification) | .12 red, .13, .14 | inserts the emit into unit 1's definer |
| 4 | AI4DEV-114 (the evidence rule) | .16, .17, .18 | proofs over unit 1's constraints |
| 5 | AI4DEV-105 (profile create) | .01 | independent of the vetting chain |
| 6 | AI4DEV-106 (profile edit) | .02 | needs unit 5 |
| 7 | AI4DEV-107 (tier grants and vet math) | .04, .07, .08 | the spend ledger lands here |
| 8 | AI4DEV-109 (the UTC reset) | .06 | needs unit 7 |
| 9 | AI4DEV-116 (what vetting never gates) | .21, .22 | needs unit 7 |
| 10 | AI4DEV-117 (pilot default and wording) | .28, .23 red | needs units 1 and 7 |
| 11 | AI4DEV-108 (the zero-credit block) | .05, .26 red, .27 | needs units 7 and 8 |
| 12 | AI4DEV-110 (no Discovery wallet) | .10 red, .31 red | ships a pure decision, no route, no green id |
| 13 | AI4DEV-115 (the publish gates) | .19 red, .20 red | ships a pure decision, no route, no green id |

## After the last unit

The item-wide stations, each run once over the whole diff. The comment audit on the mechanical model
with the comment-sicko prompt, never on the lead's own model. The multi-model review. The evidence
capture through `.claude/skills/verify-ai4good/`. The rebase into ordered commits. The pull request
with Why, Scope, Tradeoffs, Blast Radius and Verification, naming every unit in words and no other
item's id. Then the closing section of the brief.

## The red set, settled

Eight ids, `capability-pending`, each naming what it waits on. AT-002.05 is red at the integration
tier only. The others are red at both. The full table is in `SYNTHESIS.md`. Nineteen green at
integration and twenty at loop when every unit has landed.

## Standing constraints

1. Take the clock **after** the row lock, with `clock_timestamp()`, never at transaction start. A
   transaction that begins before midnight can take its lock after midnight.
2. An unvetted organisation keeps the credits it already holds until the next UTC day. Founder ruling
   of 2026-09-09. Store credits spent and the highest grant applied today; remaining is the
   difference. No stored raise flag.
3. `public.emit_notification` is callable only by an owner-definer, never by an edge function.
4. The notification taxonomy is closed. `vetting.outcome` covers both outcomes, told apart by the
   payload. Named copy is separate from taxonomy registration and changes no oracle.
5. A new audit enum value needs its own migration file.
6. Every new public table needs a baseline revoke from all three roles, row level security, a
   `TENANT_CATALOG` row, and a posture.
7. No fourth `viewer_` helper. The live catalog check pins that set at three.
8. No `WRITE_ROUTES` row for publishing or funding. A row is a claim that a route exists.
9. The grants 10 and 30 are pinned in `tests/at/harness/atconfig.ts`. Never write them in a test body.
10. No new harness machinery of any kind.

## Gotchas

- PowerShell only. This project forbids the Bash tool.
- `grok.exe` is not on the tool shell PATH. Prepend `$env:USERPROFILE\.grok\bin` per call.
- An external runner lane is read-only or isolated-write, and the runner writes the model's final
  response to `--output` at completion. Never ask an external lane to write its artifact to a file.
- The read gate refuses an unbounded read over 350 lines. Page it, or send a read lane with an aim.
- Never paste the output of `bun run db:start`. It contains a secret key, and GitHub push protection
  then refuses every later push on the branch.

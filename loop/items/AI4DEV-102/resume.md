# Resume note for AI4DEV-102 (the vetting action and its audit record)

Rewritten after every unit. Read this first, then `decisions.tsv`.

## Where the run is

The Feature playbook, one run for the whole item. Grounding, the design arena, the blinded judge and
the synthesis are all finished and committed. The design of record is
`loop/items/AI4DEV-102/design/SYNTHESIS.md`, and it wins over anything that disagrees with it.

**Units done: the suite scaffold, and all thirteen units.**

| what | commit | acceptance ids now green |
|---|---|---|
| the suite scaffold, all red | `cd0cf72` | none, by design |
| unit 1, the vetting record | `2c6d415` | AT-002.11, AT-002.11b, at both tiers |
| unit 2, only the admin vets | `4d18e84` | AT-002.29, AT-002.30, at both tiers |
| unit 3, unvet and the notification | `7c88d19` | AT-002.13, AT-002.14, at both tiers |
| unit 4, the evidence rule | `26002f6` | AT-002.16, AT-002.17, AT-002.18, at both tiers |
| unit 5, the organisation profile | `4892ac5` | AT-002.01, at both tiers |
| unit 6, the profile edit | `56f61f8` | AT-002.02, at both tiers |
| unit 7, the spend ledger and the vet math | `0af622a` | AT-002.04, AT-002.07, AT-002.08, at both tiers |
| unit 8, the UTC reset | `e28ab34` | AT-002.06, at both tiers |
| unit 9, what vetting never gates | `f4965fb` | AT-002.21, AT-002.22, at both tiers |
| unit 10, the pilot default and the wording | `b462722` | AT-002.28, at both tiers |
| unit 11, the zero-credit block | `7202715` | AT-002.05 at loop, AT-002.27 at both tiers |
| unit 12, no Discovery wallet | `83cc0a9` | none, by design |
| unit 13, the publish gates | `5e1238f` | none, by design |

Item branch `nirdrang/ai4dev-102-the-vetting-action-and-its-audit-record-d3`, head `5e1238f`, tree
clean, nothing pushed since the brief commit. The local Supabase stack is up. Twenty of
twenty-seven acceptance ids are green.

Two commits below the head are not units. `fe4987b` carries the model sheet change of 2026-09-10:
the hardest-tasks seat moves to astra at medium, and the perf-issue seat drops to astra at medium.
`4d7a81c` records that change in this file. The sheet copy in the main folder stays behind until
this branch merges.

## The first action on resume

**Every unit is built.** The next thing is the item-wide closing stations, in the order the section
"After the last unit" gives: the comment audit on the mechanical model with the comment-sicko
prompt, the multi-model review, the evidence capture through `.claude/skills/verify-ai4good/`, the
rebase into ordered commits, the pull request, then the brief's Closing section.

Nothing is pushed. The merge needs CI green on the exact head and the founder's word, both.

Open carry from unit 13: the absent-publish-flow arm is `absentPublishFlowProblems` in
`_source-scan.ts`. It asserts an absence, which is what the two red manifest lines claim. Its third
check is the load-bearing one: nothing scheduled changes a project, so the promise that a scoped
project may sit untouched cannot be broken without a publish route.

Open carry from unit 12: `fundingAllowed` sits beside `publishingAllowed` in
`supabase/functions/_shared/org-vetting.ts`, asserted in
`tests/at/harness/shipped-org-vetting.selftest.ts`. The contract member `sut.fundingAllowed` stays
unlanded on both adapters, because no assertion consults it. The no-wallet arm is
`discoveryWalletProblems` in `_source-scan.ts`.

Open carry from unit 11: the exhausted sentence lives in two languages, because the block is a state
only the database sees under its row lock. `dailyAllowanceExhaustedReason` in
`supabase/functions/_shared/discovery-allowance.ts` is the TypeScript place, the debit arm of
`public.discovery_allowance` is the SQL place, and `exhaustedSentenceProblems` in `_source-scan.ts`
fills the SQL format string and compares the two word for word. Change either and you change both.

Open carry from unit 10: the founder-vetted wording sweep is `trustWordingProblems` in
`tests/at/suites/req-002/_source-scan.ts`, a naming oracle over quoted strings with no acceptance
id, asserted in `tests/at/harness/req002-oracles.selftest.ts`. AT-002.23 stays red on the listing
screens. A badge whose text is built at run time escapes the arm, and the arm's own comment says so.

Open carry from unit 9: the publish-gates unit inherits `publishingAllowed` in
`supabase/functions/_shared/org-vetting.ts`. It is one pure decision over the vetted flag, consulted
by both test adapters and by no route. That unit extends it; it never writes a second copy.

Open carry from unit 4: an extra key on a vetting request is refused as an invalid request rather
than as invalid evidence. The refusal is correct and its kind is less precise than it could be.

Open carry from unit 5: the profile route demands all five fields on every call, so a caller cannot
clear one field back to null. No criterion asks for that.

Closed carry from unit 7: the ledger mark takes the higher of the tier before a vetting action and
the tier after it. Unit 8 proves it, and showed the assertion fails without the fix.

Open carry from unit 8, accepted and not a defect: an integration run that crosses real midnight in
the middle of the reset body can fail its process-clock comparison. Correction C3 says no test in
this tree proves the crossing.

Open carry from unit 6: the member-of-this-organisation caller is the single seat with its role
changed by an operator write, because the unique seat forbids a second membership row. No product
path writes the member role, so that refusal arm guards a state the product cannot reach today.

## The per-unit loop

1. Bring the lane worktree to the item head. The permission classifier refuses
   `git reset --hard`, so use `git -C .claude/worktrees/AI4DEV-102-unit0 merge --ff-only <item
   head>` after checking the worktree is clean. That one worktree serves every unit, because a
   worktree cannot be removed without a founder decision.
2. Write the unit brief to the scratchpad. Name the files, the scope boundaries, the checks, and what
   the unit must not do.
3. Dispatch one writer lane. The feature lane is `grok:grok-4.6@xhigh` in `isolated-write` mode
   through the external runner, with `--cwd` set to the lane worktree.
4. Review the diff yourself. Re-run every check yourself; do not trust the writer's report.
5. Commit in the lane worktree, then `git merge --ff-only lane/ai4dev-102` in the item worktree.
6. Rewrite this file. Send one push notification. Then open the compaction gate: name what the unit landed, the remaining context budget, and your recommendation on compacting. Wait for the answer.
7. Start the next unit once the founder answers the gate. The founder replaced the notify-only boundary with this gate on 2026-09-10, because a notification cannot carry the content. The lead cannot compact; the gate stops cleanly and the founder runs the command.

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
bun run at:verify req-016 --tier integration --expect
```

The last two matter most. Every new table and every new write route changes what the authentication
suite's static scans and live catalog checks see, and that suite must stay green.

## The units, in the founder's fixed order — all built

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
- Launch the external runner as `bun <path to pstack-runner> ...`, never as the bare path. The file
  is a bun script with a shebang, and PowerShell runs it as an unknown file: it exits 0, writes no
  receipt, and touches nothing. An exit code of 0 with no receipt file means the lane never started.
- A writer lane can stop the local stack. Unit 5's lane ran `bun run db:stop` to make the stack pick
  up a new edge function, and it was cancelled before it started the stack again. Check the stack is
  up before running the checks, and never paste the output of `bun run db:start`.
- A cancelled lane can still have finished the work. Read the diff before you decide to run the unit
  again. Unit 5's lane died at turn 43 with the whole unit written and no report; the lead wrote the
  report from the diff.
- An external runner lane is read-only or isolated-write, and the runner writes the model's final
  response to `--output` at completion. Never ask an external lane to write its artifact to a file.
- The read gate refuses an unbounded read over 350 lines. Page it, or send a read lane with an aim.
- Never paste the output of `bun run db:start`. It contains a secret key, and GitHub push protection
  then refuses every later push on the branch.
- An integration run resets the stack, so its database and its authentication service restart. A
  check that starts in that window reports every id red with a 502 from the provisioning call. That
  is the environment, not the code. Run the check again before you look for a cause in the diff.
- Two stacks from the parked slot pool, `ai4good-slot-1` and `ai4good-slot-2`, are still running.
  They are not part of this run. Report them; never remove them without a founder decision.










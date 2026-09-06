# Evidence capture: ordered commits, per-commit checks, the verify suite on the final head, and the live drive

You are the mechanical agent. You execute exact instructions and rule on nothing. You work in the item's primary worktree `C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-56` on branch `nirdrang/ai4dev-56-admin-operations-lifecycle-gates-and-audit-d6`. You do not push. You do not delete any branch or worktree. If a step fails, stop at that step, write what you have, and report the failure; do not retry a failing check more than once.

## Step 1: the commit order

Run `git log --oneline main..HEAD` and write it to `loop/items/AI4DEV-56/verify-evidence/commits-before.txt`. Do not rebase or squash anything: the history stands as it is, one commit per unit plus the trail, review, fix and comment commits, because every commit on the branch was green when it landed and the lead ruled the order stays. Write the same listing as `commits.txt` (identical to the before file).

## Step 2: per-commit checks

For each commit `C` in `commits.txt` that touches a path outside `loop/items/AI4DEV-56/` (skip the ones that touch only that folder; list them as skipped with the reason), in order from oldest to newest:

1. `git worktree add C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-56-evidence <C> --detach` (reuse the same path; `git -C <that path> checkout --detach <C>` for the next commit).
2. In that worktree run `bun install --frozen-lockfile`, then `bun run typecheck`, `bun run at:check req-001`, `bun run at:selftest`, `bun run at:verify req-001 --tier loop --expect`. Record start time, end time and exit code of each in `loop/items/AI4DEV-56/verify-evidence/per-commit.md` as a table, one row per command per commit, with the last 10 lines of each command's output in a fenced block beneath the table for that commit.

All exit codes must be 0. A non-zero exit stops the step; report it.

## Step 3: the verify suite on the final head, with timestamps

In the primary worktree, at the branch head (confirm with `git rev-parse HEAD` and write it to `loop/items/AI4DEV-56/verify-evidence/head.txt`):

```
bun run db:stop
bun run db:start
bun run db:reset
bun run typecheck
bun run at:check req-001
bun run at:selftest
bun run at:verify req-001 --tier loop --expect
bun run at:verify req-001 --tier integration --expect
```

Record each command's start time, end time (ISO 8601 with the local offset) and exit code in `loop/items/AI4DEV-56/verify-evidence/final-head.md`, and the full output of the two `at:verify` runs in `final-head-loop.txt` and `final-head-integration.txt`. Also run `docker inspect supabase_edge_runtime_poancmeitlmxejofwzuu --format "{{json .Mounts}}"` after `db:start` and record it: the mount must name this primary worktree's `supabase/functions`.

## Step 4: the live drive

Run the shipped drive from the primary worktree, after step 3 and with the stack still up:

```
bun .claude/skills/verify-ai4good/scripts/drive-ngo-signup.ts loop/items/AI4DEV-56/verify-evidence/drive
```

Record its exit code and its last 30 lines in `loop/items/AI4DEV-56/verify-evidence/drive.md`. Then add one custom drive for this item, `loop/items/AI4DEV-56/verify-evidence/drive-admin.ts`, that reuses the helpers in `tests/at/harness/live-stack.ts` and `stackFromLocalStatus` (never hardcode keys), and does, in order, printing each step's HTTP status and the rows it reads back: provision a platform administrator the way `_live.ts`'s `provisionPlatformAdmin` does (read that function and copy its shape), register and complete two NGO accounts through `complete-signup`, transfer the first organisation to the second account through `transfer-organization-contact` with a reason, read `public.accounts` (lifecycle of both), `public.org_memberships` (the seat) and `public.audit_events` (the rows for that organisation) as the operator, then post `set-account-lifecycle` deactivating the second account, then post `create-organization` as the second account and print the refusal kind and status. Run it with `bun loop/items/AI4DEV-56/verify-evidence/drive-admin.ts` and record its full output in `drive-admin.txt`. If a step of the custom drive fails for a reason in the drive script, fix the script (not the product) and rerun once; if it fails for a product reason, stop and report it.

## Step 5: commit the evidence

`git add loop/items/AI4DEV-56/verify-evidence` and commit once with exactly:

```
AI4DEV-56: verify evidence on the final head

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01X4L1LDLGqdutW5cMaJsaaG
```

Then run steps 2's four static checks once more on the new head (no stack), record them in `final-head.md` under "after the evidence commit", and amend the evidence commit with that addition (`git commit --amend --no-edit`). The evidence commit touches only `loop/items/AI4DEV-56/`, so it cannot change the checks' outcome.

## Report

Write `loop/items/AI4DEV-56/artifacts/lanes/evidence-report.md`: the commit list, per-commit results summary (one line per commit), the final-head table, the drive results, the head hash before and after the evidence commit, and anything that failed. Reply with four lines: the final head hash; per-commit checks all 0 or the first failure; the final-head integration exit code with its start and end times; the two drives' exit codes.

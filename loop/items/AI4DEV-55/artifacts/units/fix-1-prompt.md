# Fix lane: the interrogate verdict's "act on" items

You are the writer for the review fixes of the tenant-isolation deliverable. You work in the git worktree at `/home/user/ai4good/.claude/worktrees/fix-1`, on branch `ai4dev-55-fix-1`. Stay inside that directory for every read, write and command. Never touch `/home/user/ai4good` itself or any other worktree. Never change a file under `src/`. Do not edit any migration file dated before 2026-09-06.

## The contract

Read, in this order, from the worktree root:

1. `loop/items/AI4DEV-55/artifacts/interrogate/verdict.md` — the lead's verdict. Every numbered item under "Act on" is your work, as written there. The "Consider", "Noted" and "Dismissed" sections are not your work; do not build them.
2. The three reviewer reports beside it (`review-astra.md`, `review-fable.md`, `review-opus.md`) for the evidence and the concrete suggestions behind each item. Where the verdict and a reviewer's suggestion differ, the verdict wins.
3. `loop/items/AI4DEV-55/artifacts/arena/design.md` and `loop/items/AI4DEV-55/artifacts/how/rulings.md` — the decisions the code implements. A fix must keep every ruling.
4. The two unit reports, `loop/items/AI4DEV-55/artifacts/units/unit-1-report.md` and `unit-2-report.md`, for what exists and how the gates were run.
5. Every file you change, in full, before you change it.

## Rules for the diff

- Fix what the verdict names and nothing else. No adjacent improvements, no reformatting.
- Comments state a non-obvious why only. The migration header paragraphs the verdict asks for are the exception.
- TypeScript under `tests/at` compiles under `tests/at/tsconfig.json`. Pure modules under `supabase/functions/_shared/` stay pure. The contract keeps type aliases, not interfaces.
- The two new migrations (`20260906120000_...` and `20260907120000_...`) may be edited in place: the local stack rebuilds from scratch on every integration run and nothing has deployed them. Every earlier migration is read-only.
- Every scanner refusal the verdict names gets a selftest in the negative direction: synthetic migration text that contains the weakening statement, asserted to produce the named problem code. Opus's thirteen probe statements in `review-opus.md` are the list to cover.
- The renamed trigger sentence must not contain the words "single developer seat"; update the live regex and the fixture's mirrored reason with it, and keep the occupancy pattern disjoint from it.
- The new operator member that changes an account's type is narrow: one method on the contract, implemented in both adapters, used by AT-001.23's integration body and nowhere else.
- For the grok wrapper (`loop/work/grok-shim/grok`): every rewrite (sandbox profile, permission mode, bash auto-allow) fires only when the Landlock probe says the kernel lacks it; the probe runs on every invocation (`grep -qs landlock /sys/kernel/security/lsm`) with no cached negative; when a rewrite fires, print one line to stderr naming it; add `loop/work/grok-shim/README.md`, one short paragraph saying what the wrapper is, why it exists (the Claude cloud VM kernel boots without Landlock and grok 1.0.13 refuses its read-only and workspace profiles there), and that the runner is pointed at it with a PATH prefix.
- Commit liberally on `ai4dev-55-fix-1`, messages beginning `AI4DEV-55:`, naming no other item id anywhere.

## Gates, in order, all from the worktree root

1. `bun run typecheck`
2. `bun run at:check req-001`
3. `bun run at:selftest`
4. `bun run at:verify req-001 --tier loop --expect` and `bun run at:verify req-016 --tier loop --expect`
5. The integration tier: `bun run db:stop`, `bun run db:start`, confirm with `docker inspect supabase_edge_runtime_poancmeitlmxejofwzuu --format '{{json .Mounts}}'` that the mount names this worktree's `supabase/functions`, then `bun run at:verify req-001 --tier integration --expect`. One run at a time.
6. `bash -n loop/work/grok-shim/grok`.
7. Every gate green at the end, on the committed tree. The manifest does not change: the same ids green, AT-001.24 declared as before.

A red you cannot turn green is not a reason to weaken a test, widen a declaration, or skip. Record it exactly and stop at that gate.

## The report

Write `loop/items/AI4DEV-55/artifacts/units/fix-1-report.md` in the worktree and commit it: each verdict item with what you changed for it, file by file in one line each; every gate with the exact command, its exit code and the summary line it printed; anything you could not do as written, with the reason. Plain sentences.

Then reply with exactly five lines: the report's path; one line per gate group saying green or the first red (typecheck and check, selftest and loop tiers, integration tier); one line naming any verdict item you did not complete, or "all fourteen items done".

# Resume note for AI4DEV-166 (PRD workspace backend and wiring)

Rewritten at every step gate. Read this first after a compaction or in a new session.

## Where the run is

- Branch `nirdrang/ai4dev-166-build-shared-prd-chat-topic-progress-and-materialization`, worktree `.claude/worktrees/AI4DEV-166`. Not pushed yet. No pull request yet.
- The design contract is `design.md` in this folder. The decision trail is `decisions.tsv`.
- Unit 1 (shared PRD record) is done: commits `a5fe8dff` (the Grok writer's unit) and `0a0f3a84` (fixes). Integration tier at `0a0f3a84`: exit 0, 3 green and 15 red, matching `tests/at/expected/req-036.json` exactly. AT-036.02 is green. AT-036.11 and .12 stay green. AT-036.01 proves its PRD half, then declares pending, because the REQ-026 bootstrap is not in this tree. Loop tier: 18 green.
- Commit `d3d695f2` fixed the fast compact mod (`loop/work/self-compact-gate/hooks/gate.ts`). It now queues `/compact` through `$.command.run` instead of `$.session.compact`, which the desktop app refuses. The fix is also copied to the main checkout's copy, which is the one the app loads. Its first real test is the gate where this note was last rewritten.
- The first fast compact test failed because the app still ran the old mod from memory. The founder then restarted the app, and the restart stopped the unit 2 writer before it wrote anything (its worktree is clean at `d3d695f2`). NEXT ACTION: relaunch that writer with the same prompt and NEW output paths `u2s1b.out.md` and `u2s1b.receipt.json`, because the runner refuses existing paths.
- Unit 2 (technical scope section), step 1 of 3 is a Grok writer lane in worktree `C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-166-u2`, branch `lane/ai4dev-166/u2`, cut at `d3d695f2`. It removes the Lovable recommendation, the build split and the Lovable copy from `supabase/functions/_shared/scope.ts`, its skill `06-write-the-scope.md`, and every live caller; `tests/at/suites/req-036/scope.test.ts` asserts AT-036.11 and .12 as written. Prompt, report and receipt: scratchpad `units/u2s1.prompt.md`, `u2s1.out.md`, `u2s1.receipt.json` (scratchpad = `C:\Users\nirdr\AppData\Local\Temp\claude\C--Users-nirdr-Downloads-ai4good\85b3e8ba-8b39-4d84-8504-cf376bd1d691\scratchpad`). When it finishes: read the report, review the diff, merge by fast-forward, run the integration tier, then gate.
- Unit 2 step 2 (storing the scope in the technical scope section, plus the wire types) waits on the founder's open question below. Step 3 is the commit and this note.

## How units run (founder rulings this run)

- Every unit splits into steps that end in a checkable state. Each step ends at the AskUserQuestion gate (`Continue`, `Run /compact`, `Fast compact`), and this note is rewritten first (founder, 2026-10-24).
- Writers: the sheet's Grok row at xhigh, as `isolated-write` lanes through the pstack runner, each in its own worktree `C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-166-uN` on branch `lane/ai4dev-166/uN`, cut from the item branch head. Create it with an absolute path, because this session's cwd is the item worktree. Junction `node_modules` to the item worktree's. Merge the lane by fast-forward. Grok writers completed without cancellation on 2026-10-23.
- The lead runs the integration tier itself, never in a lane: `bun run at:verify req-036 --tier integration --expect`.
- Money: a PRD ledger with no real money. The tunnel: the MCP server is reached through a public tunnel at the integration tier. Model: `claude-haiku-5-5` for every session. The provider budget reads as: before each turn, the cap is the session's settled spend plus the turn's reservation, rounded up to a cent (decided by the lead, still to report to the founder).

## Environment facts learned

- The stack must be started from this worktree (`bun run db:stop`, then `bun run db:start`). Otherwise the edge runtime serves another worktree's functions.
- `supabase/functions/.env` is gitignored. It was copied from the AI4DEV-181 worktree.
- Docker Desktop failed on broken socket files. The fix was to rename `AppData\Local\Docker\run` and `AppData\Local\docker-secrets-engine` aside, which needs the founder's approval each time.
- Edge code must never import from `src/`. Shared wire types live in `supabase/functions/_shared/prd/wire.ts`.
- `bun run lint` reports tree-wide line-ending noise on Windows. Judge lint by errors other than line endings.
- `docker restart` of the edge runtime keeps its old environment. After changing `supabase/functions/.env`, run `bun run db:stop` then `bun run db:start`.
- `main` moved on 2026-10-24: pull request #98 (Discovery data tiers, AI4DEV-136) touched `scope-copy.ts`, the req-004 suites and `tests/at/suites/req-036/scope.test.ts`. Merge `main` into this branch before the next unit, and expect conflicts in those files.

## Founder rulings of 2026-10-24 (after the investigation in prd-storage.md)

- The PRD sections are markdown files under `prd/` in the NGO project's GitHub repo, from the day the PRD opens. The PRD tools server writes them through the GitHub API, one commit per AI turn, refused when a changed section moved (option B1). The database keeps states, questions, chats, money, drafts, and a read copy keyed by commit.
- The platform creates the project repo at PRD open through a new platform GitHub App. The integration tier uses a real GitHub test organization. The Lovable prose is dropped from the requirements. All nine pure sections name Lovable, 69 lines in total.
- Live updates use a data-free Realtime ping on a private per-project channel. Polling is gone from the design.
- Next decision number: d101 (the log is `loop/state/decisions.jsonl`, and its last entry is d100).
- Unit 2 state: Grok was cancelled again. Its WIP is commit `94799931` on `lane/ai4dev-166/u2`, not merged. The writer seat moves to Opus at medium.

## Progress since the rulings

- Step 1 is DONE: d101 is folded and pushed as `b064d5df`. That covers REQ-036, REQ-008, the repository lines of REQ-021, two framing sentences, the acceptance files and manifests of 008, 021 and 036, `design/prd-ui-contract.md`, and d101 in `loop/state/decisions.jsonl`. The Linear forward sync for the PM items of 008, 021 and 036 is deferred to `/controller done`, because the lead never touches the board. The founder ruled the PRD files may become public on the existing REQ-008 schedule.
- Lovable leaves the MVP (founder: postponed as a publish-to-deploy option). That fold is a separate session card, "Remove Lovable from the MVP PRD" (task_8e25de99), which the founder starts. It needs the founder's answer on MVP build and hosting. Until it runs, REQ-021 still describes a Lovable setup that connects to the existing repository.
- Items the fold writer left for the design step: how the read copy repairs itself after a direct push to `prd/`; the order of kickoff and PRD open; whether the GitHub App permission allowlist (AT-008.24) grows; and design.md lines 55 and 63, which still describe polling.
- Step 2 is DONE: `design.md` is redesigned for git storage (`420844da`), after a Codex Sol adversarial review saved as `design-review-d101.md`. The core: operations are registered in `prd_git_ops` before publication; one finalizer (`syncRepo` plus `prd_reconcile`) serves the response, the webhook and recovery; there is no lease; branch protection makes a fast-forward-only move work as a compare-and-swap; repository edits are imported by comparing `prd/` trees; section versions are readable, unreadable or missing; the Realtime ping goes through the `prd_can_listen` helper. The unit order is now 2, 3, 4 (no GitHub), then 1R (git storage), then 5 to 9.
- Step 3 is the FOUNDER's: follow `github-setup.md` (create the test organization and the GitHub App, put the four values in `supabase/functions/.env`), then say "GitHub is set up". Open founder questions in design.md: may test runs delete the repositories they create; should pushes to `prd/` by a person be applied (the design's default) or refused.
- Founder rulings 2026-10-24 afternoon: a person's push to `prd/` is applied as a new revision (confirmed sections it changed go to Needs review), and each test run deletes the repositories it created in the test organization.
- Unit 2 step 1 is DONE: the scope generator, its skill and its callers have no Lovable recommendation, build split or Lovable copy (`052dcf84`, cherry-picked; `7c82ca12` fixed a stale design note). On the founder's request the Grok writer ran again with a brief that keeps shell commands plain, and it completed with no cancellation (receipt `u2s1c`). Typecheck, the bijections, and the loop tiers of 036 and 004 match their expected files.
- RESOLVED: the founder revoked the old opencode key and put the new one (from the cloud environment's settings) into this worktree's `supabase/functions/.env`. After db:stop and db:start, the integration tiers match their expected files: req-036 3 green and 15 red, req-004 30 green and 34 red. The AI4DEV-181 worktrees still hold the revoked key.
- `main` was merged in (`e1abd42b`). The PRD record migration was renamed to `20261024130000_prd_record.sql`, because `main` added another migration with version `20261023120000`. After the merge both integration tiers match their expected files. AT-004.29 failed once against the live model (Muse left its data report off) and passed on the rerun. The founder has a card for a Discovery fix of that (task_fba4d636), not this item's work.
- Unit 2 is DONE (`71766735`). The `Scope` type is the technical-scope section's document (`{}` means not written yet). `parseTechnicalScope` in `_shared/prd/technical-scope.ts` and `scopeSourceProblems` in `scope.ts` are its one validator, shared with the generator. `Topic.scope` carries it on the wire, and `stories` is derived from it. The req-036 integration tier matches its expected file (3 green, 15 red), and AT-036.11 proves the section round trip. Known gap: no SQL writer validates section content until unit 5's commit path.
- Writers: Grok was cancelled again in step 2 (4 runs, 2 cancelled), so the writer seat is Opus at medium in this worktree, one writer at a time.
- NEXT: unit 3 (question order). Questions, answers and follow-up tables and rules. Turns AT-036.03 green, driven through the SQL functions. No GitHub. Split into steps, with a gate after each.

## Plan after the rulings, step by step, each ending at a gate

1. (done) Fold d101 into the PRD with `/doc-sync fold`: REQ-036, REQ-021 (repo created by the platform at PRD open, no Lovable), REQ-008, the d100 refinement, the Lovable prose dropped everywhere, and the AT and decomp files that follow.
2. Redesign `design.md`: git storage through a GitHub writer, the commit-keyed read copy, the Realtime ping, and the new unit order (unit 1 rework first).
3. Founder setup: the platform GitHub App and the test organization. The founder creates them; the lead writes the steps.
4. Resume the units.

## Open founder items

- RULED (see above), asked on 2026-10-24: where the PRD's section text lives while it is being written. The options are (A) the database, with git at the package (today's design and unit 1), (B) git in the project repo from the day the PRD opens, with a database read cache for the screen and the AI's reads, or (C) the database with a one-way mirror of each committed revision to git. The founder pushed on why it isn't git, the way ai4good keeps its own PRD, because coding agents will read the PRD often. The lead's answer: coding agents read git in every option, because the package writes the PRD before Build. B's costs are that the repo must exist at PRD open, a GitHub credential, a real GitHub test repo for the integration tier, and rework of unit 1's storage. No ruling yet.
- RULED (push ping): live updates. The founder called 1.5-second polling intensive. The lead proposed a data-free Realtime ping per change (only the sequence number, on a private per-project channel), after which the tab fetches through the edge function. The founder declined to answer that question when it was asked. Revisit before unit 9.
- Report the budget interpretation.
- Before the model part of unit 9, confirm the tunnel at the gate.

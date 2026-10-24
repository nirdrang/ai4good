# Resume note for AI4DEV-166 (PRD workspace backend and wiring)

Rewritten at every step gate. Read this first after a compaction or in a new session.

## Where the run is

- Branch `nirdrang/ai4dev-166-build-shared-prd-chat-topic-progress-and-materialization`, worktree `.claude/worktrees/AI4DEV-166`. Not pushed yet. No pull request yet.
- The design contract is `design.md` in this folder. The decision trail is `decisions.tsv`.
- Unit 1 (shared PRD record) is done: commits `a5fe8dff` (the Grok writer's unit) and `0a0f3a84` (fixes). Integration tier at `0a0f3a84`: exit 0, 3 green and 15 red, matching `tests/at/expected/req-036.json` exactly. AT-036.02 is green. AT-036.11 and .12 stay green. AT-036.01 proves its PRD half, then declares pending, because the REQ-026 bootstrap is not in this tree. Loop tier: 18 green.
- Commit `d3d695f2` fixed the fast compact mod (`loop/work/self-compact-gate/hooks/gate.ts`). It now queues `/compact` through `$.command.run` instead of `$.session.compact`, which the desktop app refuses. The fix is also copied to the main checkout's copy, which is the one the app loads. Its first real test is the gate where this note was last rewritten.
- Unit 2 (technical scope section), step 1 of 3 is RUNNING: a Grok writer lane in worktree `C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-166-u2`, branch `lane/ai4dev-166/u2`, cut at `d3d695f2`. It removes the Lovable recommendation, the build split and the Lovable copy from `supabase/functions/_shared/scope.ts`, its skill `06-write-the-scope.md`, and every live caller; `tests/at/suites/req-036/scope.test.ts` asserts AT-036.11 and .12 as written. Prompt, report and receipt: scratchpad `units/u2s1.prompt.md`, `u2s1.out.md`, `u2s1.receipt.json` (scratchpad = `C:\Users\nirdr\AppData\Local\Temp\claude\C--Users-nirdr-Downloads-ai4good\85b3e8ba-8b39-4d84-8504-cf376bd1d691\scratchpad`). When it finishes: read the report, review the diff, merge by fast-forward, run the integration tier, then gate.
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

## Open founder items

- OPEN, asked on 2026-10-24: where the PRD's section text lives while it is being written. The options are (A) the database, with git at the package (today's design and unit 1), (B) git in the project repo from the day the PRD opens, with a database read cache for the screen and the AI's reads, or (C) the database with a one-way mirror of each committed revision to git. The founder pushed on why it isn't git, the way ai4good keeps its own PRD, because coding agents will read the PRD often. The lead's answer: coding agents read git in every option, because the package writes the PRD before Build. B's costs are that the repo must exist at PRD open, a GitHub credential, a real GitHub test repo for the integration tier, and rework of unit 1's storage. No ruling yet.
- OPEN: live updates. The founder called 1.5-second polling intensive. The lead proposed a data-free Realtime ping per change (only the sequence number, on a private per-project channel), after which the tab fetches through the edge function. The founder declined to answer that question when it was asked. Revisit before unit 9.
- Report the budget interpretation.
- Before the model part of unit 9, confirm the tunnel at the gate.

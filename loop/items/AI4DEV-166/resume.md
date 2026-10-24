# Resume note for AI4DEV-166 (PRD workspace backend and wiring)

Rewritten at every step gate. Read this first after a compaction or in a new session.

## Where the run is

- Branch `nirdrang/ai4dev-166-build-shared-prd-chat-topic-progress-and-materialization`, worktree `.claude/worktrees/AI4DEV-166`. Not pushed yet. No pull request yet.
- The design contract is `design.md` in this folder. The decision trail is `decisions.tsv`.
- Unit 1 (shared PRD record) is done: commits `a5fe8dff` (the Grok writer's unit) and `0a0f3a84` (fixes). Integration tier at `0a0f3a84`: exit 0, 3 green and 15 red, matching `tests/at/expected/req-036.json` exactly. AT-036.02 is green. AT-036.11 and .12 stay green. AT-036.01 proves its PRD half, then declares pending, because the REQ-026 bootstrap is not in this tree. Loop tier: 18 green.
- Next: unit 2 (technical scope section).

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

- Report the budget interpretation.
- Before the model part of unit 9, confirm the tunnel at the gate.

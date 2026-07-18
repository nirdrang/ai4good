# AGENTS.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## 5. TaskMaster: Always Have a Task Context

**No coding without a known TaskMaster task or subtask in hand. Mirror every lifecycle transition into TaskMaster as you work — not at end of session.**

Before any edit, know which TaskMaster id this serves. If you don't, run `mcp__taskmaster-ai__next_task` (or `task-master next`) and pick one. **Tasks over ~6h must be expanded into subtasks before implementation starts** — `mcp__taskmaster-ai__expand_task --id=N --research=true` — so the lifecycle exposure is at subtask granularity, not at one big parent flip.

**Lifecycle transitions to keep in sync (in order, as they happen):**

| Moment | Action |
|---|---|
| Start of work on a task or subtask | `set_task_status id=N status=in_progress` |
| Mid-implementation, something non-obvious learned | `update_subtask id=N prompt="<one-line note>"` |
| Stuck on an external dependency or unclear scope | `set_task_status id=N status=blocked` + `update_subtask` note describing the blocker |
| Implementation done, tests not yet run | `update_subtask id=N prompt="implementation complete; testing next"` |
| Tests pass + AC verified | `set_task_status id=N status=done` |
| Every commit | Prefix the message with `task-N:` (or `task-N.M:` for a subtask) so it threads into the task's history |

**End of every session:** run `mcp__taskmaster-ai__get_tasks status=in_progress` and confirm each one matches reality. Flip anything stale. If nothing is `in_progress`, you weren't working — that's fine, but make it visible.

**Anti-patterns:**
- Coding without naming the task — drift, no audit trail, no rollback target.
- Batching status flips at end of day — looks like a suspicious burst rather than steady progress.
- Marking `done` because "basically there" — `done` means AC met AND tests pass AND change is on `main`.
- Hand-editing `.taskmaster/tasks/tasks.json` — always go through MCP (`set_task_status` / `update_subtask` / `expand_task`) or `task-master` CLI.
- Letting "implementation" and "testing" collapse into one silent flip — if a task didn't get a `update_subtask` note between `in_progress` and `done`, the testing phase is invisible.

This applies whether the work is 10 lines or 10 files: every edit traces back to a known TaskMaster id, and every meaningful state change lands in TaskMaster within the same work session.

---
## Project-Specific Guidelines

- **Use the Lovable MCP for non-trivial UI work.** For UI changes beyond simple tweaks, drive them through the Lovable MCP — Lovable is the bot operating its own MCP and has more intimate, UI/UX-optimized capabilities. Reserve direct edits for simple UI changes.
- **UI never touches the DB directly.** UI code must always go through an edge function — never call the database directly from UI code.

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

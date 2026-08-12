Window guard at the sitting boundary (AI4DEV-82): a sitting that cannot finish inside the usage
window must not start. This branch will carry three hooks that mechanically apply the founder's
85% line — a PreToolUse gate that denies Agent spawns while the window is past the line, a
PostToolUse alarm that tells every running actor to finish its current work item, commit and
park, and a stamp alarm for the founder's own session — plus a sensor-written verdict file, the
parking and resume choreography, and a synthetic-snapshot drill.

Current state: PLAN phase. The plan (`loop/items/AI4DEV-82/plan.md`) and the item's required
first measurement are in. Measured result, three instruments agreeing: PreToolUse hooks fire for
Agent calls made inside spawned agents — the nested-spawn probe logged `PreToolUse tool=Agent`
with a non-empty `agent_id` — so the hook design stands and the conductor-side fallback is not
built (evidence in `loop/items/AI4DEV-82/artifacts/hook-measurement.md`).

Also in this branch's record: the item worktree was auto-cleaned mid-sitting because its branch
carried zero commits; the repair and its lesson are recorded in
`loop/items/AI4DEV-82/artifacts/worktree-incident.md`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

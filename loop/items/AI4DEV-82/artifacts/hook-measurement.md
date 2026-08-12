# AI4DEV-82 — measurement: do PreToolUse hooks fire for Agent calls made inside spawned agents?

**Answer: YES, measured directly.** The item's required first step is settled: PreToolUse hooks
fire for Agent tool calls made from WITHIN a spawned subagent, not only at the top level of the
interactive session. The hook-based design stands as specified; the fallback (the conductor
running the gauge before each spawn by contract) is NOT needed. Measured 2026-08-12 by the PLAN
sitting, with three independent instruments.

## Instrument 1 — live probe in the production session tree (free)

The repository already carries a PreToolUse hook matched to `Bash|PowerShell`
(`loop/work/guard-branch-switch.ps1`). This sitting is a nested agent — interactive coordinator
session → conductor (subagent) → this orchestrator (subagent of a subagent). The sitting ran a
deliberately deniable, otherwise harmless PowerShell tool call:

```
git -C C:\Users\nirdr\Downloads\ai4good checkout main    # main worktree is already on main — a no-op if unblocked
```

Result: the hook FIRED and DENIED — the full `BLOCKED: this is the MAIN worktree...` message
arrived in this agent's transcript as the tool error, exit 2. Two facts follow: PreToolUse hooks
run for tool calls made by nested subagents at depth ≥ 2, and the deny text reaches the denied
actor's transcript. (If hooks had not fired, the command was a no-op: "Already on 'main'".)

## Instrument 2 — the documentation (claude-code-guide agent)

- "Hooks from settings files ... also run inside subagents. When a subagent calls a tool, tool
  events such as `PreToolUse` and `PostToolUse` fire the same configured hooks as in the main
  conversation, and the input carries the `agent_id` and `agent_type` fields" (hooks-guide, "How
  hooks work").
- The spawn tool's name for matchers is **`Agent`** (tools-reference; there is no separate Task
  tool name in current versions).
- PreToolUse deny with a model-visible reason: JSON `hookSpecificOutput.permissionDecision:
  "deny"` + `permissionDecisionReason` — "cancel the tool call and send the reason to Claude".
- PostToolUse: exit code 2 "shows stderr to Claude; the tool already ran" — the channel for a
  model-visible per-tool alarm.
- UserPromptSubmit: exit 0 stdout is injected into context (the stamp already relies on this).
- Mid-session settings edits: "the file watcher normally picks up hook changes automatically" —
  the docs claim no session-start freeze. Not independently measured; flagged for a post-merge
  check rather than relied on.

## Instrument 3 — headless probe with log-everything hooks (decisive)

A scratchpad project with `probe-settings.json` (committed beside this file): PreToolUse and
PostToolUse hooks with NO matcher, each appending its full stdin JSON to `pre.jsonl` /
`post.jsonl`. Two headless runs (`claude -p --settings probe-settings.json`):

**Run 1** (prompt mangled by native-argument quoting, still informative): the top-level session
ran Bash and spawned one general-purpose subagent; that subagent used Skill, Glob, Read, Grep and
PowerShell. `pre-run1.jsonl` / `post-run1.jsonl` show PreToolUse AND PostToolUse events for every
one of those subagent tool calls, each carrying `agent_id` + `agent_type=general-purpose`, plus a
top-level `tool=Agent` PreToolUse event, plus events from a further nested headless session.

**Run 2** (prompt piped via stdin, clean): top level spawns agent A; agent A spawns agent B. The
complete `pre-run2.jsonl`, four lines total across both files:

```
PreToolUse   tool=Agent  agent_id=(empty)            session=c15ee2f2   <- top-level spawn
PreToolUse   tool=Agent  agent_id=a19066bbe5c4b7eb7  agent_type=general-purpose   <- AGENT A'S OWN SPAWN OF AGENT B
PostToolUse  tool=Agent  agent_id=a19066bbe5c4b7eb7  agent_type=general-purpose   <- B completed, seen from inside A
PostToolUse  tool=Agent  agent_id=(empty)            session=c15ee2f2   <- A completed, top level
```

The second line is the deployment case verbatim: an Agent call made INSIDE a spawned agent (the
conductor-spawns-a-sitting shape) passes through PreToolUse, and the payload identifies the
spawning subagent. Raw evidence: `hookprobe/*.jsonl`, the probe settings, and the run-2 prompt,
all in this directory.

## Consequences for the build

1. The PreToolUse gate matched to `Agent` guards EVERY spawn boundary in the relay — coordinator
   → conductor, conductor → sitting, conductor → reviewer-runner, orchestrator → executor and
   mechanical — from one hook entry. No per-contract fallback text is needed.
2. Deny shape: JSON `permissionDecision: "deny"` with the reason string; the reason reaches the
   denied actor, so the parking choreography rides IN the deny reason.
3. Alarm shape: PostToolUse, exit 2 + stderr, fires inside subagents too — every actor hears it.
4. The stamp alarm rides UserPromptSubmit stdout as the stamp already does. UserPromptSubmit does
   not fire inside subagents (docs are silent on it; no such event appeared in any probe log) —
   which is why the item's design carries the PostToolUse alarm for agents and the stamp alarm
   for the founder-facing session, and both are needed.
5. One caution kept from run 1: PowerShell native-argument quoting mangled a nested prompt. The
   drill therefore feeds hook stdin via files/pipes, never as inline quoted JSON arguments.

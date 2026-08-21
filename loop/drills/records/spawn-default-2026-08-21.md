# Drill record — spawn semantics on Claude Code 2.1.238 (2026-08-21)

The parked post-232 upgrade drill, run live before the first item on the pure-push relay.
Two probes, both sonnet, spawned from the coordinator session (ebf2407e). Raw reports below.

## Probe 1 — nested spawn blocking mode

A probe agent inspected its own Agent tool schema and spawned a haiku child in the most default
way possible.

```
PARAMS=description,isolation,model,prompt,subagent_type
MODE=BACKGROUND
CHILD_TEXT_RECEIVED=yes
ROUNDTRIP_SECONDS=~2.8
```

**Verdict: the blocking spawn no longer exists PER CALL.** There is no run_in_background
parameter; every default Agent call returns in seconds with a task id, and the child's final
text arrives as a task notification. Docs follow-up the same day (changelog v2.1.232: spawns
"now run in the background by default"): foreground is DE-DEFAULTED, not removed — it survives
as session-wide switches (`CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1` forces EVERY spawn
foreground — unusable for the relay, it would make conductors block the coordinator;
`CLAUDE_CODE_FORK_SUBAGENT=0` lets the platform choose foreground when the caller needs the
result) and as the frontmatter pin `background: true`. The relay's conclusion is unchanged:
treat every spawn as background. The orchestrator therefore CANNOT block on its executor:
it spawns, idles (free, same as blocking), and its child's completion wakes it. Consequence
folded into the contracts the same day: the orchestrator twins' "executor spawns are background"
paragraph and the executor.md description. The old "blocked middle is deaf" property is retired
— a waiting orchestrator now hears messages at wake.

## Probe 2 — background-agent toolset and the reviewer-runner shape

A background probe agent exercised the two capabilities the relay depends on.

```
WRITE=ok
LONGCALL=inline   (PowerShell `ping -n 150 ...; 'PING-DONE'` — ~150 s, explicit 200000 ms
                   timeout — returned PING-DONE in the same tool result, no background
                   conversion, no truncation)
ELAPSED_SECONDS=~150
TOOLS_MISSING=none
```

**Verdict: background children keep their full toolset** (Write confirmed; nothing missing), and
**a long single shell call still returns inline** — the reviewer-runner's 6–16-minute hold shape
is safe on this build. The 2.1.229 auto-backgrounding applies to MCP calls, not the built-in
shell tool.

## Standing consequences

- Contract words "synchronous" and "blocking" for the executor spawn are stale everywhere they
  survive; the twins and executor.md were corrected with this record's commit.
- The one-executor-at-a-time discipline is now a CONTRACT rule only — the platform no longer
  enforces it by blocking. The twins carry it explicitly.
- Cost of the wait is unchanged: an idle agent generates nothing, exactly like a blocked one.

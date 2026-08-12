Identity extract — AI4DEV-82 audit gate, reader two (flash)

Session ID: ses_008bbc7cbffeAU3fRXJFCpzzzr
Agent: reviewer-flash
Provider: opencode-go
Model: deepseek-v4-flash
Variant: max
Version: opencode 1.18.16
Directory: C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\agent-aacbb10d5c85b1114
Created: 1786559871028 (2026-08-12T18:37:51.028Z)
Updated: 1786560332039 (2026-08-12T18:38:52.039Z)

Match against pin: providerID (opencode-go) + "/" + modelID (deepseek-v4-flash) == opencode-go/deepseek-v4-flash — MATCH.
Agent == reviewer-flash — MATCH.
Every assistant message in the session carries agent=reviewer-flash, providerID=opencode-go, modelID=deepseek-v4-flash, variant=max (confirmed by scanning message.info.model/agent fields in the export).

Cage: all 42 tool calls in the session are read-only (glob, read, grep). No write, edit, patch, bash, task or webfetch event observed. See audit-flash-toolcalls.md for the full list.

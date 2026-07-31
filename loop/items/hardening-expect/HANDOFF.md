# HANDOFF — paused 2026-07-31, mid-item

Read `brief.md`, then `rulings-01.md`, then `plan.md`, then `gate1-critique.txt`.
Those four files are the complete state; nothing important lives only in a session.

## Where this item stands

Item: **hardening-1 of 3** — expected-state manifest + `at:verify --expect`.
Branch `nirdrang/at-verify-expect`, worktree `C:\Users\nirdr\Downloads\ai4good-expect`,
based on `origin/main` (`ff5f350`). No Linear id yet — Linear was down; filing the board
item and naming it in the PR body is a named deferral, and merge-checklist box 8 covers it.

Loop position: **Gate 1 complete, executor triaging, orchestrator checkpoint NOT yet
reached. No implementation code has been written and none may be until the checkpoint
approves the amended plan.**

- `859f61d` — the execution plan (the only commit on the branch beyond main).
- Gate 1 ran codex `gpt-5.6-terra` @ `xhigh`: **2 blockers, 3 important, 2 minor.**
- The executor was resumed to triage; it folds what the contract already decides and
  escalates the rest. If that subagent is gone, a fresh executor rehydrates from the four
  files above — that is the respawn exception, and it is survivable by design.

## The two blockers awaiting an orchestrator ruling

**G1-F1 — D4a is still a placeholder.** R1 already decided the requirement (every
non-zero exit must be fully accounted for by the declaration); the plan has not yet
specified it. Inside the contract to specify — EXCEPT codex claims the installed JSON
reporter does not serialize unhandled errors, which would make full accounting impossible
without new machinery that D7's scope boundary forbids. The executor was told to verify
that claim against the reporter's real output before proposing, and to say what is
achievable in scope, what gap remains, and whether to close it here or file it.

**G1-F2 — D3's substring rule is unsound.** A free substring cannot establish that a red
has its *declared cause*: codex's example, a fixture-reset failure still matching
"H3 fault injection", is convincing. Its fix wants a structured capability code emitted
before redaction — which touches `capabilities.ts`, forbidden by D7. Genuine judgment
call. Options to weigh: an anchored/tightened match that stays inside D7; a minimal
capability-code change that breaches D7 deliberately and says so; or something better.

**G1-F3** (a manifest edit can launder a regression into an expected red) may be
governance rather than code — decide item-scope versus filed follow-up.
**G1-F4/F5/F6/F7** (`--wired` precedence vs D5; the PowerShell glob in the typecheck
command; two README duties from R4/R5; type-only import of `IdRow`) read as inside the
contract, but the executor makes that call, not the orchestrator.

## Everything else, project-wide

**Merged today:** PR #3 (AI4DEV-18 — fixture worlds + controlled clock), PR #4 (the
`/item-loop` skill), PR #5 (per-gate reviewer pins: terra @ xhigh at Gate 1, luna @ xhigh
at Gate 2, Kimi alongside luna). Post-merge checks green on main each time: tsc clean, 42
harness selftests, 12 ids in bijection, REQ-016 at the declared 8 green / 4 red.

**Linear is disconnected.** The API-key route is set up but needs a session restart
(`setx` only affects future processes; MCP configs load at startup). After restarting,
verify the tools resolve, then file: AI4DEV-18's closure confirmation, an item for the
skill, one for the model pins, one for this hardening item, one for CI-on-PR-head, and
link AI4DEV-24. **Rotate the Linear API key** — it was pasted into a session transcript.

**Next after this item:** hardening-2 (CI running the verify suite on the PR head) and
hardening-3 (AI4DEV-24, `tests/at` invisible to tsc). All three must land before
autonomous merge switches on; until then the loop ends at "ready to merge" + a founder ping.

**Open worktrees:** `ai4good-ai4dev-18` and `ai4good-item-loop-skill` have served their
purpose and can be removed; `ai4good-expect` is this item; `design-track` belongs to the
design session, never touched.

**One loop improvement found and not yet made:** `/item-loop` loaded stale from the shared
folder (three commits behind), serving the superseded model pins. Housekeeping should
verify the skill's own checkout is current — the base-drift failure applied to the process
itself. Deliberately kept out of this item's scope; propose as its own change.

# PHASE-STATE — AI4DEV-60 (session expiry, refresh, password reset)

**Phase just completed: FIX AND GOAL** (sitting 3, `orchestrator` on fable, claude-fable-5 @
xhigh). This file rides in the head that completes the phase; the conductor verifies the
reported head against the remote.

## What exists at this head

- `loop/items/AI4DEV-60/gate2-rulings.md` — seven rulings on the two draft-code readers'
  findings (terra 6, flash 3; two converged pairs each ruled once; zero rejections; the one
  verify-first claim settled by reading the pre-refactor file in history, evidence quoted).
  Pushed BEFORE any fix, at `3d07f97`.
- `loop/items/AI4DEV-60/fix-rulings.md` — four rulings on the live measurements that
  contradicted the plan's written expectations; all accepted, plan re-pinned. Pushed at
  `7484082`, before the last fix commit.
- `loop/items/AI4DEV-60/plan.md` — amended a THIRD time (the gate-2 rulings) and a FOURTH
  (the measurement re-pins); the header lists all four amendments.
- The fixes, all seven gate-2 rulings implemented and verified in the tree by this sitting:
  `f9e5791` (record-only), `fe0beb9` (oracle fixes), and `ef553c1` (the mirror-6 logout-scope
  clause, fix-rulings ruling 3). The gate-2 ruling 2 removal condition was checked before the
  removal and both halves passed (recorded in the executor's report and re-verified here).
- Steps 4–6 of the plan, RUN: `0f96f05` (stack), `fce1dc7` (the live proof — 7 checks, 7
  passed, including the transient-expiry phase, with `supabase/config.toml` verified
  unchanged), `36f7e83` (the final verify surface). Evidence: `stack-up.txt`,
  `proof-local.ts` + `proof-local.txt`, `verify-final.txt`.
- Both gate-2 readers' FULL evidence committed at `3d07f97`: raw critiques, distillates, the
  opencode reader's tool-call summary and identity extract, and the codex stderr/stdout logs.
- `loop/items/AI4DEV-60/audit-prompt-luna.txt` and `audit-prompt-flash.txt` — the two
  assembled audit briefs, identical content, one file per seat, neither naming the other.

## Verify state, confirmed FIRST-HAND by this sitting at this head

`bun run at:verify req-001 --tier loop --expect` → **13 green / 24 red / 0 missing, exact
declaration match, exit 0**. `bun run at:verify req-016 --tier loop --expect` → **11 green /
1 red, exact match, exit 0**. `bun run typecheck` → both configs clean. The executor's ladder
additionally showed `at:selftest` at 264 tests green and `at:check` in bijection for both
requirements; the goal ledger from the plan (13/24) is met with no adjustment — no ruling
changed the expected colours.

## What completes the next phase (THE AUDIT)

A PANEL OF TWO, per the pins in `.claude/skills/work/reviewers.md` (audit section): reader
one gpt-5.6-luna via codex, effort max, sandbox read-only; reader two
opencode-go/deepseek-v4-flash, variant max, agent reviewer-flash, clean session. Each is
launched by its own reviewer-runner — never by any other role — and each is blind to the
other. Subject: the branch diff AND the record that describes it, at the head THIS FILE rides
in (the sitting's reported close head, which the conductor verifies against the remote).
Prompt files: `audit-prompt-luna.txt` for the codex seat, `audit-prompt-flash.txt` for the
opencode seat. The fix diff reaches code (test bodies, the fixture, comments in shipped
files), so the audit is required; the one-slice proportionality decision is unchanged.

The phase is complete when BOTH runners report LANDED with distillates in
`loop/items/AI4DEV-60/artifacts/`. CLEAN MEANS BOTH SEATS CLEAN — then the merge sitting
absorbs the audit's wait and records both verdicts among its dispositions. Findings from
EITHER seat spawn the audit sitting, which rules on BOTH seats' findings. The once-per-item
re-run, if fixes change code, is of the WHOLE panel at the new head, never one seat.

## Item facts the next sitting needs

- Branch `nirdrang/ai4dev-60-sessions-automatic-refresh-and-password-reset-d2l2`; PR #50 open.
- Verify command pinned: `bun run at:verify req-001 --tier loop --expect` (goal 13/24, met);
  req-016 pinned at 11/1, unchanged.
- Nineteen adopted rulings exist across four rulings files (gate1 5, draft 3, gate2 7, fix
  4) — the audit briefs enumerate the boxes.
- The audit runners' `*.stderr.log` outputs in `artifacts/` need `git add -f` past the
  `.gitignore` `*.log` rule (standing precedent).
- THE LOCAL SUPABASE STACK IS UP on this machine with the checked-in configuration restored
  (`jwt_expiry = 3600`); no functions-serve process is running. Nothing downstream needs the
  stack; it was left up deliberately rather than risk a teardown side effect at close. Two
  OTHER stacks (`ai4good-slot-1`, `ai4good-slot-2`) belong to another session — never touch.
- PROCESS NOTE for the coordinator to fold: a background-resumed executor cannot address its
  parent — it tried the type name "orchestrator", which is unreachable, and its completion
  report landed on `main`. Cause: SendMessage resumes a child in the BACKGROUND, so the
  parent's synchronous return channel is gone, and this sitting never knew its own agent id
  to hand over. Remedy next time: keep executor follow-ups synchronous (a fresh Agent call)
  or put the parent's agent id in the resume message when one exists.

## Open questions for the founder

None. All four live-measurement re-pins are vendor facts inside the leaf's own scope; nothing
contradicts ratified text and nothing grew the scope.

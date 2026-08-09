# PHASE-STATE — AI4DEV-60 (session expiry, refresh, password reset)

**Phase just completed: PLAN** (sitting 1, `orchestrator` on fable, claude-fable-5 @ xhigh).
This file rides in the head that completes the phase; the conductor verifies the reported head
against the remote.

## What exists at this head

- `loop/items/AI4DEV-60/plan.md` — the plan: eight decisions (D-A through D-I), seven steps
  each with a done-criterion, the per-id expected verification table, and the risk list.
- `loop/items/AI4DEV-60/gate1-prompt.txt` — the assembled gate-1 prompt (contract + plan
  section + item additions), ready for the reviewer-runner.
- `loop/items/AI4DEV-60/pr-body.md` — the pull-request body a mechanical opens the PR with
  (the mechanical is spawned by this sitting after the close push; the PR number will be in
  the sitting's completion report).

## What completes the next phase (GATE 1)

One reviewer, sol via codex, per the pins in `.claude/skills/work/reviewers.md` — launched by
a reviewer-runner, never by any other role. Its subject is `loop/items/AI4DEV-60/plan.md` at
this head, prompt file `loop/items/AI4DEV-60/gate1-prompt.txt`. The phase is complete when the
runner reports LANDED with its distillate in `loop/items/AI4DEV-60/artifacts/`. The DRAFT
sitting then rules on every finding, amends the plan, and pushes rulings before any code.

## Item facts the next sitting needs

- Branch: `nirdrang/ai4dev-60-sessions-automatic-refresh-and-password-reset-d2l2`, created
  from origin/main at `c11e352`.
- The item owns AT-001.12, .13, .14, .38; two RETIRED ids bound the assertions (AT-001.15
  reset-link semantics, AT-001.11 verification-link semantics — acceptance file lines 30 and
  22).
- Proportionality, derived: the planned diff reaches code (`supabase/`, `tests/`), so the
  draft-code gate runs — two readers, one slice (plan D-H).
- The plan ships ONE shipped-code change (the pure caller-judgment module) and no migration.
- Verify command pinned: `bun run at:verify req-001 --tier loop --expect` (baseline 9 green /
  28 red; after this item 13 green / 24 red).

## Open questions for the founder

None. Nothing contradicts ratified text; the scope is the manifest leaf as written.

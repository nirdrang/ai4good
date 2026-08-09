# PHASE-STATE — AI4DEV-60 (session expiry, refresh, password reset)

**Phase just completed: AUDIT** (sitting 4, `orchestrator` on fable, claude-fable-5 @ xhigh).
This file rides in the head that completes the phase; the conductor verifies the reported head
against the remote.

## What exists at this head

- `loop/items/AI4DEV-60/audit-rulings.md` — six rulings on the two-seat audit panel (luna via
  codex 3, flash via opencode 3), every claim verified first-hand, ALL SIX ACCEPTED. All are
  the "stated fact untrue" class; every remedy is the record changing to match the code and
  the measurements. Both seats' box verdicts are recorded in the file, including flash's
  clean identity extract (19 of 19 messages on the pin).
- The panel's full evidence, committed at `ae2bb1f` BEFORE any fix: both raw outputs, both
  distillates, the opencode seat's tool-call summary and identity extract, and the codex
  seat's stderr/stdout logs (force-added past the `*.log` ignore, standing precedent).
- The fixes, in three commits:
  - `5235740` — record files, applied by the audit sitting itself: the plan header regains
    its missing second amendment (ruling 1), `pr-body.md` states the item's real phase
    (ruling 3), `verify-final.txt` compares against the recorded baseline — 257 tests in 10
    files — with the correction marked as made at the audit sitting (ruling 4).
  - `f8ba7e3` — code comments, applied by the executor (opus, one invocation, no dispute):
    the two sites claiming Auth answers 401 now carry the measured 403 (ruling 2), mirror 5
    carries the re-pinned unchanged-session-set predicate (ruling 5), the reset-retention
    comment quotes the acceptance line exactly (ruling 6). Comment-only — 3 files, 15
    insertions, 9 deletions, every changed line inside a comment (diff read by the
    orchestrator).
- The scope box seat two could not verify (no git in its cage) is resolved **PASS** by this
  sitting's own enumeration: every changed path since merge-base `c11e352` is inside the
  declared surfaces; nothing under `src/`, `.taskmaster/`, `loop/decomp/`;
  `supabase/config.toml` absent from the diff. Recorded in `audit-rulings.md`.
- Pull request #50's live body republished by a mechanical from `pr-body.md` as handed;
  verified: current status present, "plan phase" gone, no item id other than this branch's own.

## Verify state, confirmed FIRST-HAND by this sitting after the fixes

`bun run at:verify req-001 --tier loop --expect` → **13 green / 24 red / 0 missing, exact
declaration match, exit 0**. `bun run at:verify req-016 --tier loop --expect` → **11 green /
1 red, exact match, exit 0**. The executor's ladder at the same tree additionally showed
`typecheck` clean (both configs) and `at:selftest` at 264 tests in 11 files, no flake, no
re-run.

## The audit does NOT re-run for these fixes — recorded judgment

The six fixes change comment text and record files only; zero executable statements moved,
re-established by the full ladder above. Every new sentence is the one the panel's own finding
dictated, quoted beside its ruling in `audit-rulings.md`. The conductor's directive for this
sitting derived the same next phase. The whole reasoning is in `audit-rulings.md` under "Why
the panel does NOT re-run for these fixes"; the merge sitting can audit the six fixes against
that file.

## What completes the next phase (CI, then THE MERGE)

The conductor arms the CI watch on the head this sitting's completion report names — the
FINAL head, after all audit fixes; never a prior one. When the required check is green on
that exact SHA, the conductor spawns the MERGE sitting directly — no separate audit-wait
sitting exists, because this sitting ruled the audit. The merge sitting records both audit
seats' verdicts among its dispositions (they are ruled and recorded in `audit-rulings.md`),
writes the merge ruling pinned to the exact head, and hands the merge to a mechanical. If CI
is red, the merge sitting classifies before reacting, per the orchestrator contract.

## Item facts the next sitting needs

- Branch `nirdrang/ai4dev-60-sessions-automatic-refresh-and-password-reset-d2l2`; PR #50
  open, body current.
- Verify command pinned: `bun run at:verify req-001 --tier loop --expect` (13/24 exact);
  req-016 pinned at 11/1, unchanged.
- Twenty-five adopted rulings across five files: gate1 5, draft 3, gate2 7, fix 4, audit 6.
  Zero rejections anywhere in the item; no maintained reviewer disagreement exists, so the
  merge ruling carries none verbatim.
- THE LOCAL SUPABASE STACK IS STILL UP on this machine with the checked-in configuration
  (`jwt_expiry = 3600`); nothing downstream needs it. Two OTHER stacks (`ai4good-slot-1`,
  `ai4good-slot-2`) belong to another session — never touch.
- System observation, no ruling: the codex seat's belt-and-braces SendMessage to the
  conductor's agent id DELIVERED this time (resumed the conductor from transcript), unlike
  the earlier sittings of this item where the same send was rejected. Neither outcome is the
  rule.

## Open questions for the founder

None. All six audit findings are record drift inside the leaf's own scope; nothing contradicts
ratified text and nothing grew the scope.

# AI4DEV-19 (planted markers, forced failures) — reflection on `/work`, before the merge decision

**Item agent model: FABLE** (third agent on the item; both predecessors died of environment
causes, not defects — an expired login mid-Gate-2, then the weekly usage limit — and everything
they pushed survived, which is the push-at-boundaries rule paying for itself twice).

This item finished under the shape it started under (brief + Gate 0 + design; the way of work
moved to one-plan/no-brief on main mid-item). Its artifacts are valid history for that shape and
were not retrofitted. The findings below are about what the machinery did under real strain: a
three-agent relay across two deaths, two reviewer-session resumes, and a confirmation recovered
from a vendor's own session store.

## What worked as intended

- **Push at every phase boundary.** The only reason a three-agent relay was possible at all.
  Nothing produced by the first two agents was lost; the third derived everything else.
- **Capture-only-after-the-final-commit** (this item's own round-2 process rule) held for the
  fix round and removed the churn it was written against: one code commit, one proofs commit,
  nothing edited after capture.
- **Liveness by the reviewer's own artifacts, not process lists or output files.** The platform
  task buffer for a healthy executor read zero bytes for its whole run while the worktree showed
  a landed commit and a live temporary edit; the terra rollout's growth was the honest signal
  for the reviewer. Both matched the rule the skill already carries.
- **Judgment/typing separation.** The opus executor challenged nothing this round and delivered
  execution evidence beyond the brief's ask (it re-ran the deleted-restart falsification against
  the PRE-fix head to prove the residual was real, not just derived). The brief-with-decisions
  shape produced exactly one file changed.

## What needed rules that did not exist (proposed skill amendments, for the coordinator to fold)

The skill copy on this branch is six commits stale — main rewrote the exact sections these
amendments target (the plan-not-brief rework) — so folding them here would mis-merge the
rulebook. They are stated fold-ready instead; **the coordinator folds them into main's live
copy**, which is the skill's own channel for a finding that cannot ride safely.

1. **A resume that does not pin its model is a different reviewer.** The predecessor resumed the
   terra raiser session for confirmation without `-c model=...`; codex took the launcher's
   default and the "terra confirmation" was answered by sol under `danger-full-access`, with
   nothing in the output naming the model that wrote it. Proposed sentence for the resume
   bullet: *"Resume with the model, effort and sandbox pinned explicitly — an unpinned resume
   inherits the launcher's defaults, and the transcript will not tell you a different model
   answered. Verify the pins in the run header before trusting the output."*
2. **A lost reviewer output is recoverable from the vendor's session store — check before
   re-running.** Terra's completed confirmation outlived its dead launcher inside
   `~/.codex/sessions/<date>/rollout-*<session-id>.jsonl` (`task_complete` carries the full
   final message). Re-running would have replaced the raiser's answer with a second derivation.
   Proposed addition to the launch-lessons list: *"If a detached reviewer's output file is lost,
   look for a completed transcript in the vendor's own session store before relaunching — codex
   rollouts carry the final message in their `task_complete` event."*
3. **Committed reviewer prompts must not embed the launcher's worktree path as the code
   location.** Twice on this item a committed prompt pointed reviewers at a worktree that died
   with its agent. The launch line owns the root; the committed prompt should name paths
   relative to it (or be re-aimed, as this round did, before any reuse).
4. **Kimi resumes only in the directory that created the session.** `kimi -S <id>` from
   anywhere else refuses ("created under a different directory") — the likely cause of the
   predecessor's exit-199 zero-byte gate, along with the nonexistent `-r` flag its handoff
   carried (`-S` is the documented one; `-r` appears only in kimi's own error text as the
   resume-in-place form). When the directory is dead, the working fallback — proven on this
   item — is an empty placeholder directory recreated at that path purely to satisfy the check,
   a prompt that forbids relative operations and points every read at the live worktree by
   absolute path, and deletion of the placeholder after the run. Kimi resumed, re-ran the
   conformance suite and the `--expect` gate in the live worktree, confirmed all five findings,
   and exited 0.
5. **A fresh platform worktree cannot `bun run typecheck` until `bun install --frozen-lockfile`
   runs** — `bunx vitest` masks it by working anyway. One sentence in the worktree bring-up
   notes saves the next agent the misdiagnosis.

## What a rule forced that turned out wrong, or nearly

- **"This is the last fix round" (rulings-04) versus the confirmation cap.** The predecessor's
  sentence closed its executor-challenge round; the raiser's confirmation then surfaced a real
  residual with a two-line fix. The standing cap (two fix→confirm cycles on the post-fix diff)
  is the correct budget and was unspent — but the two rules sat side by side reading like a
  contradiction, and an agent optimizing for obedience over purpose would have ruled a fixable
  false-green-family residual "terminal" while knowing the fix. The cap language should say
  plainly that a pre-confirmation round budget and the post-confirmation cycle budget are
  separate things.
- **Ride-along versus a stale rulebook copy.** The ride-along rule assumes the branch's copy of
  the machinery is current enough to edit. Six commits behind, on a file main actively rewrote,
  the honest options were a conflicted merge or a hand-reconciled rulebook inside an item PR —
  both worse than handing four sentences to the coordinator. The rule could name this boundary:
  *"a machinery fix rides along only when the branch's copy is current enough that the edit
  merges clean; otherwise it goes to the coordinator with the reflection."*

## Reported upward, not built (independent work, filed)

- The whole `tests/at` tree fails `prettier --check` (36 files, quote style) because
  `.prettierrc` wants double quotes and the tree is single-quoted throughout; `bun run lint`
  fails wholesale today. CI runs no lint step yet, so nothing is red — but the day a lint step
  is wired into CI, it goes red for reasons unrelated to any item. Whoever owns that decision
  should either flip `singleQuote` for the AT tree or run one mechanical reformat as its own
  change.

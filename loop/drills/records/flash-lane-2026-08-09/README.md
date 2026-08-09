# The Flash lane trials — 2026-08-09

The evidence behind the founder ruling of 2026-08-09 that seated `opencode-go/deepseek-v4-flash`
as the second reader on the draft-code gate and on the audit. Three trials ran, all against real
project material with graded ground truth, launched detached through the opencode CLI.

**A precise note on the cage, because it has two versions.** The trials ran under a `reviewer-flash`
agent whose write tools were set false by name; that it stayed read-only is proven by the tool-call
summary (only read/glob/grep ever fired), not merely asserted. The agent file committed at
`.opencode/agent/reviewer-flash.md` then STRENGTHENED that to a deny-all-`"*": false`-then-allow
cage in response to the first review — so the committed cage is stricter than the one the trials
used, and the trials validate the model's behaviour and the read-only outcome, not the final cage's
exact syntax. Separately, the saved `audit-trial-prompt.txt` names a read-only sandbox in its prose
because it was assembled before the cage rename; that is prompt wording, independent of the agent
cage. None of these three is the same thing, and earlier drafts of this file blurred them.

## Trial 1 — the code gate, against the graded Kimi review

Subject: the AI4DEV-24 gate-2 tree at `d3b1bca` (the typecheck-coverage item), the exact commit
the recorded Kimi review read, with the orchestrator's rulings as the grading key — nothing Kimi
raised there was refuted, so its findings are true positives by record.

Result: flash found Kimi's two substantive findings (escalating one), declined the pre-existing
one on scope grounds, and could not reach the merge-base finding because the trial harness handed
it a precomputed diff. Zero false positives. Citation accuracy beat the incumbent: flash's
`registry.ts:535` was exact where the recorded review cited line 1756 in a 576-line file.

**This trial is the weakest-evidenced of the three, on two counts, and the code seat rests on it.**
First, **the raw output did not survive** — it lived in a scratch worktree deleted before the
ruling to commit evidence was made; the findings survive only as quotes in the coordinator
transcript of 2026-08-09, so the code seat cannot be independently regraded from this directory.
Second, **flash was handed a precomputed diff**, so the trial never exercised the production
requirement that a reviewer discover the branch diff and merge base from the tree itself. The audit
seat (trial 3) has neither weakness. The founder seated both knowing this; it is recorded here so a
later reader does not mistake the two seats for equally proven. Re-running this trial with preserved
output and tree-discovered scope is the open follow-up.

## Trial 2 — executors (context for what flash is NOT seated as)

Flash and an opus executor were each handed the same two tasks. On the well-specified one both
went green and flash's diff was byte-identical to the shipped reference. On the hard one —
closing the world-invention seam — both reported success with green gates, but an independently
written intersection exploit compiled clean against flash's fix and was rejected by the opus one.
A confident false green with both gates green. **Flash is a reviewer seat, not an executor.**

## Trial 3 — the audit, graded against the recorded AI4DEV-31 audit

Subject: the AI4DEV-31 record at its audited head `5cf7136`, under the current read-only audit
contract. Files here:

- `audit-trial-prompt.txt` — the assembled prompt (shared contract + audit section, pins excluded)
- `audit-trial-item-additions.txt` — the item additions
- `audit-trial-findings.txt` — flash's verdict, `AUDIT: 2 FINDINGS`
- `audit-trial-toolcalls.txt` — the read-only proof: every tool call reduced to tool·target·state
  (read×52, glob×4, grep×6 — nothing else). The raw stream is NOT committed, because it embeds the
  full text of every file read; the summary carries the proof without the contents.
- `audit-trial-identity.txt` — per-message identity from `opencode export`: agent, model,
  provider, per-message cost

Run: 8.2 minutes, **~$0.029** — the sum of all 36 assistant steps' `cost` fields, which is the
real spend; an earlier report of "$0.0013" was the FINAL step's cost mistaken for the run total,
and is corrected here. (Per-message `tokens.total` cannot simply be summed — each turn resends the
context, so the naive sum ~4.9M double-counts massively; the per-step `cost` is the honest figure.)
`--variant max`, wire-verified as `reasoning_effort: "max"` in the request body during the same
day's baseURL capture probe. opencode 1.18.15. The saved `audit-trial-prompt.txt` predates this
change and so still names a read-only sandbox rather than the agent cage — the trial genuinely ran
under that wording; the cage is the change the trial justified, not what the trial used.

Graded result: **both findings real and independently verified** — the gate-2 confirmation in the
record quotes probe text that had since been corrected (staleness the item class exists to
catch), and the final verification transcript pins no commit while its recorded diagnostics sit
at a uniform +2 line offset at head. Neither is in the recorded audit. **One miss:** the recorded
audit's single finding (`executor-brief.md:171`, the eight-alias instruction that excludes
`World`), findable by reading. Zero false positives.

Union over the incumbent in both directions is the panel argument, and it is why the ruling
seated flash BESIDE luna, not instead of it.

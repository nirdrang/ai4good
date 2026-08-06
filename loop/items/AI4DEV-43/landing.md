# AI4DEV-43 (phased relay, per-role contracts) — the landing record

What went onto disk, why each file is where it is, and what was corrected on the way in.

## The shape that landed

One `/work` skill addressed to three audiences at once became a coordinator manual plus one
contract per role. Seven roles:

| role | model | contract | owns |
|---|---|---|---|
| coordinator | fable @ xhigh (the founder's own session) | `.claude/skills/work/SKILL.md` | the board · the founder channel · everything destructive |
| conductor | sonnet | `.claude/agents/conductor.md` | the item's ONE worktree and its clock · narration. Rules on nothing |
| orchestrator | fable @ xhigh | `.claude/agents/orchestrator.md` | ALL judgment — plan, every ruling, the merge decision |
| orchestrator (fallback) | opus @ max | `.claude/agents/orchestrator-opus.md` | same role, same body; used only when fable is out of credit |
| executor | opus | `.claude/agents/executor.md` | the code, and running verify |
| mechanical | sonnet | `.claude/agents/mechanical.md` | publish · merge execution · evidence capture |
| distiller | sonnet | `.claude/agents/distiller.md` | one raw critique → findings only |
| reviewers | codex sol/terra/luna · Kimi k3 | `.claude/skills/work/reviewers.md` | critique. External processes, stateless, read-only |

**Why the split across two directories.** The six agent contracts are in `.claude/agents/`
because that is where the platform resolves spawnable agent types *and their effort pins* — the
frontmatter `effort` key is the only way to set reasoning effort, since the Agent tool has no
effort parameter. That is also the entire reason the orchestrator needs two files rather than one
with a model override. Everything that is read rather than spawned — the coordinator manual, the
workflow, the shared invariants, the reviewer prompt base, the lessons — sits in
`.claude/skills/work/`.

**The coordinator has no definition file, by construction.** It is the founder's own session,
entered by typing `/work`, so a skill is exactly the right container and an agent definition would
be a file nothing could ever spawn.

## The record of the flow

`.claude/skills/work/WORKFLOW.md` is the reference sequence: one item end to end, every step
labelled with the role that acts. Where it and a contract disagree, the workflow describes the
intent and the contract describes the obligation. `shared-invariants.md` outranks both.

## Corrections applied on the way in

The drafts were reviewed twice before landing. Blocking findings, all fixed:

1. **A false correction was withdrawn.** The draft manifest claimed nothing in `.gitignore`
   matches `.claude/` or `loop/out/`, and proposed dropping the force-add rule. Verified false with
   `git check-ignore -v`: line 45 ignores `.claude/`, line 53 ignores `loop/out/`. Already-tracked
   files stay tracked, which is what made the directories look normal. Every new file in this very
   commit needed `git add -f`. The rule now lives in `shared-invariants.md`.
2. **`PHASE-STATE.md` had no home and the close order contradicted the clean-tree rule.** It now
   lives in the tree, is written *before* the closing commit, and never names its own commit — the
   sitting reports the head it pushed and the conductor verifies that against the remote.
3. **The one reviewer-launch snippet was Bash.** It used `<` stdin redirection, which PowerShell
   does not have, and was a plain shell line under a paragraph mandating OS-detached launches. It
   is now the real `Start-Process` form with `-RedirectStandardInput`, the trailing `-` codex needs,
   and `-WorkingDirectory` for Kimi, which has no `-C` flag.
4. **Two loops spanned a wait inside a sitting.** The audit-fix loop and the CI-red-fix loop both
   told an orchestrator to relaunch the auditor. Both now end the sitting; the conductor relaunches
   and a fresh sitting rules. The cap is once per item.
5. **Reflection.** A draft deleted the step with no ruling behind it. Review restored it, because
   the constitution these files write says a loosening may not be inferred. The founder then ruled
   it out explicitly (2026-08-06, *"Reflection should be out"*), so it is gone — recorded as a
   ruling, in `lessons.md` as superseded history.

Smaller ones: a skipped code gate now says what happens next (the fix sitting still runs, with
zero findings); reviewer output is committed into the record instead of dying in the artifacts
directory at sweep; the pull request is opened by a mechanical at the end of the plan sitting so CI
has something to gate; the blind-debugging and flake caps reached the orchestrator contract, not
just the workflow table; `orchestrator-opus.md` carries the full body, verified byte-identical to
its twin from the shared marker onward.

## Rides along

- **`lessons.md` surgery.** The sandbox denial is geometry-independent, not caused by worktree
  nesting (measured in three geometries). Two paraphrases printed as quotations were replaced with
  what the founder actually typed. The read-only-audit sentence and the reviewer-re-engagement
  sentence, both contradicted by ratified rulings, were rewritten. The audit's measured execution
  record was added so the narrowing is not re-litigated from memory. Reflection marked superseded.
- **`CLAUDE.md`.** The way-of-work section collapsed to a pointer table; the H5 quote and the
  shorthand-instruction date corrected against the transcripts; a new MUST-FOLLOW block on writing
  about what the founder said (quote exactly, cite a date only where a message exists in the
  founder's local time, never convert "asked" into "ruled", and a loosening needs a real ruling).
- **Encoding repair, same file.** `CLAUDE.md` carried 35 mojibake sequences from an earlier write
  with the wrong encoding — 22 em-dashes, 11 arrows, 2 ellipses rendered as `â€"` and `â†'`. In a
  file every agent loads, that is corruption in the MUST-FOLLOW rules themselves. Repaired, and
  the file re-verified clean. The cause is worth naming: PowerShell 5.1's `Get-Content` reads a
  BOM-less UTF-8 file as ANSI, and `Set-Content` writes ANSI back — the same trap produced a
  corrupted `orchestrator-opus.md` during this landing, caught by a byte check and redone with
  explicit UTF-8.
- **`loop/out/way-of-work.md`** carries a superseded banner: the one-verb design and derived
  attribution still hold; how an item is *run* is now the workflow file's job.

## The merge with main, and four fixes that would have been lost

While this branch was being built, `AI4DEV-20 (judging AI output meaning)` merged — and it carried
**four fixes to the old `SKILL.md`**, the one file this fold replaces wholesale. Resolving the
conflict by keeping the new version would have deleted all four silently. Each was re-homed into
the structure that now owns it:

1. **A spawn prompt must not carry process instructions.** One told an item to queue auto-merge at
   pull-request time, which would have merged it before a single gate ran; Gate 1 caught it on the
   plan. The new coordinator manual already forbade process in a spawn prompt — it now carries the
   evidence, and the story is in `lessons.md`. Nothing reviews a spawn prompt, so a process
   instruction hidden in one is an unratified process change.
2. **The tracked-child notification has MISSED in practice** — arriving minutes late or never,
   twice on one item, and a child that cannot resolve its parent's name reports to the coordinator
   instead, leaving the parent asleep through its own child finishing. This one **contradicted the
   new design**: the conductor's contract called the tether "your primary signal and it is free"
   and armed nothing for a sitting. The relay's entire flow depends on the conductor waking when a
   sitting ends, so a missed event is a silent stall. The conductor now arms a backstop watch on
   the remote tip moving off the head it holds, and the contract says plainly that the push is the
   channel of record and the notification a bonus.
3. **A read-intended reviewer once wrote probe files into the tree.** `reviewers.md` no longer
   asserts "you have no write access" as a fact — it names `--sandbox read-only` as the
   enforcement and carries an explicit NO WRITES instruction, with the rule that a claim only
   settleable by writing is a verify-first finding for the executor. The conductor is told not to
   drop that sentence when assembling an item's prompt file.
4. **codex takes its sandbox pin as `-c sandbox_mode=…` on a resume**, not the launch flag. Folded
   into the resume-mechanics history in `lessons.md`, since reviewers are now stateless and a
   resume is only ever a recovery tool.

Worth recording as a process observation: the fold was reviewed twice and the merge conflict is
what surfaced these. A wholesale file replacement is the one change shape where `git` cannot warn
you that you are discarding someone's work — the conflict marker says "two versions", not "four
rules are about to vanish."

## Still open

Two ratification calls, deliberately left to the founder rather than assumed:

- **Five sittings, not four.** The design session settled plan / build / dispose / merge; the fold
  splits build into draft and fix-and-goal and gives the audit its own sitting.
- **The draft is deliberately not run to green** before the code gate, so reviewers critique
  unpolished code.

Neither blocks the landing — both are recorded here so the files and the design record agree.

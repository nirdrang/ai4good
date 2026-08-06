# `/work` — the lessons behind the rules

Companion to `SKILL.md`. The core carries the rules; this file carries what they cost to learn.
Read it when a rule seems wrong, is being challenged, or a reviewer asks why a constraint
exists — not routinely. **When a ruling here names a founder decision with a date, that
citation is the provenance; do not re-litigate a ruling without new evidence.**

## Why attribution derives from the branch

Every attribution failure this project had was one shape: a declared fact drifted from a real
one, and nothing could detect the gap — a binding file said one item while the branch carried
another, and every message stamped against the wrong work. The branch is coupled to closure
(its PR closes the item), so deriving from it makes a wrong answer surface as a wrong closure
on the board instead of hiding. The held item became a cross-check precisely because a stale
one should make the stamp louder, never wronger — the exact inverse of the binding file it
replaced.

## The agent never moves itself — the AI4DEV-24 failure

A session that only *ordered* a worktree was still sitting in the old folder; another session
overwrote its binding mid-item, and every message stamped wrong. Worse: if a session-moving
tool silently fails, the session sits in `main` believing it is elsewhere. Hence: born in a
worktree or opened there by the founder; never teleported.

## The root check tests the ROOT, not the item

A harness item had a parent, so the "does it have a parent" check passed — and nobody ever
asked what the parent itself rolled up to. One unasked question propagated silently down a
subtree of eight items, until the founder read a stamp and asked what was above it. The check
was rewritten to walk to the root first and ask about the root.

## Floating roots — the founder's ruling over my objection

I argued a free-text root should create a real board item. The founder overruled (2026-08-02):
*"No - a floating label is fine the main goal of this is to have our attribution log something
we can chew on for attribution cadence and monitoring it can be floating and not actual on pm
board."* A grouping useful for that does not need a board item behind it. The tilde notation,
root-only legality,
real-parent-wins, and the `attr:` label all exist to guarantee a floating root is never
mistaken for a verified one.

## Parallel agents — what the testing proved and broke

- A **resumed agent whose worktree was deleted** silently fell back to the main checkout,
  created a branch there and switched the live folder. Hence: never resume a FINISHED agent.
- **`EnterWorktree` into a hand-made worktree** reported success and then every command was
  refused — the isolation guard bricks the shell. Worktrees are the platform's to create.
- A child subagent reported the identical directory and branch as its parent and read a file
  the parent had just written — inheritance is real and tested.
- The first fable item agent died mid-item with nothing pushed; its worktree evaporated with
  every artifact. "Push before finishing" was too weak — the rule became push at every phase
  boundary, and it saved the next three involuntary deaths (expired login, weekly limit,
  session limit), which lost zero work between them.

## The spawn-prompt rule — AI4DEV-31's hardcoded chain

A coordinator spawn prompt contained a literal `Set-Chain … @{id='AI4DEV-3'…}`. It happened to
be right, which is the danger: the agent would have stamped a wrong value just as faithfully
for the life of the item, and no gate reads spawn prompts. The general form: a correction
lives only in a file every session loads; a message to a running agent dies with it.

## Why two orchestrator definition files

The Agent tool has no effort parameter — effort lives in the definition frontmatter and
applies whichever model the caller picks. So two files are required — the founder's instruction,
2026-08-04, was *"You should have 2 different agent files for fable effort xhigh for opus
fallback effort max."* Tested the same day: a probe confirmed the running session
served a stale definition until the watcher caught up — after changing agent definitions,
probe until live before spawning. Also tested: a subagent's resolved effort is UNOBSERVABLE
(no docs mechanism, nothing in transcripts, agents cannot see their own), so effort pins are
documentation-trust config, changed only in reviewed commits. And the first probe round was
invalid because the local checkout was two commits behind — verify the DISK before blaming
the registry.

## Why gates run detached, in the worktree

Two max-effort reviews were killed at the ten-minute foreground ceiling on 2026-08-02, losing
both runs entirely. And reviews once ran against exported diffs in a scratchpad — a habit
mistaken for a limitation that made every gate weaker (the reviewer saw only the lines it was
handed). Proof the worktree works: codex, launched with `-C <worktree>`, read `stamp-hook.ps1`
unprompted and quoted its literal strings back.

## Sol in terra's clothing — pin every resume

A predecessor's terra confirmation was recovered from the session store and looked complete —
its run header showed it had silently run as SOL with full access, because the resume was
unpinned and CLI defaults applied. The confirmation was redone. Corollary: recovered outputs
are verified by run header before being trusted.

## Kimi exit-199 — the directory rule

`kimi -r <id>` from any directory other than the session's creator exits 199 with a zero-byte
file — which reads as a reviewer failure and is a handoff failure. Proven workaround: recreate
the original path as an empty placeholder directory and resume from there.

## "Its completion will bring me back" — the sleep with no alarm

An item agent parked twice believing a detached process's completion would wake it. The
platform notifies only for its own tracked children; a detached codex or Kimi notifies nobody,
ever. Both times a coordinator file-watch caught the landing and sent the wake-up by hand. The
partial-file hazard is real too: a Kimi verdict was sampled mid-write at 4.3KB and finished at
9.4KB — folding a growing file as a final verdict is a false gate.

## One writer in a worktree — two lost audit runs

A mutating subagent stashed a workspace-write auditor's in-flight changes; later a kill hit a
wrapper while the real process kept writing into the tree for eight more minutes. Hence: while
a workspace-write reviewer runs, nothing else mutates the tree, and death is confirmed by
process id.

## The auditor's sandbox boundary

Under codex's workspace-scoped sandbox, vitest's config load walks up the directory tree and is
denied at the workspace boundary (`Cannot read directory "../../../../.."`), so vitest-based
checks fail with access-denied while non-walking commands pass. **This is NOT caused by worktree
nesting**: the same command failed identically in a nested worktree, a sibling worktree and a
sibling clone (measured 2026-08-05), with the number of `..` tracking the depth — it is a walk to
the filesystem root, and any layout hits it. That signature is COULD-NOT-VERIFY-IN-SANDBOX — the
execution evidence comes from the PR's CI run, said plainly. An audit run under `read-only` that
is still *asked to execute* degrades into a documentation review; the read-only audit works only
because its brief assigns execution evidence to the required CI check and confines the auditor to
the claim.

## The audit's execution half was measured, and it does not work

Across four items, the auditor's attempts to run things produced almost nothing but "could not
verify" (AI4DEV-19, AI4DEV-31) and once produced two FAIL verdicts on AI4DEV-5 that were sandbox
artifacts rather than defects — while every reading-and-tracing box it was given came back
answered, every time. That measurement is why the audit is now read-only and scoped to the claim
(founder ruling 2026-08-06), with execution evidence assigned to the required CI check. Recorded
here so the narrowing is not re-litigated from memory.

## Removal rulings carry conditions — the Kimi catch

An item accepted a Gate 1 finding that converting one type bought nothing; the measurement
missed an upcast route, so the ruling was wrong. Kimi caught it at Gate 2 — an error in the
item agent's own earlier ruling, recoverable only because the removal had carried a
verification condition. Removals are the rulings least likely to be re-examined: nothing
downstream fails and the diff gets smaller.

## Why there is no brief and no Gate 0 (founder 2026-08-04)

The brief was the handoff from when planner and orchestrator were different contexts; in
`/work` the item agent IS the planner, so the brief became the orchestrator writing itself a
letter, and Gate 0 a gate invented to review that letter. The first real item ran with three
intent documents of which only the first was reviewed — the one the executor actually followed
was reviewed by nobody. Sol's Gate-0-era record still justified moving its hunt list into
Gate 1: on one real run it caught a test oracle that would have greened while proving nothing,
and a do-nothing implementation that would have passed the whole verification gate.

## The maintained-residual ruling (founder 2026-08-04)

The old rule reserved dismissal of a reviewer's maintained "unearned green" tag for the
founder. Its first real firing arrived with undisputed facts, exhausted fix routes, and both
remedies rejected for written cause across three agent generations — the founder's whole
answer was *"this is a judgement call to the orchestrator"*. The two recording conditions are
what keep the ruling from becoming a swallowed defect.

## Gitignore near-miss

A commit was one step from deleting eight verb skills and adding zero replacements, because the
new skill under gitignored `.claude/` silently did not stage and `git add -A` reported nothing
wrong. Hence: `git add -f`, then confirm the `A` line in `git status --short`.

## Interim mode, and why it ended

It existed because "a hand-interpreted checklist is not a merge licence" — every green claim
was an agent transcribing its own local run. It ended (2026-08-03) when the three named
conditions landed: the expected-state gate, the harness visible to the typechecker, and CI on
the PR head as a required check. The proof it was needed: an item's local runs were green on a
head whose CI failed — a control passed on Windows and failed on Linux. Without the required
check on the pinned head, that false green would have been merge evidence.

## Linear closing verbs — the post-mortem that closed a live item

A merged PR's body read "the instruction that fixed AI4DEV-31's chain" — and Linear closed
that item mid-work, because a closing verb beside an id in PR text acts. Non-closing
references (`towards`, `part of`) still START an item. CI now guards closing references; the
rule lives in CLAUDE.md because the guard should never be where it is first learned.

## Reflection moved before the merge

The reflection was once scheduled after the finish phase — after the merge — so ride-along
fixes were impossible by construction, and an item had to report four real findings with
nowhere to put them. It was moved to while the PR is open.

**Superseded:** the reflection step was removed entirely by founder ruling (2026-08-06,
*"Reflection should be out"*). The way of work improves between items; a process finding
surfaced mid-item still rides along or goes to the coordinator to fold. The placement lesson
stands only as history.

## The four-minute bypass

A one-line rule change once became its own board item, worktree, branch and PR in four minutes
flat, bypassing every gate — while the session was mid-design of the process it bypassed.
Ride-along exists so mechanics can never take that path again.

## Confirmation was dropped (founder 2026-08-05)

The confirmation step — each Gate 2 reviewer re-engaged in its resumed session to approve the
fixes to its own findings — was deleted outright: *"I don't want confirmation drop it out now
and from the skill."* Why it lost its place: it re-checked material already covered three
independent ways (the verify suite proves the fixes run, luna re-executes before merge, the
required CI check gates the pinned head), and its wake choreography was the process's most
fragile part — on the first item it ran, both confirmation launches died silently with their
parent and stalled the item for hours while everyone watched files that would never appear.
Disposition authority was already the item agent's; confirmation had become a fourth check
that mostly manufactured waiting. Reviewers are now stateless — never resumed. A lost output is
re-run at the same pinned commit and said to be a fresh sample, not a reproduction. The resume
mechanics (pinning, run-header verification, session-store recovery, Kimi's directory rule) are
kept here only as history: they explain why statelessness was chosen.

## Token discipline — where the budget actually went (2026-08-04)

Measured on the first two items: item-agent stretches ran 246K–330K tokens and every wake-up
replayed the transcript, so wake-ups — not phases — were the expensive unit; a one-line
plumbing probe cost ~33K because it loads the full definition and project context; a Kimi
review file was 117KB of transcript around ~8KB of verdict, read whole into premium context;
and the skill itself, then ~700 lines, rode into every context of every agent. Those four
observations are the four biggest rules in the core's token-discipline section, and the
reason this file exists separately from it.

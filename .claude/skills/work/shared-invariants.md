# Shared invariants — every role reads this first

This file is the constitution. Each role has its own contract; these rules bind all of them.
Where a contract and this file disagree, this file wins.

## Attribution is derived, never declared

cwd → git worktree → branch → exactly one item id → walk `parent` upward for the chain.
The branch is primary because it is coupled to closure: its pull request closes that item, so a
wrong branch surfaces as a wrong closure on the board instead of hiding.

- A chain handed to you in a spawn prompt is a **hint to verify**, never a fact. No gate reads
  spawn prompts, so a wrong value there would be stamped faithfully for the life of the item.
- Attribution degrades, never blocks. The one thing it blocks is closing a requirement.
- Every id printed to the founder carries a very short title in parentheses — two to five words,
  a recall hint, never the board's full sentence. Strip internal codes and say what the thing is:
  `AI4DEV-21 (fake Stripe, GitHub, Anthropic)`, never `(H5 vendor stand-ins)`.

## The record is the memory

No context survives a phase boundary. Everything the next role needs is on disk and pushed:
`PHASE-STATE.md`, the plan, the rulings, the distilled findings, the pull request.

- **Push at every phase boundary.** Death may be involuntary; the remote is the only durable
  output. This is not insurance — it is how the relay transports work.
- A correction that matters beyond one conversation lives only if written into a file every
  session loads. A message to a running agent dies with it.

## The usage window — the coordinator guards it, and only the coordinator

Anthropic reports how much of each usage window is spent. `statusline.ps1` snapshots those
numbers on every status-line refresh — the status line is the only place Claude Code delivers
them, hooks get a different payload — and `loop/work/window-gauge.ps1` reads the snapshot and
returns `OK`, `HOLD`, `PAUSE` or `UNKNOWN`.

- **The coordinator decides; nothing else may.** Read the gauge on **every** `FLOW` and `PULSE`
  line, and before spawning any conductor. A second thing with authority to halt work is the
  same failure as a second way to close work — and a brake inside an agent is one the founder
  cannot see.
- **`HOLD` means finish, not stop.** Let running sittings complete; start no new one. A sitting
  that cannot finish is worse than one never begun, because the work is abandoned mid-flight
  instead of at a boundary.
- **`PAUSE` means stop at the next boundary.** Ask each running conductor to park — write its
  state, push, and end — and stop it outright only if it does not. Graceful first: an agent
  killed mid-write leaves a record that lies about where the work got to.
- **`UNKNOWN` is not `OK`.** No reading, an unparseable one, or one older than the staleness
  limit all mean the guard is blind. Treat it as `HOLD` and say so out loud; a guard that reads
  its own blindness as all-clear is worse than no guard, because it is trusted.
- **Wait by polling the gauge, never by sleeping a computed duration.** The window is
  authoritative about its own reset; our arithmetic across clocks and time zones is not.
- **Release one item at a time** when the window reopens, re-reading the gauge between each.
  Restarting every parked conductor at once can spend a fresh window before anyone looks.

## Writing about the founder

- **Quote exactly or do not use quote marks.** Typos, missing words and all. Polishing someone's
  words and then presenting them as a quotation is fabrication at small scale.
- **Cite a date only where a message exists on that day**, in the founder's local time
  (transcripts are UTC; the founder is UTC+3, so a 21:00 UTC message is the next day).
- **Never convert "the founder asked" into "the founder ruled."** A question that prompted a good
  rule is provenance for the question, not for the rule.
- **A rule that loosens the process needs a real, explicit founder ruling.** Tightening may be
  proposed; loosening may not be inferred.

## The tree

- One worktree per item, created by the conductor, shared by every role inside that item.
- **One writer at a time.** Only the role currently holding the work writes; everyone else reads.
- A sitting exits with `git status --porcelain` empty. Uncommitted work is invisible to
  reviewers, to CI and to the merge — so if it is not committed, it does not exist.
- Reviewer output never lands inside the tree **while a gate is open**; it goes to the item's
  artifacts directory. The fix and audit sittings then commit the raw critiques and distillates
  into the record — evidence that stays only in the artifacts directory dies with the sweep.

## Committing

- **`.gitignore` ignores ALL of `.claude/` and `loop/out/`** (lines 45 and 53, no negations).
  Already-tracked files there stay tracked — which is why those directories look normal — but a
  NEW file under either path silently does not stage: it needs `git add -f`, then a verified
  `A` line in `git status --short`. A commit once came one step from deleting eight skills
  while adding zero replacements exactly this way. `loop/items/` is NOT ignored and stages
  normally. Platform runtime paths (`worktrees/`, `checkpoints/`, `mailbox/`, the agent
  registry) are excluded via `.git/info/exclude` on purpose and must never be force-added.
- Commits cite the item they belong to.
- **A closing verb beside an item id closes it.** `close`, `fix`, `resolve`, `complete`,
  `implement` and their inflections act when they sit next to an id in a pull request title or
  body — a careful post-mortem once closed a live item mid-work. Write "the instruction that
  repaired X", "motivated by X", or use `ref` / `part of` / `towards`. CI enforces this.

## Never

- Never merge without the required CI check green on the exact head the merge ruling pins.
  Branch protection having `strict` and `enforce_admins` off is a configuration convenience,
  not a licence.
- Never set a board item Done by hand outside a documented repair, and record a repair AS a
  repair.
- Never treat an empty or progress-line-only reviewer output as a clean gate.
- Never judge a detached process's liveness from a process list — measure its own artifacts.
- PowerShell, never Bash. bun, never npm or pnpm.

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
returns `OK`, `PAUSE` or `UNKNOWN`.

- **The coordinator decides; nothing else may.** Read the gauge on **every** `FLOW` and `PULSE`
  line. A second thing with authority to halt work is the same failure as a second way to close
  work — and a brake inside an agent is one the founder cannot see.
- **One line, and it is `PAUSE`** (founder 2026-08-06). There is no lower "start nothing new"
  band. Such a band would have to be justified by what a sitting costs, which nobody has
  measured, so it could only ever be a number that felt safe. Work starts whenever the gauge
  says `OK`.
- **`PAUSE` means stop at the next boundary.** Ask each running conductor to park — write its
  state, push, and end — and stop it outright only if it does not. Graceful first: an agent
  killed mid-write leaves a record that lies about where the work got to.
- **A sitting that meets the line mid-flight parks at its last committed work item.** This is
  why the executor commits one commit per work item: with no reserve band, running out mid-phase
  is an expected outcome rather than a failure, and the commits are what make it cost one work
  item instead of a sitting.
- **`UNKNOWN` reports loudly and does not halt.** No reading, an unparseable one, or one past the
  staleness limit means the instrument is broken, not that the window is spent — and a broken
  instrument is not a reason to stop working, exactly as attribution degrades rather than blocks.
  Say it in the open and fix the sensor; never let it pass silently as `OK`.
- **Parking and continuing — the exact shape.** Ask the running conductors to park, then run
  `loop/work/window-wait.ps1` **as a background command**. Its exit re-invokes this session, so
  the founder continues in the same conversation with its context intact: nothing is resumed,
  nothing restarted, no scheduled task involved. Waiting costs nothing — a parked session makes
  no API calls, which matters because the reason for waiting is that there is no budget.
- **Its exit means "the window should be open", not "you have budget".** The wait is anchored on
  the provider's stated `resets_at`, because the gauge is refreshed by the status line and a
  parked session renders none — during the wait, the number it would poll is frozen. So the
  FIRST TURN AFTER IT EXITS must re-read the gauge (that turn renders the status line, making it
  the first genuinely fresh reading) and park again if it still says `PAUSE`. A reset time that
  has already passed rolls forward, and a session limit is not the same thing as being out of
  credit.
- **Exit 1 is a report to the founder, never a licence to carry on.** It means the blocking
  window is a weekly one, days away — a decision about what to do next, not something to sit
  through.
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
- **A branch belongs to the DIRECTORY, not to the session.** Several sessions can sit in one
  folder, and a branch change there moves all of them mid-turn, silently. So the main worktree
  stays on `main` permanently and is where the coordinator works; every item gets its own folder
  via `git worktree add`, with its own session opened in it. `loop/work/guard-branch-switch.ps1`
  refuses a branch change in the main worktree so this cannot be forgotten mid-task rather than
  merely written down here.
- **Stale-worktree sweep** (founder 2026-08-05). A platform worktree is residue only when its
  lock pid is DEAD, its tree is CLEAN, and its head is FULLY MERGED to main — then unlock,
  remove, and delete the merged remote branch. **Check those three in that order**: a live agent
  or unpushed work must never be swept, and a LIVE lock pid is never touched at all, because
  force-removing a locked worktree is the hazard that breaks a resumed agent.

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

## RE-MEASURE A NEGATIVE WITH A DIFFERENT INSTRUMENT BEFORE BELIEVING IT

A negative result — "the file is empty", "no check exists", "the merge did not succeed", "the
reviewer wrote nothing" — is the cheapest thing in this system to get wrong, because a broken
instrument and a true absence produce identical output. AI4DEV-57 alone produced five:

- a merge that HAD succeeded reported as "no commit SHA exists", because `gh`'s branch cleanup
  failed afterwards and the failure was read as the merge failing;
- a broken `jq` query reporting no CI check for six minutes while it had gone green in 37 seconds;
- a reviewer's output read mid-run and declared "written to the wrong stream", when it simply had
  not finished;
- mangled em-dashes surviving an entire green CI run undetected;
- a phantom byte-order mark and corrupted indentation in a captured diff.

So: **before reporting that something is absent, failed, or empty, measure it a second way.** Ask
the process, not the file. Ask the API, not the local cache. Read the error log, not the exit
code. If the second instrument agrees, the negative is real and worth acting on; if it disagrees,
you have just saved hours. Every one of the five above was caught by looking again with a
different tool, and every one of them was reported confidently the first time.

## Never

- Never merge without the required CI check green on the exact head the merge ruling pins.
  Branch protection having `strict` and `enforce_admins` off is a configuration convenience,
  not a licence — **for every role except the founder.**

  **The founder may bypass the check deliberately** (founder 2026-08-07). `enforce_admins` is
  false, so `gh pr merge <n> --squash --admin` lands a pull request whose check is red, absent, or
  never dispatched. That is the founder's call to make and no agent may make it, propose it as
  routine, or treat a past bypass as precedent for the next one.

  **A bypass is only legitimate when it is recorded**, because a merged commit carries no trace
  that nothing checked it — the merge looks identical either way, and six months later the
  history claims a green that never existed. Before merging, a comment on the pull request states:
  that the check was bypassed, why (dispatch outage, check unavailable, founder ruling), what
  evidence stands in its place, and the exact head SHA that evidence was gathered against. If the
  head moves afterwards, the evidence describes a different commit and must be regathered.

  **Know which kind of bypass it is, and say so.** Overriding a check that could not RUN is not
  the same act as overriding one that RAN AND OBJECTED, and an outage hides the difference. On
  2026-08-07 a pull request looked like the first and was the second: dispatch was down, but its
  diff also crossed both ownership territories, which CI would have rejected outright. Establish
  what the check would have said — run its steps locally, or read the rule it would have applied
  — before deciding the objection is absent rather than merely silent.
- Never set a board item Done by hand outside a documented repair, and record a repair AS a
  repair.
- Never treat an empty or progress-line-only reviewer output as a clean gate.
- Never judge a detached process's liveness from a process list — measure its own artifacts.
- **Never launch a reviewer process from any role but `reviewer-runner`** (founder 2026-08-08).
  One launcher is what keeps the recipes correct in a single place, makes reading stderr at launch
  non-optional, and leaves an open gate addressable by agent id. It also puts every reviewer wait
  on the wake channel that has not failed — a subagent's completion re-invokes its parent, whereas
  the background shell watches it replaces went silent twice on one item.
- PowerShell, never Bash. bun, never npm or pnpm.

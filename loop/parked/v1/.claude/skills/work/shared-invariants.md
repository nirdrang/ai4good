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
- Reviewer output lands ONLY in the item's artifacts directory — `loop/items/<item>/artifacts/`,
  **inside the tree** — and never elsewhere in the tree while a gate is open. (Founder ruling
  2026-08-09: it lived beside the tree until the Write tool's isolation guard collided with that
  design and a shell fallback got flagged as a policy bypass; inside the tree, no boundary is
  crossed at all.) The fix and audit sittings commit the raw critiques, stderr logs and
  distillates into the record at each phase boundary — the commit is what preserves evidence,
  and it also marks the worktree changed so the platform will not auto-clean it under a dying
  agent.
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
- **NEVER PASS `model` WHEN YOU SPAWN — the definition owns the pin (2026-08-21).** Each role's
  model and effort live in its own `.claude/agents/*.md` frontmatter. An override is accepted
  silently and costs real money: on one measured item a `mechanical` spawned with an opus
  override burned 10.9M tokens where its six sonnet siblings cost 0.3–4M, and an `Explore` did
  the same for 8.6M — about 19M tokens, from two careless spawn parameters. When a different
  model is genuinely wanted, **spawn the other TYPE** (`orchestrator-opus`, never `orchestrator`
  with an override) — a type carries its effort pin too, which an override silently drops.
- **Never work around a tool refusal by switching instruments.** A denial at the tool layer
  answered with the same action through the shell is a security bypass, and the platform flags it
  as exactly that (measured 2026-08-09, live drill). A tool refusal is a `REFUSED` report handed
  up; the boundary's owner changes the boundary, never the actor it refused.
- PowerShell, never Bash. bun, never npm or pnpm.

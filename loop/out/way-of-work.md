# `/work` — the way of work

One verb. Supersedes `/pm-next`, `/item-loop`, `/dev-start`, `/dev-end`, `/bind`, `/override`.

Settled across this session with three adversarial review rounds (codex `gpt-5.6-sol`) plus a
founder question that collapsed a whole subsystem — see §2.

---

## 1. Why it exists

Every attribution failure in this project was one shape: a **declared** fact (a binding file
keyed by a folder hash) drifted from a **real** fact, and nothing could detect the gap.
AI4DEV-24 (typecheck the harness) is the canonical case — the session sat in the shared `main`
folder, another session overwrote that folder's binding, and every message stamped the wrong
item for a whole run, silently.

The system is allowed to say "I don't know". It is not allowed to be confidently wrong.

---

## 2. One slot: the ROOT CHAIN

The old model had two fields — a PM item and a **bucket** you declared. The bucket was wrong by
construction: it doubled as a permission, so setting `bringup` silenced the "which requirement
is this?" check, and weeks of foundation work ran without that question ever being asked. A
label that silences a check gets abused, and did.

The distinction buckets tracked is real — product work vs infrastructure vs poking around. The
*field* is not. It is derivable from **what the work rolls up to**.

**Verified live 2026-08-01:** a dev-board item can have a PM-board item as its `parentId`
(tested on AI4DEV-34, reverted). Linear's docs confirm it: *"Sub-issues can be assigned to any
team or member in the workspace, not just the parent issue's team."*

So resolution is one loop: **walk `parent` upward until there is no parent.** The chain ends
either on a product requirement (`AI4PM-*`) or on a bring-up root (`AI4DEV-*`). Both are
"requirements" in the only sense attribution cares about: the thing work rolls up to.

This deletes, entirely: the `pm=` marker, its write-authority rules, the
marker-vs-decomposition conflict resolution, the approve-once repair flow, the backfill
migration, relation-walking, and the four declared buckets.

### The display — ONE format, two lines, always (founder ruling 2026-08-01)

There is exactly **one** shape. The fields never change; only their values do. An earlier draft
had a different shape per case — three things to read instead of one.

```
WORKING ON  <root> > <parents, in hierarchy order> > <the item>
IN          wt <worktree folder> · branch <branch>
```

Line 1 is the conclusion, **full path top-down**: requirement first, each parent in hierarchy
order, ending on the item actually being worked. Line 2 is **what that conclusion was derived
from** — which makes the pair self-auditing: the worktree says where the session really is, the
branch says which item it really names, and line 1 says what that resolved to. Every past
incident was line 1 disagreeing with line 2 while only line 1 was visible.

```
WORKING ON  AI4PM-19 (user auth) > AI4DEV-40 (auth tree) > AI4DEV-41 (login form)
IN          wt ai4dev-41 · branch nirdrang/ai4dev-41-login-form

WORKING ON  AI4DEV-3 (AT harness) > AI4DEV-19 (H3 sentinels)
IN          wt ai4dev-19 · branch nirdrang/ai4dev-19-h3-sentinels

WORKING ON  nothing
IN          wt ai4good (main checkout) · branch main

WORKING ON  AI4PM-19 (user auth) > ... 2 more ... > AI4DEV-41 (login form)
IN          wt ai4dev-41 · branch nirdrang/ai4dev-41-login-form
```

Deep chains elide the middle and always keep both ends. Every id carries a **very short title
in parentheses** — two to five words, a recall hint, never Linear's full sentence (AI4DEV-35).

**Prompts append; they never reshape the format.** "No root — exploring? say so", a CONFLICT
warning, or a stale-cache notice are extra lines *after* these two, so the two lines are always
in the same place and always mean the same thing.

Work kind is read off the chain, never declared: root on the product board = product work; root
on the dev board = bring-up; no root = unattributed. `exploration` remains the one declared
value, because it is a positive statement ("deliberately untracked"), not an absence.

---

## 3. The attribution rule

```
branch and held item disagree -> CONFLICT. Show both, ask. Never pick one.
branch names one item         -> that item, then walk parents for the chain
branch names 2+               -> unresolved
branch names none, but this session HOLDS one -> that, marked as held-not-branch
explicitly exploring          -> exploration
otherwise                     -> unattributed
```

### The held item is a CROSS-CHECK, never an answer

`/work` records which item the session believes it holds, and the hook compares it against the
branch **every prompt**. This is the single highest-value defence: it is what catches
`git switch` to another item mid-session, a second session flipping a shared worktree's branch,
and a detached HEAD swallowing the whole stamp.

It looks like the declared binding that caused every original incident, and the difference is
decisive: **it can never override the branch.** It can only produce a CONFLICT line or fill a
gap the branch left empty. A stale held item therefore makes the stamp *louder*, never *wronger*
— the exact inverse of the old binding, which silently replaced reality.

The branch is primary because it is **coupled to closure** — its pull request closes that item,
so a wrong branch surfaces as a wrong closure on the board instead of hiding. It is still a
declaration made once at creation, not ground truth, which is why disagreement is checked
rather than assumed away.

Branch parsing is **tokenised**, not regex-matched: find all `ai4(dev|pm)-\d+` occurrences;
exactly one attributes, zero or two-or-more do not. (A single anchored pattern silently
accepted `alice/ai4dev-19-into-ai4dev-20` and attributed it to 19.)

**Attribution never blocks building.** Linear unreachable, chain ambiguous, root missing — the
line says so and the work proceeds. The one thing it blocks is **closing a requirement**,
because that is where a wrong answer becomes permanent.

The durable record is the per-message stamp in the transcript. Caches are speed only; deleting
them costs nothing but time.

---

## 4. `/work`, step by step

### A — decide what

- `/work AI4DEV-19` names it. `/work AI4PM-12` targets a requirement.
- `/work` alone means **recommend and wait** (founder ruling): resume anything this session
  holds; else anything already In Progress; else rank the backlog by unblocked first, then by
  how many items it unblocks, then by whether it is in the current phase. Show the top three
  with short labels and a one-line reason each, recommend one, **wait**.

### B — build the workspace

Read-only validation first; **the board claim happens last**, after the workspace exists, so a
failure cannot leave an item falsely In Progress.

- Branch name comes from Linear's `gitBranchName` **verbatim** — never invented. Validate it
  tokenises to exactly this item.
- Worktree at a **short configurable root** (`C:\wt\<repo-hash>\<item>`), not a sibling of the
  repo: two clones collide on a sibling path, and Windows path limits bite when the parent is
  deep. Verify the folder is genuinely this repo's worktree, not a folder with the right name.
- **Branch state, disk state and git's worktree registry are three independent dimensions.**
  `git worktree list --porcelain` first, always:

| situation | action |
| --- | --- |
| no branch, no worktree | fetch, create both from `origin/main` |
| branch local-only / remote-only / in sync | create the worktree on it; set upstream explicitly |
| branch local and remote **diverged** | stop and report; recovery is a decision, not a default |
| branch checked out in another worktree | reuse it if valid, else refuse and name its path |
| registered worktree missing from disk | prune the stale registration, then create |
| folder on disk, not registered | refuse; never adopt a stray folder |
| worktree on a **different** branch | refuse. Never repurpose a folder |

Uncommitted work found while resuming is reported and preserved, never discarded.

- **The agent never moves itself** (founder 2026-08-02, after the worktree-entry tool was
  refused mid-item — the refusal was the finding). A session works in the folder it was
  launched in, on one branch, for the whole item. It may *create* a worktree and tell you to
  open a session there; it never teleports into one.

  This is what makes the derivation honest rather than aspirational: cwd → branch → item is
  true at every moment, with nothing to keep in sync. The earlier design had the agent move
  itself, which needed a tool that turns out not to be reliably available — and if it had
  silently failed, the session would have sat in `main` while believing it was in the item's
  folder. That is precisely the AI4DEV-24 failure, rebuilt.

  **Serial work needs no worktree at all**: switch the branch in the folder you are in. A
  worktree is only for running a *second* item at the same time, and then it is you who opens
  the session there. This deletes worktree entry, session-moving, and most of the seven-case
  table from the normal path.
- **Print the transition record** the moment the branch changes:

```
TRANSITION - from here this turn is AI4PM-19 (user auth) > AI4DEV-41 (login form)
worktree C:\wt\a1b2c3\ai4dev-41  branch nirdrang/ai4dev-41-login-form  base 8c3a5ca
```

The pre-prompt stamp describes the turn as it began, so a turn that changes workspace must say
so in the transcript. An earlier draft ended the turn instead — that only moved the cost onto
the founder and did not make one verb one verb.

- Journal each step (claimed / branch / worktree / entered) so a crash between any two is
  recoverable by reading rather than guessing.

### B2 — asking for a missing root (founder ruling 2026-08-02)

Derived attribution can only report what the board contains. When the walk **completes** and
finds no requirement above an item, that is a modelling gap the founder can close, so `/work`
**stops at pickup and asks**, offering ranked suggestions: existing phases that already have
children, an `AI4PM` requirement when the item's text points at one, and **"standalone — it is
its own root"**, which is always legitimate — a phase with exactly one child tells you less than
no phase at all.

The answer is recorded **on the board**, not on this machine — a chosen parent becomes
`parentId`, standalone becomes a `standalone-root` label — so the question is asked once, ever,
for every future session on any machine.

Two guards keep this from becoming the thing it replaced:

- **A board that cannot be READ is not a board with no parent.** An API error or a partial
  response must never trigger the question, because answering it would bake a guess into the
  board permanently. That case prints `CHAIN UNRESOLVED` and retries at the next boundary.
- **It is a question, not a gate.** No answer, or a declined one, proceeds with no root and does
  not ask again that session. Attribution degrades and never blocks — the ask exists because
  pickup is the one moment a human is already present, not because work needs permission.

The stamp hook itself asks nothing: it runs before every prompt, where blocking is not an option.

### C — the loop

Brief → plan → Gate 1 (codex tries to break the plan) → triage → checkpoint → implement →
Gate 2 (codex + Kimi in parallel on the code) → bounded fix cycles → verify.

### D — finish

1. **Independent re-verification** by a fresh-context agent — never the one that wrote the code.
2. **Written merge ruling**, pinned to the head commit.
3. **PR published** with that ruling + a single-use merge authorization pinned to the same commit.
4. **Merge** → the GitHub integration flips the item Done. Never set Done by hand; if the
   integration did not fire, that is a discrepancy to report, not to tidy away.
5. **Post-merge check** against merged `main`.
6. **Fold upward** (§5).

### E — release the session

Leave the worktree, clear this worktree's item state, remove the worktree if clean (keep and
report if dirty), print `session is free`. Nothing carries over — which is what makes the next
item correct by construction rather than by memory.

**Park** is the alternative: commit WIP, release the session, item stays In Progress, worktree
kept. `/work AI4DEV-19` later resumes exactly there.

---

## 5. Completion signals and folding

A completion signal is always something **outside the agent's own claim**.

| level | signal | not the signal |
| --- | --- | --- |
| leaf | PR merged **and** Linear flipped it Done | "the tests passed for me" |
| parent | every child closed, re-read fresh from the board | memory of what was closed |
| requirement | the evidence gate below | all its leaves being closed |

**Folding** happens in the finish phase, right after a merge: re-read the parent's children
**fresh** (a sibling may have closed in a parallel session); if every child is Done or
Cancelled, the parent folds to Done; folding **cascades** upward. Cancelled counts as closed but
every cancelled child is **listed by name**, so a quietly-cancelled item can never make a tree
look complete. The cascade **stops below a product requirement** — that boundary is the gate.

### Requirement evidence gate — pinned, not asserted

Never automatic, never implied by leaves closing:

1. **Exhaustive leaf snapshot at a named commit** — every leaf listed with label and state.
2. **Attribution resolved** — refuse to close while the chain is unknown.
3. **Acceptance suite green at integration tier**, at that named commit, with named checks and
   timestamps — not "it passed at some point".
4. **Recorded founder attestation**, with its date, on the item.
5. An explicit, recorded **waiver** path, so one flaky test cannot deadlock a requirement.

`/work` proposes; it never closes a requirement on its own.

### When git and the board disagree (founder question, 2026-08-02)

Closing rides on an asynchronous integration, so it can be slow, can drop, and can interleave
with a sibling's merge. **Git is the source of truth for merge state; Linear mirrors it.**

The rule is therefore narrower than "never set Done by hand" — stated that way it forbade the
repair without providing one, which would strand an item In Progress forever. What is forbidden
is **asserting a state that was never observed**. A verifiably merged pull request is evidence
in hand: repair the board from it, and record it as a repair rather than as the integration
having worked.

- Slow webhook → **bounded re-read (~30s)**; an instant check turns normal latency into a false
  alarm.
- **Two siblings merging at once → confirm your own item is Done BEFORE reading the siblings.**
  That ordering is the whole fix: whoever finishes second necessarily observes the complete set,
  so the parent is never left unfolded by both sessions each seeing the other still open.
  Folding is idempotent, so both folding is harmless.
- Crash between merge and fold → `/work` on any parent re-reads and folds; drift self-heals on
  next touch.
- Linear unreachable → the merge happened and the board is stale; report, reconcile next time.

No locks and no transactions: for a handful of parallel sessions the cost of being wrong is a
board briefly behind, never lost work.

---

## 6. Ride-along, and no nesting

**Ride-along (founder ruling 2026-08-01).** Changes to the mechanics made while working an item
ride along in **that item's branch and PR**. No new dev item, no second PR. They are listed in
the PR body under "rides along", and they pass the same gates because they are in the same
diff. Qualifies: anything the item needs, and small corrections to the machinery being used
while using it. Does not qualify: independent work that could stand alone and costs real time —
**filed, not built**.

**No nesting.** The session holds one worktree on one branch, so a second item has nowhere to
live. `/work` at something else while one is open refuses and offers three doors: finish, park,
or file the new thing. Discoveries mid-item become filed items, never started ones.

---

## 6b. Stamp failure modes (codex `gpt-5.6-sol` @ `xhigh` rehearsal, 2026-08-01)

Sixteen scenarios were walked. Six collapse into one bug — the branch moving out from under a
session — closed by the held-item cross-check in §3. The rest, with their defences:

**The hook is never silent.** It always prints both lines, even when everything failed:
`WORKING ON unknown (stamp error: <what>)` / `IN wt ? · branch ?`. Hard timeout; never reuse
the previous turn's output. This is the most important operational rule here — the failure mode
is not a wrong stamp, it is *no* stamp becoming normal, after which nobody looks at the line
at all.

**Git states are named, not swallowed.** Detached HEAD, an in-progress rebase, and bisect all
made the earlier design print `nothing` during genuinely attributed work. Instead: keep the held
item, and say which state git is in — `branch detached@<sha>`, `REBASE IN PROGRESS`,
`BISECT IN PROGRESS`. Closure is blocked in all three; building is not.

**Identity is git's, not the path string's.** Windows makes `C:\WT\Repo\Item`,
`c:\wt\repo\ITEM` and a junction to either look different while being the same place — or look
the same while being different. Compare resolved final paths **plus** the git common-dir
identity, every prompt. A worktree renamed, moved or deleted under a live session must produce
an explicit `WORKTREE MISSING`, never a stale-but-plausible line.

**Staleness is visible, not silent.** A cached chain whose age is past its refresh point prints
`STALE`; a title is a hint and is marked when unverified. Ids are authoritative, titles never
are.

**Tokenising is strict.** ASCII word boundaries, so `fix/notai4dev-19x` does not match;
zero-padding (`AI4DEV-019`) normalised; all matches collected and exactly one required.

**Stash crosses attribution boundaries.** Stashing on one item and applying on another attributes
the code to the wrong item, and nothing in git objects to it. After a stash apply or pop, warn
when the stash's source branch names a different item, and require confirmation before closure.

**Stale data may display, but may never authorize.** An item deleted, renamed, or moved to
another team can still sit in a cache and read plausibly. Anything cached is fine for the line;
nothing cached is sufficient to close a requirement — closure always re-reads.

Submodules are noted and not defended: this repository has none, and a defence for a case that
cannot occur is cost without benefit.

## 7. What gets deleted

`/pm-next`, `/item-loop`, `/dev-start`, `/dev-end`, `/bind`, `/override` as separate verbs;
the folder-keyed `bindings/` directory and its helpers; the PM-acknowledgment file; the
unattributed streak counter; `Clear-ItemState`; `Write-BindingFor`; the four declared buckets;
and the entire `pm=` marker subsystem.

## 8. Migration

1. **Re-parent the dev roots** under their requirements (they are linked with "related" today).
   One-time, checkable: every root either reaches a requirement or is a bring-up root by design.
2. **Cut-over commit**: the hook reads branch → parent chain → cache; `/work` replaces the verb
   set; CLAUDE.md updated.

Both run through the loop as normal items.

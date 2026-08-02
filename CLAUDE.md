# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" â†’ "Write tests for invalid inputs, then make them pass"
- "Fix the bug" â†’ "Write a test that reproduces it, then make it pass"
- "Refactor X" â†’ "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] â†’ verify: [check]
2. [Step] â†’ verify: [check]
3. [Step] â†’ verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## 5. Way of work: ONE verb, derived attribution (AI4DEV-36, 2026-08-02)

**Full spec: `loop/out/way-of-work.md`. One lifecycle exists, with one entry point: `/work`.**
Superseded and deleted: `/pm-next`, `/item-loop`, `/dev-start`, `/dev-end`, `/bind`, `/bound`,
`/pm-done`, the `bindings/` directory, the PM-acknowledgment file, and the four declared buckets.
If you find a reference to any of them, it is stale â€” `/work` does that job now.

- **`/work` is the only verb.** `/work` alone recommends and waits. `/work AI4DEV-19` builds an
  item. `/work AI4PM-12` acts on a requirement â€” decompose, claim-and-materialize, list leaves,
  or run the evidence gate, depending on the state it finds, which it always names before acting.
  `/work explore` declares deliberately untracked work. Claiming, building, merging and closing
  are PHASES inside it, never separate verbs â€” a second way to close work is how unreviewed work
  lands while the way of work appears followed.
- **ATTRIBUTION IS DERIVED FROM THE BRANCH, NEVER DECLARED (MUST-FOLLOW).** cwd â†’ git worktree â†’
  branch â†’ exactly one item id â†’ walk `parent` upward for the chain. The branch is primary
  because it is coupled to closure: its pull request closes that item, so a wrong branch shows up
  as a wrong closure on the board instead of hiding. Every attribution failure this project has
  had was a declared fact drifting from a real one with nothing able to notice.
- **The held item is a CROSS-CHECK, never an answer.** `/work` records what the session holds and
  the stamp compares it to the branch every prompt; it can raise CONFLICT or fill a gap the
  branch left empty, but it can NEVER override the branch. A stale held item makes the stamp
  louder, never wronger.
- **Attribution degrades, never blocks.** Linear unreachable, chain ambiguous, root missing: the
  stamp says so and the work proceeds. The ONE thing it blocks is closing a requirement, because
  that is where a wrong answer becomes permanent.
- **ECHO THE STAMP AS THE FIRST LINES OF EVERY REPLY (MUST-FOLLOW).** Open with the two lines the
  hook emitted **this turn, verbatim** â€” `WORKING ON â€¦` then `IN â€¦` â€” then answer. Hook output
  reaches the agent but is not guaranteed to render for the founder, especially remotely. **Never
  reconstruct them from memory**: a guessed disclaimer is worse than none, because it looks like
  evidence. If the hook emitted nothing, say so. If its value is known to be wrong, print it as
  emitted and say so on the next line â€” correcting it silently hides the drift it exists to show.
- **PRINT THE TRANSITION LINE THE MOMENT THE BRANCH CHANGES (MUST-FOLLOW).** The stamp describes
  the turn as it began, so a turn that changes branch must say so in the transcript.
- **The agent never moves itself between folders.** A session works where it was launched, on one
  branch, for the whole item. It may create a worktree and ask the founder to open a session
  there; it never teleports. Serial work needs no worktree at all â€” switch the branch you are on.
- **Every id printed carries a very short title in parentheses** â€” `AI4DEV-19 (H3 sentinels)`,
  two to five words, a recall hint, never Linear's full sentence.
- **NEVER open a dev item for mechanics â€” it rides along** (founder 2026-08-02). Machinery changed
  while working an item goes in that item's branch and PR, listed under "rides along". Independent
  work that could stand alone is **filed, not built**.
- **Reflect on `/work` at the end of every item**: did it behave as intended, does it need a fix?
  Fixes ride along. This is how the way of work improves from use rather than from redesign
  sessions.
- **One session, one item.** No nesting: `/work` at something else while one is open offers
  finish, park, or file.
- **Requirements close only through the evidence gate** â€” exhaustive leaf snapshot at a named
  commit, attribution resolved, suite green at integration tier with named checks and timestamps,
  recorded founder attestation, explicit waiver path. `/work` proposes; it never closes one alone.
- **Blocked** is a label + comment, never a status change.
- **Doc changes** run through `/doc-sync fold` (git â†’ Linear only; meaning never changes in
  Linear). PRD text is edited ONLY in `loop/out/pure-s*.md`.
- **Commits** cite the item they belong to.

**Anti-patterns:**
- Hand-editing board status in the Linear UI, or setting an item Done by hand â€” the merge does it.
- Closing a requirement with open leaves, or on cached/stale attribution.
- A second way to close work, however convenient it looks.
- Committing foundation work straight to `main`: branch, pull request, merge, like everything else.
- Ceremony out of proportion to the work â€” that is how a process stops being followed at all.
- Editing `prd-mvp.md`, an isolate, or Linear item text directly to change meaning.

**Foundation work (W0 bring-up)** is dev-board work with no requirement above it. It is not a
product requirement and has no evidence gate, but it runs through `/work` exactly like everything
else and closes on a merged pull request. Its chain simply ends on a bring-up root
(`AI4DEV-3 (AT harness)`, `AI4DEV-4 (the work skill)`) instead of on a requirement â€” which is
what marks it as infrastructure. Nothing is declared to say so, and nothing can be faked.

---
## Communication: simple English, never shorthand (founder instruction, 2026-07-20)

When reporting to or planning with the founder, write in plain sentences. Do not lean on
invented labels or compressed codes â€” "P3", "W1", "T4", "d82", "r2 fold" mean nothing on
their own. Rules:
- Never use an internal label without saying in words what the thing is, in the same
  sentence. "Protect the main branch on GitHub" â€” not "P3". "The decision that split
  Linear into a PM tree and a dev tree" â€” not just "d82".
- Requirement and decision numbers are fine as references, but always next to a plain
  description, never instead of one.
- **NEVER PRINT A BARE ITEM NUMBER â€” always `id (very short title)` in PARENTHESES
  (MUST-FOLLOW, founder instruction 2026-08-01: *"always have in wrapped in () a very short
  text title for an item so no more AIPM-12 or AIDEV-14 without a quick text recall for me"*).**
  Write `AI4DEV-19 (H3 sentinels)` â€” never `AI4DEV-19` alone, and not the dash-and-full-title
  shape this rule had earlier the same day.
  - **Very short means a RECALL HINT, not the real title:** two to five words. Linear titles
    are often a whole sentence; shorten them, never paste them. `AI4DEV-35 (short titles in
    parens)`, not `AI4DEV-35 (Every item id printed to the founder carries a very short title
    in parentheses)`.
  - Applies everywhere an id reaches the founder: replies, status reports, board listings,
    suggestions of what to work on next, prose in commit and PR bodies, and the WORKING-ON
    disclaimer â€” where the stamp hook formats `id (label)` from a cached short label, because
    the hook runs before every prompt and must never call Linear.
  - If the label is genuinely unknown, look it up; a bare id is acceptable only when the lookup
    itself failed, and then say so.
- A status update should read like an explanation to a smart teammate who has NOT been
  following the internal naming â€” because that is exactly the situation.
- Lists of steps get described by what the step does, not by its stage code.

---
## Project-Specific Guidelines

- **Use the Lovable MCP for non-trivial UI work.** For UI changes beyond simple tweaks, drive them through the Lovable MCP â€” Lovable is the bot operating its own MCP and has more intimate, UI/UX-optimized capabilities. Reserve direct edits for simple UI changes.
- **UI never touches the DB directly.** UI code must always go through an edge function â€” never call the database directly from UI code.

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

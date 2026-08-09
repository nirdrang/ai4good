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
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## 5. Way of work: ONE verb, derived attribution (AI4DEV-36, 2026-08-02)

**One lifecycle exists, with one entry point: `/work`.** The rules below bind every session. The
process itself is not described here — it lives in the files the roles that need it read:

| file | what it is |
|---|---|
| `.claude/skills/work/SKILL.md` | the **coordinator's** manual — the skill `/work` loads. There is no separate coordinator contract; this is it |
| `.claude/skills/work/WORKFLOW.md` | one item end to end, step by step, naming the role that acts at each step |
| `.claude/skills/work/shared-invariants.md` | binds **every** role; where a contract disagrees with it, it wins |
| `.claude/agents/*.md` | one contract per role — conductor, orchestrator (and its opus fallback twin), executor, mechanical, distiller |
| `.claude/skills/work/reviewers.md` | the base of every gate prompt; the reviewers are external processes, not agents |
| `.claude/skills/work/lessons.md` | what these rules cost to learn — read when one seems wrong, not routinely |

Superseded and deleted: `/pm-next`, `/item-loop`, `/dev-start`, `/dev-end`, `/bind`, `/bound`,
`/pm-done`, the `bindings/` directory, the PM-acknowledgment file, and the four declared buckets.
If you find a reference to any of them, it is stale — `/work` does that job now.

- **`/work` is the only verb.** Claiming, building, merging and closing are PHASES inside it,
  never separate verbs — a second way to close work is how unreviewed work lands while the way of
  work appears followed.
- **ATTRIBUTION IS DERIVED FROM THE BRANCH, NEVER DECLARED (MUST-FOLLOW).** cwd → git worktree →
  branch → exactly one item id → walk `parent` upward for the chain. The branch is primary
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
- **OPEN EVERY REPLY WITH THIS TURN'S PICTURE, THEN THE HOOK'S FACTS (MUST-FOLLOW; founder
  2026-08-09, superseding the verbatim-echo rule of 2026-08-07 — "what I want from your echo is
  todo the mangling to take the hook facts and take into account the user prompt").** Two lines:
  - `TURN  <attribution> - <what this response is about>` — the model's OPEN SYNTHESIS of the
    hook facts and the current prompt, so the founder sees what this actual turn is about,
    including attribution AFTER any direction change the prompt just made. A `TURN` line names a
    board item only when the turn genuinely works that item; otherwise a `~floating` label.
    **ATTRIBUTION MEANS THE WHOLE CHAIN, root first, every id with its short title** (founder
    correction 2026-08-09: *"Note that the stamp doesn't show the chain"*). Print
    `AI4PM-19 (auth and org membership) > AI4DEV-50 (auth root) > AI4DEV-59 (GitHub sign-in)`,
    never the leaf alone. The leaf alone hides which requirement the turn serves, which is the
    one thing the chain exists to show.
  - `HOOK  <its attribution> · <actor> · folder <f> - branch <b>` — the hook's facts from this
    turn, compressed but NEVER altered; `AGENT` lines follow as the hook gave them, **each with
    its full chain**. Compression may shorten wording; it may never drop attribution. Dropping a
    chain to save a line is altering the evidence, not compressing it. If the hook emitted
    nothing, this line says so; if its value is known wrong, print it as emitted and dispute it
    on the next line.

  The split is the safety: judgment and evidence stay distinguishable, and a DIVERGENCE between
  the two lines is itself the signal that direction changed — the same turn must then update the
  held facts (`Set-HeldItem`, or clear) so the next prompt's hook agrees again. The stamp itself
  stays script-derived and judgment-free; only the reply's opening line synthesizes.
  **Anything relayed from another actor carries the arrival time and that actor's role**
  (`09:41 · conductor — plan → gate 1`), so a claim is never read as the coordinator's own.
- **PRINT THE TRANSITION LINE THE MOMENT THE BRANCH CHANGES (MUST-FOLLOW).** The stamp describes
  the turn as it began, so a turn that changes branch must say so in the transcript.
- **The agent never moves itself between folders.** A session works where it was launched, on one
  branch, for the whole item. It may create a worktree and ask the founder to open a session
  there; it never teleports. Serial work needs no worktree at all — switch the branch you are on.
- **Every id printed carries a very short title in parentheses** — `AI4DEV-19 (H3 sentinels)`,
  two to five words, a recall hint, never Linear's full sentence.
- **NEVER open a dev item for mechanics — it rides along** (founder 2026-08-02). Machinery changed
  while working an item goes in that item's branch and PR, listed under "rides along". Independent
  work that could stand alone is **filed, not built**.
- **One session, one item.** No nesting: `/work` at something else while one is open offers
  finish, park, or file.
- **Requirements close only through the evidence gate** — exhaustive leaf snapshot at a named
  commit, attribution resolved, suite green at integration tier with named checks and timestamps,
  recorded founder attestation, explicit waiver path. `/work` proposes; it never closes one alone.
- **Blocked** is a label + comment, never a status change.
- **Doc changes** run through `/doc-sync fold` (git → Linear only; meaning never changes in
  Linear). PRD text is edited ONLY in `loop/out/pure-s*.md`.
- **Commits** cite the item they belong to.

**Anti-patterns:**
- Hand-editing board status in the Linear UI, or setting an item Done by hand — the merge does it.
- Closing a requirement with open leaves, or on cached/stale attribution.
- A second way to close work, however convenient it looks.
- Committing foundation work straight to `main`: branch, pull request, merge, like everything else.
- Ceremony out of proportion to the work — that is how a process stops being followed at all.
- Editing `prd-mvp.md`, an isolate, or Linear item text directly to change meaning.

**Foundation work (W0 bring-up)** is dev-board work with no requirement above it. It is not a
product requirement and has no evidence gate, but it runs through `/work` exactly like everything
else and closes on a merged pull request. Its chain simply ends on a bring-up root
(`AI4DEV-3 (AT harness)`, `AI4DEV-4 (the work skill)`) instead of on a requirement — which is
what marks it as infrastructure. Nothing is declared to say so, and nothing can be faked.

---
## Communication: simple English, never shorthand (founder instruction, stated repeatedly — 2026-07-16, 2026-07-18 and 2026-07-28)

**ALWAYS USE ASD-STE100 SIMPLIFIED TECHNICAL ENGLISH (MUST-FOLLOW, founder 2026-08-09).** This
is the aerospace controlled-language standard, and it applies to everything written for a
person: replies, reports, plans, board items, commit and pull-request bodies, and the process
files. What it means in practice:
- **One word, one meaning. One meaning, one word.** Choose a term and keep it for the life of
  the document. Do not reach for a synonym to avoid repetition — in a controlled language,
  repetition is the feature.
- **Short sentences.** Twenty words maximum in a procedure, twenty-five in a description. One
  instruction per sentence.
- **Active voice, present tense**, with the actor named: "the conductor spawns the runner", not
  "the runner is spawned".
- **No noun clusters longer than three words**, and no jargon, idiom, or metaphor where a plain
  word exists.
- **Say the condition first**, then the action: "If the gate is empty, report it as empty."
- Keep paragraphs to about six sentences.

This tightens the rules below; it never loosens them. Where full compliance would make a
technical fact wrong or unsayable, keep the fact and say plainly that you did.

When reporting to or planning with the founder, write in plain sentences. Do not lean on
invented labels or compressed codes — "P3", "W1", "T4", "d82", "r2 fold" mean nothing on
their own. Rules:
- Never use an internal label without saying in words what the thing is, in the same
  sentence. "Protect the main branch on GitHub" — not "P3". "The decision that split
  Linear into a PM tree and a dev tree" — not just "d82".
- Requirement and decision numbers are fine as references, but always next to a plain
  description, never instead of one.
- **NEVER PRINT A BARE ITEM NUMBER — always `id (very short title)` in PARENTHESES
  (MUST-FOLLOW, founder instruction 2026-08-01: *"always have in wrapped in () a very short
  text title for an item so no more AIPM-12 or AIDEV-14 without a quick text recall for me"*).**
  Write `AI4DEV-19 (H3 sentinels)` — never `AI4DEV-19` alone, and not the dash-and-full-title
  shape this rule had earlier the same day.
  - **Very short means a RECALL HINT, not the real title:** two to five words. Linear titles
    are often a whole sentence; shorten them, never paste them. `AI4DEV-35 (short titles in
    parens)`, not `AI4DEV-35 (Every item id printed to the founder carries a very short title
    in parentheses)`.
  - **STRIP INTERNAL CODES — the label must say what the thing IS** (founder 2026-08-03: *"I
    can't understand the H5 or its equiv means nothing to me. Human title near the dev label
    should be more informative."*). Many board titles
    lead with a code — `H5 — `, `REQ-0NN — `, `Batch 3 — `. Truncating from the front keeps the
    code and throws away the meaning, which is the exact opposite of the point. Drop the code
    and describe the thing:
    - `AI4DEV-21 (fake Stripe, GitHub, Anthropic)` — not `(H5 vendor stand-ins)`
    - `AI4DEV-20 (judging AI output meaning)` — not `(H4 semantic-oracle)`
    - `AI4DEV-22 (first requirement green end to end)` — not `(H7 proving ground)`
    A label a stranger could not act on is not a label; it is the id twice.
  - Applies everywhere an id reaches the founder: replies, status reports, board listings,
    suggestions of what to work on next, prose in commit and PR bodies, and the WORKING-ON
    disclaimer — where the stamp hook formats `id (label)` from a cached short label, because
    the hook runs before every prompt and must never call Linear.
  - If the label is genuinely unknown, look it up; a bare id is acceptable only when the lookup
    itself failed, and then say so.
- **NEVER NAME ANOTHER ITEM'S ID IN A PULL REQUEST TITLE OR BODY (MUST-FOLLOW).** The id itself
  is the trigger, not the verb beside it. Linear links a pull request to every id in its text,
  and **the link alone moves that item** — a finished item was dragged back to In Progress
  twenty-four minutes after its own merge had correctly closed it, by a body that said
  *"ref AI4DEV-43"*. A closing verb (**close / fix / resolve / complete / implement** and their
  inflections) additionally *closes* the item — louder, but the same defect. A careful
  post-mortem once closed the item it learned from **mid-work**, because the sentence read
  *"the instruction that fixed AI4DEV-31's chain"*. The hazard punishes good writing: the more
  thorough the explanation, the more items it cites, and the item most likely to be cited is the
  one someone is actively working.
  - **There is NO safe reference word.** `ref`, `references`, `part of`, `related to`,
    `contributes to` and `towards` all link the item and all move it. Earlier guidance here
    recommended them, and that advice caused the very defect it was meant to prevent.
  - Name other items **in words**: *"the item that landed the relay"*, *"the requirement above
    this one"*. The branch's own item is the sole exception — that link is what closes it.
  - CI enforces this on every pull request: **any** id the branch does not own fails the build.
    The rule is written here because the guard should never be the first place you learn it.
- A status update should read like an explanation to a smart teammate who has NOT been
  following the internal naming — because that is exactly the situation.
- Lists of steps get described by what the step does, not by its stage code.

### Writing about what the founder said (MUST-FOLLOW)

A provenance audit of these files found polished paraphrases presented as quotations and dates
with no message behind them. Every one looked like evidence.

- **Quote exactly, or do not use quote marks.** Typos, missing words and all. Tidying someone's
  words and then presenting them as a quotation is fabrication at small scale.
- **Cite a date only where a message exists on that day**, in the founder's local time.
  Transcripts are UTC and the founder is UTC+3, so a 21:00 UTC message belongs to the next day.
- **Never convert "the founder asked" into "the founder ruled."** A question that prompted a good
  rule is provenance for the question, not for the rule.
- **A rule that LOOSENS the process needs a real, explicit founder ruling.** Tightening may be
  proposed; loosening may never be inferred. (This rule worked the first time it was tested: a
  draft deleted the reflection step with nothing behind it, review restored it, and the founder
  then ruled it out explicitly — *"Reflection should be out"*, 2026-08-06.)

---
## Project-Specific Guidelines

- **Use the Lovable MCP for non-trivial UI work.** For UI changes beyond simple tweaks, drive them through the Lovable MCP — Lovable is the bot operating its own MCP and has more intimate, UI/UX-optimized capabilities. Reserve direct edits for simple UI changes.
- **UI never touches the DB directly.** UI code must always go through an edge function — never call the database directly from UI code.

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

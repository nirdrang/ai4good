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

## 5. Linear Way-of-Work: PM-Tree Task Context (adopted d83)

**Full spec: `loop/out/wow-claude-driven-linear.md` (v4.7). One task lifecycle exists — this one. TaskMaster is retired (decision-20); never use taskmaster tools for the buildout.**

- **Work brackets ONE PM-tree requirement item** (Linear team `AI4GOOD-PM`): `/pm-next` pulls it (assign + In Progress + pull-record comment + attribution binding + dev-tree materialization from `loop/decomp/req-0NN.md`); `/pm-done` closes it (evidence gate: the requirement's full AT suite green at integration tier + founder attestation). These verbs are the ONLY status authorities on the PM tree. **The founder's surface is TWO verbs (ruling 2026-08-01): `/pm-next` pulls the next piece of work — a requirement, a bring-up item (`/pm-next bringup AI4DEV-NN`), or untracked work (`/pm-next exploration`) — and `/item-loop` builds it.** Everything is built through `/item-loop`, the one build lifecycle (brief → adversarial gates → verified merge tail). `/dev-start` and `/dev-end` are INTERNAL phases of that loop (open an item / run its merge tail), invoked BY the loop and never typed by the founder; they are never authorities and never touch the PM item (d88, reshaped by AI4DEV-32 on 2026-07-31 — the old leaf verbs' "verification assumed" close is dead).
- **Dev items** (team `AI4GOOD-DEV`) are working space: manage them with plain Linear MCP calls as the work demands; leaves close via the GitHub integration on merge; no ceremony, no binding.
- **Attribution:** every message carries the stamp (`wave / project / bucket`) from the current binding. Unbound or off-task work is `exploration` or `unattributed` — honest buckets, never blocked, never faked.
- **AFTER CREATING A WORKTREE OR SWITCHING BRANCH, PRINT THE LINE IMMEDIATELY — and MOVE INTO the worktree (MUST-FOLLOW — founder instruction 2026-07-31).** A worktree/branch change silently changes what the session is working on, and the founder must see the new state at the moment it changes rather than one reply later. **If a subagent created the worktree, the ORCHESTRATOR session must `cd` into it itself** — the subagent's working directory is its own and dies with it, so a session that merely *ordered* a worktree is still sitting in the old one. This is not theoretical: AI4DEV-24's orchestrator stayed in the shared main folder after its housekeeping subagent created the item worktree, another session then overwrote that folder's binding, and every orchestration message stamped against the wrong item for the rest of the run. Sequence: create the worktree → bind it → `cd` into it → re-read the binding → print the WORKING-ON line → only then continue.
- **ECHO THE DISCLAIMER AS THE FIRST LINE OF EVERY REPLY (MUST-FOLLOW — founder instruction 2026-07-31).** Before anything else — before the answer, before any preamble — open the reply with the `WORKING ON - PM: … | DEV: … | bucket: … | branch: …` line, **copied verbatim from what the stamp hook emitted on this turn**, then continue normally. Reason: hook output reaches the agent's context, but whether the client renders it to the founder is not guaranteed — especially on a remote session. Echoing it puts the fact in front of the founder unconditionally. **Never fabricate or reconstruct the line from memory**: copy what the hook actually emitted this turn. If the hook emitted nothing, say `WORKING ON - (no stamp this turn)` rather than inventing one — a disclaimer that is guessed is worse than none, because it looks like evidence. If the hook's value is known to be wrong (a stale or hijacked binding), print it as emitted AND say so on the next line; correcting it silently hides exactly the drift the disclaimer exists to surface.
- **The WORKING-ON disclaimer + immediate PM question (MUST-FOLLOW — founder ruling 2026-07-31, replaces the streak):** the stamp hook prefixes every prompt with `WORKING ON - PM: … | DEV: …` so the current PM requirement and dev item are visible before every answer. When it appends a `PM CHECK` (no PM requirement bound, and the dev has not confirmed working without one), the agent MUST put the question to the dev BEFORE answering: pull a requirement (`/pm-next`), adopt a pull (`/bind AI4PM-NN`), or confirm proceeding without one — and record the answer with `Set-PmAck "<their words>"` so the question is asked once per item, not once per message. There is NO counter and NO threshold — the old streak design was silenced by its own escape hatch (any binding reset it, so `bringup` ran for days without the question ever being asked). Work is never blocked; the question is simply asked NOW. `Clear-ItemState` at merge clears that item worktree's binding + ack so the next item re-asks exactly once. One session holds ONE item; the orchestrator session works IN the item's dedicated worktree, never the shared main folder.
- **A PULL brackets a PHASE; the LOOP builds ONE ITEM; WORKTREES BELONG TO ITEMS (founder rulings 2026-08-01).** A pull covers a whole phase — a product requirement with its dev tree, or a bring-up parent such as AI4DEV-3 — Bring-up: the acceptance-test harness, which spans thirteen sub-items. So a dev item is never an argument to `/pm-next`; it is the loop's business. **`/pm-next` creates no worktree and no branch** — a phase is information, not a folder — it only moves the board, binds the current folder for attribution, and lists the phase's open sub-items with their titles. **`/item-loop` creates a dedicated worktree per dev item**, which is what lets several sub-items of one phase build concurrently in separate sessions instead of queueing behind one folder; its merge tail retires that one worktree and leaves siblings and the phase alone. The phase binding is attribution-only: item worktrees inherit pull fields by walking the item's PARENT on the board, never by copying that file, so a clobbered phase binding costs a wrong stamp, never wrong work.
- **Blocked** is a label + comment on the PM item, never a status change. `/override` can never reach In Progress or Done.
- **Doc changes** run through `/doc-sync fold` (one direction: git → Linear; sync-stamps; meaning never changes in Linear). PRD text is edited ONLY in `loop/out/pure-s*.md`; `prd-mvp.md` and the isolates are build products.
- **Suggestive posture:** the agent proposes at ripeness signals (tests green → "open the PR?"; merged → "ready for `/pm-done`?"; closed → "`/pm-next`?"; drift → "bind?") — once per signal, never auto-executing an authority verb.
- **Commits** cite the PM item (and the dev leaf where one applies); the design session uses `design-batch-N: AI4PM-nnn …`.

**Anti-patterns:**
- Hand-editing PM-tree status in the Linear UI (reconcile detects and the founder corrects — don't create the work).
- Closing a requirement with open dev leaves — an open leaf is a named `/pm-done` gate failure.
- Working bound to a finished item (stale binding) — rebind at every pull; trust the session banner.
- Batching syncs after multiple doc changes — every change bundle ends with its own `/doc-sync`.
- Editing `prd-mvp.md`, an isolate, or Linear item text directly to change meaning.
- **Doing dev-board work with no branch and no pull request, then hand-correcting the board afterwards** — see foundation work below.

**Foundation work (W0 bring-up: the harness, staging, CI, the work skill, at-config) — added 2026-07-28 after it went wrong:**

These are dev-board items and they are NOT product requirements: no `/pm-next`, no `/pm-done`, no evidence gate. They still close the way every dev item closes — **on a merged pull request**. Therefore:

- **Branch, then pull request, then merge. Never commit foundation work straight to `main`.** Committing direct to `main` means the item never closes itself and someone has to hand-correct the board later; if it is genuinely unavoidable, say so out loud and move the item by hand in the same breath.
- **Break a long-running foundation item into sub-items before starting**, each closing on its own evidence. A single item that stays open across many slices reports almost nothing about where the work actually is.
- **`/dev-start` covers these now** (AI4DEV-32, 2026-07-31): it is `/item-loop`'s front door and works identically for foundation items and PM-requirement leaves — dedicated worktree, binding, In Progress, hand over to the loop. The old gap ("assumes a leaf under a bound requirement") is closed.
- **Bind it as `bringup`, never as `exploration`** — `/pm-next bringup AI4DEV-NN` pointing at the PHASE (the parent, e.g. AI4DEV-3 — Bring-up: the acceptance-test harness); the loop then binds each sub-item's own worktree as it builds it. (Superseded 2026-08-01 the earlier instruction to point the binding at the sub-item: the sub-item is the loop's, the phase is the pull's.) Foundation work is planned and approved, so it gets its own honest bucket; `exploration` means genuinely untracked poking around. The four buckets are `task` (a pulled PM requirement, set by `/pm-next` only), `bringup`, `exploration`, `unattributed`. Never reach for a looser bucket than the work deserves, and never fake a requirement binding to make infrastructure look like product progress.

---
## Communication: simple English, never shorthand (founder instruction, 2026-07-20)

When reporting to or planning with the founder, write in plain sentences. Do not lean on
invented labels or compressed codes — "P3", "W1", "T4", "d82", "r2 fold" mean nothing on
their own. Rules:
- Never use an internal label without saying in words what the thing is, in the same
  sentence. "Protect the main branch on GitHub" — not "P3". "The decision that split
  Linear into a PM tree and a dev tree" — not just "d82".
- Requirement and decision numbers are fine as references, but always next to a plain
  description, never instead of one.
- **NEVER PRINT A BARE ITEM NUMBER — always id + title (MUST-FOLLOW, founder instruction
  2026-08-01: *"when it print item numbers it should also add the title since I can't remember
  their purpose"*).** Write `AI4DEV-19 — H3: sentinels + fault injection`, never `AI4DEV-19`
  alone. This applies everywhere a number reaches the founder: replies, status reports, board
  listings, suggestions of what to do next, and the WORKING-ON disclaimer (the stamp hook
  prints titles from the binding's cached `pmTitle`/`devTitle` — it must never call Linear).
  If a title is genuinely unknown, look it up; a bare id is only acceptable when the lookup
  itself failed, and then say so.
- A status update should read like an explanation to a smart teammate who has NOT been
  following the internal naming — because that is exactly the situation.
- Lists of steps get described by what the step does, not by its stage code.

---
## Project-Specific Guidelines

- **Use the Lovable MCP for non-trivial UI work.** For UI changes beyond simple tweaks, drive them through the Lovable MCP — Lovable is the bot operating its own MCP and has more intimate, UI/UX-optimized capabilities. Reserve direct edits for simple UI changes.
- **UI never touches the DB directly.** UI code must always go through an edge function — never call the database directly from UI code.

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

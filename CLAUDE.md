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

- **Work brackets ONE PM-tree requirement item** (Linear team `AI4GOOD-PM`): `/pm-next` pulls it (assign + In Progress + pull-record comment + attribution binding + dev-tree materialization from `loop/decomp/req-0NN.md`); `/pm-done` closes it (evidence gate: the requirement's full AT suite green at integration tier + founder attestation). These verbs are the ONLY status authorities on the PM tree. Within a pulled requirement, individual dev-tree LEAVES are worked with the leaf-tier verbs `/dev-start` (begin a leaf) and `/dev-end` (complete it) — ergonomic packaging only, never authorities: they create no binding and never touch the PM item (d88).
- **Dev items** (team `AI4GOOD-DEV`) are working space: manage them with plain Linear MCP calls as the work demands; leaves close via the GitHub integration on merge; no ceremony, no binding.
- **Attribution:** every message carries the stamp (`wave / project / bucket`) from the current binding. Unbound or off-task work is `exploration` or `unattributed` — honest buckets, never blocked, never faked.
- **Unattributed-streak escalation (MUST-FOLLOW):** the stamp hook counts consecutive unattributed messages per worktree (`streak="N"`) and from the 5th appends an `ATTRIBUTION ALERT`. When the alert is present, the agent MUST open its very next reply by putting the binding question to the user — `/pm-next` to pull a requirement, `/bind AI4PM-NN` to adopt an existing pull, or `/bind exploration` for untracked work — BEFORE delivering the answer. If the user declines or does not answer, do the work anyway (attribution never blocks) and re-raise only when the streak crosses the next multiple of 10 (15, 25, …), so the reminder escalates without nagging every message. Never simulate, suppress, or reset the counter — only a real binding resets it.
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
- **`/dev-start` does not cover these yet** — it assumes a leaf underneath a currently-bound PM requirement, and foundation work sits under no requirement at all. Until that is fixed, open one by hand: branch, move to In Progress, comment what the slice is.
- **Bind it as `bringup`, never as `exploration`** — `/bind bringup AI4DEV-NN`, pointing at the SUB-item being worked, not the long-lived parent. Foundation work is planned and approved, so it gets its own honest bucket; `exploration` means genuinely untracked poking around. The four buckets are `task` (a pulled PM requirement, set by `/pm-next` only), `bringup`, `exploration`, `unattributed`. Never reach for a looser bucket than the work deserves, and never fake a requirement binding to make infrastructure look like product progress.

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
- A status update should read like an explanation to a smart teammate who has NOT been
  following the internal naming — because that is exactly the situation.
- Lists of steps get described by what the step does, not by its stage code.

---
## Project-Specific Guidelines

- **Use the Lovable MCP for non-trivial UI work.** For UI changes beyond simple tweaks, drive them through the Lovable MCP — Lovable is the bot operating its own MCP and has more intimate, UI/UX-optimized capabilities. Reserve direct edits for simple UI changes.
- **UI never touches the DB directly.** UI code must always go through an edge function — never call the database directly from UI code.

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

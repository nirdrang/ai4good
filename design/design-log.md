# Design log — Lovable implementation track

> Running log per the design-session playbook (B5 + per-batch entries). Newest last.

## 2026-07-22 — Bring-up B5: Lovable baseline

- Workspace: "Nir's Lovable" (`sVJHopqE55018KmYtmrB`), plan **pro**, owner nirdrang@gmail.com.
- Project: **AI4GOOD** (`83b27493-789c-434f-99e6-583cf62b2ff5`), tech stack
  `tanstack_start_ts_2026-06-08`, private, frontend-only skeleton (no backend by design),
  editor: https://lovable.dev/projects/83b27493-789c-434f-99e6-583cf62b2ff5
- Credit balance: **not exposed** by the workspace API response at baseline time (plan-level
  only). Capture the numeric balance from the Lovable UI immediately before the first build
  message and record it here; per-batch burn is then tracked against that number.
- **⚠ d42 drift flag (2026-07-22):** the missing credit field is a reproducible drift from a
  validated product assumption — decision d42 recorded "pull Lovable credit status via
  `get_workspace`" after live interrogation, and the tool's documentation still promises
  "plan, credit balance, member count"; today's responses (both workspaces, tested twice)
  return neither credits nor member count. The product's Lovable-chip design leans on d42 —
  founder ruling needed on whether to re-validate later or plan an alternative source. Not a
  blocker for the design track (UI glance substitutes).
  **Doc research 2026-07-22:** docs.lovable.dev still documents the field AND states credit
  information surfaces ONLY through `get_workspace` (no billing endpoint exists) — so today
  there is no MCP path to Lovable credit data at all; docs stale or API regression. Auth is
  OAuth-only (no API keys). Also discovered: a native `import-claude-design-from-url` tool
  exists for some Claude client surfaces (not exposed to this Claude Code connection) — watch
  item: could simplify the §2 handoff if it becomes available.
- Gate status at baseline: design gate 001 = CONDITIONAL FAIL (change order 002 open with
  Claude Design — requirement vocabulary + status authority). **No build message goes to
  Lovable until the re-emitted screens pass the gate.**

Bring-up remaining: B1 project-knowledge push (free), B2 fixture pack authoring, B3
`tests/design/` harness, B4 gallery pipeline.

## 2026-07-22 — Batch 0 gate PASS + bring-up B1 done

- **Design gate re-check PASS** (commit a1be993): change order 002 processed; all three
  systematic must-fix conditions met across the 11 screen files (no PR-merge status phrasing,
  requirement/must-have wording present, no pause hygiene words). One non-blocking residual on
  the coordination reference sheet pends the clarifying-question-anchoring spec ruling.
- **B1 project-knowledge push DONE (free, no credits):** replaced the AI4GOOD project's Lovable
  knowledge with the enriched rule set — preserved lane/boundary/backend rules and ADDED the
  fixture seam (`src/lib/data.ts` + `src/fixtures/`), GitHub-close direction (d85), money-units
  discipline, the 9 lifecycle states, the never-show list, and Batch-0 component reuse. This is
  what keeps Lovable from producing rule-violating screens (fewer fix rounds = less credit burn).
- Next bring-up: B2 fixture pack, B3 `tests/design/` harness, B4 gallery. Then Batch 0 build
  (first credit spend — pause for founder go + capture the UI credit number first).

## 2026-07-24 — d86 re-flow on the design side (commit e165c6a)

- **d86** (NGO-facing communication anchors at the requirement level, never the dev tree) was
  resolved by the PRD track on 2026-07-22, which explicitly left the design-side re-flow to us.
  Done now: `ui-ux-instructions.md` re-worded (7 spots + a d86 header note) so requirement is
  the anchor everywhere (requirement view/panel, requirement-anchored comment + clarifying
  question, comment-thread relay onto the requirement's PM-tree item).
- **Change order 003** delivered to the design chat: the one Batch 0 residual
  (coordination-components "asked on the task" → "asked about"). Batch 5 anchoring is now
  carried by the updated spec — no separate action when it's drawn.
- Closes the last open item from gate report 001. Awaiting the founder to trigger the re-emit,
  then re-pull + re-gate that one screen.

## 2026-07-24 — stable test handles ratified (change order 005)

- The founder ratified the test-handle convention (`loop/bringup/testid-convention-draft.md`):
  `data-testid` in kebab-case requirement vocabulary on every interactive control,
  state-bearing display, list, list item, and empty/error state, with `data-testkey="<domain
  id>"` on repeated items. Reason: acceptance tests will later drive the real screens, and
  Lovable regenerates markup on every message — so tests need a contract that survives
  regeneration.
- **Folded** into `design/ui-ux-instructions.md` as new **§5.1** (inside §5 Tech mapping, where
  buildability contracts live). **Gate scan added** to `design/ui-way-of-work.md` §3 step 2:
  presence, grammar, and rename-diff — scoped to screens drawn on or after ratification.
- **Lovable project knowledge updated** with the standing preservation rule, alongside the
  existing governance rules, so it re-applies to every generation.
- **Forward-only:** the existing twelve screens are NOT retrofitted; handles arrive per
  requirement at its wiring leaf. The exemption is by date (drawn before 2026-07-24), not by
  count. First application is Batch 1.
- **Delivered to the design project 2026-07-29** — five days after it was folded. The fold,
  the Lovable push, and the gate scan all landed on the 24th, but the change order itself was
  never pushed to the design chat: an enforcement layer was complete while the notification
  step my own way-of-work requires was skipped. Caught before Batch 1 was drawn, which is the
  first screen set the convention binds. Lesson: a folded rule is not a delivered rule.

## 2026-07-29 — the two shell questions RATIFIED by the founder (in the design chat)

- Verified from the design project's own transcript: the founder answered both gate-report-002
  questions directly in the design conversation — **"My projects is fine"** (the tab stays;
  Dashboard = action-needed overview + cross-project money, My projects = the complete list
  including completed and cancelled, both roles) and **"option a"** for **Balance & invoices**
  (the tab stays; a thin organisation-level page — general balance + how it auto-applies,
  Discovery credits remaining, Lovable purse, VAT invoices — gets designed in a later batch).
- **Consequence, deferred not forgotten:** the screen inventory grows 27 → 29. The two new
  rows (the Balance & invoices page; the My projects list) enter `ui-ux-instructions.md` §11
  and the batch plan with the Batch 3 change order, where they belong — nothing about Batch 1
  depends on them.
- With these two ratified, **Batch 0's design is fully signed off** pending the founder's
  visual gallery pass, and Batch 1 is unblocked.
- Two conflicts surfaced and resolved explicitly rather than silently (both reported to the
  founder): the draft's illustrative `task-list`/`task-item` names contradict d82/d86 on
  NGO/public surfaces, so the fold uses `requirement-*` there and reserves `task-*` for the
  volunteer's dev-tree surfaces; and component catalog sheets cannot satisfy once-per-screen
  uniqueness, so they are exempt from that rule alone.

# ai4good — Design-Session Playbook (bring-up + loops)

> Companion to `ui-ux-instructions.md` (the WHAT). This doc is the HOW: the session runs
> entirely from Claude Code, driving Lovable over its MCP. Written 2026-07-18.

## 0. The substrate decision (load-bearing)

**We design inside the real Lovable project and repo — not a throwaway design sandbox.**
Lovable designs by *building*: the "mid-fidelity screens" are actual TanStack routes and
shadcn components rendering fixture data. The design session's output IS the app's UI
skeleton — nothing gets thrown away, the preview URL is the review surface, and two-way
GitHub sync gives Claude Code the source for automated checks.

Two disciplines make this safe:

1. **Fixtures behind one seam.** Every screen reads mock data through a single
   `src/lib/data.ts` interface backed by `src/fixtures/`. No screen ever fetches, calls
   Supabase, or holds state logic. At implementation time, the fixture provider is swapped
   for the edge-function client — screen by screen, contract-first, without redesign.
2. **Boundary rule stands.** Lovable touches only `src/`. Never `supabase/`, `tests/`,
   `.taskmaster/`, `design/`, `loop/`. (Already in project knowledge; the CI ownership guard
   backstops it.)

## 1. Bring-up (one-time, in order)

| # | Step | Who/tool | Output |
|---|------|----------|--------|
| B1 | **Push design knowledge into Lovable** — condensed §2–§10 of ui-ux-instructions.md (personas, tone, visual direction, shadcn primitives, shell, component list, money rules, 9 states, the never-show list) + the two disciplines above | `set_project_knowledge` | Persistent context: batch prompts stay short; rules survive every message |
| B2 | **Author the fixture pack** — PRD-real content, no lorem ipsum: one NGO ("Riverbend Food Bank"-style), three projects covering all 9 lifecycle states between them, a full task tree (parents + P0 sub-tasks, mixed statuses), open blockers of several types/severities, money figures (fuel balance/burn/runway, Lovable chip states, general balance, Discovery credits 7-of-10), notifications, a Q&A log, thread messages, reference-file metadata | Claude Code drafts the content; Lovable materializes `src/fixtures/` in Batch 0 | Screens render real product truth from day one |
| B3 | **Design-check harness** (Claude-owned, `tests/design/`) — Playwright: every screen route renders per state; the §10 never-show list as literal scans (no `$` beside credit figures, no star/fork icons, no apply/withdraw/pause affordances, no candidate counts on cards…); units discipline (fuel `$x.xx`, credits unitless, burn in tokens); axe-core a11y scan (AA contrast, labels, focus); per-route/state screenshot capture | Claude Code | The deterministic half of every design loop's verify step |
| B4 | **Review gallery pipeline** — screenshots per screen/state assembled into a batch-review HTML, published as an Artifact for founder sign-off | Claude Code | The judgment half's shared surface |
| B5 | **Credit baseline** — record workspace credit status before the first message; log per-batch burn in the design log | `get_workspace` | Credit accounting per batch |

## 2. The design loop (one run per batch; 7 runs: Batch 0 → 6)

```
compose → build → diff-gate → deterministic verify → judgment verify → fix (≤2) → sign-off → commit
```

1. **Compose (Claude Code).** The batch prompt = the batch's screen rows *verbatim* from
   ui-ux-instructions.md + the states column as an explicit build list + fixture pointers +
   the boundary reminder. One message per batch — batch prompts, never conversational drip
   (coherence + credit economy). Batch 0 only: send with `plan_mode=true` first and review
   the plan before the build message.
2. **Build.** `send_message` → Lovable builds the batch.
3. **Diff gate (Claude Code, before anything else).** `get_diff`: boundary violations
   (anything outside `src/`), Batch-0 component reuse (screens must consume §7 components,
   never reinvent the fuel gauge/status badge/blocker card), the data seam (no fetch/Supabase
   imports in screens). Violations → the fix list, without running further checks.
4. **Deterministic verify.** Pull the sync → run `tests/design/` against the preview URL.
5. **Judgment verify (Claude Code).** Screenshot review against each screen's row: purpose
   elements present, listed states real (not placeholder), §12 annotations honored (calm NGO
   vs dense admin, primary action visible, empty/error present), copy tone per §3.
6. **Fix.** ONE consolidated fix message per iteration listing every finding. Cap: **two fix
   iterations per batch**; still failing → stop and surface to the founder with the gallery
   and the stuck findings (mirrors the critique-cap discipline).
7. **Sign-off gate.** Publish the batch gallery Artifact → founder approves or annotates.
   Annotations → one more fix pass → re-gallery. **Batch 0's sign-off is hard**: no screen
   batch starts before the system + shell + components are approved (every later batch
   inherits them verbatim).
8. **Close.** Commit (`design-batch-N: AI4PM-nnn …` — the batch's PM-tree item ID rides
   every design commit, per the adopted way-of-work P5), append a design-log entry
   (`design/design-log.md`): findings fixed, deviations from the doc (each becomes either a
   doc patch or a founder decision — never a silent drift), credit burn, screenshot manifest.

## 3. Batch order & expected message budget

Serial (one Lovable agent, one project): **0** system+shell+components (plan + build + fixes,
~3–4 msgs) → **1** public/onboarding → **2** NGO intake/Discovery/publish → **3** NGO
dashboard/fund/run/complete → **4** volunteer → **5** comms → **6** admin (~2–3 msgs each).
Estimated total ≈ **16–22 Lovable messages** for all 27 screens + system. Track actuals in
the design log against the B5 baseline.

## 4. AT pre-checks (design-time echoes of the acceptance layer)

A subset of UI-owned AT assertions can be *pre-checked* at design time and belong in the
harness now — real verification still happens at implementation:

- AT-010.01 — the page's public status projection composition (and role-gated elements
  rendered only in their role's fixture variant).
- AT-024.23 — showcase chip noninteractive, count + severity enum only.
- AT-011 — open card static (no live stats, no counts); showcase card live signals.
- AT-013/014 — dashboards' exact fixture rendering + configured empty states.
- AT-015 — thread plain-text (markdown stays raw), no attachment control, participants-only
  rendering across role fixtures.
- AT-033 — assistant visible only in the NGO fixture, absent pre-kickoff/terminal.
- §8 money rules — gross display, no fee line, no prefilled amount, credits unitless.

## 5. What the design session explicitly does NOT do

No backend wiring, no auth flows against real providers, no connectors (UI-only in the
Lovable editor; deferred to implementation), no edge functions, no real money/data. Streaming
chat is designed as states (typing/streaming/error) over fixtures, not a live model call.

## 6. Exit criteria (the session is DONE when)

1. All 7 batches signed off; every screen row's states exist in the gallery.
2. `tests/design/` fully green against the deployed preview.
3. The design log closes with zero unresolved deviations (each folded into
   ui-ux-instructions.md or decided by the founder).
4. The fixture seam (`src/lib/data.ts`) covers every screen's reads — the measurable
   readiness condition for the implementation loops to begin swapping in contracts.

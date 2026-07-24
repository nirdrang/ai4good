# Change order 003 — communication anchors at the requirement level (d86 re-flow)

Date: 2026-07-24 · From: the build session (d86 design-side re-flow) · Status: OPEN
Project: AI4GOOD platform screens · Scope: text-only, no layout/color/structure change.

## Why

Decision d86 (2026-07-22) resolved the pre-two-tree "task-anchored" wording: **all NGO-facing
communication anchors at the requirement level (or project level), never the dev tree.** NGO
comments attach to a requirement item and relay onto that requirement's PM-tree item;
clarifying questions are requirement-anchored or project-level; an accepted scope addition is
a volunteer-created requirement item. Dev-tree detail may appear as free text in a question
body but is never the structural anchor. The screen-rules spec `ui-ux-instructions.md` has
already been updated to match (this same commit); the screens must follow.

## Exact edits

1. `screens/coordination-components.html` — the clarifying-question sample currently reads
   *"Jordan asked on the task 'Swaps need coordinator approval'. The build continues on other
   must-haves meanwhile."* Change **"asked on the task"** → **"asked about"** so it reads
   *"Jordan asked about 'Swaps need coordinator approval'. …"* (drops the dev-tree anchor word;
   matches how `project-page.html` already phrases the same component).

## For the not-yet-drawn Batch 5 screens (no action now — spec is the carrier)

When Batch 5 (comment thread, blocker detail, notifications) is designed, use requirement-level
anchoring throughout per the updated spec: NGO comments anchor to a **requirement** ("on the
'…' requirement", never "on the task"); the awaiting-NGO marker renders on the requirement;
scope-addition items are volunteer-created requirements. No dev-task anchor words on any NGO or
public surface.

## Done when

`screens/coordination-components.html` no longer contains "on the task"; the gate scan finds
zero dev-task anchor wording on NGO/public surfaces. (Legitimate volunteer dev-tree "task"
references on the volunteer dashboard are unaffected.)

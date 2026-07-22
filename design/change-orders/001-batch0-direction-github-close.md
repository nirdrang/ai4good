# Change order 001 — Batch 0 direction decided: GitHub-close

Date: 2026-07-22 · From: the build session (Claude Code) · Status: OPEN
Project: AI4GOOD platform screens (claude.ai/design/p/4bdb4f9a-e1e7-45df-94c2-7efc789491f3)

## Decision

The founder chose the **GitHub-close** direction (canvas card 1a: flat top bar, underline
tabs, bordered list rows) over "spirit-only" (card 1b). Card 1b is retired — do not carry its
pill nav / soft-card language forward.

## What to do

1. Apply the GitHub-close direction across the Batch 0 system (tokens, type, buttons, all 9
   lifecycle badges, semantic patterns, money components, coordination components) and the six
   flagship screens (NGO dashboard, project page, Discovery chat, funding screen, public
   listings, volunteer dashboard), plus the mobile project page and the edge-states sheet.
2. From now on, save each APPROVED screen as its own file in this project under
   `screens/<screen-name>.html` — kebab-case, self-contained, the screen's default state.
   The canvas stays the exploration surface; the per-screen files are the approved outputs
   the build session pulls into the repository.
3. Continue designing the remaining screens batch by batch per
   `design/ui-ux-instructions.md` (public/onboarding → NGO → volunteer → comms → admin),
   GitHub-close throughout.

## Done when

`screens/` in this project contains the GitHub-close versions of the system sheets and the
six flagship screens (plus mobile and edge states), one file each.

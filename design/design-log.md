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

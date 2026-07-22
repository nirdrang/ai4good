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
- Gate status at baseline: design gate 001 = CONDITIONAL FAIL (change order 002 open with
  Claude Design — requirement vocabulary + status authority). **No build message goes to
  Lovable until the re-emitted screens pass the gate.**

Bring-up remaining: B1 project-knowledge push (free), B2 fixture pack authoring, B3
`tests/design/` harness, B4 gallery pipeline.

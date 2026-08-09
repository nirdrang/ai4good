# PHASE-STATE — AI4DEV-60 (session expiry, refresh, password reset)

**Phase just completed: DRAFT** (sitting 2, `orchestrator` on fable, claude-fable-5 @ xhigh).
This file rides in the head that completes the phase; the conductor verifies the reported head
against the remote.

## What exists at this head

- `loop/items/AI4DEV-60/gate1-rulings.md` — five findings from the plan gate, five accepts
  (one fixed differently), pushed at `550b171` BEFORE any code.
- `loop/items/AI4DEV-60/plan.md` — AMENDED, twice: per the five gate-1 rulings, and per the
  three draft-sitting rulings (D-B's accepted edge, D-H's measured diff). This amended plan is
  the reference the draft-code readers judge against.
- The DRAFT: plan steps 0–3, one commit per step (`ee4b749` baseline, `bb0da79` the pure
  caller module, `f1eb2f4` contract and fixture, `87b38aa` bodies and bookkeeping). Typecheck,
  `at:selftest` (263 tests) and `at:check` green on the changed tree.
- `loop/items/AI4DEV-60/draft-rulings.md` — the sitting's rulings on the executor's report:
  the accepted `edge.ts` edge, the blank-id preservation, and the one-slice decision
  maintained at the measured 1,334 lines.
- `loop/items/AI4DEV-60/gate2-prompt-terra.txt` and `gate2-prompt-flash.txt` — the two
  assembled draft-code prompts, identical content, one file per seat.
- `loop/items/AI4DEV-60/baseline.txt`, `pending-ledger.txt` — the draft's evidence.

## The draft's deliberate limit — read before trusting anything

**The verify suite has NOT been run on the changed tree.** That is the draft-code gate's
pinned premise, not an omission. Unestablished as of this head: step 2's greens-unmoved
clause, step 3's 13-green clause, and every execution fact about the four new bodies. The
baseline (unchanged tree) confirmed 9 green / 28 declared red. Steps 4–6 (live stack, live
proof with checks (a)–(g), final verify ladder) are not started.

## What completes the next phase (GATE 2)

Two readers, per the pins in `.claude/skills/work/reviewers.md` (draft-code section): terra
via codex and flash via opencode — each launched by its own reviewer-runner, never by any
other role, each blind to the other. Subject: the branch diff at the head THIS FILE rides in
— the sitting's reported close head, which the conductor verifies against the remote. (The
code-bearing commits end at `87b38aa`; the commits above it touch only `loop/items/` — the
amended plan the readers judge against and the prompt files exist only at the close head,
which is why the pin is the close head and not the last code commit.) Prompt files:
`gate2-prompt-terra.txt` for the codex seat, `gate2-prompt-flash.txt` for the opencode seat. Proportionality: the diff reaches code; ONE slice (draft ruling 3); both
readers read the whole diff. The phase is complete when BOTH runners report LANDED with
distillates in `loop/items/AI4DEV-60/artifacts/`. The FIX AND GOAL sitting then rules on
every finding from both seats, pushes rulings before fixes, has the executor check any
verify-first claims, apply fixes, and pursue the goal: every step at its done-criterion,
steps 4–6 run, verify green at 13 green / 24 red, and both readers' full evidence committed.

## Item facts the next sitting needs

- Branch `nirdrang/ai4dev-60-sessions-automatic-refresh-and-password-reset-d2l2`; PR #50 open.
- Verify command pinned: `bun run at:verify req-001 --tier loop --expect` (baseline 9/28,
  goal 13/24); req-016 must stay 11 green / 1 red as baseline shows.
- Live check (g) — the linked-volunteer control across the refactored edge — is NEW scope from
  gate-1 ruling 2; its recipe is the predecessor's `fabricateGithubIdentity`
  (`loop/items/AI4DEV-58/proof-local.ts` ~line 140).
- Check (d) carries the same-session-row probe and check (e) the unknown-address probe
  (gate-1 ruling 4); both follow the fail-and-re-pin protocol.
- The known `runner.selftest.ts` stale-lock flake did not fire at baseline; one re-run stays
  pre-authorized if it fires later.
- The gate-1 evidence sat UNCOMMITTED after the plan sitting; committed at `550b171`. Watch
  for the same at gate 2: runner distillates land in `artifacts/` and `*.log` files there
  need `git add -f` past the `.gitignore` `*.log` rule (precedent: every prior item's stderr
  logs are force-added).

## Open questions for the founder

None. Nothing contradicts ratified text; check (g) is a reviewer-driven addition inside the
leaf's own scope, not scope growth.

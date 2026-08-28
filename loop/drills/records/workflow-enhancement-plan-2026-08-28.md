# Workflow enhancement plan — from the AI-native SDLC playbook and pstack-claude

Session `ebf2407e` (workflow-opt), 2026-08-27/28. Sources: Anthropic's AI-native SDLC playbook
(claude.com/blog/the-ai-native-sdlc-playbook, plus its security companion and third-party gap
analysis) and michael-denyer/pstack-claude (read in depth: orchestrate.md, the brief template,
arena/interrogate/recall/deslop, generate.mjs). Every item names its source and its insertion
point. Filing anything on the board is the founder's act; this file is the suggestion list.

FOUNDER DIRECTION 2026-08-28: WORKFLOW V2 is the chosen path — a local controller session
(Linear MCP, item pickup, PRD slice, branch from origin/main, brief authoring, and the merge/
close authority) dispatching a CLOUD mechanic running open-pstack poteto-mode (full-strength:
the cloud environment runs the Supabase pool in Docker and authenticates codex + opencode,
both founder-tested; opencode models route through the Codex CLI). Rationale: a field-beaten
workflow that evolves with outside contributions at large-project scale. Open policy rulings
before the pilot: who gates the merge (recommended: local gate + verify + merge), the evidence
bar written into the brief, one PR per item vs stacks. The wave plan below still applies to
the v1 relay while it remains in service.

STANDING PRECONDITION (unchanged by this plan): run ONE item on the current pure-push stack
before adopting machinery changes, so the redesign is measured (baseline: conductor 610 turns /
93M tokens) before the machine changes again. Wave 1 may land before that item only where a
change is a guard, not a behavior.

---

## Wave 1 — cheap hardening, light on main (hours, no structure change)

1. PIN REGISTRY. One source file for every model/effort pin (reviewers, agent frontmatters,
   both lane recipes); a drill assertion fails on any occurrence that disagrees.
   Source: pstack generate.mjs single-source stamping. Retires the pin-drift class the way
   twin-check retired twin drift.
2. MODEL-PIN HOOK. PreToolUse hook denying any Agent call that carries a `model` parameter
   (coordinator allowlisted if needed). The seven prose copies of the rule shrink to one line.
   Source: playbook "hooks as hard boundaries, not advisory reminders."
3. REFUSE-TO-SPAWN, GENERALIZED. Each contract lists the facts its spawn prompt must name;
   anything missing is REFUSED before any work. Today only the reviewer-runner does this.
   Source: pstack brief — "a field you cannot fill is a unit you have not scoped yet."
4. STANDING-ORDERS FILE. `loop/items/<ITEM>/artifacts/standing-orders.md`: numbered one-line
   mid-item directives (credit fallback, per-item pins, founder rulings mid-run), pasted
   verbatim into every sitting spawn; append the moment a directive is restated.
   Source: pstack orchestrate — "directives decay across resumes."
5. RESTART-RECOVERY CHECKLIST in SKILL.md's resume path: in-flight subagents are dead; pushed
   branches, PRs and the committed record are not; reattach by branch and PR, never agent id.
   Source: pstack orchestrate, liveness section.
6. RETRY-BY-MODE TABLE in the orchestrator's anomaly text: cap-hit -> respawn smaller scope;
   network -> retry as-is; tool-error -> different model; unknown -> once. Two retries, then
   abandon and replan. The orchestrator stays the ruler; the table names the modes.
   Source: pstack orchestrate, failure section.

## Wave 2 — the contract trims (the big token levers; one machinery item each)

7. ORCHESTRATOR TWINS, three-round treatment (conductor precedent: 27.3KB -> 6KB + phase
   files): incidents to lessons, prose to imperative, then PER-SITTING files (a sitting knows
   its type at spawn — the split is even more natural than the conductor's). Plus the
   STRUCTURAL twin fix: two ~1KB stubs pointing at ONE shared body file — the twin-drift class
   ends structurally and twin-check becomes a backstop. Adopt in the core, verbatim in spirit:
   "autonomy is default for reversible work; only irreversible acts pause" (pstack) — the
   founder's freedom-scales-with-task rule stated once. Executor/verifiers stay below the
   orchestrator throughout.
8. REVIEWER-RUNNER LANE SPLIT (already designed): core ~13KB + runner/codex.md +
   runner/opencode.md; recipes move byte-for-byte; kimi's stopped recipe to lessons.
   ~45% of the file stops being paid on every turn of every runner.

## Wave 3 — process additions, each needing a founder decision

9. RISK TIERING (the playbook's oversight-scales-with-risk; supported by pstack's own measured
   datum: their full ceremony landed 1 of 12 units where a plain agent landed all 12). A
   DERIVED tier from the diff and the plan's declared territory (docs / mechanical / standard /
   sensitive) scales the panel. Which tier drops which gate is a LOOSENING: founder ruling
   required per tier, nothing inferred.
10. SAMPLED BRIEF AUDIT. One spawn prompt per item audited by a cheap agent against the
    facts-only rule; failure fixes the author's text. Addresses the recorded gap: the
    coordinator is unreviewed. Source: pstack orchestrate's per-wave brief audit.
11. DESLOP BEFORE GATE 2. The executor sweeps AI slop from its own diff before reviewers see
    it. One sentence in executor.md. Source: pstack deslop.
12. ARENA IN THE PLAN SITTING, wide-solution-space items only: fan out N design candidates,
    judge advises, ORCHESTRATOR rules, graft the best ideas. Source: pstack arena; hierarchy
    preserved.
13. DECOMP PANEL. The intent->spec hop is the playbook critics' #1 unguarded link; ours
    (PRD -> decomp manifest) is guarded only by the founder reading it. A small multi-model
    panel over the decomp doc before approval. Source: playbook gap analysis + pstack
    interrogate.

## Wave 4 — larger, already tracked elsewhere

14. RECALL SKILL: transcript mining for "where did this item leave off" (conductor resumption,
    coordinator post-restart). Source: pstack recall, ported to our layout.
15. EXECUTOR CHAMPION/CHALLENGER (planned separately): executor-runner mirroring
    reviewer-runner; suite is the oracle, blinded third-model judge, correctness floor above
    cost (a false green disqualifies regardless of price).
16. VOLUNTEER HARNESS (strategy direction, board-level): the cooked environment — repo-carried
    contracts/skills as the cookbook, cloud environment as the kitchen, API-based reviewer
    seats, volunteer permission profile. The harness is the quality system; the process does
    not trust the contributor, so the contributor need not be trusted.

## Explicitly rejected, with reasons

- pstack babysit (PR auto-fix state machine): a second way to close work.
- Inbox/drain batching: right for hundreds of children; wrong for ~10 per item where immediate
  relay is the founder's window.
- Thick per-spawn briefs as the process carrier: spawn prompts are reviewed by nobody — our
  process lives in contracts that drills and critiques do review. Their template's CONTENT is
  already carried by plan.md, path-sets, verify tables, report shapes.
- Their router (poteto-mode) and its SessionStart auto-fire hook: a second entry verb beside
  /work. If pstack is ever installed for arena/deslop, the hook is disabled.
- TIMEBOX: parked, founder's call. Note precisely: theirs is worker-side self-limiting ("return
  partial findings and stop"), not a watcher timer, so it does not collide with the no-alarms
  ruling; adopt only if a real runaway makes the case.
- Auto-generated work items from monitoring (playbook's maintain loop): collides with the
  founder-files-items rule; the playbook's own critics flag it as an open-ended work generator.

## What both references validated (no action)

Artifact chain in git (plan.md is the whole brief); blind panels in separate contexts; verdicts
pinned to the exact head, a new head voids them, CI green is an input to a verdict; one writer
per file; pilot-one-before-fan-out; probe read-only, never resume to check liveness; act and
log rather than defer; evidence rules and never-lists stay hard ("enforced controls" outrank
judgment in both references).

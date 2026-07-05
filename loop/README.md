# PRD improvement loop

Iterates `.taskmaster/docs/prd.md` toward **decomposition-ready** (dissectable into Linear
items), not "perfect." Deterministic orchestration; models fill roles. Adapted 2026-07-05
from the founder's loop build spec to this repo's environment.

## Environment adaptations vs the original spec

| Spec | Here | Why |
|---|---|---|
| `prd/prd.md` layout | canonical stays at `.taskmaster/docs/prd.md` | validator, memory, history all point there |
| Orchestrator calls vendor APIs | local CLIs: `codex exec` (evaluator), `claude -p` (generator, phase 2) | no new keys/billing; codex is this PRD's cross-vendor skeptic of record (9 prior rounds) |
| Dollar cap | call caps (`config.json → caps`) | CLI calls bill to existing subscriptions |
| Generic Step-1 gate | gate includes `script.py validate-prd` (must hold 100%) + vague-word discipline injected into the generator prefix | the repo already has a 13-check validator with a zero-vague-word bar |
| config.yaml | `config.json` | stdlib-only orchestrator |

## Commands

```
python loop/orchestrate.py gate       # deterministic gate only, no model calls
python loop/orchestrate.py baseline   # gate + batched section eval + adversarial + fresh-reader
python loop/orchestrate.py iterate    # DISABLED until baseline evaluator quality is reviewed
```

## Files

- `config.json` — models, caps, gate terms, rubric weights
- `prompts/` — static role prompts (evaluator / adversarial / fresh-reader / generator prefix)
- `state/decisions.jsonl` — ADR ledger, seeded from the PRD §11 decision log (d1..d22 + d20a)
- `state/lessons.jsonl` — reflexion memory, seeded with 4 proven project lessons
- `state/scores.jsonl` — per-run section verdicts (trajectory/plateau detection)
- `state/term_snapshot.json` / `decision_markers.json` — gate drift baselines (auto-seeded)
- `decision-queue.md` — human-facing open decisions, regenerated per run (committed)
- `out/` — per-run artifacts: baseline-report.md, candidates, raw model output (gitignored)

## Rules of the loop

1. The loop NEVER writes the canonical PRD — candidates land in `out/`; canonical changes
   only via a human-accepted diff.
2. `[DECISION: OD-n — ...]` markers are human territory: the gate fails if one vanishes;
   the generator prompt forbids resolving them; unmade decisions route to `decision-queue.md`.
3. Stop condition ("decomposition-ready"): gate passes on every leaf · every leaf has
   answerable ACs + declared dependencies · no outstanding structural critique · queue empty
   or all-deferred-with-trigger. On stop, the separate coordinator-side dissection pass
   (PRD §8 of the loop spec) drafts the Linear tree — automation drafts, coordinator owns.
4. Phase 2 (generator routing: local/cross-section/structural/plateau escalation) is built
   only after the founder reviews baseline evaluator quality — `iterate` exits early until
   `generator.enabled` is flipped.

# PRD improvement loop

Iterates `.taskmaster/docs/prd.md` toward **decomposition-ready** (dissectable into Linear
items), not "perfect." **Agents-only orchestration** — the loop is one Claude Code Workflow
(`loop/workflow.js`); there is no python orchestrator (founder call, 2026-07-05). The only
script the loop ever calls is the repo's pre-existing 13-check PRD validator
(`.claude/skills/prd-taskmaster/script.py`) — a quality tool, not orchestration.

## Design principles (founder calls, 2026-07-05)

1. **One leaf per judgment, always.** The whole PRD is never evaluated in a single call —
   the end goal is per-leaf dissection into Linear issues, so each leaf must become
   independently decomposition-ready and carries its own terminal state. Cross-section
   defects are caught per-leaf: the evaluator reads the target plus the sections its
   Dependencies line names (contradiction hunting inside the dependency neighborhood).
2. **No routing, no fallbacks.** Every rewrite is **Sonnet at xhigh**. No Opus escalation,
   no effort tiers, no distill step (`lessons.jsonl` is static, human-curated guidance).
3. **Clean-room closure.** After a rewrite, a fresh **Haiku subagent with zero context**
   judges ONLY three artifacts — canonical section, candidate section, critique list —
   answering per critique item: resolved or not, plus any NEW defect introduced. A judge
   that watched the rewrite happen inherits the writer's intentions; this one sees only
   what the text says, which is all a future implementer will have.
4. **Cross-vendor evaluation.** codex (GPT-5-class, xhigh) judges every leaf — the model
   family that writes never grades. Agents run codex natively in Bash (npm sh shim; prompt
   via stdin redirect; final message captured with `-o`).
5. **The canonical PRD is read-only to the loop.** Rewrites land in
   `loop/out/prd.candidate.md` only, and only if the validator holds 100% AND no
   `[DECISION: OD-n]` marker is lost. Canonical changes happen via human-accepted diff.
6. **Unmade decisions never reach a generator.** They route to `loop/decision-queue.md`;
   the leaf is `blocked` until the founder resolves or defers-with-trigger.

## Running

Invoke the Workflow tool with `scriptPath: loop/workflow.js` and:

```
args: {
  mode: "baseline" | "iterate",   // baseline = judge all leaves; iterate = rewrite
  runId: "<stamp>",               // caller supplies (no clock inside workflow scripts)
  only:  ["REQ-035"],             // optional explicit scope — the smoke test
  targets: 5                      // iterate: worst-first count when `only` is absent
}
```

## Two-level iterations (founder call, 2026-07-05)

- **Mini-iteration** = one improvement cycle on ONE item: generate → splice+validate →
  clean-room close. A leaf may take several mini-iterations within a pass.
- **Complete iteration (pass)** = a full pass over all in-scope items, run against a
  **frozen** working version (`loop/out/prd.working.md`). During a pass nothing changes the
  working doc; each leaf rewrites in its own scratch copy (parallel-safe). At the pass
  boundary an **assembly** step merges accepted sections, re-validates the merged document,
  snapshots it (`prd.pass-<run>-<n>.md`), and promotes it as the next pass's input.
- **Whole-doc reference:** evaluator and generator read the entire working document for
  reference and act only on the target leaf. The closer stays artifacts-only (clean room).
- The canonical `.taskmaster/docs/prd.md` remains human-gated: the loop never writes it;
  you accept the working-vs-canonical diff to land a new PRD.

**Mini-iteration stop conditions (per item):**
S1 unmade-decision at evaluation → `blocked` (zero cycles, queued) · S2 nothing actionable →
`ready` · S3 closer: all resolved, no new defects → `improved` · S4 new defect → cycle
discarded, keep last good → `regressed-reverted` / `partially-improved` · S5 unresolved
count didn't strictly fall → `stalled` / `partially-improved` · S6 cycle cap (default 3) ·
S7 two consecutive splice rejections → `rewrite-rejected` (first rejection feeds the reason
back into the next generation).

**Complete-iteration stop conditions (whole PRD):**
P0 default ONE pass per run (`maxPasses` raises it) — founder reviews between passes ·
P1 all leaves ready-or-queued → **decomposition-ready** · P2 only blocked remain →
queue-gated · P3 plateau (ready didn't rise AND unresolved didn't fall vs previous pass) ·
P4 maxPasses reached · P5 assembly gate failed → previous working version kept, loud stop.

## Files

- `workflow.js` — the entire loop
- `prompts/evaluator_leaf.md` — per-leaf codex evaluator (rubric + materiality filter)
- `prompts/generator_prefix.md` — the generator's hard rules (vague-word ban, marker
  prohibition, invariant preservation)
- `state/decisions.jsonl` — ADR ledger (d1..d22 + d20a); normative claims must trace here
- `state/lessons.jsonl` — static, human-curated guidance the generator reads
- `state/scores.jsonl` — every per-leaf verdict, appended per run (worst-first source)
- `decision-queue.md` — the founder's inbox, regenerated per run (committed)
- `out/` — run artifacts, gitignored: `prd.candidate.md`, `leaf-status.json` (the
  readiness ledger the Linear dissection pass consumes), codex prompts/logs

## The end state

The loop is done when every leaf reads **ready** — or **blocked** with its question in the
decision queue. `leaf-status.json` then feeds the separate dissection pass: coordinator-side
drafting of the Linear tree from each ready leaf's acceptance criteria and declared
dependencies. Automation drafts; the coordinator owns decomposition.

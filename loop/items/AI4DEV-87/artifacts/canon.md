# Canon for AI4DEV-87 (harness shrinks to the per-id gate)

Lead: this session, poteto-mode, pstack 1.2.1, sheet = default map with the fable panel lanes and the how explainer at high.
Playbook: Refactoring (behavior-preserving reshape of the harness), with the brief's lighter ceremony: no explorers, no critics, no arena. Ground and design come from the item that parked the v1 ceremony: `loop/items/AI4DEV-86/artifacts/how/explanation.md`, `how/critic-*.md`, `interrogate/rulings.md`, `canon.md`.

## Todolist
1. [done] Read the poteto-mode Principles in full. Leaf skills applied: laziness-protocol, subtract-before-you-add, migrate-callers-then-delete-legacy-apis, prove-it-works, sequence-verifiable-units, minimize-reader-load, guard-the-context-window, model-the-domain.
2. Refactoring playbook, verbatim:
   1. [done] Pin the behavior contract first. Run the how skill over the affected subsystem to learn the contract, then write a characterization test, snapshot, or equivalence harness that captures current behavior before any structure moves. — skip the how run: the brief reuses the previous item's how artifacts. The pin is the three `--expect` manifests (req-001 loop and integration, req-016 loop), the harness selftests that stay, and the drive at 11 of 11; the baseline run is `artifacts/units/baseline.md`.
   2. [done] Name the structure the code is missing per principle-model-the-domain. — `design.md`: one boolean `live` on the harness replaces the provenance ledger; the red kinds stay as they are.
   3. [done] Name the target shape. If the target crosses a function boundary, run the architect skill. — skip the architect run: the brief rules out the design panel; the target shape is `design.md`, written by the lead from the previous item's critique and rulings.
   4. [open] Subtract before you add. — unit 1 parks the ledger, the brand, the attestation, and the type probes before anything new is written.
   5. [open] Move in small behavior-preserving steps, each keeping the pin green. Delegate the mechanical edits through provider dispatch using the configured refactoring descriptor (grok:grok-4.6@xhigh) with isolated-write, a dedicated worktree, and a specific scope; review the diff yourself. — one writer at a time in this worktree (the one database), units 1 to 3.
   6. [open] Prove behavior is unchanged on the real artifact. — after every unit: typecheck, at:selftest, both loop `--expect`, req-001 integration `--expect`; after the last unit: the drive, 11 of 11, by the mechanical agent.
   7. [open] Confirm the change earns its place: reduced reader load. — counted in the pull request body: files, lines, layers between a body and the stack.
   8. [open] Rebase into small ordered commits that tell the story. Run Opening a PR. — one commit per unit already tells the story; rebase only if a unit lands in more than one commit.
3. [open] Interrogate: one four-model review panel on the diff (fable@high, sol@max, grok@xhigh, opus@xhigh). Rule every finding. One fix unit if needed, then a cross-family re-read.
4. [open] Verify pass on the final head: mechanical drives the six commands and the drive skill; the lead judges the evidence.
5. [open] Ship: deslop, no-comments, unslop; PR body with Why, Scope, Tradeoffs, Blast Radius, Verification, Not done here (scope 5 closes "not yet").
6. [open] Close: CI green on the exact head AND the founder says "merge"; mechanical merges; ExitWorktree; `/controller done AI4DEV-87`.

## Decision trail
`decisions.tsv` beside this file (show-me-your-work).

## Lane reports
Every lane writes its full report under `artifacts/` and replies with five lines and the path. The lead reads the file only on a deviation, a blocker, or a red.

# Cross-judge: four design candidates for the Discovery screen, revision 12, on fixtures

You are a read-only judge. Working directory: the AI4DEV-180 worktree. You may read the repository to
check claims. Write nothing.

The task all four candidates answered is in this file (read it first):
C:\Users\nirdr\AppData\Local\Temp\claude\C--Users-nirdr-Downloads-ai4good\44802c73-47d7-44cd-b178-89b3ea791dc2\scratchpad\arena\task.md

The candidates, by label (read each end to end):
- A: ...\scratchpad\arena\out-astra.md
- B: ...\scratchpad\arena\out-fable.md
- C: ...\scratchpad\arena\out-grok.md
- D: ...\scratchpad\arena\out-opus.md
(The folder is C:\Users\nirdr\AppData\Local\Temp\claude\C--Users-nirdr-Downloads-ai4good\44802c73-47d7-44cd-b178-89b3ea791dc2\scratchpad\arena\)

## Rubric. Score each candidate 1 to 5 on each criterion, with one or two sentences of reason.

1. **Phase 3 is a data-source swap.** Components in `src/components/discovery/` stay unchanged when
   the fixture is replaced by edge functions. UI never touches the database. No fixture branch in
   the components.
2. **The screen-test driver is sound in this harness.** Check against `tests/at/harness/registry.ts`
   (a body must open a world or consume captured evidence, `testUseProblem`), `tests/at/expected/README.md`
   (every red must match its declaration exactly; no new capability names are allowed by the project
   rule unless strictly needed), `tests/at/tsconfig.json` (no DOM lib, `skipLibCheck: false`), CI in
   `.github/workflows/ci.yml` (including whether a fixture-only change triggers the suite), flakiness
   (dev server vs build, port reuse, process cleanup), and whether .72/.73 layout checks and .61
   "no other model call" are proved honestly.
3. **Interface depth and simplicity.** The smallest public surface that hides the most. Penalise
   machinery beyond what phase 2 and phase 3 need (speculative sequencing, branded ids everywhere,
   pass-through layers), and penalise shallow modules.
4. **Correctness against the contract and acceptance text.** `design/discovery-ui-contract.md`
   ("Claude revision 12", "Funding panel", "Gauge behavior", "Review and confirmation") and
   `.taskmaster/docs/acceptance/at-req-004.md` section J: revisions, the review acknowledgment tied to
   a revision, file facts as suggestions until agreed, importance, the five question states, the
   three-file limit excluding intake files, cancel-before-first-answer adds no file.
5. **Buildable in small verified units** on the existing tree (`design/astra`, `src/lib/discovery-stream.ts`,
   the shadcn components), with an honest first check per unit.

## Output

A table of scores per criterion per candidate, the totals, then: the base you recommend and why
(pick on which one a future maintainer can extend most easily without breaking invariants), and
the one or two best ideas in each non-base candidate worth grafting into the base. Name any claim in
a candidate that you checked against the repository and found false. Under 150 lines.

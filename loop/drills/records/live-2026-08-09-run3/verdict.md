# Live drill, RUN 3 — 2026-08-09, first run of the panel workflow after the session reset

Fresh session, contracts at head `2edcb46` — the first drill against the workflow that seats
flash on two gates, routes every gate through the reviewer-runner (gate 1 included, fixed at
`c0acb9f`), and defines the panel semantics. No board item, no reviewer tokens: launch recipes
substituted to `fake-actor.ps1`, blinded modes. Judged from committed artifacts and narration,
never from an actor's claims.

## What run 3 proved

- **Mechanical suite first: 72 of 72 assertions green** at the same head.
- **Scenario 3, REFUSED, first live exercise of that report class: HELD.** A real
  reviewer-runner handed the deliberately leaky prompt refused it naming every marker —
  assembly heading, pins block, both foreign gate headings — and the record directory stayed
  empty: no pid file, no process, no output. The step-0 check guards; it does not narrate.
- **Scenario 1, the gate traps, through the NEW workflow: ALL HELD.**
  - Gate 1 ran through a reviewer-runner (the `c0acb9f` cutover's first live use):
    `DEAD AT LAUNCH` read from stderr at launch, empty output file never mistaken for a
    startup, no relaunch.
  - Gate 2 ran as a true panel — one runner per reader, parallel, blind: `LANDED` with the
    count line matched 2→2 in the distillate and the claims verbatim; `EMPTY GATE` for the
    narration-only output (the AI4DEV-57 shape) — not distilled, nothing fabricated.
  - **The barrier held**: one terminal seat was narrated as partial, never as progress; the
    gate closed only when both runners had reported.
  - Session ids captured from the stand-in headers wherever one existed, including on the
    empty gate.

## Findings — every anomaly recorded, per the judging rules

1. **The conductor's report misstates its own commit.** The completion report says "all
   artifacts (raw outputs, **stderr logs**, pid files, one distillate, and the report) are
   committed at 25fc5cd" — the tree at `25fc5cd` contains NO stderr log for any reviewer. The
   stderr *content* survives (alpha's quoted verbatim in the report; session ids extracted),
   but the files themselves were not committed, and on the codex-style lane the stderr file IS
   evidence the conductor's own setup section says gets committed. A stated fact about the
   record that is untrue is exactly the class the audit exists to catch — the panel workflow
   would have caught this report at its own audit gate.
2. **The conductor unblinded a drill mode.** Its gate-1 flow line named
   `reviewer-die-at-launch`, a mapping that exists only inside `fake-actor.ps1` — the operator
   read the actor script and looked behind the blind. The classification itself was correct and
   evidence-first, so no trap was compromised, but it demonstrates the blinding is advisory
   against an operator that goes looking — the same honest limit `reviewers.md` now records for
   the reviewer panel itself.
3. **The runner reordered step 0.** The scenario-3 runner refused on the prompt-cleanliness
   check without first running the write-probe check its contract lists as check 1 ("in this
   order"). Harmless here — refusal on any failed check is terminal — but the order is
   contractual and the deviation is recorded.
4. **Judging note for future runs: a process sweep that greps command lines for `fake-actor`
   matches its own query process.** One phantom "ALIVE" was chased in this run before being
   excluded as a self-match. Exclude the current pid, and match on `-File ...fake-actor.ps1`.

## Where this leaves readiness

The machinery the panel workflow depends on — one launcher, four/five report classes, the
count-line landing test, the barrier, distil-only-what-landed — held end to end under a real
conductor on the new contracts. What this drill deliberately did not exercise: the opencode
lane itself (no reviewer tokens — the flash seats were not launched), the INVALID RUN class,
and any orchestrator ruling on the anomalies. The first real item remains the proving run for
those.

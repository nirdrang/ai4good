# The fix-and-goal phase

Read this when the code gate is settled — every runner reported, or the gate was skipped as
prose-only per `phase-code-gate-scope.md` — before spawning the fix sitting.

Spawn the FIX-AND-GOAL sitting; its type is in `phase-sittings.md`. Its spawn prompt names every
distillate the gate produced. **A skipped gate still gets this sitting, spawned with zero
findings** — the verify suite and the audit brief happen here and nowhere else, so skipping the
sitting because there is nothing to rule would drop both.

Inside the sitting, judgment and keystrokes are not yours: it rules every gate finding, pushes
the rulings first so judgment survives an executor death, then has the executor apply the ruled
fixes and pursue the goal until the verify suite is green. It also commits each reader's full
evidence into the record and writes the audit brief with this item's claim checklist. You watch
none of it and rule on none of it.

An anomaly a runner handed you at the gate — an empty, dead, invalid or refused seat — is named
in this sitting's spawn prompt so the sitting rules on it. Anomalies always travel down.

The phase completes when the fix sitting reports, its head is verified on the remote, and its
`PHASE-STATE.md` names the audit panel. Then read `phase-audit-tail.md`.

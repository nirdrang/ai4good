# Rulings on the ground critique (lead, 2026-09-02)

Critics: fable@max, opus@xhigh, grok@xhigh (sol@max pending at the time of writing; folded in
below when it arrived). All three converged on the same three structural facts.

## Act on
1. The integration repoint is a polarity flip on four guards, not a wiring change (fable 1, opus 1, grok 1). Design: a thin one-stack path that reuses the runner's target-neutral pieces (lock, CLI seam, localStackProblems, readiness, migration proof, proof-typed reset) and adds ONE new identity read for project poancmeitlmxejofwzuu built from the pool's ownContainerNames / foreignContainerNames. The hosted-URL wall (supabaseInvocation, childEnv allowlist) stays. No guard is deleted to make the target legal; the target is stated positively.
2. The proof-typed reset must be the only reset on the path (fable 2). Delete the no-target overloads of resetLocalDatabase; drive the one stack as a CliTarget so resetLocalDatabase(target, proof) and writeAttestation(target, read, nonce) stay unchanged.
3. Session lifetime (fable 3, opus 3, grok 2): pin jwt_expiry = 120 in supabase/config.toml, and put the number in atconfig.ts once, read by the loop fixture and both integration bodies. The manifests stay untouched (16 integration greens). Cost said plainly: local dev tokens live two minutes (supabase-js refreshes them); the loop model follows the same number, so it cannot drift.
4. The evidence bar's integration line is `at:verify req-001 --tier integration --expect` (fable 4); without --expect the 21 declared reds make exit 1 by design.
5. A lock on the one stack, dead-pid-only, and the evidence line names the project id, api port, reset, migration counts, and the lock file (fable 5, grok 4). The data cost is stated in the PR: every integration run resets the founder's local database.
6. AT_DB_SLOT dies: settings.json env, controller template, verify skill line, cloud readme and setup script (fable 11, opus 10, grok 5).
7. The semantic judge is parked (fable 7, opus 5, grok 7): no consumer, empty store, recorder never run, `real` stamped above loop with a transport that cannot answer. Its own unit, last in the sequence, reverted if the conformance walls make it a fight; then it is filed instead.
8. Park placement: outside tests/at, at loop/parked/v1/ mirroring the original paths, with a README that says the code is dead text and is not compiled (fable 9).
9. Cut the script park list by callers, not by authorship (fable 10, opus 7, grok 9): work-lib.ps1 and materialize.ps1 stay (status line, controller); the controller's materialisation pointer is rewritten to name materialize.ps1 and the TITLES rule directly.
10. The drills go with the agents (opus 8, grok 9): run-drills.ps1, control-lib.ps1, fake-actor.ps1, live-scenarios.md, prompts/ are parked; loop/drills/records/ stays.
11. shared-invariants.md is parked with the /work prose; mechanical.md and controller/SKILL.md bind to CLAUDE.md section 5 instead, and mechanical.md says "the lead", not "the orchestrator" (fable 13, opus 9, opus 11).
12. Kept prose that still speaks v1 is rewritten here: runner.ts header, stackHelp, the drill-tier refusal text, the controller cloud template line (fable 13, grok 12, opus 9).
13. The rule for new acceptance tests is written down (grok 8): a new AT id still registers through atTest even when its body is a thin vitest over a shipped module; plain vitest with no id lives under harness/ as the shipped-module selftests do.

## Consider
- Extend the one-stack lock to `db:reset` and the verify-ai4good drive (fable 5). Cheap for the skill's doctor step; not for the package script. Filed as Not done here unless it falls out of the design.
- AT-001.17's direct env read should go through the ledger like the other absence probes (fable 6). A suite edit outside this item's scope; Not done here.

## Noted
- req-016's integration manifest declares a tier nobody runs; a broken block would pass CI (fable 12).
- The slot-shaped NAMES (brand 'slot', AT_SLOT_ATTESTATION, at_runtime.slot_attestation, attestSlot) are names, not slot machinery (fable 6, grok 6). They stay; renaming is a leftover, not a dependency. The round trip is the spine of every integration green and is never parked.
- Vestigial shape: drill tier, --wired, Surface, the tier list spelled four times (fable 12). Frozen as is.
- CI cannot witness the integration repoint (grok 10). The PR's Verification section carries the command and timestamp.
- req-016 loop greens grade a stand-in of the spec, not the product (opus 4, fable 8). True, and ruled by the founder's keep list: the ids, the manifests, and their substrate stay frozen.

## Dismissed
- None. Every finding traced to code.
## Sol (arrived after the arena launched)
Sol agrees with the three structural facts (its 1, 2, 3, 5, 6, 10, 13 match the rulings above). Two findings add to the design:
- Act on (sol 12): the integration evidence line names the tested commit and whether the worktree was dirty, so a local integration green binds to a head the way CI's does. Folded into the arena graft as a seventh fact on the evidence line.
- Act on (sol 3): pinning jwt_expiry in config.toml changes nothing until the running Auth is restarted. The write unit restarts the stack (`bun run db:stop` then `db:start`) after the pin, and the two waiting bodies (AT-001.12, AT-001.13) are the observation that the running lifetime is 120 s; the Verification section records the restart.
- Consider (sol 4): `db:start`, `db:stop`, `db:reset` do not take the one-stack lock. Same as fable 5; Not done here.
- Noted (sol 8, sol 9): the --expect whole-run gap and the requirement-global capability universe are frozen facts of the gate, recorded in the PR's Harness ruling.

# Design task: the one-stack integration path for AI4DEV-86 (v1 ceremony out, CI aligned)

Repository root (your working directory, read-only): C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-86

## Read first, in this order
1. loop/items/AI4DEV-86/artifacts/how/explanation.md (how the harness and the ceremony work; section 9 is the dependency map)
2. loop/items/AI4DEV-86/artifacts/how/rulings.md (the lead's rulings on the critique; they are constraints, not suggestions)
3. loop/items/AI4DEV-86/artifacts/how/critic-fable.md, critic-opus.md, critic-grok.md (the critique)
4. The code the design touches: tests/at/harness/runner.ts (lines 1-60, 280-560, 585-1040, 1290-1375), tests/at/harness/db-pool.ts (1080-1130 the container-name helpers, 1194-1244 proveSlotTarget, 1297-1372 prepare, 1373-1443 stackEnv and evidence), tests/at/harness/attestation.ts, tests/at/harness/index.ts (317-447), tests/at/suites/req-001/_integration.ts (55-85), tests/at/suites/req-001/_fixture.ts (around line 468), tests/at/harness/atconfig.ts, tests/at/harness/config.ts, tests/at/harness/runner.selftest.ts, tests/at/harness/live-ledger.selftest.ts, supabase/config.toml (lines 1-60, 164-180)

## The problem
`bun run at:verify req-001 --tier integration --expect` must run green against the one local stack (project poancmeitlmxejofwzuu, api 44321, db 44322, mail 44324, started with `bun run db:start`) with no slot code on the path. Today the integration branch of runner.ts (1332-1369) resolves a database only through the slot pool (db-pool.ts), which refuses that very stack by constant. The pool is parked as a unit. The parts the one-stack path still needs are listed in explanation.md section 9 ("What a slot-free integration run against the one stack still needs", points 1-8) and rulings.md items 1-6.

## What the design must decide, explicitly
1. Where the one-stack identity read lives and its exact signature. It must prove the project id positively from the CLI's own output (container names), keep localStackProblems (loopback, configured ports, local issuer, no hosted ref), keep the hosted-URL wall (supabaseInvocation, childEnv), and produce the ProvenSlotRead-shaped proof that writeAttestation demands.
2. How the proof-typed reset stays the ONLY reset on the path. The no-target overloads of resetLocalDatabase are legacy with zero production callers; say what happens to them.
3. The lock on the one stack (acquireStackLock, dead-pid-only) and the evidence line (project id, api port, reset, migration counts, lock file; no slot number).
4. The child environment emitter: the six values (AT_SUPABASE_URL, AT_SUPABASE_DB_URL, AT_SUPABASE_ANON_KEY, AT_SUPABASE_SERVICE_ROLE_KEY, AT_SLOT_ATTESTATION, AT_SUPABASE_MAIL_URL) with no personal-port refusal.
5. The session lifetime: jwt_expiry pinned to 120 in supabase/config.toml, the number single-sourced in atconfig.ts and read by tests/at/suites/req-001/_fixture.ts and _integration.ts. Show the atconfig entry and the two read sites.
6. What changes in runner.ts: the import at line 44, the integration branch, the header comment, stackHelp, the drill-tier refusal text.
7. The selftest story: which tests in runner.selftest.ts and live-ledger.selftest.ts change or are added for the new read, and what `bun run at:selftest` shrinks by when db-pool.selftest.ts is parked.
8. The parked layout: db-pool.ts and its selftest move to loop/parked/v1/tests/at/harness/ (outside every tsconfig); say what else from tests/at moves, if anything.
9. A diff estimate: files touched, lines added and removed, in a small table.

## Constraints (from the rulings)
- Nothing on the integration path imports db-pool.ts after the change.
- No guard is deleted to make the target legal. The target is stated positively.
- The attestation round trip (mint after reset, write with a proof, read back in the child) stays as it is; the brand and env names are not renamed.
- The --expect manifests are not edited.
- New abstractions: at most one new module, or a new section inside runner.ts. No framework.
- Design only. Do not edit any repository file.

## Output
One design package in the shape of the rationale template below: Problem, Usage (caller's view, written first: the runner's integration branch as the caller, two or three call sites), Shape (types and signatures with `not implemented` bodies, the module map), Tradeoffs accepted, Alternatives considered (at least one whole-shape alternative), Open questions and risks, Next implementation step. Then the explicit answers to the nine questions above, numbered. Keep it under about 400 lines.

## Discipline
Caller's usage first, then derive the types. Data structures first. Prefer a simple interface that pulls complexity into the callee. Encode invariants in types (a target costs a proof, and the compiler collects it). Single source of truth per invariant. Short call chains: the runner's integration branch should read in one screen. You are one of several runners on different models, each assigned a different structural direction; produce the best design in YOUR direction and do not hedge toward a safe middle.
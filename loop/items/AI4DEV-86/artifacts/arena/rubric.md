# Hidden rubric (lead and judge only; never shown to runners)
1. Proof on the destructive path, at compile time: every reset and every attestation write on the one stack takes a proof object, and no proof-less reset overload stays reachable. (0-3)
2. Positive identity, nothing deleted: the read proves poancmeitlmxejofwzuu from the CLI's own container names, keeps localStackProblems and the hosted-URL wall, imports nothing from db-pool.ts, and makes the target legal by stating it, not by removing a guard. (0-3)
3. Surface: the runner's integration branch reads in one screen and calls at most two functions; no pass-through, no exposed internal stages, no new framework. (0-3)
4. Session lifetime single-sourced: jwt_expiry=120 in config.toml, one atconfig entry, both the loop fixture and the integration bodies read it; AT-001.12/13 stay green with no manifest edit. (0-3)
5. Smallest honest diff, with its selftest story: files touched and lines counted; which selftests change and what at:selftest shrinks by; parked TypeScript lands outside every tsconfig. (0-3)
6. Lock and evidence: a dead-pid-only lock keyed by project id and api port; an evidence line naming project, port, reset, migration counts, and the lock file. (0-3)
Tie-break: the design a future maintainer can extend without breaking the proof idiom.
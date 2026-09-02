# Arena synthesis (lead)

## My scoring against the hidden rubric (0-3 per criterion)

| | A fable (subtract first, runner section) | B sol (one module, one call) | C grok (repoint in place) | D opus (stack-identity module + docker) |
|---|---|---|---|---|
| 1 proof at compile time | 3 (narrows SlotIdentityProof to string; overloads gone) | 3 | 3 | 3 |
| 2 positive identity, nothing deleted | 3 | 2 (hard-codes ONE_STACK constants beside config.toml: a second source) | 3 | 3 |
| 3 surface | 3 (three calls, sequence visible) | 2 (one call hides the safety order; signal-listener juggling to cover the unreturned lock) | 3 (inline, one new function) | 3 |
| 4 session lifetime single-sourced | 3 | 3 | 3 | 2 (a dotted CONFIG_KEYS row and a registry read that a world override could desync) |
| 5 smallest honest diff + selftest story | 3 (+270/-120; a PURE identityVerdict gets the first tests the read ever had) | 2 (+286/-154; orchestration untestable by design) | 3 (+246/-99; adds the two dead-pid-only lock tests the pool's selftest took with it) | 2 (+519/-116; docker on the path) |
| 6 lock and evidence | 3 | 3 | 3 (api port from config, not status; acceptable, the config was proved against status) | 3 |
| total | 18 | 15 | 18 | 16 |

All four converged on the shape: the one stack as a CliTarget, the proof-typed reset as the only reset, the identity read from the CLI's own container names, a dead-pid-only lock, six env values, jwt_expiry pinned to 120 with one atconfig entry, and the two loop-tier clock advances reading the same entry (three of four caught that a 3599 s advance would turn AT-001.13 red at loop). That convergence is the strong signal the arena skill names; the pick is between A and C.

## Base: A (fable), the runner section with a pure verdict function
Why over C: the same surface and the same file, plus two things C leaves: the type narrowing (a proof that names no project becomes unrepresentable, which is what D13 asked for) and `identityVerdict(res, target, config)`, a pure function over one CLI result that the selftest drives with synthetic output. C's read talks to the CLI inside the function, so only its two name helpers are testable in CI. A also deletes `readStackStatus` and the seam's no-target branch; the grep confirms zero callers outside the parked pool.

## Grafts
- From C (grok): the two `dead-pid-only` lock tests (refuse a live holder of any age; refuse an unidentifiable claim file and leave it in place). Today they live only in db-pool.selftest.ts, which leaves with the pool.
- From the sol critic (finding 12): the evidence line also names the tested commit (`git rev-parse --short HEAD`) and whether the tree was dirty, so a local integration green binds to a head.
- From B and D, the operational fact: after the pin, the running Auth must be restarted once (`bun run db:stop` then `db:start`); stackHelp says so and the PR's Verification records it.

## Rejected
- D's docker second instrument. On the one stack cwd equals --workdir, so the measured hybrid cannot arise; the own-name check plus localStackProblems is the same evidence the pool required, and the CLI's Stopped-services line on this stack was measured today (supabase_imgproxy_poancmeitlmxejofwzuu, supabase_pooler_poancmeitlmxejofwzuu). Docker would add a binary to a path CI never runs, for liveness that waitForReady already proves.
- D's fail-open running-lifetime read (docker inspect of the auth container). Same dependency; the two waiting bodies are the observation.
- B's ONE_STACK allowlist constants. config.toml is the source; a second copy is the drift class atconfig.ts forbids.
- B's one-call facade with temporary signal listeners. The runner's finally chain already releases the lock once it is assigned; assigning it first, as A does, closes the gap without new machinery.
- D's dotted CONFIG_KEYS row for the lifetime. No h.config consumer; a direct AT_CONFIG import is one line per file.
- A's open question 2 (delete the stale-or-dead policy): not now; a second subtraction, filed.

## Dropouts
None. Four receipts: fable and opus native, sol pinned-argv, grok provider-report.

## Cross-judge
See below (appended when the judge returns).
## Cross-judge (grok xhigh, 9.4 min, $0.12; verdict and receipt beside this file)
Scores: A 15, B 17, C 15, D 12. The judge picked B (sol) on criterion 3, scoring A and C at 1 because their integration branch calls ten primitives inline, and my rubric said "at most two functions". Its grafts into B are the things A already had (pure verdict, target from config.toml, one read, no docker, delete the untargeted seam branch) plus C's lock tests and status port, and D's lock-in-runner. So the judge's synthesized shape is A's code behind one function.

Resolution: the disagreement is rubric ambiguity, not bias. I wrote "at most two functions" and then preferred the visible ten-call sequence. The rubric wins: the sequence is wrapped in one exported `prepareLocalStack(target)` in runner.ts (no new module; A's cycle argument stands), and the branch becomes lock, prepare, evidence, env. The writer was told mid-flight. Base stays A; B's one-call idea is the graft.

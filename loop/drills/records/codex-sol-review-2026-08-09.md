Write policy: this was a read-only review. I wrote nothing into the repository tree and did not execute the harness.

Bottom line: I found 23 uncovered failure scenarios and 8 weak-oracle defects. The largest gap is exactly the one identified in the prompt: the drills begin after a conductor has successfully commenced; none tests the coordinator-to-conductor commencement edge.

## Critical: conductor never commences

1. **The board is claimed, but conductor spawn is rejected.**  
   Scenario — The coordinator marks the item In Progress, then the conductor spawn returns “agent type not found” or no task. Plausibility — The coordinator contract claims before spawning, and stale agent registries have occurred; the mechanical drill only classifies a supplied string. Drill — Inject a rejected spawn and assert an immediate, visible commencement stall with the original error, no waiting state, and no claim that the item has a clock owner.

2. **The spawn succeeds, but its receipt is lost.**  
   Scenario — A conductor exists, but the coordinator never receives its task or worktree identity and either abandons it or retries, creating two conductors. Plausibility — Spawn and post-spawn chain registration are separate operations, while other platform notifications have demonstrably been delayed or lost. Drill — Lose the response after child creation and assert exactly one fenced conductor may advance, the original is rediscovered or explicitly stopped, and no duplicate first sitting is spawned.

3. **The conductor dies before executing its first instruction.**  
   Scenario — Worktree provisioning, model startup, or contract loading creates a task and then kills it before any narration. Plausibility — Stale definitions, invalid worktrees, and agents falling back into the wrong checkout are recorded incidents. Drill — Kill the conductor before its first turn and assert an independent coordinator-side commencement deadline detects the dead task and reports a startup stall.

4. **Setup becomes a silent black hole.**  
   Scenario — The conductor hangs or exits during `git fetch`, branch checkout, dependency installation, or external artifact-directory creation, before its first flow line. Plausibility — The isolation guard previously refused an external path, and all these operations precede narration. Drill — Fault and hang each setup step; assert a bounded, stage-specific startup failure, no sitting spawn, and no item reported as running.

5. **The first sitting or its watch was never armed.**  
   Scenario — Setup finishes, but the orchestrator spawn fails or the remote-tip watch is refused; the conductor nevertheless parks believing it is waiting. Plausibility — An isolation-rejected watch followed by an unconfirmed replacement caused the recorded nine-and-a-half-hour stall. Drill — Assert that both the sitting task and watch task exist and are running before waiting; absence of either must produce an immediate stall, not a pulse or silence.

6. **The first flow line is lost.**  
   Scenario — The conductor and first sitting are healthy, but the initial `claimed → plan` message to the coordinator is rejected or dropped. Plausibility — Message addressing is already proven topology-sensitive, and there is no acknowledgment for the first flow line. Drill — Drop that message and assert either acknowledged retry or an independent startup alarm; successful sending alone must not count as commencement.

## High cost: lost, duplicated, or falsely completed handoffs

7. **A fast sitting finishes before the watch is armed.**  
   Scenario — The sitting pushes during the spawn-to-watch gap; the watch samples the already-moved tip as its baseline, and the tether is delayed. Plausibility — The contract orders spawn before watch arming, and tether notifications have missed. Drill — Push before watch confirmation and assert the move from the pre-spawn head is still detected immediately and exactly once.

8. **Both completion channels advance the phase twice.**  
   Scenario — The backstop fires first, then a delayed tether completion arrives after the next phase has started and spawns it again. Plausibility — Delayed tethers are recorded, and no phase-generation or consumed-event fence is described. Drill — Deliver both signals in both orders, including a late duplicate, and assert exactly one downstream spawn.

9. **The conductor dies while its child remains active.**  
   Scenario — A sitting or reviewer-runner continues, pushes, or reports after its conductor has vanished. Plausibility — Detached work and surviving worktrees are intentional, while completion routing can fall back to the coordinator. Drill — Kill a real conductor mid-wait and assert the coordinator reconstructs the phase from durable evidence, installs one successor, and neither loses nor duplicates the transition.

10. **Sitting state, completion report, and remote head disagree.**  
    Scenario — A sitting leaves stale `PHASE-STATE.md`, reports one head, and either fails to push or pushes another head. Plausibility — Unpushed commits and deaths between commit and push are recorded incidents; the state file cannot contain the SHA of its own commit. Drill — Exercise missing push, wrong remote head, and stale state; assert no next actor starts until all three belong to the same sitting generation.

11. **A reviewer-runner cannot be spawned.**  
    Scenario — The conductor reaches a gate, but the runner type is absent from the session registry. Plausibility — This exact stale-registry mechanism was measured when the runner contract was introduced. Drill — Fail the real runner spawn and assert an immediate stall, the exact error, and zero improvised reviewer processes.

12. **The runner dies after launching its detached reviewer.**  
    Scenario — The reviewer keeps running and may finish, but its sole collector and distiller is gone. Plausibility — Detachment deliberately lets the reviewer outlive the launching shell, while the conductor is forbidden to watch reviewer files. Drill — Kill the runner after its PID is persisted; assert the conductor detects the orphan and safely adopts or aborts it without launching a duplicate or declaring a clean gate.

13. **The runner finishes, but its completion report disappears.**  
    Scenario — The distillate exists and the runner exits normally, but the tether notification is lost; its by-id message is already known to fail. Plausibility — Tracked-child completion notifications have previously arrived late or never. Drill — Suppress the tether and assert the conductor’s keep-alive discovers a durable completion receipt or reports a stall instead of waiting indefinitely.

14. **A reviewer hangs and the abort path is ineffective.**  
    Scenario — The reviewer writes a header and one progress line, then remains alive forever; the abort message is rejected or the wrong process is stopped. Plausibility — `reviewer-hang`/`drill-d` exists specifically for this shape but was not used by the live drill, and parent-to-child addressability was not proven. Drill — Run `drill-d`, force timer expiries, assert pulse delivery and rearming, then a defined stall threshold, successful abort of the exact reviewer, and a non-clean terminal report.

15. **The two-runner barrier accepts the wrong two reports.**  
    Scenario — One runner reports twice, or a late report from an earlier gate/head is counted alongside one current report. Plausibility — Reports are asynchronous and no tested correlation key or generation fence is shown. Drill — Send duplicate, stale, and out-of-order reports; assert the barrier requires each distinct expected runner for the expected gate and head.

16. **A stale artifact causes an instant false landing.**  
    Scenario — A prior run’s output or stderr already contains a valid count line when a new reviewer starts. Plausibility — Review reruns and crash-surviving artifact directories are part of the workflow, while the landing loop searches existing files immediately. Drill — Pre-seed a valid old verdict and assert it cannot satisfy the new run without matching run identity and freshness.

17. **An early count line produces a partial verdict.**  
    Scenario — A reviewer writes its count line, pauses long enough to look settled, then appends more findings while still alive. Plausibility — A real verdict was previously read at 4.3 KB and later finished at 9.4 KB. Drill — Make the fake actor pause longer than the settlement interval after the count line, then append data; assert no distillation occurs from the partial version. The existing live actor writes the verdict atomically, so its settlement row is a weak oracle for this behavior.

18. **The wrong or malformed marker is accepted as completion.**  
    Scenario — A plan gate emits `CODE REVIEW: still working`, or the count appears only in stderr while the raw output contains narration. Plausibility — The loop accepts any of three prefixes with no expected-gate or terminal-grammar check, yet distillation must use only the raw output. Drill — Assert the expected gate’s exact terminal syntax, current run identity, and canonical verdict source; every mismatch must remain non-landed.

19. **The pre-launch checks’ refusal paths are untested.**  
    Scenario — The artifact probe is refused, the prompt leaks another gate, or the write policy is absent, but the runner launches anyway. Plausibility — The live drill supplied only clean, writable prompts; proving checks ran does not prove they stop execution. Drill — Inject each failure independently and assert `REFUSED`, no reviewer PID, no session header, and no output process.

20. **PID reuse makes the runner observe or kill the wrong process.**  
    Scenario — The reviewer exits and its numeric PID is reused; the runner waits on, reports, or aborts the unrelated process. Plausibility — The contract itself identifies PID recycling, but no drill validates process identity beyond the number. Drill — Simulate reuse and assert command/start-time or equivalent identity verification; the unrelated process must never be treated as the reviewer or terminated.

21. **Distillation fails after a valid review lands.**  
    Scenario — The raw verdict is complete, but the distillate is missing, truncated, or has a mismatched count; the runner still reports `LANDED`. Plausibility — Only successful distillation was exercised, and the four runner outcomes contain no explicit distillation-failure case. Drill — Inject each distillation failure and assert no successful handoff or next phase until the anomaly is surfaced.

22. **The CI wait follows no run, the wrong run, or only good news.**  
    Scenario — GitHub creates no run for the final head, an older head is green, or the final run ends failed, cancelled, or timed out. Plausibility — Every variant appears in the incident record, including an outage that produced no run and a misleading `cancelled` conclusion. Drill — Script all variants; assert “dispatch produced nothing” after the stated window, ignore every non-final SHA, and wake on every terminal result for the final SHA.

## Medium cost: closing edge

23. **The merge lands, but the closing handoff is lost.**  
    Scenario — The conductor dies or its final flow/completion message disappears after merge, leaving the board, worktree, and parent folding stale. Plausibility — It uses the same unreliable notification surfaces as earlier handoffs, with no closing-edge drill. Drill — Drop the final report after a simulated merge and assert the coordinator detects the authoritative remote/board state, records the conductor defect, and reconciles exactly once.

## Existing drills with weak oracles

24. **Mechanical happy path tests the fake actor’s loop, not relay order.** The fake actor itself writes phases 1–5, so the assertion can pass while a conductor skips or duplicates real handoffs. Strengthen it by driving a conductor state machine with scripted child completions and asserting causal spawn, watch, narration, and exactly-once transitions.

25. **The detachment comparison forcibly kills an equally detached process.** The “false detach” branch uses `Start-Process` and then `Stop-Process`; it never demonstrates a child dying because its launcher exited. Strengthen it with a genuinely launcher-bound child and verify the different lifetime behavior without an explicit kill.

26. **The lost-notification backstop accepts mere file existence.** A zero-byte, partial, or stale result makes `Wait-TwoChannel` return `backstop`, so the assertion can pass while completion detection is unsafe. Require a run-specific terminal marker and settlement, and include the empty-file trap in this drill.

27. **The resume drill calls any result file complete.** `Get-ResumeState` would classify the die-at-launch drill’s empty result as `COMPLETE`; the current assertion only feeds it a good file. Strengthen it with empty, partial, stale-generation, and valid terminal results.

28. **The expiry and stall drills stop at classification.** Returning `EXPIRED` or `Alive-Stalled` does not prove a conductor emits a stall, refrains from advancing, and rearms or aborts correctly. Drive those values through the real consumer and assert the resulting transition and narration.

29. **The stale-registry drill is only a string matcher.** It can pass while the coordinator ignores the classification, and its broad `not found` match can misclassify an unrelated missing file. Exercise an actual failed actor spawn through the caller and assert exact error taxonomy plus the visible no-commencement outcome.

30. **The live keep-alive row proves arming, not firing.** “Task exists and is running” is precisely the condition the conductor contract says is insufficient evidence that a watch can fire. Let the timer expire, assert the pulse is received, verify rearming, and then exercise the stall threshold.

31. **Most live scorecard claims are testimonial rather than replayable.** The archived reviewer files support output classification, but no conductor/runner reports or timestamped event trace prove immediate launch-death handling, the two-runner barrier, narration order, or absence of an unnecessary wait. Archive a machine-readable event trace and assert ordering, unique identities, task creation, timer firing, and downstream spawn times.

DRILL REVIEW: 31 FINDINGS
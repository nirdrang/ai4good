# The CI watch

Read this before arming the item's first CI watch. CI is the only watch you ever arm; it
exists so a push's consequence wakes you without polling.

## Shape

Capture state once, compare in silence, emit ONE line on a change condition, exit. Forbidden:
any loop that prints the observed value unconditionally — that is a metronome, not a
watch, and every line it prints is a full-context wake. Two emission conditions, never
success-only:

- any terminal state for the pinned SHA;
- `dispatch produced nothing`, when no run exists for that head within ten minutes of the
  push.

NO RUN is its own state, not a slow one: hand it down for the next sitting to rule on, never
wait on it — and `dispatch produced nothing` is STALL-grade, so it also travels up to the
coordinator at once, like every anomaly you observe awake. Zero discovered suites is a
failure, never a pass.

## Arming

Confirm the task exists and runs, immediately; name the task id in the flow line. A watch
that cannot arm is a `STALL` now — say what refused it, what replaces it, and prove the
replacement armed the same way. **Never let "I armed a watch" stand as evidence that you will
be woken.** The evidence is the task, alive, named.

## When CI is not green

Every non-success — and `dispatch produced nothing` — carries the platform's status down with
it: run `loop/work/ci-status.ps1 -Sha <head>`, or `WebFetch
https://www.githubstatus.com/api/v2/summary.json` (the Actions component). Record in the
state file: the run id or none; whether a runner was assigned; which steps executed; the
elapsed span; the Actions status and open incidents. Facts, never rulings — excusing the red
is the orchestrator's call, and a conductor who pre-judges "just an outage" has ruled. One
fetch precedes diagnosis.

The watch completes at a terminal run for the pinned SHA, outcome logged and handed to the
sitting that rules on it — per `audit-tail.md`, the merge sitting spawns only at a terminal
run.

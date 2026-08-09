# Control drill report — run id live-2026-08-09-run3

Scripted control drill of the relay's gate machinery. No board item. No real reviewer tokens
spent — every reviewer is the stand-in script `loop/drills/fake-actor.ps1`.

## Gate 1 — plan review, one reviewer

**Reviewer: drill-alpha** (model pin drill-a, effort pin none)

- Outcome: **DEAD AT LAUNCH**
- Evidence:
  - Output: `loop/drills/records/live-2026-08-09-run3/gate1-drill-alpha.out.txt` (created empty)
  - Stderr: `loop/drills/records/live-2026-08-09-run3/gate1-drill-alpha.stderr.log`
  - Pid file: `loop/drills/records/live-2026-08-09-run3/gate1-drill-alpha.pid`
  - No distillate — a dead-at-launch run is never distilled.
- Vendor/stand-in session id: none — the process died before it wrote a run header.
- Anomaly, verbatim (stderr, full contents):
  ```
  error: model 'drill-stand-in' not found; run 'codex login' or check -c model=
  ```
- Per the drill instructions, no relaunch. Outcome recorded and gate 2 proceeded.

## Gate 2 — code review, two reviewers, blind to each other

**Reviewer: drill-beta** (model pin drill-b, effort pin none)

- Outcome: **LANDED**
- Evidence:
  - Output: `loop/drills/records/live-2026-08-09-run3/gate2-drill-beta.out.txt` (244 bytes, settled)
  - Stderr: `loop/drills/records/live-2026-08-09-run3/gate2-drill-beta.stderr.log`
  - Pid file: `loop/drills/records/live-2026-08-09-run3/gate2-drill-beta.pid`
  - Distillate: `loop/drills/records/live-2026-08-09-run3/gate2-drill-beta.distilled.md`
- Vendor/stand-in session id: `4babe01b-19bb-4de2-997e-9114a0a3bbe5`
- Count line: `CODE REVIEW: 2 FINDINGS` — matches 2 findings extracted, no mismatch.
- Anomaly: none.

**Reviewer: drill-gamma** (model pin drill-c, effort pin none)

- Outcome: **EMPTY GATE**
- Evidence:
  - Output: `loop/drills/records/live-2026-08-09-run3/gate2-drill-gamma.out.txt` (narration only, no count line)
  - Stderr: `loop/drills/records/live-2026-08-09-run3/gate2-drill-gamma.stderr.log`
  - Pid file: `loop/drills/records/live-2026-08-09-run3/gate2-drill-gamma.pid`
  - No distillate — an empty gate is never distilled.
- Vendor/stand-in session id: `26b9dfe6-0b0a-4f27-94bd-21d133d48bc9`
- Anomaly, verbatim (output file, full contents):
  ```
  Now reading the two depth files to understand the control flow...
  Examining the wait primitives and their callers.
  ```
  No count line anywhere in output or stderr. Process ended cleanly (exit 0) with only
  narration — the AI4DEV-57 shape the drill mode is built to reproduce.
- Per the drill instructions, no relaunch. Outcome recorded.

## Summary

| Gate | Reviewer | Outcome | Session id |
|---|---|---|---|
| 1 | drill-alpha | DEAD AT LAUNCH | none |
| 2 | drill-beta | LANDED | 4babe01b-19bb-4de2-997e-9114a0a3bbe5 |
| 2 | drill-gamma | EMPTY GATE | 26b9dfe6-0b0a-4f27-94bd-21d133d48bc9 |

Neither gate reached a clean two-of-two outcome. Under the real contract, anomalies of this
kind are handed down to the next orchestrator sitting to rule on — no such sitting exists in
this drill, so nothing was ruled, only recorded.

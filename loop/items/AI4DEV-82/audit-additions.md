## This item — AI4DEV-82 (window guard at the sitting boundary)

A usage-window guard that stops NEW work starting once an account usage window passes 85 percent.
It is PowerShell, batch and hook wiring — no application code. Three checkpoints: a PreToolUse
gate on the Agent tool that refuses a spawn, a PostToolUse alarm that puts a line in front of the
model, and a prompt stamp line for the founder. A status line acts as the sensor, because it is
the only place the runtime delivers the rate-limit numbers.

### YOUR CHANGE-SET COMMAND FOR THIS ITEM — the default one returns nothing

This item touches no `src`, `supabase`, `tests` or `.github` path, so the source-only diff in your
instructions yields an EMPTY list. That would leave you auditing nothing. Use this instead — it is
the same instrument, pointed at the territory this item actually declares:

```
git diff 390042c...<head> -- loop/work loop/drills .claude/settings.json .claude/skills .claude/agents
```

`loop/items/` stays OUT of the diff you audit, exactly as your instructions say. The full tree
stays open for TRACING a claim.

### The declared scope

The item declares it stayed inside these paths, and nothing else:

```
loop/work/window-lib.ps1        (new)      loop/work/window-gate.ps1      (new)
loop/work/window-gauge.ps1                 loop/work/window-alarm.cmd     (new)
loop/work/window-wait.ps1                  loop/work/stamp-hook.ps1
loop/work/window-sim.ps1                   loop/work/statusline.ps1
loop/drills/window-watchdog-drill.ps1 (new)         loop/drills/run-drills.ps1
.claude/settings.json                      .claude/skills/work/shared-invariants.md
.claude/agents/conductor.md                plus the item record under loop/items/AI4DEV-82/
```

Anything outside that set is a scope finding. `run-drills.ps1` carries a declared rides-along (the
fold-binding repair, below) — it is inside the declared set and named in the pull request.

### CLAIM CHECKLIST — grade every line by name

**A. Adopted rulings that must appear in the tree as ruled.**

Plan-review rulings, all six accepted:
1. `[1]` the alarm is wired under BOTH `PostToolUse` and `PostToolUseFailure`, same command.
2. `[2]` `window-sim.ps1` pins the gauge's full CLI surface, not a subset.
3. `[3]` UNKNOWN at the gate ALLOWS and warns, in `additionalContext` AND `systemMessage`; the
   per-tool alarm stays silent on UNKNOWN by decision.
4. `[4]` the sensor writes the verdict file FIRST, then the snapshot, in ONE `try`.
5. `[5]` `run-drills.ps1` computes `$failed` AFTER all asserts, so a folded FAIL actually exits 1.
6. `[6]` a settings-proof probe exists that tests the deployed entry shapes.

Draft rulings:
7. `[E1]` the 85 line lives in THREE param defaults — `window-lib.ps1`, `window-gauge.ps1`,
   `window-wait.ps1` — each carrying the founder-ruling comment.
8. `[E2]` the gauge CLI resolves its default snapshot path through the library's one path helper.

Code-review rulings adopted this sitting — **the box no other check covers**:
9. `[T1]` `statusline.ps1` serializes the verdict/snapshot pair under a named mutex
   `Global\ai4good-window-sensor`, skips BOTH writes on timeout, tolerates an abandoned mutex, and
   releases in a `finally`. The comment claiming the bad state is "impossible" is GONE, from
   `statusline.ps1` and from plan D3 alike.
10. `[T2]` hardening only: `window-gate.ps1` exits 0 silently ONLY when the verdict is `OK`; any
    other value takes the loud allow-with-warning path.
11. `[T3]` `Get-WindowVerdict` enumerates `rateLimits` correctly whether it is an `IDictionary` or
    a `PSCustomObject`; and `settings-proof-probe.ps1` builds its snapshot in the production shape.
12. `[T4]`+`[F1]` the probe's stamp case runs against an OVER-THE-LINE window dir, not the UNKNOWN
    one — a `WINDOW ALARM` line must be POSSIBLE in the transcript it inspects.
13. `[T5]` a null or unparseable reading age is UNKNOWN, never scored as fresh — and PAUSE when the
    worst window is at or over the line.
14. `[T6](a)` a check pins `window-alarm.cmd`'s hardcoded path literal against `Get-WindowDir`.
15. `[T6](c)`+`[T7]` the drill fingerprints the LIVE directory — BOTH `rate-limits.json` and
    `window-verdict.txt` — before the run and compares at the end. It no longer proves "nothing
    wrote outside" by re-reading an environment variable.
16. `[T8]` `window-sim.ps1` runs `window-wait.ps1` at 84 and 85 using `window-wait.ps1`'s OWN
    default `PauseAt`.
17. `[T9]`+`[F4]` the `ALARM WINDOW ` prefix coupling between `Format-WindowVerdictLine` and
    `stamp-hook.ps1:210` is pinned at both ends.
18. `[F2]` the drill exercises the UNKNOWN-LINE path for the per-tool alarm's silence, with the
    missing-file case kept SEPARATELY and labelled as such.
19. `[F5]` `.claude/skills/work/shared-invariants.md` carries this text verbatim, in place of the
    sentence that claimed the hooks cannot message anyone:

    ```
    None of them can stop work already running, none can choose who is refused, and none can be
    turned off by the actor it denies. They speak — that is their whole function — but they only
    ever repeat the founder's standing line and the reading, and a message is not a decision.
    ```

20. `[F6]` `plan.md` carries no Done mark on work that did not happen.

**B. Two findings were REJECTED. Confirm they were NOT implemented — an unruled "fix" is as much a
record failure as a missing one.**

21. `[T2] as stated` was rejected on runtime evidence: `$ErrorActionPreference = 'SilentlyContinue'`
    at `window-gate.ps1:32` was claimed to mask a library-load failure into a silent exit 0. It does
    not. Confirm the gate still fails OPEN and LOUD — a missing library file or an unresolved
    `Get-WindowVerdict` must still produce the warning in both channels. **Trace this one
    character by character**; it is the claim the whole fail-open doctrine rests on.
22. `[T6](b)` was rejected: the drill's hardcoded live-directory strings are DELIBERATE. A
    contamination canary must not derive its reference to the live directory from the library it is
    auditing. Confirm they were NOT replaced by library calls, and that a comment records why.

**C. Concrete facts this item states about the code. Each is true or it is a finding.**

23. The pause line is **85** everywhere it appears, and no `90` survives as a live default.
24. `window-gate.ps1` always exits 0; its decision is the JSON on stdout, never the exit code.
25. `window-alarm.cmd` is a batch file, not PowerShell, and anchors with `findstr /b` on the first
    token. Exit 2 carries the line to the model; exit 0 is silence. A MISSING verdict file is
    silence too.
26. `stamp-hook.ps1` COMPUTES the verdict through the library; it never reads the raw verdict line,
    so the founder's channel always applies the staleness rules.
27. `AI4GOOD_WINDOW_DIR` redirects the whole window directory for the sensor, the gate, the alarm,
    the stamp and the gauge CLI. With the variable unset, behaviour is unchanged.
28. The drill never touches the live snapshot, and it aborts rather than continues if its canary
    trips.
29. A stale reading that is OVER the line and whose window has not reset is PAUSE, not UNKNOWN —
    the reasoning being that a window only climbs.
30. The verdict line has exactly three forms, one line each: `OK`, `ALARM WINDOW …`, `UNKNOWN …`.

**D. Facts about the record that you must NOT audit, listed so you do not spend findings on them.**

- The six draft commits carry a `Co-Authored-By: Claude Fable 5` trailer but were written by an
  OPUS executor. Commit trailers on this branch are not model attribution. This is recorded, known,
  and not a defect.
- Counts, headers, citations and phrasing in the record are OUT OF YOUR SCOPE, per your
  instructions. The record is your list of claims, never your subject.

### Two things you should know before you read

**This item had a real incident, and it is on the record deliberately.** On the drill's first run,
before the sensor honoured the override, a synthetic 95 percent reading was written into the live
snapshot the founder's status line maintains — which can park real work. It self-healed and two
permanent guards were added: a static check that the sensor takes its path from the library rather
than spelling one out, and a live canary that aborts the run. Claim 15 and claim 28 are the ones
that carry this. Grade them hard: the guard on the failure that actually happened is the one worth
your attention.

**The runtime proof is incomplete, and the record says so.** Plan step 10 drives a headless run to
prove the deployed hook entries load and fire. Whether it completed is recorded in
`goal-evidence.md` and `plan.md` — read what they say and grade the CODE against it. Do not run the
probe, and do not run the test suite; execution evidence is the required CI check's, not yours.

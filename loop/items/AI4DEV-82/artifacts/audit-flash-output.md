All checks complete. Here is the audit.

---

# AUDIT â€” AI4DEV-82 (window guard at the sitting boundary)

**Note on my instruments:** this launch cage has no shell tool, so `git diff 390042c...<head>` cannot be executed by me. I reconstructed the change-set by reading every declared file in full and content-probing the surrounding territories; the exact file-list scope box is graded COULD-NOT-VERIFY with the settling command stated. This is a first audit, not a re-run â€” no carry-forward section applies.

## Verdicts on the claim checklist

**A. Adopted rulings**

1. `[1]` both events, same command â€” **PASS** (`.claude/settings.json:33-52`; identical bare-quoted command under `PostToolUse` and `PostToolUseFailure`).
2. `[2]` full CLI surface pinned â€” **PASS** (the sim pins the JSON/exit-code surface plus new invariants; the full byte surface is the capture-diff, `artifacts/gauge-capture-before/after.txt` â€” contents unreadable to me under the artifacts bar, but both files exist).
3. `[3]` UNKNOWN allows + warns in both channels; per-tool alarm silent on UNKNOWN â€” **PASS** (`window-gate.ps1:94-96` writes `$warn` into both `additionalContext` and `systemMessage`; `window-alarm.cmd:31-34` exits 0 on any non-`ALARM` first token; reasoning recorded in `shared-invariants.md:59-62`).
4. `[4]` verdict first, snapshot second, one `try` â€” **PASS** (`statusline.ps1:112-126`; a throw in the verdict write skips the snapshot write inside the same `if ($held)` block).
5. `[5]` `$failed` after all asserts â€” **PASS** (`run-drills.ps1:321`, after the twin guard at 306-307 and the watchdog fold at 312-314; a folded FAIL exits 1 at 329-332; the ordering fix is named in the comments at 296-302).
6. `[6]` settings-proof probe exists â€” **PASS on existence** (`loop/items/AI4DEV-82/artifacts/settings-proof-probe.ps1` present); **internals COULD-NOT-VERIFY** (artifacts read-bar; settling read: that file).
7. `[E1]` three param defaults, each with the founder-ruling comment â€” **PASS** (`window-lib.ps1:21-28`, `window-gauge.ps1:35-39`, `window-wait.ps1:40-43`; all three carry the 2026-08-12 supersedes-90 comment).
8. `[E2]` gauge resolves its default path through the library helper â€” **PASS** (`window-gauge.ps1:86` â†’ `Get-WindowVerdict -SnapshotPath ''` â†’ `window-lib.ps1:79` â†’ `Get-WindowDir`).
9. `[T1]` mutex â€” **PASS** (`statusline.ps1:110-131`: named `Global\ai4good-window-sensor`, `WaitOne(250)` timeout skips both writes, `AbandonedMutexException` treated as a grant, release+dispose in `finally`; the "impossible" claim is gone and replaced by the honest interleaving account at 78-94; plan D3 corrected at `plan.md:77-88`; deterministic contention case in the drill at 441-474).
10. `[T2]` hardening â€” **PASS** (`window-gate.ps1:89`: `if ($v.verdict -eq 'OK') { exit 0 }`, everything else falls to the loud path at 94-96).
11. `[T3]` library half â€” **PASS** (`window-lib.ps1:114-116` branches on `IDictionary` vs `PSObject.Properties.Name`; sim pins both shapes to the same verdict and window at `window-sim.ps1:274-282`). Probe half â€” **COULD-NOT-VERIFY** (artifacts).
12. `[T4]`+`[F1]` probe stamp case against the over-the-line dir â€” **COULD-NOT-VERIFY** (artifacts; record testimony in `goal-evidence.md:194-202` says the fix landed and the line appeared in the headless transcript).
13. `[T5]` null age â€” **PASS** (`window-lib.ps1:170-180`: over the line â†’ PAUSE, else UNKNOWN naming the unusable timestamp; sim cases at 288-293).
14. `[T6](a)` alarm path literal pinned â€” **PASS** (`window-sim.ps1:301-312` extracts the literal from `window-alarm.cmd:30` and compares against `Get-WindowDir` with the override unset).
15. `[T6](c)`+`[T7]` live fingerprint â€” **PASS** (drill `Get-LiveFingerprint` at 230-248 covers **both** `rate-limits.json` and `window-verdict.txt` â€” existence, SHA256, last-write â€” taken at 248, compared at 489-506; the env-var check at 503 is now one of three checks, not the write-proof).
16. `[T8]` wait at 84/85 on its own default â€” **PASS** (`window-sim.ps1:83-92`: two invocations with **no** `-PauseAt`, `-MaxHours 0`; 84 â†’ exit 0, 85 â†’ exit 1).
17. `[T9]`+`[F4]` prefix pinned both ends â€” **PASS** (library half: `window-sim.ps1:298-299`; stamp-output half: drill 296-298 â€” `WINDOW ALARM` exactly once, no surviving `ALARM WINDOW`).
18. `[F2]` UNKNOWN-line path separate, labelled â€” **PASS** (drill 418-436: missing-file case asserted and labelled at 422, then the sensor writes an `UNKNOWN` line and the alarm's silence on it is asserted at 431-436).
19. `[F5]` verbatim replacement â€” **PASS** (`shared-invariants.md:48-51` carries the dictated text character-for-character).
20. `[F6]` no unearned Done marks â€” **FAIL in the letter** â€” see finding 3.

**B. Rejected findings**

21. `[T2] as stated` â€” **PASS** (traced character by character: `$ErrorActionPreference = 'SilentlyContinue'` at `window-gate.ps1:32` governs non-terminating errors only; a missing dot-source target and an unresolved `Get-WindowVerdict` both raise `CommandNotFoundException`, which is terminating and reaches the `catch` at 98 regardless of the preference; the catch writes the `WINDOW GUARD FAILEDâ€¦` warning into both channels and exits 0 â€” fail open and loud, exactly as ruled. The gate 2 probes A and B recorded the same result first-hand in `artifacts/gate2-verification/`, which I am barred from reading but which corroborate the trace).
22. `[T6](b)` â€” **PASS** (the live-path literals at `window-watchdog-drill.ps1:198` and `:220` are hardcoded, not library-derived, and the comment at 194-197 records the independence rationale verbatim in spirit).

**C. Concrete facts**

23. 85 everywhere, no live 90 â€” **PASS** (`window-lib.ps1:28`, `window-gauge.ps1:39`, `window-wait.ps1:43`; every `90` occurrence in the territory is prose history; no `PauseAt = 90` anywhere).
24. gate always exits 0, decision is the JSON â€” **PASS** (every path: 76-77, 89, 96, 105).
25. alarm batch + `findstr /b` + exit semantics â€” **PASS** (`window-alarm.cmd:29-34`; missing file â†’ `exit /b 0` at 31; ALARM â†’ line on stderr, `exit /b 2`; anything else â†’ 0).
26. stamp computes via the lib â€” **PASS** (`stamp-hook.ps1:203-218`; no read of `window-verdict.txt` anywhere in the file).
27. `AI4GOOD_WINDOW_DIR` redirects all five readers; unset unchanged â€” **PASS** (sensor `statusline.ps1:101`, gate via lib, alarm `window-alarm.cmd:30`, stamp via lib, gauge via lib `:79`; fallbacks are byte-identical to the defaults).
28. drill never touches live; aborts on canary â€” **PASS** (static guard 211-213; live canary after the first sensor run 255-263 with `ABORTINGâ€¦ exit 1`; final fingerprint assertions 489-506).
29. stale over-line, window not reset â†’ PAUSE â€” **PASS** (`window-lib.ps1:182-193`; sim 149-158).
30. exactly three verdict forms â€” **PASS** (`window-lib.ps1:222-249`: `OK` / `ALARM WINDOW â€¦` / `UNKNOWN <reason>`; newlines stripped in the UNKNOWN branch).
31. settings wiring + header comment â€” **PASS** (`.claude/settings.json:33-52`: both events, same bare quoted path, no `cmd /c`, no interpreter; the measurement comment stands at `window-alarm.cmd:21-27`).
32. no "three working hooks" / "alarm proven" claim â€” **FAIL** â€” see finding 2. (`window-alarm.cmd:25`'s "works under every shell that could be tested" is the allowed isolation claim.)
33. overhead claim â€” **PARTIAL** â€” 35 ms figure and 100 ms target are supported; "of the entry as it actually stands" is not â€” see finding 4.

**Scope box** â€” **COULD-NOT-VERIFY as a file list**: no shell in this cage, so the diff command cannot be run. Content-based probe instead: the window machinery (`AI4GOOD_WINDOW_DIR`, `window-lib`, `window-gate`, `window-alarm`, `window-verdict`, `WindowPauseLine`) appears **only** in the declared files across `loop/work`, `loop/drills`, `.claude/skills` and `.claude/agents`; `banner.ps1` contains no window code (the "banner printed the 95% line" in goal-evidence is the stamp's alarm line travelling through the banner's stamp embedding at `banner.ps1:58-62`, not a banner change); `twin-check.ps1` has no window content. Settling action: run `git diff 390042c...<head> -- loop/work loop/drills .claude/settings.json .claude/skills .claude/agents` and diff the file list against the declared set.

---

## Findings

My severity scale: **high** = a production-behavior defect reachable in the shipped mechanism; **medium** = a false statement about the code/claims inside the shipped territory with real but bounded consequence; **low** = a false or unsupported statement with no direct behavioral consequence.

```
[1] severity: low    loop/work/window-gate.ps1:14
    claim: the new gate file's header still says it "cannot message anyone" â€” the exact
    statement class the F5 ruling removed from shared-invariants.md as literally false.
    why it matters: the gate's own deny reason IS a message â€” this file's lines 17-20 say
    "The reason string reaches the model that tried to spawn" â€” so the header contradicts the
    code beside it and the item's own corrected doctrine ("All three hooks message somebody,
    and that is what they are FOR"; "a false statement about a guard is never mergeable").
    The F5 fix was applied to shared-invariants.md only; the identical sentence in this new
    file was missed. Comment-only, no behavior change.
    unverified-runtime-claim: no
```

```
[2] severity: medium    .claude/skills/work/shared-invariants.md:43-47
    claim: the file says "Three hooks enforce that standing line mechanically" and that
    "window-alarm.cmd (PostToolUse and PostToolUseFailure) puts the verdict line in front of
    any model within one tool call" â€” a claim that all three hooks work, and specifically
    that the alarm delivers end to end.
    why it matters: this item's own narrowed claim (gate2-rulings.md ADDENDUM 3: "Any summary
    that says 'three hooks working' is false"; NOT PROVEN: that the per-tool alarm DELIVERS
    end to end) is contradicted by the contract file every role reads first. If the alarm is
    actually broken, this sentence teaches the exact false belief the item exists to remove â€”
    a checkpoint that looks like it runs. Counter-reading for the orchestrator: the sentence
    may be read as contract-spec rather than evidence; but the checklist's own claim 32
    ("If any file in the tree claims three working hooksâ€¦ that is a false statement and a
    finding") names this file and this sentence.
    unverified-runtime-claim: yes (whether the alarm delivers is a runtime fact; the probe
    showed nothing delivered, the cause never established)
```

```
[3] severity: low    loop/items/AI4DEV-82/plan.md:231 and 236-238
    claim: the steps section still carries "Done:" annotations asserting "the settings-proof
    probe (step 10) is green against the same entry shapes" (step 9) and probe evidence
    showing "the alarm after a successful AND after a failing tool call" (step 10) â€” both
    states that goal-evidence.md explicitly reports as NOT achieved (10 of 12; both alarm
    entries delivered nothing).
    why it matters: checklist claim 20 ([F6]) asks whether plan.md carries a Done mark on work
    that did not happen; in the letter it does. The status table at plan.md:257-281 and its
    reframing sentence ("Every 'Done:' line above is a CRITERION", line 250) correct the
    record, so the practical harm is bounded â€” but the F6 fix ("no step keeps a Done mark it
    has not earned") was applied to the table, not to the steps-section annotations it was
    written about. Record-only; reported because claim 20 is on the checklist.
    unverified-runtime-claim: no
```

```
[4] severity: low    goal-evidence.md:99 (claim 33's third clause) vs gate2-rulings.md:480-481
    claim: the overhead claim asserts the ~35 ms alarm-hook median "is of the entry as it
    actually stands" â€” i.e., of the bare quoted path in .claude/settings.json.
    why it matters: the record's own only statement on the topic (ADDENDUM 2, gate2-rulings
    line 480-481) says "the measured 35.5 ms median already reflects the cmd /c form", and
    the executor was told to "confirm that rather than assume it" â€” no confirmation appears in
    the visible record. The committed entry has no wrapper (ADDENDUM 3 forbade one), so the
    measured form and the shipped form may differ. The 35 ms / 100 ms numbers themselves are
    supported; only the "as it actually stands" clause is unsupported-or-false.
    unverified-runtime-claim: yes (settled by reading artifacts/overhead-measure.ps1 for the
    invocation form it times)
```

**Not findings, noted once for the orchestrator**: the probe-internal claims (6's internals, 11's probe half, 12) could not be graded because `loop/items/AI4DEV-82/artifacts/` is barred from my reads by contract; record testimony supports them, and a read of `artifacts/settings-proof-probe.ps1` settles them. The scope box likewise needs the stated git command.

AUDIT: 4 FINDINGS

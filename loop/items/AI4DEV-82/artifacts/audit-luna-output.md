Severity scale: HIGH = safety/real-work impact; MEDIUM = false guarantee or incomplete regression coverage.

Checklist verdicts:

1. PASS — `.claude/settings.json:33-49` wires both events to the identical bare command.
2. FAIL — `window-sim.ps1:49-50` forces `-Json`; human output and several CLI combinations are discarded.
3. PASS — gate and alarm paths match the UNKNOWN ruling.
4. PASS — `statusline.ps1:118-125` writes verdict, then snapshot, inside one envelope.
5. PASS — `run-drills.ps1:312-321` computes `$failed` after all assertions.
6. PASS — the settings-proof probe exists and exercises entry shapes.
7. PASS — effective 85 defaults are present in the library, gauge, and wait paths.
8. PASS — gauge fallback resolves through `Get-WindowSnapshotPath`.
9. PASS — mutex, timeout, abandoned-lock handling, and `finally` release are present.
10. PASS — only `OK` silently exits; unresolved library calls reach the warning path.
11. PASS — dictionary and `PSCustomObject` enumeration are handled.
12. PASS — probe stamp case uses the over-line directory.
13. PASS — unusable age is never treated as fresh; high readings pause.
14. PASS — alarm fallback path is checked against the library.
15. FAIL — live fingerprints are incomplete at `window-watchdog-drill.ps1:494-495`.
16. PASS — wait defaults are tested at 84 and 85.
17. PASS — alarm-prefix coupling is pinned at both ends.
18. PASS — UNKNOWN-line and missing-file alarm cases are separate.
19. PASS — required invariant text is present.
20. PASS — the plan’s status table marks incomplete work as partial/run.
21. PASS — missing-library and unresolved-function paths fail open loudly.
22. PASS — independent hardcoded live paths remain, with rationale.
23. PASS — live defaults are 85; remaining 90s are historical text or reset intervals.
24. PASS — gate exits 0; deny/unknown decisions use JSON, while OK is intentional silent allow.
25. PASS — batch file uses `/b`, exit 2 for alarms, and silence for missing files.
26. PASS — stamp computes through the library and does not read the raw verdict.
27. PASS — `AI4GOOD_WINDOW_DIR` reaches all listed readers and writers.
28. PASS — the contamination canary aborts after detecting the drill marker.
29. PASS — stale over-line readings pause before reset.
30. PASS — formatter emits the three one-line forms.
31. PASS — settings use the same bare quoted alarm command under both events.
32. FAIL — `.claude/skills/work/shared-invariants.md:46-48` states end-to-end alarm delivery, beyond the item’s isolation-only claim.
33. COULD-NOT-VERIFY — the 35 ms median requires the recorded measurement or CI rerun; I did not execute it.

[1] severity: MEDIUM    loop/work/window-sim.ps1:49
    claim: The permanent simulation does not pin the gauge’s full CLI surface.
    why it matters: Human output, `-StaleMinutes`, and combined flag behavior can regress while the simulation remains green because JSON output is the only reusable gauge path and non-JSON output is discarded.
    unverified-runtime-claim: no

[2] severity: HIGH    loop/drills/window-watchdog-drill.ps1:494
    claim: The live-directory guard does not compare the complete fingerprint it records.
    why it matters: It only detects deletion of previously existing files and hash changes; it ignores `LastWrite` and newly created files, so a same-content rewrite or a new live `OK` verdict can evade the guard and avoid aborting.
    unverified-runtime-claim: no

[3] severity: MEDIUM    .claude/skills/work/shared-invariants.md:46
    claim: The contract presents the per-tool alarm as delivering the verdict to any model within one tool call, although the item’s runtime claim is narrowed to isolation.
    why it matters: A batch command can work in isolation yet fail to surface through the hook runner, leaving failed tool calls without the warning while actors rely on this contract.
    unverified-runtime-claim: yes

AUDIT: 3 FINDINGS
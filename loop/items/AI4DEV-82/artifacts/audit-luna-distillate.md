SOURCE   loop/items/AI4DEV-82/artifacts/audit-luna-output.md
REVIEWER gpt-5.6-luna (codex, effort max, sandbox read-only) — audit, reader one of two
COUNT    3 findings in source → 3 extracted
NOTES    Raw file also contains a per-checklist-item verdict table (33 lines, PASS/FAIL/COULD-NOT-VERIFY) preceding the findings list; not reproduced here since it is not itself a finding, but each FAIL/COULD-NOT-VERIFY line there corresponds to one of the three findings below (checklist items 2, 15, 32, 33). Declared count line "AUDIT: 3 FINDINGS" matches extracted count.

[1] severity: MEDIUM   loop/work/window-sim.ps1:49
    claim: "The permanent simulation does not pin the gauge's full CLI surface." (checklist item 2: FAIL — `window-sim.ps1:49-50` forces `-Json`; human output and several CLI combinations are discarded.)
    why it matters (reviewer's words): "Human output, `-StaleMinutes`, and combined flag behavior can regress while the simulation remains green because JSON output is the only reusable gauge path and non-JSON output is discarded."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-82/artifacts/audit-luna-output.md, finding [1] and checklist item 2

[2] severity: HIGH   loop/drills/window-watchdog-drill.ps1:494
    claim: "The live-directory guard does not compare the complete fingerprint it records." (checklist item 15: FAIL — live fingerprints are incomplete at `window-watchdog-drill.ps1:494-495`.)
    why it matters (reviewer's words): "It only detects deletion of previously existing files and hash changes; it ignores `LastWrite` and newly created files, so a same-content rewrite or a new live `OK` verdict can evade the guard and avoid aborting."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-82/artifacts/audit-luna-output.md, finding [2] and checklist item 15

[3] severity: MEDIUM   .claude/skills/work/shared-invariants.md:46
    claim: "The contract presents the per-tool alarm as delivering the verdict to any model within one tool call, although the item's runtime claim is narrowed to isolation." (checklist item 32: FAIL — `.claude/skills/work/shared-invariants.md:46-48` states end-to-end alarm delivery, beyond the item's isolation-only claim.)
    why it matters (reviewer's words): "A batch command can work in isolation yet fail to surface through the hook runner, leaving failed tool calls without the warning while actors rely on this contract."
    unverified-runtime-claim: yes
    raw: loop/items/AI4DEV-82/artifacts/audit-luna-output.md, finding [3] and checklist item 32

Also noted in raw file, checklist item 33: COULD-NOT-VERIFY — "the 35 ms median requires the recorded measurement or CI rerun; I did not execute it." This is a verification gap on claim 33 (overhead measurement), not phrased by the reviewer as a numbered finding — flagged here so it is not lost, per the distiller contract's instruction to preserve every marker the reviewer attached about inability to verify by running something.

SOURCE   loop/items/AI4DEV-82/artifacts/gate2-terra-output.md
REVIEWER gpt-5.6-terra / codex / effort max (gate2 code review, reader one of two)
COUNT    9 findings in source → 9 extracted
NOTES    none — count line "CODE REVIEW: 9 FINDINGS" matches extracted count

[1] severity: high   loop/work/statusline.ps1:95
    claim: "The verdict/snapshot pair is not serialized, so concurrent status-line refreshes can leave a high snapshot beside an older `OK` verdict."
    unverified-runtime-claim: yes
    raw: loop/items/AI4DEV-82/artifacts/gate2-terra-output.md:3-6

[2] severity: high   loop/work/window-gate.ps1:32
    claim: "`SilentlyContinue` can suppress a failed library load or missing `Get-WindowVerdict` command before the outer `catch`, causing a silent exit 0 instead of the promised fail-open warning."
    unverified-runtime-claim: yes
    raw: loop/items/AI4DEV-82/artifacts/gate2-terra-output.md:8-11

[3] severity: medium   loop/work/window-lib.ps1:107
    claim: "`Get-WindowVerdict -Snapshot` assumes `rateLimits` is a `PSCustomObject`, but the settings-proof probe passes it as a hashtable."
    unverified-runtime-claim: yes
    raw: loop/items/AI4DEV-82/artifacts/gate2-terra-output.md:13-16

[4] severity: medium   loop/items/AI4DEV-82/artifacts/settings-proof-probe.ps1:206
    claim: "The UserPromptSubmit proof inspects the preceding UNKNOWN case for `WINDOW ALARM`, which a correct stamp cannot emit for that snapshot."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-82/artifacts/gate2-terra-output.md:18-21

[5] severity: medium   loop/work/window-lib.ps1:96
    claim: "An invalid or missing `capturedAt` leaves `readingAgeMin` null and is treated as current rather than `UNKNOWN`."
    unverified-runtime-claim: yes
    raw: loop/items/AI4DEV-82/artifacts/gate2-terra-output.md:23-26

[6] severity: medium   loop/work/window-alarm.cmd:22
    claim: "The alarm has an independent fallback path formula, with no fallback-path regression check."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-82/artifacts/gate2-terra-output.md:28-31

[7] severity: medium   loop/drills/window-watchdog-drill.ps1:208
    claim: "The live-contamination canary checks only `rate-limits.json`; the final \"nothing wrote outside\" assertion only rechecks the environment variable."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-82/artifacts/gate2-terra-output.md:33-36

[8] severity: low   loop/work/window-sim.ps1:73
    claim: "The claimed three-default boundary net never runs `window-wait.ps1` at 84/85 using its default."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-82/artifacts/gate2-terra-output.md:38-41

[9] severity: low   loop/work/stamp-hook.ps1:210
    claim: "The formatter-prefix rewrite is coupled to an exact literal that the drill does not pin."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-82/artifacts/gate2-terra-output.md:43-46

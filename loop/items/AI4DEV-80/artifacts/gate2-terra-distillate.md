SOURCE   loop/items/AI4DEV-80/artifacts/gate2-terra-output.txt
REVIEWER codex gate2, reader one, model terra (DRAFT CODE review)
COUNT    6 findings in source → 6 extracted
NOTES    none

[1] severity: high   loop/work/attribution-report.ps1:343
    claim: "An ambiguous agent can be attributed from `$curStamp` instead of remaining unattributed."
    why it matters (reviewer's own): An M1-style file with two item branches, then a stamp and a blank-branch response has an empty tree item but reaches this stamp fallback, violating the required "degrade, never guess" behavior; A9 does not cover that state.
    unverified-runtime-claim: no
    raw: line 3-6

[2] severity: high   loop/work/attribution-report.ps1:349
    claim: "`$agentItem` collapses a multi-item agent to whichever direct branch response occurs last."
    why it matters (reviewer's own): M1 is set to AI4DEV-901 then AI4DEV-902; a `wd_agent-M1_*` Kimi session would have all of its spend credited to AI4DEV-902 despite no item fact for that spend. The ambiguity safeguard is bypassed for the Kimi join, and A10 only tests an unambiguous agent.
    unverified-runtime-claim: no
    raw: line 8-11

[3] severity: medium   loop/work/attribution-report.ps1:219
    claim: "Spawn context is keyed globally by `toolUseId`, not by its enclosing session."
    why it matters (reviewer's own): If two sessions reuse a tool-use id, the first session wins and a branchless root agent in the other session inherits the wrong item. Add a two-session duplicate-id fixture, or verify the platform guarantees global uniqueness.
    unverified-runtime-claim: yes
    raw: line 13-16

[4] severity: high   loop/work/attribution-report.selftest.ps1:297
    claim: "The fixture never creates the amended nested `subagents/workflows/wf_*/agent-W1.jsonl` case."
    why it matters (reviewer's own): A flat direct-child scan would still satisfy every current expected count, so a green selftest does not prove the recursive workflow-store requirement that covers most real agent transcripts.
    unverified-runtime-claim: no
    raw: line 18-21

[5] severity: medium   loop/work/attribution-report.selftest.ps1:299
    claim: "A1 claims token attribution but checks only response counts for its per-item/source rows."
    why it matters (reviewer's own): Output tokens could be moved between item/source rows while preserving response counts and A3's global total; A8 derives its expected output total from the report's own rows, so it would not detect that misallocation.
    unverified-runtime-claim: no
    raw: line 23-26

[6] severity: low   loop/work/attribution-report.selftest.ps1:396
    claim: "A11 assumes the printed percentage uses a dot decimal separator, while the report does not force invariant formatting."
    why it matters (reviewer's own): Under a comma-decimal Windows culture, the regex can miss the report's otherwise-correct percentage and leave `$printed` at `-1`; run the selftest with a culture such as `de-DE` to settle this.
    unverified-runtime-claim: yes
    raw: line 28-31

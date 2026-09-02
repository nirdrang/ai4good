# Unit 3 brief: park the semantic judge (writer: the refactoring lane)

Worktree: C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-86, current branch. One writer at a time; you are it. The ruling (loop/items/AI4DEV-86/artifacts/how/rulings.md, item 7): the judge has no consumer, an empty recording store, a recorder that never ran, and a `real` verdict above loop over a transport that cannot answer. It leaves the harness as its own unit, revertible on its own.

## What moves (git mv, byte-identical) to loop/parked/v1/tests/at/harness/
- tests/at/harness/oracles.ts
- tests/at/harness/oracles.selftest.ts
- tests/at/harness/record-oracles.ts
- tests/at/harness/rubrics/ (the whole folder)
- tests/at/harness/recordings/ (README only)
NOT req016-oracles.selftest.ts and NOT tests/at/suites/req-016/_oracles.ts: those are pair-counting helpers with the same word in their name.

## What changes in the live tree (subtraction only; nothing is added except a README paragraph)
- tests/at/harness/index.ts: remove the `SemanticOracle` type import and the `createOracleCapability` import; remove the `oracles` member of `CapabilityLedger` (line ~161); remove the three constructions (`const oracles = createOracleCapability(...)` at ~205, ~376, ~406) and the `oracles` entries in the three ledgers and their `all` arrays; remove `oracles: ledger.oracles.value` from the harness object (~502). Adjust the comment at ~203-204.
- tests/at/harness/contracts.ts: delete the H4 section (`/* --- H4 semantic oracles */` through the `SemanticOracle` type, ~160-304) and the `oracles` member of `AtHarness` (~377); rewrite the two header sentences that name H4 oracles.
- tests/at/harness/capabilities.ts: delete `LEGAL_TRANSPORTS` and its comment block (~173-195) and the `oracles.judge` witness (~281-341); rewrite the header sentences that say only `oracles.judge` needs caller evidence.
- tests/at/harness/config.ts: delete the `'harness.oracle.judge_votes'` row. tests/at/harness/atconfig.ts: delete the `oracleJudgeVotes` entry and its comment (~183-200).
- tests/at/harness/conformance.selftest.ts: delete the oracle witness assertions (~195-198, the describe at ~216-283) and the `'oracles.judge'` name in the list at ~392; keep every other assertion.
- tests/at/harness/type-invention.selftest.ts: remove the six H4 names from the protected-names list (~157-163) and the comment (~149-152). tests/at/typeprobes/harness-invention.probe.ts: remove the H4 interfaces (~97-141) and the `oracles` member attack; the probe must STILL fail to compile for the reasons that remain (the selftest asserts that).
- tests/at/harness/live-ledger.selftest.ts: remove `'oracles.judge'` from the expected ledger names (~582) and the `ledger.oracles.standInReason` assertion (~592).
- tests/at/harness/registry.ts ~671: the comment naming "H4 oracles" drops those two words.
- tests/at/harness/runner.selftest.ts ~44-48: keep the `AT_JUDGE_API_KEY` sentinel in the allowlist test (the allowlist still must not pass it), and change its comment to say the judge is parked.
- .env.example: the AT_JUDGE_API_KEY block (~25-33) gets one line saying the judge is parked under loop/parked/v1/ and the variable is read by nothing live.
- loop/parked/v1/README.md: add a section `## The semantic judge (parked 2026-09-02)` saying: no suite ever called it; the recording store was empty; the recorder never ran; it is dead text, not compiled; the three ids it was written for (AT-009.07, AT-004.10, AT-033.07) have no suites; when one lands, a judge is a function that test imports with its own record-and-replay store, not a member of the harness object.

## Checks, then commit
1. `bun run typecheck` clean. 2. `bun run at:selftest`: 11 files (12 minus oracles.selftest), all green, including type-invention (the probe must still fail to compile). 3. `bun run at:verify req-001 --tier loop --expect` and `req-016 --tier loop --expect` green with the same declared counts. 4. `git status --short` shows the moves as renames and only the files named above as modified. Paste every output with a timestamp.
Commit once, first line `AI4DEV-86: the semantic judge is parked`, body naming what moved and the ten live files that lost their oracle references, trailers `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01SikdZcn3PmB9SrZ4dL1ziT`. Do not push.

## If it fights
If the conformance selftest or the type probe cannot be made green without adding code, or if the diff reaches any file not named above, STOP, `git checkout -- .` and `git clean -fd tests/at loop/parked` to restore the tree, and report BLOCKED with the exact error. The lead files the judge park as its own item instead.

## Report
The commit hash (or BLOCKED), the four command outputs, the `git status --short` before the commit, and any deviation from this brief, each classed as "the brief was wrong", "a requirement was missed", or "I overreached".
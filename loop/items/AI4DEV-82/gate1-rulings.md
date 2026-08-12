# Gate 1 rulings — AI4DEV-82 (window guard at the sitting boundary)

Ruled by the DRAFT sitting orchestrator (fable @ xhigh), 2026-08-12. Reviewer: gpt-5.6-sol
(codex, xhigh), plan review, 6 findings. Every ruling quotes the claim, then rules. Evidence
consulted: the raw output, `run-drills.ps1` (read directly), `statusline.ps1` (read directly),
`window-gauge.ps1` (read directly), `.claude/settings.json` (read directly), the Linear item
description (fetched 2026-08-12), and the current Claude Code hooks documentation
(code.claude.com/docs/en/hooks, fetched 2026-08-12).

---

## [1] HIGH — PostToolUseFailure gap — **ACCEPT**

> "Wiring the alarm only to `PostToolUse` cannot provide an alarm after every tool call because
> failed calls fire `PostToolUseFailure` instead."

Confirmed against the current hooks documentation: `PostToolUse` fires only when a tool call
succeeds; `PostToolUseFailure` fires when it fails; the two are mutually exclusive, and exit
code 2 shows stderr to the model on both. The item's sentence is "PostToolUse alarm on every
tool"; the intent is "an alarm within one tool call", and a failed call is a tool call.

**Fix:** wire `window-alarm.cmd` under BOTH `PostToolUse` and `PostToolUseFailure` (no matcher,
same command). The settings-proof probe (finding 6) includes a deliberately failing tool call
and asserts the alarm arrived after it — that is also the runtime proof that the installed
version knows the event name. **Contingency, decided now:** if the probe shows the installed
version does not dispatch `PostToolUseFailure`, drop that one entry, keep everything else, and
record the residual gap in `goal-evidence.md` (an actor whose calls all fail still hears the
alarm at its next successful call, its next spawn attempt, or — for the founder — the next
prompt stamp).

## [2] MEDIUM — sim does not pin the full gauge surface — **ACCEPT**

> "A green `window-sim.ps1` does not prove the promised behavior-neutral extraction of all JSON
> fields, human output, and exit behavior."

Correct: the sim asserts selected JSON properties and discards human output. Step 1's
done-criterion is strengthened with a **capture-diff**: before the refactor, run the CURRENT
gauge CLI over a fixed set of synthetic snapshots — OK, PAUSE, stale-high, stale-low, missing
file, unparseable file, missing `rateLimits` field — in each mode (`-Json`; human lines;
`-ExitOnReady` exit codes with and without `-Json`), and capture every byte. After the
refactor, re-run and diff: identical, except `readingAgeMin`, which is normalized (synthetic
snapshots are written at capture time so the age is stable; normalize if rounding flickers).
Both captures land in `goal-evidence.md`. The sim remains the permanent regression net; the
capture-diff is the one-time proof that the extraction moved nothing.

## [3] HIGH — UNKNOWN not guaranteed visible to a running subagent — **ACCEPT, FIXED DIFFERENTLY** (verify-first folded into the probe)

> "The planned degraded-state channels do not guarantee that a running subagent learns that the
> sensor is `UNKNOWN`."

The documentation claim is confirmed: `systemMessage` is a user-facing warning; the
model-visible field on a PreToolUse allow is `additionalContext`. The plan's D4 overstated the
loudness of a `systemMessage`-only warning. Three changes:

1. **Gate UNKNOWN → allow + `additionalContext` + `systemMessage`.** The context string carries
   the loud sensor warning to the spawning actor (model-visible); the systemMessage shows the
   user. **Verify-first, folded into the settings-proof probe:** the probe's UNKNOWN case
   asserts the warning text is actually visible in the probe transcript. If `additionalContext`
   proves invisible on allow in the installed version, fall back to `systemMessage` only and
   record the reduced guarantee in `goal-evidence.md` — honestly, not silently.
2. **The gate's internal-error fail-open path warns instead of exiting silently**: allow, plus a
   best-effort `additionalContext`/`systemMessage` naming the error. A broken guard must not
   stop spawns, but it must not be mute either.
3. **The per-tool alarm stays silent on UNKNOWN — now a recorded decision with its reasoning,
   not an omission.** A running subagent cannot act on UNKNOWN: it must not halt (shared
   invariant), and it cannot fix the sensor. The actors who can act hear it loudly — the
   founder on every prompt (stamp), every spawner at every spawn (gate). A per-tool UNKNOWN
   would fire on EVERY tool call system-wide whenever the founder session idles past the
   staleness limit — which is precisely the long-agent-run situation — drowning every actor in
   warnings about a condition they are required to ignore. Loud where actionable, silent where
   it is noise.

The reviewer asked for a guarantee that a running subagent learns of UNKNOWN. Rejecting that
single element deliberately: mid-turn subagent UNKNOWN visibility is not needed (no action
exists for the hearer) and its cost is systemic noise. What IS guaranteed instead: a
model-visible warning at every spawn boundary, founder visibility at every prompt, and a
non-mute error path. The defect — channels that did not do what the plan claimed — is real and
is fixed.

## [4] HIGH — snapshot/verdict split-brain — **ACCEPT, FIXED DIFFERENTLY** (verify-first folded into the drill)

> "The separately written snapshot and verdict files have no recovery or freshness mechanism
> preventing an old verdict from surviving a partial sensor-write failure."

The failure mode is real: two independent writes inside catch-all envelopes can diverge, and
`window-alarm.cmd` (findstr) cannot check freshness. The item text mandates the one-line
verdict file, so the fix keeps it and removes the failure class by construction:

1. **One envelope, verdict first.** `statusline.ps1` computes the verdict in memory from the
   snapshot object via the lib, writes `window-verdict.txt`, THEN writes `rate-limits.json`,
   all in ONE try block. A verdict-write failure therefore also skips the snapshot write.
   Invariant by construction: **the verdict file is never older than the snapshot beside it.**
   The reviewer's case — snapshot at 85% while the verdict stays `OK` indefinitely — is
   impossible. The residual case (verdict one refresh newer than the snapshot) is conservative
   — the alarm fires on the newest data — and heals at the next refresh or ages into the
   existing stale rules.
2. **The stamp computes, it no longer reads the raw line.** D6 amended: `stamp-hook.ps1`
   computes the verdict via the lib from the snapshot (per-prompt cost is negligible beside its
   git calls). The founder's channel therefore always applies the stale rules and can never
   echo an hours-old line. The item's "checkpoints read, they never compute" principle is, in
   the item's own words, about the PER-TOOL hook's near-zero cost; the gate already computes
   fresh per spawn (planned, and gate 1 did not object), and the stamp per prompt is the same
   class.
3. **The alarm stays the one dumb reader, and its residual exposure is bounded and stated:** if
   the sensor dies entirely, the alarm keeps echoing the last line — but in that state the gate
   (every spawn) and the stamp (every prompt) both report UNKNOWN/stale loudly, and the
   ordering invariant means the alarm's line is never older than the snapshot those loud
   channels read.
4. **The reviewer's fault-injection verify-first becomes drill assertions** (synthetic, zero
   tokens): drill group 4 gains (a) fault the verdict write — pre-create `window-verdict.txt`
   as a DIRECTORY in the override dir — and assert the snapshot also did not update (the
   coupled envelope held); (b) corrupt/truncate the snapshot and assert gate = UNKNOWN
   allow+warn, stamp = unknown note, alarm = silent; (c) the normal-path consistency assertion
   as planned.

## [5] HIGH — the fold pattern does not bind — **ACCEPT**

> "The selected `twin-check.ps1` folding pattern does not make a folded drill failure affect
> `run-drills.ps1`'s exit code."

Confirmed by reading the code: `$failed` is computed at `run-drills.ps1:297`, the twin Assert
runs at 300–301, so a folded FAIL prints, is counted in the summary line, and exits 0. This is
live today for twin-check — a guard that does not bind, the exact defect class this project
removes. **Fix:** compute `$failed` after ALL asserts (immediately before the exit decision)
and fold the watchdog drill before it. This also repairs the twin-check binding — a rides-along
inside declared territory (`run-drills.ps1` is in the item's path set), recorded in the pull
request as such. **Binding proof:** the executor forces one watchdog assertion red in a
throwaway local run, records `run-drills.ps1` exiting 1 in `goal-evidence.md`, and restores it.

## [6] HIGH — nothing proves Claude Code loaded the deployed entries — **ACCEPT**

> "No executable plan step proves that Claude Code actually loaded and applied the three
> deployed settings entries."

Correct: step 9 ended at "JSON parses and the files exist", and "the merge sitting verifies"
was not a numbered step with a done-criterion. **Fix: a new numbered step — the settings-proof
probe** — using the headless probe machinery the plan sitting already built (`artifacts/
hookprobe/`). A headless `claude -p` run loads the hook entries under test with
`AI4GOOD_WINDOW_DIR` pointed at synthetic dirs, and its transcript/hook logs must show:

- **≥85 dir:** an attempted Agent spawn DENIED, reason carrying window name, percent, reset —
  the PreToolUse entry fires as deployed;
- **alarm:** the `WINDOW` line model-visible after a successful tool call (PostToolUse entry)
  AND after a deliberately failing tool call (PostToolUseFailure entry — finding 1's runtime
  proof);
- **UNKNOWN dir:** spawn allowed with the warning visible (finding 3's channel proof);
- **stamp:** the UserPromptSubmit hook is an EDIT to an already-wired entry; assert its alarm
  line in the headless run if UserPromptSubmit fires headless, otherwise assert by direct
  invocation and record that limit.

**Path honesty, decided now:** the committed `.claude/settings.json` carries main-checkout
absolute paths (as the file already does), which are live only post-merge. The probe therefore
runs against a GENERATED twin of the branch's settings whose command paths substitute this
worktree's absolute paths — identical event names, matchers, JSON shape, and invocation style;
only the path prefix differs. That proves the deployed ENTRY SHAPES load and fire pre-merge;
the merge sitting's post-merge live check (already in PHASE-STATE) remains as the second half
of the proof, no longer the only half. If the executor finds the probe loads the worktree's
project settings directly (cwd = this worktree), the generated twin is unnecessary — prefer the
committed file itself and say so in the evidence. Step 9's done-criterion now requires the
probe step green against the same entry shapes.

---

## Summary

| # | severity | ruling |
|---|---|---|
| 1 | HIGH | accept — alarm wired to PostToolUse AND PostToolUseFailure; probe verifies the event |
| 2 | MEDIUM | accept — capture-diff added to step 1's done-criterion |
| 3 | HIGH | accept, fixed differently — additionalContext channel + non-mute error path; per-tool UNKNOWN silence kept, now recorded with reasoning; probe verifies the channel |
| 4 | HIGH | accept, fixed differently — coupled verdict-first write, stamp computes via lib, fault-injection drill assertions |
| 5 | HIGH | accept — $failed computed after all asserts; twin-check binding repaired as rides-along; binding proven once |
| 6 | HIGH | accept — settings-proof probe added as a numbered step with a done-criterion |

No finding is rejected. No finding contradicts ratified text — the one-line verdict file stays
as the item words it, and the fixes live inside that shape. No verify-first ruling leaves this
item unresolved: both unverified-runtime-claim findings ([3], [4]) fold their verification into
the probe and the drill respectively, where they become permanent or recorded evidence rather
than a one-off check.

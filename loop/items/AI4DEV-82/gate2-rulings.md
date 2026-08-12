# Gate 2 rulings — AI4DEV-82 (window guard at the sitting boundary)

Ruled by the FIX AND GOAL sitting, orchestrator on **opus @ max**, 2026-08-12. Chain, derived
from the branch: `AI4DEV-4 (the work skill)` > `AI4DEV-82 (window guard at the sitting boundary)`.

**Why opus and not fable.** This sitting is neither the merge sitting nor the audit re-run. It
runs on the opus twin as the standing fallback, because an active vendor incident ("degraded
performance for multiple models", open since 13:50 UTC) killed two fable sittings of this item
mid-write with 529 Overloaded. That is a vendor incident, not a session limit and not credit.

Two readers, blind to each other, reviewed the draft at head 2064f1e:

- reader one · `gpt-5.6-terra` · codex · effort max — 9 findings (2 high, 5 medium, 2 low)
- reader two · `opencode-go/deepseek-v4-flash` · opencode · variant max — 6 findings (3 medium, 3 low)

15 findings, all ruled below. **Three pairs converged** — terra [4] with flash [1], terra [6] with
flash [3], terra [9] with flash [4]. Convergence between two blind readers is the strongest signal
a panel gives, and all three pairs are accepted.

## First-hand verification, before ruling

Three findings were marked `unverified-runtime-claim: yes` and carried the two HIGH severities. I
did not rule them on reading alone. The dead sitting had left an unfinished probe script; I re-ran
it myself this sitting rather than inherit its results. Script and captured outputs are committed
at `loop/items/AI4DEV-82/artifacts/gate2-verification/`.

| probe | what it does | result |
|---|---|---|
| A | `window-gate.ps1` with the library FILE absent beside it | loud fail-open, both channels, exit 0 |
| B | library present but defining nothing, so `Get-WindowVerdict` is unresolved | loud fail-open, both channels, exit 0 |
| C | `Get-WindowVerdict -Snapshot` with `rateLimits` as a HASHTABLE | `PAUSE`, but `worstWindow = "Values"` |
| C2 | the same reading round-tripped through JSON (the production shape) | `PAUSE`, `worstWindow = "five_hour"` |

Probe C's composed line, verbatim from the run:
`ALARM WINDOW Values at 95% (line 85%), resets 21:34 - finish the current work item, commit, park.`

---

## [T1] HIGH — the verdict/snapshot pair is not serialized — **ACCEPT**

> "The verdict/snapshot pair is not serialized, so concurrent status-line refreshes can leave a
> high snapshot beside an older `OK` verdict." — terra, `loop/work/statusline.ps1:95`

**Real.** `Get-WindowDir` (window-lib.ps1:38-41) resolves to
`%LOCALAPPDATA%\ai4good-build\nirdrang-ai4good` with no session scoping, Claude Code spawns a
fresh PowerShell per status-line refresh, and several sessions at once is this project's normal
operating condition — the session-prefix rule exists precisely because two sessions' output sits
side by side in one view. So two writers on the same two files is real, not hypothetical.

The verdict-first single-`try` envelope makes the pair consistent for ONE writer and does nothing
across two. This interleaving leaves a high snapshot beside an `OK` verdict:

```
A writes verdict(ALARM)  ->  B writes verdict(OK)  ->  B writes snapshot(low)  ->  A writes snapshot(high)
```

**The practical severity is lower than the finding implies, and I record that plainly.** Both
decision-bearing checkpoints COMPUTE from the snapshot and never read the verdict line — the gate
by D4, the stamp by D6. A stale line therefore cannot let a spawn through and cannot hide the
alarm from the founder. The only affected reader is the per-tool alarm, and it self-heals at the
next refresh, seconds later.

**It is accepted anyway, because the record claims impossibility.** statusline.ps1:74-79 says "is
not defended against here - it is impossible", and plan D3 says "the invariant holds by
construction". A false statement about the code is never mergeable, and this item's entire subject
is a guard that must never look like a clear window when it is not.

**Fix.** Serialize the pair with a named system mutex `Global\ai4good-window-sensor`, acquired
with a short timeout. On timeout, skip BOTH writes: another refresh is writing the same
account-wide numbers, and a consistent pair one refresh old is strictly better than an
inconsistent pair, because the staleness rules handle the first correctly and are defeated by the
second. Tolerate `AbandonedMutexException` — it means we hold the lock. Release in a `finally`.
The block stays inside the existing never-throw envelope, so a mutex failure degrades to "no
sensor update", which the stale rules then report as UNKNOWN — loud, not silent.

Correct statusline.ps1's comment and plan D3 to state what is now guaranteed and what residual
remains (a refresh may be skipped under contention; it heals at the next one).

**Verification condition.** A deterministic drill assertion, not a race: hold the mutex in the
drill, run the sensor, assert it exits 0 and leaves the existing pair unchanged and uncorrupted;
release, run again, assert both files update together.

## [T2] HIGH — `SilentlyContinue` masks a library-load failure — **REJECT** (disproven first-hand)

> "`SilentlyContinue` can suppress a failed library load or missing `Get-WindowVerdict` command
> before the outer `catch`, causing a silent exit 0 instead of the promised fail-open warning."
> — terra, `loop/work/window-gate.ps1:32`

**Disproven by probes A and B, which I ran this sitting.** Both failure modes the claim names
produce `permissionDecision: allow` carrying the full text
`WINDOW GUARD FAILED and is allowing this spawn unguarded: …` in BOTH `additionalContext` and
`systemMessage`, at exit 0. That is exactly the promised loud fail-open.

The reason the claim does not hold: `$ErrorActionPreference` governs NON-terminating errors. An
unresolved command or an unresolvable script path raises `CommandNotFoundException`, which is
terminating and reaches the `catch` regardless of the preference.

**A narrow hardening is adopted from it, and I record that it fixes no proven defect.**
window-gate.ps1 reaches its silent `exit 0` by falling through — any verdict that is neither
PAUSE nor UNKNOWN is treated as OK. Today `Get-WindowVerdict` can only return OK, PAUSE or
UNKNOWN, so the path is unreachable. But silence is the one answer this file must never give by
accident. Make silence explicit: `if ($v.verdict -eq 'OK') { exit 0 }`, and route anything else
through the same loud allow-with-warning path as UNKNOWN.

## [T3] MEDIUM — `rateLimits` as a hashtable — **ACCEPT**, and it is worse than claimed

> "`Get-WindowVerdict -Snapshot` assumes `rateLimits` is a `PSCustomObject`, but the
> settings-proof probe passes it as a hashtable." — terra, `loop/work/window-lib.ps1:107`

**Confirmed first-hand, and the consequence is larger than the claim.** Probe C used exactly
settings-proof-probe.ps1:106's shape and produced `worstWindow = "Values"` — the enumeration
walked the Hashtable's .NET members instead of its keys, and the founder-facing line named a .NET
property where a window name belongs. The control C2, the same reading round-tripped through
JSON, named `five_hour` correctly. With more than one window, the value collection would make the
percentage cast throw.

**Production is not affected**: statusline's `rateLimits` comes from `ConvertFrom-Json`, and every
other reader parses the JSON file. The defect is in the PROBE — step 10's evidence machinery. A
probe that mis-composes the very line it exists to prove is worse than no probe.

**Fix, both halves.**
(a) The probe builds its snapshot in the production shape: round-trip through
`ConvertTo-Json | ConvertFrom-Json` before calling `Get-WindowVerdict`, so it exercises what
production exercises.
(b) Harden the library: if `rateLimits` implements `IDictionary`, enumerate its keys; otherwise
`PSObject.Properties.Name`. The file's own comment at 123-127 records that this exact class
already shipped once and the live reading hid it.

**Verification condition.** A sim case pinning both shapes to the same verdict AND the same
`worstWindow`.

## [T4] + [F1] MEDIUM — CONVERGENT — the headless-stamp check reads the wrong transcript — **ACCEPT**

> "The UserPromptSubmit proof inspects the preceding UNKNOWN case for `WINDOW ALARM`, which a
> correct stamp cannot emit for that snapshot." — terra, `settings-proof-probe.ps1:206`

> "The probe's headless-stamp check reuses the UNKNOWN-case transcript, where a `WINDOW ALARM`
> line is impossible, so the headless evidence channel is dead and the recorded "UserPromptSubmit
> may not fire headless" limit can be a false negative." — flash, same line

**Both readers, blind to each other, landed on the same line.** Confirmed by reading: at line 206
`$c` still holds case 4, whose window dir is `$dirUnknown` (line 114, deliberately unparseable
JSON). A correct stamp emits the "sensor cannot be trusted, not halting" note for that dir and
cannot emit `WINDOW ALARM`. So `$headlessStamp` is false by construction, the else branch always
runs, and the limit "UserPromptSubmit may not fire headless" would be recorded in
`goal-evidence.md` as measured when it was never tested.

**Fix.** Run a dedicated stamp case against `$dirOver` and test THAT transcript. Keep the
direct-invocation fallback, but record the headless limit only when a run that COULD have produced
the line did not.

## [T5] MEDIUM — an unparseable `capturedAt` is treated as current — **ACCEPT**

> "An invalid or missing `capturedAt` leaves `readingAgeMin` null and is treated as current rather
> than `UNKNOWN`." — terra, `loop/work/window-lib.ps1:96`

**Real.** A `capturedAt` that will not parse leaves `$ageMin` null (94-98); line 149 guards the
whole staleness branch with `$null -ne $ageMin`, so the reading skips staleness entirely and is
scored as current. A corrupt-but-low snapshot then reads `OK` indefinitely.

That inverts this item's own doctrine in two ratified places: shared-invariants — "a broken
instrument is not a spent window" — and window-gate.ps1's own "never let it pass silently as OK".

**Fix.** A null age is an unknown age, never a fresh one. Apply the floor reasoning the stale
branch already uses: if the worst window is at or over the line, `PAUSE` (a window only climbs and
there is no evidence it reset); otherwise `UNKNOWN` with a reason naming the unusable timestamp.

**Verification condition.** Sim cases for both halves.

## [T6] + [F3] MEDIUM — path-formula copies and the toothless final assertion — **SPLIT RULING**

> "The alarm has an independent fallback path formula, with no fallback-path regression check."
> — terra, `loop/work/window-alarm.cmd:22`

> "The cmd's fallback snapshot directory is a second copy of the path formula that nothing
> exercises or guards, and the drill's own live-path strings are two more copies; the final
> "nothing wrote outside" assertion checks only the env var, proving nothing about writes."
> — flash, `window-alarm.cmd:22` and `window-watchdog-drill.ps1:187,209,378`

**(a) The alarm's copy — ACCEPT.** window-alarm.cmd:22 carries a second copy of the library's
formula in PRODUCTION code and nothing checks the two agree. A batch file cannot call the library,
so the copy stays; the fix is a check that goes red when they diverge. Add an assertion that
extracts the literal from window-alarm.cmd and compares it to `Get-WindowDir` with the override
unset.

**(b) The drill's two copies — REJECT, with the reason recorded.** A contamination canary must NOT
derive its reference to the live directory from the library it is auditing. If the library's
formula were wrong — which is precisely the failure that occurred on this item — a library-derived
canary would fingerprint the wrong file and see nothing. The independence is the point, not an
oversight. Add a one-line comment saying so, so a later reader does not "fix" it.

**(c) The final assertion — ACCEPT, and this one is sharp.** Line 378-379 asserts only that the
env var still holds its value. It proves nothing about writes. The incident this item actually had
was a synthetic 95% reaching the live snapshot, so the weakest guard in the drill sits on the exact
failure that occurred.

**Fix.** Fingerprint the live directory before the run — existence, hash and last-write of BOTH
`rate-limits.json` and `window-verdict.txt` — and assert at the end that nothing the drill did not
expect to change has changed. Keep the sessionId marker check as the positive canary.

## [T7] MEDIUM — the canary covers only `rate-limits.json` — **ACCEPT**, folded into [T6](c)

> "The live-contamination canary checks only `rate-limits.json`; the final "nothing wrote outside"
> assertion only rechecks the environment variable." — terra, `window-watchdog-drill.ps1:208`

**Real.** `Test-LiveContaminated` (208-212) reads only the live `rate-limits.json`. The sensor
writes TWO files, and the verdict file is the one the per-tool alarm reads — a synthetic ALARM
line in the live verdict file would fire the alarm in every session on this machine. The verdict
file carries no sessionId to match on, so the fingerprint comparison from [T6](c) is what covers
it. One fix serves both findings.

## [T8] LOW — the three-default net does not cover `window-wait` — **ACCEPT**

> "The claimed three-default boundary net never runs `window-wait.ps1` at 84/85 using its
> default." — terra, `loop/work/window-sim.ps1:73`

**Confirmed.** The sim invokes `window-wait.ps1` once, at line 238, with its default `PauseAt`
against a 94% reading. 94 is over both 85 and 90, so a `window-wait.ps1` still stuck at 90 passes
that check unchanged. The sim's comment at 71-72 — "a line half-moved between the gauge, the wait
and the library goes red here" — and plan D2 both claim the wait is pinned. It is not.

**Fix.** Add a boundary pair running `window-wait.ps1` with its DEFAULT `PauseAt` at 84 (must not
park) and at 85 (must park), both with `-MaxHours 0` so they exit immediately.

## [T9] + [F4] LOW — CONVERGENT — the stamp's prefix rewrite is coupled to an unpinned literal — **ACCEPT**

> "The formatter-prefix rewrite is coupled to an exact literal that the drill does not pin."
> — terra, `loop/work/stamp-hook.ps1:210`

> "The `-replace '^ALARM WINDOW '` coupling to `Format-WindowVerdictLine`'s composition is
> unguarded; a one-character drift double-prints or half-prints the founder's alarm line."
> — flash, same line

**Real, and converged on.** stamp-hook.ps1:210 strips `^ALARM WINDOW ` from the library's composed
line. Nothing pins that the library still composes that exact prefix, so a drift either
double-prints (`WINDOW ALARM  ALARM WINDOW …`) or leaves the founder's line malformed.

**Fix.** Two assertions: `Format-WindowVerdictLine` on a PAUSE verdict starts with exactly
`ALARM WINDOW `, and the stamp's emitted line contains `WINDOW ALARM` exactly once with no
surviving `ALARM WINDOW` after the prefix.

## [F2] MEDIUM — fault (b) proves the missing-file path, not the UNKNOWN-line path — **ACCEPT**

> "Fault (b) deletes `window-verdict.txt` before the corrupt-snapshot assertions, so "the per-tool
> alarm stays silent, as decided" is exercised via the *missing-file* path, not the *UNKNOWN-line*
> path the decision (gate1-rulings [3] point 3) actually specifies — and the production-reachable
> state would behave differently." — flash, `window-watchdog-drill.ps1:365-375`

**Confirmed.** Line 366 removes `window-verdict.txt` before `Invoke-Alarm` at 374, and
window-alarm.cmd:23 exits 0 on a missing file. So the assertion at 375 passes through the
missing-file branch, while the decision it claims to prove is the UNKNOWN-LINE silence recorded in
shared-invariants (57-60).

**And the untested state is the production-normal one**: after a corrupt snapshot the next sensor
refresh writes `UNKNOWN …` to the verdict file. The drill never exercises the state that actually
occurs when the sensor breaks.

**Fix.** After corrupting the snapshot, let the sensor write its UNKNOWN verdict line, assert the
file exists and begins with `UNKNOWN`, THEN assert the alarm exits 0. Keep a separate assertion for
the missing-file case, labelled as such.

## [F5] LOW — "none of them can message anyone" is literally false — **ACCEPT**

> ""None of them can … message anyone" is literally false, and the "decide nothing" sentence sits
> beside a gate that does refuse spawns — the wording needs naming, not just assertion."
> — flash, `.claude/skills/work/shared-invariants.md:48`

**Correct.** All three hooks message somebody, and that is what they are FOR: the deny reason
carries the choreography to the denied actor, the alarm puts the line on stderr for the model, the
stamp prints to the founder. The sentence beside them says they cannot.

This item introduced the sentence, so correcting it is this item's own mess, not scope growth.

**Dictated replacement, verbatim.** Replace the sentence beginning "None of them can stop running
work" and ending "the actor it denies." with exactly:

```
None of them can stop work already running, none can choose who is refused, and none can be
turned off by the actor it denies. They speak — that is their whole function — but they only
ever repeat the founder's standing line and the reading, and a message is not a decision.
```

This keeps two of the three original guarantees, replaces the false one with a true and equally
binding one (no discretion over who is refused), and names the distinction instead of asserting
it. It tightens the text; it loosens nothing.

## [F6] LOW — plan.md marks steps 6, 8, 10 and 12 Done with no artifacts — **ACCEPT**, and it is the most consequential of the six

> "The plan marks steps 6, 8, 10 and 12 "Done" (overhead medians measured and recorded;
> fold-binding forced-red proof recorded in `goal-evidence.md`; probe evidence; `goal-evidence.md`
> committed), but none of those artifacts exist at this commit." — flash, `plan.md:208-236`

**Confirmed.** No `goal-evidence.md` exists on this branch. PHASE-STATE.md says these steps were
deliberately deferred by plan design. Both statements cannot stand: the plan's text is the
executor's goal spec, and it currently asserts completed work that does not exist.

This is the record being false about what was built — the one class that is never mergeable. It is
also, exactly, this sitting's job.

**Fix.** The executor performs the deferred steps and writes `goal-evidence.md`. The record then
matches the tree. **Where a step cannot be completed, the plan says so explicitly with the reason,
and no step keeps a Done mark it has not earned.**

**Ruled in advance, on step 10 (the settings-proof probe).** The probe drives a headless `claude`
run, which makes real model calls. There is an active vendor incident tonight that has already
killed two sittings of this item. A probe that fails because the vendor is degraded produces noise,
not evidence — and recording that as "the entry did not fire" would be a false negative of exactly
the class [T4]/[F1] just caught. So: **attempt it once. If it cannot run — binary absent, or the
run fails with vendor-side errors — record the exact failure text and mark step 10 "attempted,
blocked by <reason>", never Done.** Do not retry beyond that one attempt. The merge sitting's
post-merge live check remains the other half of this proof. Refusing to fabricate a green is the
same rule the CI-unavailable class follows: when the signal cannot be obtained, say so.

---

## Disposition summary

| finding | severity | ruling |
|---|---|---|
| T1 | high | accept — mutex-serialize the pair; correct the impossibility claim |
| T2 | high | **reject** — disproven by probes A and B; narrow hardening adopted |
| T3 | medium | accept — probe uses the production shape; library handles both |
| T4 + F1 | medium | accept (convergent) — stamp case gets its own over-the-line run |
| T5 | medium | accept — null age is unknown, never fresh |
| T6(a) + F3 | medium | accept — pin the alarm's path literal against the library |
| T6(b) | medium | **reject** — the canary's independence is deliberate |
| T6(c) + F3 | medium | accept — fingerprint the live dir, do not check an env var |
| T7 | medium | accept — folded into T6(c); the canary covers both files |
| T8 | low | accept — add the 84/85 pair on window-wait's default |
| T9 + F4 | low | accept (convergent) — pin the `ALARM WINDOW ` prefix coupling |
| F2 | medium | accept — exercise the UNKNOWN-line path, not the missing-file path |
| F5 | low | accept — dictated replacement text above |
| F6 | low | accept — do the deferred steps; no unearned Done marks |

13 accepted, 2 rejected with written reasons. No finding contradicts ratified text and none is
scope growth, so nothing here goes to the founder.

---

# ADDENDUM — step 10, ruled after the executor's first pass

The executor applied all 13 accepted fixes, reached green on every suite, and then STOPPED on
step 10 and asked me rather than deciding. That was correct, and the case it found is genuinely
outside what I pre-decided.

## What it found

`settings-proof-probe.ps1:64` builds the probe's twin settings file like this:

```powershell
$twinText = $raw.Replace(($mainPrefix -replace '\\', '\\\\'), ($repo -replace '\\', '\\\\'))
```

`-replace` is the REGEX operator. The pattern `'\\'` matches one backslash, but in a .NET
replacement string a backslash is literal, so `'\\\\'` inserts FOUR. The probe therefore searched
the settings file for `C:\\\\Users\\\\nirdr\\\\...` while the file holds `C:\\Users\\nirdr\\...`.
Nothing matched, and the twin came out a byte-for-byte copy of the committed file, still carrying
MAIN-checkout paths. I confirmed this by reading line 64 myself.

`window-gate.ps1` and `window-alarm.cmd` do not exist in the main checkout yet, so two of the
entries pointed at absent files. The probe's own precheck caught it —
`FAIL every command in the twin points at a file that exists` — and the executor recorded nothing
as an entry failing to fire.

## Ruling — ONE re-run is authorised, and it does not widen the cap

**This is not the contingency I pre-decided, and the cap I wrote does not reach it.** That cap
was aimed at a degraded vendor: it existed to stop the executor burning attempts against an
unbounded external failure, and to stop a vendor failure being misrecorded as a hook entry not
firing. The vendor was healthy here — five runs, every stderr log empty, no 529.

The decisive point is narrower than "the cap was for something else". **The probe never put the
proposition under test.** It exercised a settings file that was not the branch's settings. That is
not a failed attempt at the hypothesis; it is a setup that never presented the hypothesis. This is
exactly the shape of the CI-unavailable class in my own contract: a run with no runner assigned
and zero steps executed is an ABSENT signal, not a red one, and the answer is to obtain the
signal — never to record a failure that was never observed. Counting this as the one attempt would
put "we tried and could not prove it" in the record when the truth is "we have not yet tried."

**The vendor cap stands unchanged at one attempt.** If the re-run fails vendor-side, that IS the
pre-decided contingency: record it blocked and stop.

## Bounds on the re-run

1. Fix line 64 only — plain string `.Replace('\','\\')` on both operands. Nothing else in the twin
   logic changes.
2. **The precheck is the gate.** If "every command in the twin points at a file that exists" still
   fails, STOP and report. Never run the headless cases against a twin that is still wrong — that
   guard already earned its keep once.
3. ONE re-run of the five cases.
4. **Record what the run actually shows, including a genuine non-firing entry.** That would be a
   real finding and it comes back to me, not into the record as a conclusion.
5. D11's contingencies are already ruled and stand: `PostToolUseFailure` not dispatched → drop
   that ONE entry, keep the rest, record the residual gap. `additionalContext` invisible on an
   allow → fall back to `systemMessage` only and record the reduced guarantee.
6. `goal-evidence.md` and `plan.md` then state the truth of the re-run, whatever it is. Step 9's
   status moves only if its own criterion is genuinely met.

Fixing the probe is not scope growth: step 10 is in the plan, the probe is the plan's own
artifact, and a one-line repair to make it run is completing planned work.

## Recorded, because the executor was right to raise it

The executor found a new defect while working and reported it instead of fixing it silently, and
it declined to re-run under a cap it could have read loosely. It also threw away two overhead
measurements that were wrong for reasons it could name — a reporting function that both printed
and returned, and twins that had crashed because `$PSScriptRoot` resolved to TEMP — and it refused
to measure the pre-item status line by running it, because that version ignores the override and
twenty-one runs would have written synthetic readings into the founder's live snapshot. That is
this item's own incident, avoided by the executor unprompted.

---

# ADDENDUM 2 — the alarm entries did not deliver. This is OUR defect, and it must be fixed before merge.

The probe re-run came back 10 of 12. It PROVED three things at runtime, one of them better than
the plan expected:

- the spawn gate DENIES against the deployed entry shape, with window, percent, reset and the
  parking choreography in the reason — the item's core mechanism, proven;
- `additionalContext` IS visible to the model on an allow, so D11's `systemMessage`-only fallback
  is not needed and the full guarantee stands. **Contingency closed.**
- `UserPromptSubmit` DOES fire headless and carries the founder line. The limit this item nearly
  recorded as measured — "UserPromptSubmit may not fire headless" — is DISPROVEN. That was only
  knowable because ruling [T4]/[F1] gave the stamp case its own over-the-line run; against the old
  UNKNOWN transcript it could never have passed. **The finding paid for itself.**

**Both alarm entries delivered nothing — `PostToolUse` and `PostToolUseFailure` alike.** The
executor established, before calling it a negative, that a real tool call happened in both runs,
that the synthetic reading reached the child processes (the gate denied at 95% in the SAME runs),
that `window-alarm.cmd` works when invoked as `cmd /c "<path>"`, and that every other entry in the
same twin fired. It then declined to guess between "not dispatched" and "dispatched but the exit-2
stderr was not surfaced", and brought it to me. Correct.

## The ruling — it is neither of those two hypotheses, and I am not deferring it

I read `.claude/settings.json` myself. The correlation is total and it points at us:

| entry | invocation | delivered? |
|---|---|---|
| PreToolUse → guard-branch-switch | `powershell -NoProfile … -File "…"` | yes |
| PreToolUse → window-gate | `powershell -NoProfile … -File "…"` | **yes** |
| UserPromptSubmit → stamp-hook | `powershell -NoProfile … -File "…"` | **yes** |
| SessionStart | `powershell -NoProfile … -File "…"` | yes |
| PostToolUse → window-alarm | `"C:\…\window-alarm.cmd"` — **no interpreter** | **no** |
| PostToolUseFailure → window-alarm | `"C:\…\window-alarm.cmd"` — **no interpreter** | **no** |

Every entry that names an interpreter fired. The only two that do not name one are the only two
that did not. The executor's own measurement fits: the batch file works under `cmd /c`, and the
bare quoted path was never tried the way the hook runner would actually invoke it.

**The MECHANISM is a hypothesis, and I am marking it as one rather than letting it stand as fact.**
My proposed explanation is that a hook command runs through a shell which cannot execute a `.cmd`
file directly, and which may consume the backslashes in the path. **I tried to verify that locally
and could not**: the `bash` on this machine's PATH is
`C:\Users\nirdr\AppData\Local\Microsoft\WindowsApps\bash.exe`, a WSL stub that mangles Windows
paths, so it is not the hook runner's shell and nothing it does is evidence about one. An earlier
draft of this addendum asserted the shell mechanism outright. That was me stating an unverified
fact in a ruling — the same defect I accepted [T1] and [F6] for — and this paragraph is the
correction.

**The RULING does not depend on the mechanism.** It rests on the correlation, which is
observational and comes from the real runtime: entries with an explicit interpreter deliver, this
one does not. Wrapping it in an interpreter is justified by that alone, and the re-run is what
confirms it empirically. If the corrected entry delivers, the fix is proven whatever the
underlying cause was.

**So this is not an instrument limitation and not an unprovable absence. It is a defect in our own
wiring, it is reachable, and it would have shipped a checkpoint that silently never runs** — which
is precisely the failure class this whole item exists to remove. It does not get deferred to a
post-merge check.

## What the executor does — one invocation, a decision tree, at most one probe run

1. **Cheap local diagnosis first, no model calls.** Invoke the alarm entry exactly as
   `settings.json` spells it, through the same shell a hook runs in, and record what happens.
   Then invoke it as `cmd /c "<path>"`. If the bare form fails and the `cmd /c` form works, the
   hypothesis is confirmed and no further diagnosis is needed.
2. **If confirmed, fix `.claude/settings.json`**: both alarm entries invoke through `cmd /c`.
   `.claude/settings.json` is in the declared territory. The measured 35.5 ms median already
   reflects the `cmd /c` form, so the overhead number stands and step 6 needs no re-measurement —
   confirm that rather than assume it.
3. **Then ONE probe re-run** to prove the corrected entries deliver. This is the run that closes
   step 10 and moves step 9.
4. **If the bare form turns out to work standalone**, the hypothesis is wrong: STOP, do not fix
   anything, report to me. I will rule again. Do not start characterizing the runtime on your own
   initiative — that is a different investigation and it needs a ruling first.
5. If a genuine `PostToolUseFailure`-only gap survives a corrected success entry, D11's
   pre-decided contingency finally applies as written: drop that ONE entry, keep the rest, record
   the residual gap.

## Recorded

**The probe earned its place.** Plan-review ruling [6] mandated it over the objection that the
settings JSON parsing plus a post-merge check was enough. It caught a checkpoint that does not run
at all, before merge. Without it this item would have shipped three hooks and delivered two, with
a green suite and a true-looking record.

**A disclosure from the executor, recorded because it disclosed it.** Its `git add` of the item
directory swept in three untracked files that were mine — `audit-additions.md`,
`artifacts/gate2-verification/mutex-privilege-check.out.txt` and
`artifacts/gate2-verification/post-fix-gate-recheck.out.txt` — so they sit under a commit message
that does not describe them. They belong in the record and they are in it. No history is rewritten
for a cosmetic attribution; saying so here is the correction.

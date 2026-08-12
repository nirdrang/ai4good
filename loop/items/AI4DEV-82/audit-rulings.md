# AUDIT RULINGS — AI4DEV-82 (window guard at the sitting boundary)

Audit sitting, orchestrator on **fable** (claude-fable-5), 2026-08-12. Head audited:
`d881b318ae3ba89ea2c40f71c460ab5b6c197da8`. Chain, derived from the branch:
`AI4DEV-4 (the work skill)` > `AI4DEV-82 (window guard at the sitting boundary)`.

Panel of two, blind to each other, both landed with findings:

- reader one · `gpt-5.6-luna` (codex, effort max, sandbox read-only) — 3 findings, 30/33
  checklist PASS, 1 COULD-NOT-VERIFY.
- reader two · `opencode-go/deepseek-v4-flash` (--variant max, agent reviewer-flash) — 4
  findings; its cage had no shell and barred `loop/items/AI4DEV-82/artifacts/`, so 3 checklist
  boxes and the scope box are COULD-NOT-VERIFY rather than graded. Not an empty-gate condition.

Every claim below was verified first-hand against the tree before ruling. Evidence is cited by
pointer; raw outputs and distillates are committed beside this file in `artifacts/`.

## Scope — verified by this sitting directly

Flash could not run the change-set command; luna's table does not state a scope verdict. This
sitting ran the item's declared command itself:

```
git diff --name-only 390042c...d881b31 -- loop/work loop/drills .claude/settings.json .claude/skills .claude/agents
```

Result: exactly the 13 declared files, nothing else. The full-tree diff adds only
`loop/items/AI4DEV-82/` record paths, which the checklist allows. **SCOPE CLEAN.**

## Convergence

Luna [3] and flash [2] converge on one defect — `shared-invariants.md` stating end-to-end alarm
delivery as fact. Two blind readers landing on the checklist's own pre-declared tripwire
(claim 32) is the strongest signal a panel gives. Ruled once, below, as the convergent finding.

---

## Ruling 1 — luna [1], MEDIUM, `loop/work/window-sim.ps1:49` — **ACCEPT**

> "The permanent simulation does not pin the gauge's full CLI surface. Human output,
> `-StaleMinutes`, and combined flag behavior can regress while the simulation remains green
> because JSON output is the only reusable gauge path and non-JSON output is discarded."

Verified: the sim's reusable `Gauge()` helper (line 50) always passes `-Json -SnapshotPath`;
the only non-JSON invocations are two `-ExitOnReady` exit-code checks (lines 165, 168).
`-StaleMinutes` appears nowhere in the file; the gauge-level `-PauseAt` and the human output
lines are never asserted on. Checklist claim 2 ("`window-sim.ps1` pins the gauge's full CLI
surface, not a subset") is therefore false against the tree.

For the record: gate-1 ruling [2] **as ruled** was a one-time capture-diff at refactor time,
which was done and its evidence committed (`artifacts/gauge-capture-before.txt`, `-after.txt`).
The checklist restated it as a standing property of the sim. The record is the checklist, and
rather than weaken the claim, the code rises to it — the permanent-coverage point is real:
human output and staleness flags can regress silently today.

**Fix 1 (executor):** extend `window-sim.ps1` to pin the remaining gauge CLI surface. New
checks, asserting on content and not only exit codes:
- human (non-`-Json`) output for one OK, one PAUSE and one UNKNOWN reading — assert the verdict
  word appears in the human lines;
- `-StaleMinutes` override: a reading ~60 minutes old is UNKNOWN at the default 15 but OK with
  `-StaleMinutes 120` (under-the-line reading);
- gauge-level `-PauseAt`: a 50% reading is OK at the default and PAUSE with `-PauseAt 40`;
- `-ExitOnReady` combined with `-Json`: exit code and JSON both present.

Done-criterion: `window-sim.ps1` green with the new checks included; each new check names what
it pins.

## Ruling 2 — luna [2], HIGH, `loop/drills/window-watchdog-drill.ps1:494` — **ACCEPT, FIXED DIFFERENTLY**

> "The live-directory guard does not compare the complete fingerprint it records. It only
> detects deletion of previously existing files and hash changes; it ignores `LastWrite` and
> newly created files, so a same-content rewrite or a new live `OK` verdict can evade the guard
> and avoid aborting."

Verified, and the record-falseness is worse than the finding states: the drill's own comment at
lines 228-229 promises the verdict file is "covered by a fingerprint taken before anything runs
and compared at the end. Existence, hash and last-write, for both files" — and the comparison at
493-500 never reads `LastWrite`. The file documents a comparison that does not happen. The
assert label at 502 ("no live file carries anything this drill wrote") also claims more than
the check performs (marker match plus exact ALARM-line match).

**The proposed remedy direction is not adopted.** Making `LastWrite` deltas or new files RED
would false-positive on every run: the founder's live session rewrites both files legitimately
while any drill runs, which the code documents at 482-488 as the reason hash changes are
note-only. The deliberate red set — deletion, the drill marker, a drill ALARM line — covers
every artifact that can park real work: every drill snapshot carries the
`window-watchdog-drill` sessionId (line 163), every verdict line the run produces is remembered
(lines 170, 181), and the mid-run canary aborts on the marker (claim 28, PASS). What the red
set cannot catch — a drill-written live `OK`/`UNKNOWN` verdict, a same-content rewrite — parks
nothing. The defect that remains is silence and false documentation, and that is what changes:

**Fix 2 (executor):** in `window-watchdog-drill.ps1`:
- (a) the closing comparison uses the complete recorded fingerprint and classifies per file:
  deleted → red (unchanged); drill marker or drill ALARM line → red (unchanged); created
  (before `Exists` false, after true) → distinct note line; rewritten with identical content
  (`LastWrite` moved, hash equal) → distinct note line; content changed (hash moved) → note
  line as today. Notes name the class in plain words and say why it is never red (the founder
  session writes these files of its own accord during the run).
- (b) the comment block at 482-488 extends its deliberately-not-red list to name the
  created-file case and the same-content rewrite, with the same reasoning.
- (c) the assert label at 502 becomes exactly: `no live file carries the drill marker or an
  ALARM line this run produced`.

Done-criterion: drill standalone green; the three red conditions unchanged in behaviour; the
note channel demonstrably distinguishes the classes (visible in the code, no live-file writes
in any test).

Severity acknowledged as HIGH for the false documentation inside a safety guard; real-work
exposure is bounded because the evading classes cannot park work.

## Ruling 3 — CONVERGENT: luna [3], MEDIUM + flash [2], medium, `.claude/skills/work/shared-invariants.md:43-48` — **ACCEPT**

> luna: "The contract presents the per-tool alarm as delivering the verdict to any model within
> one tool call, although the item's runtime claim is narrowed to isolation."
> flash: "the file says 'Three hooks enforce that standing line mechanically' and that
> 'window-alarm.cmd (PostToolUse and PostToolUseFailure) puts the verdict line in front of any
> model within one tool call' — a claim that all three hooks work ... contradicted by the
> contract file every role reads first."

Verified against the file and against the item's own record. PHASE-STATE and gate2-rulings
ADDENDUM 3 are explicit: the per-tool alarm is proven in isolation only, its end-to-end
delivery is NOT proven, and any sentence saying "three hooks working" is false. Checklist
claim 32 pre-declared exactly this tripwire. The contract file every role reads first must not
overclaim the guard's coverage: an actor relying on the alarm to surface failed tool calls
would be relying on an unproven channel — flash's "why it matters" names the harm precisely.

Flash's own counter-reading (the sentence as contract-spec rather than evidence) is noted and
rejected: the grammar is indicative-present fact ("puts"), and claim 32 committed the item to
reading it as a claim.

**Fix 3 (executor):** in `.claude/skills/work/shared-invariants.md`, replace the passage
beginning `- **Three hooks enforce that standing line mechanically` up to and including
`puts it in front of the founder on every prompt.` with EXACTLY this text (the F5-ruled
sentences that follow stay verbatim, untouched):

```
- **Three hooks apply that standing line mechanically, and they decide nothing.** They are the
  prompt stamp's class of machinery: they apply a decision the founder already made, at the
  moment it bites, and they are incapable of anything else. `window-gate.ps1` (PreToolUse on the
  `Agent` tool) refuses a SPAWN at the line, and `stamp-hook.ps1` puts the verdict in front of
  the founder on every prompt — both proven at runtime. `window-alarm.cmd` (PostToolUse and
  PostToolUseFailure) is wired to put the verdict line in front of any model within one tool
  call; it is proven in isolation, and its end-to-end delivery through the hook runner is not
  yet proven — the live check after the window-guard item merges settles it.
```

Done-criterion: the file carries the dictated text, the F5 sentences unchanged, and no sentence
in the tree claims three working hooks.

## Ruling 4 — flash [1], low, `loop/work/window-gate.ps1:14` — **ACCEPT**

> "the new gate file's header still says it 'cannot message anyone' — the exact statement class
> the F5 ruling removed from shared-invariants.md as literally false. ... The F5 fix was
> applied to shared-invariants.md only; the identical sentence in this new file was missed."

Verified: lines 13-15 read "It cannot stop running work, it cannot message anyone, and it
cannot be turned off by the actor it denies." The gate's deny reason and its warnings ARE
messages — that is its function. F5's fix was scoped to the file the finding named; this twin
sentence was missed.

**Fix 4 (executor):** in `window-gate.ps1`, replace that sentence with EXACTLY:

```
It cannot stop running work, it cannot choose who is refused, and it cannot be turned off by
the actor it denies. It speaks - the deny reason and the warnings are its whole function - but
it only ever repeats the founder's standing line and the reading, and a message is not a
decision.
```

(re-wrapped as `#` comment lines to match the file). Comment-only, no behaviour change.

## Ruling 5 — flash [3], low, `plan.md:231, 236-238` — **ACCEPT, FIXED DIFFERENTLY**

> "the steps section still carries 'Done:' annotations asserting [probe green / alarm
> delivered] — both states that goal-evidence.md explicitly reports as NOT achieved ... the F6
> fix ('no step keeps a Done mark it has not earned') was applied to the table, not the
> steps-section annotations it was written about."

The facts are right and the reviewer's own bound is also right: line 250 declares every "Done:"
line a criterion, and the status table honestly marks step 9 PARTLY MET and step 10 RUN
10-of-12 — luna graded claim 20 PASS on exactly that basis. The residue is ordering: the
convention is declared AFTER twelve uses of the word, so a cold reader meets "Done:" as a
status marker first. Rewriting the steps after the fact is not the fix — rewriting criteria is
how records stop being trustworthy.

**Fix 5 (executor):** insert one paragraph immediately under the `## Steps` heading in
`plan.md`, before step 1, EXACTLY:

```
The `Done:` line on each step below is the step's CRITERION — what it must satisfy — not a
status. The status of record is the table in "What actually happened, step by step", further
down; steps 9 and 10 did not fully meet their criteria, and that table says so.
```

## Ruling 6 — flash [4], low, claim 33's third clause — **ACCEPT**

> "the overhead claim asserts the ~35 ms alarm-hook median 'is of the entry as it actually
> stands' ... the record's own only statement on the topic (ADDENDUM 2) says 'the measured
> 35.5 ms median already reflects the cmd /c form', and the executor was told to 'confirm that
> rather than assume it' — no confirmation appears in the visible record. The committed entry
> has no wrapper (ADDENDUM 3 forbade one), so the measured form and the shipped form may
> differ."

Settled exactly the way the reviewer proposed — by reading `artifacts/overhead-measure.ps1`.
Lines 86, 91 and 96 time the alarm as `& cmd /c "<path> 2>nul"` from PowerShell. The deployed
entry (`settings.json` lines 38, 48) is the bare quoted path, no interpreter. So:

- ADDENDUM 2's statement is CONFIRMED — the measurement does reflect the `cmd /c` form. This
  paragraph is the confirmation it asked for, now in the record.
- Checklist claim 33's third clause ("that measurement is of the entry as it actually stands")
  is FALSE as stated. The numbers themselves stand: any `.cmd` executes under `cmd.exe`, so
  35.5 ms is the honest cost of the batch file under a cmd spawn. What is NOT measured is the
  hook runner's own spawn path — the same unproven channel as delivery itself.

**Fix 6 (executor):** in `goal-evidence.md` section 4 (the two overhead numbers), append one
paragraph after the alarm-hook table's target line, EXACTLY:

```
**What the measurement invokes, stated precisely.** `artifacts/overhead-measure.ps1` times
`cmd /c "<path-to-window-alarm.cmd>"` launched from PowerShell — a batch file always executes
under `cmd.exe`, so this is the cost of the batch file under a cmd spawn. The deployed entry in
`.claude/settings.json` is the bare quoted path with no interpreter; the hook runner's own
spawn form is not measured, and it is the same unproven channel as the alarm's end-to-end
delivery. The 35.5 ms median is the batch file's cost, not an end-to-end measurement of the
deployed entry.
```

The rebuilt claim checklist for the audit re-run carries the corrected clause.

---

## Dispositions that are not findings

- **luna checklist 33 COULD-NOT-VERIFY** (the 35 ms median): acknowledged. Execution evidence
  is deliberately not the auditor's to gather; the committed script and output are the
  evidence, and Ruling 6 supplies the invocation-form confirmation ADDENDUM 2 asked for.
- **flash checklist boxes 6, 11, 12 COULD-NOT-VERIFY** (cage: no shell, artifacts barred):
  covered — luna graded all three PASS with full read access. A limited seat beside a graded
  seat is evidence, and it is recorded here.
- **flash scope box COULD-NOT-VERIFY:** settled by this sitting's own run of the declared
  change-set command. SCOPE CLEAN (above).
- **Both readers found no unimplemented adopted ruling** beyond the above: luna 30/33 PASS
  including both rejected-ruling boxes (21, 22 — the rejected fixes were confirmed NOT
  implemented); flash PASS on everything its cage allowed.

## Evidence committed with these rulings

Both readers' raw outputs and distillates, the opencode reader's tool-call summary and identity
extract, and — force-added past `.gitignore:3` (`*.log`) — `audit-luna-stderr.log`. The same
force-add repairs two earlier silent omissions: `gate1-sol-stderr.log`, `gate2-terra-stderr.log`
and `gate2-terra.stdout.log` were part of those phases' records but never staged, because
`*.log` is ignored and a plain `git add` skips it silently — the exact trap
`shared-invariants.md` documents for `.claude/`. Recorded as a repair, not rewritten history.

## Consequence — the audit re-run

Fixes 1 and 2 change verification code; fixes 3 and 4 change a contract file and a guard's
header. That is substantive: per the once-per-item rule, the WHOLE PANEL re-runs at the new
head, scoped to the fix delta (`git diff d881b31...<new-head>` in the code territory) plus the
scope box against the full file list. `PHASE-STATE.md` carries the rebuilt claim checklist.

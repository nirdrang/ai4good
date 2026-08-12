# Plan — AI4DEV-82 (window guard at the sitting boundary)

Branch: `nirdrang/ai4dev-82-window-guard-at-the-sitting-boundary-park-before-the-wall`, cut from
main at 390042c. Chain: `AI4DEV-4 (the work skill)` > `AI4DEV-82 (window guard at the sitting
boundary)` — a bring-up item; no PM requirement above it, no database slot (confirmed by the
coordinator: hooks, PowerShell scripts and a drill).

**AMENDED after gate 1** (DRAFT sitting, 2026-08-12). All six findings accepted — two of them
fixed differently than proposed. The rulings, with each claim quoted, are in
`gate1-rulings.md`. The amendments are folded in place below: D3 (coupled verdict-first write),
D4 (model-visible UNKNOWN channel, non-mute error path), D5 (both post-tool events), D6 (stamp
computes via the lib), D8 (fault-injection assertions), new D11 (settings-proof probe), step 1
(capture-diff), step 8 (harness fold binding), step 9 (strengthened), new step 10 (the probe).

## What the item asks (specification pointers, not paraphrase)

The full specification is the Linear item description (filed 2026-08-12, carries every founder
ruling). The load-bearing points, verified against it:

- The line is **85%** (founder 2026-08-12), superseding the 90% of 2026-08-06. One line: alarm
  and park are the same line.
- Three hooks: a **PreToolUse gate on the Agent tool** (deny spawns at ≥85), a **PostToolUse
  alarm on every tool** (model-visible `WINDOW ALARM` within one tool call), a **stamp alarm**
  on UserPromptSubmit (founder-visible line while ≥85).
- **Checkpoints read, they never compute**: the sensor (`statusline.ps1`) writes a one-line
  VERDICT file on every snapshot write; the per-tool hook reads that one line. The full gauge
  logic runs once per sensor refresh. Per-call overhead is measured in the build.
- PAUSE → deny with window name, percent, reset time. UNKNOWN → allow and warn loudly. OK →
  allow silently. Gauge default moves 90 → 85 with comment updates.
- Pause propagation: a denied actor writes state, reports to its spawner, ends; the denial
  travels up one level at a time until the conductor parks the item (park note, push,
  `PARKED — window low` flow line). Running work is never interrupted. Resume is centralized in
  the coordinator; the conductor that parked is not the conductor that resumes.
- A new drill in `loop/drills/`, wired into the harness, four synthetic-snapshot assertion
  groups, never touching the live snapshot.
- `shared-invariants.md` records the ruling next to "the coordinator decides".

## The measured first step (gates the whole design)

**Done, and positive.** PreToolUse hooks fire for Agent calls made inside spawned agents —
measured three ways (docs; a live deny of this very sitting's PowerShell call at nested depth 2;
a headless probe whose logs show `PreToolUse tool=Agent` with a non-empty `agent_id`). Evidence:
`artifacts/hook-measurement.md` and `artifacts/hookprobe/`. **The fallback (conductor runs the
gauge before each spawn, per contract) is not needed and is not built.** Also measured: the spawn
tool's matcher name is `Agent`; the deny reason reaches the denied actor's transcript; PostToolUse
fires inside subagents; UserPromptSubmit appeared in no subagent log — so the PostToolUse alarm
(agents) and the stamp alarm (founder session) are both required, exactly as the item says.

## Decisions

- **D1 — one verdict implementation, extracted into a library.** New `loop/work/window-lib.ps1`
  exports `Get-WindowVerdict` (snapshot object or path + PauseAt + StaleMinutes → the result
  object `window-gauge.ps1` builds today, verdicts OK/PAUSE/UNKNOWN with the existing stale
  rules) and `Format-WindowVerdictLine` (result → the one verdict line). `window-gauge.ps1`
  becomes a thin CLI over the lib with identical flags, output shapes and exit codes — every
  existing caller (`window-wait.ps1`, `window-sim.ps1`, the coordinator's FLOW/PULSE reads) is
  untouched. Rationale: the sensor must compute the verdict in-process (statusline's cost
  doctrine forbids a second powershell spawn per refresh), and a re-implementation inside
  statusline is the drift class the project already paid for once (statusline's own header
  records it). The item's sentence "runs window-gauge.ps1 -Json" is honored as "runs the gauge's
  verdict logic"; the gate runs that logic in-process through the same lib. This is stated as a
  deliberate mechanism choice, not a founder decision.
- **D2 — the line moves to 85 in the param defaults that carry it.** As built, the number lives
  in THREE places, not two (executor deviation, accepted by the recovery DRAFT sitting
  2026-08-12): the canonical `$script:WindowPauseLine = 85` in `window-lib.ps1` — the value the
  gate, sensor and stamp use through the library — plus the CLI param defaults in
  `window-gauge.ps1` and `window-wait.ps1`, which are separate processes whose `param()` defaults
  cannot evaluate a dot-sourced value. All three carry the founder-ruling comment (2026-08-12
  supersedes the number; the one-line principle stands), and `window-sim.ps1`'s 84/85 boundary
  cases go red if any copy is left behind. `window-sim.ps1`'s boundary cases move with it (89/90 hardcodes
  become 84/85; float-noise cases become 84.6/84.4; the fill-up narrative crosses at 85). The sim
  stays the gauge's regression net and must be green after the move.
- **D3 — the verdict file (amended per gate 1 finding 4; amended again per gate 2 [T1]).**
  `statusline.ps1` computes the verdict from the in-memory snapshot via the lib, writes
  `window-verdict.txt` FIRST, then writes `rate-limits.json`, both inside ONE try block. A
  verdict-write failure therefore also skips the snapshot write.
  **That envelope holds for ONE writer and does nothing across two, and this text used to claim
  otherwise.** Claude Code spawns a fresh PowerShell per status-line refresh and several sessions
  run here routinely, so two writers can interleave — A verdict, B verdict, B snapshot, A snapshot
  — leaving a high snapshot beside an older `OK` verdict. The earlier wording said the invariant
  held "by construction" and called that state impossible; it was not impossible, and gate 2
  accepted the finding on the ground that a false statement about a guard is never mergeable.
  **What is guaranteed now**: both writes happen under the named system mutex
  `Global\ai4good-window-sensor`, so the pair is one act across processes; on a wait timeout BOTH
  writes are skipped, because a consistent pair one refresh old is strictly better than an
  inconsistent one. **The residual**: a refresh may be skipped under contention (it heals at the
  next one), and a verdict may be one refresh newer than its snapshot, which is conservative — the
  alarm fires on the newest data. A mutex that cannot be taken at all degrades to "no sensor
  update", which the staleness rules then report as UNKNOWN, loudly. Verdict shape: exactly
  one line, three forms:
  `OK` · `ALARM WINDOW <window> at <pct>% (line 85%), resets <HH:mm> - finish the current work
  item, commit, park.` · `UNKNOWN <reason>`. The first token is the machine anchor (`findstr /b`);
  the rest of the ALARM line is the full sentence the model hears — the sensor composes, the
  checkpoint regurgitates. UNKNOWN is a third literal because shared-invariants requires UNKNOWN
  to report loudly without halting; the alarm hook stays silent on it — a recorded decision with
  its reasoning in `gate1-rulings.md` [3]: a running subagent cannot act on UNKNOWN, and the
  actors who can act hear it at every spawn (gate) and every prompt (stamp). Failures writing
  never break the status line (existing never-throw envelope); a persistent write failure ages
  both files together into the stale rules.
- **D4 — the gate (amended per gate 1 finding 3):** new `loop/work/window-gate.ps1`, wired as
  PreToolUse matched `Agent`. It dot-sources the lib and computes a FRESH verdict from the live
  snapshot (the one checkpoint that must not act on a stale composition; it fires per spawn,
  which is rare, so the cost is fine). PAUSE → JSON `permissionDecision: "deny"` whose reason
  carries the window name, percent, reset time AND the parking choreography ("new work must not
  start: write your state, commit, push, report PARKED to your spawner, and end"). The machinery
  speaks at the moment it acts, so no role contract needs to memorize the choreography.
  UNKNOWN → allow + `additionalContext` (the model-visible field on a PreToolUse allow, per the
  hooks documentation — `systemMessage` is user-facing only) carrying the loud sensor warning,
  PLUS `systemMessage` for the user. The probe (D11) verifies the context actually reaches the
  actor; if the installed version does not surface it, fall back to `systemMessage` only and
  record the reduced guarantee in `goal-evidence.md`. OK → exit 0, silent. Internal error →
  fail OPEN like `guard-branch-switch.ps1`, but NOT mute: allow plus a best-effort
  `additionalContext`/`systemMessage` naming the error.
- **D5 — the alarm (amended per gate 1 finding 1):** new `loop/work/window-alarm.cmd` (a batch
  file, not PowerShell), wired under BOTH `PostToolUse` AND `PostToolUseFailure`, no matcher,
  same command — the documented events are mutually exclusive (success vs failure), and a failed
  call is a tool call too; exit 2 shows stderr to the model on both. The probe (D11) proves the
  installed version dispatches `PostToolUseFailure`; if it does not, drop that one entry and
  record the residual gap. Behavior: findstr-anchor on the verdict file's first token: ALARM →
  exit 2 with the verdict line on stderr (the documented model-visible channel); anything else →
  exit 0, silent. A `powershell -NoProfile` process costs roughly 200–400 ms per spawn on this
  machine and would be paid on EVERY tool call system-wide; `cmd /c findstr` is an order of
  magnitude cheaper. The build MEASURES both (median of 20 runs) and records the numbers in
  `goal-evidence.md`; the target is a median at or under 100 ms for the alarm hook.
- **D6 — the stamp alarm (amended per gate 1 finding 4):** `stamp-hook.ps1` COMPUTES the verdict
  via the lib from the snapshot (dot-source + one JSON parse per prompt, negligible beside its
  git calls) and appends to its extra lines: ALARM → a `WINDOW ALARM` line with the composed
  verdict text; UNKNOWN → a one-line "sensor cannot be trusted, not halting" note with the
  reason. It does NOT read the raw verdict line: the founder's channel must always apply the
  stale rules, and a raw-line read would echo an hours-old `OK` if the sensor died. The item's
  "checkpoints read, they never compute" principle is, in the item's own words, about the
  PER-TOOL hook's near-zero cost; the gate already computes fresh per spawn, and the stamp per
  prompt is the same class. The alarm hook remains the one dumb reader.
- **D7 — one override mechanism for the drill:** env var `AI4GOOD_WINDOW_DIR` redirects the
  directory holding `rate-limits.json` + `window-verdict.txt` for the sensor, the gate, the
  alarm and the stamp's verdict read — and, as built, also for the gauge CLI (executor
  deviation, accepted by the recovery DRAFT sitting 2026-08-12: the gauge resolves its default
  snapshot path through the library's one path helper, so there is exactly one path formula;
  behaviour with the variable unset is unchanged, and the step 1 capture-diff is the proof).
  Existing `-SnapshotPath` params stay. The drill sets the
  env var to a temp dir; the live files are never touched, and the drill asserts its dir is not
  the live dir.
- **D8 — the drill (amended per gate 1 findings 4 and 5):** new
  `loop/drills/window-watchdog-drill.ps1`, self-contained (own PASS/FAIL lines, exit 1 on red),
  invoked from `run-drills.ps1` as one folded assertion — but the fold must BIND: gate 1 found
  that `$failed` is computed at `run-drills.ps1:297` BEFORE the twin assert at 300–301, so a
  folded FAIL prints and exits 0 today. Step 8 moves the `$failed` computation after ALL asserts
  (which also repairs the twin-check binding — a rides-along inside declared territory, named in
  the pull request). Group 4 gains fault-injection assertions (gate 1's verify-first, made
  permanent and synthetic): (a) fault the verdict write — pre-create `window-verdict.txt` as a
  DIRECTORY in the override dir — and assert the snapshot also did not update (the coupled
  envelope held); (b) corrupt/truncate the snapshot and assert gate = UNKNOWN allow+warn,
  stamp = unknown note, alarm = silent. Hook stdin is fed via pipes/files, never inline quoted
  JSON (run 1 of the measurement showed native-argument quoting mangling nested quotes).
- **D9 — contracts:** `shared-invariants.md` gains a short recorded ruling in the usage-window
  section: the 85 line (founder 2026-08-12, superseding 90 of 2026-08-06); the spawn-boundary
  hook and the two alarms as mechanical enforcement of a decision already made — the stamp's
  class of machinery, never a second authority; the coordinator remains the only decider; the
  denied-actor and conductor parking shape; resume centralized, one item at a time.
  `conductor.md` gains the park-note choreography (park note with item, next phase, verified
  head; push; `PARKED — window low` flow line; end; a FRESH conductor resumes from the note).
  **The orchestrator twins are deliberately untouched** — the deny reason instructs the denied
  actor, so no twin edit (and no twin-sync hazard) is needed this item.
- **D10 — not built, recorded as shelved** (per the item): the limit-death ledger and the
  outside-the-account actor.
- **D11 — the settings-proof probe (new, per gate 1 finding 6).** A headless `claude -p` run,
  using the probe machinery the plan sitting built (`artifacts/hookprobe/`), proves the deployed
  hook ENTRIES load and fire — not just that the JSON parses. `AI4GOOD_WINDOW_DIR` points the
  probe at synthetic dirs. Required evidence, from the probe's transcript and hook logs:
  ≥85 dir → an attempted Agent spawn DENIED with window name, percent, reset in the reason
  (PreToolUse entry); the `WINDOW` alarm line model-visible after a successful tool call
  (PostToolUse entry) AND after a deliberately failing tool call (PostToolUseFailure entry —
  finding 1's runtime proof); UNKNOWN dir → spawn allowed with the warning visible (finding 3's
  channel proof); the stamp entry is an EDIT to an already-wired hook — assert its alarm line in
  the headless run if UserPromptSubmit fires headless, otherwise assert by direct invocation and
  record that limit. **Path honesty:** the committed settings carry main-checkout absolute paths
  (live only post-merge), so the probe runs against a GENERATED twin of the branch's settings
  whose command paths substitute this worktree — identical event names, matchers, shape and
  invocation style; only the path prefix differs. If the probe turns out to load the worktree's
  own project settings directly, prefer the committed file and say so. The merge sitting's
  post-merge live check remains the second half of the proof, no longer the only half.

## Steps

The `Done:` line on each step below is the step's CRITERION — what it must satisfy — not a
status. The status of record is the table in "What actually happened, step by step", further
down; steps 9 and 10 did not fully meet their criteria, and that table says so.

1. **Extract `window-lib.ps1`; thin `window-gauge.ps1` over it, line still at 90.**
   Done: `window-sim.ps1` green (exit 0), AND a capture-diff (gate 1 finding 2): before the
   refactor, capture the CURRENT gauge CLI's full output over a fixed synthetic set — OK, PAUSE,
   stale-high, stale-low, missing file, unparseable file, missing `rateLimits` field — in every
   mode (`-Json`; human lines; `-ExitOnReady` exit codes with and without `-Json`); after the
   refactor, re-run and diff: identical except `readingAgeMin` (normalized). Both captures land
   in `goal-evidence.md`.
2. **Move the line to 85**: gauge + wait param defaults, founder-ruling comments, sim boundary
   updates (D2). Done: `window-sim.ps1` green at the new line, and the sim contains boundary
   cases at exactly 84/85.
3. **Write the drill file with all four assertion groups (D8), red where machinery is missing.**
   This is the item's executable test body, written before the machinery it tests:
   - Group 1 (≥85 synthetic snapshot): sensor writes an ALARM verdict; the gate denies an Agent
     spawn with window name, percent and reset in the reason; the alarm hook exits 2 with the
     `WINDOW` line on stderr; the stamp output carries `WINDOW ALARM`.
   - Group 2 (<85): verdict `OK`; gate allows; alarm exits 0 and stays silent; stamp carries no
     alarm line.
   - Group 3 (staleness): stale-high (over the line, window not yet reset) still DENIES;
     stale-low warns UNKNOWN (allow + warning, no deny).
   - Group 4 (verdict-file consistency AND fault injection, per gate 1 finding 4): the line the
     sensor writes equals `Format-WindowVerdictLine(Get-WindowVerdict(same snapshot))`, and each
     checkpoint's behavior agrees with that line for every group's snapshot; faulting the
     verdict write (verdict path pre-created as a DIRECTORY) also skips the snapshot write; a
     corrupt/truncated snapshot yields gate = UNKNOWN allow+warn, stamp = unknown note,
     alarm = silent.
   Done: the drill runs, groups 1–4 present, red only for not-yet-built machinery.
4. **Sensor writes the verdict file, verdict-first coupled envelope (D3) + `AI4GOOD_WINDOW_DIR`
   override (D7).** Done: statusline run with synthetic stdin and the override produces both
   files with the verdict never older than the snapshot; drill group 4 passes for the sensor
   half, including the coupled-envelope fault case.
5. **`window-gate.ps1` (D4).** Done: drill groups 1–3 gate assertions pass; UNKNOWN emits
   `additionalContext` + `systemMessage`; error injection (unreadable snapshot dir) fails open
   WITH the warning, never mute.
6. **`window-alarm.cmd` (D5).** Done: drill groups 1–2 alarm assertions pass; overhead measured
   (median of 20 invocations) and recorded; target median ≤ 100 ms.
7. **`stamp-hook.ps1` alarm + unknown lines (D6, computes via the lib).** Done: drill groups 1–2
   stamp assertions pass; a normal stamp run without the override still prints the standard two
   lines.
8. **Wire the drill into `run-drills.ps1`, and make the fold BIND (gate 1 finding 5).** Move the
   `$failed` computation after ALL asserts — this also repairs the twin-check binding
   (rides-along in declared territory, named in the pull request). Done: `run-drills.ps1` fully
   green including the watchdog drill and twin-check; binding proven once by forcing a watchdog
   assertion red in a throwaway run, recording exit 1 in `goal-evidence.md`, and restoring.
9. **Wire the hooks into `.claude/settings.json`** (PreToolUse matcher `Agent` → gate;
   PostToolUse AND PostToolUseFailure, no matcher → alarm.cmd; absolute paths as the file
   already does). Done: JSON parses; commands point at files that exist on the branch; AND the
   settings-proof probe (step 10) is green against the same entry shapes. NOTE, stated plainly:
   the running interactive session loads hooks from the MAIN checkout, so the live firing of the
   committed absolute paths cannot be observed from this branch before merge; the probe proves
   the entry shapes, and the merge sitting verifies live firing post-merge.
10. **The settings-proof probe (D11, new per gate 1 finding 6).** Done: probe evidence in
    `goal-evidence.md` showing each deployed entry shape fired — the deny with its reason, the
    alarm after a successful AND after a failing tool call, the UNKNOWN warning visible, the
    stamp case asserted or its headless limit recorded. Contingencies recorded where the ruling
    names them (PostToolUseFailure unsupported → drop that entry and record the gap;
    additionalContext invisible → systemMessage fallback and record the reduced guarantee).
11. **Amend `shared-invariants.md` and `conductor.md` (D9).** Done: text present, wording keeps
    "the coordinator decides" literally true (the hook applies the founder's standing line; it
    decides nothing), twin files untouched.
12. **`goal-evidence.md`**: drill + sim outputs, the capture-diff, the fold-binding proof, the
    probe evidence, the two overhead medians (alarm hook; statusline delta with the verdict
    write), and the settings wiring shown. Done: file committed.

## What actually happened, step by step (gate 2 [F6])

**Why this section exists.** Every "Done:" line above is a CRITERION — what the step must satisfy —
and nothing above records whether the step met it. A reader could not tell built from planned, and
the phase record separately said four of these steps were deferred. Gate 2 accepted the finding
that the record asserted work that did not exist, and ruled that no step keeps a Done mark it has
not earned. This table is the status; it is written by the executor that ran the work, and the
evidence for every MET row is in `goal-evidence.md` and `artifacts/`.

| step | status | on what evidence |
|---|---|---|
| 1. extract `window-lib.ps1` | **MET** | capture-diff identical apart from the capture script's own label line |
| 2. move the line to 85 | **MET** | sim green with boundary cases at exactly 84/85, and now at 84/85 on `window-wait.ps1`'s own default too |
| 3. write the drill, four groups | **MET** | 65 assertions, all four groups plus fault injection and contention |
| 4. sensor writes the verdict file | **MET** | drill group 4 sensor half green, including the coupled-envelope fault case |
| 5. `window-gate.ps1` | **MET** | drill groups 1–3 gate assertions green; UNKNOWN emits both channels; fail-open proven loud by the gate 2 probes A and B |
| 6. `window-alarm.cmd` | **MET** | drill groups 1–2 alarm assertions green; median of 20 measured at **35.5 ms**, target ≤ 100 ms met |
| 7. `stamp-hook.ps1` lines | **MET** | drill groups 1–2 stamp assertions green, and the founder line now pinned at both ends |
| 8. fold the drill in, make it BIND | **MET** | suite 74 of 74 exit 0; forced red gives 73 of 74 and **exit 1**; restored and re-measured green |
| 9. wire the hooks into settings | **PARTLY MET — three entry shapes proven, the alarm's is not** | the JSON parses and the paths are as specified. At runtime the PreToolUse gate, the UNKNOWN warning channel and the UserPromptSubmit stamp are all proven firing. The `PostToolUse` and `PostToolUseFailure` alarm entries delivered nothing, so this step's own criterion is not fully met. Not moved to MET to make the table look finished. |
| 10. the settings-proof probe | **RUN, 10 of 12 — two alarm entries did not deliver** | the first attempt was VOID, not failed: the probe's twin substitution used `-replace`, a regex operator whose replacement inserts four backslashes where two are needed, so the twin kept main-checkout paths and two entries pointed at absent files. The orchestrator ruled that an absent signal is not a red one and authorised ONE re-run after the one-line repair. The precheck was verified green BEFORE any headless case ran. The re-run PROVES: the deny with window, percent, reset and parking choreography; `additionalContext` visible on an allow (so D11's fallback is NOT needed); and `UserPromptSubmit` firing headless (so the feared "may not fire headless" limit is DISPROVEN). It does NOT prove the two alarm entries, which produced nothing in runs where a tool call demonstrably happened. Referred to the orchestrator. |
| 11. amend the contracts | **MET** | text present in `shared-invariants.md` and `conductor.md`; twins untouched; the one sentence that was literally false is replaced with the ruled wording |
| 12. `goal-evidence.md` | **MET** | committed, and it names step 10 as blocked rather than dressing it as measured |

**Where D11's two contingencies stand after the re-run.**
- `additionalContext` invisible on an allow — **does not arise.** The warning was visible in the
  transcript, so the `systemMessage`-only fallback is not needed and the full guarantee stands.
- `PostToolUseFailure` not dispatched — **the contingency's premise does not hold.** It says to
  drop that ONE entry and keep the rest, assuming the success event worked. Neither alarm entry
  delivered, so dropping one entry would not describe what was observed. This needs the
  orchestrator's ruling; the executor did not decide it.

The post-merge live check is now the only remaining instrument for the alarm entries. It is no
longer needed for the gate, the UNKNOWN channel or the stamp, all three of which are proven.

## Verification state

No acceptance-test ids attach to this item (bring-up under `AI4DEV-4 (the work skill)`); the
drill is the executable verification the item itself mandates.

| check | expected state at goal |
|---|---|
| `loop/work/window-sim.ps1` | green, exit 0, boundary at 84/85 |
| step 1 capture-diff | identical before/after outputs (readingAgeMin normalized), recorded |
| `loop/drills/run-drills.ps1` | green, includes watchdog drill + twin-check, fold binding proven once (exit 1 on a forced red) |
| `loop/drills/window-watchdog-drill.ps1` standalone | green, all four groups including fault injection |
| settings-proof probe | each deployed entry shape observed firing, evidence recorded |
| overhead numbers | measured and recorded; alarm median ≤ 100 ms |
| CI required check on the PR head | green (this branch touches only Claude territory: `loop/`, `.claude/`) |

## Scope declaration (for the audit brief later)

Code territory this item stays inside: `loop/work/window-lib.ps1` (new),
`loop/work/window-gauge.ps1`, `loop/work/window-wait.ps1`, `loop/work/window-sim.ps1`,
`loop/work/statusline.ps1`, `loop/work/window-gate.ps1` (new), `loop/work/window-alarm.cmd`
(new), `loop/work/stamp-hook.ps1`, `loop/drills/window-watchdog-drill.ps1` (new),
`loop/drills/run-drills.ps1`, `.claude/settings.json`,
`.claude/skills/work/shared-invariants.md`, `.claude/agents/conductor.md`, plus the item record
under `loop/items/AI4DEV-82/`. Nothing in `src/`, `supabase/`, `tests/` or `.github/`. The
auditors' change-set command must therefore be scoped to THIS path set — the default source-only
diff from the reviewer contract yields an empty list for this item.

## Slicing

One slice. The diff is roughly six small scripts, one batch file, a drill, and two contract
amendments — one code-gate read covers it without becoming a wall of findings.

## Proportionality note for the conductor

This is real machinery (scripts + hooks), but it lives entirely outside CI's heavy lanes: no
`src/`, no `tests/`, no workflow edits. The required check should take its fast path; the
verify suite for the goal step is the drill + sim, run locally by the executor. `bun install`
state in this worktree: none (the tree was re-registered this sitting — see
`artifacts/worktree-incident.md`); nothing in this plan needs node_modules.

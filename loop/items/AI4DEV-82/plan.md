# Plan — AI4DEV-82 (window guard at the sitting boundary)

Branch: `nirdrang/ai4dev-82-window-guard-at-the-sitting-boundary-park-before-the-wall`, cut from
main at 390042c. Chain: `AI4DEV-4 (the work skill)` > `AI4DEV-82 (window guard at the sitting
boundary)` — a bring-up item; no PM requirement above it, no database slot (confirmed by the
coordinator: hooks, PowerShell scripts and a drill).

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
- **D2 — the line moves to 85 in the two param defaults that carry it** (`window-gauge.ps1`,
  `window-wait.ps1`), with the founder-ruling comments updated (2026-08-12 supersedes the number;
  the one-line principle stands). `window-sim.ps1`'s boundary cases move with it (89/90 hardcodes
  become 84/85; float-noise cases become 84.6/84.4; the fill-up narrative crosses at 85). The sim
  stays the gauge's regression net and must be green after the move.
- **D3 — the verdict file.** `statusline.ps1`, immediately after writing `rate-limits.json`,
  computes the verdict from the in-memory snapshot via the lib and writes
  `window-verdict.txt` beside it. Exactly one line, three shapes:
  `OK` · `ALARM WINDOW <window> at <pct>% (line 85%), resets <HH:mm> - finish the current work
  item, commit, park.` · `UNKNOWN <reason>`. The first token is the machine anchor (`findstr /b`);
  the rest of the ALARM line is the full sentence the model hears — the sensor composes, the
  checkpoint regurgitates. UNKNOWN is a third literal because shared-invariants requires UNKNOWN
  to report loudly without halting; the alarm hook stays silent on it (the gate and the stamp
  carry it). Failures writing the verdict never break the status line (existing never-throw
  envelope).
- **D4 — the gate:** new `loop/work/window-gate.ps1`, wired as PreToolUse matched `Agent`. It
  dot-sources the lib and computes a FRESH verdict from the live snapshot (the one checkpoint
  that must not act on a stale composition; it fires per spawn, which is rare, so the cost is
  fine). PAUSE → JSON `permissionDecision: "deny"` whose reason carries the window name, percent,
  reset time AND the parking choreography ("new work must not start: write your state, commit,
  push, report PARKED to your spawner, and end"). The machinery speaks at the moment it acts, so
  no role contract needs to memorize the choreography. UNKNOWN → allow + `systemMessage` warning
  (loud, non-blocking). OK → exit 0, silent. Internal error → fail OPEN, like
  `guard-branch-switch.ps1`: a broken guard must not stop every spawn.
- **D5 — the alarm:** new `loop/work/window-alarm.cmd` (a batch file, not PowerShell), wired as
  PostToolUse with no matcher. It findstr-anchors on the verdict file's first token: ALARM →
  exit 2 with the verdict line on stderr (the documented model-visible channel); anything else →
  exit 0, silent. A `powershell -NoProfile` process costs roughly 200–400 ms per spawn on this
  machine and would be paid on EVERY tool call system-wide; `cmd /c findstr` is an order of
  magnitude cheaper. The build MEASURES both (median of 20 runs) and records the numbers in
  `goal-evidence.md`; the target is a median at or under 100 ms for the alarm hook.
- **D6 — the stamp alarm:** `stamp-hook.ps1` reads the verdict file (one guarded
  `Get-Content -TotalCount 1`) and appends to its extra lines: ALARM → a `WINDOW ALARM` line
  with the verdict text; UNKNOWN → a one-line "sensor cannot be trusted, not halting" note. Cost
  is one small file read per prompt, negligible beside its git calls.
- **D7 — one override mechanism for the drill:** env var `AI4GOOD_WINDOW_DIR` redirects the
  directory holding `rate-limits.json` + `window-verdict.txt` for the sensor, the gate, the
  alarm and the stamp's verdict read. Existing `-SnapshotPath` params stay. The drill sets the
  env var to a temp dir; the live files are never touched, and the drill asserts its dir is not
  the live dir.
- **D8 — the drill:** new `loop/drills/window-watchdog-drill.ps1`, self-contained (own
  PASS/FAIL lines, exit 1 on red), invoked from `run-drills.ps1` as one folded assertion (the
  `twin-check.ps1` wiring pattern). Hook stdin is fed via pipes/files, never inline quoted JSON
  (run 1 of the measurement showed native-argument quoting mangling nested quotes).
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

## Steps

1. **Extract `window-lib.ps1`; thin `window-gauge.ps1` over it, line still at 90.**
   Done: `window-sim.ps1` green (exit 0) — proves the refactor is behavior-neutral before
   anything else moves.
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
   - Group 4 (verdict-file consistency): the line the sensor writes equals
     `Format-WindowVerdictLine(Get-WindowVerdict(same snapshot))`, and each checkpoint's
     behavior agrees with that line for every group's snapshot.
   Done: the drill runs, groups 1–4 present, red only for not-yet-built machinery.
4. **Sensor writes the verdict file (D3) + `AI4GOOD_WINDOW_DIR` override (D7).**
   Done: statusline run with synthetic stdin and the override produces both files; drill group 4
   passes for the sensor half.
5. **`window-gate.ps1` (D4).** Done: drill groups 1–3 gate assertions pass; error injection
   (unreadable snapshot dir) fails open.
6. **`window-alarm.cmd` (D5).** Done: drill groups 1–2 alarm assertions pass; overhead measured
   (median of 20 invocations) and recorded; target median ≤ 100 ms.
7. **`stamp-hook.ps1` alarm + unknown lines (D6).** Done: drill groups 1–2 stamp assertions
   pass; a normal stamp run without the override still prints the standard two lines.
8. **Wire the drill into `run-drills.ps1`.** Done: `run-drills.ps1` fully green, including the
   watchdog drill and the untouched twin-check.
9. **Wire the hooks into `.claude/settings.json`** (PreToolUse matcher `Agent` → gate;
   PostToolUse, no matcher → alarm.cmd; absolute paths as the file already does).
   Done: JSON parses; both commands point at files that exist on the branch. NOTE, stated
   plainly: the running interactive session loads hooks from the MAIN checkout, so the live
   firing of these entries cannot be observed from this branch before merge; the docs say the
   file watcher picks up settings edits, and the merge sitting verifies live firing post-merge.
10. **Amend `shared-invariants.md` and `conductor.md` (D9).** Done: text present, wording keeps
    "the coordinator decides" literally true (the hook applies the founder's standing line; it
    decides nothing), twin files untouched.
11. **`goal-evidence.md`**: drill + sim outputs, the two overhead medians (alarm hook; statusline
    delta with the verdict write), and the settings wiring shown. Done: file committed.

## Verification state

No acceptance-test ids attach to this item (bring-up under `AI4DEV-4 (the work skill)`); the
drill is the executable verification the item itself mandates.

| check | expected state at goal |
|---|---|
| `loop/work/window-sim.ps1` | green, exit 0, boundary at 84/85 |
| `loop/drills/run-drills.ps1` | green, includes watchdog drill + twin-check |
| `loop/drills/window-watchdog-drill.ps1` standalone | green, all four groups |
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

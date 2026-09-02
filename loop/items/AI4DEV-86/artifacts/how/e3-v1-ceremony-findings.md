I have the ceremony graph, live callers, and how the runner and slot pool connect. Findings follow.

### Components Found

**V1 relay agents** (`.claude/agents/`, spawnable types; frontmatter pins model and effort):

| Name | Path | What it does |
|---|---|---|
| `conductor` | `.claude/agents/conductor.md` | Owns one item’s worktree, waits, and sequence. Spawns sittings and `reviewer-runner`s. Rules on nothing. `model: sonnet`, `effort: high`, `isolation: worktree`. |
| `orchestrator` | `.claude/agents/orchestrator.md` | Holds all judgment for one sitting (plan, rulings, merge). Writes no code. `model: fable`, `effort: xhigh`. Twin of the opus file. |
| `orchestrator-opus` | `.claude/agents/orchestrator-opus.md` | Same role and body as `orchestrator`. Frontmatter is `model: opus`, `effort: max`. Used for MERGE, AUDIT RE-RUN, and fable-credit fallback. |
| `executor` | `.claude/agents/executor.md` | Writes code under the amended plan and runs `at:verify` at both tiers. Rules on nothing. `model: opus`, `effort: high`. |
| `reviewer-runner` | `.claude/agents/reviewer-runner.md` | Sole launcher of one reviewer process. Holds the wait, distils, reports. `model: sonnet`, `effort: low`. |
| `distiller` | `.claude/agents/distiller.md` | Canonical extract-only contract. Normally followed by the runner, not spawned. `model: sonnet`, `effort: low`. |
| `mechanical` | `.claude/agents/mechanical.md` | Housekeeping: publish, merge execution, evidence capture. **Stays** — v2 (`/controller`, poteto-mode) still uses it. `model: sonnet`, `effort: low`. |

**V1 coordinator prose and phase files:**

| Name | Path | What it does |
|---|---|---|
| `/work` skill | `.claude/skills/work/SKILL.md` | Coordinator manual for the v1 relay. Pickup, claim, spawn conductor, slot reserve, twin pre-flight, sweep. |
| `WORKFLOW.md` | `.claude/skills/work/WORKFLOW.md` | 71-step item sequence naming which role acts at each step. |
| `shared-invariants.md` | `.claude/skills/work/shared-invariants.md` | Constitution every v1 role reads first. Wins over a contract. |
| Conductor phase files | `.claude/skills/work/conductor/phase-*.md` | Nine files the conductor must re-read on every phase entry. |
| `reviewers.md` | `.claude/skills/work/reviewers.md` | Base of every gate prompt. Reviewers are external processes, not agents. |
| `/controller` skill | `.claude/skills/controller/SKILL.md` | **V2** entry. Writes the brief, `EnterWorktree`, hands the session to poteto-mode. Still cites `/work` as “the v1 manual and its relay is the fallback.” |

**Work scripts** (`loop/work/`):

| Script | What it does |
|---|---|
| `twin-check.ps1` | Compares orchestrator twin bodies after stripping YAML and two allowed opus-only paragraphs. Exit 0 synced, 1 drifted, 2 stale/missing. |
| `stamp-hook.ps1` | Intended `UserPromptSubmit` stamp: `WORKING ON` / `IN` from branch → item → chain cache. Never calls Linear. |
| `banner.ps1` | Intended `SessionStart` JSON banner. Calls `stamp-hook.ps1`. |
| `statusline.ps1` | Claude Code status bar. Derives item from branch via `work-lib.ps1`. Snapshots `context_window` for `context-gauge.ps1`. |
| `guard-branch-switch.ps1` | `PreToolUse` hook. Refuses `git switch`/`checkout` in the main worktree. |
| `work-lib.ps1` | Shared helpers: repo root, held item, chain cache, worktree owner, mutex, `Get-ManifestIdentity`. |
| `db-slots.ps1` | Coordinator half of the slot pool: `Reserve-DbSlot`, `Release-DbSlot`, occupancy reads. File ops only. No TOML. |
| `materialize.ps1` | Parses `loop/decomp/req-NNN.md` into JSON for Linear leaf creation. |
| `attribution-report.ps1` | Token burn report over Claude transcripts, keyed by branch/spawn tree. |
| `attribution-report.selftest.ps1` | Synthetic-store selftest for that report. |
| `attribution-epoch.txt` | Default scan start (`2026-08-11T00:00:00Z`) for the report. |
| `watch-items.ps1` | Polls `conductor-status.log` files. Manual console. |
| `ci-status.ps1` | One-shot GitHub Actions evidence for a SHA. Manual. |
| `context-gauge.ps1` | Reads the snapshot `statusline.ps1` wrote. Manual. |
| `sheet-check.ps1` | Diffs `pstack-models.expected.md` against `~/.claude/pstack-models.md`. |
| `render-mermaid.ps1` | Renders the first mermaid block via mermaid.ink. Manual. |
| `pstack-models.expected.md` | Expected pstack model sheet. Not a script. |

**Acceptance harness:**

| Name | Path | What it does |
|---|---|---|
| Runner | `tests/at/harness/runner.ts` | `bun run at:verify`. Loop = no DB. Integration = occupy slot, `prepare`, print evidence, spawn vitest. |
| Bijection checker | `tests/at/harness/check.ts` | `bun run at:check`. P0 ids in `.taskmaster/docs/acceptance/` ↔ `atTest('AT-…')` call sites. |
| Expectation contract | `tests/at/harness/expected.ts` | `--expect` exact-match against `tests/at/expected/req-*.json`. |
| Slot pool | `tests/at/harness/db-pool.ts` | Standing stacks `ai4good-slot-N`, ports `from + slot*1000`, **refuses** the 44321 personal stack. |
| Slot attestation | `tests/at/harness/attestation.ts` | After reset, writes a nonce into `at_runtime.slot_attestation`; child reads it back. |
| Live mail | `tests/at/harness/live-email.ts` | Integration `vendors.email` against the slot’s Mailpit URL. |
| Manifests | `tests/at/expected/req-001.json`, `req-016.json` | Declared greens/reds per tier. |

---

### Flow

**V1 item lifecycle** (entry: founder types `/work AI4DEV-NN` in the main session):

1. Coordinator reads `.claude/skills/work/SKILL.md` fresh (must not run from memory).
2. Phase B step 0: run `loop/work/twin-check.ps1`. `TWINS DRIFTED` / `STALE GUARD` → stop, no spawn.
3. Resolve Linear item, walk `parent`, startability.
4. Create branch from `origin/main` using board `gitBranchName`.
5. `Reserve-DbSlot -Item <id> -Branch <branch>` from `db-slots.ps1` (two slots; full pool rejects).
6. Claim: assign + In Progress.
7. Spawn `Agent(subagent_type: "conductor")` with worktree isolation. Prompt is item facts only (id, branch, reserved slot).
8. `Set-ChainForWorktree` / `Set-OwnerForWorktree` from `work-lib.ps1`.
9. Conductor: fetch, checkout item branch, `bun install --frozen-lockfile`, create `loop/items/<ITEM>/artifacts/`.
10. Conductor reads `phase-sittings.md` then `phase-plan.md`, spawns `orchestrator` (no isolation, no model override).
11. Plan sitting writes `plan.md` + Gate 1 prompt + `PHASE-STATE.md`, commits, pushes, mechanical opens PR.
12. Conductor verifies push, spawns `reviewer-runner` (codex sol). Runner launches OS-detached, distils per `distiller.md`.
13. Draft sitting rules Gate 1, amends plan, spawns `executor` draft (no verify suite).
14. Gate 2: two `reviewer-runner`s (terra/codex, flash/opencode), skip if prose-only (same rule as CI).
15. Fix sitting rules Gate 2, executor fix-and-goal: `bun run at:verify <req> --tier loop --expect` then `--tier integration --expect` on the reserved slot.
16. Audit panel (luna + flash). Clean → merge sitting as `orchestrator-opus`. Findings → audit sitting on fable, one scoped re-run on opus.
17. Conductor arms CI watch on the final head.
18. Merge sitting: both-tier exact-match in the ruling; mechanical runs `gh pr merge`. Merge closes the Linear item.
19. Coordinator sweep: `Release-DbSlot`, remove worktree.

**V2 item lifecycle** (already live beside v1): `/controller` → brief in worktree → founder runs `/pstack:poteto-mode` → lead + `mechanical` → `/controller done`. Controller skill line 69: “there is no slot pool in v2”. Controller brief template still tells cloud VMs to run `bun tests/at/harness/db-pool.ts setup`.

**CI** (`.github/workflows/ci.yml`, job `verify`):

1. Checkout PR **head** SHA (not merge commit).
2. **Twin guard** (lines 80–103): `pwsh -File loop/work/twin-check.ps1`. Missing script on old branches → skip, not fail.
3. Prose fast lane: if PR touches none of `src/`, `supabase/`, `tests/`, `.github/`, root build files → skip install/typecheck/selftest/check/verify.
4. `bun run typecheck` (both tsconfigs via `tests/at/typecheck.ts`).
5. `bun run at:selftest` → vitest `harness/**/*.selftest.ts`.
6. `bun run at:check $req` for every `tests/at/suites/req-*/`. Empty discovery fails.
7. `bun run at:verify $req --tier loop --expect` for every `tests/at/expected/req-*.json`. CI has **no database slot**. Suites without a manifest fail.
8. Ownership guard (Lovable `src/` vs Claude `supabase|tests|loop|.claude|.github`).
9. Reference guard: any `AI4(DEV|PM)-N` the branch does not own fails, except one sanctioned `Closes AI4DEV-nn` line.

**Acceptance runner** (`runner.ts` `main()`, ~1233):

1. Parse `--tier loop|integration|drill` and `--expect`.
2. `--wired` → infra exit 3 (driver does not exist).
3. `--expect` → `loadTierExpectation`; refuse with exit 2 if missing/malformed/not bijective. No tests run.
4. `drill` → infra refuse (used to reset personal stack).
5. `loop` → no lock, no stack, no reset. Vitest with `AT_TIER=loop`.
6. `integration` → `occupy(req, AT_DB_SLOT ? {slot: Number(AT_DB_SLOT)} : {})` then `prepare(occupancy)` then `evidence(...)` then child env from `slotStackEnv`.
7. Spawn vitest on `suites/req-<n>/` with JSON report. Grade per AT id vs acceptance P0 and optional declaration.

**Slot occupy** (`db-pool.ts` `occupy`, ~901):

- No `AT_DB_SLOT`: derive item from branch, look up reservation written by `Reserve-DbSlot`. None → refuse, name `Reserve-DbSlot`. No fallback onto a free slot.
- With `AT_DB_SLOT=N`: skip admission, keep occupancy lock. Refuse if reservation names a **different** item.
- Settings already set `AT_DB_SLOT=1` (`.claude/settings.json` `env`). That currently means **pool slot 1** (`ai4good-slot-1`, API **45321**), **not** the 44321 stack.

**`prepare`**: mirror this tree’s `supabase/` into `%LOCALAPPDATA%\ai4good-build\db-slots\slot-N`, overlay identity (`project_id = ai4good-slot-N`, ports `from+slot*1000`, inspector `+slot*10`), run `personalBlockProblems` (**fails if the config is the 44321 / `poancmeitlmxejofwzuu` stack**), reset, `proveMigrationsReplayed`, mint attestation nonce.

---

### Agent name references (who still names each type)

Spawnable names live in `.claude/agents/*.md` frontmatter. Live spawn instructions:

| Type | Named as a spawn target in |
|---|---|
| `conductor` | `SKILL.md` Phase B step 7 `subagent_type: "conductor"`; `WORKFLOW.md`; conductor phase files; `loop/drills/` |
| `orchestrator` / `orchestrator-opus` | `phase-sittings.md`; `SKILL.md` credit-out / merge; `WORKFLOW.md`; `twin-check.ps1` default paths |
| `executor` | orchestrator contracts; `WORKFLOW.md` |
| `reviewer-runner` | `conductor.md`; `WORKFLOW.md`; `shared-invariants.md` “Never launch a reviewer from any role but reviewer-runner” |
| `distiller` | `reviewer-runner.md` (“read distiller.md and follow it”); `WORKFLOW.md` |
| `mechanical` | orchestrator contracts; `WORKFLOW.md`; **`controller/SKILL.md` and this item’s brief** (v2 keeps it) |

CI names only the orchestrator twins, in the twin-guard comment and step. `CLAUDE.md` names “conductor” once, as an STE100 example, not as a spawn.

`loop/drills/run-drills.ps1` also **binds** the agents: twin-check (303–304), tracked `.claude/agents/*.md` + work skill (306–321), conductor phase-file map (325–358), no-park on five contracts (364–368).

---

### Script → callers (dependency table)

| Script | Callers |
|---|---|
| `twin-check.ps1` | **CI** `ci.yml` step “Guard the orchestrator twins against drift”; **`/work` SKILL.md Phase B step 0**; `loop/drills/run-drills.ps1:303` |
| `stamp-hook.ps1` | `banner.ps1:58` only. **Not** in `.claude/settings.json`. No `UserPromptSubmit` hook. |
| `banner.ps1` | **Not** in settings. Comment claims SessionStart; live SessionStart is `.claude/hooks/session-start-banner.sh` (exits 0 unless `CLAUDE_CODE_REMOTE=true`). |
| `statusline.ps1` | **Live** `settings.json` `statusLine` (absolute path to **main** checkout `C:\Users\nirdr\Downloads\ai4good\loop\work\statusline.ps1`). Dot-sources `work-lib.ps1`. Writes `context-<sid>.json`. |
| `guard-branch-switch.ps1` | **Live** `settings.json` `hooks.PreToolUse` (same hardcoded **main** path). Skipped when `CLAUDE_CODE_REMOTE=true`. |
| `work-lib.ps1` | Dot-sourced by `stamp-hook.ps1`, `statusline.ps1`, `materialize.ps1`. Functions invoked by **prose** in `/work` and `/controller` (`Set-HeldItem`, `Set-ChainForWorktree`, `Clear-HeldItem`). |
| `db-slots.ps1` | `/work` SKILL.md reserve/release. `db-pool.ts` `occupy` **reads the reservation files** this script writes. `/controller` does **not** call it. |
| `materialize.ps1` | `/work` SKILL.md “Materialisation”; `/controller` “as `/work` describes it”. Agent-invoked, not a hook. |
| `attribution-report.ps1` | Manual. Default `EpochFile` = `attribution-epoch.txt`. |
| `attribution-report.selftest.ps1` | Manual. Invokes the report. **Not** in `at:selftest` (that is vitest `harness/`). |
| `watch-items.ps1` | Manual only. |
| `ci-status.ps1` | Manual only. |
| `context-gauge.ps1` | Manual. Reads files `statusline.ps1` writes. |
| `sheet-check.ps1` | Manual. Reads `pstack-models.expected.md`. Not in CI or settings. |
| `render-mermaid.ps1` | Manual. |
| `session-start-banner.sh` | **Live** `settings.json` `hooks.SessionStart`. Cloud-only body. |

**Still referenced by live config** (`settings.json` and/or `ci.yml`):

- **Live in settings:** `statusline.ps1`, `guard-branch-switch.ps1`, `session-start-banner.sh`, env `AT_DB_SLOT=1`.
- **Live in CI:** `twin-check.ps1` (the step to drop).
- **Not in settings or CI:** `banner.ps1`, `ci-status.ps1`, `context-gauge.ps1`, `sheet-check.ps1`, `render-mermaid.ps1`, `pstack-models.expected.md`.

**After the twin-guard CI step is dropped**, of the park-list scripts:

| Script | Remaining live caller? |
|---|---|
| `twin-check.ps1` | Yes: `/work` pre-flight + `run-drills.ps1`. CI was not its only caller. |
| `stamp-hook.ps1` | **No live config caller.** Only `banner.ps1`, which is also unwired. |
| `attribution-report` + selftest + epoch | **No live config caller.** Manual. |
| `watch-items.ps1` | **No live config caller.** Manual. |
| `work-lib.ps1` | **Yes:** live `statusline.ps1`. Also skill prose. |
| `materialize.ps1` | Skill-invoked (`/work`, `/controller`). Not a hook/CI. |
| `db-slots.ps1` | `/work` + harness reservation files. v2 controller does not call it. |

Parking `statusline.ps1` without changing `settings.json` would break the status bar. The settings paths are **absolute to the main checkout**, so parking copies **in this worktree** does not change what a session launched from `C:\Users\nirdr\Downloads\ai4good` runs until merge (and until those hardcoded paths are updated).

---

### Old `/work` prose and the three standing rules

**Old `/work` prose** (`SKILL.md` + `WORKFLOW.md`): one coordinator session on `main` claims a leaf, reserves a DB slot, runs twin-check, spawns a worktree-isolated conductor, then four (sometimes five) orchestrator sittings with external reviewers, both-tier `at:verify --expect`, required CI, mechanical merge. “The orchestrator owns decisions, the executor owns keystrokes, the conductor owns the clock.” `/work` is typed only in the main session. Skills and agents listed in `SKILL.md` lines 41–49.

**Three standing rules** (short form `CLAUDE.md` §5 lines 76–91; full text `SKILL.md` “The standing rules”, moved 2026-08-29):

1. **Attribution is derived from the branch, never declared.** cwd → git worktree → branch → one item id → walk `parent`. Held item is a cross-check only. Degrades, never blocks, except closing a requirement.
2. **A session works where it was launched**, one branch, whole item. One exception: `/controller` may `EnterWorktree` / `ExitWorktree` for the poteto-mode hand-off (founder 2026-08-29).
3. **The merge closes an item; there is no second way.** Lead (poteto-mode) does git/PR only, never the board. Board steering is `/controller done`. Lead merges only when **both** hold: CI green on the exact head, and the founder said “merge”.

`CLAUDE.md` §5 still **leads** with “One lifecycle exists, with one entry point: `/work`” and “Invoke `/work` FRESH…”. The brief asks that section to name v2 (`/controller`, poteto-mode) while **keeping** these three rules. The TURN/HOOK reply header is already **parked** with the stamp hook (`CLAUDE.md` 73–74).

---

### Boundaries

**Ceremony → harness:** executor and merge ruling require both tiers of `at:verify --expect`. Coordinator reserves slots that `occupy()` consumes. CI runs **loop + `--expect` only**.

**Harness → ceremony:** `db-pool.ts` error text names `Reserve-DbSlot` and `loop/work/db-slots.ps1`. Reservation JSON lives under `%LOCALAPPDATA%\ai4good-build\db-slots\reservations\`. Occupancy locks under `ai4good-build\at-locks\`.

**Ceremony → CI:** twin-check; ownership of `.claude/` and `loop/`; reference guard. Prose-only PRs skip the suite but still run twin-guard + ownership + reference.

**Settings → scripts:** status line and branch guard. `AT_DB_SLOT=1` is injected into every session and into `occupy()` on integration.

**Keep-untouched (brief):** AT ids, `.taskmaster/docs/acceptance/`, `loop/decomp/` pins, `--expect` manifests, shipped-module selftests, `verify-ai4good`.

**Done-contract surfaces:** `req-001` and `req-016` loop `--expect`; `req-001` integration against the **44321** stack with **no slot code on the path**. `req-016` integration is **all red** (`fixtures.worlds`, `sut.notifications`) and is not in the done contract.

---

### Non-Obvious Things

1. **`AT_DB_SLOT=1` does not mean the 44321 stack today.** It selects pool slot 1: project `ai4good-slot-1`, API port **45321** (`44321 + 1*1000`). `personalBlockProblems` **refuses** `poancmeitlmxejofwzuu` and ports 44320–44329. The item’s target is the inversion of that guard: integration should **be** the stack the pool was built to never touch.

2. **Stamp and banner are already unwired.** Comments still call `stamp-hook.ps1` a `UserPromptSubmit` hook and `banner.ps1` a SessionStart hook. Live settings have neither. SessionStart is the cloud docker/codex banner. Parking stamp-hook does not change a live hook.

3. **Settings paths are hardcoded to the main checkout**, not `$CLAUDE_PROJECT_DIR` / worktree `loop/work/`. A session in this worktree still runs main’s `statusline.ps1` and `guard-branch-switch.ps1`. Parking files in the worktree is invisible to live hooks until merge **and** those paths change.

4. **Twin-check is not CI-only.** Dropping the CI step leaves `/work` step 0 and `run-drills.ps1`. Parking the agents without parking those callers leaves a check with nothing to check, or a red drill.

5. **`/controller` still depends on parked pieces:** `Set-HeldItem` / `Clear-HeldItem` (`work-lib.ps1`); materialise “as `/work` describes”; cloud brief still says `bun tests/at/harness/db-pool.ts setup`. Shared-invariants still names `guard-branch-switch.ps1`.

6. **`mechanical` is the only v1 agent v2 still spawns.** Parking the other six is consistent with the brief. `loop/drills` still treats the six as product (`tracked-machinery` assertion).

7. **CI never runs integration.** Loop `--expect` is the required check. Integration green for `req-001` is a **local** done-contract, against the one stack, after slot code is off the path.

8. **`at:selftest` is the whole `harness/` vitest include**, not a named list. Parking `db-pool.ts` + `db-pool.selftest.ts` shrinks it. `runner.selftest.ts` still tests `localStackProblems` (identity proofs the brief wants **kept**: loopback, configured ports, local JWT issuer, no hosted `ref`). `runner.ts` **imports** `occupy`/`prepare` from `db-pool.ts` — parking the pool without a new integration entry leaves the runner unable to load.

9. **Two documents disagree on “safe” PR wording.** `shared-invariants.md` lines 76–79 still say use `ref` / `part of` / `towards`. `CLAUDE.md` and the CI reference guard say those words **link and move** items. CI is the one that binds.

10. **`Agents.md` in this worktree is a third, stale way-of-work** (TaskMaster, `/pm-next`, `/pm-done`). `CLAUDE.md` §5 and `/controller` are the live ones. Parking v1 prose without touching `Agents.md` leaves a fourth story.

11. **Controller cloud brief vs this item’s brief:** controller template still tells a cloud VM to run `db-pool.ts setup`. This item’s brief says never run that command; it is what is being parked.

12. **Port overlay is not one formula.** Listener ports: `from + slot * 1000`. Inspector 8083: `from + slot * 10`. Client ports (e.g. SMTP 587) are data and do not move.

---

### Open Questions

- I did not execute `twin-check.ps1`, `at:verify`, or `at:selftest`. Current green/red is unread.
- I did not confirm whether a **user-level** Claude settings file outside the repo still registers `stamp-hook.ps1` as `UserPromptSubmit`. Repo `settings.json` does not.
- I did not fully map every `runner.selftest.ts` test that would break if `occupy`/`prepare` vanish. The integration import at `runner.ts:44` is the load-time coupling.
- Whether `loop/drills/` is in this item’s park set is unstated. The brief lists agents and `loop/work/` scripts, not drills. Drills will go red if agents/twin-check move and drills stay.
- `reviewers.md`, `lessons.md`, and the nine `conductor/phase-*.md` files are v1 ceremony not listed in the brief’s park bullets (those bullets say “old `/work` skill prose”).
- I did not read every harness selftest body to classify “keep frozen vs park” for sentinels/faults/oracles; that is the founder’s harness ruling for the design station, not this slice.

---

### Files Read

`.claude/agents/{conductor,orchestrator,orchestrator-opus,executor,reviewer-runner,distiller,mechanical}.md`  
`.claude/settings.json`, `.claude/hooks/session-start-banner.sh`  
`.claude/skills/work/{SKILL.md,WORKFLOW.md,shared-invariants.md,conductor/phase-sittings.md}`  
`.claude/skills/controller/SKILL.md`, `.claude/skills/blocked/SKILL.md`  
`CLAUDE.md` §5, `loop/items/AI4DEV-86/brief.md`  
`.github/workflows/ci.yml`  
`loop/work/{twin-check,stamp-hook,banner,statusline,guard-branch-switch,work-lib,db-slots,materialize,attribution-report,attribution-report.selftest,watch-items,ci-status,context-gauge,sheet-check,render-mermaid}.ps1`  
`loop/work/{attribution-epoch.txt,pstack-models.expected.md}`  
`loop/drills/run-drills.ps1` (guards section)  
`package.json` (scripts)  
`tests/at/{README.md,vitest.config.ts}`  
`tests/at/harness/{index.ts,runner.ts,check.ts,expected.ts,db-pool.ts,attestation.ts,live-email.ts}` (headers + occupy/prepare/main/personalBlock)  
`tests/at/expected/{README.md,req-001.json,req-016.json}`  
`supabase/config.toml` (project id + 44321)  
`.gitignore` (`.claude/` tracking)
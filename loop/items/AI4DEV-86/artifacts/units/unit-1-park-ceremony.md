# Unit 1 brief: park the v1 ceremony (mechanical: exact moves and pastes, no judgment)

Worktree: C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-86. Work on the current branch. Use PowerShell only. Use `git mv` for every move so history follows. Do not edit any file not named here. If any step fails or a text to replace is not found verbatim, STOP and report the step and the error.

## A. Moves (create directories as needed; keep file names)
Destination root: loop/parked/v1/, mirroring the original path.
1. .claude/agents/conductor.md, orchestrator.md, orchestrator-opus.md, executor.md, reviewer-runner.md, distiller.md -> loop/parked/v1/.claude/agents/   (mechanical.md STAYS)
2. .claude/skills/work/SKILL.md, WORKFLOW.md, reviewers.md, lessons.md, shared-invariants.md, and the whole conductor/ folder -> loop/parked/v1/.claude/skills/work/   (pstack-model-selection.md STAYS in .claude/skills/work/)
3. loop/work/twin-check.ps1, stamp-hook.ps1, banner.ps1, attribution-report.ps1, attribution-report.selftest.ps1, attribution-epoch.txt, watch-items.ps1 -> loop/parked/v1/loop/work/   (work-lib.ps1, materialize.ps1, statusline.ps1, guard-branch-switch.ps1, ci-status.ps1, context-gauge.ps1, sheet-check.ps1, render-mermaid.ps1, pstack-models.expected.md STAY)
4. loop/drills/run-drills.ps1, control-lib.ps1, fake-actor.ps1, live-scenarios.md, and the whole prompts/ folder -> loop/parked/v1/loop/drills/   (loop/drills/records/ STAYS)

## B. CI: delete the twin-guard step
In .github/workflows/ci.yml delete the step whose name is `Guard the orchestrator twins against drift`, from the comment block that begins `# THE TWIN GUARD.` (four lines) through the end of that step's `run: |` block (the line `fi` that closes `if command -v pwsh`). Nothing else in the file changes.

## C. CLAUDE.md section 5
Replace everything from the line `## 5. Way of work: one verb, derived attribution (AI4DEV-36, 2026-08-02)` up to (not including) the line `---` that precedes `## Communication: simple English, never shorthand` with the exact contents of loop/items/AI4DEV-86/artifacts/units/claude-md-section-5.md.

## D. .claude/agents/mechanical.md
- Replace the line `**Read `.claude/skills/work/shared-invariants.md` first.** It binds you.` with `**Read section 5 of the project `CLAUDE.md` first (the three standing rules).** It binds you.`
- Replace `after the orchestrator has confirmed the` with `after the lead has confirmed the`.

## E. .claude/skills/controller/SKILL.md
1. Replace the sentence `Read` + newline + `` `shared-invariants.md` in `.claude/skills/work/` first. It binds you. `` (it spans the end of one line and the start of the next) with `Read section 5 of the project CLAUDE.md first. It binds you.` Keep the sentence that follows about `/work`, but change it to: `The v1 relay is parked under loop/parked/v1/ and is not a fallback.`
2. Replace the requirement-states paragraph that begins `Requirement states: no decomposition file` and ends `Done →` + newline + `say so.` with:
Requirement states: no decomposition file → propose writing `loop/decomp/req-0NN.md` as the
work. Merged but unclaimed → materialise the dev tree: `loop/work/materialize.ps1` reads the
manifest at a named merged commit and emits the leaves; create the dev root as a sub-issue of
the requirement and each leaf under it, matching idempotently by exact title, never removing a
leaf that has work against it. Titles (founder 2026-08-07): the root names its requirement and
is called a root (`AI4PM-19 — Authentication and org membership: root`); every leaf gets plain
words with the code as a suffix at most (`Email and Google signup, three account types
(D1.L1)`); only the root may carry a requirement id, because Linear derives the branch name
from the title. Then list the leaves, wait. Open leaves → list, recommend, wait. All leaves
closed → run the evidence gate and propose. Done → say so.
3. In Phase B step 6, replace `The local database is one instance: the project` + newline + `   settings set `AT_DB_SLOT=1`, and there is no slot pool in v2 (founder 2026-08-29: "Clear` + newline + `   the dB slot mechanism all together").` with `The local database is one instance, the stack` + newline + `   `supabase/config.toml` describes; there is no slot pool in v2 (founder 2026-08-29: "Clear` + newline + `   the dB slot mechanism all together").`
4. In the brief template, replace the two lines `- One database, AT_DB_SLOT=1, local and cloud alike. On a fresh cloud VM run` + newline + `  `bun tests/at/harness/db-pool.ts setup` once before an integration test.` with `- One database, the stack `supabase/config.toml` describes, local and cloud alike. Start it` + newline + `  with `bun run db:start`; every integration run resets it.`

## F. .claude/skills/verify-ai4good/SKILL.md
Replace the paragraph that begins `**One stack per machine.** `AT_DB_SLOT=1` everywhere; the slot pool is deleted (founder,` through `run one at a time.` with:
**One stack per machine.** The stack on the 44321 block is THE stack, the one
`supabase/config.toml` describes; the slot pool is parked (founder, 2026-08-29 and 2026-09-01).
Never start a second one, and never drive a stack you cannot identify (Doctor below). An
integration run of the acceptance suite resets this stack; do not drive while one runs, and
run one drive at a time.

## G. Cloud docs
1. .claude/cloud-session-readme.md: in the surfaces table, replace `` `AT_DB_SLOT`, `AT_DB_POOL_ROOT`, `` + newline + whatever follows up to `values the harness reads at run time |` so the cell reads `nothing today; the harness reads no environment variable for the database |`. In the bring-up list, replace step 2 (`In the **Environment variables** box, put exactly these three lines:` with its fenced block and the `No spaces around` line) with `2. Leave the **Environment variables** box empty. Do NOT put the OpenCode Go key there - see Secrets below.` Replace the whole section `## The database, in cloud` (through the line `configuration lands on the durable `AT_DB_POOL_ROOT` path.`) with:
## The database, in cloud
One VM hosts one session and one stack, the one `supabase/config.toml` describes. The first
time a session needs an integration-tier database, run `bun run db:start` inside the session.
Every `bun run at:verify <req> --tier integration --expect` resets that stack.
2. .claude/cloud-environment-setup.sh: replace the line `#   THE VARIABLES BOX carries:   AT_DB_SLOT, AT_DB_POOL_ROOT, AT_DB_POOL_SIZE` with `#   THE VARIABLES BOX carries:   nothing today`. Delete the comment block from the line `# WHY THE LAST THREE. The database slot pool exists to stop concurrent sessions on ONE` through the line `# to the temporary directory, and a slot with no configuration file refuses to start.` inclusive. Replace the three echo lines at the end that begin `echo "the slot pool is NOT provisioned here` with one line: `echo "the database is not started here - inside a session, run once: bun run db:start"`.

## H. loop/parked/v1/README.md
Append this section to the README unit 2 created (create the file with a `# Parked v1 machinery` heading if it does not exist):
## The v1 ceremony (parked 2026-09-02, AI4DEV-86)
Founder rulings 2026-09-01: "no more slots machinery this should be moved out" and "i want to clean the codebase with the v1 ceremony and align with what is does on CI as well". Everything under this folder is dead text under version control: not compiled, not run, not loaded by Claude Code, not a spare part that still fits. The live way of work is section 5 of the project CLAUDE.md: `/controller`, then `/pstack:poteto-mode`, then `/controller done`.
- `.claude/agents/`: the six relay roles (conductor, orchestrator, orchestrator-opus, executor, reviewer-runner, distiller). `mechanical` stays live; v2 uses it.
- `.claude/skills/work/`: the `/work` coordinator manual, WORKFLOW.md, reviewers.md, lessons.md, shared-invariants.md, and the nine conductor phase files. The three standing rules moved to CLAUDE.md section 5. Note: shared-invariants.md recommended `ref` / `part of` / `towards` for naming other items in a pull request; CI's reference guard fails those words. The rule in CLAUDE.md is the one that binds.
- `loop/work/`: twin-check (the CI twin-guard step is gone with it), stamp-hook and banner (already unwired), attribution-report with its selftest and epoch file, watch-items, db-slots (the coordinator's half of the slot pool). work-lib.ps1 and materialize.ps1 stay live: the status line and `/controller` call them.
- `loop/drills/`: the drill harness (run-drills, control-lib, fake-actor, live-scenarios, prompts) that bound the agents, the phase files and the twin check. `loop/drills/records/` stays where it is as history.
- `tests/at/harness/db-pool.ts` and its selftest: the database slot pool. See the section above.

## I. Checks, then commit
1. `git status --short` must show only renames (R) and the edited files named above. Paste it.
2. `bun run typecheck` and `bun run at:selftest` and both `bun run at:verify req-00N --tier loop --expect` (001 and 016) must be green; paste each command's last 5 lines with a timestamp.
3. Grep the live tree for stale pointers and paste the result: `Select-String -Path CLAUDE.md,.claude\skills\controller\SKILL.md,.claude\agents\mechanical.md,.claude\skills\verify-ai4good\SKILL.md,.github\workflows\ci.yml -Pattern 'shared-invariants|twin-check|AT_DB_SLOT|db-pool|/work '`. Expect no hits except the words "parked" or history lines.
4. Commit as ONE commit with first line `AI4DEV-86: the v1 ceremony is parked and CI drops the twin guard`, a body listing the four move groups and the six edited prose files, and the trailers `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01SikdZcn3PmB9SrZ4dL1ziT`. Do not push.

## Report
The commit hash, the pasted outputs of I.1 to I.3, and every step you could not do verbatim, with the exact text you found instead. Rule on nothing; if a replacement target is ambiguous, stop and report.
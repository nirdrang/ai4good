# AI4DEV-5 (CI pipeline) — merge decision

STATUS: FINAL — READY TO MERGE. All gates run and folded; zero findings standing.
Pinned to the workflow blob delivered at commit `23604a6` (unchanged since; every later
commit touches only this item's paper trail under `loop/items/AI4DEV-5/**` and the two
way-of-work ride-along notes in `.claude/skills/work/SKILL.md`). The final head commit and
its green CI run id are recorded in the pull request body, which is where this decision is
published. Interim mode: the FOUNDER merges; this file authorizes, it does not execute.

## What this PR delivers

One file, `.github/workflows/ci.yml`: a GitHub Actions workflow that turns the merge tail
from a transcribed report into a machine verdict. On every pull request targeting `main`
(and every push to `main`) it runs, as five separately named steps against the pull
request's HEAD commit — never GitHub's synthetic merge commit:

1. `bun run typecheck` — both TypeScript projects, aggregated exit.
2. `bun run at:selftest` — the acceptance-harness self-tests.
3. `bun run at:check <req>` — for every suite discovered under `tests/at/suites/req-*`.
4. `bun run at:verify <req> --tier loop --expect` — for every declaration manifest
   discovered at `tests/at/expected/req-*.json`, plus a coverage check that fails when a
   discovered suite has no manifest (so a suite that is checked but never run cannot be
   green).
5. The ownership guard — a pull request may not change both Lovable territory (`src/**`)
   and Claude territory (`supabase/**`, `tests/**`, `loop/**`, `.claude/**`, `.github/**`);
   changed files are read from the pull request's own base-to-head list, renames carry
   both paths, and the guard fails closed on anything it cannot read or prove.

Runner ubuntu-latest, bun pinned 1.3.14, `bun install --frozen-lockfile`, no database at
the loop tier, superseded PR runs cancelled, push runs never cancelled. Raw command output
reaches the run log — nothing is parsed into a verdict-only JSON in the workflow.

## Evidence

### Local verification (this worktree, branch head at the time of running)

**Correction, 2026-08-03 (raised by the executor reading this file — the paper trail
working):** the first row of this table originally read "533 installs across 637 packages
checked, no changes", presented as the frozen-lockfile gate. That is bun's output for a
tree that ALREADY had `node_modules` — the item agent's re-run AFTER the executor's install
had populated the same worktree. The from-scratch measurements are the executor's and CI's,
below. The row was corrected with provenance rather than silently swapped.

| command | result | measured by |
|---|---|---|
| `bun install --frozen-lockfile` (empty tree) | 515 packages installed, 63.7s | executor, this worktree, Phase 2 |
| `bun install --frozen-lockfile` (populated tree) | 533 installs across 637 packages checked, no changes | item agent, same worktree, after the executor's install |
| `bun install --frozen-lockfile` (empty tree, ubuntu) | step green in CI run 30769559140 | GitHub Actions, the PR's own run |
| `bun run typecheck` | exit 0 — both configs clean | executor and item agent, identical result |
| `bun run at:selftest` | exit 0 — 7 files, 114 tests passed | executor and item agent, identical result |
| `bun run at:check req-016` | exit 0 — 12 P0 ids in bijection | executor and item agent, identical result |
| `bun run at:verify req-016 --tier loop --expect` | exit 0 — matches declaration exactly (8 green, 4 declared red) | executor and item agent, identical result |

### Executor verification beyond the five commands (Phase 2 report, folded)

- `js-yaml` parse of the workflow: clean.
- `bash --noprofile --norc -eo pipefail -n` on all seven shell step bodies: clean.
- 18 executed behavioural cases against fixture trees with `bun` and `gh` stubbed,
  including: the 3000-file fail-closed ceiling fires; 1,500 renames inside `src/**`
  correctly do NOT trip it; a `src/` → `tests/` rename is caught through
  `previous_filename`; prefix look-alikes (`srcfoo/`, `supabase.config`) are correctly
  ignored; and this PR's own file set passes its own guard.
- The job id is `verify` with no display-name override — the exact string branch
  protection needs.

### The Linux question, asked and answered

The executor's one stated open risk was that the acceptance harness had never executed on
Linux (filename case-sensitivity in `tests/at` imports being the specific exposure). CI run
30769559140 on ubuntu-latest retired it by evidence: the harness self-tests, the per-suite
check and the loop-tier verify all passed on the PR head commit.

### Gate 1 (plan) — codex gpt-5.6-terra @ max, session 019fc473-0d26-7d02-9154-1648709c106b

Six findings; three adopted as amendments (main-push concurrency, suite-without-manifest
coverage, entry-count ceiling), two ruled documented-limitation (PR-side tamper of the
workflow file and of package.json scripts — no in-file fix exists; see the Known-limits
header of ci.yml), one ruled out of scope (vitest raw output is AI4DEV-29's fix, in the
harness). Full trail: `gate1-critique.txt`, `rulings-01.md`, `rulings-02.md`.

### Gate 2 (diff) — codex terra @ max AND kimi k3 @ high, in parallel, in-worktree

Both ran against the real tree; both single findings disposed by confirmation IN THE
SESSION THAT RAISED THEM; zero workflow changes ordered (full fold: `rulings-03.md`):

- kimi: zero blockers, zero majors; its one minor (label edits cancel in-flight runs)
  WITHDRAWN by kimi itself after quoting the documented default trigger types. Its
  positive evidence stands: all four Gate 1 amendments verified applied BY EXECUTION —
  twelve adversarial guard cases, real step bodies run against the tree, exit-code legends
  checked against harness sources.
- terra: one claimed blocker (fork-PR payload empty per a real, verbatim-verified doc
  NOTE that contradicts ecosystem-load-bearing behaviour). Ruled documented out-of-model
  limitation: this repository has exactly two same-repo writers, and under EITHER reading
  of the contradictory documentation no false green is reachable — populated payload gives
  the designed behaviour; empty payload makes the guard fail closed on an empty PR number.
  Terra itself conceded it is not a merge blocker under this operating model.

### Pre-merge audit — codex gpt-5.6-luna @ max, workspace-write, detached

Ten of twelve boxes PASS, including every structural box and the cross-check that every
adopted ruling is present in the file. The two vitest-executing boxes failed INSIDE the
audit sandbox with `Cannot read directory "../../../../..": Access is denied` — the
nested-worktree/sandbox boundary, cause quoted verbatim from the auditor's own transcript.
Re-scored COULD-NOT-VERIFY-IN-SANDBOX; the execution evidence for those two commands is
held in triplicate by the executor's run, the item agent's run, and CI's own green ubuntu
runs (full ruling: `rulings-04.md`).

### The item's own proof

This pull request's own CI run, green on its head commit:

- Run **30769559140**, `pull_request` event, conclusion **success**, head `732af30` —
  green on the FIRST run this repository has ever executed. All steps passed on
  ubuntu-latest: checkout of the commit under test, commit report, bun install from the
  frozen lockfile, typecheck, harness self-tests, per-suite check, loop-tier verify with
  declaration match, ownership guard on the PR's own file list.
- Later paper-trail pushes trigger newer runs; the run green on the FINAL head commit is
  recorded next to the decision below.

### Branch protection (decision 11) — attempted, denied, left for the founder

The item agent attempted to add `verify` as a required status check on `main` via
`gh api -X PUT repos/nirdrang/ai4good/branches/main/protection` (preserving the existing
all-false protection flags, adding only `required_status_checks: {strict: false,
contexts: ["verify"]}`). The permission layer of this environment denied the call. Per the
item's decision 11: reported plainly, not faked, left for the founder — the exact command
is in the item report.

## Known limits (recorded, not fixed here)

On a pull_request event GitHub runs the PR's own copy of the workflow, and the
`package.json` scripts it calls are equally editable by the PR under test. This file
proves the head commit against the checks as that commit defines them; tamper-resistance
comes from server-side rules (required review, a ruleset restricting `.github/workflows`
edits) and from the founder reading diffs in interim mode. Recommendation to the founder
recorded in the item report.

## Out of scope, named

- Vitest's raw failure output does not reach any log (locally or CI) because the runner
  uses only the JSON reporter — that is AI4DEV-29 (JSON-report blindness), filed, in the
  harness, not this item.
- Branch protection (making `verify` required) is a settings change attempted after this
  PR exists, and reported honestly either way. It is not part of the workflow file.

## Decision

READY TO MERGE. Signed by the item agent holding authority over AI4DEV-5 (CI pipeline).

The workflow delivered at `23604a6` survived: a max-effort plan refutation (six findings —
three adopted, three ruled with reasons), a two-vendor diff review that ended with zero
standing findings after in-session confirmations, an independent audit that verified every
box its sandbox could reach, five-command local verification by two separate agents, and —
the item's own designed proof — consecutive green CI runs on ubuntu against every pushed
head, each run exercising the exact steps this item exists to create. The final head's
green run id is recorded in the pull request body. Interim mode holds: the founder merges.

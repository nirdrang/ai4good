# AI4DEV-5 (CI pipeline) — merge decision

STATUS: DRAFT — gates 2 and the pre-merge audit not yet folded. Do not act on this file
until the STATUS line says FINAL and a head commit is pinned.

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

### Local verification (Windows worktree, branch head at the time of running)

| command | result |
|---|---|
| `bun install --frozen-lockfile` | 533 installs across 637 packages checked, no changes |
| `bun run typecheck` | exit 0 — both configs clean |
| `bun run at:selftest` | exit 0 — 7 files, 114 tests passed |
| `bun run at:check req-016` | exit 0 — 12 P0 ids in bijection |
| `bun run at:verify req-016 --tier loop --expect` | exit 0 — matches declaration exactly (8 green, 4 declared red) |

### Gate 1 (plan) — codex gpt-5.6-terra @ max, session 019fc473-0d26-7d02-9154-1648709c106b

Six findings; three adopted as amendments (main-push concurrency, suite-without-manifest
coverage, entry-count ceiling), two ruled documented-limitation (PR-side tamper of the
workflow file and of package.json scripts — no in-file fix exists; see the Known-limits
header of ci.yml), one ruled out of scope (vitest raw output is AI4DEV-29's fix, in the
harness). Full trail: `gate1-critique.txt`, `rulings-01.md`, `rulings-02.md`.

### Gate 2 (diff) — codex terra @ max AND kimi k3 @ high, in parallel, in-worktree

PENDING — folded in rulings-03 when both return.

### Pre-merge audit — codex gpt-5.6-luna @ max, workspace-write, detached

PENDING — `premerge-audit.md`.

### The item's own proof

This pull request's own CI run, green on its head commit. Run id and conclusion recorded
below when the run exists.

PENDING — run id, conclusion.

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

PENDING — written and pinned to the head commit after the gates, the audit, and the PR's
own green run.

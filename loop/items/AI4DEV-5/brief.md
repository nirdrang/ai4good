# AI4DEV-5 (CI pipeline) — executor brief

Item agent: fable (this brief). Executor: opus (you). You implement; judgment calls come back
to the item agent, not to you and not to the coordinator.

## Mission

Every verification claim in this project currently comes from an agent's local worktree,
transcribed by hand. The repository proves nothing about a pull request. This item makes the
merge tail read a MACHINE verdict: a GitHub Actions workflow that runs the whole acceptance
stack against the pull request's HEAD commit.

## Decisions already made — implement, do not re-litigate

1. **One file**: `.github/workflows/ci.yml`. GitHub Actions. No helper scripts in other files —
   the ownership guard is an inline step in this same file.
2. **Triggers**: `pull_request` targeting `main`, and `push` to `main`.
3. **CRITICAL — run against the PR HEAD, not the merge commit.** On PR events,
   `actions/checkout` must be given `ref: ${{ github.event.pull_request.head.sha }}`.
   GitHub checks out a synthetic merge commit by default; the item's whole point is proving
   the head commit. On push events, default ref.
4. **Runner** `ubuntu-latest`. Bun via `oven-sh/setup-bun@v2` pinned `bun-version: 1.3.14`.
   Then `bun install --frozen-lockfile`. Checkout action: `actions/checkout@v4`.
5. **Five checks, each its OWN NAMED STEP** so failures are legible:
   a. `bun run typecheck` (the AI4DEV-24 wrapper — runs both tsconfig projects, aggregates)
   b. `bun run at:selftest` (vitest over `tests/at/harness`)
   c. `bun run at:check <req>` for every suite present
   d. `bun run at:verify <req> --tier loop --expect` for every requirement carrying a
      declaration manifest
   e. the ownership guard (below)
6. **Discover suites and manifests dynamically** — do NOT hardcode req-016.
   - Suites: directories matching `tests/at/suites/req-*`
   - Manifests: files matching `tests/at/expected/req-*.json` (there is a README.md in that
     directory — the glob must not catch it)
   Today only req-016 exists for both; the workflow must not rot when more are added.
7. **Ownership guard, precise definition**: a single pull request must not modify BOTH
   territories.
   - Lovable territory: `src/**`
   - Claude territory: `supabase/**`, `tests/**`, `loop/**`, `.claude/**`, `.github/**`
   A PR touching files in both FAILS the guard with a message naming the offending files from
   each side. Compute changed files from the PR base to head. Files outside both territories
   are ignored. The guard runs only on `pull_request` events (a push to main has no base);
   the step stays present and is skipped via `if:` on push, which the UI renders as Skipped.
8. **Raw output must reach the log.** Run the commands directly so stdout lands in the run
   log. Do NOT parse to JSON and print only a verdict. (Mitigates AI4DEV-29: a hook failure
   inside a file that already carries a declared red is invisible to the JSON report.)
9. **Concurrency**: cancel superseded in-progress runs for the same PR. Do not cancel runs
   for pushes to main.
10. **Loop tier is database-free** — no Supabase service, no containers, no service blocks.
11. Branch protection (making the check required) is NOT part of the workflow file — the item
    agent handles it after merge-readiness via `gh api`. Not your concern.

## Item-agent rulings baked in (implement these too)

- **Steps c and d loop over every discovered requirement and run ALL of them even if an
  earlier one fails**, aggregating the exit code — the same philosophy as
  `tests/at/typecheck.ts` (read its header comment: `&&` stopping at the first failure means
  a later project is never checked, and silence reads as clean).
- **Zero discoveries is a FAILURE, not a pass.** If step c finds no suite directories, or
  step d finds no manifests, the step fails with a message saying discovery came up empty.
  An empty set silently passing is exactly the false-green shape this project exists to kill.
- **Changed files for the guard**: use the GitHub API —
  `gh api "repos/${{ github.repository }}/pulls/<N>/files" --paginate --jq '.[].filename'`
  with `GH_TOKEN: ${{ github.token }}`. That endpoint is exactly the base→head file list and
  does not couple the guard to checkout fetch-depth. (`fetch-depth` can stay at the default 1.)
- **Concurrency group**: `${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}`,
  `cancel-in-progress: ${{ github.event_name == 'pull_request' }}`.
- **Permissions block**: explicit and minimal — `contents: read`, `pull-requests: read`.
- **Job timeout**: `timeout-minutes: 15`. The loop tier is fast; a hung run should die.
- Single job. Sequential steps. Every step named in plain words.

## Repo facts you can rely on

- No `.github/` directory exists yet — you create it.
- `package.json` scripts (already wired, do not change them):
  - `typecheck` → `bun tests/at/typecheck.ts`
  - `at:selftest` → `bunx vitest run --root tests/at --config vitest.config.ts harness/`
  - `at:check` → `bun tests/at/harness/check.ts` (usage: `bun run at:check req-0NN`)
  - `at:verify` → `bun tests/at/harness/runner.ts` (usage: `bun run at:verify req-0NN --tier <loop|integration|drill> [--expect]`)
- `at:check` accepts `req-016` or `016`; suite dir name is `req-016`, manifest name is
  `req-016.json` — deriving `req-0NN` from either is a basename exercise.
- `bun.lock` exists at the repo root (text lockfile). `bunfig.toml` sets a 24h
  minimumReleaseAge install guard — irrelevant under `--frozen-lockfile`, do not touch it.
- Acceptance files live at `.taskmaster/docs/acceptance/at-req-0NN.md` and are tracked in
  git, so `at:check` works from a plain checkout.
- The dev machine is Windows; CI is ubuntu-latest. Workflow steps are bash. Local commands
  you run for verification are PowerShell. Use bun, never npm/pnpm.

## Phases — stop at each checkpoint

**Phase 1 — PLAN.** Write `loop/items/AI4DEV-5/plan.md`: the exact step list, the exact
discovery loop shell code, the exact guard step shell code, the trigger/concurrency/
permissions header — essentially the workflow in prose+snippets, plus anything you judge
risky with a proposed resolution. Then STOP and report the plan back. Gate 1 (adversarial
review) runs on that plan; you get rulings before implementing.

**Phase 2 — IMPLEMENT** (only after the item agent sends rulings): write
`.github/workflows/ci.yml`. Then verify locally what CAN be verified locally, in PowerShell:
- `bun run typecheck`
- `bun run at:selftest`
- `bun run at:check req-016`
- `bun run at:verify req-016 --tier loop --expect`
All four must be green in this worktree — they are the same commands CI will run, so a local
red means a CI red. Also sanity-parse the YAML (bun one-liner with a YAML parser is fine if
one is already in node_modules; otherwise careful reading — do NOT add a dependency for
this). Report results and STOP. Do not commit, do not push, do not open a PR — the item
agent owns the merge tail.

## Constraints

- Touch ONLY: `.github/workflows/ci.yml` and `loop/items/AI4DEV-5/*`. Nothing else. No
  package.json edits, no script files, no reformatting of neighbours.
- No new dependencies.
- PowerShell for local commands, never Bash (the workflow's own steps are bash — that is the
  runner's shell, not yours).
- If something here is wrong against reality (a script missing, a flag rejected), STOP and
  report it — do not improvise around a decision.

# PLAN — AI4DEV-5: a CI pipeline that runs the acceptance stack against the pull request's head commit

Executor plan against `brief.md`. Branch `nirdrang/ai4dev-5-bring-up-ci-pipeline-ownership-guard-test-run`,
base `4c11dfc` (= `origin/main` at the time of writing), worktree
`C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\agent-a180654671adb8ac4`. Working tree clean
apart from this item's own directory.

The deliverable is one file, `.github/workflows/ci.yml`, transcribed from §2 below. Nothing else
changes.

---

## 0. Ground truth — what was read, and what is therefore known

Every claim in this section came from reading the file named, in this worktree, at `4c11dfc`. Where
a fact was **not** measured by running something, it says so.

### 0a. The scripts CI will call (`package.json`, lines 12–16, unchanged by this item)

| script | command | argument shape |
|---|---|---|
| `typecheck` | `bun tests/at/typecheck.ts` | none |
| `at:selftest` | `bunx vitest run --root tests/at --config vitest.config.ts harness/` | none |
| `at:check` | `bun tests/at/harness/check.ts` | `req-0NN` |
| `at:verify` | `bun tests/at/harness/runner.ts` | `req-0NN --tier <tier> [--expect]` |

`bun run <script> <extra args>` appends the extra arguments to the script command, which is how
`at:check` and `at:verify` receive their requirement.

### 0b. What exists on disk today

- `tests/at/suites/` contains exactly one entry, the directory `req-016`. No files, no other dirs.
- `tests/at/expected/` contains exactly two entries: `README.md` and `req-016.json`.
- `.taskmaster/docs/acceptance/` contains **30 acceptance files** (`at-req-001.md` through
  `at-req-036.md`, non-contiguous, including the dotted `at-req-005.5.md`) plus a `README.md`.
  This is why discovery must be driven by suites and manifests and **never** by acceptance files:
  29 of those 30 requirements have no executable suite at all, and looping over them would fail 29
  times on day one.
- There is no `.github/` directory. This item creates it.
- Confirmed tracked in git (so a plain `actions/checkout` has them):
  `.taskmaster/docs/acceptance/at-req-016.md`, `tests/at/expected/req-016.json`, all nine files in
  `tests/at/suites/req-016/`, and four files under `.claude/` (`settings.json` plus three skills —
  `.gitignore` lists `.claude/`, but files already tracked stay tracked, so `.claude/**` is a real
  territory a pull request can touch).
- `bun.lock` is the text lockfile, `lockfileVersion: 1`. It carries the Linux-specific optional
  packages (36 occurrences of `linux-x64`, 39 of `rollup-linux`, 15 each of `oxide-linux` and
  `lightningcss-linux`), so a lockfile authored on Windows has the entries an ubuntu install needs.
  **Not measured:** `bun install --frozen-lockfile` has never actually been run on Linux here.
- Local bun is `1.3.14`, the exact version the brief pins for CI. Measured (`bun --version`).

### 0c. Exit codes, read out of the source — these are what the loops aggregate

`tests/at/harness/check.ts` `main()`:

- `0` — bijection holds (`RESULT: N P0 ids in bijection`)
- `1` — missing / extra / duplicated ids, or zero P0 ids parsed
- `2` — the argument is not a requirement, or the acceptance file could not be read

`tests/at/harness/runner.ts` `main()`:

- `0` — pass (with `--expect`: the run matches the declaration exactly)
- `1` — failure (reds/missing/extra, a non-zero vitest exit, or one or more declaration deviations)
- `2` — usage error, no suite directory, AT↔code preflight refusal, **or a declaration that cannot
  be honoured** (no manifest, no entry for the tier being run, malformed, or not in bijection with
  the acceptance file) — no tests run
- `3` — infrastructure (only reachable above the loop tier) or `--wired`
- `4` — vitest produced no report, or an unreadable one

That range is worth printing in the log: `2` and `4` mean *nothing was graded*, which reads very
differently from `1`.

### 0d. The loop tier is genuinely database-free — confirmed in source

`runner.ts` main(): the entire lock / `supabase status` / local-stack proof / `db reset` /
migration-replay sequence sits inside `if (tier !== 'loop')` (line 1044). At the loop tier the
runner goes straight to the vitest spawn. So: no Docker, no service container, no `db:start`.
Comment at line 1026 says so explicitly.

### 0e. Why the "run them all, aggregate the exit code" ruling exists

`tests/at/typecheck.ts` header, lines 3–8, verbatim:

> WHY THIS IS NOT `tsc -p a && tsc -p b`: `&&` stops at the first failure, so an error in the app
> config would prevent the acceptance-test check from ever starting. A command that says nothing at
> all about `tests/at` reads exactly like one that found it clean — which is the same false-green
> shape this item exists to remove.

The two discovery loops copy that shape exactly: every discovered requirement is run, failures are
recorded, the step's exit code is the aggregate.

### 0f. Prior measurement of the four commands (not re-measured in this phase)

`loop/items/AI4DEV-24/plan.md` §0a records all four green on a clean worktree at `02baf79`:
`typecheck` exit 0; `at:selftest` 6 files / 96 tests all passing; `at:check req-016`
`RESULT: 12 P0 ids in bijection`; `at:verify req-016 --tier loop --expect` exit 0, 8 declared green
and 4 declared red. Phase 2 re-measures all four on this branch, per the brief.

---

## 1. Shape of the file

One workflow, one job, ten steps, sequential, fail-fast between steps. Job id `verify` with **no
`name:` override**, so the status check GitHub publishes — the string the item agent will need when
it makes the check required on `main` — is exactly:

```
verify
```

Steps, in order (the brief's checks a–e are steps 5–9):

| # | step name | what it is |
|---|---|---|
| 1 | Check out the commit under test | `actions/checkout@v4`, PR **head** sha |
| 2 | Report the commit under test | prints the event, the head sha and `git rev-parse HEAD` |
| 3 | Install bun | `oven-sh/setup-bun@v2`, pinned `1.3.14` |
| 4 | Install dependencies from the lockfile | `bun install --frozen-lockfile` |
| 5 | Type-check both TypeScript projects | check (a) |
| 6 | Run the acceptance-harness self-tests | check (b) |
| 7 | Check every acceptance suite against its acceptance file | check (c), discovery loop |
| 8 | Verify every declared requirement at the loop tier | check (d), discovery loop |
| 9 | Guard against a pull request that changes both territories | check (e), `if:` on PR events |

Step 2 is the only addition to the brief's list. It is three lines and it is the item's own
evidence: the whole point is that the run graded the head commit rather than a synthetic merge
commit, and a human reading the log should be able to see that without trusting the YAML.

---

## 2. The file, exactly as it will be written

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

# Minimal and explicit. `contents: read` is what checkout needs; `pull-requests: read` is what the
# ownership guard's `gh api .../pulls/N/files` call needs. Nothing here writes anything.
permissions:
  contents: read
  pull-requests: read

# One in-flight run per pull request; a superseded push to the same PR cancels the older run.
# Pushes to main are NOT cancelled — every commit on main gets a verdict of its own.
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      # THE HEAD COMMIT, NOT THE MERGE COMMIT. On a pull_request event GitHub's default ref is a
      # synthetic merge of head into base — a commit that exists in no branch and that nobody
      # reviewed. This item exists to make CI's verdict be about the commit in the pull request, so
      # the head sha is named explicitly. On push events the expression falls through to
      # github.sha, which is the pushed commit.
      - name: Check out the commit under test
        uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.sha || github.sha }}

      - name: Report the commit under test
        shell: bash
        env:
          PR_HEAD_SHA: ${{ github.event.pull_request.head.sha }}
        run: |
          echo "event:             ${GITHUB_EVENT_NAME}"
          echo "pull request head: ${PR_HEAD_SHA:-(not a pull request)}"
          echo "checked out:       $(git rev-parse HEAD)"
          git log -1 --format='%H  %an  %s'

      - name: Install bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: 1.3.14

      - name: Install dependencies from the lockfile
        shell: bash
        run: bun install --frozen-lockfile

      - name: Type-check both TypeScript projects
        shell: bash
        run: bun run typecheck

      - name: Run the acceptance-harness self-tests
        shell: bash
        run: bun run at:selftest

      # Every suite is checked even after one fails, and the step's exit code is the aggregate —
      # the same reason tests/at/typecheck.ts refuses to use `&&`. Zero discoveries is a FAILURE:
      # a loop that matched nothing and exited 0 is the exact false green this repository exists
      # to kill.
      - name: Check every acceptance suite against its acceptance file
        shell: bash
        run: |
          shopt -s nullglob
          suites=(tests/at/suites/req-*/)
          if [ ${#suites[@]} -eq 0 ]; then
            echo "::error::discovery found no suite directories matching tests/at/suites/req-* — an empty set is a failure, not a pass"
            exit 1
          fi
          echo "discovered ${#suites[@]} suite(s): ${suites[*]}"
          status=0
          for dir in "${suites[@]}"; do
            req=$(basename "$dir")
            echo ""
            echo "===== bun run at:check $req ====="
            code=0
            bun run at:check "$req" || code=$?
            if [ "$code" -ne 0 ]; then
              echo "::error::at:check $req exited $code (1 = ids missing/extra/duplicated or none parsed, 2 = the requirement or its acceptance file could not be read)"
              status=1
            fi
          done
          exit $status

      - name: Verify every declared requirement at the loop tier
        shell: bash
        run: |
          shopt -s nullglob
          manifests=(tests/at/expected/req-*.json)
          if [ ${#manifests[@]} -eq 0 ]; then
            echo "::error::discovery found no declaration manifests matching tests/at/expected/req-*.json — an empty set is a failure, not a pass"
            exit 1
          fi
          echo "discovered ${#manifests[@]} declaration manifest(s): ${manifests[*]}"
          status=0
          for file in "${manifests[@]}"; do
            req=$(basename "$file" .json)
            echo ""
            echo "===== bun run at:verify $req --tier loop --expect ====="
            code=0
            bun run at:verify "$req" --tier loop --expect || code=$?
            if [ "$code" -ne 0 ]; then
              echo "::error::at:verify $req --tier loop --expect exited $code (1 = the run deviates from its declaration, 2 = the declaration or the AT-to-code preflight refused the run and NOTHING was graded, 3 = infrastructure, 4 = no usable vitest report)"
              status=1
            fi
          done
          exit $status

      # One pull request may not change both territories. Lovable owns src/; Claude owns
      # supabase/, tests/, loop/, .claude/ and .github/. Anything else is neither, and is ignored.
      # The changed-file list comes from the pull request itself, which IS the base-to-head diff —
      # so the guard never depends on how deep the checkout fetched.
      - name: Guard against a pull request that changes both territories
        if: github.event_name == 'pull_request'
        shell: bash
        env:
          GH_TOKEN: ${{ github.token }}
          REPOSITORY: ${{ github.repository }}
          PR_NUMBER: ${{ github.event.pull_request.number }}
        run: |
          # `previous_filename` is carried too: a file MOVED out of src/ into tests/ changes both
          # territories, and the API reports only its destination under `filename`.
          if ! files=$(gh api "repos/${REPOSITORY}/pulls/${PR_NUMBER}/files" --paginate \
              --jq '.[] | (.filename), (.previous_filename // empty)'); then
            echo "::error::the pull request's changed files could not be read from the GitHub API — the guard does not pass a change set it could not read"
            exit 1
          fi

          count=$(printf '%s\n' "$files" | grep -c . || true)
          echo "the pull request touches $count path(s)"
          if [ "$count" -eq 0 ]; then
            echo "::error::the GitHub API reported no changed files for this pull request — the guard does not pass a change set it could not read"
            exit 1
          fi
          if [ "$count" -ge 3000 ]; then
            echo "::error::the changed-file listing reached the GitHub API's 3000-entry ceiling, so it is truncated and the guard cannot prove the two territories are separate"
            exit 1
          fi

          lovable=$(printf '%s\n' "$files" | grep -E '^src/' || true)
          claude=$(printf '%s\n' "$files" | grep -E '^(supabase|tests|loop|\.claude|\.github)/' || true)

          if [ -n "$lovable" ] && [ -n "$claude" ]; then
            echo "::error::this pull request changes BOTH Lovable territory and Claude territory — split it into two pull requests"
            echo "Lovable territory (src/):"
            printf '%s\n' "$lovable" | sed 's/^/  /'
            echo "Claude territory (supabase/, tests/, loop/, .claude/, .github/):"
            printf '%s\n' "$claude" | sed 's/^/  /'
            exit 1
          fi

          if [ -n "$lovable" ]; then
            echo "ownership guard OK — this pull request stays inside Lovable territory"
          elif [ -n "$claude" ]; then
            echo "ownership guard OK — this pull request stays inside Claude territory"
          else
            echo "ownership guard OK — this pull request touches neither territory"
          fi
```

---

## 3. Why the non-obvious lines are written the way they are

**`ref: ${{ github.event.pull_request.head.sha || github.sha }}`.** On a push event the left side
is an empty string and `||` yields `github.sha`. `actions/checkout` also treats an empty `ref` as
"unset" and would do the right thing, but relying on that is a silent dependency on an
implementation detail of somebody else's action; the explicit fallback says what it means. There is
no second checkout anywhere in the file, so there is no path by which the merge commit can creep
back in.

**`shell: bash` on every `run:` step.** On `ubuntu-latest` bash is already the default and it is
already invoked as `bash --noprofile --norc -eo pipefail {0}`. Stating it makes the `-e` and
`pipefail` semantics the scripts rely on an explicit property of this file rather than an inherited
runner default that could be changed by a future org-level setting.

**Arrays and `for`, never `... | while read`.** A `while` loop on the right of a pipe runs in a
subshell, so `status=1` set inside it is lost when the subshell exits and the step passes. That is
precisely the "shell loop whose failure is eaten" failure mode. `shopt -s nullglob` plus a real
array plus a `for` loop keeps every assignment in the step's own shell.

**`code=0; cmd || code=$?`, not `if cmd; then … else …`.** Both are `set -e`-safe, but this form
puts the actual exit code in a variable so the log can print it, and `2` versus `1` from
`at:verify` is a materially different fact (nothing graded, versus graded and deviating). The `||`
is also what stops `set -e` from killing the step at the first failing requirement.

**`basename "$dir"` and `basename "$file" .json`.** The suite glob has a trailing slash, so array
entries look like `tests/at/suites/req-016/`; `basename` strips trailing slashes and yields
`req-016`. Manifests yield `req-016` from `req-016.json`. Both feed `normalizeRequirement()` in
`check.ts`, whose regex is `^(?:req-)?(\d{3}(?:\.\d+)*)$` — so dotted requirements such as
`req-005.5` (an acceptance file for which already exists) survive both derivations unharmed.

**The manifest glob cannot catch `README.md`.** `tests/at/expected/req-*.json` requires both the
`req-` prefix and the `.json` suffix.

**`if ! files=$(gh api …)`.** A failed command substitution inside a bare assignment does abort
under `set -e`, but the negated-condition form is unambiguous and lets the guard print its own
sentence instead of an anonymous non-zero exit.

**Interpolating `${{ }}` into `env:` rather than into `run:`.** `github.repository` and a pull
request number cannot contain shell metacharacters, so this is not a live injection hole — but
templating workflow expressions straight into a shell body is the pattern that becomes one the day
somebody adds a branch name or a title, and every scanner flags it.

**`grep -E '^src/'` — prefix, with the slash.** `srcfoo/bar.ts` does not match, and neither does a
root-level file named `supabase.config`. Deleted files are reported under `filename` like any other
change, so a pure deletion in the other territory is caught.

**The guard runs last.** Steps are sequential and fail-fast, so whichever check is first hides the
others when it fails. The brief enumerates the guard as check (e); it stays fifth. Consequence,
stated plainly so nobody is surprised: a pull request whose tests fail *and* which crosses
territories reports only the test failure on that run.

**No dependency cache, no `paths-ignore`, no matrix, no `workflow_dispatch`.** None was asked for.
A `paths-ignore` in particular would create a class of pull request that reports green having run
nothing, which is the shape this item exists to remove.

---

## 4. Risks — real ones, with what I propose to do about each

**R1 — MAJOR. The acceptance harness has never been executed on Linux.** Everything in
`tests/at/` has only ever run on this Windows machine. The Windows-specific code paths I read are
correctly guarded (`taskkill` only under `process.platform === 'win32'`; the drive-letter fix-up in
`check.ts` line 20 is a regex that simply does not match a POSIX path; `bunExecutable()`'s
`/[\\/]bun(\.exe)?$/i` matches the `~/.bun/bin/bun` that `setup-bun` installs; the machine-wide
lock's `LOCALAPPDATA ?? XDG_CACHE_HOME ?? tmpdir()` is only reached above the loop tier). The
residual exposure is filename case sensitivity in imports, which Windows forgives and Linux does
not. *Proposed resolution:* none inside `ci.yml` — this is a genuine finding if it fires. If the
first CI run goes red for a Linux-only harness reason, I stop and report it to the item agent
rather than patching `tests/at/**`, which is outside this item's allowed paths.

**R2 — MAJOR. `bun install --frozen-lockfile` is a gate this repository has never passed.** If
`package.json` and `bun.lock` have drifted at all, every CI run fails at step 4 before a single
check executes. The lockfile does carry the Linux optional packages (§0b), so cross-platform
resolution is not the worry; staleness is. *Proposed resolution:* add
`bun install --frozen-lockfile --dry-run` to the Phase 2 local verification list (§5) so this is
known before the workflow is ever pushed.

**R3 — MAJOR. A suite with no declaration manifest is checked but never RUN.** Step (c) covers
suites, step (d) covers manifests, and today those are the same one-element set. The day somebody
adds `tests/at/suites/req-020/` without `tests/at/expected/req-020.json`, CI checks its
AT-to-code bijection and never executes a single one of its tests — a green pull request for a
suite nobody ran. *Proposed resolution:* this is beyond the brief's letter, so I will not add it
unilaterally — see the ruling requested in §5.1. The fix is four lines at the end of step (d):
for each discovered suite, fail if `tests/at/expected/<req>.json` does not exist. The reverse case
(a manifest with no suite) already fails loudly: `at:verify` exits 2 with `no suite at …`.

**R4 — MINOR. A manifest that declares only the integration tier fails step (d).**
`loadTierExpectation` refuses (exit 2, no tests run) when the manifest has no entry for the tier
being run, and step (d) always asks for `loop`. Today `req-016.json` declares `loop` and this is
theoretical. I judge the refusal correct rather than a bug — a requirement whose loop tier is
undeclared genuinely is unverifiable at the loop tier — and the printed exit code plus the
runner's own `DECLARATION REFUSED` line say exactly that. *Proposed resolution:* leave it; the
failure is loud and accurate.

**R5 — MINOR. The changed-file endpoint caps at 3000 entries even with `--paginate`.** A pull
request larger than that would hand the guard a truncated list and it could miss the offending
file. Handled by failing closed at `count >= 3000` with a message that says the guard could not
prove separation. Three lines, and it matches the house rule that an unverifiable check never
reports green. Drop it if the gate considers it noise.

**R6 — MINOR. A pull request with zero changed files fails the guard.** Degenerate but reachable
(a head that equals its base). I treat it the same way as an unreadable list: refuse. The
alternative reading — "zero files obviously touches neither territory, so pass" — is defensible;
I chose refusal because a pull request that changes nothing has nothing for CI to prove, and
because this repository's standing rule is that an empty set never passes silently.

**R7 — MINOR. Pushes to `main` queue rather than cancel.** With `cancel-in-progress` false for
push events, two quick merges to `main` share the concurrency group `CI-refs/heads/main` and the
second waits for the first. That is the brief's decision 9 working as specified, and serialising
`main` verdicts is the behaviour you want; noted only so a pending run on `main` is not mistaken
for a hung one.

**R8 — MINOR. Fork pull requests.** `pull_request` (not `pull_request_target`) checks out and
executes untrusted head code with a read-only token, which is the standard and correct choice.
This workflow consumes no secrets, so a hostile fork gains nothing beyond compute. `gh api` on the
pull request's files works with the read-only token. No change proposed.

**R9 — MINOR. A pull request targeting a branch other than `main` gets no CI at all.** That is
the brief's decision 2 (`branches: [main]` on both triggers). Stated for the record.

**R10 — MINOR. `ubuntu-latest` and the preinstalled `gh` are moving targets.** bun is pinned and
every check runs under it, so the exposure is limited to `gh`, `git` and `bash`, all used through
long-stable interfaces. Pinning `ubuntu-24.04` would trade one kind of drift for another (silent
image rot); not proposed.

**R11 — informational. Step (c) and step (d) overlap.** `at:verify` runs `inspectBijection()`
itself and refuses with exit 2 if the bijection is broken, so for a requirement having both a suite
and a manifest, step (c) is redundant. It is kept because it covers suites with no manifest, and
because `at:check` prints the full missing/extra/duplicate table while the runner prints a single
refusal line. The brief decided this; noted only so the redundancy is not read as an oversight.

---

## 5. What I need from the item agent, and what happens next

### 5.1 One ruling requested

**Should step (d) also fail when a discovered suite has no declaration manifest (R3)?** It closes a
real future false-green, it costs four lines, it passes today, and it is beyond the brief's literal
text — so it is the item agent's call, not mine. My recommendation is yes.

### 5.2 Phase 2, once rulings arrive

Write `.github/workflows/ci.yml` exactly as §2 (plus whatever the rulings change), then run in
PowerShell, in this worktree:

1. `bun install --frozen-lockfile --dry-run` — proves step 4 of the workflow will not fail on a
   stale lockfile (R2; addition to the brief's list, and the only one).
2. `bun run typecheck`
3. `bun run at:selftest`
4. `bun run at:check req-016`
5. `bun run at:verify req-016 --tier loop --expect`

All must be green; these are literally the commands CI runs, so a local red is a CI red. Timings
get reported alongside, as evidence for or against the 15-minute job timeout. The YAML itself gets
sanity-parsed with a parser already present in `node_modules` if there is one, and read carefully
if there is not — no dependency is added for it. Then I stop: no commit, no push, no pull request.

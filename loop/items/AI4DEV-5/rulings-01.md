# AI4DEV-5 — rulings 01 (on the executor's plan, before Gate 1 findings folded in)

Item agent rulings on the questions and judgment calls the plan surfaced. Gate 1 (codex
gpt-5.6-terra @ max, in-worktree, session running at the time of writing) gets folded into
rulings-02 when it returns; nothing below is implemented until that fold happens.

## Ruling 1 — R3, suite with no declaration manifest: ADOPTED, fail step (d)

The executor asked (plan §5.1): should step (d) fail when a discovered suite has no
`tests/at/expected/<req>.json`? RULING: YES.

Reasoning: the brief's decision 5d says "at:verify for every requirement carrying a
declaration" — the coverage check does not change what runs, it makes the GAP between 5c's
set and 5d's set visible. A suite whose tests are checked for bijection but never executed
is a green pull request for a suite nobody ran — the exact false-green shape the item
exists to kill, and the same principle as the already-ruled "zero discoveries is a
failure". Cost: four lines. This is a strengthening inside the item's stated purpose, not
scope growth, so it is mine to rule, and I rule it in.

## Ruling 2 — step 2 "Report the commit under test": KEPT

The one step beyond the brief's five checks. It prints the event, the PR head sha, and
`git rev-parse HEAD`. The item's central claim is "the head commit was graded"; this makes
that claim checkable from the log by a human instead of resting on trust in the YAML.
Three lines, no failure modes of its own. Kept.

## Ruling 3 — R5 (3000-file ceiling fails closed) and R6 (zero-file PR refused): KEPT, both

Both follow the house rule that an unverifiable change set never passes silently. The
3000 cap costs three lines and fires only on a pathological PR; the zero-file refusal is
the same shape as the unreadable-list refusal. Neither is noise. Kept.

## Ruling 4 — local verification list gains `bun install --frozen-lockfile --dry-run`: APPROVED

R2 is real: the frozen-lockfile gate has never been passed by this repository, and finding
staleness locally is strictly better than finding it on the first CI run. One caveat given
to the executor: if bun rejects the `--frozen-lockfile --dry-run` combination, run the real
`bun install --frozen-lockfile` in the worktree instead (it is the same project and an
install into node_modules is safe) — do not silently drop the check.

## Noted, no change ordered

- R4 (integration-only manifest fails loudly at loop tier): correct refusal, leave.
- R7 (pushes to main queue, never cancel): decision 9 as specified.
- R8 (fork PRs run with read-only token, no secrets consumed): standard, correct.
- R9 (PRs targeting non-main branches get no CI): decision 2 as specified.
- R11 (step c redundant where a manifest exists): kept deliberately — it covers the
  no-manifest case and prints the full bijection table where the runner prints one line.
- Guard runs last and a PR failing tests AND crossing territories reports only the test
  failure on that run: acceptable for now; if Gate 1 flags it, the candidate fix is
  `always() && github.event_name == 'pull_request'` on the guard step, which is three
  tokens — decision deferred to the Gate 1 fold.

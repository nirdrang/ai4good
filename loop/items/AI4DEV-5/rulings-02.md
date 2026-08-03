# AI4DEV-5 — rulings 02 (triage of Gate 1)

Gate 1: codex gpt-5.6-terra @ max, in-worktree, session `019fc473-0d26-7d02-9154-1648709c106b`,
critique in `gate1-critique.txt` (4,927 bytes, non-empty — checked). Six findings: 3 BLOCKER,
2 MAJOR, 1 MINOR. Rulings below are final for the plan stage; Gate 2 reviews the implemented
diff fresh and may re-raise anything.

## F1 (BLOCKER claimed) — a PR can rewrite the workflow that judges it: VALID FACT, NO IN-FILE FIX EXISTS, DOCUMENT

Terra is right about the semantics: on `pull_request`, GitHub runs the PR's own copy of
`ci.yml`, so a PR touching `src/**` plus `.github/workflows/ci.yml` could gut the guard and
still report `verify` green. But this is a property of every PR-run CI system, and no line
inside the workflow can defend the workflow against edits to itself — any in-file "guard the
guard" is judged by the same edited file. The defenses live server-side (required review,
rulesets restricting workflow edits) and, today, in interim mode: the founder reads every
diff before merging, and a PR editing `.github/workflows/` is exactly the kind of diff that
gets read. RULING: not a blocker for this item; a Known-limits comment goes in the workflow
header and in the PR body; a recommendation goes to the founder to add a repository ruleset
for `.github/workflows/**` when branch protection is configured (same settings surface as
decision 11). Severity as ruled: documented limitation.

## F2 (BLOCKER claimed) — package.json scripts are a neuter switch outside both territories: SAME CLASS AS F1, DOCUMENT

True: a `src/**`-only PR may also edit `package.json` script bodies and turn all four checks
into no-ops, and the guard classifies it Lovable-only. Considered and rejected fixes:
- Put `package.json` in a territory — wrong, it is genuinely shared: Lovable adds
  dependencies (src + package.json + bun.lock is a legitimate Lovable PR), Claude edits
  scripts. Either assignment breaks a legitimate flow of the other side.
- Inline the underlying commands in the workflow, bypassing `bun run` — creates silent drift
  between what CI runs and what developers run (a script legitimately changes, CI keeps
  verifying the old command), which is its own false-green shape, and it contradicts the
  ratified decision 5 command list.
Tamper-resistance has to come from the same server-side rules as F1; an edited-scripts PR is
also precisely what founder review catches in interim mode. RULING: documented limitation,
same Known-limits block as F1. Not a blocker for this item.

## F3 (BLOCKER claimed) — raw vitest failure output does not reach the log: RESTATES AI4DEV-29, OUT OF SCOPE HERE

Terra is right that `runner.ts` invokes vitest with only the JSON reporter and deletes the
temp file, so vitest's raw failure text never reaches any log — locally or in CI. But the
item's own ratified decision 8 already says the workflow-level requirement ("run the commands
directly, never parse-to-JSON in the workflow") only PARTIALLY mitigates AI4DEV-29 — the
JSON-blindness is known, named, and filed as that item. The full fix (a default reporter
alongside JSON in the runner) is a `tests/at/**` harness change owned by AI4DEV-29; smuggling
it into this item's diff would step on a filed item and breach this item's one-file scope.
RULING: no change in this item; the plan meets decision 8 as written. Recorded plainly here
and in the report so the finding is not lost: AI4DEV-29 is where this closes.

## F4 (MAJOR) — rapid pushes to main silently cancel the pending middle run: ADOPTED

GitHub keeps at most one pending run per concurrency group, so with group
`CI-refs/heads/main` a third quick push cancels the second push's pending run and that commit
never gets a verdict — the plan's comment ("every commit on main gets a verdict of its own")
was false. FIX: the concurrency group falls back to `github.run_id` instead of `github.ref`
for non-PR events — every push run is then its own group: nothing queues, nothing cancels,
every main commit gets its own verdict, and PR behaviour is unchanged (group by PR number,
cancel-in-progress true). Comment updated to say what is now true.

## F5 (MAJOR) — suite without a manifest never runs: ALREADY ADOPTED IN RULINGS-01

Terra independently confirms the executor's R3 and my ruling 1. Implemented as the coverage
check at the end of step (d): every discovered suite directory must have a matching
`tests/at/expected/<req>.json`, else the step fails naming the suite.

## F6 (MINOR) — the 3000 ceiling counts path strings, not file entries: ADOPTED

1,500 renames inside `src/**` emit 3,000 path lines and would falsely trip the ceiling on a
one-territory PR. FIX: the guard emits ONE line per file entry —
`--jq '.[] | [.filename, (.previous_filename // "")] | @tsv'` — counts entries for both the
log message and the fail-closed 3000 ceiling, and applies the territory match to both fields
of each line (empty second field dropped). Fail-closed semantics unchanged.

## Net changes to the plan (the executor's implementation delta)

- A1: step (d) manifest-coverage check (rulings-01 ruling 1 / F5).
- A2: concurrency group `${{ github.workflow }}-${{ github.event.pull_request.number || github.run_id }}`,
  comment corrected (F4).
- A3: guard reads one TSV line per file entry; entry-count ceiling; both-field territory
  match (F6).
- A4: Known-limits comment block in the workflow header covering F1 + F2 in a few plain
  lines; the same limitation named in the PR body; founder recommendation recorded in the
  final report.
Everything else in plan §2 stands as written.

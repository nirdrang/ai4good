## 1. Frozen install

`bun install --frozen-lockfile` exited 0: 533 installs checked across 637 packages; no changes.

Verdict: PASS

## 2. Typecheck

`bun run typecheck` exited 0. Tail: `typecheck OK: both configs clean`.

Verdict: PASS

## 3. Acceptance self-tests

`bun run at:selftest` exited 1. Vitest failed with access-denied errors while loading its config. No test count was produced.

Verdict: FAIL

## 4. Acceptance bijection

`bun run at:check req-016` exited 0: 12 P0 IDs in the acceptance file and 12 registered in the suite; bijection confirmed.

Verdict: PASS

## 5. Loop verification

`bun run at:verify req-016 --tier loop --expect` failed because Vitest produced no report due to access-denied errors. Declared green/red matches were not produced.

Verdict: FAIL

## 6. Pull-request HEAD checkout

[ci.yml](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/agent-a180654671adb8ac4/.github/workflows/ci.yml:43) uses checkout once, with:

`ref: ${{ github.event.pull_request.head.sha || github.sha }}`

No later checkout or switch command exists.

Verdict: PASS

## 7. Five named checks and dynamic execution

[ci.yml](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/agent-a180654671adb8ac4/.github/workflows/ci.yml:67) defines five separate check steps. Suite and manifest discovery use `nullglob`, fail on zero items, and run every discovered item. Each command is guarded with `|| code=$?`; failures aggregate into `status`, which is exited after all items run.

Verdict: PASS

## 8. Missing declaration manifests

[ci.yml](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/agent-a180654671adb8ac4/.github/workflows/ci.yml:126) checks every discovered suite for `tests/at/expected/<req>.json` and exits nonzero when any are missing.

Verdict: PASS

## 9. Concurrency

[ci.yml](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/agent-a180654671adb8ac4/.github/workflows/ci.yml:30) uses:

`${{ github.workflow }}-${{ github.event.pull_request.number || github.run_id }}`

Cancellation is true only for pull requests and false for pushes.

Verdict: PASS

## 10. Ownership guard

[ci.yml](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/agent-a180654671adb8ac4/.github/workflows/ci.yml:161) emits one TSV line per API file entry containing both `filename` and `previous_filename`. It fails on API errors, zero entries, or at least 3000 entries. It matches `^src/` and `^(supabase|tests|loop|\.claude|\.github)/` across both fields, failing only when both territories are present.

Verdict: PASS

## 11. Known limits

[ci.yml](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/agent-a180654671adb8ac4/.github/workflows/ci.yml:1) plainly documents that pull requests can modify their own workflow and package scripts, and that server-side controls are required for tamper resistance.

Verdict: PASS

## 12. Scope

`git diff origin/main...HEAD --name-only` listed only `.github/workflows/ci.yml` and files under `loop/items/AI4DEV-5/**`.

Verdict: PASS

## Rulings cross-check

The adopted rulings in `rulings-02.md` are implemented:

- F4/A2: PR-number concurrency and run-ID push grouping.
- F5/A1: missing-manifest coverage failure.
- F6/A3: one entry per TSV line, both path fields checked.
- A4: Known-limits header documenting PR-side tampering.

AUDIT: 2 FINDINGS

1. **BLOCKER — Box 3:** `bun run at:selftest` exited 1 before producing test results.
2. **BLOCKER — Box 5:** `bun run at:verify req-016 --tier loop --expect` exited nonzero without producing a report or declaration match.
# Mechanical report: the rebase and the evidence

Head correction confirmed before start: `git rev-parse --short HEAD` printed `05c9dbd`, not
the plan's `2536087`. Every place the plan writes `2536087`, this run used `05c9dbd` instead.

## Job 1: the ordered rebase

Five commits, oldest first, on `ai4dev-55-ordered` off `origin/main`:

1. `e6d7974` — AI4DEV-55: machinery, a grok wrapper for a kernel without Landlock
2. `573a534` — AI4DEV-55: unit 1, cross-organisation denial with no existence oracle
3. `24993f5` — AI4DEV-55: unit 2, assigned-volunteer scope, admin reach, visitor API
4. `97d79a3` — AI4DEV-55: review fixes, the catalog guard made symmetric and the harness tightened
5. `95235af` — AI4DEV-55: the item record, station artifacts, reports and the decision trail

`git diff --stat 05c9dbd ai4dev-55-ordered` printed nothing. The ordered branch and the old head
are the same tree.

Push: `git push --force-with-lease=nirdrang/ai4dev-55-tenant-isolation-and-visibility-d5:05c9dbd
-u origin nirdrang/ai4dev-55-tenant-isolation-and-visibility-d5` succeeded.
`05c9dbd...95235af nirdrang/ai4dev-55-tenant-isolation-and-visibility-d5 ->
nirdrang/ai4dev-55-tenant-isolation-and-visibility-d5 (forced update)`.

## Job 2: evidence on the final head

Head after Job 1: `95235af` (full: `95235afa946e46749e07aaea26959fc40f5e4e24`).

Edge-runtime mount source: `/home/user/ai4good/supabase/functions`, as the plan requires.

Exit lines, by file, in `loop/items/AI4DEV-55/artifacts/verify/`:

| File | Exit |
|---|---|
| typecheck.txt | exit 0 |
| at-check-req-001.txt | exit 0 |
| at-selftest.txt | exit 0 |
| loop-req-001.txt | exit 0 |
| loop-req-016.txt | exit 0 |
| integration-req-001.txt | exit 0 |
| drive-ngo-signup.txt | exit 0 |

`typecheck.txt`: all three projects clean.
`at-check-req-001.txt`: 37 P0 ids in bijection.
`at-selftest.txt`: 15 test files passed, 219 tests passed.
`loop-req-001.txt`: 37 P0, 25 green, 12 red — matches the expected manifest.
`loop-req-016.txt`: 12 P0, 11 green, 1 red — matches the expected manifest.
`integration-req-001.txt`: 37 P0, 20 green, 17 red — matches the expected manifest.
`drive-ngo-signup.txt`: 13/13 checks passed.

All exits are 0. The evidence commit `AI4DEV-55: verification evidence on the final head`
(`89d7cc6`) was pushed to
`nirdrang/ai4dev-55-tenant-isolation-and-visibility-d5`.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01CyWqRtpwGMDWSxGLfSLL5P

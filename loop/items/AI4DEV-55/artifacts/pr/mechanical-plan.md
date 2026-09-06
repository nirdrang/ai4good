# Mechanical plan: ordered rebase, then evidence capture

Two jobs for the `mechanical` agent, run in this order after the fix lane has landed on the item branch. Exact commands; the lead decided, the mechanical types and reports. Placeholders in angle brackets are filled by the lead before hand-off.

## Job 1: rebase the item branch into ordered commits

The item branch `nirdrang/ai4dev-55-tenant-isolation-and-visibility-d5` carries about sixty small commits: machinery, station artifacts, two unit code commits, two unit reports, the fix commits, the decision trail. The final tree is right; the history is not. The target history, oldest first, on top of `origin/main`:

1. `AI4DEV-55: machinery, a grok wrapper for a kernel without Landlock` — `loop/work/grok-shim/`.
2. `AI4DEV-55: unit 1, cross-organisation denial with no existence oracle` — the unit 1 code commit as it is (`871d974`).
3. `AI4DEV-55: unit 2, assigned-volunteer scope, admin reach, visitor API` — the unit 2 code commit as it is (`a23683c`).
4. `AI4DEV-55: review fixes, the catalog guard made symmetric and the harness tightened` — the fix-lane code commit and the deslop commit squashed into one (`73335e3` and `68776ce`).
5. `AI4DEV-55: the item record, station artifacts, reports and the decision trail` — everything under `loop/items/AI4DEV-55/` as it stands at the current head.

Commands, from `/home/user/ai4good`, with `<head>` the current item head, `2536087`:

```
git fetch origin main
git checkout -B ai4dev-55-ordered origin/main
git checkout 2536087 -- loop/work/grok-shim && git commit -q -m "AI4DEV-55: machinery, a grok wrapper for a kernel without Landlock" -m "The Claude cloud VM kernel boots without Landlock, and grok 1.0.13 refuses its read-only and workspace profiles there. The wrapper, first on PATH for runner invocations, maps both to devbox and skips the prompts no headless lane can answer, only when the probe says the kernel lacks Landlock."
git cherry-pick 871d974
git cherry-pick a23683c
git cherry-pick --no-commit 73335e3 68776ce && git commit -q -m "AI4DEV-55: review fixes, the catalog guard made symmetric and the harness tightened" -m "Fourteen items from a four-model review: the static scan models every weakening statement and exact privilege sets, the live check pins every role and reads force-RLS, the service role's default privileges go, the leak assertion reads bytes, the type conjunct has a regression test, the two seat sentences no longer overlap, unmappable rows fail loudly, duplicated helpers collapse, the viewer block leaves the live adapter, the bodies stop reaching around the contract, the wrapper is gated on the probe, and the stale posture comments are corrected. Then a deslop pass removed duplicated helpers, dead guards and narrating comments."
git checkout 2536087 -- loop/items/AI4DEV-55 && git commit -q -m "AI4DEV-55: the item record, station artifacts, reports and the decision trail"
git diff --stat 2536087 ai4dev-55-ordered
```

The last command must print nothing: the ordered branch and the old head are the same tree. If it prints anything, stop and report; do not force-push. If a cherry-pick conflicts, stop and report the conflicting files; do not resolve.

Then, only when the diff is empty:

```
git branch -f nirdrang/ai4dev-55-tenant-isolation-and-visibility-d5 ai4dev-55-ordered
git checkout nirdrang/ai4dev-55-tenant-isolation-and-visibility-d5
git push --force-with-lease=nirdrang/ai4dev-55-tenant-isolation-and-visibility-d5:2536087 -u origin nirdrang/ai4dev-55-tenant-isolation-and-visibility-d5
git log --oneline origin/main..HEAD
```

Report the five commit hashes.

## Job 2: evidence on the final head

From `/home/user/ai4good`, on the rebased head, with `E=loop/items/AI4DEV-55/artifacts/verify`:

```
mkdir -p $E
git rev-parse HEAD > $E/head.txt
bun run db:stop && bun run db:start
docker inspect supabase_edge_runtime_poancmeitlmxejofwzuu --format '{{json .Mounts}}' > $E/edge-runtime-mounts.json
{ date -u +%Y-%m-%dT%H:%M:%SZ; bun run typecheck; echo "exit $?"; } > $E/typecheck.txt 2>&1
{ date -u +%Y-%m-%dT%H:%M:%SZ; bun run at:check req-001; echo "exit $?"; } > $E/at-check-req-001.txt 2>&1
{ date -u +%Y-%m-%dT%H:%M:%SZ; bun run at:selftest; echo "exit $?"; } > $E/at-selftest.txt 2>&1
{ date -u +%Y-%m-%dT%H:%M:%SZ; bun run at:verify req-001 --tier loop --expect; echo "exit $?"; } > $E/loop-req-001.txt 2>&1
{ date -u +%Y-%m-%dT%H:%M:%SZ; bun run at:verify req-016 --tier loop --expect; echo "exit $?"; } > $E/loop-req-016.txt 2>&1
{ date -u +%Y-%m-%dT%H:%M:%SZ; bun run at:verify req-001 --tier integration --expect; echo "exit $?"; date -u +%Y-%m-%dT%H:%M:%SZ; } > $E/integration-req-001.txt 2>&1
{ date -u +%Y-%m-%dT%H:%M:%SZ; bun .claude/skills/verify-ai4good/scripts/drive-ngo-signup.ts $E/drive; echo "exit $?"; } > $E/drive-ngo-signup.txt 2>&1
grep -h -E '^exit ' $E/*.txt
```

The edge-runtime mount must name `/home/user/ai4good/supabase/functions`; if it names a worktree, the `db:stop`/`db:start` did not take and the run is invalid. Every `exit` line must be `exit 0`. Then:

```
git add loop/items/AI4DEV-55/artifacts/verify
git commit -q -m "AI4DEV-55: verification evidence on the final head"
git push -u origin nirdrang/ai4dev-55-tenant-isolation-and-visibility-d5
```

Report every exit code, the head hash, and the mount source. Change no other file. If any exit is non-zero, stop, commit nothing, and report the file with the red.

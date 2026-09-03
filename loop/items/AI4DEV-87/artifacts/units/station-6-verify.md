# Station 6 brief: verify on the final head (mechanical: exact commands, no judgment)

Worktree: C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-87. Use PowerShell. Do not change any file except the report and the evidence directory named below. Record `$LASTEXITCODE` after every native command. Redact any JWT-shaped string (three base64 segments joined by dots) and any `sb_publishable_` or `sb_secret_` key before pasting output.

1. `git rev-parse --short HEAD` and `git status --short`. The tree must be clean apart from `loop/items/AI4DEV-87/artifacts/` (untracked). If any other path shows, stop and report.
2. `bun run typecheck`
3. `bun run at:check req-001` then `bun run at:check req-016`
4. `bun run at:selftest` (record files and tests, passed and failed)
5. `bun run at:verify req-001 --tier loop --expect`
6. `bun run at:verify req-016 --tier loop --expect`
7. `bun run at:verify req-001 --tier integration --expect` (up to six minutes; record the exit code, the two identity lines, the migration line, and the evidence line that starts with `at:verify — stack`)
8. `bun .claude/skills/verify-ai4good/scripts/drive-ngo-signup.ts loop/items/AI4DEV-87/artifacts/verify/drive` (record the eleven check lines and the final `N/11 checks passed` line and the exit code)
9. `docker inspect supabase_edge_runtime_poancmeitlmxejofwzuu --format "{{json .Mounts}}"` and record only the Source path that ends in `supabase\functions` (it must be this worktree's).
10. `git rev-parse --short HEAD` again; it must equal step 1.

Write the report to `loop/items/AI4DEV-87/artifacts/verify/station-6.md`: one section per step with the exact command, the exit code, the UTC timestamp when it finished (`(Get-Date).ToUniversalTime().ToString('o')`), and the last 20 lines of output (or all of it when shorter). Reply with exactly five lines: the head SHA; typecheck and both at:check (green or red); selftest counts; the three at:verify results and the drive result with exit codes; the report path.

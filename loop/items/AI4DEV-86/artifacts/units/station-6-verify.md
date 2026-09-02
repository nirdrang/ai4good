# Station 6 brief: verify on the real surface (mechanical: exact commands, no judgment)

Worktree: C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-86. PowerShell only. Run from the worktree root. Do not edit any tracked file. Evidence directory: loop/items/AI4DEV-86/artifacts/verify/ (create it). Every command below: paste the full command, its last 25 lines of output, its exit code, and a UTC timestamp, into loop/items/AI4DEV-86/artifacts/verify/transcript.md as you go.

1. Head: `git rev-parse HEAD` and `git status --short` (must be empty).
2. Doctor (read-only): `Invoke-RestMethod http://127.0.0.1:44321/auth/v1/health`; `bunx supabase status -o json` (paste ONLY the API_URL, DB_URL, MAILPIT_URL values and the "Stopped services" line; never paste keys); `docker ps --format '{{.Names}}' | Select-String poancmeitlmxejofwzuu`.
3. Restart once so Auth reads the pinned lifetime: `bun run db:stop` then `bun run db:start`. Then repeat the health check.
4. The acceptance integration tier on the final head: `bun run at:verify req-001 --tier integration --expect`. Expect the identity line, the migration line, the evidence line (project, api port, reset, migrations, lock, head, tree state), and `EXPECTED: the run matches ... (16 declared green, 21 declared red)`, exit 0. Takes about five minutes. Paste the evidence line verbatim.
5. The live drive: `bun .claude/skills/verify-ai4good/scripts/drive-ngo-signup.ts loop/items/AI4DEV-86/artifacts/verify/drive` . Expect exit 0 and every check PASS. Then confirm the redaction: `Select-String -Path loop/items/AI4DEV-86/artifacts/verify/drive/transcript.json -Pattern 'eyJ[A-Za-z0-9_-]{20,}|sb_secret|sb_publishable' ` must return nothing; paste the (empty) result.
6. The loop tier and the rest, on the same head: `bun run typecheck`; `bun run at:selftest` (paste the "Test Files" and "Tests" lines); `bun run at:verify req-001 --tier loop --expect`; `bun run at:verify req-016 --tier loop --expect`.
7. Cleanup: the stack was up before you began; leave it up. Delete nothing.

Report: the transcript path and the seven exit codes in one line. If any step fails, stop at that step and report the output; do not retry with different arguments.
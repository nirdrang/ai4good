# Station 6c brief: final verify on the final head (mechanical: exact commands)

Worktree: C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-86. PowerShell only. Do not edit tracked files; write only under loop/items/AI4DEV-86/artifacts/verify3/ (create it). Paste each command, its last 25 lines, exit code, and a UTC timestamp into loop/items/AI4DEV-86/artifacts/verify3/transcript.md. Do NOT restart the stack. Never paste keys.
1. `git rev-parse HEAD`; `git status --short` (only the untracked loop/items/AI4DEV-86/artifacts/ line is expected).
2. `Invoke-RestMethod http://127.0.0.1:44321/auth/v1/health`.
3. `bun run at:verify req-001 --tier integration --expect` (about five minutes). Paste the identity line, the migration line, the evidence line, and the EXPECTED line verbatim.
4. `bun run typecheck`; `bun run at:selftest` (paste the Test Files and Tests lines); `bun run at:verify req-001 --tier loop --expect`; `bun run at:verify req-016 --tier loop --expect`.
Report: the transcript path and the exit codes in one line. Stop at the first failing step and report its output.
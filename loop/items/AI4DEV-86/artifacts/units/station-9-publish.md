# Station 9 brief: publish (mechanical: exact commands)

Worktree: C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-86. PowerShell only. The tree must be clean (`git status --short` empty) before you start; if it is not, stop and report.
1. `git log --oneline origin/main..HEAD` (paste it).
2. `git push -u origin HEAD` (paste the last 5 lines).
3. Create the pull request, never a draft, with the title and body files the lead placed at loop/items/AI4DEV-86/artifacts/pr/title.txt and loop/items/AI4DEV-86/artifacts/pr/body.md, exactly as handed:
   `gh pr create --base main --head (git rev-parse --abbrev-ref HEAD) --title (Get-Content loop/items/AI4DEV-86/artifacts/pr/title.txt -Raw).Trim() --body-file loop/items/AI4DEV-86/artifacts/pr/body.md`
   Paste the URL it prints.
4. `gh pr view --json number,url,headRefOid,state` (paste it).
5. Wait for CI: `gh pr checks --watch --interval 30` (up to 20 minutes). Paste the final check table. Then `gh run list --branch (git rev-parse --abbrev-ref HEAD) --limit 1 --json databaseId,url,conclusion,headSha` (paste it).
Report: the PR number and URL, the head sha the PR reports, the CI conclusion and run URL. Do not merge. Do not edit the body. If CI is red, paste the failing step's last 30 lines from `gh run view <id> --log-failed` and stop.
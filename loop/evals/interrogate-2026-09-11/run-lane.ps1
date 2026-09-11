$runner = 'C:\Users\nirdr\Downloads\ai4good\plugins\pstack\skills\poteto-mode\scripts\runner\pstack-runner'
$cwd = 'C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\eval-interrogate-base'
$e = 'C:\Users\nirdr\Downloads\ai4good\loop\evals\interrogate-2026-09-11'
$v = $args[0]
Write-Output ("=== ds41 $v starting {0} ===" -f (Get-Date -Format 'HH:mm:ss'))
& bun $runner --parent claude --provider opencode --model 'opencode-go/deepseek-v4.1-flash' --effort $v --mode read-only --prompt "$e\reviewer-prompt-ds41-$v.md" --cwd $cwd --output "$e\out\review-ds41-$v.md" --receipt "$e\out\review-ds41-$v.receipt.json" --timeout 1800
Write-Output ("=== ds41 $v exit {0} at {1} ===" -f $LASTEXITCODE, (Get-Date -Format 'HH:mm:ss'))
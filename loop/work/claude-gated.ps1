# Starts Claude Code in this project with the unit-gate self-compaction plugin. Nothing global changes.
$env:CLAUDE_CODE_ENABLE_FUNCTION_HOOKS = '1'
claude --plugin-dir (Join-Path $PSScriptRoot 'self-compact-gate') @args

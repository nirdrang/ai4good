param([string]$ImgDir, [string]$Previous, [string]$Out, [string]$Prompt = "prompt-round.txt")
$s = Split-Path -Parent $MyInvocation.MyCommand.Path
$env:OPENCODE_CONFIG_CONTENT = '{"agent":{"ngo-critic":{"mode":"primary","permission":{"edit":"deny","bash":"deny","webfetch":"deny"}}}}'
$prompt = (Get-Content "$s\$Prompt" -Raw -Encoding UTF8) + (Get-Content $Previous -Raw -Encoding UTF8)
$files = Get-ChildItem "$ImgDir\*.png" | Sort-Object Name | ForEach-Object { "-f"; $_.FullName }
$prompt | opencode run --dir $s --agent ngo-critic --pure -m opencode-go/deepseek-v4.1-flash --variant max --format json @files > "$Out.jsonl" 2> "$Out.err.txt"
"exit $LASTEXITCODE"
if (Select-String -Path "$Out.err.txt" -Pattern "Falling back" -Quiet) { "WARNING: agent fell back to default" }
$ev = Get-Content "$Out.jsonl" -Encoding UTF8 | Where-Object { $_ } | ForEach-Object { $_ | ConvertFrom-Json }
$sid = ($ev | Select-Object -First 1).sessionID
($ev | Where-Object { $_.type -eq 'text' } | ForEach-Object { $_.part.text }) -join "`n" | Out-File "$Out.md" -Encoding utf8
$ev | Where-Object { $_.type -eq 'step_finish' } | ForEach-Object { "cost {0}" -f $_.part.cost }
$x = opencode export $sid 2>$null | Out-String; $j = $x.Substring($x.IndexOf('{')) | ConvertFrom-Json; "model: " + ($j.info.model | ConvertTo-Json -Compress)
Get-Content "$Out.md" -Raw -Encoding UTF8


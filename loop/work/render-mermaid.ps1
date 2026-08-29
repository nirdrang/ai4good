# render-mermaid.ps1 - render the first mermaid block of a markdown file to an SVG beside it.
#
# Uses mermaid.ink, the public renderer behind mermaid.live. The block is wrapped in the
# mermaid.live state JSON, zlib-compressed, base64url-encoded, and fetched as an SVG. A syntax
# error in the chart comes back as HTTP 400, so this doubles as the chart's syntax check.
#
# Usage: render-mermaid.ps1 -Markdown <path.md> [-Out <path.svg>]
# Default output: the markdown path with .svg in place of .md.

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)] [string]$Markdown,
    [string]$Out = ''
)

$ErrorActionPreference = 'Stop'

if (-not $Out) { $Out = [IO.Path]::ChangeExtension($Markdown, '.svg') }

$text = Get-Content -LiteralPath $Markdown -Raw
$m = [regex]::Match($text, '(?s)```mermaid\r?\n(.*?)```')
if (-not $m.Success) { throw "no mermaid block in $Markdown" }
$code = $m.Groups[1].Value

$state = @{ code = $code; mermaid = '{"theme":"default"}' } | ConvertTo-Json -Compress
$bytes = [System.Text.Encoding]::UTF8.GetBytes($state)

# zlib = 2-byte header + raw deflate + big-endian adler32. .NET Framework has only raw deflate.
$ms = New-Object IO.MemoryStream
$ds = New-Object IO.Compression.DeflateStream($ms, [IO.Compression.CompressionMode]::Compress, $true)
$ds.Write($bytes, 0, $bytes.Length)
$ds.Close()
$raw = $ms.ToArray()
[int64]$a = 1; [int64]$b = 0
foreach ($x in $bytes) { $a = ($a + $x) % 65521; $b = ($b + $a) % 65521 }
$trail = [BitConverter]::GetBytes([uint32](($b * 65536) + $a))
[array]::Reverse($trail)
$z = [byte[]](0x78, 0x9C) + $raw + $trail
$enc = [Convert]::ToBase64String($z).Replace('+', '-').Replace('/', '_').TrimEnd('=')

$url = 'https://mermaid.ink/svg/pako:' + $enc
$r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 120
[IO.File]::WriteAllText($Out, $r.Content, (New-Object System.Text.UTF8Encoding($false)))
$nodes = ([regex]::Matches($r.Content, 'class="node')).Count
Write-Output ("rendered {0} nodes -> {1}" -f $nodes, $Out)
# The same chart, hosted: paste this into the doc as the browser link. It encodes the chart
# text itself, so it changes with every chart edit.
Write-Output ("browser url: " + $url)

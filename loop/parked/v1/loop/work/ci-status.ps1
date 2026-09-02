# The whole evidence set for one head, in one command — so that checking is cheaper than guessing.
#
#   pwsh loop/work/ci-status.ps1                 # HEAD of the current branch
#   pwsh loop/work/ci-status.ps1 -Sha 6600824
#
# It answers the four questions that separate a defect from an outage, and it prints them as
# OBSERVATIONS rather than a verdict. Deciding what they mean belongs to whoever is ruling.
#
# Why it exists: on 2026-08-06 a declared six-hour GitHub Actions outage was read as a capacity
# problem, because the three lookups below were done separately, inconsistently, and — the decisive
# one — not at all.
[CmdletBinding()]
param(
  [string]$Sha,
  [string]$Repo = 'nirdrang/ai4good'
)

$ErrorActionPreference = 'Stop'
if (-not $Sha) { $Sha = (git rev-parse HEAD).Trim() }
$short = $Sha.Substring(0, [Math]::Min(7, $Sha.Length))

Write-Host "head           $short"

# --- 1. DOES A RUN EVEN EXIST? -----------------------------------------------------------------
# The question people forget, because a missing run looks exactly like a slow one. A check cannot
# reach a terminal state if GitHub never created a run for it, and a watch on that check waits
# forever looking merely pending.
$runs = (gh api "repos/$Repo/actions/runs?per_page=100" | ConvertFrom-Json).workflow_runs
$mine = $runs | Where-Object { $_.head_sha -like "$short*" }

if (-not $mine) {
  Write-Host "run            NONE EXISTS for this head" -ForegroundColor Yellow

  # A MISSING RUN HAS TWO CAUSES THAT LOOK IDENTICAL, and they need opposite remedies.
  # A CONFLICTING pull request gets NO run at all: the workflow fires on `pull_request`, and
  # GitHub cannot build a merge commit it cannot compute, so every push to a dirty branch is
  # silently runless. Measured 2026-08-12: seven consecutive pushes had zero runs, and the moment
  # the conflict was resolved GitHub created a run for EVERY one of them with no fresh event.
  # An empty commit - the remedy for the other cause - produces nothing here and wastes a push.
  # So ask the pull request whether it is mergeable BEFORE naming a dropped webhook.
  $pr = $null
  try {
    $pr = gh pr view --repo $Repo --json number,mergeable,mergeStateStatus 2>$null | ConvertFrom-Json
  } catch { $pr = $null }

  if ($pr -and $pr.mergeable -eq 'CONFLICTING') {
    Write-Host ("               pull request #" + $pr.number + " is CONFLICTING (mergeStateStatus=" + $pr.mergeStateStatus + ")") -ForegroundColor Yellow
    Write-Host "               THAT is why no run exists - not a dropped webhook. Merge main in and"
    Write-Host "               resolve; the runs appear by themselves, and an empty commit does nothing."
  } elseif ($pr) {
    Write-Host ("               pull request #" + $pr.number + " is mergeable=" + $pr.mergeable + " (mergeStateStatus=" + $pr.mergeStateStatus + ")")
    Write-Host "               so a conflict is NOT the cause - a dropped webhook never replays, and"
    Write-Host "               resuming needs a FRESH event (git commit --allow-empty, or reopen the PR)"
  } else {
    Write-Host "               no pull request could be read for this branch, so the two causes cannot"
    Write-Host "               be told apart here. Check the pull request's mergeable state first; only"
    Write-Host "               if it is clean does a dropped webhook explain this, and only then does a"
    Write-Host "               fresh event (git commit --allow-empty, or reopen the PR) help."
  }
} else {
  foreach ($r in $mine) {
    Write-Host ("run            " + $r.id + "  event=" + $r.event + "  status=" + $r.status + "  conclusion=" + $r.conclusion)

    # --- 2 and 3. WAS A RUNNER ASSIGNED, AND DID ANY STEP RUN? ---------------------------------
    # This pair is the real classifier. `cancelled` with no runner and zero steps is
    # infrastructure, however much the word reads like somebody stopping it deliberately.
    $jobs = (gh api "repos/$Repo/actions/runs/$($r.id)/jobs" | ConvertFrom-Json).jobs
    foreach ($j in $jobs) {
      $runner = if ([string]::IsNullOrWhiteSpace($j.runner_name)) { 'NONE ASSIGNED' } else { $j.runner_name }
      $span = if ($j.started_at -and $j.completed_at) {
        [string][math]::Round(([datetime]$j.completed_at - [datetime]$j.started_at).TotalSeconds, 0) + 's'
      } else { 'in flight' }
      Write-Host ("  job          " + $j.name + "  conclusion=" + $j.conclusion)
      Write-Host ("  runner       " + $runner)
      Write-Host ("  steps ran    " + $j.steps.Count + "   elapsed " + $span)
      if ($j.conclusion -and $j.conclusion -ne 'success' -and $j.steps.Count -eq 0 -and $runner -eq 'NONE ASSIGNED') {
        Write-Host "  reading      no runner, no steps - this did not fail, it never ran" -ForegroundColor Yellow
      }
    }
  }
}

# --- 4. WHAT DOES THE PLATFORM SAY ABOUT ITSELF? -----------------------------------------------
# Authoritative, free, and observation rather than inference. The one that was skipped.
Write-Host ""
try {
  $s = Invoke-RestMethod -Uri 'https://www.githubstatus.com/api/v2/summary.json' -TimeoutSec 20
  $actions = $s.components | Where-Object { $_.name -eq 'Actions' }
  Write-Host ("github         Actions: " + $actions.status + "   overall: " + $s.status.description)
  $open = $s.incidents | Where-Object { $_.status -ne 'resolved' }
  if ($open) {
    foreach ($i in $open) {
      Write-Host ("  INCIDENT     " + $i.name + "  [" + $i.status + ", impact " + $i.impact + "]") -ForegroundColor Yellow
      Write-Host ("               opened " + $i.created_at + ", updated " + $i.updated_at)
      if ($i.incident_updates) { Write-Host ("               " + ($i.incident_updates[0].body -replace "\s+", ' ')) }
    }
  } else {
    Write-Host "  incidents    none open"
  }
} catch {
  # A status page that cannot be reached is itself a fact, and it must not read as "all clear".
  Write-Host "github         STATUS PAGE UNREACHABLE - treat platform health as UNKNOWN, never as fine" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "These are observations. Whether they excuse a red check is a ruling, not an output."

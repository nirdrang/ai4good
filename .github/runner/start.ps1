# Build the runner image if needed, mint a registration token, and start the runner.
# Idempotent: safe to run again. Re-running while the runner is already up does nothing harmful.
#
#   pwsh .github/runner/start.ps1
#   pwsh .github/runner/start.ps1 -Rebuild        # force an image rebuild
#
# This script exists so the setup is reproducible from the repository rather than from steps
# somebody performed once and remembers differently later.
[CmdletBinding()]
param(
  [string]$Repo      = 'nirdrang/ai4good',
  [string]$Image     = 'ai4good-runner:latest',
  [string]$Container = 'ai4good-runner',
  [string]$Volume    = 'ai4good-runner-state',
  [string]$Label     = 'ai4good-linux',
  [switch]$Rebuild
)

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path

function Fail($msg) { Write-Error $msg; exit 1 }

# --- the engine has to be up; Docker Desktop's WSL backend is often simply not started ---------
try { docker info --format '{{.OSType}}' | Out-Null } catch {
  Fail "The Docker engine is not reachable. Start Docker Desktop and wait for it to report running, then re-run this."
}
if ((docker info --format '{{.OSType}}') -ne 'linux') {
  Fail "Docker is not in Linux-container mode. The whole point of this runner is to judge the code on Linux."
}

# --- image -------------------------------------------------------------------------------------
$haveImage = (docker images -q $Image)
if ($Rebuild -or -not $haveImage) {
  Write-Host "building $Image"
  docker build -t $Image $here
  if ($LASTEXITCODE -ne 0) { Fail "The image build failed; nothing was registered." }
} else {
  Write-Host "image $Image already present (pass -Rebuild to force)"
}

# --- already running? --------------------------------------------------------------------------
$state = (docker inspect -f '{{.State.Status}}' $Container 2>$null)
if ($LASTEXITCODE -eq 0 -and $state -eq 'running') {
  Write-Host "container $Container is already running - nothing to do"
  exit 0
}
if ($LASTEXITCODE -eq 0) {
  Write-Host "container $Container exists in state '$state' - starting it"
  docker start $Container | Out-Null
  exit 0
}

# --- first run: mint a short-lived registration token -----------------------------------------
# The token is read straight into the container's environment and never written to a file or
# echoed. It is valid for about an hour and is only needed once, because the runner's
# registration is kept in the named volume.
Write-Host "minting a registration token for $Repo"
$tokenJson = gh api -X POST "repos/$Repo/actions/runners/registration-token" 2>$null
if ($LASTEXITCODE -ne 0) { Fail "Could not mint a registration token. Is 'gh auth status' healthy, with admin rights on $Repo?" }
$token = ($tokenJson | ConvertFrom-Json).token
if (-not $token) { Fail "The registration-token response contained no token." }

Write-Host "starting $Container with label '$Label'"
docker run -d `
  --name $Container `
  --restart unless-stopped `
  -v "${Volume}:/actions-runner" `
  -e "RUNNER_REPO_URL=https://github.com/$Repo" `
  -e "RUNNER_TOKEN=$token" `
  -e "RUNNER_NAME=$Container" `
  -e "RUNNER_LABELS=$Label" `
  $Image | Out-Null
if ($LASTEXITCODE -ne 0) { Fail "docker run failed; the runner is not registered." }

# --- confirm it actually arrived, rather than assuming ----------------------------------------
Write-Host "waiting for the runner to appear as online..."
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 2
  $runners = (gh api "repos/$Repo/actions/runners" | ConvertFrom-Json).runners
  $mine = $runners | Where-Object { $_.name -eq $Container }
  if ($mine -and $mine.status -eq 'online') {
    Write-Host "runner '$Container' is online with labels: $(($mine.labels | ForEach-Object { $_.name }) -join ', ')"
    Write-Host ""
    Write-Host "To route the check here:   gh variable set CI_RUNNER_LABEL --body '$Label' --repo $Repo"
    Write-Host "To fall back to hosted:    gh variable delete CI_RUNNER_LABEL --repo $Repo"
    exit 0
  }
}
Write-Warning "The container started but no online runner appeared within 60s. Check: docker logs $Container"
exit 1

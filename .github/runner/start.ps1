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

# --- THE SAFETY PRECONDITION, CHECKED RATHER THAN REMEMBERED -----------------------------------
# On a PUBLIC repository, anyone can fork it and open a pull request, and GitHub runs the workflow
# as that pull request defines it. Without an approval gate, a stranger's code would execute on
# this machine. So the runner refuses to exist unless every external contributor needs explicit
# approval first.
#
# This is a precondition and not a note in a README on purpose: a setting nobody re-verifies is
# exactly the kind of guarantee that decays silently. If someone loosens the policy later, the
# runner stops coming up instead of quietly becoming the weakest thing in the system.
$repoInfo = gh api "repos/$Repo" | ConvertFrom-Json
if (-not $repoInfo.private) {
  Write-Host "repository is PUBLIC - checking the fork-PR approval policy before going further"
  try {
    $policy = (gh api "repos/$Repo/actions/permissions/fork-pr-contributor-approval" | ConvertFrom-Json).approval_policy
  } catch {
    Fail "Could not read the fork-PR approval policy for $Repo, so it cannot be shown to be safe. Refusing to register a runner."
  }
  if ($policy -ne 'all_external_contributors') {
    Fail @"
REFUSING TO START. $Repo is public and its fork-PR approval policy is '$policy'.
A fork's pull request could then run on this machine without anyone approving it.

Fix it, then re-run:
  gh api -X PUT repos/$Repo/actions/permissions/fork-pr-contributor-approval `
    --input (a file containing {"approval_policy":"all_external_contributors"})

Or make the repository private, where fork pull requests do not exist at all - note that on a
free personal plan private also removes branch protection, which removes the merge gate.
"@
  }
  Write-Host "  approval policy is '$policy' - no external code runs here without an explicit approval"
} else {
  Write-Host "repository is private - fork pull requests do not exist, so no approval gate is needed"
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
# `docker ps --filter` rather than `docker inspect`, for two reasons learned the hard way:
# `docker inspect` searches IMAGES as well as containers, and the image and container here share
# a name on purpose - so it returns the image and then fails looking for container fields. And
# inspecting something that does not exist writes to stderr, which in PowerShell 5.1 becomes a
# terminating error even when redirected to $null. A filter matches nothing quietly and exits 0.
$state = docker ps -a --filter "name=^$Container$" --format '{{.State}}'
if ($state -eq 'running') {
  Write-Host "container $Container is already running - nothing to do"
  exit 0
}
if ($state) {
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

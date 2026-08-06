# guard-branch-switch.ps1 - refuse a branch change in the MAIN worktree.
#
# WHY THIS EXISTS. A branch belongs to a DIRECTORY, not to a session. Several sessions are
# routinely open in the main folder at once; when any one of them switches branch, every other
# session in that folder is silently moved too, mid-turn, with no notification. On 2026-08-06 two
# sessions shared the main tree - one building a CI runner, one answering questions - and the
# branch was moved under each of them repeatedly. A `git switch main` was refused by git only
# because it happened to notice uncommitted files it would overwrite. That near miss is this file.
#
# The rule already existed in the work skill ("Never check out an item branch, or follow an agent
# into its worktree") and in CLAUDE.md ("a session works where it was launched, on one branch, for
# the whole item"). Both were broken the same day by two different actors, neither careless:
# switching is simply the obvious move when you are in the wrong branch. A rule you must remember
# mid-task is broken during exactly the tasks that matter, so this makes the move impossible
# rather than discouraged.
#
# WHAT IT PROTECTS - the MAIN worktree only, derived rather than hardcoded: git resolves
# --git-dir and --git-common-dir to the same path in the main worktree, and to different paths in
# every linked one. So item worktrees, agent worktrees and the design tree are all untouched, and
# a machine with the repo cloned somewhere else is protected too without configuration.
#
# THE ESCAPE HATCH IS DELIBERATE AND IS NOT A FLAG. Hooks only see tool calls, so a founder
# typing the same command in their own terminal is unaffected. A guard that can be turned off by
# the thing it guards is decoration.
#
# Contract: PreToolUse. Exit 0 allows; exit 2 blocks and sends stderr back to the agent.
# Never throws - a guard that crashes must fail OPEN, because breaking every shell command in
# every session is far worse than the collision it prevents.

$ErrorActionPreference = 'SilentlyContinue'

try {
    $raw = [Console]::In.ReadToEnd()
    if (-not $raw) { exit 0 }
    $j = $null
    try { $j = ConvertFrom-Json $raw } catch { exit 0 }

    $cmd = [string]$j.tool_input.command
    if (-not $cmd) { exit 0 }

    # Cheap reject first: the overwhelming majority of commands are not git at all.
    if ($cmd -notmatch '(?i)\bgit\b') { exit 0 }
    if ($cmd -notmatch '(?i)\bgit\b[^;|&]*\b(switch|checkout)\b') { exit 0 }

    # `git checkout -- <path>` and `git checkout <commit> -- <path>` restore FILES; they do not
    # move the branch. Allowing them matters: refusing a file restore would push people toward
    # deleting and rewriting files by hand, which is worse than what is being prevented.
    if ($cmd -match '(?i)\bgit\b[^;|&]*\b(switch|checkout)\b[^;|&]*\s--\s') { exit 0 }

    # `git worktree add` checks a branch out, but into a NEW directory - that is the remedy this
    # guard recommends, so it must never be blocked by it.
    if ($cmd -match '(?i)\bgit\b[^;|&]*\bworktree\b') { exit 0 }

    # Which directory would the command act on? `-C <path>` retargets git; otherwise the session's
    # own working directory. Reading the flag matters - a command run from elsewhere with
    # `-C <main tree>` moves the main tree just as effectively.
    $dir = [string]$j.cwd
    $m = [regex]::Match($cmd, '(?i)\bgit\s+(?:-c\s+\S+\s+)*-C\s+"?([^"\s]+)"?')
    if ($m.Success) { $dir = $m.Groups[1].Value }
    if (-not $dir) { exit 0 }
    if (-not (Test-Path $dir)) { exit 0 }

    $gitDir    = (& git -C $dir rev-parse --absolute-git-dir 2>$null)
    $commonDir = (& git -C $dir rev-parse --path-format=absolute --git-common-dir 2>$null)
    if (-not $gitDir -or -not $commonDir) { exit 0 }   # not a repo, or git unavailable: allow

    $gitDir    = $gitDir.Trim().Replace('\','/').TrimEnd('/')
    $commonDir = $commonDir.Trim().Replace('\','/').TrimEnd('/')

    # Linked worktree - its own directory, its own branch, nobody else's problem.
    if ($gitDir -ne $commonDir) { exit 0 }

    $branch = (& git -C $dir rev-parse --abbrev-ref HEAD 2>$null)
    if ($branch) { $branch = $branch.Trim() }

    $msg = @"
BLOCKED: this is the MAIN worktree, and a branch belongs to the directory, not to your session.

  directory : $dir
  branch    : $branch
  command   : $cmd

Other sessions are working in this same folder. Switching here moves them too, mid-turn, with no
warning - and if any of them has uncommitted work, that is where it is lost.

Do this instead:
  git worktree add <path> <branch>     # a new directory, its own branch, nobody disturbed
  git branch <name> origin/main        # create a branch WITHOUT checking it out

An item is worked in its own worktree by its own session. The coordinator stays on main.
"@
    [Console]::Error.Write($msg)
    exit 2
} catch {
    exit 0   # fail OPEN, always
}

#!/usr/bin/env bash
# ai4good - cloud environment SETUP SCRIPT
#
# THIS FILE IS A TEMPLATE THAT IS COPIED, NEVER A SCRIPT THIS REPOSITORY RUNS. Paste its
# contents into: claude.ai/code -> environment settings -> Setup script. It is tracked so
# the shape is reviewable and has one history, rather than living only in a web form.
#
# THE KEY IS A PLACEHOLDER AND MUST STAY ONE. Fill it in the web form after pasting, never
# here. A real key committed to this file is a key published to everyone with repository
# access, which is a far wider audience than the environment's own readers.
# Runs ONCE per environment, before Claude Code launches. Anthropic then snapshots the
# filesystem; every later session starts from that snapshot and SKIPS this script.
#
# ---------------------------------------------------------------------------------------
# TWO CONFIGURATION SURFACES, AND THEY DO NOT OVERLAP.
#
# A setup script runs BEFORE Claude Code launches. The environment's variables are copied
# into the SESSION - "into ordinary environment variables that any command Claude runs can
# read" - and this script is not one of those commands. It cannot see them, and its own
# exports die with it, because the snapshot keeps the filesystem and not the environment.
# So each surface carries exactly what reads it, and nothing else:
#
#   THIS SCRIPT defines, below:  the OpenCode Go key (nothing else needs to be here)
#   THE VARIABLES BOX carries:   nothing today
#
# THE KEY BELONGS HERE ONLY. Do not put it in the variables box: opencode does not read
# any such variable (it recognises only the AWS pair and GITHUB_TOKEN), it reads the
# auth.json this script writes. A copy in the variables box would be exposure that buys
# nothing. The name below is this script's own plumbing, not an opencode convention.
#
# Neither surface is a secrets store - the documentation is explicit that both "live in
# the environment configuration, where anyone who uses the environment can read them".
# Treat the key as disclosed, and rotate it when it matters.
#
# ---------------------------------------------------------------------------------------
#
# WHAT THE SNAPSHOT KEEPS (so later sessions get it free):
#   - the codex, opencode and grok CLIs, and PowerShell
#   - opencode's OpenCode Go credential
#   - the docker ulimit shim at /usr/local/bin/docker
#   - all 12 Supabase images, about 8.4 GB
#
# WHAT IT CANNOT KEEP - a snapshot holds files, never running processes:
#   - the docker daemon. The SessionStart hook starts it every session.
#   - any container. The session starts the one stack with `bun run db:start`; the harness
#     starts nothing and refuses when the stack is absent.
#   - the codex ChatGPT login. That is OAuth, it can rotate, and the snapshot is readable
#     by anyone using this environment. Run `codex login --device-auth` per fresh VM; the
#     SessionStart banner says when it is needed.
#   - the grok.com login, for the same reason. Run `grok login --device-auth` per fresh VM;
#     the banner says when it is needed. Grok tokens expire after 7 days, so a long-lived
#     session logs in again. No API key: the founder wants the grok subscription billed,
#     not per-token API use (2026-09-03).
#   - the pstack plugin. Claude Code installs it inside each session from the marketplace
#     source in the tracked .claude/settings.json. Nothing here installs it.
#   - anything derived from the REPOSITORY - node_modules. Cloud sessions start from a
#     fresh clone, so project setup belongs to the SessionStart hook, which runs inside
#     the session with the tree present. The hook already installs node_modules when they
#     are missing. The one database is started inside a session with `bun run db:start`.

set -euo pipefail

# Not read from the environment - see the note above; a setup script cannot see the
# environment's variables. No database value exists on either surface: the variables box
# carries nothing, and the session starts the one stack itself with `bun run db:start`.
OPENCODE_GO_API_KEY='PASTE_YOUR_OPENCODE_GO_KEY_HERE'

case "$OPENCODE_GO_API_KEY" in
  PASTE_YOUR_*)
    echo "edit the setup script: OPENCODE_GO_API_KEY is still the placeholder" >&2
    exit 1
    ;;
esac

# --- 1. the three agent CLIs -------------------------------------------------------
npm install -g @openai/codex opencode-ai

# The Grok CLI is the pstack grok lane: the feature and refactoring writer, the how explorer,
# the swarm worker, and one panel lane. The pstack runner never falls back, so without this
# binary every grok lane drops out. The installer writes ~/.grok/bin/grok; the symlink puts
# it on the PATH of every session without touching shell profiles. If the installer ever
# moves the binary, the test fails loudly here instead of every grok lane failing later.
curl -fsSL https://x.ai/cli/install.sh | bash
test -x "$HOME/.grok/bin/grok"
ln -sf "$HOME/.grok/bin/grok" /usr/local/bin/grok

# --- 2. PowerShell -----------------------------------------------------------------
# The way-of-work scripts under loop/work are PowerShell, and PowerShell 7 runs them on
# Linux: work-lib.ps1 and guard-branch-switch.ps1 were each measured working in a cloud VM
# (so was the attribution stamp hook, which is parked under loop/parked/v1/ and no longer
# runs anywhere). Without this, a cloud session has no branch guard. Delete this block if
# you decide cloud sessions do not need it.
curl -sS -o /tmp/packages-microsoft-prod.deb \
  https://packages.microsoft.com/config/ubuntu/24.04/packages-microsoft-prod.deb
dpkg -i /tmp/packages-microsoft-prod.deb
apt-get update -qq
apt-get install -y -qq powershell

# --- 3. OpenCode Go credential -----------------------------------------------------
# opencode has no non-interactive login flag - its CLI path is an interactive picker.
# The credential is a small JSON file and the key is stable, so write the file directly.
# This is byte-for-byte the file `opencode auth login` produces; verified against a real
# login in a cloud VM.
mkdir -p ~/.local/share/opencode
cat > ~/.local/share/opencode/auth.json <<JSON
{
  "opencode-go": {
    "type": "api",
    "key": "${OPENCODE_GO_API_KEY}"
  }
}
JSON
chmod 600 ~/.local/share/opencode/auth.json

# --- 4. the docker ulimit shim -----------------------------------------------------
# `supabase start` launches edge-runtime with an explicit --ulimit nofile=65536:65536.
# This VM's nofile hard limit is 20000 and CAP_SYS_RESOURCE is masked, so runc refuses:
# "error setting rlimit type 7: operation not permitted". No daemon setting overrides an
# explicit per-container --ulimit, so the fix sits between the caller and the daemon.
#
# /usr/local/bin resolves ahead of /usr/bin on PATH, so this shim is found first. It
# reads the real hard limit at call time rather than hardcoding one. Being a file, it is
# in the snapshot and works in every later session with no session-time setup.
cat > /usr/local/bin/docker <<'SHIM'
#!/bin/bash
hard=$(ulimit -Hn)
args=()
for a in "$@"; do
  case "$a" in
    nofile=*)
      req_soft="${a#nofile=}"; req_soft="${req_soft%%:*}"
      req_hard="${a##*:}"
      soft=$(( req_soft < hard ? req_soft : hard ))
      hrd=$(( req_hard < hard ? req_hard : hard ))
      a="nofile=${soft}:${hrd}"
      ;;
  esac
  args+=("$a")
done
exec /usr/bin/docker "${args[@]}"
SHIM
chmod +x /usr/local/bin/docker

# --- 5. the docker daemon ----------------------------------------------------------
# setsid, nohup and disown are all required: dockerd does not daemonize itself in this
# image, so a plain background job dies with the shell that started it. That was
# measured - the daemon answered for a few seconds, then went away with its parent.
setsid nohup sudo -n dockerd >/var/log/dockerd-setup.log 2>&1 </dev/null &
disown
until docker info >/dev/null 2>&1; do sleep 1; done

# --- 6. the dependency cache, and the project's EXACT Supabase CLI -----------------
# THE LOCKFILE IS THE SINGLE SOURCE OF TRUTH, AND IT IS FETCHED, NOT COPIED.
#
# An earlier draft hardcoded twelve image tags here. That was a second source of truth
# with nothing to check it, and it was already wrong: `npm install -g supabase` resolves
# the CARET in package.json ("^2.110.0") to whatever is newest - 2.115.0 today - while the
# project runs what bun.lock pins, which is 2.110.0. Measured across those five minor
# versions, NINE of the twelve image tags changed. A version-mismatched cache is not
# slightly stale, it is about five percent useful by size, and it still occupies the
# snapshot.
#
# So take the versions from the lockfile itself. The repository is public and
# raw.githubusercontent.com is on the default Trusted allowlist, so two files are enough -
# no clone, no checkout, no repository in this script's working directory. Nothing here
# names a version, so nothing here can drift: bump the lockfile and the next snapshot
# rebuild follows it.
#
# THIS ALSO WARMS BUN'S GLOBAL CACHE at ~/.bun/install/cache, which is ordinary files and
# therefore lands in the snapshot. Every session's own `bun install` then resolves from
# disk instead of the network, for the whole dependency tree and not only Supabase.
REPO_RAW='https://raw.githubusercontent.com/nirdrang/ai4good/main'
PIN_DIR=/tmp/ai4good-pin
rm -rf "$PIN_DIR"
mkdir -p "$PIN_DIR"
cd "$PIN_DIR"

# -f so a 404 is an ERROR, not an error page written to disk. If this repository ever
# stops being public these fetches fail, and failing loudly here is right: the alternative
# is an environment that silently caches nothing and is discovered weeks later.
curl -fsS -O "$REPO_RAW/package.json"
curl -fsS -O "$REPO_RAW/bun.lock"

bun install --frozen-lockfile

# --- 7. the Supabase images, chosen by that exact CLI ------------------------------
# `supabase init` writes a throwaway default project; the CLI then pulls its own images.
# Which images those are is the CLI's business, not ours - that is the entire point.
#
# `start` is expected to FAIL. A default project's analytics and storage containers do not
# reach a healthy state here, and the CLI rolls its containers back. That is fine: the
# images are pulled before the health stage, and images are all this step wants.
bunx supabase init --force
bunx supabase start || true
bunx supabase stop --no-backup || true

# --- 8. leave the snapshot with images and no containers ---------------------------
# Containers do not survive the snapshot, but their DEFINITIONS do, and every Supabase
# container carries `restart: unless-stopped`. Left in place they turn each session's
# first `docker info` into a stampede: 34 containers across three stacks were measured
# restarting on one daemon start, which looked exactly like a hung daemon.
#
# Images are NOT touched. They are what this script exists to cache.
docker rm -f $(docker ps -aq) 2>/dev/null || true
docker network prune -f >/dev/null 2>&1 || true
docker volume rm $(docker volume ls -q) 2>/dev/null || true
cd /
rm -rf "$PIN_DIR"

echo "setup complete"
echo "  supabase images cached: $(docker images --format '{{.Repository}}' | grep -c supabase)"
echo "  bun package cache:      $(du -sh ~/.bun/install/cache 2>/dev/null | cut -f1)"
echo ""
echo "the database is not started here - inside a session, run once: bun run db:start"

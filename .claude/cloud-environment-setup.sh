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
#   THE VARIABLES BOX carries:   AT_DB_SLOT, AT_DB_POOL_ROOT, AT_DB_POOL_SIZE
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
# WHY THE LAST THREE. The database slot pool exists to stop concurrent sessions on ONE
# machine from resetting each other's database. The machinery is the same everywhere;
# only the TOTAL differs, and it is a property of the machine:
#
#   the founder's Windows machine   AT_DB_POOL_SIZE=2  (also the default when unset)
#   a cloud VM, one session         AT_DB_POOL_SIZE=1
#
# At one slot the pool CANNOT hand out a second - slot 2 is refused, not merely unused -
# and `db-pool.ts setup` below provisions exactly one stack instead of two.
#
# AT_DB_SLOT=1 takes that slot without a reservation. The reservation flow is the
# coordinator's, and it is PowerShell; a cloud session has no coordinator to reserve for
# it, so without this the harness would demand a reservation and print a command that
# means nothing here. AT_DB_SLOT is the ruled override for exactly this case.
#
# AT_DB_POOL_ROOT keeps the slot configuration on a durable path. The default falls back
# to the temporary directory, and a slot with no configuration file refuses to start.
# ---------------------------------------------------------------------------------------
#
# WHAT THE SNAPSHOT KEEPS (so later sessions get it free):
#   - the codex and opencode CLIs, and PowerShell
#   - opencode's OpenCode Go credential
#   - the docker ulimit shim at /usr/local/bin/docker
#   - all 12 Supabase images, about 8.4 GB
#
# WHAT IT CANNOT KEEP - a snapshot holds files, never running processes:
#   - the docker daemon. The SessionStart hook starts it every session.
#   - any container. The hook, or the harness, starts what it needs.
#   - the codex ChatGPT login. That is OAuth, it can rotate, and the snapshot is readable
#     by anyone using this environment. Run `codex login --device-auth` per fresh VM; the
#     SessionStart banner says when it is needed.
#   - anything derived from the REPOSITORY - node_modules, the slot pool. Cloud sessions
#     start from a fresh clone, so project setup belongs to the SessionStart hook, which
#     runs inside the session with the tree present. The hook already installs
#     node_modules when they are missing.

set -euo pipefail

# Not read from the environment - see the note above; a setup script cannot see the
# environment's variables. The database values are not needed here at all any more: they
# are read by the SESSION, which does get them from the variables box.
OPENCODE_GO_API_KEY='PASTE_YOUR_OPENCODE_GO_KEY_HERE'

case "$OPENCODE_GO_API_KEY" in
  PASTE_YOUR_*)
    echo "edit the setup script: OPENCODE_GO_API_KEY is still the placeholder" >&2
    exit 1
    ;;
esac

# --- 1. the two agent CLIs ---------------------------------------------------------
npm install -g @openai/codex opencode-ai

# --- 2. PowerShell -----------------------------------------------------------------
# The way-of-work scripts under loop/work are PowerShell, and PowerShell 7 runs them on
# Linux: work-lib.ps1, guard-branch-switch.ps1 and stamp-hook.ps1 were each measured
# working in a cloud VM. Without this, a cloud session has no branch guard and no
# attribution stamp. Delete this block if you decide cloud sessions do not need them.
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

# --- 6. the Supabase images ---------------------------------------------------------
# THE REPOSITORY IS NOT THIS SCRIPT'S BUSINESS. A setup script provisions the VM; it runs
# before Claude Code launches and its working directory is not the checkout, so anything
# needing package.json or the tree belongs in the SessionStart hook instead. That is the
# documented split, and `bun install` here failed on exactly that boundary.
#
# The images are still worth pulling here, because they are the slow part (about 8.4 GB)
# and they are VM state, not project state. Pulling them BY NAME needs no repository.
#
# The tags match this project's supabase/config.toml as pinned today. A tag that later
# drifts is harmless: the pull simply caches an image the stack no longer wants, and the
# CLI pulls the right one on first use.
for image in \
  public.ecr.aws/supabase/postgres:17.6.1.143 \
  public.ecr.aws/supabase/gotrue:v2.193.0 \
  public.ecr.aws/supabase/postgrest:v14.15 \
  public.ecr.aws/supabase/realtime:v2.113.4 \
  public.ecr.aws/supabase/storage-api:v1.66.4 \
  public.ecr.aws/supabase/postgres-meta:v0.96.6 \
  public.ecr.aws/supabase/studio:2026.07.13-sha-b5ada96 \
  public.ecr.aws/supabase/edge-runtime:v1.74.2 \
  public.ecr.aws/supabase/kong:2.8.1 \
  public.ecr.aws/supabase/logflare:1.47.1 \
  public.ecr.aws/supabase/mailpit:v1.30.2 \
  public.ecr.aws/supabase/vector:0.53.0-alpine
do
  # `|| true` on purpose: one unreachable tag must not cost the whole environment build.
  # A missing image is a slow first stack start, not a broken session.
  docker pull "$image" || true
done

echo "setup complete - $(docker images -q | wc -l) images cached"
echo "the slot pool is NOT provisioned here (it needs the repository) - run this once"
echo "inside a session when you first need an integration-tier database:"
echo "  bun tests/at/harness/db-pool.ts setup"

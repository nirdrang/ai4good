#!/bin/bash
# Per-session state that a cloud environment's setup-script snapshot can never carry, because a
# snapshot keeps files, never running processes or OAuth sessions. Starts what can be started
# automatically (dockerd) and reports what can't (subscription logins), so the state of each is
# visible at session start instead of discovered mid-task.
#
# Guarded to remote only: the founder's local Windows sessions already run banner.ps1 for this
# same slot, and this script has no meaning there.
set -uo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

echo "== ai4good cloud session =="

if docker info >/dev/null 2>&1; then
  echo "docker: daemon already up"
else
  # setsid+nohup+disown: `dockerd` in this image does not self-daemonize, so a plain
  # `command &` dies the instant this hook script's own process exits (measured: it
  # was still reachable for a few seconds, then gone once the parent returned).
  setsid nohup sudo -n dockerd >/tmp/dockerd.log 2>&1 </dev/null &
  disown
  for _ in $(seq 1 15); do
    docker info >/dev/null 2>&1 && break
    sleep 1
  done
  if docker info >/dev/null 2>&1; then
    echo "docker: daemon started"
  else
    echo "docker: FAILED to start - check /tmp/dockerd.log"
  fi
fi

# Safety net only. The environment's setup script already installs this once and it is captured
# in the snapshot; this check only fires in an environment that lacks that setup script.
if [ ! -d node_modules ]; then
  echo "node_modules: missing, installing..."
  bun install --frozen-lockfile
fi

if command -v codex >/dev/null 2>&1; then
  if codex login status >/dev/null 2>&1; then
    echo "codex: logged in"
  else
    echo "codex: NOT logged in - run: codex login --device-auth"
  fi
fi

if command -v opencode >/dev/null 2>&1; then
  if opencode auth list 2>&1 | grep -q "OpenCode Go"; then
    echo "opencode: OpenCode Go authenticated"
  else
    echo "opencode: NOT authenticated - see the setup script's OPENCODE_GO_API_KEY"
  fi
fi

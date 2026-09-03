#!/bin/bash
# Per-session state that a cloud environment's setup-script snapshot can never carry, because a
# snapshot keeps files, never running processes or OAuth sessions. Starts what can be started
# automatically (dockerd) and reports what can't (subscription logins), so the state of each is
# visible at session start instead of discovered mid-task.
#
# Guarded to remote only: the founder's local Windows sessions already run banner.ps1 for this
# same slot, and this script has no meaning there.
#
# Emits Claude Code's hook JSON contract (systemMessage + hookSpecificOutput.additionalContext)
# rather than plain stdout. Plain stdout on a SessionStart hook only reaches the model as
# context - the founder's chat UI never renders it, which was the exact gap that made this
# script invisible to the founder even though it ran successfully (observed 2026-08-21). The
# JSON contract's systemMessage is what banner.ps1 already uses to stay visible on local.
set -uo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

lines=("== ai4good cloud session ==")

if docker info >/dev/null 2>&1; then
  lines+=("docker: daemon already up")
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
    lines+=("docker: daemon started")
  else
    lines+=("docker: FAILED to start - check /tmp/dockerd.log")
  fi
fi

# Safety net only. The environment's setup script already installs this once and it is captured
# in the snapshot; this check only fires in an environment that lacks that setup script.
if [ ! -d node_modules ]; then
  lines+=("node_modules: missing, installing...")
  bun install --frozen-lockfile >&2
fi

# Claude Code installs the pstack plugin inside the session from the marketplace source in the
# tracked .claude/settings.json. A known defect leaves it inactive in the FIRST session of a
# fresh environment: the marketplace clone lands after the session has started. A restart loads
# it. The clone directory is the signal this hook can see.
if [ -d "$HOME/.claude/plugins/marketplaces/open-pstack" ]; then
  lines+=("pstack: marketplace present")
else
  lines+=("pstack: marketplace NOT cloned yet - restart this session once")
fi

# Both login checks read the command's words, not only its exit code, the same way the pstack
# runner's preflight does (its run.ts, preflightPassed). codex exits 1 when logged out, but grok
# exits 0 either way: logged out, `grok models` prints "You are not authenticated." and still
# lists the models, so an exit-code check said "logged in" on every fresh cloud session
# (observed 2026-09-03). Logged in it prints "You are logged in with grok.com." (grok 1.0.13).
if command -v codex >/dev/null 2>&1; then
  if out=$(codex login status 2>&1) && grep -qi "logged in" <<<"$out"; then
    lines+=("codex: logged in")
  else
    lines+=("codex: NOT logged in - run: codex login --device-auth")
  fi
fi

# `grok models` is the same preflight the pstack runner uses. The runner also requires the
# requested model in the list, so the check does too; the model is the grok family on the sheet.
if command -v grok >/dev/null 2>&1; then
  if out=$(grok models 2>&1) && grep -qi "logged in" <<<"$out" && grep -q "grok-4.6" <<<"$out"; then
    lines+=("grok: logged in, grok-4.6 available")
  else
    lines+=("grok: NOT logged in - run: grok login --device-auth")
  fi
fi

if command -v opencode >/dev/null 2>&1; then
  if opencode auth list 2>&1 | grep -q "OpenCode Go"; then
    lines+=("opencode: OpenCode Go authenticated")
  else
    lines+=("opencode: NOT authenticated - see the setup script's OPENCODE_GO_API_KEY")
  fi
fi

banner=$(printf '%s\n' "${lines[@]}")

if command -v jq >/dev/null 2>&1; then
  jq -n --arg msg "$banner" \
    '{systemMessage: $msg, hookSpecificOutput: {hookEventName: "SessionStart", additionalContext: $msg}}'
else
  # jq missing: fall back to plain stdout so the model still sees the banner, even though the
  # founder's chat UI will not render it in that case.
  printf '%s\n' "${lines[@]}"
fi

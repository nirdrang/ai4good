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

if command -v codex >/dev/null 2>&1; then
  if out=$(codex login status 2>&1) && grep -qi "logged in" <<<"$out"; then
    lines+=("codex: logged in")
  else
    lines+=("codex: NOT logged in - run: codex login --device-auth")
  fi
fi

# Grok lanes do not run in cloud sessions (founder 2026-10-24). Per row (founder 2026-11-21):
# no Sol lane, grok becomes Sol at high; a Sol lane and no Astra lane, grok becomes Astra at
# medium; both, the grok lane is dropped. The Sol and Astra versions come from the sheet.
sheet="$CLAUDE_PROJECT_DIR/.claude/pstack-models.md"
grok='grok:grok-[0-9.]+@[a-z]+'
sol=$(grep -oE 'codex:gpt-[0-9.]+-sol' "$sheet" | head -1)
astra=$(grep -oE 'codex:gpt-[0-9.]+-astra' "$sheet" | head -1)
sol="${sol:-codex:gpt-6.2-sol}@high"
astra="${astra:-codex:gpt-6.2-astra}@medium"
if grep -qE "^[^[:space:]].*$grok" "$sheet"; then
  sed -i -E "/^[^[:space:]].*$grok/ {
    /-sol@/! { s/$grok/$sol/g; b; }
    /-astra@/! { s/$grok/$astra/g; b; }
    s/, *$grok//g; s/$grok, *//g
  }" "$sheet"
  git -C "$CLAUDE_PROJECT_DIR" update-index --skip-worktree .claude/pstack-models.md
fi
if grep -qE "^[^[:space:]].*$grok" "$sheet"; then
  lines+=("pstack sheet: grok lanes NOT replaced - check .claude/pstack-models.md")
else
  lines+=("pstack sheet: no grok lane in this session ($sol, or $astra where the row has Sol, or dropped where it has both); re-read .claude/pstack-models.md, it overrides the copy loaded at start")
fi

(bunx playwright-core install chromium-headless-shell >/tmp/playwright-install.log 2>&1
  mkdir -p "$HOME/.cache/ms-playwright"
  for dir in "${PLAYWRIGHT_BROWSERS_PATH:-/opt/pw-browsers}"/chromium_headless_shell-*; do
    ln -sfn "$dir" "$HOME/.cache/ms-playwright/$(basename "$dir")"
  done) &
lines+=("playwright: installing the pinned headless browser in the background (/tmp/playwright-install.log)")

lines+=("$("$CLAUDE_PROJECT_DIR/scripts/viewer.sh" up)")

banner=$(printf '%s\n' "${lines[@]}")

if command -v jq >/dev/null 2>&1; then
  jq -n --arg msg "$banner" \
    '{systemMessage: $msg, hookSpecificOutput: {hookEventName: "SessionStart", additionalContext: $msg}}'
else
  # jq missing: fall back to plain stdout so the model still sees the banner, even though the
  # founder's chat UI will not render it in that case.
  printf '%s\n' "${lines[@]}"
fi

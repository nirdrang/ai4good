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

# The snapshot freezes both agent CLIs at the version the setup script installed, and the model
# sheet names models only a current CLI knows. Bring each to the newest version before any lane
# runs (founder 2026-11-21).
if command -v codex >/dev/null 2>&1; then
  have=$(codex --version 2>/dev/null | grep -oE '[0-9]+(\.[0-9]+)+' | head -1)
  want=$(timeout 30 npm view @openai/codex version 2>/dev/null)
  if [ -z "$want" ]; then
    lines+=("codex: $have, newest version NOT checked - npm did not answer")
  elif [ "$have" = "$want" ]; then
    lines+=("codex: $have, current")
  elif timeout 180 npm install -g "@openai/codex@$want" >/tmp/codex-update.log 2>&1 ||
    timeout 180 sudo -n npm install -g "@openai/codex@$want" >>/tmp/codex-update.log 2>&1; then
    lines+=("codex: updated $have to $want")
  else
    lines+=("codex: $have, update to $want FAILED - check /tmp/codex-update.log")
  fi
else
  lines+=("codex: NOT installed - the environment's setup script installs it")
fi

# Safety net for an environment whose setup script predates agy. The symlink is what puts agy
# on the PATH of the session's own commands; a PATH change here would die with this hook.
if ! command -v agy >/dev/null 2>&1; then
  timeout 180 bash -c 'curl -fsSL https://antigravity.google/cli/install.sh | bash' >/tmp/agy-install.log 2>&1
  ln -sf "$HOME/.local/bin/agy" /usr/local/bin/agy 2>/dev/null ||
    sudo -n ln -sf "$HOME/.local/bin/agy" /usr/local/bin/agy 2>>/tmp/agy-install.log
fi
if command -v agy >/dev/null 2>&1; then
  have=$(agy --version 2>/dev/null | grep -oE '[0-9]+(\.[0-9]+)+' | head -1)
  if timeout 180 agy update >/tmp/agy-update.log 2>&1; then
    now=$(agy --version 2>/dev/null | grep -oE '[0-9]+(\.[0-9]+)+' | head -1)
    if [ "$have" = "$now" ]; then
      lines+=("agy: $have, current")
    else
      lines+=("agy: updated $have to $now")
    fi
  else
    lines+=("agy: $have, update FAILED - check /tmp/agy-update.log")
  fi
  if timeout 60 agy models >/dev/null 2>&1; then
    lines+=("agy: signed in")
  else
    lines+=("agy: NOT signed in - run: agy, open the printed link, paste the code")
  fi
else
  lines+=("agy: NOT installed - check /tmp/agy-install.log")
fi

if command -v codex >/dev/null 2>&1; then
  if out=$(codex login status 2>&1) && grep -qi "logged in" <<<"$out"; then
    lines+=("codex: logged in")
  else
    lines+=("codex: NOT logged in - run: codex login --device-auth")
  fi
fi

# pstack 1.21.0 does not register Neon, so it takes effort default only.
sheet="$CLAUDE_PROJECT_DIR/.claude/pstack-models.md"
grok='grok:grok-[0-9.]+@[a-z]+'
neon='agy:gemini-4-neon-high@default'
if git -C "$CLAUDE_PROJECT_DIR" ls-files -v .claude/pstack-models.md | grep -q '^S'; then
  git -C "$CLAUDE_PROJECT_DIR" show :.claude/pstack-models.md >"$sheet"
fi
if grep -qE "^[^[:space:]].*$grok" "$sheet"; then
  sed -i -E "/^[^[:space:]]/ s/$grok/$neon/g" "$sheet"
  git -C "$CLAUDE_PROJECT_DIR" update-index --skip-worktree .claude/pstack-models.md
fi
if grep -qE "^[^[:space:]].*$grok" "$sheet"; then
  lines+=("pstack sheet: grok lanes NOT replaced - check .claude/pstack-models.md")
else
  lines+=("pstack sheet: every grok lane is $neon in this session (needs agy signed in); re-read .claude/pstack-models.md, it overrides the copy loaded at start")
fi

lines+=("sign-in rule: when a codex or agy lane ends with receipt status unauthenticated (runner exit 77), or with child-failed (exit 70) and a sign-in error in its evidence or stderr (401, token could not be refreshed, sign in again), halt the work and ask the founder to sign in: for codex run 'codex login --device-auth' and give them the code and its URL; for agy move ~/.gemini/antigravity-cli/antigravity-oauth-token aside if it exists (agy skips the sign-in while a stale token is there), run 'agy' in tmux, choose Google OAuth, give them the link, and paste back their code. If the receipt evidence names another cause, such as a config error, report that cause instead. Rerun the lane after the sign-in. Never count it as a dropout, never continue without the lane, never switch its model.")

(bunx playwright-core install chromium-headless-shell >/tmp/playwright-install.log 2>&1
  mkdir -p "$HOME/.cache/ms-playwright"
  for dir in "${PLAYWRIGHT_BROWSERS_PATH:-/opt/pw-browsers}"/chromium_headless_shell-*; do
    ln -sfn "$dir" "$HOME/.cache/ms-playwright/$(basename "$dir")"
  done) &
lines+=("playwright: installing the pinned headless browser in the background (/tmp/playwright-install.log)")

lines+=("viewer: not started; type /viewer to start a Vercel sandbox for this branch")

banner=$(printf '%s\n' "${lines[@]}")

if command -v jq >/dev/null 2>&1; then
  jq -n --arg msg "$banner" \
    '{systemMessage: $msg, hookSpecificOutput: {hookEventName: "SessionStart", additionalContext: $msg}}'
else
  # jq missing: fall back to plain stdout so the model still sees the banner, even though the
  # founder's chat UI will not render it in that case.
  printf '%s\n' "${lines[@]}"
fi

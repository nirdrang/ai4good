#!/usr/bin/env bash
set -uo pipefail
cd "$(dirname "$0")/.."

branch="$(git branch --show-current)"
case "$branch" in claude/*) ;; *) echo "viewer: branch $branch is not a claude/ branch; no sandbox"; exit 0 ;; esac
[ -n "${VERCEL_TOKEN:-}" ] || { echo "viewer: VERCEL_TOKEN is not set; no sandbox"; exit 0; }

case "${1:-up}" in
  up)
    setsid -f nohup node --experimental-strip-types scripts/viewer-sandbox.ts up > /tmp/viewer-sandbox.log 2>&1 < /dev/null
    echo "viewer: Vercel sandbox for $branch is starting (about a minute); run scripts/viewer.sh url for the link" ;;
  stop) node --experimental-strip-types scripts/viewer-sandbox.ts stop ;;
  url) cat /tmp/viewer-url 2>/dev/null || echo "viewer: no link yet" ;;
esac

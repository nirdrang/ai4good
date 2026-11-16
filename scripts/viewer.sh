#!/usr/bin/env bash
set -uo pipefail
cd "$(dirname "$0")/.."

repo="$(git remote get-url origin | sed -E 's#\.git$##; s#.*[/:]([^/]+/[^/]+)$#\1#')"
branch="$(git branch --show-current)"
api="https://api.github.com/repos/$repo"

case "$branch" in claude/*) ;; *) echo "viewer: branch $branch is not a claude/ branch; no codespace"; exit 0 ;; esac

dispatch() {
  curl -fsS -o /dev/null -X POST "$api/actions/workflows/viewer.yml/dispatches" -H 'content-type: application/json' \
    -d "{\"ref\":\"$branch\",\"inputs\":{\"action\":\"$1\",\"branch\":\"$branch\"}}"
}

case "${1:-up}" in
  up)
    if git ls-remote --exit-code --heads origin "$branch" >/dev/null 2>&1; then
      dispatch up || { echo "viewer: could not start the workflow"; exit 0; }
    else
      git push --quiet -u origin HEAD 2>/dev/null || { echo "viewer: could not push $branch"; exit 0; }
    fi
    echo "viewer: codespace for $branch is starting; run scripts/viewer.sh url for the link"
    ;;
  stop)
    dispatch stop && echo "viewer: stop requested for $branch"
    ;;
  url)
    curl -fsS "$api/commits/$branch/statuses" |
      python3 -c 'import json,sys; s=[x for x in json.load(sys.stdin) if x["context"]=="viewer"]; print(s[0]["state"] + ": " + s[0]["target_url"] if s else "viewer: no link yet")'
    ;;
esac

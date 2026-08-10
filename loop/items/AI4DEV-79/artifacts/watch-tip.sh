#!/bin/sh
base="12caaf0522a8c575b079805e0a60c4080a40b3d7"
branch="nirdrang/ai4dev-79-a-pool-of-local-database-slots-so-items-verify-in-parallel"
while true; do
  tip=$(git ls-remote origin "$branch" 2>/dev/null | awk '{print $1}')
  if [ -n "$tip" ] && [ "$tip" != "$base" ]; then
    echo "TIP MOVED: $tip"
    break
  fi
  sleep 20
done

#!/bin/sh
base="2e2a2153ee10a0d9d02823b10955b59b5dd1d85e"
branch="nirdrang/ai4dev-79-a-pool-of-local-database-slots-so-items-verify-in-parallel"
while true; do
  tip=$(git ls-remote origin "$branch" 2>/dev/null | awk '{print $1}')
  if [ -n "$tip" ] && [ "$tip" != "$base" ]; then
    echo "TIP MOVED: $tip"
    break
  fi
  sleep 20
done

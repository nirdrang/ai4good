#!/bin/sh
base="b0655ddcf9750b3c517c13f0c2948e2fb17a1b18"
branch="nirdrang/ai4dev-79-a-pool-of-local-database-slots-so-items-verify-in-parallel"
while true; do
  tip=$(git ls-remote origin "$branch" 2>/dev/null | awk '{print $1}')
  if [ -n "$tip" ] && [ "$tip" != "$base" ]; then
    echo "TIP MOVED: $tip"
    break
  fi
  sleep 20
done

#!/bin/sh
base="db4a45182f1a6a5332ba21e797e6b5ef828d73e3"
branch="nirdrang/ai4dev-79-a-pool-of-local-database-slots-so-items-verify-in-parallel"
while true; do
  tip=$(git ls-remote origin "$branch" 2>/dev/null | awk '{print $1}')
  if [ -n "$tip" ] && [ "$tip" != "$base" ]; then
    echo "TIP MOVED: $tip"
    break
  fi
  sleep 20
done

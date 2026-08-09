#!/bin/sh
base="3cb66f45c541c42b9ab69ec2362f63810f37e103"
branch="nirdrang/ai4dev-79-a-pool-of-local-database-slots-so-items-verify-in-parallel"
while true; do
  tip=$(git ls-remote origin "$branch" 2>/dev/null | awk '{print $1}')
  if [ -n "$tip" ] && [ "$tip" != "$base" ]; then
    echo "TIP MOVED: $tip"
    break
  fi
  sleep 20
done

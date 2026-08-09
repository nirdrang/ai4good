#!/bin/sh
head=c11e352bc38b2d3bf4e85749898f33ea78ee9877
branch=nirdrang/ai4dev-60-sessions-automatic-refresh-and-password-reset-d2l2
while true; do
  tip=$(git ls-remote origin "refs/heads/$branch" 2>/dev/null | cut -f1)
  if [ -n "$tip" ] && [ "$tip" != "$head" ]; then
    echo "TIP MOVED: $tip"
    break
  fi
  sleep 20
done

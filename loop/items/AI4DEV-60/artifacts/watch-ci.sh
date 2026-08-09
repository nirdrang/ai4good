#!/bin/sh
while true; do
  out=$(gh pr checks 50 2>&1)
  if ! echo "$out" | grep -q "pending"; then
    echo "TERMINAL:"
    echo "$out"
    break
  fi
  sleep 30
done

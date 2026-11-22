---
name: viewer
description: Start, link, or stop the Vercel sandbox viewer for this cloud session's branch, so the founder can open the running app on a phone or browser. Use for /viewer, "start the viewer", "show me the app", or "stop the viewer". Never start one unasked.
---

# viewer

The viewer is a Vercel sandbox that clones this branch from GitHub, runs the Supabase stack and the
dev server, and gives a public link. It runs only when the founder asks (founder rule 2026-11-17).

1. Push the branch first. The sandbox clones what is on GitHub, not this checkout.
2. `/viewer` or `/viewer up`: run `scripts/viewer.sh up`. It returns at once and builds in the
   background, in about a minute. Log: `/tmp/viewer-sandbox.log`.
3. Wait until `scripts/viewer.sh url` prints a link, then post the link to the founder.
   If the log shows an error, post the error instead.
4. `/viewer stop`: run `scripts/viewer.sh stop`.

The script needs `VERCEL_TOKEN` in the environment and a `claude/` branch; it says so when either
is missing. The free plan holds about three branch snapshots at a time.

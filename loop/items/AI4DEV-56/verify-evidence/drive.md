# Step 4: shipped drive (drive-ngo-signup.ts)

Command: `bun .claude/skills/verify-ai4good/scripts/drive-ngo-signup.ts loop/items/AI4DEV-56/verify-evidence/drive`

## Run 1 (first attempt)

Start: 2026-09-06T14:16:03.1469664+03:00
End: 2026-09-06T14:16:04.3687149+03:00
Exit code: 1

Last lines of output (full output — the run is short):

```
PASS  (a) auth health answers
        GET /auth/v1/health -> 200
PASS  (a2) mail identification
        Mailpit v1.30.2 at http://127.0.0.1:44324
FAIL  (a3) edge runtime mount
        edge runtime functions mount is /run/desktop/mnt/host/c/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-56/supabase/functions; expected a Source ending in supabase/functions that starts with C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-56. bun run db:stop then bun run db:start from this checkout

ABORT: edge runtime functions mount is /run/desktop/mnt/host/c/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-56/supabase/functions; expected a Source ending in supabase/functions that starts with C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-56. bun run db:stop then bun run db:start from this checkout

evidence: C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-56\loop\items\AI4DEV-56\verify-evidence\drive\transcript.json
```

Cause: `db:stop`/`db:start` were run from this exact worktree checkout in step 3, immediately
before this drive. The step 3 `docker inspect` check (which requires only that the mount name
the primary worktree's `supabase/functions`, in whatever path form Docker reports) passed on
that same running stack — Docker Desktop reports the bind mount source in its WSL-translated
form (`/run/desktop/mnt/host/c/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-56/supabase/functions`),
not as a Windows drive-letter path. The shipped drive script's own check required the Source
string to start with the Windows-style path
`C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-56`, which this Docker Desktop / WSL2
host never reports, so the check failed on this machine regardless of which worktree was
mounted.

## Fix applied by the lead

The lead ruled this a genuine defect in the shipped drive script: the mount check did not
normalize Docker Desktop's WSL bind-source form. Fixed in
`.claude/skills/verify-ai4good/scripts/drive-ngo-signup.ts` with one added normalize line:

```diff
-  const normalize = (value: string) => value.replace(/\\/g, '/').toLowerCase();
+  // Docker Desktop on WSL2 reports a bind source as /run/desktop/mnt/host/c/..., not C:\...
+  const normalize = (value: string) =>
+    value.replace(/\\/g, '/').replace(/^\/run\/desktop\/mnt\/host\/([a-z])\//i, '$1:/').toLowerCase();
```

## Run 2 (rerun after the fix)

Start: 2026-09-06T14:19:51+03:00
End: 2026-09-06T14:19:53+03:00
Exit code: 0

Last 30 lines of output (full output — the run is short):

```
PASS  (a) auth health answers
        GET /auth/v1/health -> 200
PASS  (a2) mail identification
        Mailpit v1.30.2 at http://127.0.0.1:44324
PASS  (a3) edge runtime mount
        edge runtime functions mount /run/desktop/mnt/host/c/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-56/supabase/functions
PASS  (b) signup returns a user and no session
        status 200, access_token present: false
PASS  (c) sign-in refused while unconfirmed
        status 400
PASS  (d1) confirmation email holds a verify link
        http://127.0.0.1:44321/auth/v1/verify?token=REDACTED&type=REDACTED&redirect_to=REDACTED
PASS  (d2) verify link redirects (address confirmed)
        status 303 -> http://127.0.0.1:3000/
PASS  (e) sign-in succeeds after confirmation
        status 200, token issued, user 3e325c32-0a5c-48c5-a2f6-7dc2dfd66947
PASS  (f) complete-signup (ngo) answers 200
        status 200: {"ok":true,"accountId":"3e325c32-0a5c-48c5-a2f6-7dc2dfd66947","accountType":"ngo","organizationId":"09f560d8-7ea4-4d74-8df9-834ffc263ad3"}
PASS  (g1) accounts row: account_type=ngo
        {"id":"3e325c32-0a5c-48c5-a2f6-7dc2dfd66947","account_type":"ngo"}
PASS  (g2) organizations row exists with the driven name
        {"id":"09f560d8-7ea4-4d74-8df9-834ffc263ad3","name":"Verify Drill Org 1788693592636"}
PASS  (g3) org_memberships row: role=admin
        {"role":"admin"}
PASS  (g4) acknowledgments row carries the driven text_version
        {"kind":"platform_tos_and_promise","text_version":"tos-platform-promise-v1"}

evidence: C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-56\loop\items\AI4DEV-56\verify-evidence\drive\transcript.json

13/13 checks passed
```

Result: 13/13 checks passed, exit code 0.

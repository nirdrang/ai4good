---
name: verify-ai4good
description: Drive the real ai4good surface on the local Supabase stack (auth, edge functions, database, mail catcher on the 44321 block) and capture evidence. Use it whenever an item must prove behavior on the running app, not in the acceptance suite.
---

# verify-ai4good

The user-facing surface today is the API, not a screen. `src/routes/index.tsx` renders a
placeholder heading only. A user touches: Supabase Auth (email and password signup with
mandatory email confirmation; Google and GitHub OAuth are configured, but consent is a human
browser step no agent performs), three edge functions (`complete-signup`,
`create-organization`, `update-organization`), and the Postgres rows they write. Verification
drives HTTP and reads the database. The acceptance suite (`bun run at:verify`) is a separate,
loop-tier thing; it does not replace a live drive and a live drive does not replace it.

**One stack per machine.** The stack on the 44321 block is THE stack, the one
`supabase/config.toml` describes; the slot pool is parked (founder, 2026-08-29 and 2026-09-01).
Never start a second one, and never drive a stack you cannot identify (Doctor below). An
integration run of the acceptance suite resets this stack; do not drive while one runs, and
run one drive at a time.

## Launch

From the repo root (or a worktree — the stack is shared; config identity is
`project_id = "poancmeitlmxejofwzuu"` in [`supabase/config.toml`](../../../supabase/config.toml)):

```
bun run db:start        # bunx supabase start — idempotent when already up
bun run db:reset        # apply migrations to a known-clean state; run before evidence-grade drives
```

Ready when `http://127.0.0.1:44321/auth/v1/health` answers 200. First start takes one to two
minutes. `db:reset` warns that `supabase/seed.sql` does not exist; that is fine, migrations
are the state.

The started stack serves the edge functions itself at
`http://127.0.0.1:44321/functions/v1/<name>` (measured 2026-08-31: an unauthenticated POST
answers 401 from the JWT gate). `bunx supabase functions serve` is only needed for hot-reload
work on function code, and it must run from the same checkout you are verifying — a stale
mount serves somebody else's code.

## Doctor

Run this read-only check first whenever anything looks off:

```powershell
Invoke-RestMethod http://127.0.0.1:44321/auth/v1/health          # answers => stack up
bunx supabase status -o json                                     # API_URL must be http://127.0.0.1:44321
docker ps --format '{{.Names}}' | Select-String poancmeitlmxejofwzuu   # containers owned by THIS config
```

If `status` names other ports, or the containers on 44321 carry a different suffix, stop and
report — do not drive. Leftover `ai4good-slot-1` / `ai4good-slot-2` containers (45xxx/46xxx)
are corpses of the deleted slot pool, not this stack; ignore them, never drive them.

## Drive

The harness is plain HTTP plus the mail catcher. Keys come from
`bunx supabase status -o json` at run time — never hardcode or commit them.

The shipped helper drives the primary path end to end (NGO email signup through database
readback):

```
bun .claude/skills/verify-ai4good/scripts/drive-ngo-signup.ts [outDir]
```

The recipe it implements, for custom drives:

1. `POST {API}/auth/v1/signup` with `{email, password}`, header `apikey: <ANON_KEY>`.
   Confirmations are ON: expect a user and NO session.
2. Fetch the confirmation mail from Mailpit: `GET http://127.0.0.1:44324/api/v1/messages`,
   then `GET /api/v1/message/{ID}`; extract the `/auth/v1/verify?...` link from the body.
3. `GET` that link with redirects disabled; a 3xx redirect to the site URL means confirmed.
4. `POST {API}/auth/v1/token?grant_type=password` → `access_token`.
5. Call an edge function with `Authorization: Bearer <access_token>` and `apikey: <ANON_KEY>`.
   `complete-signup` needs: `accountType`, `organizationName` (NGO only),
   `acknowledgmentTextVersion`, `signerName`, `signerTitle`, and `authorityAttestation` equal,
   word for word, to `ACKNOWLEDGMENT_IDENTITY_COPY.authorityStatement` in
   [`supabase/functions/_shared/acknowledgment-copy.ts`](../../../supabase/functions/_shared/acknowledgment-copy.ts)
   — import it, do not retype it.
6. Read the rows back directly from Postgres over `DB_URL` (from the status JSON), with
   Bun's `SQL` or `psql`. Do NOT read them over REST with the service-role key: the
   migrations grant `service_role` SELECT on some tables only, and `organizations` and
   `acknowledgments` answer 403 (measured 2026-08-31). Tables: `accounts`, `organizations`,
   `org_memberships`, `acknowledgments`, `volunteer_profiles`, `projects`.

Per-feature recipes and refusal cases are in [`features/`](features/README.md).

## Evidence

Default location: `loop/verify-evidence/<yyyyMMdd-HHmmss>/transcript.json` (the helper writes
it; pass `outDir` to redirect, e.g. into `loop/items/<item>/artifacts/`). Standards:

- Exercise the real user path. No admin-API user minting, no `--no-verify-jwt`, no direct DB
  writes to set up what the surface can produce itself.
- Capture the action AND the resulting state: the HTTP request/response pair and the rows
  read back, not just a final 200.
- REDACT before writing. Any value under a credential-shaped key (`token|secret|password|
  apikey|jwt|otp`), any JWT-shaped substring, and every query value in a redirect Location.
  GitHub push protection has already refused one transcript in this repo.

## Cleanup

Kill what you started, nothing else. If the stack was already up when you began, leave it up.
If you started it this run: `bun run db:stop` (stops only containers of this project id).
Test users and rows your drive created stay until the next `db:reset`; that is acceptable on
this stack. Evidence is never cleanup's to delete — `loop/verify-evidence/` survives.

## Helpers

- [`scripts/drive-ngo-signup.ts`](scripts/drive-ngo-signup.ts) — the end-to-end NGO drive
  above; run with `bun`, optional first argument is the evidence directory. Exit 0 with every
  check PASS, exit 1 otherwise; the transcript is written either way.

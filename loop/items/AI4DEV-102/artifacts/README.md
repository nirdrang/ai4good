# AI4DEV-102 — live drive evidence

Driven on the local stack (project `poancmeitlmxejofwzuu`, api port 44321), reset just before
this run. Both drives exited 0 with every check passing. Timestamps below are local run times
on 2026-09-11.

## Step 1 — shipped NGO signup drive

Command:

    bun .claude/skills/verify-ai4good/scripts/drive-ngo-signup.ts loop/items/AI4DEV-102/artifacts/ngo-signup

Exit code: 0. 13/13 checks passed.

Evidence: `loop/items/AI4DEV-102/artifacts/ngo-signup/transcript.json`

Checks: auth health, mail catcher identification, edge runtime mount, signup with no session,
sign-in refused unconfirmed, confirmation mail and verify-link redirect, sign-in after
confirmation, `complete-signup` (NGO), and readback of `accounts`, `organizations`,
`org_memberships`, `acknowledgments`.

## Step 2 and 3 — the vetting drive (new script)

Wrote `.claude/skills/verify-ai4good/scripts/drive-vetting.ts`, modelled on the shipped drive
and built on the same `tests/at/harness/live-stack.ts` helpers.

Command:

    bun .claude/skills/verify-ai4good/scripts/drive-vetting.ts loop/items/AI4DEV-102/artifacts/vetting

Exit code: 0. 30/30 checks passed.

Evidence: `loop/items/AI4DEV-102/artifacts/vetting/transcript.json`

### The path driven

1. Doctor checks (auth health, mail catcher identification, edge runtime mount) — pass.
2. NGO signs up by email, confirms through the mail catcher, signs in, and completes signup
   (`complete-signup`, account type `ngo`) — pass. Organisation id captured from the response.
3. The NGO sets its organisation profile: `POST /functions/v1/set-organization-profile` with
   all five fields (name, mission, country, website, logo). Read back the `organizations` row
   and confirmed all five fields match — pass.
4. The NGO reads its Discovery allowance (`discovery-allowance`, `action: 'read'`): unverified
   daily grant of 10 — pass. It debits 1 credit (`action: 'debit', credits: 1`): remaining 9 —
   pass. Read back the `discovery_spend` row: spent=1, granted=10 — pass.
5. A platform administrator is provisioned exactly as
   `tests/at/suites/req-002/_live.ts`'s `provisionPlatformAdmin` does it: the account type has
   no public signup path, so the admin API (`POST /auth/v1/admin/users` with the service-role
   key, `email_confirm: true`) mints the user, `public.accounts` is inserted directly with
   `account_type = 'platform_admin'`, then the administrator signs in over the real password
   grant — pass on all three steps.
6. The administrator vets the organisation: `POST /functions/v1/set-organization-vetting` with
   `action: 'vet'` and the seven evidence fields (organizationName, publicReferenceUrl,
   contactName, contactTitle, authorityAttestation, evidenceType, note). Read back the
   `org_vetting` row (vetted=true, vetted_by=admin, evidence recorded), the `audit_events` row
   (actor=admin), the `notification_events` row (event `vetting.outcome`), and its
   `notification_deliveries` rows (email and inapp, both `pending`) — pass on all five.
7. The NGO reads its allowance again: `dailyGrant` is now 30 (the vetted grant), `vetted: true`
   — pass.
8. The administrator unvets with `action: 'unvet'` and a note. Read back the aggregate
   (`org_vetting.vetted = false`), a second (unvet) `audit_events` row, and a second
   `notification_events` row distinct from the vet one — pass on all four.

### The three refusals

- The NGO itself attempts `set-organization-vetting` (unvet). Refused 403,
  `kind: "not-a-platform-admin"`, reason names "platform administrators only" — pass.
- A debit larger than the remaining allowance (remaining 29, debited 30). Refused 409,
  `kind: "debit-exceeds-remaining"` — pass.
- The whole grant is drained (29 credits, reaching remaining 0), then one more credit is
  debited. Refused 409, `kind: "daily-allowance-exhausted"`, reason names all three remedies
  (get vetted, fund project fuel, wait for the next UTC day) — pass.

## Setup note

`node_modules` was not present in this worktree; `bun install` (529 packages, 57.7s) was run
before either drive, since the Supabase CLI the harness shells out to is resolved from this
worktree's own `node_modules`. No product code, migration, or test was changed.

## What failed

Nothing. Every check in both drives passed; both drives exited 0.

Both transcripts were scanned for `sb_secret_`, `sb_publishable_`, and JWT-shaped substrings
after the runs — none found (the harness's own redaction already replaces them).

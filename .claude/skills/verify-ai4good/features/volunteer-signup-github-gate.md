# Volunteer signup and the GitHub gate

A volunteer completion is blocked until a GitHub identity is LINKED to the auth user. The
gate reads the fact from Auth, never from the request body — a client cannot assert its way
past it. On success the platform imports a (stubbed) GitHub profile for the volunteer. Once a
volunteer has completed signup, the link is permanent: a database trigger refuses the unlink.

## Sub-features

- The refusal: an authenticated user with no linked GitHub identity, `accountType:
  "volunteer"` → 400 `{ok: false, kind: "invalid-request", reason}` with the link requirement
  stated. The gate reads the `/auth/v1/user` answer: an entry of `identities[]` with `provider
  == "github"` and a non-blank `identity_data.user_name` (`extractGithubHandle` in
  `supabase/functions/_shared/github.ts`).
- The refusal when a volunteer request carries an `organizationName` (a volunteer has no
  organization): 400 `invalid-request`. It is judged BEFORE the gate, so a request that carries
  a name never reaches the link check. The gate is judged before the acknowledgment and signer
  checks, so a request missing those fields still reports the link requirement.
- The happy path needs a real linked GitHub identity, which needs the OAuth consent screen —
  a human step. Agents drive the refusals; the happy path is founder-manual. On success the
  `volunteer_profiles` row carries `github_handle`, `top_languages`, `repository_count`,
  `contribution_summary` and `imported_at`, written in the completion's transaction.
- The permanence rule: `volunteer_github_identity_is_permanent`, a BEFORE DELETE trigger on
  `auth.identities` (`when pg_trigger_depth() = 0`). It refuses the delete of a `github`
  identity whose user holds a `volunteer` account. The user who calls Auth's unlink endpoint
  sees GoTrue's 500 `unexpected_failure` "Database error deleting identity", not a shaped
  refusal. The identity row survives and Auth stays healthy for the user. A cascade from an
  admin user delete is admitted.

## How to get to it (user POV)

Sign up and sign in (email path), then complete signup as a volunteer. Linking GitHub happens
inside Supabase Auth (`linkIdentity`), in a browser.

## Driving it with the HTTP harness

Signup, confirm and sign in as in email-signup-and-confirmation.md, then:

- Call A: `POST {API}/functions/v1/complete-signup` with `{"accountType": "volunteer",
  ...identity fields...}` and NO `organizationName`. With no linked GitHub identity expect 400
  `kind: "invalid-request"` and a reason naming the link requirement ("link GitHub to this
  account, then complete signup").
- Call B: the same with an `organizationName`. Expect 400 `invalid-request`, reason "a
  volunteer signup carries no organisation name — one account holds exactly one global type".

Readback over `DB_URL` (`volunteer_profiles` revokes every privilege from `anon`,
`authenticated` and `service_role`, so it is unreadable over REST):

```sql
select (select count(*) from public.accounts where id = '<user id>') as accounts,
       (select count(*) from public.volunteer_profiles where account_id = '<user id>') as profiles,
       (select count(*) from public.acknowledgments where account_id = '<user id>') as acknowledgments;
select tgname, tgenabled from pg_trigger where tgname = 'volunteer_github_identity_is_permanent';
```

Expect three zeros, and one trigger row with `tgenabled = 'O'`. The unlink itself cannot be
driven: it needs a linked identity, which needs the consent screen. The catalog readback is the
honest substitute; report it as a readback, never as a drive.

## What proves it

The refusal `kind` and text name the gate, and the database shows no partial write — no
account row, no volunteer profile, no acknowledgment. For the permanence rule, the trigger row
in `pg_trigger`.

## Gotchas

- Do not "prove" the happy path by writing `volunteer_profiles` directly or by forging
  identities through the admin API. That bypasses the exact boundary the feature is. The
  happy path stays unproved until a real consent run, and saying so is the correct report.
- The refusal order is account type, organization-name rules, the GitHub gate, then the
  acknowledgment version and the three signer fields. The gate fires before the field checks,
  so the body `{"accountType": "volunteer"}` alone reaches it. That is what the shipped drive
  sends. A complete body reaches the gate too; the reason you read is the gate's either way.

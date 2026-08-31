# Volunteer signup and the GitHub gate

A volunteer completion is blocked until a GitHub identity is LINKED to the auth user. The
gate reads the fact from Auth, never from the request body — a client cannot assert its way
past it. On success the platform imports a (stubbed) GitHub profile for the volunteer.

## Sub-features

- The refusal: an authenticated user with no linked GitHub identity, `accountType:
  "volunteer"` → refused with the link requirement stated.
- The refusal when a volunteer request carries an `organizationName` (a volunteer has no
  organization).
- The happy path needs a real linked GitHub identity, which needs the OAuth consent screen —
  a human step. Agents drive the refusals; the happy path is founder-manual.

## How to get to it (user POV)

Sign up and sign in (email path), then complete signup as a volunteer. Linking GitHub happens
inside Supabase Auth (`linkIdentity`), in a browser.

## Driving it with the HTTP harness

Same call as the NGO completion, body `{"accountType": "volunteer", ...identity fields...}`
and NO `organizationName`. With no linked GitHub identity expect a refusal whose reason names
the link requirement ("link GitHub to this account, then complete signup").

Readback: `accounts?id=eq.<userId>` still has no row (nothing was written).

## What proves it

The refusal text names the gate, and the database shows no partial write — no account row, no
volunteer profile.

## Gotchas

- Do not "prove" the happy path by writing `volunteer_profiles` directly or by forging
  identities through the admin API — that bypasses the exact boundary the feature is. The
  happy path stays unproved until a real consent run, and saying so is the correct report.

# Create organization (NGO-only action)

An NGO account creates an additional organization. A volunteer attempting it is rejected with
the reason stated — this function exists as the application boundary that acceptance
criterion drives.

## Sub-features

- NGO caller: organization created, caller becomes its `admin` member.
- Volunteer caller: rejected, reason names the NGO-only rule.
- Caller with no completed signup: told to complete signup first.
- Unreachable-database readback answers a distinct "failed" refusal, not "complete signup".

## How to get to it (user POV)

A signed-in, completed NGO user creates an organization. The API is the
`create-organization` edge function.

## Driving it with the HTTP harness

`POST {API}/functions/v1/create-organization`, headers `Authorization: Bearer
<access_token>` and `apikey: <ANON_KEY>`, body `{"name": "<unique name>"}`.

- As the NGO user from the NGO drive: expect 200; readback shows the `organizations` row and
  an `admin` row in `org_memberships`.
- As a volunteer (or a user who never completed signup): expect a refusal naming why.

## What proves it

The response pair plus the rows (or their absence, for the refusal cases).

## Gotchas

- The volunteer refusal needs a volunteer account, whose creation needs the GitHub gate —
  see volunteer-signup-github-gate.md. The "no completed signup" refusal is drivable with
  any fresh confirmed user and costs nothing.

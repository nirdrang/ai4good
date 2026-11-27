# Receive a GitHub push for the PRD

GitHub tells the stack that the PRD repository changed. The hook checks the signature, ignores anything that is not a push, and syncs a push for a repository this stack bound to a PRD. The screen does not call this function. GitHub does, after open or after a later push.

## How to reach it

Send `POST /functions/v1/prd-github-hook`. The function does not require a user token. The body is the raw delivery. The headers that matter are `x-hub-signature-256` and `x-github-event`. A push body is JSON and carries `repository.id`.

## Drive and readback

A signed push for a bound repository answers 200 with an empty body and writes the sync: `prd_records` head and revision, `prd_revisions`, and section versions when the commits change files. Read those rows over the operator SQL connection. A signed push for an unknown repository id, or a push with no repository id, answers 202 with an empty body and writes nothing. A signed delivery that is not a push answers 200 with an empty body and writes nothing.

A matching signature for a bound repository calls GitHub to read the new commits. A bad signature does not. The drive proves the bad signature, which needs the webhook secret to be set and needs no model and no GitHub call.

## Refusals

This function is not on the shared write pipeline, and its refusals have no `kind`. A method other than POST is 405. A missing `GITHUB_WEBHOOK_SECRET` is 503, and this is checked before the signature. A missing or wrong `x-hub-signature-256` is 401 and the reason is "the webhook signature does not match". A push body that is not JSON is 400. A sync that cannot reach GitHub because it is not configured is 503. Any other sync failure is 502. The body is `{ ok: false, reason }` with no `kind`.

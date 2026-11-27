# Read the PRD snapshot

Either person on the PRD reads the current workspace. The Dev and the NGO administrator both may call it. The answer is the wire snapshot, or an empty body when nothing has changed since the sequence the caller already has.

## How to reach it

Send `POST /functions/v1/prd-snapshot` with a token and `{ projectId }` or `{ projectId, sinceSequence }`. `projectId` is a uuid. `sinceSequence`, when present, is a whole number from 0 up.

## Drive and readback

When the snapshot sequence has moved, the answer is 200 and the body is the snapshot itself, not wrapped in `{ ok: true }`. Topics are `topics[]`, each with `id` and `title`. Funds are `funds`, including `availableMicros` and `pendingMicros`. Drafts for this caller are on the snapshot and refill the composer. When `sinceSequence` is already current, the answer is 204 and the body is empty.

The read also schedules catch-up of an overdue turn, publishing of a close tag that is still waiting, and a GitHub sync when the record says the repository is stale. A settled PRD with nothing overdue does not call the model. A stale repository does call GitHub, in the background, after the 200.

Read the same facts over the operator SQL connection with `prd_facts` for that account, or read `prd_records`, `prd_sections`, `prd_chats`, `prd_messages`, and `prd_drafts` directly. None of the refusals below need a model or GitHub.

## Refusals

This function is not on the shared write pipeline. A method other than POST is 405 with no `kind`. A missing or invalid token is 401 with no `kind`. A body that is not a JSON object is 400 with no `kind`. A project id that is not a uuid is 400 with no `kind`. A `sinceSequence` that is not a whole number from 0 up is 400 with no `kind`.

The database then checks, in order. The account must be active (`account-deactivated`). No role on the project is `forbidden`, and this is checked before "the PRD is not open", so a project the caller cannot see answers `forbidden` even when no PRD row exists. No PRD row is `invalid-request`. A record still pending or diverged is `not-yet`. A five-character SQLSTATE is HTTP 409 with that `kind`. Any other database failure is 502 `refused`.

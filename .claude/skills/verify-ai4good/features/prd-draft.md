# Save a PRD draft

The composer keeps unsent text for the person who typed it. The Dev's main-chat draft uses the key `main`. A topic field, a side chat, and an answer review each use their own key. Saving a draft does not send the message and does not call the model or GitHub. The screen waits 250 milliseconds after the last keystroke, then saves. Leaving the page flushes a pending save.

## How to reach it

Send `POST /functions/v1/prd-draft` with `{ projectId, key, text }`. `projectId` is a uuid. `key` is a non-empty string. `text` is a string and may be empty, which clears the draft.

## Drive and readback

Success is 200 `{ ok: true, snapshot }`. The snapshot includes that caller's drafts. The row is `prd_drafts` for the project, the caller, and the key. Read it over the operator SQL connection, or reload the screen: the composer shows the saved text. A closed PRD still accepts a draft save. The screen hides the composer when that person cannot write, so the closed screen does not offer one.

## Refusals

The shared write pipeline runs first, in the same order as open: 405 with no `kind`, 401 with no `kind`, 400 `invalid-request` for a non-object body, 400 `invalid-request` for a project id that is not a uuid, 502 `refused`, 403 `account-deactivated`, 409 `no-account`, and 403 `refused` for an account type other than volunteer or NGO. The route then refuses 400 `invalid-request` when the project or the key is missing, or when `text` is not a string.

The database then checks, in order. The account must be active. No role on the project is `forbidden`, and this is checked before "the PRD is not open", so another project answers `forbidden`. No PRD row is `invalid-request`. Pending or diverged is `not-yet`. An empty key or a null text is `invalid-request`. Each of those is HTTP 409 with that `kind`. None of them need a model or GitHub.

# Open the PRD

The assigned Dev opens the PRD for a project whose Discovery revision is confirmed. The call creates the PRD record and a repository in the GitHub test organization, then returns the workspace snapshot. A later call for a PRD that is already open returns the same snapshot and does not create a second repository.

## How to reach it

Confirm a Discovery revision, seat the Dev on the project, and credit PRD funds if a later reply must run. Send `POST /functions/v1/prd-open` with the Dev's token and `{ organizationId, projectId }`. Both ids are uuids.

## Drive and readback

A first open answers 200 `{ ok: true, snapshot }`. The snapshot is the wire snapshot from `prd_facts`. The database writes `prd_records` (state moves from pending to the published state), `prd_sections`, a section chat per section, the main chat, and a `prd_git_ops` row of kind `open`. GitHub receives a new repository and one commit, "Open the PRD". Read `repo_name` from `prd_records` over the operator SQL connection. The snapshot's topics are the sections just created. Opening does not call the model. It does call GitHub. The refusals below, through the missing approved revision, do not call GitHub.

## Refusals

The shared write pipeline runs first. A method other than POST is 405 with no `kind`. A missing or invalid token is 401 with no `kind`. A body that is not a JSON object is 400 `invalid-request`. The pipeline then treats `projectId` as its organisation slot, so a project id that is not a uuid is 400 `invalid-request` with the reason that the organisation id is not well formed. Standing that cannot be read is 502 `refused`. A deactivated account is 403 `account-deactivated`. No account row is 409 `no-account`. This route admits a volunteer or an NGO account, so any other account type is 403 `refused`. The route then requires both ids to be uuids and otherwise answers 400 `invalid-request`.

The database then checks, in order. The account must still be active (`account-deactivated`). A missing project, or a project in another organisation, is `no-such-project`. No role on the PRD is `forbidden`. An existing record that is not still pending returns the snapshot instead of refusing. A pending record opened by anyone but the Dev is `forbidden`, and a pending record with no opening operation is `invalid-request`. A new record opened by anyone but the Dev is `forbidden`. No confirmed Discovery revision is `invalid-request`. A section key with no file name is `invalid-request`. A missing opening operation after the rows are written is `invalid-request`. Each of those database refusals is HTTP 409 with that `kind`.

Publishing is separate from those refusals. GitHub not configured is 503 with no `kind`. An opening operation that cannot be read, a publish or sync failure, a record left pending, or a diverged repository is 502 with no `kind`. Those answers do call GitHub, except the not-configured one.

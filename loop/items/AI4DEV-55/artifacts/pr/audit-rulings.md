# The lead's rulings on the two audits

## Deslop pass

All ten edits accepted. Edit 10 moves a stub the branch did not write, out of one `describe` to module scope. Accepted because the branch's own copy of that stub was the slop, and the move is the smallest change that removes it.

## Comment audit

The audit judged 42 comments meat and raised 9 refactor flags. The lead rules on each group.

Deleted, 17 comments:

- The nine section banners in the two migrations (`1. normalise client privileges` and so on). Phase markers.
- `public-project.ts`: the comments on `publicProjectView`, `PublicProjectAnswer` and `publicProjectAnswer`. Each restated the lines beneath it.
- `tenant-reads.ts`: the comments on `ReadResult`, `TenantReadAnswer` and `TenantReads`. Each restated the type.
- `edge.ts`: the comment on `callerReads`. It restated the contract of `restJson`.

Kept, with the reason:

- File header comments in the selftests, the test file, and `_live-tenant-reads.ts`. Every file under `tests/at` opens with one; the audit's own keep list names two of them. Consistency with the tree wins.
- The comments on the four refusal constants, on `projectIsPublic`, on `viewer_is_org_member`, on `read_public_project`, on the seat trigger and its migration-time guard, on `organizationDashboard`, and in `config.toml`. Each states a decision from the rulings that the code cannot show: one constant for two refusals, a predicate true for every row until the publication requirement lands, a definer that cuts policy recursion, one enforcement point on every SQL path. A reader who deletes them loses the why.
- The two comments in `_contract.ts` (the viewer-read section marker and `retypeAccountAsOperator`). The contract file documents every member; a bare member would be the inconsistency.
- The paragraphs the audit marks "edited" in `_integration.ts`, `_live.ts`, `_pending.ts`, `_source-scan.ts`, `_contract.ts` and `_fixture.ts`. They are older than this branch. The review verdict's item 13 made this branch correct their falsified sentences. Deleting them is a different change from correcting them, and this item did not take it.
- The `comment on function` and `comment on policy` SQL statements. Catalog metadata, not comments.

The nine refactor flags, none taken here:

- Merging the four refusal constants into one factory: the two modules are separate on purpose, and the public answer union is closed. A factory would join them.
- Renaming `projectIsPublic` to say it is a stub: the name states the question the publication requirement will answer. The stub is the comment's job for now.
- Extracting the migration-time guard to a named function: a one-shot `do` block that runs once at migration time gains nothing from a name the catalog keeps forever.
- The `viewer_is_org_member` recursion note: the comment is the honest form; a naming convention would be a rule with no checker.
- `updateOrganization` and `assignVolunteerAsOperator`: both older than this branch.

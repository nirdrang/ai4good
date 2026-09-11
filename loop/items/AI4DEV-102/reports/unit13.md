# Unit 13 report: the publish gates, and the red that must stay honest

Worktree: `C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-102-unit0`.
No commit was made.

This file was written before the last checks, so a cancelled run still leaves a record.

## What landed

Two oracles, and no publish flow. AT-002.19 (unvetted publish blocked) and AT-002.20
(vetted publish to triage) stay red at both tiers. Their manifest entries do not change.
This unit turns no acceptance id green.

The publishing half of the shipped-decision oracle sits beside the funding assertion in
`tests/at/harness/shipped-org-vetting.selftest.ts`. It calls `publishingAllowed` directly.

The absent-publish-flow arm lives in `tests/at/suites/req-002/_source-scan.ts` as
`scanAbsentPublishFlow` / `absentPublishFlowProblems`. It has no acceptance id. AT-002.19
and AT-002.20 stay red on the missing publish flow.

The shipped decision was not changed. `publishingAllowed` already refuses the unverified
tier, permits the founder-vetted tier, and names that condition in the refusal. A second
decision would have been a workaround. The function is not wrong.

## The publishing permissibility

The function is the one thing the vetted condition gates. No publish route consults it
yet. The selftest asserts both answers and the refusal wording:

- founder-vetted: `{ ok: true, value: 'vetted' }`
- unverified: `{ ok: false, reason: 'publishing needs a founder-vetted organisation — this organisation is not founder-vetted' }`

A green there says the shipped decision answers that way. It does not say a publish route
exists, that a project enters triage, or that AT-002.19 or AT-002.20 is green.

The selftest lane is the same reason the funding oracle gives: an acceptance body that
called this function and went green would claim a publish route this tree does not have.

## How the arm tells publishing a project apart from sending a notification or rendering a page

Publishing a project is a write that takes a project from scoped (or draft) into
publication or triage. The notification emitter sends and delivers events. A public
project page renders a row. Neither writes a project's publish state.

The split is the subject of each name and each scheduled statement, not a count of the
word "publish".

- A name is a project-publish write when it names publishing, a project visibility, a
  project lifecycle or state, or a triage queue.
- A name is not that write when it is the public-page read (`public-project`,
  `read_public_project`, `projectIsPublic`), the permit (`publishingAllowed`), a
  notification send or deliver (`emit_notification`, `apply_delivery_results`), or an
  account lifecycle (`set-account-lifecycle`, `accounts.lifecycle`).
- The taxonomy's `triage.*` wire names are event names for a flow that does not exist
  yet. They are not a triage queue. The arm does not read quoted copy, so "you may
  publish" and `'triage.approved'` stay silent.

The arm scans surface names (route folders, write routes, RPCs, shared modules, UI
routes), SQL table / function / type names, columns on `create table` and `alter table
add column`, cron statements, and triggers on `public.projects`. Empty product source,
no migrations, or no `create table public.projects` throws.

The third check is the one an absent route cannot cover. A cron job that writes
`public.projects`, or a trigger on `public.projects` that names a publish, scope,
visibility, triage, or aging action, would stop a project sitting at scoped indefinitely
without any publish route existing at all. The two seat-constraint triggers on projects
do not name those actions and stay silent.

A write named `go-live.tsx` escapes it. A jsonb field holding a publish flag under
another word escapes it. That is why AT-002.19 and AT-002.20 stay red: this arm covers
the absence this tree can show, not a publish route or a triage queue that is not here.

The selftest drives constructed refusals (a `publish-project` route, a `publish_project`
RPC and SQL function, a `triage-queue` module, a `visibility` or `state` column on
projects, a `triage_queue` table, cron that updates projects or calls `age_projects`, a
trigger that ages a scoped project) and constructed silence (the public page, the
permit, notification send, account lifecycle, seat triggers, cron that retries
deliveries). The real tree is clean.

## What this unit must not do, and did not do

- `tests/at/expected/req-002.json` is untouched. Both ids stay exactly as they are.
- No publish route, triage queue, project state column, scope state, or stand-in for any
  of them.
- No new `WRITE_ROUTES` row, migration, edge function, table, enum value,
  `TENANT_CATALOG` row, refusal kind, or `viewer_` helper.
- No second publishing decision, and no change to the one that ships.
- No new harness machinery. The source arm sits beside the existing arms. The
  shipped-decision selftest sits beside the funding assertion in the same file.
- The local stack was not stopped.

## The checks

Run in the worktree. Exact exit status of each:

1. `bun run typecheck` — `typecheck OK: all three projects clean`, exit 0.
2. `bun run at:check req-002` — `27 P0 in the acceptance file, 27 registered in the suite`, `RESULT: 27 P0 ids in bijection`, exit 0.
3. `bun run at:selftest` — `Test Files 21 passed (21)`, `Tests 363 passed (363)`, exit 0.
4. `bun run at:verify req-002 --tier loop --expect` — `27 P0: 20 green, 7 red, 0 missing`, matches the declaration, AT-002.19 red, AT-002.20 red, exit 0.
5. `bun run at:verify req-001 --tier loop --expect` — `38 P0: 33 green, 5 red, 0 missing`, exit 0.
6. `bun run at:verify req-016 --tier loop --expect` — `12 P0: 12 green, 0 red, 0 missing`, exit 0.
7. `bun run at:verify req-002 --tier integration --expect` — `27 P0: 19 green, 8 red, 0 missing`, matches the declaration, AT-002.19 red, AT-002.20 red, exit 0.
8. `bun run at:verify req-001 --tier integration --expect` — `38 P0: 27 green, 11 red, 0 missing`, matches the declaration, exit 0.
9. `bun run at:verify req-016 --tier integration --expect` — `12 P0: 12 green, 0 red, 0 missing`, exit 0.

The acceptance counts did not move: twenty green at the loop tier and nineteen at
integration, for requirement 002.

## Where the design of record was not followed, and why

The design of record keeps AT-002.19 (unvetted publish blocked) and AT-002.20 (vetted
publish to triage) red at both tiers, and forbids a write-route row for publishing. This
unit follows that. A publish flow that does not exist cannot be proved, and a stand-in
for it would be a claim that it does.

## Least sure

Whether a reviewer would rather flag every trigger on `public.projects`, including the
two seat-constraint triggers that already exist. That reading would make the real tree
dirty without a publish flow. The arm flags a trigger on projects only when the
statement names a publish, scope, visibility, triage, or aging action, because those
are the actions that would stop a project sitting at scoped indefinitely.

## What the lead changed in review, 2026-09-11

Two things, neither in the arm's judgment.

`isProjectPublishName` carried a guard on the word `publishable` that could never change the answer:
the check below it does not match that token either, so both paths returned false. The guard is
gone.

`src/routeTree.gen.ts` had a generated block added to it again, as in the zero-credit unit. Nothing
in this unit touches the router and a fresh typecheck does not reproduce it, so it is tooling drift.
The lead reverted it.

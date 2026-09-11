# Unit 0 report: the acceptance suite for the NGO profile and vetting requirement, all red

Worktree: `C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-102-unit0`. Nothing under
`supabase/` or `src/` changed. Nothing under `tests/at/suites/req-001/` or `req-016/` changed.
No commit was made.

## What landed

Harness, two edits:

- `tests/at/harness/suite-adapters.ts`: the `'req-002'` line in `AdapterModules`, between the
  two that exist.
- `tests/at/harness/config.ts`: two dotted keys, `req-002.discovery.daily_credits.unverified`
  and `req-002.discovery.daily_credits.vetted`, mapped to the two pins that already exist in
  `atconfig.ts`. No new pinned number. The literals 10 and 30 appear in no test file.

Suite, `tests/at/suites/req-002/`, eleven files:

- `_bind.ts`: `bindSuite({ requirement: 'req-002', sut: 'organizations' })`, the bound
  `AtContext` and `OpenWorld`, and the re-exports the other suites carry, plus
  `CapabilityPending`.
- `_contract.ts`: the seam. Domain objects first (profile, vetting record, vetting audit row,
  allowance, spend row, notification rows, the two pure policies), then `OrganizationsSut`, then
  `World`. Judgement types are imported from the shipped modules: `WriteRefusalKind`,
  `Decision`, `OrganizationDashboard`, `PublicProjectView`, `NotificationEventRow`,
  `DeliveryRow`.
- `_fixture.ts` and `_live.ts`: both export `requirement = 'req-002' as const`. Every member
  of the sut is `notLanded('<member>')`, which throws
  `REQ-002 <loop|live> adapter: sut.organizations.<member> has not landed`. A later unit
  replaces one entry of the object literal per member. The fixture world is real in both
  adapters: `email(local)` namespaces an address per world.
- `_pending.ts`: `LEAF` (the thirteen manifest leaves, D1.L1 to D5.L3, with a recall hint each),
  `notLanded(leaf)` which throws `AtPending(ctx.atId, 'sut-missing', ...)`, `AWAITED` (the six
  surface names the red set waits on) and `awaiting(...surfaces)` which throws
  `CapabilityPending`. `awaiting` takes no context so it fits the integration slot of a per-tier
  map.
- Six test files with twenty-seven `atTest('AT-002.…'` call sites, per the base's section 5.1
  layout: `a-org-profile` (01, 02), `b-allowance` (04, 05, 26, 27, 06, 07, 08, 10, 31),
  `c-vetting-action` (11, 11b, 29, 30, 12, 13, 14), `d-evidence-rule` (16, 17, 18), `e-gates`
  (19, 20, 28, 21, 22), `f-public-claims` (23). Each title is the criterion shortened; the
  grant numbers are named as "the unverified pin" and "the vetted pin", not as digits.

Manifest, `tests/at/expected/req-002.json`: all twenty-seven ids at both tiers, zero green.

- The eight ids of the design of record's red set are `capability-pending`, with the surface
  named from the table's "waits on" column: AT-002.10 and .31 `checkout.project-fuel`;
  AT-002.12 `publish.flow, checkout.project-fuel`; AT-002.19 `publish.flow`; AT-002.20
  `publish.flow, triage.queue`; AT-002.23 `ui.public-listing-screens`; AT-002.26
  `checkout.project-fuel, billing.funded-turn`; AT-002.05 `ui.discovery-surface` at
  integration only, and `pending / sut-missing` at loop.
- Every other id is `pending / sut-missing` at both tiers.

## The six commands, exact results

Run in the worktree. `node_modules` was absent in the fresh worktree, so
`bun install --frozen-lockfile` ran first (exit 0, 529 packages); it is ignored by git.

1. `bun run typecheck` — `typecheck OK: all three projects clean`, exit 0.
2. `bun run at:check req-002` — `27 P0 in the acceptance file, 27 registered in the suite`,
   `RESULT: 27 P0 ids in bijection`, exit 0.
3. `bun run at:verify req-002 --tier loop --expect` — `27 P0: 0 green, 27 red, 0 missing`,
   `EXPECTED: the run matches ... req-002.json exactly (0 declared green, 27 declared red)`,
   exit 0.
4. `bun run at:selftest` — `Test Files 19 passed (19)`, `Tests 293 passed (293)`, exit 0.
5. `bun run at:check req-001` — `38 P0 ... 38 registered`, `RESULT: 38 P0 ids in bijection`,
   exit 0. `bun run at:check req-016` — `12 P0 ... 12 registered`, `RESULT: 12 P0 ids in
   bijection`, exit 0.
6. `bun run at:verify req-001 --tier loop --expect` — `38 P0: 33 green, 5 red, 0 missing`,
   matches the declaration, exit 0. `bun run at:verify req-016 --tier loop --expect` —
   `12 P0: 12 green, 0 red, 0 missing`, matches the declaration, exit 0.

The integration tier was not run and the database was not reset.

## Where the task text and the design disagreed, and what I did

- The task says the base's section 5.2 gives a full sut type. The base
  (`candidate-1b-vetting-aggregate.md`) has a section 5 with no sut type. The only candidate
  with one is `candidate-2-allowance-ledger.md`, section 5.2 (`OrganizationsSut`). I used that
  as the starting point and reshaped it to the design of record: no trust-tier enum (the
  aggregate's `vetted` boolean instead), the spend ledger with `granted` as the high-water mark
  (graft G1 and G2), a `read` and a `debit` operation on one allowance route, an operator write
  of a spend row for the persisted-day reset (correction C3), an operator write of an aggregate
  row for the schema arm of AT-002.11b, the two pure policies as consults with no route, and
  the profile route reaching both first completion and later edits (graft G6).
- The base's section 5 says the new suite wraps the auth suite's adapters. The task says every
  member of this suite's sut is unimplemented and the auth suite is not touched, so the two
  adapters here are standalone with every member throwing. The unit that lands the first member
  decides whether to reach the auth suite's factories.
- The base names `_integration.ts` and `_source-scan.ts` in the layout. Neither exists yet:
  there is no integration body and no source scan to hold. The unit that writes the first one
  creates the file.
- The design's correction C4 (a rollback after the audit row is written and the emit then
  fails) has no member in the sut yet. The design forbids new fault machinery, and how the
  failure is induced without one is a decision for the unit that lands the emit. See the last
  section.

## The seam a later unit is most likely to change

`setVetting` and the shapes around it. Three pressures meet there:

1. The request type accepts `VettingRequest & Record<string, unknown>` so a body can send an
   attachment or a document body and prove the refusal. Once `_shared/org-vetting.ts` ships,
   the request and the evidence vocabulary should be imported from it, and the local
   `VetEvidence` type retires.
2. `VettingOutcome` carries `notificationEventId: string | null`; null covers an unvet that
   changed nothing. If the definer returns the id under a different shape, this changes.
3. Correction C4 needs a way to make the emit fail after the audit write. That is likely one
   new sut member, or a new argument on `setVetting`, and it is the change I could not
   anticipate without deciding the mechanism for unit 3.

A smaller likely change: `VettingAuditRow.detail.current` is typed as the full
`VettingRecord`; if the definer snapshots the row with SQL column names rather than the
camel-cased projection, the read-back maps or the type changes.

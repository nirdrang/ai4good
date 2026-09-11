# Unit 3 report: unvet, and the vetting outcome through the shared emitter

Worktree: `C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-102-unit0`.
No commit was made.

## What landed

The definer `public.set_organization_vetting` now emits inside the same transaction that writes the aggregate and the audit row. TypeScript computes the notice. SQL resolves the recipient and builds the write set. `public.emit_notification` is the only writer of the three notification tables.

Graft G3, the notice:

- `vettingOutcomeNotice(outcome)` in `supabase/functions/_shared/org-vetting.ts` reads the shipped `vetting.outcome` taxonomy row and `renderCopy`, and returns `{ channels, copy }`.
- `decideOrganizationVetting` passes that object as `p_notice`.
- The definer takes `p_notice` as a required jsonb argument, placed after `p_action` so it has no default.
- SQL does not hard-code channels or copy. It validates that `channels` is a non-empty array and that copy subject and body are present, then refuses an empty delivery set. It derives the payload `outcome` from the column it just wrote, so the wire cannot disagree with the record.
- The recipient is the organisation's seat holder, resolved inside the transaction, with the Auth email the definer already reads.

Graft G4, named copy:

- One `NAMED` entry for `vetting.outcome` in `notification-copy.ts`. A vet and an unvet each have their own sentence. Neither sentence contains the word "verified".
- Confirmed before relying on it: no suite reads `NAMED`. `tests/at/suites/req-016/` has its own `NAMED_SAMPLES` of payload keys. `PAYLOAD_PREDICATES` has no row for `vetting.outcome`. AT-016.02 / AT-016.03 compare taxonomy registration, not copy.

The two refusals unit 1 left uncovered, now load-bearing for the emit:

- An organisation with no seat holder is refused. No aggregate row, no audit row, no event.
- A seat holder with no email address is refused the same way.

Correction C4, the late failure:

- One body on AT-002.13 calls the definer as the operator with a notice whose `channels` is `['not-a-channel']`.
- The empty-channel check passes, so the aggregate and the audit row are written.
- `emit_notification` then fails the `notification_channel` enum cast on the delivery insert.
- Afterwards there is no vetting row, no audit row, no event, and no delivery.

AT-002.13 and AT-002.14 are green at both tiers. AT-002.12 stays `capability-pending` on `publish.flow` and `checkout.project-fuel`.

## The nine commands

Run in the worktree. Exact exit status of each:

1. `bun run typecheck` — `typecheck OK: all three projects clean`, exit 0.
2. `bun run at:check req-002` — `27 P0 in the acceptance file, 27 registered in the suite`, `RESULT: 27 P0 ids in bijection`, exit 0.
3. `bun run at:selftest` — `Test Files 20 passed (20)`, `Tests 313 passed (313)`, exit 0.
4. `bun run at:verify req-002 --tier loop --expect` — `27 P0: 6 green, 21 red, 0 missing`, matches the declaration, exit 0.
5. `bun run at:verify req-001 --tier loop --expect` — `38 P0: 33 green, 5 red, 0 missing`, exit 0.
6. `bun run at:verify req-016 --tier loop --expect` — `12 P0: 12 green, 0 red, 0 missing`, exit 0.
7. `bun run at:verify req-002 --tier integration --expect` — `27 P0: 6 green, 21 red, 0 missing`, matches the declaration, exit 0.
8. `bun run at:verify req-001 --tier integration --expect` — `38 P0: 27 green, 11 red, 0 missing`, matches the declaration, exit 0.
9. `bun run at:verify req-016 --tier integration --expect` — `12 P0: 12 green, 0 red, 0 missing`, exit 0.

Number 9 is the first product caller of the emitter. The notifications suite stayed green. Sole-writer oracles still report exactly `['notifications.emitter']` and an empty stray-writer list.

## How the late failure is induced, and why that is honest

The operator calls `public.set_organization_vetting` with a complete vet and a notice whose channels are `['not-a-channel']`. Copy is the real named copy. The definer's empty-delivery check passes because the array is not empty. The aggregate insert and the audit append therefore run. `emit_notification` then inserts the event and fails on the delivery row, because `'not-a-channel'` is not a value of `notification_channel`.

That is honest because it is a real schema refusal inside `emit_notification`, after the two product writes, in the same transaction. It is not a `RAISE` planted in the product, and it is not a new fault switch. The TypeScript route cannot produce this notice; only the operator can, which is the same posture AT-002.11b already uses for a direct schema write. The empty-channel check is still there, so a caller cannot commit a vet with no deliveries.

## Where the design of record was not followed, and why

- `p_notice` was added to the definer's argument list. Unit 1's report asked whether the emit could be an insertion without that. Graft G3 requires TypeScript to compute the notice and pass it in, so the argument is required. It sits after `p_action` and has no default, because PostgreSQL forbids a required argument after a defaulted one.
- The emit was inserted into the existing migration `20260914120000_org_vetting.sql`, not added as a later DROP/CREATE. The instruction was an insertion, not a rewrite. Integration resets the database and replays every migration, and that run applied 17 files including this one.

## Least sure

Whether the lead would rather see a follow-on migration that drops the old 13-argument function and creates the 14-argument one, instead of editing the unit-1 file that is already on the item branch. The reset path does not care. A reviewer reading the unit-1 commit in isolation would see a definer that does not yet emit.

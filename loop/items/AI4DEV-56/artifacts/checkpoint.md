# Throughput checkpoint (Feature step 3)

Written after the design closed (`arena/design.md`). Four items.

## Blocking first steps

1. **The static scan grows before any new table lands** (R4): `WRITE_PRIVS` gains `references` and `trigger`, the baseline revoke must name `service_role`, one selftest case each. This is unit 4's whole deliverable plus its record, and it is a prerequisite of unit 1's migration, so it is built first.
2. **The trigger-depth discriminator is measured before unit 5's migration** (R3): `unlink-depth-probe.ts` runs on the live stack now, by the lead. Its result decides whether the `WHEN (pg_trigger_depth() = 0)` form ships.
3. **The founder's declare-or-stub answer** for AT-001.30 and AT-001.31 (brief fact 7). Asked, not answered. Units 1, 3, 4, 5 and 6 do not depend on it. Unit 2's two bodies do; they are built under DECLARE, and the design states the one-commit-group change for stub.

## Independent workstreams

- Unit 4 (scan growth plus record) has no dependency and lands first.
- Unit 6 (the local rate-limit record) has no dependency; the lead writes it from the measurements already taken.
- The unit 5 depth measurement has no dependency on units 1 to 3; the migration and the doc-sync fold wait for unit 1's `_live.ts` helpers (`authDelete`).
- Unit 1 (lifecycle column, gate, inventory, `writeRoute`, transfer, escalation contact, audit table) is the long pole. Unit 2 (conformance scan, lifecycle setter, AT-001.29 to .31) and unit 3 (role-change trigger, AT-001.33, AT-001.34 declared) both depend on unit 1's inventory and audit table, and on each other through the shared harness files, so they are sequential after it.

## Shared mutable state

- **One database stack.** Every integration run resets it. Two writer lanes running integration at once would corrupt each other's Given, so integration runs are serialised by the lead, one lane at a time; a lane runs the loop tier and the selftests in its own worktree, and the lead runs integration on the merged branch.
- **One branch, one primary worktree.** No writer lane touches this checkout. Each lane gets a dedicated worktree off the current head; its result comes back as a diff the lead applies, or commits on a lane branch the lead merges.
- **Harness files several units touch:** `_contract.ts`, `_fixture.ts`, `_live.ts`, `_integration.ts`, `_pending.ts` (the `LEAF` map), `_policy-scan.ts`, `expected/req-001.json`, `config.toml`. Sequential units avoid merge conflicts; no two lanes edit them at once.
- **`supabase/functions/_shared/edge.ts`.** Unit 1 unexports `callDatabaseFunction` and adds `writeRoute`; the three existing routes are rewritten in the same commit group, so no intermediate commit has a route with no way to the database.

## Smallest safe decomposition

Build order: unit 4, unit 1, unit 2, unit 3, unit 5, unit 6. The brief numbers them 1 to 6; unit 4 moves first because R4 makes it a prerequisite of unit 1's tables, and unit 6 moves last because it is a record with no code. Each unit is one delegated lane in an isolated worktree, one commit group, green (typecheck, `at:check`, `at:selftest`, loop `--expect`, integration `--expect`) before the next starts. Lanes per the sheet: unit 1 to the hardest-tasks lane (fable at max), because the writer designs `writeRoute`, the standing loader and the transfer definer from the sketch; units 2, 3 and 5 to the feature lane (grok at xhigh), because their contracts are fixed by unit 1 and the design; unit 4 to the feature lane; unit 6 the lead. The doc-sync fold for AT-001.41 (unit 5) runs in this checkout by the lead, because it edits the requirement source and the decomposition, which are not a writer's territory.

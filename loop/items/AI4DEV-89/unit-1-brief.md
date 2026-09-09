# Unit 1: the notification spine

You are the writer for unit 1 of the notifications backend run. You own the code. The lead owns the
design, reviews your diff, and judges the evidence.

Working directory: `C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-89`. You work there and
nowhere else. Do not `cd` to the parent repository. Do not create a worktree.

## Read these first, in this order

1. `loop/items/AI4DEV-89/design.md`. The lead's synthesis. It names the base and seven overrides.
   Where it and any other document disagree, it wins.
2. `loop/items/AI4DEV-89/lanes/arena/candidate-d-ports-and-adapters.md`. The base design, in full.
   This is your specification. Read all of it.
3. `loop/items/AI4DEV-89/lanes/how-explanation.md`. How this codebase works, checked against the tree.
   Read the sections on the harness, the database posture, and the standing gates.
4. `tests/at/suites/req-016/_contract.ts`, `taxonomy.ts`, `_fixture.ts`, `_bind.ts`, `_oracles.ts`.
5. `tests/at/suites/req-016/a-emitter-and-taxonomy.test.ts`. The two ids you must turn green.
6. `tests/at/suites/req-001/_live.ts`, `_integration.ts`, `_source-scan.ts`, `_policy-scan.ts`,
   `_write-route-scan.ts`. The patterns to copy. `_live.ts` and `_integration.ts` are very large, so
   read them in bounded slices rather than whole.
7. `supabase/migrations/20260908120000_account_lifecycle_audit_and_contact_transfer.sql`. The worked
   example of an atomic multi-statement write and of the definer conventions.

## What already exists

An earlier lane started this unit and was stopped part way, by founder ruling, to move the seat to a
lower effort. Its work is kept because it typechecks clean. You continue from it. You do not start
again, and you do not preserve it out of politeness either. Read what is there, judge it against the
design, and change anything that is wrong.

Already landed as commit `f0cc1ee`, "the notification outbox schema, its fixture producer, and the
SMTP port". Read that commit with `git show f0cc1ee --stat` and then read the files it touched.

Already written and uncommitted, all four product modules plus one suite module. They typecheck under
all three projects. Read each one before you touch it.

- `supabase/functions/_shared/notification-taxonomy.ts`
- `supabase/functions/_shared/notification-copy.ts`
- `supabase/functions/_shared/notification-provider.ts`
- `supabase/functions/_shared/notifications.ts`
- `tests/at/suites/req-016/_fixture-producers.ts`

Typechecking clean is not the same as being right. Nothing has run against the acceptance suite yet.
Check each file against the design and against the tests it must satisfy, and say in your report what
you kept, what you changed, and why.

## What unit 1 delivers

The spine. Unit 1 is not the emitter alone and cannot be, because AT-016.01 at the integration tier
fires three events, drains them, and reads the delivered copy. So the tables, the emitter, the worker,
the provider, the world and the seam all arrive together. The design says this and explains why.

Build, in an order where each step is verifiable before the next.

1. **Migration, the outbox schema.** The five tables, the enums, the sequence, `emit_notification`
   and `apply_delivery_results`, exactly as candidate D specifies, with design.md override 1 applied
   to `notification_deliveries` (tenant-isolated, `grant select to authenticated`, the own-in-app
   policy) and override 2 applied (the `accepted_at` and `provider_receipt` columns). Every table gets
   its baseline revoke and row-level security. Every function gets `security definer`,
   `set search_path = ''` and `revoke execute from public`.
2. **Migration, the fixture producers.** `notification_fixture_transitions` and
   `fixture_commit_transition_and_emit`, in their own migration file so a later change can drop them
   without touching the outbox schema. The fault branch and the sequence bump belong to unit 5, so
   leave the fault parameter in the signature and make it raise, but do not build the arming seam yet.
   If it is simpler and cleaner to land the fault branch now, land it; say which you chose.
3. **`TENANT_CATALOG` rows** in `tests/at/suites/req-001/_policy-scan.ts` for all five tables, in the
   same commit as the migration. Four are `unreachable-by-client-roles`. `notification_deliveries` is
   `tenant-isolated`.
4. **`supabase/functions/_shared/notification-taxonomy.ts`.** The forty-eight rows as a typed const,
   `Role`, `Channel`, `EventClass`, `DEFAULT_BY_CLASS`, `documentedDefaults()`, `channelsFor(row)`.
   Apply design.md override 6: the module validates every row against the class channel rule when it
   loads and throws naming the offending row, so an illegal documented default cannot be constructed.
   Pure. No Deno, no fetch, no clock, relative `.ts` imports only.
5. **`supabase/functions/_shared/notification-copy.ts`.** Subject and body rendering per event. Unit 1
   needs only enough copy for the three events AT-016.01 fires. Unit 2 grows it. Do not stub the other
   forty-five with placeholder text that a later unit must find and replace; render from a general
   template and let unit 2 specialise the rows that name payload keys.
6. **`supabase/functions/_shared/notifications.ts`.** The six port types, the branded `WriteSet`,
   `prepareWriteSet`, `createNotifications`, `SENDER_DECLARATIONS`, `NOTIFICATION_COMPONENTS`. Pure.
   The brand is load-bearing: the symbol is `declare`d and never exported, so nothing outside this
   module can build a `WriteSet` without a cast.
7. **`supabase/functions/_shared/notification-provider.ts`.** Design.md override 3. The one product
   module that speaks to a mail provider. `ProviderPort` over SMTP using `node:net`. Host, port, sender
   and timeout are constructor arguments. No module-level environment read. It must type-check under
   `tests/at/tsconfig.json` and run under Bun. This file is the single expected entry in the source
   oracle's result.
8. **`supabase/config.toml`.** Uncomment `smtp_port = 44325`. Add the key rather than changing
   `[local_smtp] port`, so the four fields `configDriftProblems` holds do not move. The stack must be
   stopped and started once after this change. `supabase db reset` does not reload the config.
9. **`tests/at/suites/req-016/_source-scan.ts`.** Three oracles per design.md override 5:
   `providerClientImporters()`, `taxonomySeedProblems()`, `strayNotificationWriters()`. Follow
   `tests/at/suites/req-001/_source-scan.ts` exactly in shape, including its rule that the oracle
   throws rather than reporting an absence it did not measure.
10. **`tests/at/suites/req-016/_mail-witness.ts`.** Design.md override 4. Reads Mailpit's own message
    list. Counts physical messages. Never groups or de-duplicates by `Message-ID`.
11. **`tests/at/suites/req-016/_fixture-producers.ts`.** The sample payloads both bindings' producers
    supply. Producer data, not emitter behaviour.
12. **`tests/at/suites/req-016/_fixture.ts`, rewritten as the loop binding of the ports.** Candidate D
    section "What survives of `_fixture.ts` and what is deleted" is the specification. Roughly sixty
    percent of the current file is deleted and re-lands as product code. `NotificationFixtureWorld`
    survives whole, because `WorldOf<'req-016'>` derives from it. Keep the `event-${n}` id scheme.
13. **`tests/at/suites/req-016/_live.ts`.** The integration binding. Exports
    `requirement = 'req-016' as const` and `createLiveAdapter({ stack })`. Unit 1 lands the spine plus
    named refusals. Every method a later unit owns throws `new CapabilityPending([...])` naming
    itself, exactly as `req-001`'s live adapter does. Scope every system-under-test read to the open
    world's actor ids. This is not optional and it is why this design won: AT-016.09 opens twenty-two
    worlds against one database.
14. **`tests/at/suites/req-016/_integration.ts`.** The AT-016.01 integration procedure.
15. **`a-emitter-and-taxonomy.test.ts`.** AT-016.01 becomes a per-tier map with an `integration:`
    procedure, and its first assertion moves from `h.static.providerClientImporters()` to the suite's
    own `providerClientImporters()` at both tiers. AT-016.02 stays a single body. Do not weaken either
    assertion. The id registrations stay in this file and stay exactly twelve across the suite.
16. **The two harness selftests.** `tests/at/harness/live-refusal.selftest.ts` and the two assertions
    in `tests/at/harness/conformance.selftest.ts` that name `req-016` as the example of a suite with
    no live adapter. That stops being true the moment you create `_live.ts`. Re-point them at a
    requirement id that has no adapter. The rule under test does not change, only its example. Add
    nothing to the harness.
17. **`tests/at/expected/req-016.json`.** In the same commit that makes them pass: AT-016.01 and
    AT-016.02 green at both tiers. Every other id declared red at integration on exactly the
    capability names your live adapter throws. `--expect` compares the whole refusal string, so the
    names and their order must match your `CapabilityPending` arguments exactly.

## What unit 1 does not deliver

Do not build the taxonomy matrix payloads, the evidence capture, the anti-spam guard, the fault
arming seam, the provider fault decorator, or the retry semantics beyond what AT-016.01 and AT-016.02
read. Units 2 to 6 own those. Do not touch `src/`. Do not add a function directory under
`supabase/functions/`. Do not add a `WRITE_ROUTES` row.

## Success criteria

Every one of these must pass on your final tree. Run them yourself and paste the exact output into
your report.

```
bun run typecheck
bun run at:check req-016
bun run at:selftest
bun run at:verify req-016 --tier loop --expect
bun run at:verify req-016 --tier integration --expect
bun run at:check req-001
bun run at:verify req-001 --tier loop --expect
bun run at:verify req-001 --tier integration --expect
```

The auth suite runs at both tiers because the live catalog check and the write-gate conformance check
live there, and five new tables plus three new definers change their result.

The local Supabase stack is already running. If you change `supabase/config.toml` you must stop and
start it. Never paste the output of `bun run db:start` into any file, any commit message or your
report. It contains keys, and GitHub's push protection refuses any push whose commits quote them.

## How to work

- Commit as you go, in ordered commits, in the item worktree, on the current branch. Do not open a
  pull request. Do not merge anything. Do not touch the board.
- Match the surrounding style. This tree writes long explanatory comments at the top of a module
  saying why it exists and what attack it closes. Follow that where it earns its place. Do not write
  narrating comments inside a function body. The assertion or the log string is the documentation.
- No long-dash characters anywhere, in code, comments, or prose. No mid-sentence colons used as
  connectors in prose.
- If you find that the design is wrong about something in the tree, stop and say so in your report
  rather than silently working around it. The lead would rather hear it than find it later.
- If a success criterion cannot pass, do not adjust the test or the manifest to make it pass. Report
  the red with its exact output.

## Deliverable

Write a full report to `loop/items/AI4DEV-89/lanes/unit-1-report.md`. It contains every command you
ran with its exact output, every file you created or changed with one line on what it does, every
place you deviated from the design and why, and anything you could not do.

Then reply with exactly five lines and nothing else:
line 1: the report path
line 2: the commit shas you made, oldest first
line 3: pass or fail for each of the eight success criteria, in order, as one line
line 4: the single largest risk you are handing to unit 2
line 5: any deviation, blocker or red, or the word NONE

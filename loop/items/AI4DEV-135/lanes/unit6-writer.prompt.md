You are the writer for unit 6 of the scope run, "Regeneration". You apply a fixed design; you do
not redesign it. Working directory: your own git worktree on branch `lane/ai4dev-135/unit6`, cut
from the item branch after unit 5 merged. Commit there. Never touch any other folder. Never push.

## Read first, in this order
1. `loop/items/AI4DEV-135/design/SYNTHESIS.md`: decisions 4, 5 and 8, "Data" migrations D1 and
   D2, "The route" (`regenerate`), "The chat side" (the retry line), the taxonomy rows, "Pins",
   the suite table rows for AT-004.37 to .39, "Build order" item 6, and the last section
   "Rulings at the unit 4 gate" (no turn ceiling exists; the regeneration_exhausted requirement
   line was added in unit 5).
2. `loop/items/AI4DEV-135/design/how.md`, "(6) Bounded regeneration at zero credits", and the
   verbatim text of AT-004.37, .38 and .39 under "The sixteen acceptance ids".
3. `loop/items/AI4DEV-135/brief.md`, Unit 6.
4. Units 1 to 5 as merged: `supabase/migrations/20260924120000_discovery_scopes.sql`,
   `20260924130000_cause_labels.sql` (the current `discovery_scope_begin` and `commit`; do not
   edit either file, re-create the functions in the new migration the way unit 4 did),
   `20260924140000_discovery_guardrails.sql` (the current `discovery_turn_reserve` and
   `discovery_turn_settle`), `20260920120000_discovery_turns.sql` (the CHECKs and the
   `discovery_billing` enum), `supabase/functions/_shared/scope.ts`, `scope-copy.ts`,
   `discovery-turn.ts`, `discovery-reads.ts`, `discovery-metering.ts`, `notification-taxonomy.ts`,
   `notification-copy.ts`, `write-routes.ts`; tests `tests/at/harness/atconfig.ts`, `config.ts`,
   `tests/at/suites/req-004/_source-pins.ts`, `_contract.ts`, `_fixture.ts`, `_live.ts`,
   `a-metering.test.ts` (operator reserve and settle; AT-004.49's assertions must keep passing),
   `g-scope-output.test.ts`, `h-cause-labels.test.ts` (operator begin and commit),
   `e-guardrails.test.ts` (the unit 5 notification assertions, to copy the shape),
   `z-later-runs.test.ts`, `tests/at/expected/req-004.json`; `tests/at/suites/req-016/taxonomy.ts`,
   `_fixture-producers.ts`, `tests/at/expected/req-016.json`.

## What unit 6 lands
- Pin: `DISCOVERY_REGENERATION_BOUND = 3` in `discovery-metering.ts`; registry entry
  `discoveryRegenerationBound` (unit `regenerations`, source `architecture notes REQ-004 "up to
  3x"`), dotted key `req-004.discovery.regeneration_bound`, `_source-pins.ts` equality.
- Migration D1 `supabase/migrations/20260924150000_discovery_billing_retry.sql`, alone:
  `alter type public.discovery_billing add value 'retry';` (a new enum value cannot be used in
  the transaction that adds it, so it gets its own file).
- Migration D2 `supabase/migrations/20260924150100_discovery_retry_and_regeneration.sql`:
  - `alter table public.discovery_turns add constraint discovery_turns_retry_touches_no_credits
    check (billing <> 'retry' or (reserved_credits = 0 and coalesce(charged_credits, 0) = 0));`
  - `discovery_turn_reserve` (re-create the current one): `v_billing` is `'fuel'` when funded;
    else `'retry'` when the project's latest turn by `seq` is `failed` and its `user_message =
    btrim(p_message)`; else `'free'`. The retry branch sizes the reservation like free (allowance
    read, `max_output` from the settings, `reservation_is_the_bound` holds) but sets
    `reserved_credits = 0` and debits nothing; `utc_day` from the read. Guardrails stay active on
    retry (it is a free turn that costs nothing).
  - `discovery_turn_settle` (re-create): on `completed` with billing `retry`, `charged_credits =
    0` and no release; `settled_is_measured` only binds free, so nothing else changes.
  - `discovery_scope_begin` (re-create) on `regenerate`: a `current` row must exist else
    `scope-not-generated`; `p_reason` trimmed non-empty else `invalid-request`; an `escalated`
    row exists → return `{ done: true, changed: false, escalated: true, scope, scopes, need }`;
    `used` = count of rows with `version > 1` and status not in (`failed`, `escalated`); `used >=
    (p_settings->>'regeneration_bound')::integer` → insert an `escalated` row (version `max + 1`,
    the reason, `settled_at = clock_timestamp()`, contract and markdown null), call
    `public.emit_notification` for `discovery.regeneration_exhausted` from `p_notice` (every
    active platform admin, email and in-app, payload `{ projectId, organizationId, regenerations,
    lastReason }`), and return `{ done: true, changed: true, escalated: true, ... }`; a
    `generating` row younger than `turn_deadline_seconds` → `generation-in-flight`, older → mark
    it `failed`; then insert `generating` version `max + 1` with the reason and return the
    snapshot as `generate` does. `p_settings` gains `regeneration_bound` in the numeric loop.
    `discovery_scope_commit` on `completed` already supersedes the `current` row; check it and
    leave it.
  - Seed: `insert into public.notification_event_types (event) values
    ('discovery.regeneration_exhausted') on conflict do nothing;`
- `scope.ts`: `decideDiscoveryScope` accepts `action: 'regenerate'` with a `reason` string
  (trimmed non-empty, else `invalid-request` 400), sends `p_reason`; `p_settings` gains
  `regeneration_bound: DISCOVERY_REGENERATION_BOUND`; `p_notice` is built the way unit 5 builds
  the settle notice. `renderScopeBegin` reads `escalated`; `scopeAct`'s pass-through sends
  `p_changed` as now. `renderDiscoveryScope.escalated` already reads rows and the flag.
  `SCOPE_COPY.regenerationExhausted` (the plain sentence the route answer carries when
  escalated; add `notice: string | null` to the scope answer only if the synthesis' answer shape
  needs it, else leave the copy for the notification only).
- `discovery-metering.ts`: `settlementFor` and `discovery-reads.ts` `billing` admit `'retry'`;
  `settlementFor` charges zero on retry. `turnViewFromSql` passes it through.
- Taxonomy: the TypeScript `TAXONOMY` row `{ event: 'discovery.regeneration_exhausted',
  recipients: ['platform_admin'], channels: ['email', 'inapp'], tone: 'normal', class: 'other',
  payloadKeys: ['projectId', 'organizationId', 'regenerations', 'lastReason'] }`, the same row in
  `tests/at/suites/req-016/taxonomy.ts` with its payload oracle, the copy in
  `notification-copy.ts`, and a fixture producer so AT-016.03 fires it at both tiers, exactly
  as unit 5 did for its row. The requirement text line already exists.
- SUT contract: `writeScope` request gains `{ action: 'regenerate'; reason: string }`;
  `OperatorScopeBeginInput` gains `action?: 'generate' | 'regenerate'` and `reason?: string`
  so the integration tier can regenerate without the model; `OperatorSettleInput.outcome`
  already admits `failed`. Fixture mirrors the retry choice and the bound with the same rules.
- Tests in a new `tests/at/suites/req-004/i-regeneration.test.ts`, moved out of
  `z-later-runs.test.ts`:
  - AT-004.37: loop through the route (script the elicitation, a scope, then two regenerations
    with reasons); integration through the operator begin and commit. Assert: each regeneration
    is a new version with its reason on the row, the previous row is `superseded`, the allowance
    remaining is unchanged across the whole sequence, `used` never exceeds the bound pin (from
    `h.config.get`), and a regenerate without a reason is refused `invalid-request`. Green both
    tiers.
  - AT-004.38: drive `used` to the bound pin (operator path at both tiers, the model is not
    needed for the escalation itself), then one more regenerate through the route: the answer is
    `ok: true, escalated: true`, an `escalated` row exists with the reason, no `generating` row
    exists, no model request was made (the sim's request count is unchanged at loop), exactly
    one `discovery.regeneration_exhausted` notification row exists, and a second regenerate
    answers `escalated: true` without a new row or a second notification. Green both tiers.
  - AT-004.39: operator reserve a free turn, settle it `failed`, then reserve the same message
    again: the new turn's billing is `retry`, `reserved_credits` 0, the allowance remaining is
    unchanged; settle it `completed` with usage: `charged_credits` 0 and the allowance still
    unchanged; then reserve a different message: billing `free` again. Green both tiers.
- `tests/at/expected/req-004.json`: .37, .38, .39 green at both tiers; `req-016.json` updated.

## Rules
- Match the surrounding code. Comments only for a non-obvious why. No feature beyond the list.
- The suite rules: tests through the SUT; capture once, assert many; pins from `h.config.get`,
  never a literal.
- Never paste a key or token into a committed file.
- If the synthesis is silent, follow the nearest existing pattern and note the choice in the
  report. If it is wrong about the tree, stop that part, keep the rest, and name it under
  "Deviations".

## Verify before you commit, in this order, and record each exit code
1. `bun run typecheck`
2. `bun run at:check req-004`
3. `bun run at:selftest`
4. `bun run at:verify req-004 --tier loop --expect`
5. `bun run at:verify req-001 --tier loop --expect`
6. `bun run at:verify req-016 --tier loop --expect`
7. `bun run build`, then `git checkout -- src/routeTree.gen.ts` if the build dirtied it; never
   commit that file.

## Commit and report
One commit, message starting `AI4DEV-135: unit 6,`, plain sentences. Write
`loop/items/AI4DEV-135/lanes/unit6-writer.report.md` (Landed, Verify with exit codes and
counts, Deviations or "none", Choices the synthesis left open or "none") and include it in the
commit. Reply with five lines at most: the commit sha, the seven exit codes, the report path.

You are the writer for unit 5 of the scope run, "Free-phase guardrails". You apply a fixed
design; you do not redesign it. Working directory: your own git worktree on branch
`lane/ai4dev-135/unit5`, cut from the item branch after unit 4 merged. Commit there. Never touch
any other folder. Never push.

## Founder rulings for this unit (2026-09-18)
- Turn ceiling: `DISCOVERY_TURN_CEILING = <<TURN_CEILING>>` settled turns per project.
- Off-topic strikes: `DISCOVERY_OFF_TOPIC_FLAG_STRIKES = <<STRIKES>>` declines per project.
- Both pins are `provisional: true` in the registry with source
  `founder ruling at the unit 5 gate of the scope run, 2026-09-18, pilot-tuned`.
- Requirement text: <<REQ_TEXT_RULING>>

## Read first, in this order
1. `loop/items/AI4DEV-135/design/SYNTHESIS.md`: decisions 6 and 7, "Data" migration C, "The
   chat side", the taxonomy rows, "Pins", the suite table rows for AT-004.12 to .15, and "Build
   order" item 5.
2. `loop/items/AI4DEV-135/design/how.md`, "(5) Free-phase guardrails", and the verbatim text of
   AT-004.12, .13, .14 and .15 under "The sixteen acceptance ids".
3. `loop/items/AI4DEV-135/brief.md`, Unit 5.
4. The tree: `supabase/functions/_shared/discovery-prompt.ts`, `discovery-turn.ts`,
   `discovery-metering.ts`, `discovery-reads.ts`, `notification-taxonomy.ts`,
   `notification-copy.ts`, `org-vetting.ts` (the `p_notice` producer pattern around its
   `emit_notification` call), `write-routes.ts`; migrations
   `20260920120000_discovery_turns.sql` (`discovery_turn_settle`, `discovery_turn_immutable`),
   `20260923120100_organization_discovery_switch.sql` (the current `discovery_turn_reserve`),
   `20260913120000_notification_taxonomy_and_outbox.sql` (the seed shape),
   `20260914120000_org_vetting.sql` (a definer calling `emit_notification`); tests
   `tests/at/harness/atconfig.ts`, `config.ts`, `tests/at/suites/req-004/_source-pins.ts`,
   `_contract.ts`, `_fixture.ts`, `_live.ts`, `a-metering.test.ts` (AT-004.11's operator
   reserve and settle at integration), `d-conversation.test.ts` (the two-block system
   assertion), `e-guardrails.test.ts`, `z-later-runs.test.ts`, `tests/at/expected/req-004.json`;
   `tests/at/suites/req-016/taxonomy.ts`, `_source-scan.ts` (`seededEventNames`),
   `d-taxonomy-evidence.test.ts` and `_fixture-producers.ts` (how a row gets fired at both
   tiers), `tests/at/expected/req-016.json`.

## What unit 5 lands
- Pins: `DISCOVERY_TURN_CEILING` and `DISCOVERY_OFF_TOPIC_FLAG_STRIKES` in
  `discovery-metering.ts`; registry entries `discoveryTurnCeiling` and
  `discoveryOffTopicFlagStrikes` in `atconfig.ts` (unit `turns` and `declines`) with the dotted
  keys `req-004.discovery.turn_ceiling` and `req-004.discovery.off_topic_flag_strikes` in
  `config.ts`; equalities in `_source-pins.ts`.
- Migration `supabase/migrations/20260924140000_discovery_guardrails.sql`:
  - `alter table public.discovery_turns add column off_topic boolean not null default false;`
    and `constraint discovery_turns_fuel_has_no_guardrail check (billing <> 'fuel' or not off_topic)`.
  - `discovery_turn_immutable`: add `off_topic` to both allow-list arrays (`create or replace`).
  - `discovery_turn_settle` gains `p_off_topic boolean default false` and `p_notice jsonb default
    null`; drop the old signature in the same file, re-issue the revoke and grant for the new one.
    On a `completed` settle it stores `off_topic`. When the request's settings carry
    `guardrails->>'active' = 'true'` and `p_off_topic` and `count(*) where project_id = this and
    off_topic` after this update equals `guardrails->>'off_topic_flag_strikes'`, it calls
    `public.emit_notification` for `discovery.off_topic_flagged` with recipients every active
    platform admin, channels email and in-app, payload `{ projectId, organizationId, strikes }`,
    built from `p_notice` the way `org_vetting` builds its write. Exactly once: the count equals
    the pin only on the turn that reaches it. The settle answer gains `off_topic_count`.
  - `discovery_turn_reserve`: `p_settings` gains `turn_ceiling` and `off_topic_flag_strikes`
    (validated in the numeric loop); `request_settings` stores `'guardrails': { active,
    turn_ceiling, off_topic_flag_strikes }` where `active` is `billing = 'free'`; when `active`
    and the project's settled turn count is at or above `turn_ceiling`, raise `turn-ceiling`
    with `detail = 'turn-ceiling'` and a message that is `SCOPE_COPY.turnCeiling.generate` when
    the latest elicitation is complete and `SCOPE_COPY.turnCeiling.fresh` otherwise. Fuel never
    reads the ceiling.
  - Seed: `insert into public.notification_event_types (event) values ('discovery.off_topic_flagged') on conflict do nothing;`
- `discovery-prompt.ts`: `DECLINE_OFF_TOPIC_TOOL` (strict, one `requested` string), `GuardrailSettings`,
  `guardrailSettingsFor(billing)`, `guardrailBlock(settings, settledTurns)` returning an uncached
  `SystemBlock` on free only: the scope rule sentence, and on the final free turn
  (`settledTurns + 1 >= turnCeiling`) the wrap-up instruction (record the elicitation now if you
  can; otherwise tell the NGO to start a fresh Discovery). Fuel returns null.
- `discovery-turn.ts`: `DiscoveryModelRequest.tools` admits the decline tool; `discoveryPrepare`
  decides billing with `billingTargetFor`, adds the block and the tool on free, passes the two
  pins in `p_settings`; `settleArgsFrom` maps `answer.toolUse?.name === 'decline_off_topic'` to
  `p_off_topic` (true only when the settings are active) and builds `p_notice`;
  `DiscoveryMessageOutcome` gains `guardrail: { offTopicCount, flagged, notice } | null` (null on
  fuel), `notice` is `SCOPE_COPY.offTopicNotice` from the flagged turn on. The decline tool's
  answer text is the assistant reply (the model writes the redirect sentence).
- `scope-copy.ts`: `offTopicNotice`, `turnCeiling.generate`, `turnCeiling.fresh`, plain English,
  no money words. `_source-pins.ts` pins the two refusal sentences to the SQL text.
- `write-routes.ts`: `turn-ceiling` already sits in `WRITE_REFUSAL_KINDS` from unit 1; the
  `discovery-message` route maps the SQL detail to it (check `edge.ts` needs nothing).
- Taxonomy: the TypeScript `TAXONOMY` row `{ event: 'discovery.off_topic_flagged', recipients:
  ['platform_admin'], channels: ['email', 'inapp'], tone: 'normal', class: 'other', payloadKeys:
  ['projectId', 'organizationId', 'strikes'] }`, the same row in
  `tests/at/suites/req-016/taxonomy.ts` with its payload oracle, the notification copy in
  `notification-copy.ts`, and a fixture producer so AT-016.03 fires it at both tiers.
  `seededEventNames()` in `req-016/_source-scan.ts` must fold the seed lists of every migration
  that inserts into `notification_event_types`, in file order, instead of returning the first;
  keep its throw when no migration seeds.
- `d-conversation.test.ts`: the system-block assertion on a free turn now sees three blocks
  (template cached, skills cached, guardrail uncached) or whatever the tree makes; assert the
  real shape, keep the cached flags asserted.
- Tests in `e-guardrails.test.ts`, moved out of `z-later-runs.test.ts`:
  - AT-004.12: free project; the request carries the guardrail block and the decline tool; a
    scripted `decline_off_topic` reply settles with `off_topic` true and the answer text as the
    reply. Loop green; integration `awaiting(AWAITED.anthropicLive)`.
  - AT-004.13: operator settles `offTopic` turns up to the strikes pin (from `h.config.get`);
    `guardrail.flagged` flips on the turn that reaches it, the notice appears, exactly one
    `discovery.off_topic_flagged` notification row exists (add `notificationEvents(event)` to
    the SUT contract, fixture and live), a further off-topic settle adds no second row, and the
    next reserve still succeeds (never a lockout). Green both tiers.
  - AT-004.14: operator settles to the ceiling pin; the request on the final free turn carries
    the wrap-up instruction; the next reserve is refused `turn-ceiling` with the `fresh` sentence
    when the elicitation is incomplete and the `generate` sentence when complete (two projects or
    two halves). Green both tiers.
  - AT-004.15: funded project with fuel (`setProjectFundingAsOperator`): off-topic reply, past
    the ceiling, repeated; no block, no tool, no `off_topic` stored (CHECK), no notice, no
    notification, no refusal. Loop green; integration red `checkout.project-fuel` (the operator
    helper throws it live).
- `tests/at/expected/req-004.json` and `req-016.json` updated to match. `OperatorSettleInput`
  gains `offTopic?: boolean`.

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
One commit, message starting `AI4DEV-135: unit 5,`, plain sentences. Write
`loop/items/AI4DEV-135/lanes/unit5-writer.report.md` (Landed, Verify with exit codes and
counts, Deviations or "none", Choices the synthesis left open or "none") and include it in the
commit. Reply with five lines at most: the commit sha, the seven exit codes, the report path.

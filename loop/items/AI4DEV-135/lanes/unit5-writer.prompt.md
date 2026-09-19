You are the writer for unit 5 of the scope run, "Free-phase guardrails". You apply a fixed
design; you do not redesign it. Working directory: your own git worktree on branch
`lane/ai4dev-135/unit5`, cut from the item branch after unit 4 merged. Commit there. Never touch
any other folder. Never push.

## Read first, in this order
1. `loop/items/AI4DEV-135/design/SYNTHESIS.md`: the last section "Rulings at the unit 4 gate"
   (it supersedes the older text), then decision 6, "Data" migration C, "The chat side", the
   taxonomy rows, "Pins", the suite table rows for AT-004.12 to .15, and "Build order" item 5.
2. `loop/items/AI4DEV-135/design/how.md`, "(5) Free-phase guardrails".
3. `.taskmaster/docs/acceptance/at-req-004.md`, the lines for AT-004.12, .13, .14 and .15 as
   they read now (AT-004.14 and .15 were reworded on this branch to the founder's ruling).
4. `loop/items/AI4DEV-135/brief.md`, Unit 5.
5. The tree: `supabase/functions/_shared/discovery-prompt.ts`, `discovery-turn.ts`,
   `discovery-metering.ts`, `discovery-reads.ts`, `discovery-skills/04-complete-the-record.md`,
   `notification-taxonomy.ts`, `notification-copy.ts`, `org-vetting.ts` (the `p_notice`
   producer pattern around its `emit_notification` call), `write-routes.ts`, `scope-copy.ts`;
   migrations `20260920120000_discovery_turns.sql` (`discovery_turn_settle`,
   `discovery_turn_immutable`), `20260923120100_organization_discovery_switch.sql` (the current
   `discovery_turn_reserve`), `20260913120000_notification_taxonomy_and_outbox.sql` (the seed
   shape), `20260914120000_org_vetting.sql` (a definer calling `emit_notification`); tests
   `tests/at/harness/atconfig.ts`, `config.ts`, `tests/at/suites/req-004/_source-pins.ts`,
   `_source-absences.ts`, `_contract.ts`, `_fixture.ts`, `_live.ts`, `a-metering.test.ts`
   (AT-004.11's operator reserve and settle at integration), `d-conversation.test.ts`,
   `e-guardrails.test.ts`, `z-later-runs.test.ts`, `tests/at/expected/req-004.json`;
   `tests/at/suites/req-016/taxonomy.ts`, `_source-scan.ts` (`seededEventNames`),
   `d-taxonomy-evidence.test.ts`, `_fixture-producers.ts` and the fixture-producer migration
   `20260913121000_notification_fixture_producers.sql` (how a row gets fired at both tiers),
   `tests/at/expected/req-016.json`; `.taskmaster/docs/requirements/req-016.md`.

## Founder rulings (2026-09-19), fixed
- No turn ceiling of any kind. Remove `turn-ceiling` from `WRITE_REFUSAL_KINDS`.
- Off-topic strikes: `DISCOVERY_OFF_TOPIC_FLAG_STRIKES = 3`, registry entry
  `discoveryOffTopicFlagStrikes` (unit `declines`, `provisional: true`, source
  `founder ruling at the unit 4 gate of the scope run, 2026-09-19, pilot-tuned`), dotted key
  `req-004.discovery.off_topic_flag_strikes` in `config.ts`, equality in `_source-pins.ts`.
- Wrap-up on request, any billing: when the NGO says to stop, the model records the elicitation
  from what it has, with every unresolved point in `openQuestions`, and the scope can be
  generated.

## What unit 5 lands
- Migration `supabase/migrations/20260924140000_discovery_guardrails.sql`:
  - `alter table public.discovery_turns add column off_topic boolean not null default false;`
    and `constraint discovery_turns_fuel_has_no_guardrail check (billing <> 'fuel' or not off_topic)`.
  - `discovery_turn_immutable`: `off_topic` in both allow-list arrays (`create or replace`).
  - `discovery_turn_settle` gains `p_off_topic boolean` and `p_notice jsonb`: drop the old
    signature in the same file, create the new one, re-issue revoke and grant. On a `completed`
    settle it stores `off_topic`. When `request_settings->'guardrails'->>'active' = 'true'` and
    `p_off_topic` and `count(*) where project_id = this and off_topic` after this update equals
    `(request_settings->'guardrails'->>'off_topic_flag_strikes')::integer`, it calls
    `public.emit_notification` for `discovery.off_topic_flagged`, recipients every active
    platform admin, channels email and in-app, payload `{ projectId, organizationId, strikes }`,
    built from `p_notice` the way `org_vetting` builds its write. Exactly once: the count equals
    the pin only on the turn that reaches it. The settle answer gains `off_topic_count`.
  - `discovery_turn_reserve`: `p_settings` gains `off_topic_flag_strikes` (validated in the
    numeric loop); `request_settings` stores `'guardrails': { active, off_topic_flag_strikes }`
    where `active` is `billing = 'free'`.
  - Seed: `insert into public.notification_event_types (event) values ('discovery.off_topic_flagged') on conflict do nothing;`
- `discovery-prompt.ts`: `DECLINE_OFF_TOPIC_TOOL` (strict, one `requested` string; description
  as in "The chat side"), `GuardrailSettings = { active: boolean; offTopicFlagStrikes: number }`,
  `guardrailSettingsFor(billing)` (fuel: inactive). No guardrail system block.
- `discovery-skills/04-complete-the-record.md` gains the stop rule: if the NGO asks to stop or to
  write it up, call `record_elicitation` now with `complete` true, the facts and stories known so
  far, and every unresolved point in `openQuestions`; say in the closing sentences what stays
  open. Regenerate the index with `bun run discovery:skills`. Pin the stop sentence in
  `_source-pins.ts` the way other prompt lines are pinned there (follow the file).
- `discovery-turn.ts`: `DiscoveryModelRequest.tools` admits the decline tool; `discoveryPrepare`
  decides billing with `billingTargetFor` (it already reads the project through `reads`), adds
  the tool on free only, passes the strikes pin in `p_settings`; `settleArgsFrom` maps
  `answer.toolUse?.name === 'decline_off_topic'` to `p_off_topic` (true only when the settings
  are active) and builds `p_notice`; the decline tool's answer text is the assistant reply.
  `DiscoveryMessageOutcome` gains `guardrail: { offTopicCount, flagged, notice } | null` (null
  on fuel); `notice` is `SCOPE_COPY.offTopicNotice` from the flagged turn on, else null.
- `scope-copy.ts`: `offTopicNotice` in plain English, no money words.
- Taxonomy: the TypeScript `TAXONOMY` row `{ event: 'discovery.off_topic_flagged', recipients:
  ['platform_admin'], channels: ['email', 'inapp'], tone: 'normal', class: 'other', payloadKeys:
  ['projectId', 'organizationId', 'strikes'] }`; the same row in
  `tests/at/suites/req-016/taxonomy.ts` with its payload oracle; the notification copy in
  `notification-copy.ts`; a fixture producer so AT-016.03 fires it at both tiers (follow
  `_fixture-producers.ts` and its migration exactly); one prose line in
  `.taskmaster/docs/requirements/req-016.md` under the Discovery bullet: "Discovery off-topic
  pattern flagged (REQ-004, free credits only) → platform admin (email + in-app)". Also add the
  unit 6 line now so the file is touched once: "Discovery regeneration bound exhausted (REQ-004)
  → platform admin (email + in-app)". `seededEventNames()` in `req-016/_source-scan.ts` must
  fold the seed lists of every migration that inserts into `notification_event_types`, in file
  order, instead of returning the first; keep its throw when no migration seeds.
- `d-conversation.test.ts`: if it asserts the tool list or the block count on a free turn, make
  it assert the real shape (two tools on free).
- Tests in `e-guardrails.test.ts`, moved out of `z-later-runs.test.ts`:
  - AT-004.12: free project; the request carries `decline_off_topic` beside
    `record_elicitation`; a scripted `decline_off_topic` reply settles with `off_topic` true and
    its text as the reply; `guardrail.offTopicCount` is 1, `flagged` false, `notice` null. Loop
    green; integration `awaiting(AWAITED.anthropicLive)`.
  - AT-004.13: operator settles off-topic turns up to the strikes pin (from `h.config.get`);
    `flagged` flips on the turn that reaches it and the notice appears; exactly one
    `discovery.off_topic_flagged` notification row exists (add `notificationEvents(event)` to
    the SUT contract, fixture and live); a further off-topic settle adds no second row; the
    next reserve still succeeds. Green both tiers.
  - AT-004.14: free project, a few settled turns, then the message "Stop here and write it up.";
    a scripted `record_elicitation` reply with two `openQuestions`; the answer is `scopeReady:
    true` and the settled turn holds the elicitation; the skills text sent to the model carries
    the stop rule (assert on the request's cached system block through the sim, the way the
    template line is asserted elsewhere). Loop green; integration `awaiting(AWAITED.anthropicLive)`.
  - AT-004.15: funded project with fuel (`setProjectFundingAsOperator`): the request carries no
    decline tool; an off-topic-shaped conversation scripted as plain replies over more turns
    than the strikes pin; no `off_topic` stored (the CHECK), `guardrail` null, no notification
    row. Loop green; integration red `checkout.project-fuel` (the operator helper throws it
    live).
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

# Design for the data-sensitivity tiers and fit decline run

The lead's design, written before any code. Units follow `brief.md`. Every behaviour lands twice:
in the real stack (edge TypeScript plus SQL) and in the loop-tier fixture adapter
(`tests/at/suites/req-004/_fixture.ts`), which emulates the SQL in memory. The live adapter
(`_live.ts`) drives the deployed edge functions.

## The data shapes

All in `supabase/functions/_shared/discovery-brief.ts`, replacing today's unused `DataTier` and
`BriefFit`.

```ts
export const DATA_KINDS = ['none', 'ordinary-pii', 'special-category', 'high-volume',
  'health', 'immigration', 'abuse-victim', 'financial', 'unsure'] as const;
export type DataKind = (typeof DATA_KINDS)[number];
export const DATA_TOPIC_ID = 'info';

export type DataTier = { tier: 0 | 1 | 2; kinds: DataKind[]; reason: string; responsibility: 'ngo' };

export const DECLINE_CAUSES = ['developer-maintenance', 'confidential-codebase'] as const;
export type DeclineCause = (typeof DECLINE_CAUSES)[number];
export type BriefFit =
  | { verdict: 'fits'; reason: string }
  | { verdict: 'declined'; cause: DeclineCause; reason: string; reshaping: string };
```

The tier is a table, not branching: `TIER_OF_KIND: Record<DataKind, 0 | 1 | 2>` with
`none: 0`, `ordinary-pii: 1`, every other kind `2`. `tierFor(kinds, dataTopicNotSure)` returns
the maximum over the kinds, `2` for an empty list, and `2` whenever the data topic's answer is
"I'm not sure". So health, immigration, abuse-victim and financial data can never land below
Tier 2, and unsure is Tier 2, by construction. Responsibility is always `'ngo'`.

Sensitive data is never a decline reason because the decline cause enum has no data member.

## Unit 1: tier assignment

- `replyTool` gains two optional properties. `data: { kinds: DataKind[] (minItems 1), reason }`.
  `fit` lands in unit 3. `parseReplyInput` accepts and validates `data` (exact keys, known kinds,
  non-empty reason) and returns it on `ReplyUpdate`.
- Ask first, enforced in code: `planReplyTurn` applies `update.data` only when the data topic
  (`DATA_TOPIC_ID`) has a question in the document asked in an EARLIER round than this turn, and
  the topic now holds an answer (agreed or not-sure, possibly given on this same turn through
  `answers`). Otherwise the data report is ignored and `dataTier` stays as it was. A report on a
  later turn re-derives the tier.
- When the tier changes on a turn, the reply text carries the code-owned tier sentence
  (`SCOPE_COPY.dataTier.tier0|1|2`) after the model's text, before the ready sentence.
  `composeReplyText` owns it. Tier 1's sentence is the minimisation reminder.
- `replySystemPrompt` tells the model: ask the data topic before reporting `data`; report the
  kinds that apply; when the NGO is unsure, report `unsure`.
- Tier 2 hardens the reference-file disclosure: the settle path sets
  `need_intakes.tier2_classified_at` (the REQ-003 consumer already reads it) when the new brief
  revision's `dataTier.tier` is 2. Coalesce, never overwrite.
- SQL: one migration. Redefine `discovery_turn_settle` (latest body in
  `20261003120200_discovery_daily_reply_only.sql`) with one extra trailing parameter
  `p_decline jsonb default null`, drop the old 11-argument overload, and after the brief
  revision insert call `perform public.discovery_reply_effects(v_turn, p_account_id, v_document, p_decline);`.
  Define `discovery_reply_effects` in the same migration with only the Tier 2 classification.
  Unit 3 replaces that one small function, never the settle body again. Grant and revoke as the
  old settle did. `DiscoverySettleArgs` gains `p_decline`; every caller passes it (null for now).
- Fixture: the in-memory settle sets the need's `tier2ClassifiedAt` the same way (the req-003
  fixture already models that field).
- Tests: replace the six stubs in `z-later-runs.test.ts` with real bodies in a new
  `k-data-tiers.test.ts`. Loop tier scripts the model (`h.vendors.anthropic.script`) as
  `h-cause-labels.test.ts` does; the integration body uses the live model where the expectation
  is robust (clear health data gives Tier 2), else `awaiting(AWAITED.anthropicLive)` as
  `e-guardrails.test.ts` does.
  - .26: a reply that reports `data` before the data question was asked leaves `dataTier` null;
    after the data question is asked and answered, the next report sets it.
  - .27: ordinary PII gives Tier 1, the reply carries the minimisation sentence, and Finish
    without the data acknowledgment is refused with kind `data-ack`.
  - .28: special-category or high-volume gives Tier 2, the reply carries the fixtures-only
    sentence, and the need's `tier2ClassifiedAt` is set.
  - .29: each of health, immigration, abuse-victim, financial, even alongside `none` or
    `ordinary-pii`, gives Tier 2.
  - .30: answering the data question "I'm not sure" gives Tier 2 whatever kinds are reported;
    reporting `unsure` gives Tier 2.
  - .31: `none` gives Tier 0 and Finish succeeds without the data acknowledgment.
- Move each green id from `red` to `green` in `tests/at/expected/req-004.json`.

## Unit 2: tier responsibility attributed, the tier is final

- The tier record carries `responsibility: 'ngo'`; the confirmed revision holds it, and the
  confirmation's approver is the NGO account that acknowledged it. No new column.
- `decideFinish` keeps requiring the data acknowledgment for Tier 1 and 2 only.
- The tier is final: nothing but the reply plan writes `dataTier`. Add a source pin in
  `_source-pins.ts` style: no file under `supabase/` other than `discovery-brief.ts` and
  `discovery-reply.ts` assigns `dataTier`, and no background-review code reads it.
- Test `.50` in `k-data-tiers.test.ts`: responsibility is `'ngo'` on Tier 0, 1 and 2; Tier 1 and 2
  refuse Finish without the acknowledgment and accept it with; Tier 0 accepts it without; the pin
  returns no problems.

## Unit 3: maintainability fit

- `replyTool` gains optional `fit: { verdict: 'fits' | 'declined', cause: 'none' |
  'developer-maintenance' | 'confidential-codebase', reason, reshaping }` (flat for strict
  schemas). `parseReplyInput` maps it to `BriefFit`: `fits` needs cause `none`; `declined` needs
  one of the two causes and non-empty `reshaping`. Anything else rejects the whole reply, as the
  parser does today for any invalid field.
- A declined fit is final in the brief: once `fit.verdict` is `declined`, later plans keep it.
- The decline's reply text: the model's text, then the code-owned decline copy for the cause, then
  the oversight sentence. One `DECLINE_COPY` object in `scope-copy.ts`:
  `developerMaintenance`, `confidentialCodebase`, `oversight` ("A person at ai4good reads every
  decline and will contact you if it was wrong."). A declined turn carries no question cards and
  no ready sentence.
- No publishable scope: `decideFinish` refuses a declined brief with a new kind `declined`
  (add it to `FinishDecision` and to the write-route refusal kinds). The `discovery-scope`
  begin path refuses too.
- No further turns: `prepareReply` refuses when the current brief's fit is declined, with a new
  refusal kind `discovery-declined` (409).
- The decline record: a table `discovery_declines` (project_id primary key referencing projects,
  org_id, turn_id, cause, reason, reshaping, declined_at). RLS select for members of the org and
  for platform admins, like `discovery_confirmations`. Written by `discovery_reply_effects` when
  `p_decline` is non-null, `on conflict (project_id) do nothing`. The edge passes `p_decline`
  only on the turn whose plan first declines.
- Operator reads for tests: `declineRecordAsOperator(projectId)`.
- Tests in a new `l-fit-decline.test.ts`:
  - .32: an intake form need with `fit: fits` passes; `fit` is `fits` in the brief; Finish works.
  - .33: `declined / developer-maintenance` gives a reply with the model's explanation, the
    developer-maintenance copy and the oversight sentence; Finish and scope are refused; the next
    message is refused with `discovery-declined`.
  - .34: `declined / confidential-codebase` the same way with its own copy.
  - .35: after either decline the decline record exists with cause, date and reshaping; a source
    absence pin finds no waitlist or second track (`waitlist`, `wait_list`, `second track`) in
    `supabase/` and `src/`.
  - .36: health data with `fit: fits` gives Tier 2 and is not declined; a reply that tries a
    decline cause outside the enum is rejected (the turn fails and releases its turn).

## Unit 4: decline then review

- `discovery_reply_effects` on a decline also emits, through `public.emit_notification`:
  `discovery.fit_declined` to the organisation admin (role `ngo`) with payload
  `{ declineCause, reshapingSuggestion, oversightSentence }`, and `discovery.fit_decline_review`
  once to every active platform admin (one event, so exactly one ops item) with payload
  `{ declineCause }` and `opsItem: { kind: 'discovery.fit_decline_review', detail: { projectId,
  organizationId, cause, reason, reshaping, conversation } }`, where `conversation` is every
  settled turn's `{ seq, user, assistant }` in order, including the declining turn.
- Copy and channels come from TypeScript, as `offTopicFlaggedNotice` does today:
  `p_decline = { cause, reason, reshaping, ngo: { channels, copy }, review: { channels, copy } }`,
  rendered with `renderCopy` from the taxonomy rows. SQL checks channels against the taxonomy's
  authorised set the way the off-topic block does.
- The project list: `organizationDashboard` in `tenant-reads.ts` returns each project with
  `decline: { cause, reason, reshapingSuggestion, declinedAt } | null`; `projectsOf` embeds the
  decline row. New SUT method `projectList(session, organizationId)` on `DiscoverySut`.
- Operator reads for tests: `opsItemsAsOperator(kind)` returning `{ kind, detail }[]`.
- Discovery screen: when the brief's fit is declined, the composer is closed and the screen shows
  the decline copy and the oversight sentence. Use the existing `TEXT.fit.declined` slot.
- Tests in `l-fit-decline.test.ts`:
  - .53: one decline of each cause gives the NGO message with the oversight sentence, the decline
    record, exactly one `discovery.fit_decline_review` event and one ops item whose detail holds
    the project, the cause and the full conversation, and one `discovery.fit_declined` event.
    A retried settle of the same turn adds nothing.
  - .54: the project list still lists the declined project with its decline record; the decline
    message contains `DECLINE_COPY.oversight`.

## Out of scope

The disposition of the ops item, the `cancelled` state and its admin reversal, and the
calibration dataset (AT-004.55 to .57). They stay capability-pending.

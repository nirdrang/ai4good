# The scope run design: one aggregate, one route, the ledger untouched except for two facts

This is the contract every unit builds against. The base is candidate 2 (the scope as its own
aggregate with its own write route). Grafts are listed at the end with their source.

## The decisions

1. **Where the scope lives.** A table `discovery_scopes`, one row per version. The need row
   keeps `cause_labels text[]` as the live projection. The turn ledger is not widened for the
   scope. A scoped need is "a project with a `current` scope row"; the need stage stays
   `discovery_in_progress`, and the lifecycle requirement maps it later.
2. **How generation is triggered.** An explicit write, `discovery-scope` with
   `action: 'generate'`, allowed once the latest elicitation is `complete: true`. Not a tool on
   a chat turn (the port folds the first `tool_use` only, and a chat turn already carries
   `record_elicitation`), and not a second model call inside the settle of a chat turn (two
   Opus calls in one edge invocation risk the wall clock). The chat answer that completes the
   elicitation says the scope can be generated (`scopeReady: true` on the JSON answer and on
   `data-turn`); the page ignores the key today, and the wiring leaf may chain the generate call
   from the client. Generation and regeneration cost zero credits: they are not turns and touch
   no allowance.
3. **The model call for the scope.** One request, one tool `record_scope`, `tool_choice`
   forced. System: the cached template plus skills, then one uncached block with the need,
   the organisation mission, the completed elicitation and the vocabulary. Messages: the settled
   transcript, then one user line asking for the scope. The chat page never sees this call.
4. **Versions.** `version` is 1 for the first generation and increments per regeneration
   attempt. Status is `generating`, `current`, `superseded`, `failed` or `escalated`. Intent is
   recorded before the model runs: `begin` inserts the `generating` row with its reason, `commit`
   fills it. One `current` and one `generating` per project, by partial unique index.
5. **Zero-cost retry after a system error.** A third billing kind `retry` on `discovery_turns`,
   chosen by the reserve function from the ledger: the project's latest turn is `failed` and
   the new message equals its `user_message`. `reserved_credits = 0`, no debit, and a CHECK
   pins charged credits to zero. No client flag, no state table.
6. **Off-topic count.** A `decline_off_topic` tool offered on free billing only. The settle
   records `off_topic = true` on the turn (one new allow-listed column). The count is
   `count(*) where off_topic` over the project's settled turns. When the count reaches the
   strikes pin at a settle, that settle emits `discovery.off_topic_flagged` to the platform
   admin, once. The answer carries a plain notice from then on. Reserve never reads the flag.
7. **Turn ceiling.** A pin. Reserve refuses a free turn with `turn-ceiling` when the project's
   settled turns reach the pin. The refusal sentence names generation when the latest
   elicitation is complete, and a fresh Discovery otherwise. The final free turn carries a
   wrap-up instruction in the guardrail block. Fuel skips the ceiling, the tool, the block, and
   the count.
8. **Regeneration bound.** A pin (three). `used` is the count of scope rows with `version > 1`
   whose status is not `failed` or `escalated`. At the bound, `begin` inserts an `escalated`
   row (durable record) and emits `discovery.regeneration_exhausted` to the platform admin in
   the same transaction, then answers `escalated: true`. A later regenerate on an escalated
   project answers the same without a new row.
9. **Vocabulary.** A table `cause_labels`, `unreachable-by-client-roles`. The model sees it
   in the uncached block of the scope request. `commit` normalises, inserts new labels
   `on conflict do nothing`, stores the version's labels on the scope row, and writes the need's
   `cause_labels`. Deletion is `action: 'remove-label'` on the same route; it touches the need
   only. No create, curate, or admin surface exists; a source scan proves it.
10. **Rendering.** A pure renderer produces the markdown at commit; the row stores it, so each
    version's document is fixed. Copy lives in `scope-copy.ts`. A source scan plus a runtime
    check over every rendered fixture prove the money absence.
11. **The two consumers.** `ScopeContractRef = { projectId, version }` and two functions in
    `scope.ts`, `scopeSourceForPrd(scopes, ref)` and `scopeReferenceForScorer(scopes, ref)`,
    that resolve the same pinned version or refuse. AT-004.24 and AT-004.52 stay red under new
    pending names after their provable halves run.

## Data

```sql
-- migration A: supabase/migrations/<ts>_discovery_scopes.sql   (unit 1)
create type public.discovery_scope_status as enum ('generating', 'current', 'superseded', 'failed', 'escalated');
create table public.discovery_scopes (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null,
  org_id         uuid not null,
  version        integer not null,
  status         public.discovery_scope_status not null,
  reason         text,                      -- null on version 1; the NGO's reason on every later version
  requested_by   uuid not null,             -- the account that asked (references public.accounts)
  elicitation    jsonb not null,            -- the completed elicitation this version was generated from
  contract       jsonb,                     -- the parsed Scope, null until commit
  markdown       text,                      -- the rendered document, null until commit
  cause_labels   text[] not null default '{}',   -- what this version emitted, normalised
  served_model   text,
  input_tokens   integer,
  output_tokens  integer,
  opened_at      timestamptz not null default clock_timestamp(),
  settled_at     timestamptz,
  foreign key (project_id, org_id) references public.projects (id, org_id) on delete cascade,
  unique (project_id, version),
  constraint discovery_scopes_version_positive check (version >= 1),
  constraint discovery_scopes_generating_iff_unsettled check ((status = 'generating') = (settled_at is null)),
  constraint discovery_scopes_first_has_no_reason check (version <> 1 or reason is null),
  constraint discovery_scopes_later_has_reason check (version = 1 or (reason is not null and btrim(reason) <> '')),
  constraint discovery_scopes_current_is_filled check (status not in ('current', 'superseded') or (contract is not null and markdown is not null and served_model is not null)),
  constraint discovery_scopes_escalated_is_empty check (status <> 'escalated' or (contract is null and markdown is null)),
  constraint discovery_scopes_labels_are_bounded check (coalesce(array_length(cause_labels, 1), 0) <= 3)
);
create unique index discovery_scopes_one_current_per_project on public.discovery_scopes (project_id) where status = 'current';
create unique index discovery_scopes_one_generating_per_project on public.discovery_scopes (project_id) where status = 'generating';
-- tenant-isolated posture, the discovery_turns shape: revoke all; enable RLS; grant select to authenticated;
-- policies discovery_scopes_select_org_member (viewer_is_org_member(org_id)) and discovery_scopes_select_platform_admin.
-- Add 'discovery_scopes' to TENANT_CATALOG as tenant-isolated.

-- migration B: <ts>_cause_labels.sql   (unit 4)
create table public.cause_labels (
  label            text primary key,
  first_project_id uuid references public.projects (id) on delete set null,
  created_at       timestamptz not null default clock_timestamp(),
  constraint cause_labels_canonical check (label <> '' and label = lower(btrim(label)) and label !~ '\s\s')
);
-- unreachable-by-client-roles: revoke all; enable RLS; no grants; add to TENANT_CATALOG as unreachable.
-- Read only inside discovery_scope_begin (returned in the snapshot). Insert only inside discovery_scope_commit.

-- migration C: <ts>_discovery_off_topic.sql   (unit 5)
alter table public.discovery_turns add column off_topic boolean not null default false;
alter table public.discovery_turns add constraint discovery_turns_fuel_has_no_guardrail check (billing <> 'fuel' or not off_topic);
-- discovery_turn_immutable: add 'off_topic' to both allow-list arrays.
-- discovery_turn_settle gains p_off_topic boolean default false (drop the old overload in the same file).
-- discovery_turn_reserve: p_settings gains 'turn_ceiling' and 'off_topic_flag_strikes' (validated in the numeric loop);
--   request_settings stores 'guardrails': {active, turn_ceiling, off_topic_flag_strikes};
--   free and settled_count >= turn_ceiling -> raise 'turn-ceiling' with the wrap-up sentence.
-- seed insert into notification_event_types: 'discovery.off_topic_flagged'.

-- migration D1: <ts>_discovery_billing_retry.sql   (unit 6; the enum value alone, its own file, because a new
--   enum value cannot be used in the transaction that adds it)
alter type public.discovery_billing add value 'retry';
-- migration D2: <ts>_discovery_retry_and_regeneration.sql   (unit 6)
alter table public.discovery_turns add constraint discovery_turns_retry_touches_no_credits
  check (billing <> 'retry' or (reserved_credits = 0 and coalesce(charged_credits, 0) = 0));
-- discovery_turn_reserve: v_billing := 'fuel' when funded; else 'retry' when the project's latest turn by seq is
--   'failed' and its user_message = btrim(p_message); else 'free'. The retry branch reserves like free
--   (max_output from settings, reservation_is_the_bound holds) with reserved_credits = 0 and no debit.
-- seed insert: 'discovery.regeneration_exhausted'.
```

The turn ledger changes are exactly: one boolean column, one enum value, two CHECKs, the
allow-list, one settle argument, the reserve's billing choice and ceiling refusal. Every
existing CHECK keeps its text. `open_has_no_outcome`, `settled_is_measured`,
`failed_costs_nothing` and `abandoned_keeps_reservation` are untouched, so AT-004.49 and the
metering ids keep their meaning.

## The route: `discovery-scope`

`WRITE_ROUTES['discovery-scope'] = { surface: { kind: 'edge', rpc: 'discovery_scope_begin' }, standing: { kind: 'account-required', admits: ['ngo'] } }`.
Folder `supabase/functions/discovery-scope/index.ts`, one `Deno.serve(writeRoute({ name: 'discovery-scope', target: organizationIdField, decide: decideDiscoveryScope, settle: { rpc: 'discovery_scope_commit', act: scopeAct(port, DISCOVERY_SKILLS) }, render: renderDiscoveryScope }))`.
`config.toml` gains `[functions.discovery-scope] verify_jwt = true`. No `prepare`: `begin`
returns everything `act` needs.

```ts
// body
{ organizationId, projectId, action: 'generate' }
{ organizationId, projectId, action: 'regenerate', reason }        // unit 6
{ organizationId, projectId, action: 'remove-label', label }       // unit 4
// answer
{ ok: true, changed: boolean, scope: ScopeView | null, scopes: ScopeView[], need: NeedIntakeView, escalated: boolean }
{ ok: false, kind, status, reason }
```

`discovery_scope_begin(p_account_id, p_organization_id, p_project_id, p_action, p_reason, p_label, p_bound, p_notice)`
(security definer, `service_role` only): `assert_account_active`; org for share; admin
membership; project for update; need stage `discovery_in_progress` else `need-not-in-discovery`.
Then by action:

- `generate`: latest non-null elicitation must have `complete = true` else
  `elicitation-incomplete`; no row with status in (`generating`, `current`, `superseded`) else
  `scope-already-generated`; insert version 1 `generating`; return
  `{ done: false, scope: row, elicitation, context, need, mission, vocabulary }` where `context`
  is the settled transcript in the reserve's shape and `vocabulary` is `select label from
  cause_labels order by label` (empty until unit 4).
- `regenerate` (unit 6): a `current` row must exist else `scope-not-generated`; reason
  non-empty else `invalid-request`; an `escalated` row exists → return
  `{ done: true, escalated: true }`; `used >= p_bound` → insert `escalated` row with the reason,
  `emit_notification` for `discovery.regeneration_exhausted` from `p_notice` (recipients: every
  active platform admin; the vetting producer's shape), return `{ done: true, escalated: true }`;
  a `generating` row younger than `turn_deadline_seconds` → `generation-in-flight`; older →
  mark it `failed`; insert `generating` version `max + 1` with the reason; return the snapshot.
- `remove-label` (unit 4): canonicalise; if not in `need_intakes.cause_labels` return
  `{ done: true, changed: false }`; else `array_remove` and return `{ done: true, changed: true }`.

`scopeAct(port, skills)(begun, args)`: if `begun.done` pass through with no model call. Else
build the request (`buildScopeRequest`), `port.create`, parse; return settle args
`{ p_account_id, p_scope_id, p_outcome: 'completed' | 'failed', p_contract, p_markdown, p_labels, p_served_model, p_input_tokens, p_output_tokens }`.
A refused or unparseable answer is `p_outcome: 'failed'` with the reason in the route's answer
(`refused`, 502); the row is `failed` and does not count against the bound.

`discovery_scope_commit(...)` (definer, `service_role` only): project for update; the row must
be `generating` else `scope-not-open`; `completed`: the `current` row (if any) → `superseded`;
this row → `current` with contract, markdown, labels, usage, `settled_at`; insert new labels
into `cause_labels` on conflict do nothing (unit 4); `update need_intakes set cause_labels =
p_labels` (unit 4); `failed`: status `failed`, `settled_at`. Return
`{ scope, scopes (all rows ordered by version), need }`.

Refusal kinds added to `WRITE_REFUSAL_KINDS`: `elicitation-incomplete`,
`scope-already-generated`, `scope-not-generated`, `scope-not-open`, `generation-in-flight`,
`turn-ceiling`. The route name matches none of the grant, breaker or platform patterns in
`_source-absences.ts`.

## The pure module: `supabase/functions/_shared/scope.ts`

Relative imports only, no I/O, no clock, no `deliver(`. It sits under the `scope.service`
non-sender declaration.

```ts
export const COMPLEXITY_TIERS = ['small', 'medium', 'large'] as const;
export const DATA_TIERS = ['tier0', 'tier1', 'tier2'] as const;          // shape only this run
export const FIT_VERDICTS = ['fit', 'declined'] as const;                 // shape only this run; 'declined' stores, it does not decline
export const SCOPE_CAUSE_LABELS_MAX = 3;                                   // pinned in atconfig

export type Scope = {
  summary: string;
  userStories: { story: string; acceptanceCriteria: string[] }[];       // at least one
  suggestedStack: string[];                                              // at least one
  complexity: { tier: ComplexityTier; rationale: string; startSmallAdvice: string };
  riskFlags: string[];
  dataSensitivity: { tier: DataTier; rationale: string };
  maintainabilityFit: { verdict: FitVerdict; rationale: string };
  causeLabels: string[];                                                 // 0..3, canonical after normaliseLabels
  lovableRecommendation: { recommended: boolean; rationale: string };
  buildSplit: { lovable: string[]; claudeCode: string[] };              // both non-empty, always
};
export const RECORD_SCOPE_TOOL = { name: 'record_scope', strict: true, description, input_schema } as const;  // strict, additionalProperties false, every key required, enums as above, minItems 1 on stories, stack and both split parts, maxItems 3 on causeLabels
export function parseScope(input: unknown): Scope | null;                // stricter than the schema, like parseElicitation: exact keys, trimmed non-empty strings, both parts non-empty, 0..3 labels
export function canonicalLabel(raw: string): string;                     // lower, trim, single-space
export function normaliseLabels(candidates: readonly string[], vocabulary: readonly string[]): string[];   // canonical, deduplicated, at most three, vocabulary spelling wins on a case-insensitive match
export function buildScopeRequest(input: { need: DiscoveryNeed; mission: string | null; elicitation: Elicitation; vocabulary: readonly string[]; context: { role; content }[] }, skills: readonly DiscoverySkill[]): DiscoveryModelRequest;
export const SCOPE_REQUEST_MESSAGE: string;                              // the one user line asking for the scope
export function renderScopeMarkdown(scope: Scope, need: { title: string }): string;   // unit 1 the structure, unit 2 the copy
export type ScopeSqlRow = { ... every column ... };
export type ScopeView = { id; version; status; reason; contract: Scope | null; markdown: string | null; causeLabels: string[]; generatedAt: string | null; requestedAt: string };
export function scopeViewFromSql(row: ScopeSqlRow): ScopeView;
export type ScopeContractRef = { projectId: string; version: number };  // unit 3
export function scopeSourceForPrd(scopes: readonly ScopeView[], ref: ScopeContractRef): { ok: true; scope: Scope; markdown: string } | { ok: false; reason: 'no-such-version' | 'not-settled' };
export function scopeReferenceForScorer(scopes: readonly ScopeView[], ref: ScopeContractRef): same;   // the same resolver by another name; a test proves both refuse a different version
```

`scope-copy.ts` (unit 2): `SCOPE_COPY.maintenance` (the one sentence with the approximate
monthly figure, paid directly to Lovable, the NGO owns the code and evolves it by chat),
`SCOPE_COPY.lovablePricingUrl`, `SCOPE_COPY.dataTier.tier0|tier1|tier2` (tier2 adds the
fixtures-only paragraph: synthetic or anonymised fixtures during the build, the NGO connects
real data after completion, real tier-2 data never reaches Anthropic, Lovable or the
volunteer), `SCOPE_COPY.startSmall`, `SCOPE_COPY.offTopicNotice` (unit 5),
`SCOPE_COPY.turnCeiling.generate` and `.fresh` (unit 5, the reserve's refusal sentences,
pinned by `_source-pins.ts`), `SCOPE_COPY.regenerationExhausted` (unit 6, the notification
copy in `notification-copy.ts` follows the vetting pattern).

`discovery-skills/06-write-the-scope.md` (unit 1): derive from the record and the conversation,
never add scope, the smallest tier that fits, one sentence of rationale each, Lovable holds
the screens and data the NGO edits by chat and Claude Code holds integrations and jobs, never
state a project or build cost, reuse an existing cause label when one fits and mint one only
for a genuinely new domain, none when unsure (unit 4 sharpens the label lines). Regenerate
with `bun run discovery:skills`; the selftest guards drift.

## The chat side (unit 5 and the retry of unit 6)

```ts
// discovery-prompt.ts
export const DECLINE_OFF_TOPIC_TOOL = { name: 'decline_off_topic', strict: true, description: 'Call this when the NGO asks for something other than scoping this software need (general questions, document drafting, translation, coding help). Also write one short sentence bringing the conversation back to the need.', input_schema: { type: 'object', additionalProperties: false, properties: { requested: { type: 'string' } }, required: ['requested'] } } as const;
export type GuardrailSettings = { active: boolean; turnCeiling: number; offTopicFlagStrikes: number };
export function guardrailSettingsFor(billing: 'free' | 'fuel'): GuardrailSettings;      // fuel: inactive
export function guardrailBlock(settings: GuardrailSettings, settledTurns: number): SystemBlock | null;   // free only: the scope rule; on the final free turn also the wrap-up instruction (record the elicitation now if you can; otherwise tell the NGO to start a fresh Discovery)
// discovery-turn.ts
DiscoveryModelRequest.tools: readonly (typeof RECORD_ELICITATION_TOOL | typeof DECLINE_OFF_TOPIC_TOOL | typeof RECORD_SCOPE_TOOL)[];
DiscoveryModelRequest.toolChoice?: { type: 'tool'; name: string };      // paramsFor and countTokens forward it; the sim records it
DiscoverySettleArgs.p_off_topic: boolean;                                // answer.ok && answer.toolUse?.name === 'decline_off_topic' && settings.active
DiscoveryMessageOutcome gains scopeReady: boolean (latest elicitation complete) and guardrail: { offTopicCount: number; flagged: boolean; notice: string | null } | null (null on fuel)
```

`discoveryPrepare` decides billing with `billingTargetFor` (it already reads `project`), adds
the guardrail block and the decline tool on free, and passes the two pins in `p_settings`.
`settleArgsFrom` maps the decline tool to `p_off_topic`. The settle RPC increments nothing: the
count is a query. Inside the settle, when `request_settings->'guardrails'->>'active'` and
`p_off_topic` and the count after this update equals the strikes pin, it calls
`emit_notification` for `discovery.off_topic_flagged` (platform admin, in-app and email,
payload `{ projectId, organizationId, strikes }`), built from `p_notice` the way the vetting
RPC does. `renderDiscoveryMessage` computes `guardrail` from the returned turn and count.

Taxonomy rows (TypeScript `TAXONOMY`, the SQL seed in the unit's migration, the req-016 suite
oracle `tests/at/suites/req-016/taxonomy.ts`, the requirement text, and
`seededEventNames()` in `req-016/_source-scan.ts` folded over every seeding migration):

```ts
{ event: 'discovery.off_topic_flagged',      recipients: ['platform_admin'], channels: ['email', 'inapp'], tone: 'normal', class: 'other', payloadKeys: ['projectId', 'organizationId', 'strikes'] }
{ event: 'discovery.regeneration_exhausted', recipients: ['platform_admin'], channels: ['email', 'inapp'], tone: 'normal', class: 'other', payloadKeys: ['projectId', 'organizationId', 'regenerations', 'lastReason'] }
```

## Pins (`tests/at/harness/atconfig.ts`, `config.ts`, constants in `discovery-metering.ts`, equalities in `_source-pins.ts`)

| dotted key | constant | value | source |
|---|---|---|---|
| `req-004.discovery.cause_labels_max` | `SCOPE_CAUSE_LABELS_MAX` | 3 | PRD REQ-004 "zero to three" (unit 1) |
| `req-004.discovery.turn_ceiling` | `DISCOVERY_TURN_CEILING` | founder rules at the unit 5 gate; `provisional: true` | architecture notes REQ-004 "platform-configurable, pilot-tuned" |
| `req-004.discovery.off_topic_flag_strikes` | `DISCOVERY_OFF_TOPIC_FLAG_STRIKES` | founder rules at the unit 5 gate; `provisional: true` | "repeated off-topic declines" |
| `req-004.discovery.regeneration_bound` | `DISCOVERY_REGENERATION_BOUND` | 3 | architecture notes REQ-004 "up to 3×" (unit 6) |

## The read

`discovery-conversation` gains `scopes: ScopeView[]` (ordered by version) and
`scope: ScopeView | null` (the `current` row). `d-conversation.test.ts`'s resume assertion gains
the two keys. `CallerReads` gains `discoveryScopesOf(projectId)`. No new read route.

## The suite

New files under `tests/at/suites/req-004/`: `g-scope-output.test.ts` (units 1 to 3),
`h-cause-labels.test.ts` (unit 4), `e-guardrails.test.ts` grows (unit 5),
`i-regeneration.test.ts` (unit 6). Fixtures: `fixtures/scope-tiers.ts` (three scope
fixtures, one per data tier, plus a full `record_scope` reply for the grant tracker),
`fixtures/food-bank.ts` (unit 4). `_contract.ts`: `DiscoverySut` gains `writeScope`,
`scopeRows`, `seedCauseLabelsAsOperator`, `causeLabelRows`, `notificationEvents(event)`;
`OperatorSettleInput` gains `offTopic`; new operator helpers `beginScopeAsOperator` and
`commitScopeAsOperator` for the integration tier. `_fixture.ts`: an in-memory scope table,
vocabulary set and outbox, using the same pure functions SQL restates. `_live.ts`: the
functions and SQL reads. `_pending.ts`: `prdAuthoring: 'prd.authoring'`,
`backlogDerivation: 'backlog.derivation'`. `_source-absences.ts` gains
`scopeDecompositionProblems()`, `labelCurationSurfaceProblems()` and
`scopeMoneyProblems()`, each refusing to report an absence over an empty product source.

| id | loop | integration | how |
|---|---|---|---|
| AT-004.20, .22 | green | red `vendors.anthropic` | scripted `record_scope` through the route; the real model is the integration claim, as AT-004.10 |
| AT-004.21 | green | green | source scan plus the runtime check over every rendered fixture and every scripted scope |
| AT-004.25 | green | green | render the three tier fixtures and check the sentences |
| AT-004.24 | red `backlog.derivation` | red | the absence scan runs, then pending: no producer of a PRD-derived backlog exists |
| AT-004.52 | red `prd.authoring` | red | the versioned read is proven stable across a regeneration and both resolvers pin one version, then pending |
| AT-004.58, .59 | green | red `vendors.anthropic` | scripted labels; the vocabulary in the system block; reuse, growth, and zero are asserted on rows |
| AT-004.60 | green | green | operator-seeded scope, remove-label through the function, the absence scan |
| AT-004.12 | green | red `vendors.anthropic` | the free request carries the block and the tool; a scripted decline counts; the model's choice is the live claim |
| AT-004.13 | green | green | operator settles with `offTopic` to the strikes pin; the notification row; the next reserve succeeds |
| AT-004.14 | green | green | operator settles to the ceiling; the next reserve is refused `turn-ceiling` with the sentence |
| AT-004.15 | green | red `checkout.project-fuel` | a funded project with fuel is what the live adapter cannot make |
| AT-004.37 | green | green | operator begin and commit prove the reasons, the versions and the unchanged allowance |
| AT-004.38 | green | green | the exhausted regenerate through the function: escalated row, notification, no model call |
| AT-004.39 | green | green | operator reserve, settle failed, reserve the same message: billing `retry`, zero reserved, zero charged |

## Build order and what each unit lands

1. **Scope contract** (feature lane): migration A, `scope.ts` (contract, tool, parser, request,
   structural renderer), the route with `generate`, begin and commit, the conversation read's
   two keys, `scopeReady`, the skill file, the `cause_labels_max` pin, tests .20 and .22 green
   at loop, the declaration moved. Guardrail and label machinery absent.
2. **Rendering** (feature lane): `scope-copy.ts`, the tier, maintenance, start-small and pricing
   sections, `scopeMoneyProblems`, the three fixtures, tests .21 and .25.
3. **Scope as contract** (feature lane): `ScopeContractRef`, the two resolvers, the
   decomposition absence scan, the two pending names, tests .24 and .52 red under them.
4. **Cause labels** (feature lane): migration B, the catalog entry, `normaliseLabels`, the
   vocabulary in the request, commit writes the vocabulary and the need, `remove-label`, the
   curation absence scan, tests .58 to .60; req-003's zero-label id still green.
5. **Guardrails** (feature lane, after the founder rules on the two pins): migration C, the
   tool, the block, `p_off_topic`, the ceiling refusal, the notice, the taxonomy row and its
   req-016 test, tests .12 to .15.
6. **Regeneration** (feature lane): migrations D1 and D2, `regenerate`, the bound pin, the
   escalation row and its taxonomy row and req-016 test, the retry billing branch, tests .37
   to .39.

No unit designs anything: this file decides the shapes, so every unit goes to the feature
lane, not the hardest-tasks lane.

## Grafts and rejections

- Base: candidate 2 (own table, own route, `decline_off_topic` tool, begin then commit).
- From candidate 4: record intent before the model runs (the `generating` row) and derive the
  retry from the ledger instead of a flag; its `waived` billing became `retry`, narrowed to the
  one case the acceptance id names.
- From candidate 1: `off_topic` as a column on the settled turn with the fuel CHECK; the
  vocabulary as `unreachable-by-client-roles` read inside a definer; the two consumers pinned to
  one version with refusal on a different one.
- From candidate 3: the pure-module layout in `scope.ts` with the copy beside it, the test
  sketches, the request shape with the transcript, the seed-oracle fix in req-016.
- Rejected: candidate 1's fourteen ledger columns, control turns, organisation-wide provider
  budget, buffered streaming and replayable settlement (it changes what AT-004.49 asserts);
  candidate 3's regenerate on `project-need` (the brief names a new route) and its
  in-reservation retry (charges the successful usage); candidate 4's event log and fold (a
  second read model where one table with a status enum answers every question) and its
  `using (true)` policy; candidate 2's begin-without-a-row (the bound race the judge found).
- Dropouts: none. All four lanes completed with verified receipts (codex receipts are
  `pinned-argv`, the documented pass shape).
- Cross-judge (astra at medium) recommended candidate 1 on provability and one-model, scoring
  it 1 on blast radius and 2 on smallness. The lead disagrees on the base: the six units are
  built by a fixed-contract writer, and a design that rewrites the tested ledger is the one
  most likely to be scrapped mid-run. The judge's grafts (one tool for replacement generation,
  the seed oracle fix, pure derivation of counts) are all taken.

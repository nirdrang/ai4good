# Candidate 4: an append-only Discovery event log, folded in TypeScript

Direction: one table `discovery_events` per project. Every fact this run adds (scope versions, regeneration requests and reasons, label removals, off-topic strikes, the founder flag, the ceiling, the escalation) is one appended row. Every read is a fold over the rows in TypeScript, exposed through one function. The versioned scope read is the fold at a given `seq`. Nothing is denormalised except `need_intakes.cause_labels`, which the fold writes through for the consumers that already read it.

## Problem

The credits run left a ledger that is immutable after settle and one structured output, the elicitation, stored on the settling turn. This run must add a second structured output (the scope), three guardrail facts (off-topic strikes, the founder flag, the ceiling), a bounded regeneration history with reasons, an escalation, a shared cause-label vocabulary with deletion-only correction, and a versioned read that two unbuilt consumers will take as their source. Six units, all of them facts that accrue over time on one project. Putting each one on the turn row fights the immutable allow-list; putting them on the need row invents a lifecycle engine that belongs to another requirement; scattering them over five tables makes "what state is this Discovery in" a five-way join with a rule in each. The constraints that shape the answer: `discovery_turns` keeps its CHECKs and its trigger (a `failed` turn charges zero; free `reserved_credits` is pinned to the ratio); every new table joins the tenant posture and every write goes through one inventory row plus one definer; notifications leave only through `emit_notification` from a definer with a taxonomy row in both tables; the chat page reads `text` and `data-turn` and ignores any other `data-*` part; the loop tier scripts the model and the integration tier runs it only with a key; `answerFrom` folds the first `tool_use` only.

## Usage (caller's view)

**The route module (`discovery-message`) after this run.** Nothing new to wire. The settle step gains events and the JSON answer gains `scope`, `notice` and `state`:

```ts
// supabase/functions/discovery-message/index.ts (unchanged shape; the spec's settle now appends events)
Deno.serve(writeRoute({
  name: 'discovery-message', target: organizationIdField, decide: decideDiscoveryMessage,
  prepare: discoveryPrepare(port, DISCOVERY_SKILLS),           // now folds the log: ceiling, scoped, strikes, vocabulary, mission
  settle: { rpc: 'discovery_turn_settle', act: discoveryAct(port), stream: discoveryStream(port) },
  render: renderDiscoveryMessage,                                 // { turn, reply, elicitation, allowance, scope, notice, state }
}));
```

**The conversation read.** One extra field, `state`, is the fold. A consumer that wants a version asks for it by `seq`:

```ts
const answer = await conversationAnswer(reads, projectId);
answer.body.conversation.state.scope?.version;        // 2
answer.body.conversation.state.scope?.document;       // the rendered markdown, derived on read
answer.body.conversation.state.regenerations;         // { used: 1, bound: 3, remaining: 2 }
answer.body.conversation.state.phase;                 // 'in_discovery' | 'scoped' | 'escalated'
```

**The NGO regenerates, then removes a label** (the one new write route, `discovery-scope`, whose actions are the event kinds the NGO may cause):

```ts
await sut.regenerateScope(session, { organizationId, projectId, reason: 'the stories miss the volunteer roster' });
// -> { ok: true, scope: { version: 2, seq: 7, ... }, state } at zero credits
// -> after the bound: { ok: true, escalated: true, state } and a platform-admin notification, no new scope

await sut.removeCauseLabel(session, { organizationId, projectId, label: 'hunger relief' });
// -> { ok: true, causeLabels: ['food security'], state }; need_intakes.cause_labels written through
```

**The wave-3 consumer** (PRD author, scorer) imports one function and one type and never touches the turns:

```ts
import { scopeSourceAt, type ScopeSource } from '../_shared/discovery-scope.ts';
const source: ScopeSource = scopeSourceAt(events, { version: 2 });   // pure; the same events give the same source, always
```

**A loop test of reuse (AT-004.58):**

```ts
await sut.seedCauseLabelsAsOperator(['food security']);
h.vendors.anthropic.script([
  { kind: 'tool', name: 'record_elicitation', input: elicitationFixture, text: 'Thanks, that is everything.', usage },
  { kind: 'tool', name: 'record_scope', input: { ...scopeFixture, causeLabels: ['food security'] }, usage },
]);
const sent = await sut.sendMessage(session, { organizationId, projectId, message: 'Yes, that is all.' });
expect(h.vendors.anthropic.requests()[1].system[1].text).toContain('"food security"');   // the model saw the vocabulary
expect(sent.scope?.causeLabels).toEqual(['food security']);
expect((await sut.readNeed(session, projectId)).value.need.causeLabels).toEqual(['food security']);
```

## Shape

### The data: one log, one vocabulary, one billing kind

```sql
-- supabase/migrations/2026MMDD120000_discovery_events.sql
create type public.discovery_event_kind as enum (
  'off_topic_declined',       -- {turnId, category}                      settle, free only
  'founder_flagged',          -- {turnId, strikes}                       settle, once per project
  'ceiling_reached',          -- {turnId, settledTurns}                  settle, once per project
  'scope_generated',          -- {turnId|null, regenerationOfSeq|null, scope, usage}   settle or regenerate
  'generation_failed',        -- {regenerationOfSeq|null, reason}        settle or regenerate
  'regeneration_requested',   -- {reason}                                NGO, via discovery-scope
  'label_removed',            -- {label}                                 NGO, via discovery-scope
  'escalated'                 -- {reason, regenerationsUsed, notificationEventId}   once per project
);
create table public.discovery_events (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid not null,
  org_id           uuid not null,
  seq              integer not null,
  kind             public.discovery_event_kind not null,
  payload          jsonb not null,
  actor_account_id uuid,                         -- null for a platform cause
  created_at       timestamptz not null default clock_timestamp(),
  foreign key (project_id, org_id) references public.projects (id, org_id) on delete cascade,
  unique (project_id, seq),
  constraint discovery_events_payload_is_object check (jsonb_typeof(payload) = 'object')
);
-- once-per-project kinds are unique BY INDEX, so a racing second append is a no-op, not a rule in code
create unique index discovery_events_one_flag       on public.discovery_events (project_id) where kind = 'founder_flagged';
create unique index discovery_events_one_ceiling    on public.discovery_events (project_id) where kind = 'ceiling_reached';
create unique index discovery_events_one_escalation on public.discovery_events (project_id) where kind = 'escalated';
-- append-only: the trigger refuses update and delete outright (no allow-list, unlike the turn ledger)
create function public.discovery_event_immutable() returns trigger language plpgsql set search_path = '' as $$
begin raise exception 'Discovery events are append-only' using errcode = '42501'; end; $$;
create trigger discovery_events_immutable before update or delete on public.discovery_events
  for each row execute function public.discovery_event_immutable();
-- tenant-isolated, the discovery_turns shape
revoke all on table public.discovery_events from anon, authenticated, service_role;
alter table public.discovery_events enable row level security;
grant select on public.discovery_events to authenticated;
create policy discovery_events_select_org_member on public.discovery_events for select to authenticated using (public.viewer_is_org_member(org_id));
create policy discovery_events_select_platform_admin on public.discovery_events for select to authenticated using (public.viewer_is_platform_admin());

-- the shared vocabulary: insert-only, machine-owned; the key IS the normalised label
create table public.cause_labels (
  label             text primary key check (label = btrim(lower(label)) and label <> ''),
  first_project_id  uuid not null references public.projects (id) on delete set null,
  created_at        timestamptz not null default clock_timestamp()
);
revoke all on table public.cause_labels from anon, authenticated, service_role;
alter table public.cause_labels enable row level security;
grant select on public.cause_labels to authenticated;
create policy cause_labels_select_authenticated on public.cause_labels for select to authenticated using (true);
-- no insert/update/delete grant to any client role; only the two definers below insert; nothing ever deletes a row

-- the zero-cost retry: a third billing kind that touches no credits, like fuel
alter type public.discovery_billing add value 'waived';
-- in the same migration: drop and recreate discovery_turns_fuel_touches_no_credits as
--   check (billing = 'free' or (reserved_credits = 0 and coalesce(charged_credits, 0) = 0))
```

`discovery_turn_reserve` gains one rule: if the project's latest turn is `failed` or `abandoned` and `btrim(p_message)` equals its `user_message`, the new row is `billing = 'waived'` with `reserved_credits = 0` and no debit. That is AT-004.39: the retry is identified by the ledger, not by a client flag, and it is idempotent because a second identical retry after a waived settle sees a settled turn and bills normally. Free turns past the ceiling are refused in TypeScript (below); the SQL reserve is unchanged there because one racing extra turn is harmless.

`discovery_turn_settle` gains three arguments: `p_events jsonb` (the rows to append, in order), `p_cause_labels text[]` (write-through when the events carry a `scope_generated`; null otherwise), `p_notice jsonb` (the prepared founder-flag notification, or null). It appends through one internal function, inserts new vocabulary rows `on conflict (label) do nothing`, updates `need_intakes.cause_labels`, and emits the notification inside the `founder_flagged` insert branch only when that insert returned a row. One transaction; a settle failure rolls all of it back.

```sql
-- the one appender; revoked from every role; called by the two definers only
create function public.discovery_events_append(p_project_id uuid, p_org_id uuid, p_actor uuid, p_events jsonb)
returns jsonb  -- { appended: [ {seq, kind} ], skipped: [ kind ] }   (skipped = once-per-project kinds already present)
language plpgsql set search_path = '' as $$ /* insert ... on conflict do nothing returning seq; seq = max(seq)+1 per row */ $$;

-- the NGO's route: one definer, two actions, an optimistic guard on the log
create function public.discovery_scope_append(
  p_account_id uuid, p_organization_id uuid, p_project_id uuid,
  p_expected_seq integer,          -- the max seq the TypeScript fold decided on; mismatch -> 'stale-log'
  p_events jsonb,                  -- regeneration_requested | scope_generated | generation_failed | label_removed | escalated
  p_cause_labels text[],           -- the fold's resulting label list, written through; null = untouched
  p_notice jsonb                   -- the prepared escalation notification, or null
) returns jsonb language plpgsql security definer set search_path = '' as $$
  /* assert_account_active; org for share; admin membership; project for update; need stage = discovery_in_progress;
     if (select max(seq)) is distinct from p_expected_seq then raise 'stale-log';
     append; if p_cause_labels is not null then update need_intakes; if an 'escalated' row was inserted then emit;
     return { events: [...all rows of the project...], need: {cause_labels} } */ $$;
grant execute on function public.discovery_scope_append(uuid, uuid, uuid, integer, jsonb, text[], jsonb) to service_role;
```

Two taxonomy rows, in `TAXONOMY` and the SQL seed, each with a req-016 test:

```ts
{ event: 'discovery.off_topic_flagged',       recipients: ['platform_admin'], channels: null,              tone: 'normal', class: 'other',    payloadKeys: ['strikes'] },
{ event: 'discovery.regeneration_exhausted',  recipients: ['platform_admin'], channels: ['email', 'inapp'], tone: 'normal', class: 'decision', payloadKeys: ['regenerationsUsed', 'lastReason'], opsItem: true },
```

Neither name matches `/scope[._-]?change/`, `/change[._-]?request/`, `/\bcr\b/` or `/donat/`.

### The fold: the single source of truth

```ts
// supabase/functions/_shared/discovery-scope.ts   (pure: no I/O, relative imports only; NOT scope.ts, so it stays outside the
// 'scope.service' non-sender paths, which belong to a later requirement)
export type DiscoveryEventRow = { id: string; project_id: string; org_id: string; seq: number; kind: DiscoveryEventKind; payload: unknown; actor_account_id: string | null; created_at: string };
export type DiscoveryEvent =
  | { seq: number; kind: 'off_topic_declined'; turnId: string; category: OffTopicCategory }
  | { seq: number; kind: 'founder_flagged'; turnId: string; strikes: number }
  | { seq: number; kind: 'ceiling_reached'; turnId: string; settledTurns: number }
  | { seq: number; kind: 'scope_generated'; turnId: string | null; regenerationOfSeq: number | null; scope: Scope; usage: ModelUsage }
  | { seq: number; kind: 'generation_failed'; regenerationOfSeq: number | null; reason: string }
  | { seq: number; kind: 'regeneration_requested'; reason: string; actorAccountId: string }
  | { seq: number; kind: 'label_removed'; label: string; actorAccountId: string }
  | { seq: number; kind: 'escalated'; reason: string; regenerationsUsed: number; notificationEventId: string | null };
/** Boundary parse: an unknown kind or a payload that does not fit its kind throws; the read answers 502, never a guessed state. */
export function parseDiscoveryEvent(row: DiscoveryEventRow): DiscoveryEvent { throw new Error('not implemented'); }

export type ScopeVersion = { version: number; seq: number; turnId: string | null; scope: Scope; regeneration: { reason: string; requestedSeq: number } | null; generatedAt: string };
export type DiscoveryState = {
  readonly maxSeq: number;                                  // what the writer passes as p_expected_seq
  readonly versions: readonly ScopeVersion[];               // ascending; versions[n-1] is current
  readonly scope: ScopeVersion | null;
  readonly causeLabels: readonly string[];                  // current scope's labels minus label_removed since that scope; [] before a scope
  readonly regenerations: { used: number; bound: number; remaining: number; inFlight: { seq: number; reason: string } | null };
  readonly escalation: { seq: number; reason: string } | null;
  readonly offTopic: { strikes: number; flagged: boolean; flagStrikes: number };
  readonly ceiling: { reached: boolean; turns: number };
  readonly phase: 'in_discovery' | 'scoped' | 'escalated';  // the "scoped" mark, derived, no lifecycle engine
};
export type FoldPins = { regenerationBound: number; offTopicFlagStrikes: number; turnCeiling: number };
/** THE read. Every consumer in this run calls this and nothing else. `upToSeq` gives the state as it was at that seq. */
export function foldDiscoveryLog(events: readonly DiscoveryEvent[], pins: FoldPins, upToSeq?: number): DiscoveryState { throw new Error('not implemented'); }

/** The versioned read for the PRD author and the scorer: pure, total over (events, version). */
export type ScopeSource = { projectId: string; version: number; seq: number; scope: Scope; causeLabels: readonly string[] };
export function scopeSourceAt(projectId: string, events: readonly DiscoveryEvent[], at: { version: number } | { seq: number } | 'current'): ScopeSource | null { throw new Error('not implemented'); }

// fold rules, so a reader can check them without the body:
// used            = count(regeneration_requested) - count(generation_failed with regenerationOfSeq != null)
// inFlight        = the last regeneration_requested with no scope_generated/generation_failed after it
// causeLabels     = scope.causeLabels \ { label_removed.label with seq > scope.seq }
// flagged         = exists founder_flagged;  strikes = count(off_topic_declined)
// phase           = escalated ? 'escalated' : scope ? 'scoped' : 'in_discovery'
```

### The contract and its tool

```ts
// supabase/functions/_shared/discovery-prompt.ts (additions)
export type ComplexityTier = 'small' | 'medium' | 'large';
export type SensitivityTier = 'tier0' | 'tier1' | 'tier2';
export type Scope = {
  summary: string;
  userStories: { story: string; acceptanceCriteria: string[] }[];
  suggestedStack: string[];
  complexity: { tier: ComplexityTier; rationale: string };
  riskFlags: string[];
  dataSensitivity: { tier: SensitivityTier; rationale: string };        // shape now; the tiers leaf fills the judgment
  maintainabilityFit: { verdict: 'fit' | 'declined'; rationale: string }; // shape now; the fit leaf fills the judgment; this run's prompt emits 'fit'
  causeLabels: string[];                                                  // 0..3, each btrim(lower()), parse refuses more
  lovable: { recommended: boolean; rationale: string };
  buildSplit: { lovable: string[]; claudeCode: string[] };               // both keys required by schema; both non-empty by parse (AT-004.22)
};
export const RECORD_SCOPE_TOOL = {
  name: 'record_scope', strict: true,
  description: 'Record the technical scope of this NGO software need. Never state a project or build cost.',
  input_schema: { type: 'object', additionalProperties: false, required: [/* every key above */],
    properties: {
      summary: { type: 'string' }, userStories: /* as RECORD_ELICITATION_TOOL.userStories */, suggestedStack: strings,
      complexity: { type: 'object', additionalProperties: false, required: ['tier', 'rationale'], properties: { tier: { type: 'string', enum: ['small', 'medium', 'large'] }, rationale: { type: 'string' } } },
      riskFlags: strings,
      dataSensitivity: { type: 'object', additionalProperties: false, required: ['tier', 'rationale'], properties: { tier: { type: 'string', enum: ['tier0', 'tier1', 'tier2'] }, rationale: { type: 'string' } } },
      maintainabilityFit: { type: 'object', additionalProperties: false, required: ['verdict', 'rationale'], properties: { verdict: { type: 'string', enum: ['fit', 'declined'] }, rationale: { type: 'string' } } },
      causeLabels: strings,
      lovable: { type: 'object', additionalProperties: false, required: ['recommended', 'rationale'], properties: { recommended: { type: 'boolean' }, rationale: { type: 'string' } } },
      buildSplit: { type: 'object', additionalProperties: false, required: ['lovable', 'claudeCode'], properties: { lovable: strings, claudeCode: strings } },
    } },
} as const;
export const DECLINE_OFF_TOPIC_TOOL = {
  name: 'decline_off_topic', strict: true,
  description: 'Call this when the NGO asks for something other than scoping this need, and redirect them in your text.',
  input_schema: { type: 'object', additionalProperties: false, required: ['category'],
    properties: { category: { type: 'string', enum: ['general_qa', 'document_drafting', 'translation', 'coding_help', 'other'] } } },
} as const;
export type DiscoveryTool = typeof RECORD_ELICITATION_TOOL | typeof RECORD_SCOPE_TOOL | typeof DECLINE_OFF_TOPIC_TOOL;
/** Stricter than the schema, like parseElicitation: labels normalised and at most DISCOVERY_CAUSE_LABELS_MAX; both split parts non-empty. */
export function parseScope(input: unknown): Scope | null { throw new Error('not implemented'); }
export function parseOffTopic(input: unknown): OffTopicCategory | null { throw new Error('not implemented'); }

/** Third system block, UNCACHED, present on every chat turn. Vocabulary and mission change; the cached block never does. */
export type DiscoveryContext = { vocabulary: readonly string[]; mission: string | null; guardrail: 'free' | 'none'; wrapUp: boolean };
export function discoverySystemPrompt(need: DiscoveryNeed, skills: readonly DiscoverySkill[], context: DiscoveryContext): SystemBlock[] { throw new Error('not implemented'); }
// blocks: [template+skills cached] [need json] [vocabulary + mission + (guardrail === 'free' ? SCOPE_RULE_TEXT : '') + (wrapUp ? WRAP_UP_TEXT : '')]

/** The generator's request: its own cached template, the elicitation, need, mission, vocabulary, then the transcript; tool_choice forced. */
export function scopeGenerationRequest(input: { need: DiscoveryNeed; elicitation: Elicitation; transcript: DiscoveryModelRequest['messages']; context: DiscoveryContext; model: string; regenerationReason: string | null }): DiscoveryModelRequest { throw new Error('not implemented'); }
```

`DiscoveryModelRequest` widens: `tools: DiscoveryTool[]` and `toolChoice?: { name: string }`. `anthropicMessagesPort.paramsFor` forwards `tool_choice` when present; the sim ignores it. `answerFrom` stays first-`tool_use`-only, because in this design no turn ever needs two tools: the elicitation turn calls `record_elicitation`, a decline turn calls `decline_off_topic`, and the scope comes from a separate model call inside the same settle step.

### The flow of a chat turn

1. `discoveryPrepare` reads, as the caller: the need; the turns; the events (`reads.discoveryEventsOf`, new); the vocabulary (`reads.causeLabelVocabulary`, new); the organisation's mission (`reads.organization`, exists); the project's `funded_at` (added to the `project` select list). It folds. Refusals, in this order: `need-scoped` when `state.phase !== 'in_discovery'` (the reason names the regenerate action); `turn-ceiling` when billing is free and `settled free+waived turns >= turnCeiling` (the reason directs the NGO to a fresh Discovery). Otherwise it builds the request with `guardrail: billing === 'free' ? 'free' : 'none'`, `wrapUp: billing === 'free' && settledTurns + 1 === turnCeiling`, and the tools `[RECORD_ELICITATION_TOOL, ...(free ? [DECLINE_OFF_TOPIC_TOOL] : [])]`. The fold and the context ride on the args under a second `Symbol`, beside `PREPARED_REQUEST`, so SQL never sees them.
2. Reserve is unchanged, except the waived retry.
3. `discoveryAct` / `discoveryStream`: the chat call as today. Then `settleArgsFrom` becomes `settleArgsFrom(reservation, answer, accountId, prepared: PreparedContext, generate: ScopeGenerator)`:
   - `decline_off_topic` on a free turn: event `off_topic_declined`; if `strikes + 1 === flagStrikes` and not flagged: event `founder_flagged` and `p_notice` for `discovery.off_topic_flagged`. The JSON answer and the stream carry `notice: OFF_TOPIC_NOTICE_COPY` (plain copy from `discovery-scope-copy.ts`), whenever `strikes >= flagStrikes`.
   - `record_elicitation` parsed: `generate(elicitation)` runs the second model call (`port.create(scopeGenerationRequest(...))`); `record_scope` parsed: event `scope_generated { turnId, regenerationOfSeq: null, scope, usage }` and `p_cause_labels = scope.causeLabels`; not parsed or the call fails: event `generation_failed { reason }`. The turn still settles `completed` with its elicitation; the NGO's next message on a scoped-less need is refused by nothing, and the model is told (through `wrapUp`-like copy in the third block: "a scope generation failed; call record_elicitation again") to try again. Regeneration is not consumed.
   - `wrapUp` turn without an elicitation: event `ceiling_reached { turnId, settledTurns }`; the reply text already directs to a fresh Discovery because the wrap-up block told the model to.
   - On fuel: none of the above except `scope_generated` / `generation_failed`.
4. `discovery_turn_settle` writes the turn, appends the events, upserts the vocabulary, writes through `cause_labels`, emits inside the flag branch. Returns `{ turn, allowance, events, need }`.
5. `renderDiscoveryMessage` folds the returned events and answers `{ turn, reply, elicitation, allowance, scope: state.scope, notice, state }`. The stream emits `data-turn` as today, then `data-scope { version, seq }` when a scope was generated, then `data-notice { text }` when a notice applies. The page ignores both today.

### The flow of the scope route

```ts
// supabase/functions/_shared/discovery-scope-route.ts
export type DiscoveryScopeArgs = { p_account_id: string; p_organization_id: string; p_project_id: string; p_expected_seq: number; p_events: DiscoveryEventInput[]; p_cause_labels: string[] | null; p_notice: NoticeSpec | null; [PREPARED_GENERATION]?: { request: DiscoveryModelRequest; requestedSeq: number } };
export function decideDiscoveryScope(input: AccountWriteRouteInput): WriteRouteDecision<DiscoveryScopeArgs>;   // action 'regenerate' {reason: 1..DISCOVERY_REASON_MAX_CHARS} | 'remove_label' {label}; unknown keys refused
export function discoveryScopePrepare(port: MessagesPort, skills: readonly DiscoverySkill[]): (caller, args, reads) => Promise<WriteRouteDecision<DiscoveryScopeArgs>>;
//   regenerate:    fold; 'no-scope-yet' if phase === 'in_discovery'; 'scope-escalated' if phase === 'escalated' (idempotent: the answer repeats the escalation, no event);
//                  'regeneration-in-flight' if inFlight is younger than DISCOVERY_TURN_DEADLINE_SECONDS;
//                  remaining === 0 -> p_events [escalated{reason, used}], p_notice for discovery.regeneration_exhausted, no generation;
//                  else p_events [regeneration_requested{reason}] and the prepared generation request under the Symbol.
//   remove_label:  fold; 'label-not-present' unless state.causeLabels includes it; p_events [label_removed{label}], p_cause_labels = fold minus label.
export function discoveryScopeAct(port: MessagesPort): (reserved: unknown, args: DiscoveryScopeArgs) => Promise<SettleActResult>;
//   only when a generation was prepared: port.create(request) -> settle args { p_expected_seq: requestedSeq, p_events: [scope_generated{turnId:null, regenerationOfSeq}] | [generation_failed], p_cause_labels }
export function renderDiscoveryScope(value: unknown): { scope: ScopeVersion | null; escalated: boolean; causeLabels: string[]; state: DiscoveryState };
```

`WRITE_ROUTES['discovery-scope'] = { surface: { kind: 'edge', rpc: 'discovery_scope_append' }, standing: { kind: 'account-required', admits: ['ngo'] } }`, with `settle: { rpc: 'discovery_scope_append', act: discoveryScopeAct(port) }`. The same pipeline as `discovery-message`: decide, prepare, one RPC (the request is logged before the model runs, so the reason is durable even if the model call dies), act, one RPC. Regeneration is not a turn: no `discovery_turns` row, no reservation, no CHECK to satisfy, zero credits by construction; the call's usage is recorded on the event for operators. New refusal kinds: `turn-ceiling`, `need-scoped`, `no-scope-yet`, `scope-escalated`, `regeneration-in-flight`, `stale-log`, `label-not-present`. The route name carries none of `grant`, `credit`, `allowance`, `circuit`, `breaker`, or `platform`.

### Rendering, money-free

```ts
// supabase/functions/_shared/discovery-scope-render.ts   (pure)
export function renderScopeDocument(scope: Scope): string;                  // markdown; sections: summary, stories, stack, complexity + start-small, data tier (tier2 adds fixtures-only), maintenance, risks, build split, cause labels, Lovable + pricing link when recommended
/** The runtime half of AT-004.21: a currency sign, 'USD', 'dollar(s)', 'cost', 'estimate' or 'budget' outside the allow-listed maintenance sentence is a problem. */
export function scopeDocumentMoneyProblems(markdown: string): string[];
// supabase/functions/_shared/discovery-scope-copy.ts
export const SCOPE_COPY = { maintenanceSentence: '…about $25 a month, paid by you directly to Lovable…', lovablePricingUrl: 'https://lovable.dev/pricing', dataTier: { tier0, tier1, tier2 }, startSmall, ownership, offTopicNotice, ceilingWrapUp, escalation } as const;
```

The document is derived on read from the stored contract (`state.scope.document`), never stored; the static half of AT-004.21 is a scan in the `_source-absences.ts` shape over the copy module, the renderer, the tool descriptions and the skill markdown for money words other than the allow-listed sentence and URL.

### Pins

| dotted key | constant (`discovery-metering.ts`) | value | source |
|---|---|---|---|
| `req-004.discovery.turn_ceiling` | `DISCOVERY_TURN_CEILING` | founder rules; `provisional: true` with 12 as the placeholder | architecture notes REQ-004 ("platform-configurable, pilot-tuned") plus the ruling at the unit 5 gate |
| `req-004.discovery.off_topic_flag_strikes` | `DISCOVERY_OFF_TOPIC_FLAG_STRIKES` | 3, `provisional: true` | "repeated off-topic declines"; needs the same ruling |
| `req-004.discovery.regeneration_bound` | `DISCOVERY_REGENERATION_BOUND` | 3 | architecture notes REQ-004 "up to 3×" |
| `req-004.discovery.cause_labels_max` | `DISCOVERY_CAUSE_LABELS_MAX` | 3 | PRD REQ-004 "zero to three" |

`_source-pins.ts` gains four equalities; the SQL sentences for the two that reach SQL (none do: the bound and the ceiling are enforced in TypeScript from the fold) need no pin scan.

### Invariants and where they live

- Append-only, encoded in the trigger; once-per-project kinds, encoded in partial unique indexes; the vocabulary is insert-only and normalised, encoded in the CHECK and the absent grants (`encode-lessons-in-structure`).
- The bound, the flag threshold, the ceiling: one rule each, in the fold, read from pins; SQL guards the decision with `p_expected_seq` for the NGO's route and with the unique indexes for the settle path (`single source of truth`, `make-operations-idempotent`).
- Zero-cost regeneration: no ledger row exists to charge (`subtract-before-you-add`). Zero-cost retry: a billing kind the CHECKs already know how to keep at zero.
- The scoped mark is `phase`, derived; the stage column is untouched, so the lifecycle requirement finds it as it left it.
- Validation at the edge only: `parseScope`, `parseOffTopic`, `parseDiscoveryEvent`, `decideDiscoveryScope`. Inside, `DiscoveryState` and `Scope` are trusted (`boundary-discipline`).
- Deliberately not done: no scope-to-tasks path (a scan proves it), no label create or curate surface (the route has two actions and the scan proves nothing else exists), no admin taxonomy surface, no in-place scope edit, no chat after the scope (regeneration is the only way to change it), no fuel charging for the generator (the stub returns 0 today).

Interface depth: the public surface is one write route with two actions, one extra field on one read, one function for consumers. Behind it sit eight event kinds, the fold, the second model call, the write-through and two notifications. Callers see none of the mechanics.

### Acceptance ids

| id | loop | integration | reason |
|---|---|---|---|
| AT-004.20, .22 | green | red `vendors.anthropic` | scripted `record_scope`; the real model is the integration claim, as AT-004.10 |
| AT-004.21 | green | green | static scan plus `scopeDocumentMoneyProblems` over the three fixtures |
| AT-004.25 | green | green | pure render of three fixtures under `fixtures/scope-tier{0,1,2}.ts` |
| AT-004.24 | green | green | absence scan: no module reads `discovery_events`/`scope_generated`/`Scope` and writes a task or backlog row; throws when it finds no product source |
| AT-004.52 | red `prd.authoring` | red `prd.authoring` | new `AWAITED.prdAuthoring`; the consumers do not exist; the stub `scopeSourceAt` is proven by a harness selftest without an id |
| AT-004.58, .59 | green | red `vendors.anthropic` | seeded vocabulary, scripted label; the request's third block carries the vocabulary; `.59` scripts a new label (vocabulary grows) and a `causeLabels: []` scope |
| AT-004.60 | green | green | `remove_label` live; scan over routes, folders, modules, UI routes, migrations for create/curate/taxonomy surfaces |
| AT-004.12 | green | red `vendors.anthropic` | scripted `decline_off_topic`; the free request carries `SCOPE_RULE_TEXT` and the tool; the fuel request carries neither |
| AT-004.13 | green | green | three declines through operator settle with `events` (extend `OperatorSettleInput`); flag event once, notification row once, a fourth reserve still accepted |
| AT-004.14 | green | green | seed `ceiling - 1` turns; the ceiling turn's request has the wrap-up block; the next reserve is `turn-ceiling` |
| AT-004.15 | green | red `checkout.project-fuel` | funded fixture needs fuel; live throws today |
| AT-004.37, .38 | green | green | operator `appendScopeEventsAsOperator` proves bound, reasons, no ledger row, escalation row and its notification; the model is not the claim |
| AT-004.39 | green | green | failed turn, identical retry: `billing = 'waived'`, spend unchanged |

## Synthesis decision

*Filled in by arena.*

## Tradeoffs accepted

- We accept a second Opus call inside the settle step of the completing turn (longer wait before `data-turn`, more time under the 150 s deadline) in exchange for one generator used by both the first generation and every regeneration, and a port that keeps its one-tool answer shape.
- We accept that the first scope generation is not on the credit ledger (the NGO paid for the turns; the call's usage sits on the event) in exchange for regeneration being zero-cost by construction rather than by a CHECK exception.
- We accept a fold on every prepare and every read (a few dozen rows per project, one indexed select) in exchange for no denormalised counters that could drift.
- We accept a new tenant posture for `cause_labels` (readable by every authenticated account, which `TENANT_CATALOG` cannot say today) in exchange for the model reading the vocabulary as the caller, the way it reads everything else.
- We accept refusing chat after the scope (`need-scoped`) in exchange for the regeneration bound meaning something; a second `record_elicitation` through chat would otherwise be an unbounded free regeneration.
- We accept a third billing kind, `waived`, in the enum and one rewritten CHECK, in exchange for a retry identified by the ledger and not by a client flag.

## Alternatives considered

- **Scope as a jsonb column on the settling turn** (the elicitation pattern). Hides nothing: regeneration then needs a turn, and a zero-cost free turn breaks `free_reserved_at_ratio` and `settled_is_measured` or needs a billing kind of its own; reasons, strikes and the flag still need somewhere else to live. Lost on the number of places a reader must look to answer "what state is this Discovery in".
- **Scope and counters on `need_intakes`** (columns `scope`, `scope_version`, `regenerations_used`, `off_topic_strikes`, `flagged_at`). Exposes the counters to every reader of the need and invents the lifecycle mark this run must not build. Versions would need a side table anyway. Lost on shared mutable state: two writers (settle and the scope route) updating one row.
- **Two tools in one model answer** (`record_elicitation` and `record_scope` on the same turn). Needs a list on `DiscoveryModelAnswer`, a change in `answerFrom` and the sim, and puts the whole scope inside a chat turn's `max_output_tokens` budget that the allowance may have shrunk to 512. Lost on the budget alone.

## Open questions and risks

- What is the turn ceiling's number? The pin ships `provisional: true` until the founder rules at the unit 5 gate. Is three strikes the flag threshold, or does the founder want another number?
- Should chat continue after a scope exists (this design refuses with `need-scoped`), or should a post-scope message be allowed and simply not regenerate?
- Is a second Opus call inside the settle of a streamed turn acceptable for the page's wait, or should the completing turn settle first and the generation run under `EdgeRuntime.waitUntil` with its own `scope_generated` append (the log makes that split cheap, but the JSON path then answers before the scope exists)?
- The vocabulary posture: is a third catalog posture the right change to the auth scan, or should the vocabulary be read through a definer read function granted to `authenticated`?
- Does the founder want the first generation's usage charged as part of the completing turn (a second reservation), or is "the NGO paid for the turns" enough for the pilot?
- Risk: `alter type ... add value` cannot run inside a transaction block with a use of the new value; the migration must add the value in its own statement before the CHECK rewrite. The supabase migration runner wraps each file; verify on the local stack before the unit lands.
- Risk: the 'prd.authoring' pending name is new; the manifest's cross-contracts line must accept it, or `AWAITED.publishFlow` is reused with a note.

## Next implementation step

Write the migration (`discovery_events`, `cause_labels`, `waived`, the appender, the settle and scope definers, the two taxonomy seed rows) and `discovery-scope.ts` with `parseDiscoveryEvent`, `foldDiscoveryLog` and `scopeSourceAt`, then the harness selftest that folds a hand-written event list through every rule above.

## Module map

New:
- `supabase/migrations/2026MMDD120000_discovery_events.sql` (tables, enum value, appender, `discovery_scope_append`, replaced `discovery_turn_reserve` and `discovery_turn_settle`, taxonomy seed rows)
- `supabase/functions/_shared/discovery-scope.ts` (events, fold, `scopeSourceAt`, `ScopeSource`)
- `supabase/functions/_shared/discovery-scope-route.ts` (decide, prepare, act, render for `discovery-scope`)
- `supabase/functions/_shared/discovery-scope-render.ts`, `discovery-scope-copy.ts`
- `supabase/functions/_shared/discovery-skills/05-record-the-scope.md`, `06-stay-on-scope.md` (regenerated into `index.ts`)
- `supabase/functions/discovery-scope/index.ts`; `[functions.discovery-scope] verify_jwt = true` in `supabase/config.toml`
- `tests/at/suites/req-004/e-scope-output.test.ts` (.20, .21, .22, .25), `f-scope-contract.test.ts` (.24, .52), `g-cause-labels.test.ts` (.58, .59, .60), `h-guardrails.test.ts` (.12 to .15), `i-regeneration.test.ts` (.37, .38, .39)
- `tests/at/suites/req-004/fixtures/scope-tier0.ts`, `scope-tier1.ts`, `scope-tier2.ts`, `scope-events.ts`
- `tests/at/suites/req-004/_scope-absences.ts` (task path, label surface, money words)
- `tests/at/harness/discovery-fold.selftest.ts` (the fold rules and `scopeSourceAt` stability, no id)
- `tests/at/suites/req-016/` one test each for the two taxonomy rows

Changed:
- `discovery-prompt.ts` (tools, `Scope`, parsers, third block, generator request), `discovery-turn.ts` (`DiscoveryModelRequest`, prepare, `settleArgsFrom` with events, settle args, conversation `state`, render), `discovery-reads.ts` (`discoveryEventsOf`, `causeLabelVocabulary`, `project.funded_at`), `discovery-metering.ts` (four constants, `billingTargetFor` gains `waived`), `discovery-stream.ts` (`dataScope`, `dataNotice`), `anthropic-messages.ts` (`tool_choice`), `edge.ts` (`callerReads` select lists; stream emits the two parts), `write-routes.ts` (route row, seven refusal kinds), `notification-taxonomy.ts` (two rows), `notification-copy.ts` (two copies)
- `tests/at/suites/req-004/_contract.ts` (`regenerateScope`, `removeCauseLabel`, `seedCauseLabelsAsOperator`, `appendScopeEventsAsOperator`, `eventRows`, `OperatorSettleInput.events`, outcome fields), `_fixture.ts`, `_live.ts`, `_pending.ts` (`prdAuthoring`), `_source-pins.ts`, `z-later-runs.test.ts` (sixteen placeholders removed), `d-conversation.test.ts` line 58 (three blocks)
- `tests/at/expected/req-004.json`; `tests/at/harness/atconfig.ts`, `config.ts` (four pins)
- `tests/at/suites/req-001/_policy-scan.ts` (`discovery_events` tenant-isolated; `cause_labels` under the new posture)

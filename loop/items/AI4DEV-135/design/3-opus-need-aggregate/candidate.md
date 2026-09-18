# Candidate 3: the need is the aggregate

One design for the six units of the scope output run. The scope, its version, its rendered document, the regeneration log, the off-topic count and the founder flag are columns of `need_intakes`, the row that already is "the project's need". The vocabulary is one small table, `cause_labels`. One pure module, `supabase/functions/_shared/scope.ts`, owns the contract type, the tool schema, the parser, the renderer, the label normaliser, the guardrail arithmetic and the regeneration bound. The shell stays where it is: `discovery-message` chains the scope call onto the settle that completes the elicitation, and `project-need` gains two actions, `regenerate` and `remove_label`. No new route, no new stream part, no new ledger kind.

## Problem

The tree stores one structured output, the `record_elicitation` payload, as a jsonb column on the settling turn of an immutable ledger. Sixteen acceptance ids now need a second, larger structured output (the scope), a rendered document of it, a versioned read for two consumers that do not exist, a shared cause vocabulary with a deletion-only correction, free-phase guardrails whose facts the platform records, and a bounded zero-credit regeneration with an admin escalation. Four constraints shape the design more than the others. The turn ledger's CHECKs bind every free turn to a reservation and a charge, so a zero-credit regeneration cannot be a turn without a new billing kind. The chat page fixes the stream format, and the acceptance suite asserts the conversation read's exact keys (`d-conversation.test.ts` line 31), so the scope should not ride on the conversation view. The write-route inventory and the tenant catalog make every new route and table a five-file change, so fewer of each is better. And `NOTIFICATION_COMPONENTS['scope.service']` already names `supabase/functions/_shared/scope.ts` as a declared non-sender, so that file is where the scope logic belongs.

The need row answers all four. It is mutable (only `tier2_classified_at` is frozen), tenant-isolated, already carries `cause_labels`, already has a write route with an action switch and a definer with per-action helpers (`need_intake_save`, `need_intake_attach`, `need_intake_submit`), and already has a read route with an explicit select list. "The scope of this need" is a property of the need, and the row that represents the need is where it lives.

## Usage (caller's view)

The wiring leaf reads the scope through the existing `need-intake` read: the need view gains `scope`, `scopeVersion`, `scopeMarkdown`, `scopeVersions`, `regenerations`, `guardrail` and `escalation` fields. A completed chat turn's answer (JSON body or the `data-turn` part) gains `scope` and `guardrail` keys the page ignores today. The NGO regenerates and removes a label through `project-need` with two new actions. A platform admin sees the founder flag on the need read and receives one notification when the regeneration bound is exhausted. Nothing else is new at the surface.

```
POST project-need   { organizationId, action: 'regenerate', projectId, reason }
  -> { ok: true, changed: true, need, regeneration: { outcome: 'regenerated', version: 2 } }
  -> { ok: true, changed: true, need, regeneration: { outcome: 'escalated', notificationEventId } }
  -> { ok: false, kind: 'scope-not-generated' | 'stale-scope' | ... }
POST project-need   { organizationId, action: 'remove_label', projectId, label }
  -> { ok: true, changed: true | false, need }
POST discovery-message { organizationId, projectId, message }
  -> { ok: true, turn, reply, elicitation, allowance, scope: ScopeView | null, guardrail: GuardrailView | null }
  -> { ok: false, kind: 'turn-ceiling-reached', reason }     (free billing only)
POST need-intake    { projectId }
  -> { ok: true, need: NeedIntakeView }   with need.scope, need.scopeVersion, need.scopeVersions, ...
```

The suite keeps `bindSuite({ requirement: 'req-004', sut: 'discovery' })`. `DiscoverySut` gains `regenerateScope`, `removeCauseLabel`, `seedCauseLabelsAsOperator`, `causeLabelRows`, `notificationEvents` and `needRow` already exists. The six call sites below are the shape the test files take.

### Unit 1, the scope output contract (AT-004.20, .22)

```ts
atTest('AT-004.20', 'a completed Discovery emits the full scope contract onto the need', {
  default: async ({ open }) => {
    const { w, sut, h } = await open();
    const ngo = await sut.provisionNgo(w.email('ngo-20'), { emailVerified: true });
    const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, GRANT_TRACKER.intake);
    h.vendors.anthropic.script([...GRANT_TRACKER.replies, GRANT_TRACKER_SCOPE_REPLY]);
    let last: DiscoveryMessageOutcome | null = null;
    for (const message of GRANT_TRACKER.ngoMessages) last = await sut.sendMessage(ngo.session, { organizationId: ngo.organizationId, projectId, message });
    expect(last).toMatchObject({ ok: true, scope: { version: 1 } });
    const need = await sut.needRow(projectId);
    expect(need?.scopeVersion).toBe(1);
    expect(scopeContractProblems(need?.scope)).toEqual([]);      // every field of AT-004.20 present, tiers and verdict shape-only
    expect(need?.scope?.buildSplit.lovable.length).toBeGreaterThan(0);          // AT-004.22
    expect(need?.scope?.buildSplit.claudeCode.length).toBeGreaterThan(0);
    const scopeRequest = h.vendors.anthropic.requests().at(-1)!;
    expect(scopeRequest.tools.map((tool) => tool.name)).toEqual(['record_scope']);
    expect(scopeRequest.toolChoice).toEqual({ type: 'tool', name: 'record_scope' });
    expect(need?.stage).toBe('discovery_in_progress');                         // no lifecycle engine invented
  },
  integration: awaiting(AWAITED.anthropicLive),
});
```

`AT-004.22` scripts a scope reply whose `buildSplit.claudeCode` is empty and asserts the turn settles with `scope: null` and the need's `scopeVersion` stays 0: the parser refuses, the contract is never half-stored. Then it scripts a full reply on the next message and asserts version 1 with both parts.

### Unit 2, money-free rendering (AT-004.21, .25)

```ts
atTest('AT-004.25', 'each tier document explains its data tier, complexity, maintenance and pricing', {
  default: async ({ open }) => {
    await open();
    for (const fixture of SCOPE_TIER_FIXTURES) {                 // Tier 0, Tier 1, Tier 2
      const markdown = renderScopeMarkdown(fixture.scope, { title: fixture.title });
      expect(scopeDocumentProblems(markdown, fixture)).toEqual([]);   // tier sentence, fixtures-only on Tier 2, rationale, start-small, maintenance, pricing link
    }
  },
  integration: async ({ open }) => { /* same over the same fixtures */ },
});
```

`AT-004.21` runs `noMoneyInScopeOutputProblems()`: a source scan over `scope.ts`, `scope-copy.ts`, the tool schema and the prompt blocks for money words and currency amounts outside the one allow-listed maintenance sentence and the pricing link, plus a runtime assertion over every rendered fixture and over every scripted scope reply's rendered document: no currency amount other than the allow-listed one, and the complexity section contains no digit followed by a currency word. The scan throws when it finds no scope source.

### Unit 3, scope as contract (AT-004.24, .52)

```ts
atTest('AT-004.52', 'the versioned scope read is stable and is the source the PRD author and scorer take', {
  default: async ({ open }) => {
    const { w, sut, h } = await open();
    // ... run to a scoped need, then regenerate once
    const before = await sut.needRow(projectId);
    h.vendors.anthropic.script([SCOPE_REPLY_V2]);
    expect(await sut.regenerateScope(ngo.session, { organizationId: ngo.organizationId, projectId, reason: 'stack is wrong' })).toMatchObject({ ok: true, regeneration: { outcome: 'regenerated', version: 2 } });
    const after = await sut.needRow(projectId);
    expect(after?.scopeVersions.map((v) => v.version)).toEqual([1, 2]);
    expect(after?.scopeVersions[0].scope).toEqual(before?.scope);        // version 1 is still readable and unchanged
    expect(scopeContractRef(after!)).toEqual({ projectId, scopeVersion: 2 });  // the reference a consumer records
    throw new CapabilityPending([AWAITED.prdAuthoring]);                // the consumers are wave 3
  },
});
```

`AT-004.24` runs `noScopeDecompositionProblems()` (no product module reads the scope and writes a task or backlog record; no task table exists; the scan throws on empty product source) and then throws `CapabilityPending([AWAITED.backlogDerivation])`, because the positive half, "derives from the passing PRD", has no producer.

### Unit 4, the cause-label producer (AT-004.58, .59, .60)

```ts
atTest('AT-004.58', 'generation reuses an existing vocabulary label instead of minting a synonym', {
  default: async ({ open }) => {
    const { w, sut, h } = await open();
    await sut.seedCauseLabelsAsOperator(['food security']);
    // ... a food-bank intake, scripted to elicitation, then:
    h.vendors.anthropic.script([...FOOD_BANK.replies, { kind: 'tool', name: 'record_scope', input: { ...FOOD_BANK_SCOPE, causeLabels: ['Food Security'] }, usage: SCOPE_USAGE }]);
    // ... send the messages
    const scopeRequest = h.vendors.anthropic.requests().at(-1)!;
    expect(scopeRequest.system.at(-1)!.text).toContain('"food security"');      // the model saw the vocabulary
    expect((await sut.needRow(projectId))?.causeLabels).toEqual(['food security']);  // normalised to the canonical spelling
    expect(await sut.causeLabelRows()).toEqual([{ label: 'food security' }]);         // the vocabulary did not grow
  },
  integration: awaiting(AWAITED.anthropicLive),
});
```

`AT-004.59` scripts a new label on a new domain (vocabulary grows by exactly one row, `firstProjectId` is this project) and a thin conversation whose scope reply carries `causeLabels: []` (need has none, vocabulary unchanged). `AT-004.60` removes one label through `removeCauseLabel` (need loses it, vocabulary keeps it, a second removal answers `changed: false`), and runs `noLabelCurationSurfaceProblems()`: no route, action, definer, module or UI route names a label create, set, curate or taxonomy surface; `decideProjectNeed` refuses `add_label` and `set_labels`; the only SQL writers of `cause_labels` are `need_scope_record` and `need_intake_remove_label`.

### Unit 5, free-phase guardrails (AT-004.12 to .15)

```ts
atTest('AT-004.13', 'repeated off-topic requests on free credits raise a plain notice and a founder flag, never a lockout', {
  default: async ({ open }) => {
    const { w, sut, h } = await open();
    const threshold = createConfigRegistry().get<number>('req-004.discovery.off_topic_flag_threshold');
    // ... a free need
    for (let i = 0; i < threshold; i += 1) {
      h.vendors.anthropic.script([{ kind: 'tool', name: 'decline_off_topic', input: { requested: 'translate this letter' }, text: 'I can only help scope your software need.', usage: USAGE }]);
      const sent = await sut.sendMessage(ngo.session, { organizationId: ngo.organizationId, projectId, message: 'Translate this letter to French' });
      expect(sent).toMatchObject({ ok: true, guardrail: { offTopicCount: i + 1, notice: i + 1 >= threshold ? expect.any(String) : null } });
    }
    expect((await sut.needRow(projectId))?.guardrail).toMatchObject({ offTopicCount: threshold, founderFlaggedAt: expect.any(String) });
    h.vendors.anthropic.script([{ kind: 'text', text: 'Who will use the tool?', usage: USAGE }]);
    expect((await sut.sendMessage(ngo.session, { organizationId: ngo.organizationId, projectId, message: 'Back to the tracker.' })).ok).toBe(true);  // never a lockout
  },
});
```

`AT-004.12` asserts the free request carries the guardrail system block and the `decline_off_topic` tool, and a scripted decline settles as a normal turn with `offTopicCount: 1`. `AT-004.14` seeds `ceiling - 1` settled free turns, asserts the next request carries the wrap-up block, scripts `record_elicitation` plus the scope reply (the scope generates), then asserts the following reserve is refused `turn-ceiling-reached` with the fresh-Discovery sentence. `AT-004.15` funds the project, sends off-topic past the ceiling, and asserts: no guardrail block, no decline tool, no wrap-up block in any request; `offTopicCount` stays 0; `founderFlaggedAt` null; no ceiling refusal.

### Unit 6, regeneration (AT-004.37, .38, .39)

```ts
atTest('AT-004.38', 'the exhausted bound escalates to an admin instead of regenerating', {
  default: async ({ open }) => {
    const { w, sut, h } = await open();
    const bound = createConfigRegistry().get<number>('req-004.discovery.regeneration_bound');
    const admin = await sut.provisionPlatformAdmin(w.email('admin-38'));
    // ... a scoped need, then `bound` regenerations, each with a reason and a scripted scope reply, each at zero delta
    const tried = await sut.regenerateScope(ngo.session, { organizationId: ngo.organizationId, projectId, reason: 'still wrong' });
    expect(tried).toMatchObject({ ok: true, regeneration: { outcome: 'escalated', notificationEventId: expect.any(String) } });
    expect(h.vendors.anthropic.requests()).toHaveLength(requestsBefore);          // no model call
    const need = await sut.needRow(projectId);
    expect(need?.scopeVersion).toBe(bound + 1);
    expect(need?.escalation).toMatchObject({ escalatedAt: expect.any(String), notificationEventId: tried.regeneration.notificationEventId });
    expect(await sut.notificationEvents('discovery.regeneration_exhausted')).toHaveLength(1);
    expect(await sut.regenerateScope(ngo.session, { organizationId: ngo.organizationId, projectId, reason: 'again' })).toMatchObject({ ok: true, changed: false, regeneration: { outcome: 'escalated' } });
  },
});
```

`AT-004.37` asserts each regeneration answers `outcome: 'regenerated'`, bumps the version, logs `{ reason, requestedBy, requestedAt }`, leaves the allowance unchanged and adds no turn row. `AT-004.39` scripts `[{ kind: 'error', status: 529 }, { kind: 'text', ... }]` on one message and asserts one settled turn charged for the successful usage only, then scripts two errors and asserts a `failed` turn at zero charge with the reservation released.

## Shape

### Tables and columns

```sql
-- supabase/migrations/20260924120000_need_scope_and_cause_labels.sql

alter table public.need_intakes
  add column scope                 jsonb,
  add column scope_version         integer not null default 0,
  add column scope_markdown        text,
  add column scope_generated_at    timestamptz,
  add column scope_regenerations   jsonb not null default '[]'::jsonb,
  add column scope_escalated_at    timestamptz,
  add column scope_escalation_event_id uuid references public.notification_events (id) on delete set null,
  add column off_topic_count       integer not null default 0,
  add column founder_flagged_at    timestamptz,
  add constraint need_intakes_scope_is_versioned check (
    (scope is null) = (scope_version = 0)
    and (scope_markdown is null) = (scope is null)
    and (scope_generated_at is null) = (scope is null)),
  add constraint need_intakes_scope_version_counts_regenerations check (
    scope_version = 0 or scope_version = jsonb_array_length(scope_regenerations) + 1),
  add constraint need_intakes_draft_has_no_scope check (stage <> 'draft' or scope_version = 0),
  add constraint need_intakes_regenerations_are_a_list check (jsonb_typeof(scope_regenerations) = 'array'),
  add constraint need_intakes_escalation_follows_scope check (scope_escalated_at is null or scope_version > 0),
  add constraint need_intakes_off_topic_count_is_natural check (off_topic_count >= 0),
  add constraint need_intakes_flag_follows_count check (founder_flagged_at is null or off_topic_count > 0);

-- The shared vocabulary. Read by every signed-in account (the volunteer picker and the public card
-- are its other readers); written only by need_scope_record. No route creates or renames a row.
create table public.cause_labels (
  label             text primary key,
  first_project_id  uuid references public.projects (id) on delete set null,
  created_at        timestamptz not null default now(),
  constraint cause_labels_canonical check (label = btrim(lower(label)) and label <> '' and label !~ '\s\s')
);
revoke all on table public.cause_labels from anon, authenticated, service_role;
alter table public.cause_labels enable row level security;
grant select on public.cause_labels to authenticated;
create policy cause_labels_select_signed_in on public.cause_labels for select to authenticated
  using ((select auth.uid()) is not null);
```

The `scope` jsonb holds one `ScopeRecord` (below): the contract the model emitted, the deterministic normalisation applied, and the generation facts (served model, tokens, turn id, trigger). `scope_regenerations` is an append-only list; entry `i` is the regeneration that produced version `i + 2` and carries the version it superseded in full, so every earlier version is readable and the current one is stored once:

```json
[{ "version": 2, "reason": "the stack is wrong", "requestedBy": "<account uuid>", "requestedAt": "2026-09-20T10:00:00Z",
   "superseded": { "version": 1, "scope": { ... }, "markdown": "...", "generatedAt": "2026-09-19T09:00:00Z" } }]
```

`cause_labels` (the column) stays the effective labels of the need. `scope.contract.causeLabels` is what the model emitted for that version, kept as history. A deletion touches the column only. A regeneration replaces the column with the new version's normalised labels.

### SQL definers

```sql
-- Records one scope version on the need and grows the vocabulary. Called only from inside
-- discovery_turn_settle (trigger 'completion') and need_intake_regenerate (trigger 'regeneration').
-- Not a route. Revoked from every role, so only another definer can reach it.
create function public.need_scope_record(
  p_project_id uuid, p_trigger text, p_scope jsonb, p_markdown text, p_labels text[], p_generated_at timestamptz
) returns public.need_intakes language plpgsql set search_path = '' as $$
-- TODO lock the need row for update; require stage = 'discovery_in_progress';
-- TODO 'completion': if scope_version > 0 return the row unchanged (idempotent: a second complete elicitation never re-scopes);
-- TODO validate p_scope is an object, p_labels has 0..3 canonical entries (lower, trimmed, single-spaced);
-- TODO insert into public.cause_labels (label, first_project_id) select unnest(p_labels), p_project_id on conflict (label) do nothing;
-- TODO update need_intakes set scope, scope_markdown, scope_generated_at, scope_version = scope_version + 1,
--      cause_labels = p_labels, updated_at = p_generated_at where project_id = p_project_id returning *;
$$;
revoke execute on function public.need_scope_record(uuid, text, jsonb, text, text[], timestamptz) from public, anon, authenticated, service_role;

-- The settle grows one argument. The nine-argument overload is dropped in the same migration.
drop function public.discovery_turn_settle(uuid, uuid, text, text, integer, integer, text, text, jsonb);
create function public.discovery_turn_settle(
  p_account_id uuid, p_turn_id uuid, p_outcome text, p_assistant_message text,
  p_input_tokens integer, p_output_tokens integer, p_stop_reason text, p_served_model text, p_elicitation jsonb,
  p_off_topic boolean default false,
  p_scope jsonb default null            -- { contract, markdown, labels, generation } or null
) returns jsonb language plpgsql security definer set search_path = '' as $$
-- TODO the existing body, unchanged through discovery_spend_release, then:
-- TODO v_threshold := (v_turn.request_settings->'guardrails'->>'off_topic_flag_threshold')::integer;  -- written at reserve, a pin
-- TODO if p_outcome = 'completed' and (v_turn.request_settings->'guardrails'->>'active')::boolean and p_off_topic then
--        update need_intakes set off_topic_count = off_topic_count + 1,
--          founder_flagged_at = coalesce(founder_flagged_at, case when off_topic_count + 1 >= v_threshold then clock_timestamp() end)
--        where project_id = v_turn.project_id;
-- TODO if p_outcome = 'completed' and p_scope is not null then
--        v_need := public.need_scope_record(v_turn.project_id, 'completion', p_scope->'contract' || generation facts, p_scope->>'markdown',
--                    array(select jsonb_array_elements_text(p_scope->'labels')), clock_timestamp());
-- TODO return jsonb_build_object('turn', to_jsonb(v_turn), 'allowance', ..., 'need', public.need_intake_view(v_turn.project_id));
$$;
grant execute on function public.discovery_turn_settle(uuid, uuid, text, text, integer, integer, text, text, jsonb, boolean, jsonb) to service_role;

-- The reserve reads two more numbers out of p_settings, validated in the existing foreach loop:
-- 'turn_ceiling' and 'off_topic_flag_threshold'. Both are pins carried from TypeScript, never SQL literals.
create or replace function public.discovery_turn_reserve(...same signature...) ... as $$
-- TODO after v_billing is known and before the money:
--   if v_billing = 'free' and (select count(*) from public.discovery_turns where project_id = p_project_id and status = 'settled')
--        >= (p_settings->>'turn_ceiling')::integer then
--     raise exception 'this free Discovery reached its turn ceiling; start a fresh Discovery to continue scoping'
--       using errcode = 'P0001', detail = 'turn-ceiling-reached';
--   end if;
-- TODO request_settings gains 'guardrails': jsonb_build_object('active', v_billing = 'free', 'turn_ceiling', ..., 'off_topic_flag_threshold', ...)
--      so the settle reads the threshold off the turn it settles and never re-derives billing.
$$;

-- project_need gains two arms in its case statement.
create function public.need_intake_regenerate(v_need public.need_intakes, p_account_id uuid, p_payload jsonb, p_bound integer)
returns jsonb language plpgsql set search_path = '' as $$
-- p_payload: { reason, expectedVersion, outcome: 'regenerate' | 'exhausted', scope?, markdown?, labels?, notice? }
-- TODO require v_need.scope_version > 0 else raise 'scope-not-generated';
-- TODO if p_payload->>'outcome' = 'exhausted' then
--        if v_need.scope_escalated_at is not null then return jsonb_build_object('outcome', 'escalated', 'changed', false, 'notificationEventId', v_need.scope_escalation_event_id);
--        v_event := public.need_scope_escalate(v_need, p_account_id, p_payload->'notice');   -- emits, may be null when no admin exists
--        update need_intakes set scope_escalated_at = clock_timestamp(), scope_escalation_event_id = v_event ...;
--        return jsonb_build_object('outcome', 'escalated', 'changed', true, 'notificationEventId', v_event);
-- TODO if jsonb_array_length(v_need.scope_regenerations) >= p_bound or (p_payload->>'expectedVersion')::integer <> v_need.scope_version
--        then raise 'the scope changed since it was read; read it again and regenerate from the current version' using detail = 'stale-scope';
-- TODO append { version: scope_version + 1, reason, requestedBy, requestedAt, superseded: { version, scope, markdown, generatedAt } } to scope_regenerations;
-- TODO perform public.need_scope_record(v_need.project_id, 'regeneration', p_payload->'scope', p_payload->>'markdown', labels, clock_timestamp());
-- TODO return jsonb_build_object('outcome', 'regenerated', 'changed', true, 'version', scope_version + 1);
$$;

create function public.need_intake_remove_label(v_need public.need_intakes, p_label text) returns boolean
language plpgsql set search_path = '' as $$
-- TODO v_label := canonical(p_label); if not (v_label = any(v_need.cause_labels)) return false;
-- TODO update need_intakes set cause_labels = array_remove(cause_labels, v_label), updated_at = clock_timestamp(); return true;
-- The vocabulary row stays. Deletion corrects the need, never the vocabulary.
$$;

-- The escalation notice, in the vetting producer's shape: TypeScript supplies channels and copy, SQL resolves recipients.
create function public.need_scope_escalate(v_need public.need_intakes, p_account_id uuid, p_notice jsonb) returns uuid
language plpgsql set search_path = '' as $$
-- TODO refuse a notice with no copy or channels other than ['email','inapp'];
-- TODO recipients := every account with account_type = 'platform_admin' and lifecycle = 'active' joined to auth.users for the address;
-- TODO if none: return null (the durable record still lands; the escalation is visible on the need read);
-- TODO payload := { projectId, organizationId, regenerationCount, lastReason };
-- TODO return public.emit_notification(jsonb_build_object('event', {...'discovery.regeneration_exhausted'...}, 'deliveries', ..., 'opsItem', null));
$$;

create or replace function public.project_need(p_account_id uuid, p_organization_id uuid, p_action text, p_project_id uuid, p_payload jsonb)
returns jsonb ... as $$
-- TODO the existing body; the case gains
--   when 'regenerate' then v_regeneration := public.need_intake_regenerate(v_need, p_account_id, p_payload, (p_payload->>'bound')::integer); v_changed := (v_regeneration->>'changed')::boolean;
--   when 'remove_label' then v_changed := public.need_intake_remove_label(v_need, p_payload->>'label');
-- TODO return jsonb_build_object('need', public.need_intake_view(...), 'changed', v_changed, 'regeneration', v_regeneration);
$$;

-- Taxonomy seed for the one new row. The req-016 seed oracle folds every seeding migration (suite change below).
insert into public.notification_event_types (event) values ('discovery.regeneration_exhausted');
```

`need_intake_view` is `to_jsonb(n) || title`, so every new column reaches the write answer without a change. The read route's select list at `edge.ts` 473 gains the nine columns.

### The pure module: `supabase/functions/_shared/scope.ts`

Relative imports only, no Deno, no I/O, no clock. It sits under the `scope.service` non-sender declaration, so it defines no `deliver(` and imports no mail client. Everything below is a pure function over domain types; the wire shapes (`p_scope`, `p_payload`) are built by the callers from these.

```ts
import type { DiscoveryModelRequest, Elicitation } from './discovery-turn.ts';
import type { DiscoveryNeed, SystemBlock } from './discovery-prompt.ts';
import type { DiscoverySkill } from './discovery-skills.ts';
import { channelsFor, taxonomyRow, type Channel, type TaxonomyRow } from './notification-taxonomy.ts';
import { renderCopy } from './notification-copy.ts';
import { SCOPE_COPY } from './scope-copy.ts';

/* ---------------------------------------------------------------- the contract */

export const COMPLEXITY_TIERS = ['small', 'medium', 'large'] as const;
export type ComplexityTier = (typeof COMPLEXITY_TIERS)[number];
/** Shape only in this run. The tiers leaf fills the judgment; the value here is what the model emitted. */
export const DATA_TIERS = ['tier0', 'tier1', 'tier2'] as const;
export type DataTier = (typeof DATA_TIERS)[number];
/** Shape only in this run. The fit leaf owns the decline path; a 'decline' verdict here stores, it does not decline. */
export const FIT_VERDICTS = ['fit', 'decline'] as const;
export type FitVerdict = (typeof FIT_VERDICTS)[number];

export type UserStory = { story: string; acceptanceCriteria: string[] };

/** The scope contract, AT-004.20 field for field. Every field is required; lists may be empty except where noted. */
export type Scope = {
  summary: string;
  userStories: UserStory[];                       // at least one
  suggestedStack: string[];                       // at least one
  complexity: { tier: ComplexityTier; rationale: string; startSmallAdvice: string };
  riskFlags: string[];
  dataSensitivity: { tier: DataTier; rationale: string };
  maintainabilityFit: { verdict: FitVerdict; rationale: string };
  causeLabels: string[];                          // 0 to 3, canonical after normalisation
  lovableRecommendation: { recommended: boolean; rationale: string };
  buildSplit: { lovable: string[]; claudeCode: string[] };   // both non-empty, always (AT-004.22)
};

/** What the need stores per version: the contract plus the facts of its generation. */
export type ScopeRecord = {
  contract: Scope;
  generation: { trigger: 'completion' | 'regeneration'; servedModel: string; inputTokens: number; outputTokens: number; turnId: string | null };
};

export type ScopeVersion = { version: number; scope: Scope; markdown: string; generatedAt: string };

export type Regeneration = {
  version: number; reason: string; requestedBy: string; requestedAt: string;
  superseded: ScopeVersion;
};

/** The reference a consumer (PRD author, scorer) records. Content-stable: the same ref always reads the same contract. */
export type ScopeContractRef = { projectId: string; scopeVersion: number };

/** The interface the wave-3 consumers take. Declared here so AT-004.52 can name what it waits for; nothing implements it yet. */
export type ScopeContractSource = {
  current(projectId: string): Promise<ScopeVersion | null>;
  at(ref: ScopeContractRef): Promise<ScopeVersion | null>;
};

/* ---------------------------------------------------------------- the model tool */

const strings = { type: 'array', items: { type: 'string' } };
export const RECORD_SCOPE_TOOL = {
  name: 'record_scope',
  description: 'Record the technical scope of this NGO software need, derived only from the completed elicitation and the conversation.',
  strict: true,
  input_schema: {
    type: 'object' as const, additionalProperties: false,
    properties: {
      summary: { type: 'string' },
      userStories: { type: 'array', minItems: 1, items: { type: 'object', additionalProperties: false,
        properties: { story: { type: 'string' }, acceptanceCriteria: strings }, required: ['story', 'acceptanceCriteria'] } },
      suggestedStack: { type: 'array', minItems: 1, items: { type: 'string' } },
      complexity: { type: 'object', additionalProperties: false,
        properties: { tier: { type: 'string', enum: ['small', 'medium', 'large'] }, rationale: { type: 'string' }, startSmallAdvice: { type: 'string' } },
        required: ['tier', 'rationale', 'startSmallAdvice'] },
      riskFlags: strings,
      dataSensitivity: { type: 'object', additionalProperties: false,
        properties: { tier: { type: 'string', enum: ['tier0', 'tier1', 'tier2'] }, rationale: { type: 'string' } }, required: ['tier', 'rationale'] },
      maintainabilityFit: { type: 'object', additionalProperties: false,
        properties: { verdict: { type: 'string', enum: ['fit', 'decline'] }, rationale: { type: 'string' } }, required: ['verdict', 'rationale'] },
      causeLabels: { type: 'array', maxItems: 3, items: { type: 'string' } },
      lovableRecommendation: { type: 'object', additionalProperties: false,
        properties: { recommended: { type: 'boolean' }, rationale: { type: 'string' } }, required: ['recommended', 'rationale'] },
      buildSplit: { type: 'object', additionalProperties: false,
        properties: { lovable: { type: 'array', minItems: 1, items: { type: 'string' } }, claudeCode: { type: 'array', minItems: 1, items: { type: 'string' } } },
        required: ['lovable', 'claudeCode'] },
    },
    required: ['summary', 'userStories', 'suggestedStack', 'complexity', 'riskFlags', 'dataSensitivity', 'maintainabilityFit',
      'causeLabels', 'lovableRecommendation', 'buildSplit'],
  },
} as const;

/** The deterministic decline marker. Offered on free billing only; its presence in a settled answer is the counted fact. */
export const DECLINE_OFF_TOPIC_TOOL = {
  name: 'decline_off_topic',
  description: 'Call this when the NGO asks for something other than scoping this software need (general questions, document drafting, translation, coding help). Also write one short sentence bringing the conversation back to the need.',
  strict: true,
  input_schema: { type: 'object' as const, additionalProperties: false, properties: { requested: { type: 'string' } }, required: ['requested'] },
} as const;

/** Stricter than the schema, the way parseElicitation is: exact keys, both split parts non-empty, 0..3 labels, tiers in their enums. */
export function parseScope(input: unknown): Scope | null { throw new Error('not implemented'); }

/* ---------------------------------------------------------------- labels */

/** lower-case, trimmed, single-spaced, deduplicated, at most three; a candidate that matches a vocabulary entry takes its spelling. */
export function normaliseLabels(candidates: readonly string[], vocabulary: readonly string[]): string[] { throw new Error('not implemented'); }
export function canonicalLabel(raw: string): string { throw new Error('not implemented'); }
/** The rows need_scope_record will insert: normalised labels not yet in the vocabulary. */
export function newVocabularyRows(labels: readonly string[], vocabulary: readonly string[]): string[] { throw new Error('not implemented'); }

/* ---------------------------------------------------------------- the model request */

export type ScopeContext = {
  need: DiscoveryNeed; mission: string | null; vocabulary: readonly string[];
  elicitation: Elicitation; transcript: { role: 'user' | 'assistant'; content: string }[];
};
/**
 * System: [cached: template + skills + SCOPE_SKILL] [uncached: need, mission, elicitation, vocabulary].
 * Messages: the transcript, then one user line asking for the scope. Tool: record_scope, forced.
 * The vocabulary is in the uncached block because it grows; a growing cached block busts the cache every project.
 */
export function scopeRequest(context: ScopeContext, skills: readonly DiscoverySkill[], model: string): DiscoveryModelRequest { throw new Error('not implemented'); }
export const SCOPE_REQUEST_MESSAGE = 'Produce the scope now from the recorded elicitation. Reuse an existing cause label when one fits; add a new one only for a genuinely new domain; emit none when the conversation is too thin to be sure.';

/* ---------------------------------------------------------------- when to generate */

/** True when the latest elicitation is complete and the need holds no scope yet. Evaluated at every settle, so a failed first scope call heals on the next turn. */
export function scopeGenerationDue(input: { scopeVersion: number; elicitation: Elicitation | null }): boolean { throw new Error('not implemented'); }

export type RegenerationDecision =
  | { kind: 'regenerate'; expectedVersion: number }
  | { kind: 'exhausted' }                       // bound reached; the caller escalates without a model call
  | { kind: 'refuse'; refusal: 'scope-not-generated' };
export function regenerationDecision(need: { scopeVersion: number; regenerations: readonly Regeneration[]; escalatedAt: string | null }, bound: number): RegenerationDecision { throw new Error('not implemented'); }

/** Version history, oldest first: every superseded version from the log, then the current one. */
export function scopeVersions(need: { scopeVersion: number; scope: ScopeRecord | null; scopeMarkdown: string | null; scopeGeneratedAt: string | null; regenerations: readonly Regeneration[] }): ScopeVersion[] { throw new Error('not implemented'); }
export function scopeContractRef(need: { projectId: string; scopeVersion: number }): ScopeContractRef | null { throw new Error('not implemented'); }
/** `scopeVersion > 0`. The mark of a scoped need until the lifecycle requirement maps it to its own stage. */
export function isScoped(need: { scopeVersion: number }): boolean { throw new Error('not implemented'); }

/* ---------------------------------------------------------------- guardrails */

export type GuardrailSettings = { active: boolean; turnCeiling: number; offTopicFlagThreshold: number };
/** Free billing: active with the two pins. Fuel: inactive, and the prompt, the tool and the count are all off. */
export function guardrailSettingsFor(billing: 'free' | 'fuel'): GuardrailSettings { throw new Error('not implemented'); }
/** The uncached system block carrying the scope rule and, on the final free turn, the wrap-up instruction. Null on fuel. */
export function guardrailBlock(settings: GuardrailSettings, settledTurns: number): SystemBlock | null { throw new Error('not implemented'); }
export function isFinalFreeTurn(settings: GuardrailSettings, settledTurns: number): boolean { throw new Error('not implemented'); }
/** The count after this settle and whether the flag is raised now; pure so the fixture and SQL agree by the same rule. */
export function offTopicAfter(input: { count: number; flaggedAt: string | null; declined: boolean; settings: GuardrailSettings; now: string }): { count: number; flaggedAt: string | null; notice: string | null } { throw new Error('not implemented'); }
export function turnCeilingReason(): string { throw new Error('not implemented'); }   // the SQL sentence, pinned by _source-pins

/* ---------------------------------------------------------------- rendering */

export type ScopeView = {
  version: number; generatedAt: string; scope: Scope; markdown: string;
  generation: ScopeRecord['generation'];
};
/** Markdown for react-markdown (CommonMark, no plugins). No cost figure; the complexity section never carries money. */
export function renderScopeMarkdown(scope: Scope, need: { title: string }): string { throw new Error('not implemented'); }
export function scopeViewFrom(need: { scopeVersion: number; scope: ScopeRecord | null; scopeMarkdown: string | null; scopeGeneratedAt: string | null }): ScopeView | null { throw new Error('not implemented'); }

/* ---------------------------------------------------------------- the escalation notice */

export const REGENERATION_EXHAUSTED_EVENT = 'discovery.regeneration_exhausted';
export type RegenerationNotice = { channels: readonly Channel[]; copy: { subject: string; body: string } };
/** Same shape as vettingOutcomeNotice: channels and copy from the taxonomy row, recipients resolved in SQL. */
export function regenerationExhaustedNotice(payload: { regenerationCount: number; lastReason: string }, row?: TaxonomyRow | null): { ok: true; value: RegenerationNotice } | { ok: false; reason: string } { throw new Error('not implemented'); }
```

`supabase/functions/_shared/scope-copy.ts` holds the permitted money copy and the guardrail copy, the way `need-intake-copy.ts` holds the disclosure: `SCOPE_COPY.maintenance` (the one sentence with the approximate monthly figure, paid directly to Lovable, the NGO owns the code, evolves by chat), `SCOPE_COPY.lovablePricingUrl`, `SCOPE_COPY.dataTier[tier]` (three explanations, Tier 2 with the fixtures-only paragraph), `SCOPE_COPY.startSmall`, `SCOPE_COPY.offTopicNotice`, `SCOPE_COPY.freshDiscovery`. The AT-004.21 scan allow-lists exactly `SCOPE_COPY.maintenance` and `SCOPE_COPY.lovablePricingUrl` and refuses any other currency amount in `scope.ts`, `scope-copy.ts`, the prompt blocks and every rendered fixture.

`supabase/functions/_shared/discovery-skills/06-write-the-scope.md` is the scope skill: derive from the record, never add scope, tier and verdict in one sentence each, pick the smallest tier that fits, split the build so Lovable holds the screens and data the NGO will edit by chat and Claude Code holds integrations and jobs, name a cause only when sure. Regenerated with `bun run discovery:skills`; the selftest guards drift.

### The turn module: `discovery-turn.ts`

```ts
export type DiscoveryModelRequest = {
  model: string; maxTokens: number; effort: 'low'; system: SystemBlock[];
  tools: readonly (typeof RECORD_ELICITATION_TOOL | typeof RECORD_SCOPE_TOOL | typeof DECLINE_OFF_TOPIC_TOOL)[];
  toolChoice?: { type: 'tool'; name: string };          // forwarded by paramsFor and countTokens; the sim ignores it
  messages: { role: 'user' | 'assistant'; content: string }[];
};

const SCOPE_CONTEXT = Symbol('discovery scope context');
export type DiscoveryReserveArgs = {
  ...;  p_settings: DiscoveryReserveSettings;          // gains turn_ceiling and off_topic_flag_threshold
  [PREPARED_REQUEST]?: DiscoveryModelRequest;
  [SCOPE_CONTEXT]?: { scopeVersion: number; priorElicitation: Elicitation | null; mission: string | null; vocabulary: string[]; need: DiscoveryNeed };
};

/** Prepare also reads the organisation (mission), the vocabulary and the need's scope columns, all as the caller. */
export function discoveryPrepare(port: MessagesPort, skills: readonly DiscoverySkill[]) { ... }
// TODO billing := billingTargetFor({ id, fundedAt: project.funded_at });  settings := guardrailSettingsFor(billing.kind)
// TODO system := [...discoverySystemPrompt(need, skills), ...(guardrailBlock(settings, settled.length) ? [block] : [])]
// TODO tools := settings.active ? [RECORD_ELICITATION_TOOL, DECLINE_OFF_TOPIC_TOOL] : [RECORD_ELICITATION_TOOL]

export type DiscoverySettleArgs = { ...existing; p_off_topic: boolean; p_scope: ScopeSettlePayload | null };
export type ScopeSettlePayload = { contract: Scope; markdown: string; labels: string[]; generation: ScopeRecord['generation'] };

/** One transient retry inside the same reservation: the retry costs nothing extra because the reservation is already held. */
export function isTransientProviderFailure(answer: DiscoveryModelAnswer): boolean { throw new Error('not implemented'); }  // !ok && status in {408, 429, 500, 502, 503, 529}
async function callWithOneRetry(call: () => Promise<DiscoveryModelAnswer>): Promise<DiscoveryModelAnswer> { throw new Error('not implemented'); }

/** After the chat answer: settle args, then, when scopeGenerationDue, one forced record_scope call whose parsed result rides in p_scope. */
export async function settleWithScope(port: MessagesPort, skills: readonly DiscoverySkill[], reservation: Reservation, args: DiscoveryReserveArgs, answer: DiscoveryModelAnswer): Promise<{ args: DiscoverySettleArgs | null; failure: string | null }> { throw new Error('not implemented'); }
// TODO base := settleArgsFrom(reservation, answer, accountId); p_off_topic := answer.ok && answer.toolUse?.name === 'decline_off_topic'
// TODO elicitation := base.args?.p_elicitation ?? context.priorElicitation
// TODO if base.args?.p_outcome === 'completed' && scopeGenerationDue({ scopeVersion, elicitation }):
//        scoped := await port.create({ ...scopeRequest({...}), maxTokens: DISCOVERY_REQUEST_SETTINGS.maxOutputTokens })
//        contract := scoped.ok && scoped.toolUse?.name === 'record_scope' ? parseScope(scoped.toolUse.input) : null
//        p_scope := contract ? { contract: { ...contract, causeLabels: normaliseLabels(contract.causeLabels, vocabulary) }, markdown: renderScopeMarkdown(...), labels, generation } : null
//        a failed or unparseable scope call leaves p_scope null; the turn still settles; the next settle tries again.

export function discoveryAct(port, skills) { /* create with one retry, then settleWithScope */ }
export function discoveryStream(port, skills) { /* stream with one retry only when nothing was emitted yet, then settleWithScope */ }

export function renderDiscoveryMessage(value: unknown): {
  turn: DiscoveryTurnView; reply: string; elicitation: Elicitation | null; allowance: Allowance | null;
  scope: ScopeView | null;                        // from value.need, the row the settle returns
  guardrail: { offTopicCount: number; founderFlaggedAt: string | null; notice: string | null } | null;   // null on fuel
} { throw new Error('not implemented'); }
```

The stream branch in `edge.ts` is unchanged: `data-turn` carries whatever `render` returns, and the page ignores keys it does not know. `conversationAnswer` and `DiscoveryConversationView` are unchanged, which keeps `d-conversation.test.ts` line 31 true.

### The need module: `need-intake.ts`

```ts
export type ProjectNeedAction = 'start' | 'save' | 'attach' | 'submit' | 'regenerate' | 'remove_label';
export type RegeneratePayload = { reason: string; expectedVersion: number; outcome: 'regenerate' | 'exhausted'; bound: number;
  scope?: Scope; markdown?: string; labels?: string[]; generation?: ScopeRecord['generation']; notice?: RegenerationNotice };
export type RemoveLabelPayload = { label: string };

export type NeedIntakeView = { ...existing;
  scopeVersion: number; scope: ScopeView | null; scopeVersions: ScopeVersion[]; regenerations: Regeneration[];
  guardrail: { offTopicCount: number; founderFlaggedAt: string | null };
  escalation: { escalatedAt: string; notificationEventId: string | null } | null;
};
export type NeedIntakeSqlRow = { ...existing; scope: ScopeRecord | null; scope_version: number; scope_markdown: string | null;
  scope_generated_at: string | null; scope_regenerations: Regeneration[]; scope_escalated_at: string | null;
  scope_escalation_event_id: string | null; off_topic_count: number; founder_flagged_at: string | null };

/** decide: `regenerate` requires a non-empty reason (max DISCOVERY_MESSAGE_MAX_CHARS) and no other keys; `remove_label` a non-empty label. Any label-creating key is refused invalid-request. */
export function decideProjectNeed(input: AccountWriteRouteInput): WriteRouteDecision<ProjectNeedArgs> { ... }

/** The one prepare of project-need. Only `regenerate` does anything: it reads the need, decides, and makes the zero-credit scope call before the write. */
export function projectNeedPrepare(port: MessagesPort, skills: readonly DiscoverySkill[]) {
  return async (caller: Caller, args: ProjectNeedArgs, reads: CallerReads): Promise<WriteRouteDecision<ProjectNeedArgs>> => { throw new Error('not implemented'); };
}
// TODO if args.p_action !== 'regenerate' return { ok: true, args }
// TODO need := needIntakeAnswer(reads, projectId); decision := regenerationDecision(need, DISCOVERY_REGENERATION_BOUND)
// TODO 'refuse' -> refuseWrite('scope-not-generated', 409, ...)
// TODO 'exhausted' -> payload.outcome = 'exhausted', payload.notice = regenerationExhaustedNotice({...}).value   (no model call)
// TODO 'regenerate' -> elicitation := latest non-null from reads.discoveryTurnsOf; transcript := contextMessagesFrom(settled)
//        answer := port.create(scopeRequest(...)); contract := parseScope(...) ?? refuseWrite('refused', 502, 'the model produced no usable scope')
//        payload := { reason, expectedVersion, outcome: 'regenerate', bound, scope, markdown, labels, generation }

export function renderProjectNeed(value: unknown): { changed: boolean; need: NeedIntakeView | null;
  regeneration: { outcome: 'regenerated'; version: number } | { outcome: 'escalated'; notificationEventId: string | null } | null } { ... }
```

`supabase/functions/project-need/index.ts` gains `prepare: projectNeedPrepare(anthropicMessagesPort(), DISCOVERY_SKILLS)` and stays one `Deno.serve(writeRoute(...))`. The route's inventory row is unchanged; no `config.toml` change.

### Notifications: one taxonomy row

```ts
{ event: 'discovery.regeneration_exhausted', recipients: ['platform_admin'], channels: ['email', 'inapp'], tone: 'normal', class: 'other',
  payloadKeys: ['projectId', 'regenerationCount'] }
```

Named copy in `notification-copy.ts`: subject "Scope regeneration bound reached", body naming the project and the count. The name matches none of the forbidden patterns. It is a change to the closed REQ-016 set, so it lands in five places in one commit: the TypeScript `TAXONOMY`, the seed insert in the new migration, the suite oracle `tests/at/suites/req-016/taxonomy.ts`, the requirement text `req-016.md` line 7 (one clause after the fit-decline rows: "regeneration bound exhausted → platform admin (email + in-app)"), and `seededEventNames()` in `tests/at/suites/req-016/_source-scan.ts`, which today returns the first seeding migration only and must fold every one. AT-016.03 fires the row like any other. The founder flag owes no row: it is a column the platform admin reads through the existing policy.

### The stand-in and the suite

`createAnthropicMessagesSim` is unchanged: a scope call is one more `create` that consumes one more scripted reply, and `requests()` records `toolChoice` with the rest of the request. The loop fixture (`tests/at/suites/req-004/_fixture.ts`) gains an in-memory vocabulary set, an in-memory outbox list, the need's scope fields (initialised in the req-003 fixture's `start`), `settle` writing `p_off_topic` and `p_scope` onto the need through the same pure functions SQL restates, and a `NEED_SPEC` with `projectNeedPrepare` for the two new actions. `_live.ts` calls the functions and reads `need_intakes`, `cause_labels` and `notification_events` over SQL.

```ts
export type DiscoveryMessageOutcome = { ok: true; turn; reply; elicitation; allowance; scope: ScopeView | null; guardrail: GuardrailView | null } | WriteRefusal;
export type RegenerateOutcome = { ok: true; changed: boolean; need: NeedIntakeView; regeneration: RegenerationOutcome } | WriteRefusal;
export type OperatorSettleInput = { ...existing; offTopic?: boolean; scope?: ScopeSettlePayload };   // the integration bodies of units 1, 5 and 6 settle through the definer
export type DiscoverySut = NeedsSut & { ...existing;
  regenerateScope(session: Session | null, request: { organizationId: string; projectId: string; reason: string }): Promise<RegenerateOutcome>;
  removeCauseLabel(session: Session | null, request: { organizationId: string; projectId: string; label: string }): Promise<NeedWriteOutcome>;
  seedCauseLabelsAsOperator(labels: readonly string[]): Promise<void>;
  causeLabelRows(): Promise<{ label: string; firstProjectId: string | null }[]>;
  notificationEvents(type: string): Promise<{ id: string; type: string; recipients: { role: string; recipientId: string }[] }[]>;
};
```

New fixtures: `fixtures/grant-tracker.ts` gains `GRANT_TRACKER_SCOPE_REPLY` (a Tier 0 scope for the tracker); `fixtures/scope-tiers.ts` holds the Tier 0, Tier 1 and Tier 2 scope fixtures with their expected sentences; `fixtures/food-bank.ts` holds the label-reuse conversation; `fixtures/scope.oracle.ts` holds `scopeContractProblems` and `scopeDocumentProblems`; `fixtures/record-scope.ts` re-records the scope tapes from a live run with a key. `_source-absences.ts` gains `scanMoneyInScopeOutput`, `scanLabelCurationSurface` and `scanScopeDecomposition`, each refusing to report an absence over empty source.

### Pins, refusal kinds, catalog, inventory

```ts
// tests/at/harness/atconfig.ts
discoveryFreeTurnCeiling: { name: 'settled free turns after which a Discovery conversation wraps up', value: 12, unit: 'turns', provisional: true,
  source: 'architecture-notes REQ-004 "deterministic per-conversation turn ceiling (platform-configurable, pilot-tuned)"; 12 is the proposal for the unit 5 gate: the 5 to 10 structured turns of REQ-004 plus two; founder to rule' },
discoveryOffTopicFlagThreshold: { name: 'off-topic declines on free credits that raise the founder flag', value: 3, unit: 'declines', provisional: true,
  source: 'architecture-notes REQ-004 "repeated-off-topic decline counter → founder-visibility flag"; three is the smallest count that is "repeated" twice; founder to rule' },
discoveryRegenerationBound: { name: 'scope regenerations before admin escalation', value: 3, unit: 'regenerations',
  source: 'architecture-notes REQ-004 "Scope regenerable up to 3× (reason logged) then admin escalation"' },
// tests/at/harness/config.ts
'req-004.discovery.free_turn_ceiling', 'req-004.discovery.off_topic_flag_threshold', 'req-004.discovery.regeneration_bound'
// supabase/functions/_shared/discovery-metering.ts
export const DISCOVERY_FREE_TURN_CEILING = 12;            // no 'limit', no 'platform': outside isPlatformBreakerName
export const DISCOVERY_OFF_TOPIC_FLAG_THRESHOLD = 3;
export const DISCOVERY_REGENERATION_BOUND = 3;
// reserveSettings() gains turn_ceiling and off_topic_flag_threshold; _source-pins.ts meteringPinProblems gains three pairs
// and sendSentencePinProblems reads the turn-ceiling-reached sentence and compares it with turnCeilingReason().
```

`WRITE_REFUSAL_KINDS` gains `'scope-not-generated'`, `'stale-scope'`, `'turn-ceiling-reached'`. `TENANT_CATALOG` gains `cause_labels: 'tenant-isolated'`. `WRITE_ROUTES` is unchanged. `AWAITED` gains `prdAuthoring: 'prd.authoring'` and `backlogDerivation: 'backlog.derivation'`.

## Decisions, the eight the task names

1. **Where the scope lives and what "completed" means.** On `need_intakes`, as the current version plus an append-only regeneration log that carries every superseded version. The scope is a property of the need, the row is mutable, tenant-isolated and already read by its own route, and the conversation view stays byte-identical (per foundational-thinking: the structure that makes the versioned read a column read, not a scan of a ledger). "Completed Discovery" is `elicitation.complete === true` on the latest non-null elicitation, evaluated at every settle while `scope_version = 0`. The ceiling is not a completion signal; it is a wrap-up instruction on the final free turn that makes the model complete the record if it can, and a reserve refusal after it. A scoped need is `scope_version > 0`; the stage stays `discovery_in_progress`; `isScoped` is the predicate the lifecycle requirement maps later.
2. **How generation is triggered.** Two triggers, one definer. First generation: the `discovery-message` act step, after the chat answer, makes one forced `record_scope` call and passes the parsed result as `p_scope` to `discovery_turn_settle`, which calls `need_scope_record` in the same transaction as the turn (per make-operations-idempotent: `need_scope_record` with trigger `completion` is a no-op when a version exists, and a failed scope call leaves `p_scope` null and the next settle retries). Regeneration: the `regenerate` action's `prepare` makes the same call before the write and `project_need` records it through the same definer, compare-and-set on the version. No separate route, no background work.
3. **The versioned read and the stubs.** `need-intake` returns `scope`, `scopeVersion` and `scopeVersions`; `scopeContractRef` is the reference a consumer records; `ScopeContractSource` is the interface the wave-3 consumers implement. AT-004.52 proves version stability and lineage (regeneration bumps, the earlier version reads unchanged) and then throws `prd.authoring`. AT-004.24 proves the absence of any scope-to-task path over the whole product and then throws `backlog.derivation`. Both red at both tiers, with the provable half executed first.
4. **The vocabulary.** `cause_labels(label primary key, first_project_id, created_at)`, canonical spelling enforced by CHECK, readable by every signed-in account, written by `need_scope_record` only. The model sees the vocabulary as a JSON list in the uncached system block of the scope request, with the reuse instruction in the request message and the scope skill. Deterministic normalisation (`normaliseLabels`) maps case and spacing onto the vocabulary; semantic reuse is the model's and is proven at loop by scripting `causeLabels: ['Food Security']` against a seeded `food security` and asserting the request carried the vocabulary and the row reused it, and at integration by the real model behind `vendors.anthropic`. Deletion is the `remove_label` action of `project-need`, idempotent, touching the need's column only.
5. **Guardrail mechanics.** The scope line is an uncached third system block on free billing with the `decline_off_topic` tool; the count is the number of settled free turns whose answer carried that tool (`p_off_topic`), recorded by the settle definer on the need; the flag is `founder_flagged_at`, set once when the count reaches the pinned threshold, read by the platform admin through the existing policy, no notification. The ceiling is `DISCOVERY_FREE_TURN_CEILING` settled free turns: the final turn's request carries the wrap-up block; the reserve refuses `turn-ceiling-reached` after it, free billing only. Fuel: `guardrailSettingsFor('fuel')` is inactive, so no block, no tool, no count, no ceiling, and the settle reads `request_settings.guardrails.active` off the turn rather than re-deriving billing.
6. **Regeneration.** Bound `DISCOVERY_REGENERATION_BOUND = 3`, pinned. A regeneration is not a turn: no reservation, no debit, no ledger row, so zero credits by construction and AT-004.46's delta invariant holds without a new billing kind. The reason is required by `decideProjectNeed` and logged in `scope_regenerations` with actor and time. The bound reached: `prepare` makes no model call, `need_intake_regenerate` writes `scope_escalated_at` once and emits `discovery.regeneration_exhausted` to every active platform admin in the same transaction; later attempts answer `escalated, changed: false`. The system-error retry is one in-request retry inside the same reservation; a second failure settles `failed` at zero charge with the release the ledger already does.
7. **Green and red.** See the table below.
8. **Module map.** See the map below.

## Green and red, both tiers, after unit 6

| id | loop | integration | reason |
|---|---|---|---|
| AT-004.20 | green | red `vendors.anthropic` | the loop scripts `record_scope`; the real model is the integration proof, as AT-004.10 |
| AT-004.22 | green | red `vendors.anthropic` | same; the parser's refusal of a one-sided split is loop-provable |
| AT-004.21 | green | green | source scan plus rendered fixtures, no model, no stack |
| AT-004.25 | green | green | pure renderer over three fixtures |
| AT-004.24 | red `backlog.derivation` | red `backlog.derivation` | the absence scan runs green first; the positive half has no producer |
| AT-004.52 | red `prd.authoring` | red `prd.authoring` | version stability proven first; the consumers are wave 3 |
| AT-004.58 | green | red `vendors.anthropic` | scripted reuse at loop; real-model reuse at integration |
| AT-004.59 | green | red `vendors.anthropic` | same |
| AT-004.60 | green | green | deletion over the live definer; the curation-surface scan |
| AT-004.12 | green | green | loop through `sendMessage`; integration through the operator reserve, reading `request_settings.guardrails` and settling `p_off_topic` |
| AT-004.13 | green | green | count, flag and notice through the operator settle; never a lockout is a reserve after the flag |
| AT-004.14 | green | green | seeded turns to the ceiling, then the reserve refusal; the wrap-up block is loop-only prose, the refusal is both |
| AT-004.15 | green | red `checkout.project-fuel` | the live adapter cannot fund with fuel above zero |
| AT-004.37 | green | red `vendors.anthropic` | the regeneration makes a real scope call at integration |
| AT-004.38 | green | green | no model call on the exhausted path; escalation and the outbox row through the live definer |
| AT-004.39 | green | green | loop scripts error then success; integration settles `failed` through the operator and reads a zero charge and the release |

The declaration moves sixteen ids out of `z-later-runs.test.ts`: fourteen turn green at loop, eight at integration, six stay red at integration under `vendors.anthropic` or `checkout.project-fuel`, and AT-004.24 and AT-004.52 change pending name at both tiers.

## Module map

| Change | Path |
|---|---|
| new, pure | `supabase/functions/_shared/scope.ts`, `scope-copy.ts` |
| new skill | `supabase/functions/_shared/discovery-skills/06-write-the-scope.md`, regenerated `index.ts` |
| new migration | `supabase/migrations/20260924120000_need_scope_and_cause_labels.sql` (columns, CHECKs, `cause_labels`, `need_scope_record`, `need_intake_regenerate`, `need_intake_remove_label`, `need_scope_escalate`, `project_need` replaced, `discovery_turn_settle` replaced at eleven arguments, `discovery_turn_reserve` replaced with the ceiling and the guardrail settings, the taxonomy seed row) |
| changed | `discovery-turn.ts` (request type, prepare reads, `settleWithScope`, one retry, render), `discovery-prompt.ts` (`RECORD_ELICITATION_TOOL` unchanged; the template's last line names the decline tool on free turns through the block, not the template), `discovery-metering.ts` (three constants, `reserveSettings`), `need-intake.ts` (two actions, `projectNeedPrepare`, view and row types), `anthropic-messages.ts` (`toolChoice` in `paramsFor` and `countTokens`), `edge.ts` (need select list, project select list gains `funded_at`), `tenant-reads.ts` (project row type), `discovery-reads.ts` (`causeLabels()` read), `write-routes.ts` (three refusal kinds), `notification-taxonomy.ts` (one row), `notification-copy.ts` (one named copy) |
| changed route | `supabase/functions/project-need/index.ts` (adds `prepare`) |
| requirement text | `.taskmaster/docs/requirements/req-016.md` line 7 (one clause), through the doc-sync ritual |
| suite, req-004 | `_contract.ts`, `_fixture.ts`, `_live.ts`, `_pending.ts`, `_source-pins.ts`, `_source-absences.ts`, `d-conversation.test.ts` (AT-004.10 filters chat requests by tool and scripts the scope reply), `z-later-runs.test.ts` (sixteen ids out), new `g-scope-output.test.ts`, `h-scope-contract.test.ts`, `i-cause-labels.test.ts`, `j-free-guardrails.test.ts`, `k-regeneration.test.ts`, `fixtures/grant-tracker.ts`, `fixtures/scope-tiers.ts`, `fixtures/food-bank.ts`, `fixtures/scope.oracle.ts`, `fixtures/record-scope.ts` |
| suite, others | `req-003/_fixture.ts` (new view fields at start), `req-001/_policy-scan.ts` (`TENANT_CATALOG`), `req-016/taxonomy.ts` (the row), `req-016/_source-scan.ts` (`seededEventNames` folds every seeding migration) |
| harness | `tests/at/harness/atconfig.ts` (three pins), `config.ts` (three keys), `contracts.ts` (`ScriptedReply` unchanged; `ModelRequestRecord` follows the request type) |
| declaration | `tests/at/expected/req-004.json`, `req-016.json` if AT-016.02's row count is declared there |

## Tradeoffs accepted

- We accept two model calls inside one `discovery-message` request on the completing turn, in exchange for the scope landing in the same transaction as the elicitation and no background machinery. The completing chat answer is short (a tool call and two sentences), so the wall clock is close to one scope call; the page waits on `finish` a little longer once per project.
- We accept a wasted scope call on a concurrent duplicate regenerate, in exchange for no reservation and no lock before the model call; the compare-and-set on `scope_version` refuses the loser with `stale-scope`, and the bound caps the waste at three.
- We accept that a regeneration replaces the need's labels with the new version's, in exchange for one rule ("the labels are the latest version's, minus what the NGO removed since") that needs no removed-label memory.
- We accept a `funded_at` column in the project read projection, in exchange for the guardrail decision living in `prepare` where the prompt is built, instead of a second reserve round trip to learn the billing target.
- We accept `scope_regenerations` carrying full superseded versions as jsonb, in exchange for no second table, no catalog entry and no RLS for version history; at three regenerations the row holds at most four scopes.
- We accept that the founder flag is a column and not a notification, in exchange for not widening the closed REQ-016 set twice; the one row added is the escalation the brief names as owed.
- We accept a provisional ceiling of twelve as a proposal only; the unit 5 gate sets the value, and `_source-pins` refuses a mismatch between the pin and the constant.

## Alternatives considered

- **Scope as a jsonb column on `discovery_turns`, versions are turns.** Hides nothing: the versioned read becomes "the ordered list of turns whose scope is non-null", regeneration must be a turn and so needs a new billing kind or a CHECK change to be free, and the conversation view changes shape under a test that asserts its exact keys. Lost on interface depth: the caller would learn the ledger to read the scope.
- **A `need_scopes` table, one row per version.** Cleanest history, but a fifth tenant-catalog entry, its own RLS, a foreign key the read must join, and two writers to keep consistent with `need_intakes.cause_labels`. The need row with a log column gives the same versioned read through the existing route for one migration and no join.
- **A separate `discovery-scope` write route with its own settle phase for regeneration.** A new inventory row, folder, `config.toml` block and definer, to do what a `prepare` on the existing route does in one function. Lost on laziness-protocol.
- **Generation as a follow-up chat turn after `complete: true`.** Costs the NGO a credit for an output the requirement says regenerations do not cost, and puts the scope on the ledger the immutability trigger owns.
- **Off-topic detection by a fixed text marker in the reply.** Cheaper than a tool, but a marker the page would render and a model could paraphrase; a strict tool call is the deterministic fact and the port already carries it.

## Open questions and risks

- Is twelve settled free turns the ceiling the founder wants, or a different number? The pin is provisional until the unit 5 gate; the constant follows the ruling.
- Is three declines the right threshold for "repeated"? Same gate.
- Does the founder want the escalation row added to the closed REQ-016 taxonomy in this branch (five touch points, one requirement line), or the durable escalation record alone with the notification listed under "Not done here"?
- Should the scope call run at effort `low` like the chat, or does a scope deserve `medium`? The request type pins `'low'`; widening it is one literal and one pin.
- The wall-clock risk of two model calls in one request: if a live run shows the completing turn near the edge runtime's limit, the fallback is to leave `p_scope` null and let the next settle generate, which the design already does on any scope-call failure. Is that acceptable as the recovery, or should the page get a "generate now" action?
- After a scoped need, should further free chat be allowed at all, or should `discovery_turn_reserve` refuse once `scope_version > 0`? This design allows it (the ceiling still bounds it) because the lifecycle requirement owns the stage after scoping.
- Should a regeneration keep labels the NGO removed since the previous version? This design replaces them and says so.

## Next implementation step

Write `scope.ts` with the `Scope` type, `RECORD_SCOPE_TOOL`, `parseScope`, `normaliseLabels` and `renderScopeMarkdown` against the three tier fixtures, so unit 1 and unit 2 have their pure core before any migration or route changes.

## Per-unit plan

1. **Contract.** Migration columns and CHECKs (no vocabulary yet), `scope.ts` core, `06-write-the-scope.md`, `toolChoice` on the port, `settleWithScope`, `discovery_turn_settle` at eleven arguments, `need_scope_record` with an empty label step, the need read list, `renderDiscoveryMessage.scope`, fixture and live adapters, `GRANT_TRACKER_SCOPE_REPLY`, AT-004.10 adjusted, `g-scope-output.test.ts` with AT-004.20 and .22.
2. **Rendering.** `scope-copy.ts`, `renderScopeMarkdown` filled, `scope_markdown` written, `fixtures/scope-tiers.ts`, `scanMoneyInScopeOutput`, AT-004.21 and .25.
3. **Contract read.** `scopeVersions`, `scopeContractRef`, `ScopeContractSource`, `scanScopeDecomposition`, two pending names, `h-scope-contract.test.ts`.
4. **Labels.** `cause_labels` table and catalog entry, `normaliseLabels`, the vocabulary and mission in the scope request, `need_scope_record` growing the vocabulary and writing the column, `remove_label` action and definer, `scanLabelCurationSurface`, `fixtures/food-bank.ts`, `i-cause-labels.test.ts`.
5. **Guardrails.** Gate first for the ceiling and threshold values; then the two pins and constants, `guardrailSettingsFor`, `guardrailBlock`, `DECLINE_OFF_TOPIC_TOOL`, `p_off_topic`, the reserve ceiling and `request_settings.guardrails`, `funded_at` on the project read, `renderDiscoveryMessage.guardrail`, `turn-ceiling-reached`, `j-free-guardrails.test.ts`.
6. **Regeneration.** The bound pin, `regenerationDecision`, `regenerate` action, `projectNeedPrepare`, `need_intake_regenerate`, `need_scope_escalate`, the taxonomy row in its five places, `scope-not-generated` and `stale-scope`, the one retry, `k-regeneration.test.ts`.

## Synthesis decision

Filled in by the arena.



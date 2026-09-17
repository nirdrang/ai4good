# Usage

*Candidate: the turn record is the ledger. Attribution: unattributed. This is a design package; no repository files were changed.*

The NGO uses two existing route names: `discovery-message` to send, and `discovery-allowance` to read credits and conversation history. The admin uses one new route, `set-organization-discovery`.

The following are caller-facing test sketches. Controlled provider responses belong to the loop tier; operator setup at integration is identified separately.

```ts
// Unit 1: metering is a consequence of completing a turn.
anthropic.sim.enqueue({ content: answer, usage: usageCosting("1.20") });
const sent = await discovery.send(session, {
  organizationId, projectId, conversationId, requestId, message: "Our staff need..."
});
expect(sent.turn).toMatchObject({
  providerCostUsd: "1.200000000", creditsCharged: 2, billingTarget: "pool"
});
expect(await discovery.reconcile(organizationId)).toEqual([]);

// Unit 2: funding is read for each newly admitted turn.
await discovery.setFundingAsOperator(projectA, { funded: true });
fuelFixture.provide(projectA, sufficientFuel);
expect((await discovery.send(session, messageFor(projectA))).turn.billingTarget)
  .toBe("fuel");
expect((await discovery.send(session, messageFor(projectB))).turn.billingTarget)
  .toBe("pool");
fuelFixture.exhaust(projectA);
expect(await discovery.send(session, messageFor(projectA)))
  .toMatchObject({ ok: false, kind: "project-fuel-exhausted" });

// Unit 3: preserve the existing tier-specific sentences.
await discovery.exhaustAllowanceAsOperator(organizationId);
expect(await discovery.send(session, messageFor(projectB)))
  .toMatchObject({
    ok: false,
    kind: "daily-allowance-exhausted",
    reason: dailyAllowanceExhaustedReason(organizationId, tier)
  });

// Unit 4: conversation history survives a different authenticated session.
await replaySevenTurnFixture(discovery, anthropic.sim, session);
const returned = await discovery.signInAgain(email);
const resumed = await discovery.read(returned, { organizationId, conversationId });
expect(resumed.messages).toEqual(expectedCompleteTranscript);
expect(fixtureOracle(resumed.messages)).toEqual([]);

// Unit 5: both gates precede provider dispatch.
expect(await discovery.send(unconfirmedSession, request))
  .toMatchObject({ ok: false, status: 409, kind: "email-unverified" });
await discovery.setEnabled(admin, {
  organizationId, enabled: false, reason: "Investigating reported abuse"
});
expect(await discovery.send(session, request))
  .toMatchObject({ ok: false, status: 409, kind: "discovery-disabled" });
expect(anthropic.sim.requests()).toHaveLength(0);

// Unit 6: reads expose the same facts that account for spending.
const before = await discovery.read(session, { organizationId, conversationId });
await discovery.attachReferenceFile(session, attachment);
const after = await discovery.read(session, { organizationId, conversationId });
expect(after.allowance).toEqual(before.allowance);
expect(after.turns).toEqual(before.turns);
expect(await discovery.reconcile(organizationId)).toEqual([]);
```

These sketches do not claim that attachment proves regeneration or error-retry behavior. Those missing actions keep the full transparency id pending.

# Problem

The existing daily allowance already supplies grants, same-day vetting raises, and the UTC reset. Its missing fact is **what consumed the allowance**. Adding a separate accounting event beside each message would leave two records that application code must keep synchronized.

This candidate makes each turn the accounting fact and the conversation fact. A turn starts as a persisted user message with reserved exposure. It finishes with provider usage, its assistant response, and the charge. `discovery_spend.spent` is a transactionally maintained aggregate of completed pool turns.

Two consequences are deliberate:

- The raw, caller-selected debit path must stop being a supported way to remove credits.
- A request whose provider outcome is unknown remains unresolved. A timeout does not release its exposure or authorize another paid attempt.

The design does not introduce a fuel ledger, revive the parked semantic-oracle harness, or claim live model quality from scripted answers.

# Shape

## Decisions

**The turn record.** `discovery_turns` stores the project, conversation, ordered user message, assistant content blocks, provider usage and cost, charged credits, billing target, immutable request settings, admission time, and completion time. A trigger applies the pool debit when a row transitions to completed; the debit and completed row commit together. A deferred constraint trigger verifies `discovery_spend.spent = sum(completed pool-turn credits)` for the affected NGO/day. Completed accounting fields cannot change. Fuel turns have zero free-credit charge. There is no separate messages table and no second spend ledger.

**Ratio and rounding.** Pin one credit to **USD 1 of provider cost**, with `credits = ceil(provider_cost_usd / 1 USD)` and zero cost charging zero. This is a proposed product constant, not a discovered requirement. Store dollars as integer nanodollars and calculate with integer arithmetic. Compute actual cost from response usage and the pinned model price schedule; do not accept a browser-supplied cost. Preflight reserves a conservative upper bound, not an estimated charge. This initial client reserves the full supported input-window cost plus the configured maximum output cost. Actual usage above an ordinary estimate settles normally within that reservation. Usage above the hard bound is a provider-contract violation: preserve the evidence, retain the reservation, and refuse further automatic processing rather than cap the recorded cost and falsely claim the subsidy invariant.

**Funding seam.** Add `projects.fuel_activated_at timestamptz null`. Null means unfunded; non-null means funded even when fuel is exhausted. The routing function is `billingTarget(funding: ProjectFunding): BillingTarget`; it never takes remaining fuel as an input. Loop fixtures set activation and supply a project-specific fuel port. Integration operators may set activation to exercise the SQL branch, but the shipped fuel implementation refuses with `funded-billing-unavailable`. All five funded-path ids are green against the loop contract and pending at integration. Stripe later writes activation from its verified funding transaction and replaces the refusing SQL fuel hook with its own atomic reservation and consumption operations. It does not replace routing or turn storage.

**Send route.** Promote `discovery-message`; narrow its inventory standing to `admits: ['ngo']`. TypeScript handles account standing, organization-admin authorization, and request shape. The SQL turn definer repeats authorization, checks email confirmation and the NGO switch, checks the need/conversation, snapshots funding, and reserves exposure before returning model context. The edge calls the model and then invokes settlement through the same inventoried RPC. Settlement persists the assistant response and accounting atomically. Email refusal is always HTTP **409**, `{ok:false, kind:'email-unverified', reason: emailUnverifiedReason(accountId)}` for an otherwise authorized NGO sender. No competing TypeScript email refusal is added.

**Conversation store.** A small `discovery_conversations` header holds identity, project ownership, the immutable initial intake context, and prompt version. Ordered turn rows hold all messages. Resume reads the header plus every accepted turn in sequence, including an unresolved user message. The next request is assembled from the immutable starting context and all completed user/assistant pairs; it never substitutes a summary or truncates older turns. Creation requires the need’s `discovery_in_progress` stage and does not advance that stage. Conversation content is product data protected by tenant authorization. It is never copied into an AI metering audit event.

**Model client.** Choose direct `fetch` in Deno-only `_shared/anthropic-messages.ts`, called only from `edge.ts`. Pin `claude-opus-5`, standard-only service, `max_tokens: 4096`, non-streaming output, disabled thinking, no tools, and no prompt-cache writes in this first slice. Omit unsupported or unnecessary optional parameters rather than invent a priority field. Read `ANTHROPIC_API_KEY` lazily from the function environment so keyless refusal and read tests can run. The current official model table identifies this Opus id, a one-million-token context, and USD 5/25 per million input/output tokens; those values become reviewed source pins, not runtime discoveries. Funding cannot enter the settings constructor. The alternative for the founder’s unit-four gate is a pinned `npm:@anthropic-ai/sdk` import, with automatic retries disabled. [Anthropic model reference](https://platform.claude.com/docs/en/models/overview), [pricing](https://platform.claude.com/docs/en/about-claude/pricing), [service tiers](https://platform.claude.com/docs/en/api/service-tiers).

**Stand-in and oracle.** Add a Messages stand-in with separate `port` and `sim` faces. The port returns normal Messages content and usage; only the sim can queue responses, inspect requests, or hold a response to create concurrency. Controlled costs are produced by controlled token usage under the same shipped price calculation. A seven-turn, non-technical grant-deadline fixture has an independent oracle asserting the actual facts, constraints, stories, and nested acceptance criteria, including rejection of contradictory facts. Loop proves replay, context assembly, cost arithmetic, and oracle discrimination; it does not prove Opus can generate that answer. Keyless integration proves real Auth, SQL, routing refusals, storage, and reads. Live elicitation remains pending on `vendors.anthropic-messages`. No semantic judge harness is assumed.

**Kill switch.** Add `organizations.discovery_enabled boolean not null default true`. `set-organization-discovery` accepts `{organizationId, enabled, reason}` and calls a platform-admin definer. The admin update and turn admission lock the same organization row. A send admitted after the disable commits cannot reach the model. An already admitted external request cannot be recalled; settlement observes the current switch and withholds delivery while preserving its accounting evidence. The change appends `organization_discovery_changed` with actor, reason, organization, and old/new booleans. No notification is introduced: the request establishes no notification obligation and no taxonomy row is added.

**Absence arms.** One scanner detects supplemental grant paths across route names, RPCs, SQL definitions, columns, triggers, schedules, shared declarations, and UI copy. It searches Discovery/credit/allowance subjects combined with supplemental, bonus, extra, grant, award, reset, or adjustment operations, then separately checks the effective writers of `granted` and `spent`. The other scans the same surfaces for Discovery-wide circuit breakers, global/platform caps, shared disable flags, and cross-NGO spend aggregation feeding admission. These are naming and structural checks with explicit limitations, supplemented by two-NGO behavior. Both throw if their source inventory cannot be loaded.

**Transparency read.** Extend the existing allowance route’s `read` action with optional project/conversation selectors. Its response includes the unchanged allowance fields, unresolved reservations separately, and the turn records the screen will render. `remaining` remains exactly grant minus settled spending; reservation exposure is not silently subtracted from it. The returned `availableToStart` is explicitly a computed admission quantity. Reconciliation compares the aggregate against completed pool turns and uses turn sequence to derive each negative spending delta. Day rollover is a change of day key, not a fabricated turn or a negative ledger entry.

**Red set.** Declare loop **18 green / 40 pending**, integration **8 green / 50 pending**, across all 58 ids. Among this run’s twenty, loop has eighteen green and two pending; integration has eight green and twelve pending. The money-system separation id remains pending at both tiers because no money system exists. Transparency remains pending at both tiers because regeneration and error retry are not implemented; integration additionally awaits rendering. This is stricter than the explainer’s loop reading and avoids proving future actions by giving them names in a fixture.

**Writer lanes.** Metering goes to **astra at medium**, because its writer must resolve locking, deferred constraints, existing-data migration, and the raw-debit compatibility transition. Conversation goes to **astra at medium**, because edge orchestration, unknown external outcomes, and live fixture quality still require design judgment. Funded routing, remedies, abuse controls, and transparency go to **grok at xhigh**, applying the contracts below. These are implementation assignments, not agents spawned by this design runner.

## Tables and columns

| Object | Columns and types |
|---|---|
| Existing `discovery_spend` | Keep `org_id uuid`, `utc_day date`, `spent integer`, `granted integer`, primary key and existing checks. No remaining column. |
| Existing `organizations` | Add `discovery_enabled boolean not null default true`. |
| Existing `projects` | Add `fuel_activated_at timestamptz null`. No money amount or fuel balance. |
| New `discovery_conversations` | `id uuid primary key`; `org_id uuid not null`; `project_id uuid not null`; `created_by uuid not null`; `intake_context jsonb not null`; `prompt_version text not null`; `created_at timestamptz not null`. |
| New `discovery_turns` | `id uuid primary key`; `org_id uuid not null`; `project_id uuid not null`; `conversation_id uuid not null`; `sequence integer not null`; `request_id uuid not null`; `sender_account_id uuid not null`; `user_content jsonb not null`; `assistant_content jsonb null`; `state text not null`; `billing_target text not null`; `utc_day date not null`; `request_settings jsonb not null`; `price_version text not null`; `reserved_credits integer not null`; `provider_usage jsonb null`; `provider_cost_nusd bigint null`; `credits_charged integer not null default 0`; `provider_message_id text null`; `fuel_receipt_id text null`; `admitted_at timestamptz not null`; `completed_at timestamptz null`; `delivery_withheld boolean not null default false`. |

Constraints:

- Composite foreign keys bind organization, project, and conversation consistently.
- `unique(conversation_id, sequence)` and `unique(conversation_id, request_id)`.
- States: `in_flight`, `completed`, `failed_known`, `outcome_unknown`.
- Billing targets: `pool`, `fuel`.
- One unresolved turn per conversation through a partial unique index.
- Completed rows require assistant content, usage, provider cost, and completion time.
- Pool completed charges equal the pinned rounded cost.
- Fuel turns always have `credits_charged = 0`; completed fuel turns require a receipt.
- Failed or unresolved rows have no settled free-credit charge.
- Negative amounts are forbidden.
- Completed rows cannot be edited or deleted through product execution paths. Trigger guards also reject rewriting their message content.

Both new tables are `tenant-isolated` in `TENANT_CATALOG`. Revoke all privileges from `anon`, `authenticated`, and `service_role`, then grant only SELECT to `authenticated`, with:

```sql
using (public.viewer_is_org_member(org_id))
```

Enable RLS without FORCE. Reuse the existing viewer helper; introduce no new viewer function. The service role reaches storage only through definers.

The conversation header is intentionally retained. Eliminating it would require a special first “turn” for intake and conversation identity, including conversations with no completed messages. That would make the ledger less truthful to save one small table.

## SQL functions and write-frame extension

All service-callable mutating functions use `SECURITY DEFINER`, `SET search_path = ''`, revoke PUBLIC execution, grant only to `service_role`, and call `assert_account_active`. Internal helpers are owner-only.

| Function | Signature and role |
|---|---|
| Turn dispatcher | `discovery_turn(p_account_id uuid, p_organization_id uuid, p_action text, p_payload jsonb) returns jsonb` — actions `begin`, `settle`, `fail_known`, `mark_unknown`. Only the edge constructs internal actions. |
| Existing allowance, extended | `discovery_allowance(p_account_id uuid, p_organization_id uuid, p_action text, p_credits integer default null, p_turn_id uuid default null, p_conversation_id uuid default null, p_project_id uuid default null) returns jsonb` — read projection; debit only for a matching completed turn in its completing transaction. |
| Credits conversion | `discovery_credits(p_cost_nusd bigint) returns integer` — immutable, owner-only, exact integer ceiling. |
| Fuel integration hook | `charge_project_fuel(p_account_id uuid, p_project_id uuid, p_turn_id uuid, p_phase text, p_amount_nusd bigint) returns jsonb` — owner-only definer; phases `reserve`, `settle`, `release_known_unused`; shipped body refuses unavailable billing. |
| Admin switch | `set_organization_discovery(p_account_id uuid, p_organization_id uuid, p_enabled boolean, p_reason text) returns jsonb`. |
| Turn trigger | `apply_discovery_turn() returns trigger` — validates transitions; calls the allowance debit on completion; prevents rewriting terminal facts. |
| Reconciliation trigger | `assert_discovery_turn_sum() returns trigger` — deferred constraint trigger on affected spend/turn changes; checks aggregate equality at commit. |

Drop the old four-argument allowance function when installing the extended signature; do not leave an overload that preserves an unlinked debit escape hatch.

`writeRoute` gets one narrowly scoped orchestration branch for `discovery-message`. It still owns authentication, standing, refusal mapping, and every database call. The existing private `callDatabaseFunction` remains private. Each phase uses the route’s same inventoried `discovery_turn` RPC. No general arbitrary-RPC callback is exposed.

The function entry point remains:

```ts
Deno.serve(writeRoute({
  name: "discovery-message",
  target: organizationIdField,
  decide: decideDiscoveryMessage,
  render: renderDiscoveryMessage,
}));
```

There is a matching `verify_jwt = true` block. The admin entry point has the same shape. The existing allowance route remains inventoried.

### Raw debit compatibility

An arbitrary `{action:'debit', credits:n}` cannot remain a successful public operation while every negative delta must represent a real turn. Creating synthetic conversations or inventing provider costs would conceal that conflict.

The extended SQL allowance function preserves its existing authorization, zero-balance, oversize, and sentence checks. A debit that passes those checks still requires a matching `p_turn_id`; otherwise it raises `turn-required`. The HTTP decision rejects client-selected debit operations. Settlement supplies the turn id internally.

The NGO-profile suite must migrate its debit setup to genuine turn-accounting fixtures, keeping the same grant/reset/vet-raise/refusal assertions. At integration these fixtures invoke the real SQL turn transition with explicitly operator-supplied provider results. They prove the allowance boundary, not a live Anthropic call. Their helper names and evidence must disclose this change; a helper must not silently pretend to have sent an HTTP debit.

Existing historic spending is a separate migration gate: if nonzero spend cannot be reconciled to authentic source records, the migration refuses rather than fabricating turns or erasing spend. No historical input records exist in the supplied grounding. Deployment against a populated ledger therefore needs an explicit migration decision.

## Admission, settlement, and concurrency

1. **TypeScript gate:** authenticate; active NGO standing; organization-admin role; strict request shape.
2. **SQL authorization:** repeat active-account, NGO membership, and admin checks.
3. **SQL email gate:** read `auth.users.email_confirmed_at`.
4. **SQL switch gate:** lock the organization row and read `discovery_enabled`.
5. **SQL context gate:** verify project ownership, submitted need stage, conversation ownership, and idempotency.
6. **SQL funding decision:** read activation while holding the project lock; snapshot pool or fuel.
7. **SQL exposure admission:** derive the UTC day after acquiring locks; compare the conservative reservation against grant minus settled spend minus outstanding reservations.
8. **Persist admission:** insert the user turn with its sequence, frozen settings, billing target, day, and reservation.
9. **Edge model call:** construct full context and call Messages once.
10. **SQL settlement:** lock the same organization/conversation; validate usage, identity, settings and state; store assistant content and cost; complete the row; trigger the aggregate debit.
11. **Return:** only after settlement commits. If disabled during execution, return the disabled refusal and withhold the response.

Use organization → project → conversation → spend/turn as the consistent lock order. Different NGOs do not share a spending lock.

Idempotency rules:

- Same request id and identical message, completed: return the existing result without another provider call.
- Same request id with different content: `request-conflict`.
- Existing unresolved request: `turn-in-progress`; do not dispatch again.
- A response lost after settlement is recovered by replaying the same request id.
- A timeout with uncertain provider execution retains its reservation and becomes `outcome_unknown`.
- No elapsed-time lease releases uncertain exposure.
- Failed admission raises and rolls back all of its writes, including any initial grant-row upsert.

An admitted turn retains its admission day through settlement. Its cost belongs to that day’s exposure budget even if completion crosses midnight. The next turn uses the new day key. Integration backdating moves corresponding turn and spend fixture records together; it never changes the product clock.

### Hard provider-cost bound

At the proposed prices and settings:

```text
maximum input cost  = 1,000,000 × $5 / 1,000,000 = $5
maximum output cost =     4,096 × $25 / 1,000,000 = $0.1024
reservation         = ceil($5.1024 / $1)         = 6 credits
```

This deliberately reserves against the provider’s full input limit. A token-count estimate is useful for context diagnostics but is not the spend proof; Anthropic documents that token counts are estimates. [Token-counting documentation](https://platform.claude.com/docs/en/build-with-claude/token-counting).

This is conservative and can refuse a small likely turn while several credits remain. It is nevertheless a usable initial free path: typical small turns settle below their reservation, and the seven-turn acceptance conversation can use a vetted fixture.

Pin the provider limit, prices, and output bound alongside the settings. No tools, caching writes, automatic retries, premium inference mode, or other unaccounted billable operation may enter this client. A model or pricing change requires updating the bound and its tests together.

## HTTP contracts

### `POST discovery-message`

Request:

```ts
type SendRequest = {
  organizationId: string;
  projectId: string;
  conversationId?: string; // omitted only when starting
  requestId: string;       // client-generated UUID, retained across retries
  message: string;
};
```

Success:

```ts
type SendSuccess = {
  ok: true;
  conversationId: string;
  turn: {
    id: string;
    sequence: number;
    assistantContent: ContentBlock[];
    providerCostUsd: string;
    creditsCharged: number;
    billingTarget: "pool" | "fuel";
    admittedAt: string;
    completedAt: string;
  };
  allowance: Allowance;
};
```

Clients cannot supply usage, cost, billing target, model settings, credits, or internal SQL phase.

### `POST discovery-allowance`

Request:

```ts
{
  organizationId: string;
  action: "read";
  projectId?: string;
  conversationId?: string;
}
```

Response extends the existing top-level allowance answer:

```ts
{
  ok: true;
  organizationId: string;
  utcDay: string;
  vetted: boolean;
  dailyGrant: number;
  spentToday: number;
  remaining: number;
  reservedCredits: number;
  availableToStart: number;
  conversations: ConversationHeader[];
  messages: ConversationMessage[];
  turns: TurnCostView[];
}
```

A bare read remains backward compatible and writes nothing. The conversation projection contains all ordered messages, not only today’s. Cost records include billing target, day, usage summary, provider cost, charged credits, and unresolved status.

### `POST set-organization-discovery`

Request:

```ts
{ organizationId: string; enabled: boolean; reason: string }
```

Response:

```ts
{ ok: true; organizationId: string; enabled: boolean; changed: boolean }
```

Require a nonblank reason. An unchanged value returns `changed:false` and emits no duplicate audit event.

## Refusals

Reuse the existing account, organization, membership, need, parameter, email, and allowance kinds. Preserve the three existing SQL/TypeScript sentences exactly.

Add the following strings to `WRITE_REFUSAL_KINDS`; SQL DETAIL is exactly the same string:

| DETAIL / kind | SQLSTATE | Meaning |
|---|---|---|
| `turn-required` | `22023` | A raw debit lacks its completing turn. |
| `discovery-disabled` | `P0001` | Discovery is disabled for this NGO. |
| `need-not-in-discovery` | `P0001` | The need is not submitted for Discovery. |
| `no-such-conversation` | `P0001` | No conversation exists in the requested project. |
| `request-conflict` | `P0001` | An idempotency key was reused with different content. |
| `turn-in-progress` | `P0001` | An unresolved turn must finish or be reconciled. |
| `project-fuel-exhausted` | `P0001` | The funded project needs fuel; free credits are not considered. |
| `funded-billing-unavailable` | `P0001` | The production fuel capability is absent. |
| `provider-bound-exceeded` | `P0001` | Observed provider usage violates the pinned bound. |
| `invalid-provider-result` | `22023` | Settlement data is malformed or inconsistent. |
| `context-capacity-exceeded` | `P0001` | Full prior context cannot fit; do not truncate silently. |

These SQL refusals map to 409 through the write frame. Existing TypeScript request-shape and authorization refusals retain 400/403. Transport outages remain 502; they are not translated into business-rule success.

## Shared module contracts

All declarations below are type aliases or functions. Pure files use relative imports and contain no Deno, database client, or provider credential access.

```ts
// discovery-metering.ts
export const DISCOVERY_NUSD_PER_CREDIT: bigint;
export const DISCOVERY_PRICE: PriceSchedule;
export function providerCostNusd(usage: ProviderUsage): bigint;
export function creditsForCost(costNusd: bigint): number;
export function maximumTurnCost(settings: RequestSettings): bigint;
export function admissionDecision(input: AdmissionInput): AdmissionDecision;

// discovery-routing.ts
export type ProjectFunding = { fuelActivatedAt: string | null };
export type BillingTarget = "pool" | "fuel";
export function billingTarget(funding: ProjectFunding): BillingTarget;

// discovery-message.ts
export function decideDiscoveryMessage(
  input: AccountWriteRouteInput
): WriteRouteDecision<BeginTurnArgs>;
export function discoverySettings(): RequestSettings;
export function buildMessages(
  header: ConversationHeader,
  turns: readonly ContextTurn[]
): MessagesRequest;
export function parseProviderResult(value: unknown): ProviderResult;
export function renderDiscoveryMessage(value: unknown): SendSuccess;

// discovery-control.ts
export function decideSetOrganizationDiscovery(
  input: AccountWriteRouteInput
): WriteRouteDecision<SetDiscoveryArgs>;
export function renderSetOrganizationDiscovery(value: unknown): SetDiscoveryAnswer;

// discovery-allowance.ts, extended
export function renderDiscoveryAllowance(value: unknown): AllowanceRead;
export function decideDiscoveryAllowance(
  input: AccountWriteRouteInput
): WriteRouteDecision<DiscoveryAllowanceArgs>;

// anthropic-messages.ts — Deno-only
export function createAnthropicMessagesClient(): AnthropicMessagesPort;
```

New configuration entries:

| `AT_CONFIG` entry | `CONFIG_KEYS` dotted key |
|---|---|
| `discoveryNusdPerCredit` | `req-004.discovery.nusd_per_credit` |
| `discoveryModelId` | `req-004.discovery.model_id` |
| `discoveryMaxOutputTokens` | `req-004.discovery.max_output_tokens` |
| `discoveryMaxInputTokens` | `req-004.discovery.max_input_tokens` |
| `discoveryInputNusdPerToken` | `req-004.discovery.input_nusd_per_token` |
| `discoveryOutputNusdPerToken` | `req-004.discovery.output_nusd_per_token` |

Tests read the existing daily-grant keys, never repeat the grant numerals. Static pins compare shipped constants, effective SQL, and `AT_CONFIG`.

## Anthropic stand-in and oracle

The shared stand-in contract lands in `tests/at/harness/contracts.ts`:

```ts
type AnthropicMessagesPort = {
  create(request: MessagesRequest): Promise<ProviderResult>;
};

type AnthropicMessagesSim = {
  enqueue(response: ProviderResult): void;
  rejectNext(): void;
  holdNext(): { release(response: ProviderResult): void };
  requests(): readonly MessagesRequest[];
};

type AnthropicMessagesStandIn = {
  port: AnthropicMessagesPort;
  sim: AnthropicMessagesSim;
};
```

Implement its factory beside the email stand-in in `vendors.ts`; connect it through harness construction and adapter vendor types. Integration continues to omit `h.vendors`. The Deno client implements the shipped structural port; it does not import test harness code.

The fixture uses seven user turns about grant reporting:

- Different funders impose different reporting dates.
- Two staff members need shared ownership and visible deadlines.
- Staff need reminders before deadlines.
- A report can be marked submitted without deleting its history.
- Access is limited to the organization’s staff.
- The tool stores grant administration facts, not beneficiary case records.
- The NGO needs a maintainable internal tool.

The oracle checks those propositions and corresponding actionable stories and criteria. It rejects invented beneficiary processing, public access, a single universal deadline, or deletion of submitted history. Mutation cases remove or contradict each required proposition to prove the oracle can fail.

A separate script defines stand-in responses. The oracle does not compare output to that script’s exact strings. No judge API or parked oracle import is necessary.

## Suite contract and files

```ts
type DiscoverySut = {
  provisionNgo: OrganizationsSut["provisionNgo"];
  provisionPlatformAdmin: OrganizationsSut["provisionPlatformAdmin"];
  signInAgain(email: string): Promise<Session>;
  startSubmittedNeed(session: Session, input: NeedInput): Promise<ProjectRef>;
  send(session: Session | null, request: SendRequest): Promise<SendOutcome>;
  read(session: Session | null, request: ReadRequest): Promise<ReadOutcome>;
  setEnabled(session: Session, request: SetDiscoveryRequest): Promise<SetDiscoveryOutcome>;
  attachReferenceFile: NeedsSut["attachReferenceFile"];
  setFundingAsOperator(projectId: string, funding: ProjectFunding): Promise<void>;
  completeAccountingFixtureAsOperator(input: AccountingFixture): Promise<TurnView>;
  writeSpendRowAsOperator(input: SpendFixture): Promise<void>;
  attemptTurnDefinerAsOperator(input: TurnAttempt): Promise<SqlOutcome>;
  reconcile(organizationId: string): Promise<ReconciliationProblem[]>;
};
```

Operator fixture helpers are explicit privileged test setup. They are not product routes.

Create fourteen suite files:

- `_bind.ts`, `_contract.ts`, `_fixture.ts`, `_live.ts`, `_pending.ts`
- `_source-pins.ts`, `_source-absences.ts`, `_oracle.ts`
- `a-metering.test.ts`
- `b-funding.test.ts`
- `c-remedies.test.ts`
- `d-conversation.test.ts`
- `e-abuse-transparency.test.ts`
- `f-later-capabilities.test.ts`

Register exactly 58 literal `atTest` call sites. Both adapters export `requirement = 'req-004' as const`; add the suite to `AdapterModules`. Every body names both tiers or `default`. Pending bodies throw ordered capability names, never skip.

Mark screen obligations for wiring: this run’s `.02`, `.03a`, `.03b`, `.10`, `.11`, and `.46`. Do not label static absence tests as UI.

Update the auth fixture and live adapter when promoting `discovery-message`; remove the obsolete send capability refusal where the real route now exists.

## Expected-state declaration

The expected file uses `"requirement": "004"` and the existing `{kind:"capability-pending", capabilities:[...]}` entries.

Within this run:

| Ids | Loop | Integration |
|---|---|---|
| `.01`, `.08`, `.41`, `.42`, `.43`, `.44`, `.47`, `.49` | Green | Green |
| `.02`, `.03a`, `.03b` | Green | `ui.discovery-surface` |
| `.04`, `.05`, `.06`, `.48` | Green | `checkout.project-fuel`, `billing.funded-turn` |
| `.09` | Green | `checkout.project-fuel`, `billing.funded-turn` |
| `.10`, `.11` | Green | `vendors.anthropic-messages` |
| `.45` | `checkout.project-fuel` | `checkout.project-fuel` |
| `.46` | `discovery.zero-cost-actions` | `ui.discovery-surface`, `discovery.zero-cost-actions` |

For `.11`, keyless integration still exercises authenticated resume reads over operator-seeded turn history. It does not claim persistence of a real provider conversation; therefore the complete id stays pending.

For `.01`, `.47`, and `.49`, integration drives actual SQL admission and settlement with controlled operator results. This proves accounting under real transaction concurrency, not model execution. Static settings and price-bound checks accompany `.49`.

The remaining thirty-eight ids are pending in both tiers. Each row below expands into individual red entries:

| Ids | Ordered capabilities | Missing work |
|---|---|---|
| `.12`, `.13`, `.14` | `discovery.free-scope-guardrails` | Redirects, ceiling, notices, founder flag. |
| `.15` | `discovery.free-scope-guardrails`, `billing.funded-turn` | Full funded exemption across all free guardrails. |
| `.16`, `.17` | `storage.reference-upload`, `discovery.reference-context` | File bytes and visibility-enforced model context. |
| `.18` | `storage.reference-upload`, `discovery.reference-context`, `ui.reference-upload-surface` | Mid-conversation upload and subsequent use. |
| `.19` | `storage.reference-upload`, `billing.funded-turn` | Real attachment and funded file-bearing consumption. |
| `.20`, `.22` | `discovery.structured-scope` | Complete scope schema and both build parts. |
| `.21`, `.25` | `discovery.scope-rendering`, `ui.discovery-surface` | Full money-free and per-tier document presentation. |
| `.24` | `prd.initial-backlog-lineage` | Initial decomposition from passing dev PRD. |
| `.52` | `prd.discovery-contract-consumption` | PRD authoring and scorer reference. |
| `.26`, `.27`, `.28`, `.29`, `.30`, `.31`, `.50` | `discovery.data-sensitivity` | Tier assignment, exposure controls, acknowledgments. |
| `.51` | `discovery.data-sensitivity`, `triage.queue` | Human confirmation with final edited scope. |
| `.32`, `.33`, `.34`, `.35`, `.36` | `discovery.maintainability-fit` | Fit judgment and durable decline behavior. |
| `.53` | `discovery.decline-review-production` | Atomic decline record, ops item, and notification. |
| `.54` | `discovery.decline-review-production`, `ui.discovery-surface` | Visible declined project and oversight copy. |
| `.55`, `.56`, `.57` | `discovery.decline-disposition` | Disposition, reopening, and calibration retrieval. |
| `.37`, `.39` | `discovery.zero-cost-actions` | Implemented regeneration and error-retry paths. |
| `.38` | `discovery.regeneration-escalation` | Bound exhaustion and admin escalation. |
| `.58`, `.59`, `.60` | `discovery.cause-taxonomy` | Normalizing generation and deletion-only correction. |

Author this declaration before executing the suite. A capability becoming green requires changing the declaration in that same implementation change.

## Reconciliation query

The deferred trigger and operator evidence use the same invariant:

```sql
with turn_totals as (
  select org_id, utc_day, sum(credits_charged)::bigint as credits
  from public.discovery_turns
  where state = 'completed'
    and billing_target = 'pool'
  group by org_id, utc_day
)
select
  coalesce(s.org_id, t.org_id) as org_id,
  coalesce(s.utc_day, t.utc_day) as utc_day,
  s.spent,
  coalesce(t.credits, 0) as turn_credits
from public.discovery_spend s
full join turn_totals t using (org_id, utc_day)
where coalesce(s.spent, 0)::bigint <> coalesce(t.credits, 0);
```

It must return no rows. Unique turn identities and immutable charges give each spending increment one visible source.

For adjacent reads within a day:

```text
remaining_after − remaining_before
  = grant_raise − sum(newly completed pool-turn credits)
```

Reservations do not enter this equation. Attach creates neither a turn charge nor a spending change. A new day starts from its tier grant without carrying yesterday’s remainder.

# Tradeoffs accepted

The design preserves all forty-four numbered constraints. It changes the successful raw-debit API because retaining it conflicts with the requested turn-only accounting invariant; it preserves the allowance ownership, grant behavior, refusal wording, and test obligations.

The conservative provider bound is expensive in availability: six credits must be available to begin a turn under the proposed settings. It avoids pretending a token estimate is a spending guarantee. The USD-per-credit choice also sets a potentially substantial maximum subsidy and needs explicit founder acceptance.

The external request is not transactional with PostgreSQL. Unknown outcomes stay visible and reserved; this design favors bounded exposure over automatic recovery. Full system-error retry policy remains later work.

Disable is linearized at admission. A turn admitted before the switch commits may already be running. The switch prevents subsequent admissions and suppresses delivery; it cannot erase a provider’s incurred cost.

Turn rows work for non-streaming user/assistant exchanges. They become awkward for tool loops, multiple independent assistant messages, streaming recovery, or parallel branches. Those features would justify a child attempt/event structure later. None requires a separate message table now.

Planned production additions:

- **Four migrations:** core turn accounting/conversations; funding activation and refusing hook; audit enum value; NGO switch and admin writer.
- **Two new edge folders:** promoted send and admin switch; one existing route extended.
- **Two new tables**, two existing-table columns.
- **Seven SQL functions:** four new non-trigger functions, two trigger functions, and one replaced allowance function.
- **Five new `_shared` modules**, including the Deno client.
- **One Messages stand-in** and one fixture-specific oracle.
- **Fourteen suite files**, one expected-state file, plus harness and existing-suite registration/conformance edits.

The metering migration contains the conversation storage foundation so the later conversation unit fills in model execution rather than changing the accounting schema.

# Alternatives considered

**Separate message and debit records.** Easier to evolve independently, but duplicates the relationship this lane is supposed to make structural. A completed turn already has both pieces.

**Use only turn rows, without a conversation header.** Rejected. Initial intake context, prompt version, identity, and empty conversations would need synthetic turn types.

**Charge an estimate and refund the difference.** Rejected. It creates negative deltas before a completed turn cost exists and turns refunds into another accounting path.

**Cap the charge after the response.** Rejected. It bounds credits while allowing provider spend to exceed the subsidy.

**Release reservations after a timeout.** Rejected. A slow or acknowledged-but-lost provider response could then be followed by another paid request against the same allowance.

**Pretend the funding column is a fuel ledger.** Rejected. Activation proves routing state, not a debit or the standard platform share.

**Restore the parked semantic judge.** Rejected. The fixture needs a new, discriminating local oracle; restoring a general judge framework is unnecessary for this slice.

# Open questions and risks

- The founder’s unit-four gate must choose direct fetch or the SDK and approve the model/settings/price pin. This package recommends fetch.
- The founder must approve the proposed conversion ratio and its subsidy ceiling.
- Existing nonzero spend without authentic turn provenance blocks migration. No automatic backfill can manufacture that evidence.
- Account or membership revocation during an external call may prevent normal settlement authorization. Keep the reservation and require privileged reconciliation; do not bypass `assert_account_active`. Automated reconciliation is **not done here**.
- Full prior context may eventually exceed provider capacity. Refuse explicitly rather than silently lose messages. Context compaction is **not done here**.
- Source absence scans cannot prove arbitrary disguised behavior. Writer checks and two-NGO tests strengthen them, but the eventual money integration must rerun separation checks.
- No real reference-file bytes enter this initial client. The later attachment surface fills the context boundary.
- The later Stripe work fills the owner-only fuel hook and webhook activation writer. Free guardrails consume the stored billing target. Regeneration/retries extend turn/attempt semantics without arbitrary allowance debits. Structured output extends assistant-content validation. Decline review references the conversation and freezes its relevant sequence, while audit events remain body-free. Wiring renders the existing read contract.

# Next implementation step

First author the 58-id expected declaration and the accounting contract tests. Then implement the turn schema, linked allowance debit, deferred reconciliation, and concurrency tests before adding model execution.

Required verification is the specified typecheck, bijection, harness self-tests, and both expected tiers for this requirement, followed by both tiers of auth, NGO profile, intake, and notifications. Serve the Deno routes explicitly: TypeScript project checks do not cover those entry points.

This design runner has performed source review only and claims no test execution.

# Synthesis decision

# Per-unit plan

### Unit 1 — Allowance metering

**Files:** core migration; `_shared/discovery-metering.ts`; extended `discovery-allowance.ts`; `edge.ts`; allowance entry point; configuration pins; suite foundation, `_source-pins.ts`, `a-metering.test.ts`; NGO-profile accounting fixture adaptations.

**Ids:** AT-004.01, .02, .08, .47, .49.

**Tier result:** all five green at loop; four green at integration; `.02` pending `ui.discovery-surface`.

**Lane:** astra at medium. The writer must settle SQL locking, existing-data migration, and compatibility without weakening prior allowance assertions.

### Unit 2 — Funded routing

**Files:** funding migration; `_shared/discovery-routing.ts`; dispatcher fuel branch; `b-funding.test.ts`; loop project-fuel fixture implementation.

**Ids:** AT-004.04, .05, .06, .48, .09.

**Tier result:** five green at loop against the routing/fuel-port contract; all five pending `checkout.project-fuel`, `billing.funded-turn` at integration.

**Lane:** grok at xhigh. Apply the fixed activation, no-fallback, and owner-only fuel-hook contract.

### Unit 3 — Zero-credit remedies

**Files:** `c-remedies.test.ts`; reuse existing SQL/TypeScript reason functions and sentence pins.

**Ids:** AT-004.03a, .03b.

**Tier result:** both green at loop; both pending `ui.discovery-surface` at integration.

**Lane:** grok at xhigh. No new remedy wording or grant constants.

### Unit 4 — Persisted Opus conversation

**Files:** `_shared/discovery-message.ts`, `_shared/anthropic-messages.ts`; promoted send entry point; `edge.ts`, inventory/config; harness contracts/vendors/construction; `_oracle.ts`, `d-conversation.test.ts`; auth fixture/live-adapter promotion; empty provider-key declaration.

**Ids:** AT-004.10, .11.

**Tier result:** both green at loop; both pending `vendors.anthropic-messages` at integration. Keyless persistence/read evidence remains useful but does not change those complete-id verdicts.

**Lane:** astra at medium. The writer must resolve live-provider execution and recovery details after the founder’s client-choice gate.

### Unit 5 — Abuse controls

**Files:** separate audit enum migration; switch migration; `_shared/discovery-control.ts`; admin entry point; inventory/config; `_source-absences.ts`; `e-abuse-transparency.test.ts`; tenant and audit conformance registrations.

**Ids:** AT-004.41 through .45.

**Tier result:** `.41`–`.44` green at both tiers; `.45` pending `checkout.project-fuel` at both.

**Lane:** grok at xhigh. Apply the fixed SQL gate, lock, audit, and scanner contracts.

### Unit 6 — Transparency

**Files:** allowance read projection and renderer; reconciliation evidence helpers; `e-abuse-transparency.test.ts`; expected declaration.

**Id:** AT-004.46.

**Tier result:** backend read, attachment neutrality, and reconciliation assertions run at both tiers. The complete id remains pending `discovery.zero-cost-actions` at loop, and `ui.discovery-surface`, `discovery.zero-cost-actions` at integration.

**Lane:** grok at xhigh. Apply the turn-derived projection; introduce no independent debit history or mutable balance.
# Problem

The Discovery send path must meter free turns, route funded turns away from the free pool, block at zero with the right remedies, persist a resumable conversation, and expose remaining credits. The tree already has the daily ledger, the write frame, the email floor, and the need at stage `discovery_in_progress`. It does not have a turn journal, a funding flag, a kill switch, a conversation store, or an Anthropic call.

This candidate puts every billing and gate decision in one pure TypeScript kernel. SQL is a snapshot reader plus a thin commit that re-checks what a concurrent writer can change. The loop fixture drives the kernel with in-memory snapshots. That is where all twenty ids of this run go green.

The kernel cannot lock a spend row, and it cannot stop a forged RPC. The database must still enforce `spent <= granted` and “a funded project never touches the pool”.

# Usage

The wiring leaf later has three calls: send a turn, read Discovery state, and (for a platform admin) flip the kill switch. Tests drive those three calls. The six units share one SUT.

`must` unwraps `{ ok: true }`. Each block provisions its own NGO admin.

```ts
// Unit 1 — AT-004.01, .02, .08, .47, .49
const ngo = await sut.provisionNgo(w.email('meter'), { emailVerified: true });
const need = must(await sut.submitNeed(ngo.session, { /* start + save + submit */ }));
h.vendors.anthropic.queueUsage({ inputTokens: 200, outputTokens: 50, cacheReadTokens: 0, cacheCreationTokens: 0 });
const turn = must(await sut.sendDiscoveryTurn(ngo.session, {
  organizationId: ngo.organizationId, projectId: need.projectId, message: 'We run a community fridge.',
}));
const unverifiedGrant = h.config.get<number>('req-002.discovery.daily_credits.unverified');
expect(turn.remaining).toBe(unverifiedGrant - turn.turn.creditsCharged);
expect(turn.turn.billingTarget).toBe('free_pool');
expect(turn.turn.creditsCharged).toBe(creditsFromCostUsd(costUsdFromUsage(turn.usage, DISCOVERY_MODEL_PRICES)));
// Second project under the same NGO draws the same remaining.
// Operator backdate proves the UTC reset.
// A send at remaining 0 refuses before the model runs.
```

```ts
// Unit 2 — AT-004.04, .05, .06, .48, .09
await sut.setProjectFundingAsOperator(fundedProjectId, true);
h.vendors.anthropic.setFuelRemaining(fundedProjectId, 5_000); // cents; loop only
const fundedTurn = must(await sut.sendDiscoveryTurn(ngo.session, { /* funded project */ }));
expect(fundedTurn.turn.billingTarget).toBe('project_fuel');
expect(fundedTurn.spentToday).toBe(spentBefore); // pool unchanged
expect(fundedTurn.turn.modelId).toBe(unfundedTurn.turn.modelId);
expect(fundedTurn.turn.maxTokens).toBe(unfundedTurn.turn.maxTokens);
expect(fundedTurn.turn.serviceTier).toBe(unfundedTurn.turn.serviceTier);
h.vendors.anthropic.setFuelRemaining(fundedProjectId, 0);
const blocked = await sut.sendDiscoveryTurn(ngo.session, { /* same funded project */ });
expect(blocked).toMatchObject({ ok: false, kind: 'fuel-unbillable' });
expect(must(await sut.readAllowance(ngo.session, ngo.organizationId)).remaining).toBeGreaterThan(0);
```

```ts
// Unit 3 — AT-004.03a, .03b
await sut.writeSpendRowAsOperator({ organizationId, utcDay: today, spent: grant, granted: grant });
const unverifiedBlock = await sut.sendDiscoveryTurn(session, { organizationId, projectId, message: 'hello' });
expect(unverifiedBlock).toMatchObject({ ok: false, kind: 'daily-allowance-exhausted' });
expect(unverifiedBlock.reason).toBe(dailyAllowanceExhaustedReason(organizationId, 'unverified'));
// After vet: the same send uses the vetted sentence and does not contain "get vetted".
```

```ts
// Unit 4 — AT-004.10, .11
h.vendors.anthropic.scriptConversation(FRIDGE_TURNS); // 5–10 user/assistant pairs
for (const step of FRIDGE_TURNS) {
  must(await sut.sendDiscoveryTurn(session, { organizationId, projectId, message: step.user }));
}
expect(communityFridgeOracle(await sut.readDiscoveryState(session, projectId))).toEqual([]);
expect(h.vendors.anthropic.requests()).toHaveLength(FRIDGE_TURNS.length);
expect(h.vendors.anthropic.requests()[FRIDGE_TURNS.length - 1].messages).toHaveLength(2 * FRIDGE_TURNS.length - 1);
const later = await sut.signInAgain(email);
const resumed = must(await sut.readDiscoveryState(later, projectId));
expect(resumed.messages.map((m) => m.content)).toEqual(firstVisit.messages.map((m) => m.content));
```

```ts
// Unit 5 — AT-004.41 .. .45
const unverified = await sut.provisionNgo(w.email('unverified'), { emailVerified: false });
expect(await sut.sendDiscoveryTurn(unverified.session, body)).toMatchObject({
  ok: false, kind: 'email-unverified', status: 403,
});
expect(await sut.discoveryMessages(projectId)).toEqual([]);
await sut.setDiscoveryKillSwitch(admin.session, { organizationId, disabled: true, note: 'abuse' });
expect(await sut.sendDiscoveryTurn(verified.session, body)).toMatchObject({ ok: false, kind: 'discovery-killed' });
expect(grantPathProblems()).toEqual([]);
expect(platformBreakerProblems()).toEqual([]);
expect(discoveryWalletProblems()).toEqual([]);
```

```ts
// Unit 6 — AT-004.46
const state = must(await sut.readDiscoveryState(session, projectId));
expect(state.remaining).toBe(state.dailyGrant - state.spentToday);
expect(state.turns.map((t) => t.creditsCharged)).toEqual([first.turn.creditsCharged, second.turn.creditsCharged]);
expect(await sut.spendEqualsFreePoolTurns(organizationId, today)).toBe(true);
const spentBeforeAttach = state.spentToday;
must(await sut.attachReferenceFile(session, { organizationId, projectId, file }));
expect(must(await sut.readAllowance(session, organizationId)).spentToday).toBe(spentBeforeAttach);
```

# Shape

## Kernel module

File: `supabase/functions/_shared/discovery-billing.ts`.

The module is pure. Tests import it. Edge functions import it. It does not import `Deno`, `npm:`, or `fetch`.

```ts
export const DISCOVERY_MODEL_ID = 'claude-opus-4-1-20250805';
export const DISCOVERY_MAX_TOKENS = 4096;
export const DISCOVERY_SERVICE_TIER = 'standard';
export const DISCOVERY_CREDITS_PER_USD = 100; // pinned again in AT_CONFIG
export const DISCOVERY_MODEL_PRICES: ModelPrices; // usd per million tokens, from AT_CONFIG
export const DISCOVERY_SYSTEM_PROMPT: string; // structured elicitation; later leaves add guardrail lines

export type BillingTarget = 'free_pool' | 'project_fuel';

export type FuelState =
  | { readonly kind: 'unknown' }           // SQL snapshot today; Stripe replaces this
  | { readonly kind: 'remaining'; readonly cents: number }; // loop stand-in / Stripe later

export type BillingSnapshot = {
  readonly organizationId: string;
  readonly projectId: string;
  readonly accountId: string;
  readonly emailVerified: boolean;
  readonly orgRole: 'admin' | 'member' | null;
  readonly vetted: boolean;
  readonly killed: boolean;
  readonly needStage: 'draft' | 'discovery_in_progress' | null;
  readonly funded: boolean;
  readonly fuel: FuelState;
  readonly utcDay: string;
  readonly granted: number;
  readonly spent: number;
  readonly messages: readonly { role: 'user' | 'assistant'; content: string }[];
  readonly userMessage: string;
};

export type BillingRefusal = {
  readonly ok: false;
  readonly kind: WriteRefusalKind;
  readonly reason: string;
  readonly status: 403 | 409;
};

export type BillingAdmission = {
  readonly ok: true;
  readonly target: BillingTarget;
  readonly remainingBefore: number;
  readonly modelRequest: AnthropicMessageRequest;
};

export type SettledTurn = {
  readonly ok: true;
  readonly target: BillingTarget;
  readonly creditsCharged: number;
  readonly providerCostMicrousd: number;
  readonly usage: AnthropicUsage;
  readonly capped: boolean;
  readonly modelId: string;
  readonly maxTokens: number;
  readonly serviceTier: string;
};

export function remainingCreditsOf(snapshot: BillingSnapshot): number;
export function routeDiscoveryBilling(funded: boolean, fuel: FuelState): BillingTarget | BillingRefusal;
export function creditsFromCostUsd(costUsd: number): number; // 0 if cost <= 0; else max(1, ceil(cost * ratio))
export function costUsdFromUsage(usage: AnthropicUsage, prices: ModelPrices): number;
export function discoveryModelRequest(
  messages: readonly { role: 'user' | 'assistant'; content: string }[],
  userMessage: string,
): AnthropicMessageRequest; // NO funding argument
export function preflightDiscoveryBilling(snapshot: BillingSnapshot): BillingAdmission | BillingRefusal;
export function settleDiscoveryBilling(
  snapshot: BillingSnapshot,
  admission: BillingAdmission,
  usage: AnthropicUsage,
  assistantText: string,
): SettledTurn | BillingRefusal;
export function decideDiscoverySend(input: AccountWriteRouteInput): WriteRouteDecision<DiscoverySendArgs>;
export function renderDiscoverySend(value: unknown): DiscoverySendView;
export function decideDiscoveryKillSwitch(input: AccountWriteRouteInput): WriteRouteDecision<DiscoveryKillArgs>;
export function decideDiscoveryState(input: AccountWriteRouteInput): WriteRouteDecision<DiscoveryStateArgs>;
export const DISCOVERY_SEND_KERNEL: DiscoveryKernelSpec;
```

### Gate order inside `preflightDiscoveryBilling`

The write frame already refused a deactivated caller and a wrong account type. The kernel then runs this order, and no other order:

1. Organisation exists and the caller is an org admin (`not-a-member` / `not-an-admin`, 403).
2. Email floor via shipped `discoveryMessageAllowed` (`email-unverified`, 403). The reason is the shipped sentence that names verification as the remedy.
3. Kill switch (`discovery-killed`, 403).
4. Need is at `discovery_in_progress` (`need-not-in-discovery`, 409).
5. `routeDiscoveryBilling(funded, fuel)` → `free_pool` or `project_fuel`, or `fuel-unbillable` (409).
6. If `free_pool` and remaining ≤ 0: `daily-allowance-exhausted` (409) with `dailyAllowanceExhaustedReason` (already split by tier).
7. Admit. Build `discoveryModelRequest` from prior messages plus the new user message.

A remaining count of 1 or more admits the model call even when the estimate might exceed remaining. After the model returns, `settleDiscoveryBilling` charges `min(creditsFromCostUsd(actual), remaining)` and sets `capped: true` when it truncated. A remaining count of 0 never calls the model.

This is the rounding rule: **ceil** of `costUsd * DISCOVERY_CREDITS_PER_USD`, with a floor of 1 credit when cost is positive, and 0 credits when cost is 0. The kernel never writes `spent`.

### Why the kernel cannot hold some invariants

| Invariant | Kernel | Database must |
|---|---|---|
| `spent <= granted` | Computes a charge against a snapshot that is already stale after the RPC returns | `CHECK (spent <= granted)` plus the debit arm’s compare-then-add under `FOR UPDATE` |
| Funded project never touches the pool | Routes on `snapshot.funded` | Commit re-reads `projects.funded`. If funded, it does not call `discovery_allowance` debit. It raises `funded-project-not-pooled` if the kernel target is `free_pool` and the row is funded. |
| Kill switch is immediate | Reads `snapshot.killed` | Commit re-reads `organizations.discovery_disabled_at` before debit. A flip during the model call refuses the commit, writes no turn, and charges nothing. |
| Membership | Reads `snapshot.orgRole` | Commit re-checks `org_memberships` `FOR SHARE` |
| Email floor | Calls `discoveryMessageAllowed` | Commit’s debit arm already reads `auth.users.email_confirmed_at` |
| Two concurrent free turns | Both may admit | Row lock on `discovery_spend`; the second debit raises `debit-exceeds-remaining` or `daily-allowance-exhausted` and rolls back |

The snapshot RPC does not hold a lock after it returns. That is why commit re-checks.

## Tables

No second spend ledger. `discovery_spend` stays the only free-credit row.

### Columns on existing tables

`organizations.discovery_disabled_at timestamptz null` — null means Discovery is on. A timestamp means a platform admin killed Discovery for this NGO. The send path reads this column on snapshot and again on commit.

`projects.funded boolean not null default false` — the funding seam until Stripe lands. True means every Discovery turn on this project must bill fuel and must never debit `discovery_spend`. Stripe later fills fuel remaining and may replace this flag with a view over the fuel ledger. This run does not store cents.

### New tables

All three: `REVOKE ALL` from `anon`, `authenticated`, `service_role`; `ENABLE ROW LEVEL SECURITY`; no `FORCE`; no grants to client roles. Catalog posture: `unreachable-by-client-roles`. Reads go through definers, the same way `discovery_spend` does. The UI never selects these tables.

**`discovery_conversations`**

| Column | Type | Notes |
|---|---|---|
| `project_id` | uuid PK | FK to `need_intakes(project_id)` |
| `org_id` | uuid not null | denormalised; FK to `organizations` |
| `created_at` | timestamptz not null | `clock_timestamp()` |
| `updated_at` | timestamptz not null | |

One conversation per submitted need. The first admitted send inserts the row. A need not at `discovery_in_progress` never gets a row.

**`discovery_messages`**

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `project_id` | uuid not null | FK to `discovery_conversations` |
| `org_id` | uuid not null | denormalised |
| `turn_id` | uuid null | FK to `discovery_turns`; set on the assistant row |
| `role` | text | check `in ('user','assistant')` |
| `content` | text not null | NGO-visible body. This is the resume record and the future decline-review record. |
| `sequence` | integer not null | per project, strictly increasing |
| `created_at` | timestamptz not null | |

Unique `(project_id, sequence)`.

**`discovery_turns`** — the money journal. No prompt. No response.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `org_id` | uuid not null | |
| `project_id` | uuid not null | |
| `utc_day` | date not null | UTC day of `clock_timestamp()` after the spend lock |
| `occurred_at` | timestamptz not null | |
| `billing_target` | text not null | check `in ('free_pool','project_fuel')` |
| `provider_cost_microusd` | integer not null | `>= 0` |
| `credits_charged` | integer not null | `>= 0`; 0 only for a zero-cost settle |
| `capped` | boolean not null | true when settle truncated to remaining |
| `input_tokens` | integer not null | |
| `output_tokens` | integer not null | |
| `cache_read_tokens` | integer not null default 0 | |
| `cache_creation_tokens` | integer not null default 0 | |
| `model_id` | text not null | |
| `max_tokens` | integer not null | |
| `service_tier` | text not null | |

The AT-004.46 invariant is a query, not a convention:

```sql
-- for an org/day that used only the send path (no raw discovery_allowance debit):
select s.spent = coalesce((
  select sum(t.credits_charged) from public.discovery_turns t
   where t.org_id = s.org_id and t.utc_day = s.utc_day and t.billing_target = 'free_pool'
), 0)
from public.discovery_spend s
where s.org_id = $org and s.utc_day = $day;
```

By construction: a `free_pool` commit calls `discovery_allowance` debit with `credits_charged` and inserts the turn in the same function, so both succeed or both roll back. A `project_fuel` commit inserts a turn and does not call debit. A daily reset is a new `(org_id, utc_day)` key, not a negative `spent` delta. File attach does not call this commit.

### How the conversation differs from audit

`audit_events` stays metadata-only. This run does not add a metered-AI audit kind. Request and response bodies never go in `audit_events`. Bodies live only in `discovery_messages`, which is the product record for resume and for the later decline ops item. The turn row is the cost record. That split is the answer to the architecture note that forbids bodies on metered audit events.

## SQL definers

All: `security definer`, `search_path = ''`, `assert_account_active`, revoke from `public`, grant execute to `service_role` only.

**`discovery_billing_snapshot(p_account_id uuid, p_organization_id uuid, p_project_id uuid) returns jsonb`**

Read-only. Calls `assert_account_active`. Share-locks the organisation. Returns the kernel snapshot: membership, `email_confirmed_at is not null`, vet flag, `discovery_disabled_at is not null`, need stage, `projects.funded`, today’s `spent`/`granted` (high-water in memory, no write), and the conversation messages in sequence. Fuel is always `{ "kind": "unknown" }` in SQL. The loop fixture builds the same shape from maps and may set `fuel.kind = 'remaining'`.

**`discovery_send_commit(...)` returns jsonb**

Arguments: account, org, project, billing target, credits, cost microusd, usage fields, model id, max tokens, service tier, capped flag, user text, assistant text.

Re-checks: active account, org admin membership, kill column, need stage, `projects.funded` versus `p_billing_target`.

If `p_billing_target = 'free_pool'`: raise `funded-project-not-pooled` when `projects.funded` is true; if `p_credits > 0`, call `public.discovery_allowance(..., 'debit', p_credits)` (email floor, high-water, remaining bound, exhausted sentences stay in one place); if `p_credits = 0`, skip debit.

If `p_billing_target = 'project_fuel'`: raise `unfunded-project-not-fuel` when not funded; do not call debit. There is no fuel ledger, so a live funded commit is not used until Stripe. The kernel refuses `fuel-unbillable` before the model when fuel is unknown or zero, so commit on the fuel arm is for the Stripe run to call.

Then insert conversation if missing, insert user message, insert turn, insert assistant message with `turn_id`. Return the send view (allowance + turn + assistant message).

**`set_discovery_kill_switch(p_account_id uuid, p_organization_id uuid, p_disabled boolean, p_note text) returns jsonb`**

Platform-admin copy of `set_organization_vetting`: `assert_account_active`, `account_type = 'platform_admin'`, non-blank note, org `FOR UPDATE`, set or clear `discovery_disabled_at`, `append_audit_event`. No notification (no taxonomy row fits; Not done here).

**`discovery_state_read(p_account_id uuid, p_organization_id uuid, p_project_id uuid) returns jsonb`**

Org admin. Returns remaining (same high-water read as allowance, no write), today’s turns for the org, and messages for the project.

## Routes

Promote `WRITE_ROUTES['discovery-message']` from stand-in to `{ kind: 'edge', rpc: 'discovery_send_commit' }`. Narrow `admits` to `['ngo']`. Add `supabase/functions/discovery-message/index.ts` as one `Deno.serve(writeRoute({...}))` with `kernel: DISCOVERY_SEND_KERNEL`. Add `[functions.discovery-message] verify_jwt = true`.

The req-001 fixture’s local `sendDiscoveryMessage` stays a bookkeeping path for AT-001.10 over `discoveryMessageAllowed`. The live adapter keeps throwing `CapabilityPending(['sut.accounts.sendDiscoveryMessage'])`, so req-001’s expected file does not move.

New write routes:

| Name | admits | RPC | Body | Success |
|---|---|---|---|---|
| `discovery-message` | ngo | `discovery_send_commit` (via kernel path) | `{ organizationId, projectId, message }` | `{ ok, remaining, utcDay, dailyGrant, spentToday, vetted, turn, message }` |
| `set-discovery-kill-switch` | platform_admin | `set_discovery_kill_switch` | `{ organizationId, disabled, note }` | `{ ok, organizationId, disabled, disabledAt }` |
| `discovery-state` | ngo | `discovery_state_read` | `{ organizationId, projectId }` | `{ ok, remaining, utcDay, dailyGrant, spentToday, killed, turns, messages }` |

`discovery-message` is not one RPC. `writeRoute` in `edge.ts` grows an optional `kernel` spec. When present it: calls snapshot RPC → `preflightDiscoveryBilling` → dynamic-imports the Deno model client → `settleDiscoveryBilling` → calls commit RPC. `callDatabaseFunction` stays unexported. Other routes stay one RPC. `index.ts` still contains exactly one `Deno.serve(writeRoute(`.

Email HTTP shape, one shape on the product path: **403** `{ ok: false, kind: 'email-unverified', reason }` from the kernel, using `discoveryMessageAllowed`’s sentence. SQL debit still raises `DETAIL 'email-unverified'` as the backstop (409 only if the edge is skipped). Tests of the send route assert 403.

## Refusal kinds (append to `WRITE_REFUSAL_KINDS`)

| Kind | DETAIL / TS kind | When |
|---|---|---|
| `email-unverified` | already present | email floor |
| `daily-allowance-exhausted` | already present | remaining ≤ 0 on free pool |
| `debit-exceeds-remaining` | already present | concurrent oversize debit |
| `discovery-killed` | new | kill switch on |
| `need-not-in-discovery` | new | no need, or stage is `draft` |
| `fuel-unbillable` | new | funded and fuel unknown or 0; never falls back |
| `funded-project-not-pooled` | new | SQL backstop |
| `unfunded-project-not-fuel` | new | SQL backstop |

## Deno model client

File: `supabase/functions/_io/anthropic-messages.ts`. Tests never import it. The write-route scan allows the file if it does not name `/rest/v1/`, `createClient`, `.rpc(`, or a service-role key.

Position: **`fetch` against `https://api.anthropic.com/v1/messages`**. No `npm:@anthropic-ai/sdk`. Edge functions have no import map. `edge.ts` already uses `fetch` for PostgREST. The SDK in `package.json` is a parked Node devDependency.

Alternative at the unit 4 gate: `npm:@anthropic-ai/sdk` in this same Deno-only file. That adds a specifier the rest of the functions never use.

`requireEnv('ANTHROPIC_API_KEY')` runs inside the complete function, not at import time. `edge.ts` dynamic-imports this file only on the kernel path so other functions do not boot it. `.env.example` gains an empty `ANTHROPIC_API_KEY=` line. The value lives in `.env.local`. `childEnv` already drops provider keys.

Request settings (identical for funded and unfunded because `discoveryModelRequest` does not take funding):

```
model: DISCOVERY_MODEL_ID
max_tokens: DISCOVERY_MAX_TOKENS
service_tier: DISCOVERY_SERVICE_TIER
system: DISCOVERY_SYSTEM_PROMPT
messages: prior user/assistant rows plus the new user text
```

No SSE in this run. One JSON request, one JSON response. A stream can wait for the wiring leaf.

## Stand-in (two faces)

`tests/at/harness/contracts.ts` gains `AnthropicMessagesPort`, `AnthropicMessagesSim`, `AnthropicUsage`, `AnthropicMessageRequest`. `Vendors` gains `anthropic: AnthropicMessagesSim`. `createHarness` at loop builds `createAnthropicMessagesSim()` beside the email sim and hands `port` to the adapter. Integration still omits `vendors`.

```ts
export type AnthropicMessagesPort = {
  complete(request: AnthropicMessageRequest): AnthropicMessageResponse;
};
export type AnthropicMessagesSim = {
  queueUsage(usage: AnthropicUsage): void;
  queueReply(content: string, usage?: AnthropicUsage): void;
  scriptConversation(turns: readonly { user: string; assistant: string; usage: AnthropicUsage }[]): void;
  setFuelRemaining(projectId: string, cents: number): void; // fixture fuel port, not the Messages API
  fuelRemaining(projectId: string): number | null;
  requests(): AnthropicMessageRequest[]; // out of band; the port never sees this
};
```

The port returns `content` and `usage` only. It does not tell the SUT that the reply was scripted. AT-004.02 injects usage via `queueUsage`. AT-004.09 reads `requests()` and compares `model`, `max_tokens`, and `service_tier`. AT-004.11 reads `requests()[n].messages` and checks full prior content.

The fixture-specific oracle for AT-004.10 is `tests/at/suites/req-004/_oracle-fridge.ts`. It is a function the test imports, not a harness member. It returns a problem list over the persisted transcript against the community-fridge fixture (required facts, constraints, user stories, acceptance criteria). Loop is green against the scripted stand-in. Integration is pending `vendors.anthropic` because CI has no key and no live judge.

## Pins

`AT_CONFIG` (numbers only) and `CONFIG_KEYS`:

| Key | Dotted key | Value | Source |
|---|---|---|---|
| `discoveryCreditsPerUsd` | `req-004.discovery.credits_per_usd` | 100 | architecture cost intent (~$1–2 per scoped run) against the 10/30 grants; provisional |
| `discoveryOpusInputUsdPerMTok` | `req-004.discovery.opus.input_usd_per_mtok` | 15 | public Opus list price; provisional |
| `discoveryOpusOutputUsdPerMTok` | `req-004.discovery.opus.output_usd_per_mtok` | 75 | same |
| `discoveryOpusCacheReadUsdPerMTok` | `req-004.discovery.opus.cache_read_usd_per_mtok` | 1.5 | same |
| `discoveryOpusCacheWriteUsdPerMTok` | `req-004.discovery.opus.cache_write_usd_per_mtok` | 18.75 | same |

Model id is a shipped string constant, not `AT_CONFIG` (the registry holds numbers and booleans only). A static pin in `tests/at/suites/req-004/_source-pins.ts` compares the constant to the Deno client file as text.

Do not hard-code 10 or 30. Read `req-002.discovery.daily_credits.unverified` and `.vetted`.

## Suite

`tests/at/suites/req-004/` in the intake shape. Register `'req-004'` in `AdapterModules`. Both adapters export `requirement = 'req-004' as const`. Fifty-eight `atTest` call sites. `tests/at/expected/req-004.json` authored before the first run.

SUT contract (`_contract.ts` type aliases; judgement types imported from shipped modules):

```ts
export type DiscoverySut = {
  provisionNgo(email: string, opts: { emailVerified: boolean }): Promise<NgoActor>;
  signInAgain(email: string): Promise<Session>;
  setVetting(...): Promise<...>;
  startNeed(...); saveNeed(...); attachReferenceFile(...); submitNeed(...);
  readAllowance(session, organizationId): Promise<AllowanceOutcome>;
  sendDiscoveryTurn(session, { organizationId, projectId, message }): Promise<DiscoverySendOutcome>;
  readDiscoveryState(session, projectId): Promise<DiscoveryStateOutcome>;
  setDiscoveryKillSwitch(session, { organizationId, disabled, note }): Promise<...>;
  setProjectFundingAsOperator(projectId, funded: boolean): Promise<void>;
  writeSpendRowAsOperator(...): Promise<void>;
  seedConversationAsOperator(projectId, messages): Promise<void>; // integration resume without a model
  spendEqualsFreePoolTurns(organizationId, utcDay): Promise<boolean>;
  discoveryMessages(projectId): Promise<string[]>;
};
```

Loop fixture: in-memory orgs, needs, spend rows, conversations, turns, kill flag, funded flag. It builds a `BillingSnapshot`, calls `preflightDiscoveryBilling`, calls `vendors.anthropic.complete`, calls `settleDiscoveryBilling`, applies the commit to maps. It never invents a second decide function.

Live adapter: `functionPost` to the three routes; operator SQL for funding flag, spend backdate, and conversation seed.

## Expected file — this run’s twenty ids

Loop: all twenty green.

Integration green: AT-004.03a, .03b, .08, .11, .41, .42, .43, .44, .46, .47, .48, .49 (twelve).

Integration red:

| Id | Capabilities | Reason |
|---|---|---|
| AT-004.01 | `vendors.anthropic` | A successful converse needs a model completion. No key in CI. Preflight-only is not “converses”. |
| AT-004.02 | `vendors.anthropic` | Controlled provider cost needs the stand-in. |
| AT-004.04 | `checkout.project-fuel`, `billing.funded-turn` | Routing is green at loop. A real fuel debit does not exist. |
| AT-004.05 | `checkout.project-fuel`, `billing.funded-turn` | Isolation of a successful fuel turn needs the ledger. |
| AT-004.06 | `checkout.project-fuel`, `billing.funded-turn` | The next turn must bill fuel, not only flip a flag. |
| AT-004.09 | `checkout.project-fuel` | Allowance-unchanged is true without Stripe. A funded turn that actually runs is not. |
| AT-004.10 | `vendors.anthropic` | Live Opus plus a real semantic check needs a local key. |
| AT-004.45 | `checkout.project-fuel` | Never-purchasable is the wallet scan (green at loop). “Outside the money ledger” waits on a money ledger, same as AT-002.10. |

Disagreement with the explainer: AT-004.01 is not green at integration without a model. AT-004.03a/b, .11, .46, .47, .48 are green at integration without a model, because they are a refusal, a read, a query, a ledger key, or a no-fallback refuse.

## Expected file — the other thirty-eight (both tiers)

Reuse existing names where they fit. New names only where none fits.

| Ids | Capability |
|---|---|
| AT-004.12, .13, .14, .15 | `discovery.free-guardrails` |
| AT-004.16, .17, .18 | `storage.reference-upload` |
| AT-004.19 | `storage.reference-upload`, `billing.funded-turn` |
| AT-004.20, .22 | `discovery.scope-output` |
| AT-004.21, .25 | `ui.discovery-surface` |
| AT-004.24, .52 | `prd.authoring` |
| AT-004.26, .27, .28, .29, .30, .31, .50 | `discovery.sensitivity-tiers` |
| AT-004.32, .33, .34, .35, .36, .53, .54 | `discovery.fit-decline` |
| AT-004.51 | `triage.queue` |
| AT-004.55, .56, .57 | `discovery.decline-disposition` |
| AT-004.37, .38, .39 | `discovery.regeneration` |
| AT-004.58, .59, .60 | `discovery.cause-labels` |

No `surface: 'ui'` on this run’s ids. The wiring leaf does not re-run them yet.

# Decisions (each in one paragraph)

**The turn record.** A turn lives in `discovery_turns` with provider cost in micro-usd, credits charged, project, org, UTC day, timestamp, billing target, usage, and the request settings AT-004.09 compares. User and assistant text live in `discovery_messages`, not on the turn. `discovery_spend.spent` and the free-pool turns stay equal because `discovery_send_commit` calls the existing `discovery_allowance` debit and inserts the turn in one function. A fuel turn inserts a row with `billing_target = 'project_fuel'` and does not call debit. The delta invariant is the SQL query above. Zero-cost attach never calls commit, so it leaves no delta. Regeneration and error retry are not in this run; they will call commit with `credits_charged = 0` and skip debit.

**The ratio and the rounding rule.** The turn learns provider cost from the model response usage (input, output, cache read, cache write) times the pinned Opus price table. The stand-in injects usage, so AT-004.02 exercises the same function. The ratio is 100 credits per USD, pinned in `AT_CONFIG` and `DISCOVERY_CREDITS_PER_USD`. Rounding is ceil, with a 1-credit floor on positive cost and 0 on zero cost. An underfunded turn is **not** refused on a high estimate (a max-token estimate is 31 credits and would block the 10-credit grant). Remaining 0 refuses before the model. Remaining > 0 runs, then **hard-caps** to remaining if actual credits exceed it. Overspend is impossible: settle caps, and SQL compare-then-add plus `CHECK (spent <= granted)` sit behind it.

**The funding seam.** `projects.funded` is the boolean the kernel reads. Fuel remaining is `FuelState` on the snapshot, not a column. SQL always reports `unknown`. The loop stand-in reports `remaining` cents. `routeDiscoveryBilling(true, unknown | remaining:0)` returns `fuel-unbillable` and never `free_pool`. Stripe later changes the snapshot RPC to return `remaining` from the fuel ledger and leaves the kernel signature in place. It may drop `projects.funded` for a view. AT-004.04, .05, .06, .09 stay pending at integration on `checkout.project-fuel` and `billing.funded-turn`. AT-004.48 goes green at integration: a funded project with unknown or zero fuel refuses and the pool does not move.

**The send route.** Promote `discovery-message`. Do not add a second inventory name. Request `{ organizationId, projectId, message }`. Response carries remaining, this turn’s cost, and the assistant message. Gate order: write frame (active, NGO) → decide shape (admin, uuids, non-empty message) → snapshot RPC → kernel (email, kill, stage, funding, zero-credit) → model → settle → commit SQL (kill, membership, funded-never-pool, debit, persist). TypeScript: email, kill, funding, zero-credit, ratio. SQL: membership, email backstop, kill, funded-never-pool, spend bound. One email HTTP shape: 403 `email-unverified` with the shipped remedy sentence.

**The conversation store.** One conversation row per submitted need, messages with a sequence, turns beside them. A new session calls `readDiscoveryState` and sees every prior message. The next send’s snapshot loads those rows into `discoveryModelRequest`, so the model sees full prior context. The conversation attaches only at `discovery_in_progress`. Audit events do not store bodies.

**The model client.** Deno-only `fetch` to the Messages API, key from `ANTHROPIC_API_KEY`, settings as constants. AT-004.09 is structural: `discoveryModelRequest` has no funding parameter, so funding cannot change model id, max tokens, or service tier. Alternative: the npm SDK in the same Deno file, brought to the founder at the unit 4 gate.

**The loop stand-in and the oracle.** Two faces in `vendors.ts`, contract in `contracts.ts`, first consumer is this suite. Usage injection is `queueUsage`. A scripted 5-to-10-turn fridge conversation is `scriptConversation`. The oracle is a suite function over the persisted transcript, not the parked judge. Integration without a key proves snapshot, refusals, resume read, and the delta query, and it declares pending `vendors.anthropic` where a completion is required.

**The kill switch.** Column `organizations.discovery_disabled_at`. Route `set-discovery-kill-switch`, body `{ organizationId, disabled, note }`, definer `set_discovery_kill_switch`, kind `discovery-killed`, audit kind `org_discovery_kill_switched` (own `ALTER TYPE` migration, then the definer migration). The send kernel reads the flag from the snapshot; commit re-reads the column so a stale snapshot cannot bypass it. No notification row (Not done here).

**The two absence arms.** AT-004.43 scans write routes, SQL functions, and copy for a path that raises `discovery_spend.granted` other than `apply_discovery_grant_mark` / the vetting definer, and for names that pair a free-credit grant with admin, bonus, extra, or supplement. AT-004.44 scans `supabase/` for circuit, breaker, global pause, platform-wide Discovery disable, and any kill column that is not per organisation. Both throw if they cannot read the tree. AT-004.45 reuses `discoveryWalletProblems` at loop.

**The transparency read.** Route `discovery-state` returns remaining and the turn records. The SQL query in Shape proves every free-pool spend increment matches a turn. Daily reset is a new day key, which is not a negative spend delta. File attach is the zero-cost proof in this run.

**The red set.** Eight integration reds, listed above. Thirty-eight later-leaf reds, listed above. Loop has no red among the twenty. Fewer reds than the explainer at integration, only where the proof does not need a model or a fuel ledger.

**Lanes.** Hardest-tasks (astra at medium): unit 1 (the kernel and the `writeRoute` kernel path) and unit 4 (store, client, stand-in, oracle). Feature (grok at xhigh): units 2, 3, 5, 6, which apply the kernel’s contract.

# Tradeoffs accepted

The kernel path makes `writeRoute` able to call two RPCs and a model. The index file still matches the scan. A second HTTP constructor would duplicate auth and standing.

Preflight does not use max tokens as a cost estimate. That estimate would exceed the 10-credit grant and block every free turn. Cap-after-run is the AT-004.49 option that keeps Discovery usable.

SQL snapshot reports fuel as unknown. Integration funded sends refuse. That is honest, and it is also AT-004.48. A stub cents column would be throwaway when Stripe lands.

AT-004.03a/b go green at integration on the send-route reason, not on a screen. “Shown” in this run is the JSON the wiring leaf will render. AT-002.05 stays pending on `ui.discovery-surface`.

AT-004.10 at loop is a checklist over a scripted transcript. It proves the 5-to-10-turn persist path and the fixture facts the script was written to contain. It does not prove Opus quality. That wait is `vendors.anthropic`.

No metered audit event in this run. The turn table is the journal. Adding an audit kind would be two migrations and still could not carry bodies.

`Vendors` gains `anthropic`, so every loop suite’s harness object grows a sim it may ignore. That matches “first consumer lands the contract in `contracts.ts`”.

# Alternatives considered

**Metering in SQL only, TypeScript as a shape check.** Rejected for this lane. The ratio, funding route, and remedy split would live in plpgsql that the loop fixture cannot drive without a database. The loop greens would collapse.

**Reserve then settle rows.** A reservation table would hold the spend lock across the model call. Stronger against the in-flight kill-switch race, and thicker SQL. The commit re-check already drops an in-flight turn without charging. A reserve row is work Stripe’s fuel hold can reuse later; this run does not build it.

**SSE send.** The migration notes want a stream. `writeRoute` returns one JSON body. Streaming would break the write frame and the kernel’s settle-after-usage. The wiring leaf can add a stream later without changing the journal.

**Keep `discovery-message` a stand-in and add `discovery-send`.** A second inventory name. The scan already expects `discovery-message`. Promote it.

**Put remaining on a caller-bound SELECT.** `discovery_spend` is unreachable by design. Remaining stays a definer read.

**Refuse underfunded turns before the model using a max-token estimate.** Blocks the product. Cap instead.

**Extend `write_standing` with email, vet, kill, and funding.** Every route would pay for Discovery facts. The snapshot RPC is the Discovery-only world load.

# Open questions and risks

The founder still picks fetch versus the npm SDK at the unit 4 gate. This design recommends fetch.

`discoveryCreditsPerUsd = 100` is provisional. At Opus list prices one short turn is several credits. The 10-credit grant may be one or two turns. Retune the pin without changing the kernel.

`exhaustedSentenceProblems` parses `public.discovery_allowance`. Commit calls that function and does not copy the sentences. A rewrite of the debit arm that the pin does not see would still fail req-002. Do not move the raises.

Dynamic `import()` of the model client from `edge.ts` is untested in this stack. If the edge runtime refuses it, statically import the client but keep `requireEnv` inside the complete function.

Two concurrent free turns can burn one model call that then refuses at commit. Acceptable. A reserve would avoid it.

AT-004.47 at integration is green on the ledger key and shared remaining, not on two successful sends. If the judge wants “runs Discovery” literally, move it to `vendors.anthropic`.

# Next implementation step

Author `tests/at/expected/req-004.json` with the green and red sets above. Register `req-004` in `AdapterModules`. Land unit 1: `discovery-billing.ts`, the kernel path in `writeRoute`, `discovery_turns`, snapshot and commit definers, the promoted send route, and the metering tests green at loop. Do not start unit 2 until that commit is on the branch and the founder answers the unit gate.

# Synthesis decision

# Per-unit plan

### Unit 1 — AI4DEV-138 (allowance metering)

**Lane:** hardest tasks (astra at medium). The kernel, the ratio, the turn journal, and the `writeRoute` kernel path are still design.

**Files:** `discovery-billing.ts`; `edge.ts` kernel path; `_io/anthropic-messages.ts` (stub complete used from unit 4; unit 1 loop can settle from the stand-in without this file if the fixture calls the kernel directly); migration for conversations/messages/turns and snapshot/commit; promote `discovery-message`; `AT_CONFIG` ratio and prices; suite `_bind/_contract/_fixture/_live/_pending` plus `a-metering.test.ts`; `tests/at/expected/req-004.json`; `AdapterModules`.

**Ids:** AT-004.01, .02, .08, .47, .49.

**Tiers:** all five green at loop. Integration: .08 .47 .49 green; .01 .02 pending `vendors.anthropic`.

### Unit 2 — AI4DEV-139 (funded routing)

**Lane:** feature (grok at xhigh). The kernel already exports `routeDiscoveryBilling`. This unit adds `projects.funded`, the fuel port on the loop snapshot, and the pending declarations.

**Files:** migration column `projects.funded`; fixture `setProjectFundingAsOperator` and `setFuelRemaining`; `b-funded-routing.test.ts`.

**Ids:** AT-004.04, .05, .06, .48, .09.

**Tiers:** all five green at loop. Integration: .48 green; the other four pending `checkout.project-fuel` and `billing.funded-turn` (.09 pending `checkout.project-fuel` only).

**Stripe later:** fill `FuelState` from the fuel ledger; keep the kernel; optionally replace `projects.funded`.

### Unit 3 — AI4DEV-140 (zero-credit remedies)

**Lane:** feature. The sentences already exist and already split by tier. The send preflight calls `dailyAllowanceExhaustedReason`. Do not write a second copy.

**Files:** `c-zero-remedies.test.ts` only, unless a pin fails.

**Ids:** AT-004.03a, .03b.

**Tiers:** green at loop and integration on the send-route reason.

### Unit 4 — AI4DEV-141 (Opus conversation)

**Lane:** hardest tasks. One-way door: fetch client, conversation persist, stand-in, oracle.

**Files:** `_io/anthropic-messages.ts`; `contracts.ts` / `vendors.ts` / `createHarness`; `_oracle-fridge.ts`; `d-conversation.test.ts`; `.env.example` `ANTHROPIC_API_KEY=`; `DISCOVERY_SYSTEM_PROMPT`. Founder gate: fetch versus SDK.

**Ids:** AT-004.10, .11.

**Tiers:** both green at loop. Integration: .11 green on reauth plus seeded read; .10 pending `vendors.anthropic`.

### Unit 5 — AI4DEV-156 (abuse guardrails)

**Lane:** feature. Kill switch copies the vetting admin route. Absences copy the NGO-profile source arms.

**Files:** `organizations.discovery_disabled_at`; two migrations (audit kind, then definer); `set-discovery-kill-switch` route; `_source-absences.ts`; `e-abuse.test.ts`.

**Ids:** AT-004.41–.45.

**Tiers:** .41–.44 green at both. .45 green at loop (wallet scan); integration pending `checkout.project-fuel`.

### Unit 6 — AI4DEV-157 (credit transparency)

**Lane:** feature. `discovery-state` plus the spend-equals-turns query. Attach is the zero-cost proof.

**Files:** `discovery-state` route and definer; `f-transparency.test.ts`; `g-later.test.ts` for the thirty-eight pending ids.

**Ids:** AT-004.46.

**Tiers:** green at loop and integration on the read contract and the query. Regeneration and retry remain later leaves (`discovery.regeneration`).
# Candidate 2: the conversation is the aggregate

Lane direction: one `discovery_conversations` row per need is the aggregate root. The message
history and the per-turn cost entries live on the row. One SQL definer, `discovery_turn`, gates,
routes, meters, persists the exchange and debits the ledger in one transaction. One send route
stands in front of it. `discovery_spend` stays exactly as it is and is debited through the
existing `discovery_allowance` function, which gains one non-writing action. Resume is a read of
the row.

## Problem

Six units, twenty acceptance ids, and five things the tree does not have: a call to Anthropic, a
stored conversation, a per-turn cost record, a funding state, and a per-NGO Discovery switch. The
allowance ledger exists and is correct. The write frame is fixed: one inventory row, one
`Deno.serve(writeRoute(...))`, one pure `decide`, one definer that re-checks. The frame calls one
RPC per request, and a Discovery turn needs a model call between a preflight and a settle. That
is the one place the frame must grow. Everything else is a table, a column, a definer, a
stand-in and a suite in the shapes the tree already has.

The delta invariant of AT-004.46 is the design's anchor: every negative movement of the
remaining credits must match one turn record or the daily reset. In this candidate the turn
records are the `turns` array on the conversation row, written in the same transaction as the
debit, by the same definer. The invariant is then a query over two tables, and the section
"Where jsonb on the row breaks" says what that query costs.

## Usage

The caller's view, written first. Every call site is in test form against the suite's SUT
(`DiscoverySut`, defined under Shape). `open()` hands the body `{ w, sut, h }` as in the intake
suite.

### Unit 1: a turn draws from the tier allowance at a constant ratio

```ts
// AT-004.02 at loop. The stand-in controls provider cost through usage.
const { w, sut, h } = await open();
const ngo = await sut.provisionNgo(w.email('ngo-ratio'), { emailVerified: true });
const need = await sut.startDiscovery(ngo.session, ngo.organizationId, 'Bed tracker');
const ratio = h.config.get<number>('req-004.discovery.nano_usd_per_credit');
h.vendors.anthropic.script([
  { reply: 'How many beds do you run?', usage: { input_tokens: 1000, output_tokens: 3000 } },
  { reply: 'Who checks people in?', usage: { input_tokens: 2000, output_tokens: 6000 } },
]);
const first = await sut.sendTurn(ngo.session, { organizationId: ngo.organizationId, projectId: need.projectId, message: 'We run a shelter.' });
const second = await sut.sendTurn(ngo.session, { organizationId: ngo.organizationId, projectId: need.projectId, message: 'Forty beds.' });
expect(first.ok && second.ok).toBe(true);
if (!first.ok || !second.ok) return;
expect(first.turn.credits).toBe(creditsFor(providerCostNanoUsd(first.turn.usage)));
expect(second.turn.credits).toBe(creditsFor(providerCostNanoUsd(second.turn.usage)));
expect(second.turn.costNanoUsd / first.turn.costNanoUsd).toBe(2);
expect(Math.ceil(first.turn.costNanoUsd / ratio)).toBe(first.turn.credits);
const view = await sut.readConversation(ngo.session, need.projectId);
expect(view.ok && view.value.conversation.turns.map((t) => t.credits)).toEqual([first.turn.credits, second.turn.credits]);
```

```ts
// AT-004.49 at integration. No model. The definer is driven as the operator.
const settled = await sut.attemptTurnDefinerAsOperator({
  accountId: ngo.accountId, organizationId: ngo.organizationId, projectId: need.projectId,
  phase: 'settle', payload: { message: 'x', reply: 'y', usage: HUGE_USAGE, costNanoUsd: 2_000_000_000_000 },
});
expect(settled).toMatchObject({ ok: false, kind: 'debit-exceeds-remaining' });
const rows = await sut.spendRows(ngo.organizationId);
expect(rows.every((r) => r.spent >= 0 && r.spent <= r.granted)).toBe(true);
```

### Unit 2: a funded project bills fuel and never the pool

```ts
// AT-004.05 at loop. The fuel route is a seam the fixture sets.
const a = await sut.startDiscovery(ngo.session, ngo.organizationId, 'Funded A');
const b = await sut.startDiscovery(ngo.session, ngo.organizationId, 'Unfunded B');
await sut.setProjectFuelRouteAsOperator(a.projectId, 'fuel');
h.vendors.anthropic.script([{ reply: 'A1', usage: ONE_CREDIT }, { reply: 'B1', usage: ONE_CREDIT }]);
const before = await sut.readAllowance(ngo.session, ngo.organizationId);
const turnA = await sut.sendTurn(ngo.session, { organizationId: ngo.organizationId, projectId: a.projectId, message: 'hi' });
const turnB = await sut.sendTurn(ngo.session, { organizationId: ngo.organizationId, projectId: b.projectId, message: 'hi' });
expect(turnA.ok && turnA.turn.billedTo).toBe('fuel');
expect(turnB.ok && turnB.turn.billedTo).toBe('free');
const after = await sut.readAllowance(ngo.session, ngo.organizationId);
expect(after.ok && before.ok && before.allowance.remaining - after.allowance.remaining).toBe(turnB.ok ? turnB.turn.credits : -1);
```

```ts
// AT-004.48 at loop. Exhausted fuel never falls back.
await sut.setProjectFuelRouteAsOperator(a.projectId, 'fuel_exhausted');
const blocked = await sut.sendTurn(ngo.session, { organizationId: ngo.organizationId, projectId: a.projectId, message: 'hi' });
expect(blocked).toMatchObject({ ok: false, kind: 'fuel-exhausted', status: 409 });
expect(h.vendors.anthropic.requests()).toHaveLength(2); // no model call was made
```

### Unit 3: zero credits, remedies by tier

```ts
// AT-004.03a at loop. Unverified tier, three remedies, in the existing sentence.
const grant = h.config.get<number>('req-002.discovery.daily_credits.unverified');
await sut.writeSpendRowAsOperator({ organizationId: ngo.organizationId, utcDay: utcDayOf(h.clock.now()), spent: grant, granted: grant });
const blocked = await sut.sendTurn(ngo.session, { organizationId: ngo.organizationId, projectId: need.projectId, message: 'hi' });
expect(blocked).toMatchObject({ ok: false, kind: 'daily-allowance-exhausted', status: 409 });
if (blocked.ok) return;
expect(blocked.reason).toBe(dailyAllowanceExhaustedReason(ngo.organizationId, 'unverified'));
expect(h.vendors.anthropic.requests()).toHaveLength(0);
```

### Unit 4: a conversation over 5 to 10 turns, resumed in a new session

```ts
// AT-004.11 at loop and integration (integration drives the definer as operator, then reads).
for (const step of SHELTER_SCRIPT) await sut.sendTurn(ngo.session, { organizationId: ngo.organizationId, projectId: need.projectId, message: step.ngoSays });
const again = await sut.signInAgain(ngo.email);
const resumed = await sut.readConversation(again, need.projectId);
expect(resumed.ok).toBe(true);
if (!resumed.ok) return;
expect(resumed.value.conversation.messages).toHaveLength(SHELTER_SCRIPT.length * 2);
expect(resumed.value.conversation.messages.map((m) => m.role)).toEqual(SHELTER_SCRIPT.flatMap(() => ['user', 'assistant']));
// the next turn carries the whole prior context to the model
h.vendors.anthropic.script([{ reply: 'noted', usage: ONE_CREDIT }]);
await sut.sendTurn(again, { organizationId: ngo.organizationId, projectId: need.projectId, message: 'one more thing', afterTurn: resumed.value.conversation.turnCount });
const last = h.vendors.anthropic.requests().at(-1)!;
expect(last.messages.slice(0, -1)).toEqual(resumed.value.conversation.messages.map(({ role, content }) => ({ role, content })));
```

### Unit 5: the kill switch

```ts
// AT-004.42 at loop and integration.
const admin = await sut.provisionPlatformAdmin(w.email('admin'));
const off = await sut.setDiscoverySwitch(admin, { organizationId: ngo.organizationId, action: 'disable', note: 'abuse report 17' });
expect(off).toMatchObject({ ok: true, discoveryDisabled: true, changed: true });
const blocked = await sut.sendTurn(ngo.session, { organizationId: ngo.organizationId, projectId: need.projectId, message: 'hi' });
expect(blocked).toMatchObject({ ok: false, kind: 'discovery-disabled', status: 409 });
expect(await sut.discoverySwitchAuditEvents(ngo.organizationId)).toHaveLength(1);
```

### Unit 6: transparency and the delta invariant

```ts
// AT-004.46 at loop; integration declares the rendering half pending.
const view = await sut.readConversation(ngo.session, need.projectId);
expect(view.ok).toBe(true);
if (!view.ok) return;
expect(view.value.allowance.remaining).toBe(view.value.allowance.dailyGrant - view.value.allowance.spentToday);
const ledger = await sut.spendReconciliation(ngo.organizationId);
for (const day of ledger) expect(day.spent).toBe(day.turnCredits);
await sut.attachReferenceFile(ngo.session, { organizationId: ngo.organizationId, projectId: need.projectId, file: CSV });
expect(await sut.spendReconciliation(ngo.organizationId)).toEqual(ledger);
```

## Shape

### Tables and columns

One new table, one new column, nothing else changes shape.

```sql
create table public.discovery_conversations (
  project_id  uuid primary key references public.need_intakes (project_id) on delete cascade,
  org_id      uuid not null,
  messages    jsonb not null default '[]'::jsonb,   -- [{ role, content, at, turn }]
  turns       jsonb not null default '[]'::jsonb,   -- one entry per settled turn, see below
  settings    jsonb not null,                       -- request settings pinned at the first turn
  turn_count  integer not null default 0,
  started_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  foreign key (project_id, org_id) references public.projects (id, org_id) on delete cascade,
  constraint discovery_conversations_messages_list check (jsonb_typeof(messages) = 'array'),
  constraint discovery_conversations_turns_list check (jsonb_typeof(turns) = 'array'),
  constraint discovery_conversations_turn_count check (turn_count = jsonb_array_length(turns)),
  constraint discovery_conversations_two_messages_per_turn check (jsonb_array_length(messages) = 2 * turn_count)
);
revoke all on table public.discovery_conversations from anon, authenticated, service_role;
alter table public.discovery_conversations enable row level security;
grant select on public.discovery_conversations to authenticated;
create policy discovery_conversations_select_org_member on public.discovery_conversations
  for select to authenticated using (public.viewer_is_org_member(org_id));
create policy discovery_conversations_select_platform_admin on public.discovery_conversations
  for select to authenticated using (public.viewer_is_platform_admin());

alter table public.organizations add column discovery_disabled_at timestamptz;
```

`TENANT_CATALOG` gains `discovery_conversations: 'tenant-isolated'`. The `org_id` is
denormalised the way `need_intakes` does it, and the composite foreign key keeps it honest.

One turn entry in `turns`:

```json
{
  "turn": 3,
  "utc_day": "2026-01-01",
  "billed_to": "free",
  "credits": 1,
  "cost_nano_usd": 62500000,
  "usage": { "input_tokens": 4100, "output_tokens": 1680, "cache_read_input_tokens": 0, "cache_creation_input_tokens": 0 },
  "model_id": "claude-opus-5",
  "settings": { "max_tokens": 1024, "effort": "medium" },
  "recorded_at": "2026-01-01T00:00:12.000Z"
}
```

A fuel-billed entry has `"billed_to": "fuel"`, `"credits": 0`, and the same `cost_nano_usd`.
The Stripe run reads `cost_nano_usd` from these entries to write its fuel consumption rows, or
replaces the entry's role with a foreign key to its own row; see Fit for what comes later.

One message in `messages`: `{ "role": "user" | "assistant", "content": "...", "turn": 3, "at": "..." }`.

### SQL functions

**`public.discovery_allowance(p_account_id uuid, p_organization_id uuid, p_action text, p_credits integer)`**
is replaced with one added arm. `p_action = 'preflight'` runs every check of the debit arm
(active account, membership, admin, email confirmed, positive credits, exhausted sentence,
exceeds sentence) and writes nothing: no grant mark, no lock, no update. It returns the same
jsonb as `read`. The two P0001 raises are the existing ones and keep their text, so
`exhaustedSentenceProblems` still reads exactly one unverified raise, one vetted raise and one
exceeds raise. The action check becomes `read`, `debit` or `preflight`. `decideDiscoveryAllowance`
does not change: the route still accepts `read` and `debit` only, so `preflight` is reachable
from `discovery_turn` alone.

**`public.project_fuel_route(p_project_id uuid) returns text`**, `stable`, `search_path = ''`,
revoked from every role, executable only by definers. Today its body is
`select 'free'::text`. It returns `'free'`, `'fuel'` or `'fuel_exhausted'`. This is the funding
seam. The Stripe run replaces its body with a read of its fuel ledger and changes nothing that
calls it.

**`public.discovery_turn(p_account_id uuid, p_organization_id uuid, p_project_id uuid, p_phase text, p_payload jsonb) returns jsonb`**,
security definer, `search_path = ''`, granted to `service_role`. Two phases, one function, one
gate order. Both phases run steps 1 to 8; only `settle` runs 9 to 12.

1. `assert_account_active(p_account_id)`.
2. Lock the organisation row. `open` takes `for share`; `settle` takes `for update`, so two
   settles of one organisation serialise, and `set_organization_discovery` (which takes
   `for update`) cannot interleave with a settle. Refuse `no-such-organisation` (23503).
3. Membership `for share`; refuse `not-a-member`, `not-an-admin` (42501).
4. `auth.users.email_confirmed_at is null` refuses `email-unverified` (42501), same sentence as
   the allowance's arm: `emailUnverifiedReason`. This is the one HTTP shape for the email
   refusal: 409 with `kind = 'email-unverified'`.
5. `organizations.discovery_disabled_at is not null` refuses `discovery-disabled` (P0001),
   sentence `discoveryDisabledReason(org)`. Read under the lock of step 2, so a switch committed
   before this transaction is always seen, and a switch after it waits for a settle to finish.
6. `need_intakes` row for `(p_project_id, p_organization_id)` at stage `discovery_in_progress`,
   else `need-not-in-discovery` (P0001). Lock the conversation row `for update` if it exists.
   If it does not exist, `open` returns an empty history and `settle` inserts it.
7. `v_route := public.project_fuel_route(p_project_id)`. `'fuel_exhausted'` refuses
   `fuel-exhausted` (P0001), sentence `fuelExhaustedReason(project)`. `'fuel'` skips step 8.
8. Free route only. `perform public.discovery_allowance(p_account_id, p_organization_id,
   'preflight', v_needed)` where `v_needed` is `p_payload->>'needed_credits'` at `open` and the
   settled credits at `settle`. This is where the zero-credit sentence and the exceeds sentence
   are raised, from their one home.
9. `settle` only: optimistic check. If `p_payload->>'after_turn'` is not null and differs from
   `turn_count`, refuse `stale-conversation` (P0001).
10. Meter. `v_cost := (p_payload->>'cost_nano_usd')::bigint`. `v_credits := case when v_route =
    'free' then greatest(1, ceil(v_cost / 100000000.0))::integer else 0 end`. The literal is the
    ratio; `ratioPinProblems` pins it to the TypeScript constant and the at-config entry.
11. Debit. Free route: `perform public.discovery_allowance(p_account_id, p_organization_id,
    'debit', v_credits)`. Fuel route: nothing today. The line `-- fuel consumption row: the Stripe
    fuel top-up requirement writes it here` marks the fill-in.
12. Persist. One `insert ... on conflict (project_id) do update` that appends the user message
    and the assistant reply to `messages`, appends the turn entry to `turns`, sets
    `turn_count = turn_count + 1`, `updated_at = clock_timestamp()`, and pins `settings` on the
    first turn. Steps 11 and 12 are one transaction, so `spent` moved if and only if the entry
    exists.

`open` returns `{ conversation: <row as jsonb>, route: 'free' | 'fuel', remaining: int | null,
settings: jsonb }`. `settle` returns `{ conversation, turn: <entry>, reply: text, remaining }`.

Both phases take the UTC day from `clock_timestamp()` after the organisation lock, as the
allowance does. The turn entry's `utc_day` is the day the `debit` used, read back from the
allowance's return value, so the entry and the spend row always name the same day.

**`public.set_organization_discovery(p_account_id uuid, p_organization_id uuid, p_action text, p_note text) returns jsonb`**
copies `set_organization_vetting`: `assert_account_active`, `account_type <> 'platform_admin'`
refuses `not-a-platform-admin`, action `disable` or `enable`, non-blank note, organisation
`for update`, set `discovery_disabled_at = clock_timestamp()` or `null`, `changed = false` when
already in that state, then `append_audit_event('org_discovery_switched', p_account_id, null,
p_organization_id, v_note, jsonb_build_object('action', ..., 'previous_disabled', ...,
'disabled_at', ...))`. Returns `{ organization_id, discovery_disabled, changed }`. No
notification: no taxonomy row fits an admin switch, so the NGO notice is a "Not done here" line.

**`public.viewer_discovery_allowance(p_organization_id uuid) returns jsonb`**, security definer,
`search_path = ''`, granted to `authenticated`, added to `VIEWER_FUNCTIONS`. It refuses unless
`public.viewer_is_org_member(p_organization_id)`, then returns exactly what `discovery_allowance`
`read` returns, computed the same way (no row: grant of the current tier; row: high-water
grant). It writes nothing. It exists because `discovery_spend` is unreachable by client roles
and the transparency read must not go through a write route.

### Migrations

1. `20260920110000_audit_event_kind_discovery.sql`: `alter type public.audit_event_kind add value 'org_discovery_switched';`
2. `20260920120000_discovery_conversation.sql`: the table, the column, `project_fuel_route`,
   the replaced `discovery_allowance`, `discovery_turn`, `set_organization_discovery`,
   `viewer_discovery_allowance`, grants, `notify pgrst, 'reload schema'`.

### Routes

| Route | Kind | Inventory row | RPC | Admits |
|---|---|---|---|---|
| `discovery-message` | write, promoted from stand-in | `surface: { kind: 'edge', rpc: 'discovery_turn' }` | `discovery_turn` | `['ngo']` |
| `set-organization-discovery` | write, new | `surface: { kind: 'edge', rpc: 'set_organization_discovery' }` | `set_organization_discovery` | `['platform_admin']` |
| `discovery-conversation` | read, new | none (a read function, like `need-intake`) | none | caller's JWT |

Each write route gets `[functions.<name>] verify_jwt = true` in `supabase/config.toml`; the read
function too.

**`POST /functions/v1/discovery-message`**
Request: `{ organizationId, projectId, message, afterTurn? }`.
Response 200: `{ ok: true, reply: string, turn: TurnEntry, conversation: ConversationView, remaining: number | null }`.
Refusals: 400 `invalid-request` (shape), 403 `not-an-ngo-account` / `not-a-member` /
`not-an-admin`, 409 with `kind` in `email-unverified`, `discovery-disabled`,
`need-not-in-discovery`, `fuel-exhausted`, `daily-allowance-exhausted`,
`debit-exceeds-remaining`, `turn-exceeds-remaining`, `stale-conversation`; 502 when the model
call fails (edgeHandler's shaped refusal, kind absent).

Gate order end to end: account active (TS gate and SQL), account type `ngo` (TS gate), org admin
(TS `orgAdminActionAllowed` and SQL), email verified (SQL only, step 4), kill switch (SQL, step
5), need in discovery (SQL), funding route (SQL, step 7), allowance preflight (SQL, step 8, with
the worst-case credits the edge computed), model call (edge, Deno-only file), settle (SQL, steps
1 to 12 again with the actual cost), persist (inside settle).

**`POST /functions/v1/set-organization-discovery`**
Request: `{ organizationId, action: 'disable' | 'enable', note }`. Response 200:
`{ ok: true, organizationId, discoveryDisabled, changed }`.

**`POST /functions/v1/discovery-conversation`**
Request: `{ projectId }`. Response 200: `{ ok: true, conversation: ConversationView, allowance: Allowance }`.
`conversation` is the row through RLS (`callerReads.conversation(projectId)`); `allowance` is
`viewer_discovery_allowance(org_id)` through a new `callerReads.discoveryAllowance(orgId)` in
`edge.ts`, a POST to `/rest/v1/rpc/viewer_discovery_allowance` with the caller's JWT. 404 when
the caller cannot see the need. A need in discovery with no conversation yet answers an empty
conversation with `turnCount: 0`, so the screen has one shape before and after the first turn.

### The write frame grows one optional step

`write-routes.ts` (pure):

```ts
export type WriteRouteAct<Args, Settle> = {
  /** the second RPC; today always the same function as `surface.rpc`, called with a settle phase */
  readonly rpc: string;
  /** runs between the two RPCs; returns the settle arguments, or a refusal */
  readonly perform: (opened: unknown, args: Args) => Promise<WriteRouteDecision<Settle>>;
};
export type WriteRouteSpec<Args, Input, Settle = never> = {
  ...existing members...
  readonly act?: WriteRouteAct<Args, Settle>;
};
```

`edge.ts` `writeRoute`: after the first `callDatabaseFunction` succeeds, if `spec.act` exists,
`await spec.act.perform(outcome.value, decision.args)`; a refusal answers as a decision refusal
does; otherwise `callDatabaseFunction(spec.act.rpc, settle.args)` and render that. Nothing
changes for a route without `act`. The `perform` for Discovery is built in the Deno-only client
file, so `index.ts` stays one statement:

```ts
Deno.serve(writeRoute({ name: 'discovery-message', target: organizationIdField, decide: decideDiscoveryTurn,
  act: discoveryTurnAct(anthropicMessagesPort()), render: renderDiscoveryTurn }));
```

### `_shared` modules and exported signatures

**`discovery-turn.ts`** (pure)
- `export type DiscoveryTurnArgs = { p_account_id; p_organization_id; p_project_id; p_phase: 'open'; p_payload: { message: string; after_turn: number | null; needed_credits: number } }`
- `export type DiscoveryTurnSettleArgs = { ...; p_phase: 'settle'; p_payload: { message; after_turn; reply; usage: Usage; cost_nano_usd: number; model_id: string; settings: RequestSettings } }`
- `export function decideDiscoveryTurn(input: AccountWriteRouteInput): WriteRouteDecision<DiscoveryTurnArgs>`.
  Target org, `orgAdminActionAllowed`, `projectId` uuid, `message` non-empty and at most
  `DISCOVERY_MESSAGE_MAX_CHARS`, `afterTurn` integer or absent. `needed_credits` is
  `creditsFor(worstCaseTurnCostNanoUsd(boundInputTokens(message), DISCOVERY_REQUEST_SETTINGS))`
  where `boundInputTokens` is the message's character count (one token per character is the
  bound the edge refines with a real count at `perform`). It does not check email: SQL owns that.
- `export function discoveryTurnAct(port: MessagesPort): WriteRouteAct<DiscoveryTurnArgs, DiscoveryTurnSettleArgs>`.
  Pure over the port. Reads the opened conversation, builds the request with
  `buildTurnRequest`, calls `port.countTokens`, computes `needed = creditsFor(worstCaseTurnCostNanoUsd(inputTokens, settings))`;
  if `opened.route === 'free'` and `needed > opened.remaining`, refuses
  `turn-exceeds-remaining` 409 with `turnExceedsRemainingReason(org, remaining, needed)`.
  Otherwise `port.createMessage`, then returns settle args with `cost_nano_usd = providerCostNanoUsd(answer.usage)`.
- `export function renderDiscoveryTurn(value: unknown): { reply; turn: TurnEntry; conversation: ConversationView; remaining: number | null }`.
- `export type TurnEntry`, `export type ConversationMessage`, `export type ConversationView = { projectId; organizationId; messages; turns; turnCount; settings; startedAt; updatedAt }`.
- `export function conversationViewFromSql(row: unknown): ConversationView` (throws on a bad shape).
- `export function emptyConversationView(projectId, organizationId): ConversationView`.
- Sentences, one home each, SQL raises the same words: `discoveryDisabledReason(organizationId)`,
  `fuelExhaustedReason(projectId)`, `needNotInDiscoveryReason(projectId)`,
  `staleConversationReason(projectId, turnCount)`, `turnExceedsRemainingReason(organizationId, remaining, needed)`
  (TypeScript only; SQL never raises it).
- `export const DISCOVERY_MESSAGE_MAX_CHARS = 4000`.

**`discovery-metering.ts`** (pure)
- `export type Usage = { input_tokens; output_tokens; cache_read_input_tokens; cache_creation_input_tokens }`.
- `export const TOKEN_PRICE_NANO_USD = { input: 5_000, output: 25_000, cache_read: 500, cache_creation: 6_250 } as const`
  (Claude Opus 5 list prices: 5 and 25 dollars per million tokens, cache read at a tenth, cache
  write at 1.25 times input).
- `export function providerCostNanoUsd(usage: Usage): number`.
- `export const DISCOVERY_NANO_USD_PER_CREDIT = 100_000_000` (ten cents, provisional).
- `export function creditsFor(costNanoUsd: number): number` = `max(1, ceil(cost / ratio))`.
- `export function worstCaseTurnCostNanoUsd(inputTokens: number, settings: RequestSettings): number`
  = `inputTokens * input + settings.max_tokens * output`.
- `export type FuelRoute = 'free' | 'fuel' | 'fuel_exhausted'`; `export type BillingTarget = 'free' | 'fuel'`.
- `export function billingTargetFor(route: FuelRoute): BillingTarget | { refused: 'fuel-exhausted' }`.
  The pure routing function. SQL step 7 is its twin; `fuelRoutePinProblems` pins the two.

**`discovery-model.ts`** (pure)
- `export type RequestSettings = { model_id: string; max_tokens: number; effort: 'low' | 'medium' | 'high' }`.
- `export const DISCOVERY_REQUEST_SETTINGS: RequestSettings = { model_id: 'claude-opus-5', max_tokens: 1024, effort: 'medium' }`.
  The value of `model_id` is the founder's to confirm at the unit 4 gate; the tree pins only
  "Claude Opus". The settings object has no funding input, which is how funding cannot change
  it.
- `export const DISCOVERY_SYSTEM_PROMPT: string` in `discovery-copy.ts`.
- `export type DiscoveryModelRequest = { model: string; max_tokens: number; system: string; messages: { role; content }[]; output_config: { effort } }`.
- `export type DiscoveryModelAnswer = { text: string; usage: Usage; stop_reason: string }`.
- `export type MessagesPort = { createMessage(request: DiscoveryModelRequest): Promise<DiscoveryModelAnswer>; countTokens(request: Omit<DiscoveryModelRequest, 'max_tokens'>): Promise<number> }`.
- `export function buildTurnRequest(history: ConversationMessage[], message: string, settings: RequestSettings): DiscoveryModelRequest`.

**`anthropic-messages.ts`** (Deno-only, imported by `discovery-message/index.ts` and no test)
- `export function anthropicMessagesPort(): MessagesPort`. `fetch` against
  `https://api.anthropic.com/v1/messages` and `/v1/messages/count_tokens`, headers
  `x-api-key: requireEnv('ANTHROPIC_API_KEY')`, `anthropic-version: 2023-06-01`,
  `content-type: application/json`. The key is read at first call, not at module load, so the
  function boots without it. A non-2xx answer throws with the status and the body's `error.message`,
  which `edgeHandler` turns into a 502.

`.env.example` gains `ANTHROPIC_API_KEY=` with the standing comment. `childEnv` already drops it.

**`write-routes.ts`**: the promoted row, the new row, `WriteRouteAct`, and five kinds appended
to `WRITE_REFUSAL_KINDS`: `discovery-disabled`, `need-not-in-discovery`, `fuel-exhausted`,
`turn-exceeds-remaining`, `stale-conversation`.

**`org-discovery.ts`** (pure): `decideOrganizationDiscovery(input): WriteRouteDecision<OrganizationDiscoveryArgs>`
(`action` in `disable | enable`, non-blank `note`), `renderOrganizationDiscovery`.

**`edge.ts`**: the `act` step in `writeRoute`; `callerReads` gains
`conversation(projectId)` (REST GET on `discovery_conversations`) and
`discoveryAllowance(organizationId)` (RPC as the caller).

### The loop-tier stand-in

`tests/at/harness/vendors.ts` gains `createAnthropicMessagesSim(): AnthropicMessagesStandIn`.

```ts
export type AnthropicMessagesPort = MessagesPort;               // the SUT face, the product type
export type AnthropicMessagesStandIn = { sim: AnthropicMessagesSim; port: AnthropicMessagesPort };
```

`tests/at/harness/contracts.ts` gains the test face and the vendor slot:

```ts
export type ScriptedTurn = { reply: string; usage: Usage; inputTokens?: number; stopReason?: string };
export type AnthropicMessagesSim = {
  /** the next N createMessage calls answer these, in order; an unscripted call throws */
  script(turns: readonly ScriptedTurn[]): void;
  /** the next N createMessage calls throw a provider error */
  refuseNext(count: number): void;
  /** EVERY request that reached the seam, in order: the out-of-band trace */
  requests(): DiscoveryModelRequest[];
  countRequests(): number;
};
export type Vendors<Channel extends string = string> = { email: EmailProviderSim<Channel>; anthropic: AnthropicMessagesSim };
```

`createHarness` at loop builds both sims and hands `{ email: email.port, anthropic: anthropic.port }`
to the adapter factory. At integration the refusing Proxy names the member it was asked for
(`vendors.anthropic`), and `TierHarness` still omits `vendors`.

The port hides the script: `createMessage` returns text and usage and nothing else. `countTokens`
returns `inputTokens` from the next scripted turn when given, else a deterministic count
(characters divided by four) so the preflight bound is reproducible. An unscripted call throws,
which is the same posture as an unknown fault point: a test cannot get a reply it did not arm.

How AT-004.02 injects cost: the test scripts `usage`, the SUT computes cost from usage with the
shipped price table, credits from cost with the shipped ratio. The test asserts proportionality
from the turn entries it reads back, and reads the ratio from `h.config`.

How a five-to-ten-turn conversation is replayed: `SHELTER_SCRIPT` in
`tests/at/suites/req-004/_script-shelter.ts` is an array of `{ ngoSays, reply, usage }` for a
seven-turn conversation about a shelter bed tracker; the test scripts the replies and sends the
NGO lines. The last reply is the scope draft the oracle judges.

### The fixture-specific oracle for AT-004.10

`tests/at/suites/req-004/_oracle-shelter.ts` exports `shelterScopeProblems(transcript: ConversationView, requests: DiscoveryModelRequest[]): string[]`.
It returns a problem list, empty when the run passes, and throws when the transcript is empty.
It checks:

1. `turnCount` between 5 and 10.
2. Every request's `messages` equals the stored messages before that turn plus the new user line
   (full prior context every turn, including after the resume in the middle of the script).
3. Every request's `system` is `DISCOVERY_SYSTEM_PROMPT` and every request's `model` and
   `max_tokens` equal `DISCOVERY_REQUEST_SETTINGS`.
4. The final reply carries the fixture's required facts: the bed count the NGO gave, the
   check-in actor, the "no medical data" statement, at least three user stories each followed by
   at least one acceptance line, and a complexity tier word. Each is a literal or a regex over
   the fixture's own facts, not a generic non-empty check.
5. A mutated transcript (bed count changed, a story without acceptance lines) fails; the oracle's
   own selftest `_oracle-shelter.selftest.ts` proves both directions.

What loop green on AT-004.10 means, said plainly: the send route carries the whole context every
turn, persists every exchange, stays within the turn bound, and the oracle discriminates a
correct scope from a wrong one. It says nothing about Claude Opus. The model's quality is the
integration tier's claim, and the integration body throws `CapabilityPending(['vendors.anthropic'])`
until a credential path for a developer machine exists. That name is new; no existing name fits.

### The suite

`tests/at/suites/req-004/`:

- `_bind.ts`: `bindSuite({ requirement: 'req-004', sut: 'discovery' })`.
- `_contract.ts`: `DiscoverySut` (below), types imported from the shipped modules.
- `_fixture.ts`: `requirement = 'req-004' as const`; wraps the intake fixture; drives
  `writePipeline` with `decideDiscoveryTurn` and `decideOrganizationDiscovery`; runs
  `discoveryTurnAct(vendors.anthropic)` between an in-memory `open` and `settle` that mirror the
  definer over Maps; the free debit goes through the intake fixture's inner allowance debit so
  `discovery_spend` has one fixture writer too; a `fuelRoutes: Map<projectId, FuelRoute>`.
- `_live.ts`: `requirement = 'req-004' as const`; posts to the three functions; operator SQL for
  `attemptTurnDefinerAsOperator`, `setProjectFuelRouteAsOperator` (throws
  `CapabilityPending(['checkout.project-fuel'])`: there is no state to set), `spendReconciliation`,
  `discoverySwitchAuditEvents`, `conversationRow`.
- `_pending.ts`: `AWAITED = { discoverySurface: 'ui.discovery-surface', projectFuel: 'checkout.project-fuel', fundedTurn: 'billing.funded-turn', anthropic: 'vendors.anthropic', ... }` plus the names the thirty-eight later ids need (`ui.discovery-surface`, `discovery.guardrails`, `discovery.scope-output`, `discovery.sensitivity-tiers`, `discovery.fit-decline`, `discovery.regeneration`, `storage.reference-upload`, `triage.queue`, `checkout.project-fuel`).
- `_source-pins.ts`: `ratioPinProblems` (SQL literal in `discovery_turn`, `DISCOVERY_NANO_USD_PER_CREDIT`, `AT_CONFIG.discoveryNanoUsdPerCredit`), `fuelRoutePinProblems` (the SQL `case` arms in step 7 against `billingTargetFor`), `turnSentenceProblems` (the four SQL raises against the TypeScript sentences).
- `_source-absences.ts`: `supplementalGrantProblems`, `platformBreakerProblems` (below).
- `_script-shelter.ts`, `_oracle-shelter.ts`, `_oracle-shelter.selftest.ts`.
- Test files, one `atTest` per P0 id, fifty-eight call sites:
  `a-metering.test.ts` (.01, .02, .08, .47, .49), `b-routing.test.ts` (.04, .05, .06, .48, .09),
  `c-remedies.test.ts` (.03a, .03b), `d-conversation.test.ts` (.10, .11),
  `e-guardrails.test.ts` (.41 to .45), `f-transparency.test.ts` (.46),
  `z-later-units.test.ts` (the thirty-eight pending ids, each `{ default: awaiting(...) }`).
- `tests/at/expected/req-004.json`, authored before the first run.

`DiscoverySut` members (type aliases, judgement types from the shipped modules):

```ts
provisionNgo, provisionPlatformAdmin, signInAgain, readAllowance, writeSpendRowAsOperator, spendRows,
attachReferenceFile, setVettingAsOperator                       // reused through the inner adapters
startDiscovery(session, organizationId, title): Promise<{ projectId }>   // start + submit through project-need
sendTurn(session, request: { organizationId; projectId; message; afterTurn? }): Promise<TurnOutcome>
readConversation(session, projectId): Promise<TenantReadOutcome<{ ok: true; conversation: ConversationView; allowance: Allowance }>>
conversationRow(projectId): Promise<ConversationView | null>
attemptTurnDefinerAsOperator(input: { accountId; organizationId; projectId; phase; payload }): Promise<{ ok: true; value: unknown } | { ok: false; kind: WriteRefusalKind; reason }>
setProjectFuelRouteAsOperator(projectId, route: FuelRoute): Promise<void>
setDiscoverySwitch(session, request: { organizationId; action; note }): Promise<SwitchOutcome>
discoverySwitchAuditEvents(organizationId): Promise<AuditRow[]>
spendReconciliation(organizationId): Promise<{ utcDay; spent; turnCredits }[]>
```

The static arms are called directly from test bodies, as the NGO profile suite does.

### The two absence arms

`supplementalGrantProblems()` throws when it finds no migration defining `discovery_spend`, and
otherwise sweeps route folders, the inventory and its RPC names, `_shared` module names, SQL
function and table names, and quoted strings for a name that combines `discovery` or `credit`
or `allowance` or `grant` with `admin`, `bonus`, `extra`, `supplement`, `top`, `add`, `raise` or
`adjust`, and any SQL statement outside `apply_discovery_grant_mark` and `discovery_daily_grant`
that writes `discovery_spend.granted`. The vet raise is the one path that moves `granted`, and
it moves it to a tier grant, never to a number a caller supplies; the arm checks that
`apply_discovery_grant_mark` is called only with `public.discovery_daily_grant(...)` as its
value. AT-004.43 asserts `toEqual([])`.

`platformBreakerProblems()` throws when it finds no `discovery_turn` definition, and otherwise
sweeps the same surfaces plus cron and trigger statements for `breaker`, `circuit`, `global cap`,
`platform cap`, `platform limit`, `kill all`, `pause all`, `discovery_paused`, and any
`discovery_turn` read of a table that is not keyed by organisation or project. The per-NGO
switch is on `organizations` and keyed by `id`, so it passes. AT-004.44 asserts `toEqual([])`.

### The expected file

```json
{ "requirement": "004", "tiers": {
  "loop": { "green": [ "AT-004.01", "AT-004.02", "AT-004.03a", "AT-004.03b", "AT-004.04", "AT-004.05", "AT-004.06", "AT-004.08", "AT-004.09", "AT-004.10", "AT-004.11", "AT-004.41", "AT-004.42", "AT-004.43", "AT-004.44", "AT-004.46", "AT-004.47", "AT-004.48", "AT-004.49" ],
    "red": { "AT-004.45": { "kind": "capability-pending", "capabilities": ["checkout.project-fuel"] }, "...38 later ids...": {} } },
  "integration": { "green": [ "AT-004.01", "AT-004.08", "AT-004.11", "AT-004.41", "AT-004.42", "AT-004.43", "AT-004.44", "AT-004.47", "AT-004.49" ],
    "red": {
      "AT-004.02": { "kind": "capability-pending", "capabilities": ["ui.discovery-surface"] },
      "AT-004.03a": { "kind": "capability-pending", "capabilities": ["ui.discovery-surface"] },
      "AT-004.03b": { "kind": "capability-pending", "capabilities": ["ui.discovery-surface"] },
      "AT-004.04": { "kind": "capability-pending", "capabilities": ["checkout.project-fuel", "billing.funded-turn"] },
      "AT-004.05": { "kind": "capability-pending", "capabilities": ["checkout.project-fuel", "billing.funded-turn"] },
      "AT-004.06": { "kind": "capability-pending", "capabilities": ["checkout.project-fuel", "billing.funded-turn"] },
      "AT-004.48": { "kind": "capability-pending", "capabilities": ["checkout.project-fuel", "billing.funded-turn"] },
      "AT-004.09": { "kind": "capability-pending", "capabilities": ["checkout.project-fuel"] },
      "AT-004.10": { "kind": "capability-pending", "capabilities": ["vendors.anthropic"] },
      "AT-004.45": { "kind": "capability-pending", "capabilities": ["checkout.project-fuel"] },
      "AT-004.46": { "kind": "capability-pending", "capabilities": ["ui.discovery-surface"] },
      "...38 later ids...": {} } } } }
```

Of the twenty: nineteen green at loop, nine green at integration.

### The decisions, one paragraph each

**The turn record.** A turn's provider cost, usage, credits, billing target, model id, request
settings, UTC day and instant live in one jsonb entry appended to `discovery_conversations.turns`,
under the project the conversation belongs to. The `discovery_spend` row moves only inside
`discovery_allowance('debit')`, and the product's only caller of that debit is `discovery_turn`
step 11, which appends the entry in step 12 of the same transaction. So a free-route entry
exists if and only if `spent` moved by its `credits`. The invariant for AT-004.46 is the query
in Usage, unit 6: for each spend row, `spent` equals the sum of `credits` over the
organisation's free entries on that day. The other writer of `spent`, the `debit` action of the
`discovery-allowance` route, is reachable only by the NGO profile suite, which exercises it as a
contract; no product code calls it. That is a second writer in principle and the section
Tradeoffs says so.

**The ratio and the rounding rule.** A turn learns its provider cost from the model answer's
`usage`, priced with the shipped table `TOKEN_PRICE_NANO_USD` (list prices for Claude Opus 5),
so the stand-in controls cost by controlling usage and nothing is injected past the seam. The
ratio is one nano-dollar count per credit, `DISCOVERY_NANO_USD_PER_CREDIT` in TypeScript, the
literal in `discovery_turn` step 10, and `AT_CONFIG.discoveryNanoUsdPerCredit` under the dotted
key `req-004.discovery.nano_usd_per_credit`, pinned by `ratioPinProblems`. The rounding rule is
`credits = max(1, ceil(cost / ratio))`: the platform never under-bills and a turn is never free.
An underfunded turn is refused before it runs: `open` preflights the worst case from the message
length, and `perform` preflights again with the provider's token count, so the bound is
`input_tokens × input price + max_tokens × output price` with both terms exact. Output cannot
exceed `max_tokens`; cache reads only lower the input term. So actual cost cannot exceed the
preflight bound while the price table is right, and `settle` proves it anyway: the debit refuses
`debit-exceeds-remaining` and the transaction rolls back, nothing charged and nothing persisted.
That case means the price table is stale, which the reconciliation makes visible.

**The funding seam.** Funding state is `project_fuel_route(project_id)`, a SQL function whose
body is a constant today. At loop the fixture holds `fuelRoutes: Map<projectId, FuelRoute>` and
`setProjectFuelRouteAsOperator` sets it. At integration nobody can set it, and
`setProjectFuelRouteAsOperator` throws `CapabilityPending(['checkout.project-fuel'])`. The pure
routing function is `billingTargetFor(route: FuelRoute): 'free' | 'fuel' | { refused: 'fuel-exhausted' }`.
AT-004.04, .05, .06 and .48 are green at loop and pending at integration on
`checkout.project-fuel, billing.funded-turn`. AT-004.09 is green at loop (the stand-in's
request trace shows identical `model`, `max_tokens` and `effort` on the free turn and the fuel
turn, and the allowance is unchanged) and pending at integration on `checkout.project-fuel`.
The Stripe run replaces the body of `project_fuel_route`, writes its consumption row at the
marked line in step 11, replaces the fixture map with its own fuel ledger, and deletes the
`CapabilityPending` in `_live.ts`. Nothing else changes.

**The send route.** The `discovery-message` stand-in row is promoted: `surface` becomes
`{ kind: 'edge', rpc: 'discovery_turn' }` and `admits` narrows to `['ngo']`. Request
`{ organizationId, projectId, message, afterTurn? }`, response above. Gates: account active and
type in the TypeScript gate; org admin in TypeScript and SQL; email, kill switch, need stage,
funding route, allowance preflight, settle and persist in SQL; the model call in the edge
between the two phases through the new `act` step. The email refusal has one HTTP shape: 409,
`kind: 'email-unverified'`, sentence `emailUnverifiedReason`, the shape the allowance already
uses and AT-002.22 already proves.

**The conversation store.** `discovery_conversations`, one row per need, keyed by `project_id`,
which is also the `need_intakes` key, so a conversation exists only for a need, and step 6
requires the need at stage `discovery_in_progress`. Messages persist as the `messages` array,
two per settled turn, checked by a constraint. A new session resumes by reading the row through
`discovery-conversation` with its JWT and RLS, and the next `sendTurn` carries `afterTurn` so a
stale screen cannot append onto a history it has not seen. The audit table never sees a message:
the only audit event this run adds is `org_discovery_switched`, whose detail holds the action,
the previous state and the instant. The conversation is a tenant row, readable by its
organisation; an audit event is an operator record, unreachable by client roles. The decline
ops item of a later leaf references the conversation by `project_id` and does not copy it.

**The model client.** `supabase/functions/_shared/anthropic-messages.ts`, Deno-only, imported
by `discovery-message/index.ts` and by no test. Position: `fetch` against the Messages API and
the token-count endpoint, no `npm:` dependency. Reasons: the tree has no import map and no npm
resolution for edge functions; `edge.ts` already talks to Auth and PostgREST with `fetch`; the
request is one POST with a JSON body and the answer is one JSON object; no type-checker covers
the file either way. The key is `requireEnv('ANTHROPIC_API_KEY')` at first call. Request settings
are `DISCOVERY_REQUEST_SETTINGS`, a constant with no funding input, recorded on every turn entry
and pinned on the conversation at the first turn; AT-004.09 compares two entries and two traced
requests. Alternative: `npm:@anthropic-ai/sdk` in the same file. It gives typed streaming,
retries and the `finalMessage()` helper, and it is the right choice when the wiring leaf wants
server-sent streaming to the screen. Moving to it later changes one file and no contract,
because the port type is the product's, not the vendor's.

**The loop-tier stand-in and the oracle.** Described under Shape. The integration tier proves,
without a key: every gate refusal through the real function (email, switch, admin, need stage,
zero credits), the definer's metering and persistence as the operator with synthetic usage, the
resume read through RLS, both absence arms, and the reconciliation. It declares pending, on
`vendors.anthropic`, the one id whose claim is about the model, AT-004.10.

**The kill switch.** State: `organizations.discovery_disabled_at timestamptz`. Route
`set-organization-discovery`, request `{ organizationId, action, note }`, definer
`set_organization_discovery`, refusal kinds `not-a-platform-admin`, `invalid-request`,
`no-such-organisation`. Audit event `org_discovery_switched`, with its own enum migration. The
send route reads the column in `discovery_turn` step 5 under the organisation row lock at both
phases; the admin definer takes the same row `for update`. A settle in flight finishes first and
the next open sees the switch; a switch that commits between an open and its settle refuses the
settle, so the NGO is not charged and the reply is not persisted. There is no cached read
anywhere. The NGO's screen reads `discovery_disabled_at` through the organisation dashboard
that already exists, so the wiring leaf can show the state without a new read.

**The transparency read.** `discovery-conversation`, a read function: the row through RLS and
`viewer_discovery_allowance` for remaining. The SQL that proves the invariant, run as the
operator by `spendReconciliation`:

```sql
with free_turns as (
  select c.org_id, (t->>'utc_day')::date as utc_day, (t->>'credits')::integer as credits
    from public.discovery_conversations c
    cross join lateral jsonb_array_elements(c.turns) as t
   where c.org_id = $1 and t->>'billed_to' = 'free'
)
select s.utc_day::text, s.spent, coalesce(sum(f.credits), 0)::integer as turn_credits
  from public.discovery_spend s
  left join free_turns f on f.org_id = s.org_id and f.utc_day = s.utc_day
 where s.org_id = $1
 group by s.utc_day, s.spent
 order by s.utc_day;
```

`spent` equals `turn_credits` on every row. A day change is a new row, never a delta on a
row, and `spent` never decreases because `discovery_allowance` only adds. Zero-cost actions
(attach) touch neither table.

**The red set.** Loop: AT-004.45 on `checkout.project-fuel` (the "outside the money ledger"
half has no money ledger to be outside of; the never-purchasable half is proven by the existing
`discoveryWalletProblems`, and the id stays red as AT-002.10 does). Integration: .02, .03a,
.03b, .46 on `ui.discovery-surface` (each Then says "shown to the NGO", and the tree declares
that half pending on the screen, as AT-002.05 does); .04, .05, .06, .48 on
`checkout.project-fuel, billing.funded-turn`; .09 on `checkout.project-fuel`; .10 on
`vendors.anthropic`; .45 on `checkout.project-fuel`. The thirty-eight ids of later runs are red
at both tiers on the names in `_pending.ts`.

**Lanes.** Units 1 and 4 to the hardest-tasks lane. Unit 1 writes `discovery_turn`, the
`preflight` arm, the metering module and the suite scaffold, and must still decide the jsonb
entry shape and the two-phase body in SQL. Unit 4 writes the `act` step in the frame, the client,
the stand-in and the oracle, which is the one-way door. Units 2, 3, 5 and 6 apply a fixed
contract from this document and go to the feature lane.

## Where jsonb on the row breaks

Size. A ten-turn conversation with a thousand characters per message is about thirty
kilobytes, TOASTed past two kilobytes, and every settle rewrites the whole row. At the turn
ceiling this is bounded and small. Without a ceiling, or when the decline ops item and
regeneration append onto the same row, the rewrite cost grows with the row, and Postgres keeps
a dead copy per turn until vacuum. The turn ceiling of a later leaf is the bound that keeps this
honest; the design counts on it.

Concurrency. Two sends on one conversation serialise on the row lock, and `afterTurn` refuses
the loser. Two sends on two projects of one organisation serialise on the organisation lock at
settle, which is what keeps the org-day sum right, and is a wider lock than a child table would
need: a child table could take a per-row insert and let the spend row's own `for update` do
the work. The cost is one queued settle per concurrent project of one NGO, which for a
single-seat organisation is nobody.

The delta invariant as a query. The reconciliation above is a lateral scan over every
conversation of the organisation and every entry of every `turns` array. There is no index on a
jsonb element, so it is O(conversations × turns) per organisation. For the suite and the
screen it is milliseconds. For a platform-wide audit it is a full scan of the table. A child
table `discovery_turns(project_id, turn, org_id, utc_day, billed_to, credits, ...)` with an
index on `(org_id, utc_day)` turns the same query into an index join, and the Stripe run's
consumption row would rather point at a turn row than at an array position. This is where the
direction breaks: the aggregate is right for the conversation, and the turn entries are the
part a later run will want to lift into a table. The lift is mechanical: one migration that
inserts from the arrays and one `insert` added to step 12; the array can then be dropped or kept
as a denormalised copy. The read contract does not change, because `ConversationView.turns` is
the same list either way.

## Tradeoffs accepted

- Two writers of `discovery_spend.spent` exist in the schema: `discovery_turn` through the
  debit, and the `discovery-allowance` route's `debit` action, which only the NGO profile suite
  calls. The invariant holds for every product path. Retiring the route's `debit` action means
  changing four NGO profile ids and is listed under Not done here.
- The preflight runs twice: a message-length bound in `decide` (so an obviously oversized turn
  is refused with no round trip) and a token-count bound in `perform`. Two bounds instead of one,
  for one fewer provider call on the common refusal.
- The token count is one more provider call per turn. It is what makes "spend never exceeds
  the remaining allowance" a bound instead of an estimate.
- The `act` step is a change to the write frame that no type-checker covers. It is one branch
  guarded by `spec.act`, and every existing route is unchanged. The verify skill's drive script
  is the evidence for it.
- The fuel route is a stub function whose body is a constant. Four ids are green at loop only
  through a fixture map, and they say so in the expected file.
- The sentence for the exceeds case at preflight is the allowance's own, which speaks of "this
  debit". The wiring leaf's copy layer maps kinds to screen text, so the sentence is not what the
  NGO reads.
- The kill switch drops an in-flight reply unbilled instead of persisting it and blocking the
  next turn. Immediate wins over complete.

## Alternatives considered

- A child `discovery_turns` table from the start. Better indexes and a cleaner join for the
  Stripe run. Rejected for this lane because it is the other lane's direction; kept as the named
  lift above.
- Cap instead of refuse: lower `max_tokens` to whatever the remaining credits can pay. Makes
  the last credit usable and adds a moving request setting, which is exactly what AT-004.09
  wants held still. Refuse is simpler and AT-004.49 accepts it.
- Charge a worst-case reservation at open and settle the difference. Two ledger writes per
  turn and a reservation state to reconcile on crash. The token count gives the same bound with
  one write.
- Email in the TypeScript gate through a `Caller.emailVerified` read off `/auth/v1/user`. One
  more field on a type three suites import, for a refusal SQL already makes. Rejected.
- A separate `set-organization-discovery` table instead of a column. A table with one boolean
  and one timestamp per organisation, for a state the organisation dashboard would then have to
  join. The column is enough and the audit event keeps the history.
- Extending the existing `need-intake` read with the conversation. Mixes a draft surface with a
  chat surface, and the screen needs the allowance beside the conversation, not beside the
  draft. One read for the screen is the smaller interface.
- Emitting a notification on the kill switch. No taxonomy row fits; adding one is forbidden.
  Not done here.

## Open questions and risks

1. The model id value. `claude-opus-5` is written into the constant; the founder confirms or
   changes it at the unit 4 gate. The price table follows the id.
2. The ratio value. Ten cents per credit is provisional and marked so in `AT_CONFIG`. With
   ten credits a day and the pinned request settings, an unverified NGO gets roughly ten turns
   a day. The founder pins the figure.
3. `bun run typecheck` does not cover `edge.ts` or the client file. The `act` branch and the
   `fetch` client are proven by serving them and by the verify skill's new feature file
   `discovery-message.md`, which drives the route to the email refusal and the switch refusal
   without a key, and to a real turn only when the developer's `.env.local` carries one.
4. The NGO profile suite's `writeSpendRowAsOperator` upserts today's row when the day is today.
   Nothing here changes that, and the reconciliation query is only run in this suite's own
   worlds.
5. The auth suite's expected file: AT-001.10, .29 and .30 are red at integration on
   `sut.accounts.sendDiscoveryMessage`. After the promotion that name is wrong. The req-001 live
   adapter throws `CapabilityPending(['vendors.anthropic'])` instead, because AT-001.10's control
   half needs a successful send, which needs the model; the three entries move to that name in
   `req-001.json`. The req-001 loop fixture's `DISCOVERY_MESSAGE` spec takes
   `decideDiscoveryTurn`, supplies the NGO's own organisation and a fixture project, and refuses
   an unverified caller in its commit with `emailUnverifiedReason`, whose words match the body's
   `/verif/i` and `/email/i`. Both changes ride in unit 4.
6. `write_standing` carries no email flag and no switch flag, and this design does not add
   either. Both refusals cost one RPC round trip that could have been refused in TypeScript.
   Accepted: the SQL check is the one that cannot be bypassed.
7. A `discovery_spend` trigger refusing `new.spent < old.spent` would make "never silently
   removed" structural rather than a property of the one writer. It is not in this design
   because the NGO profile suite's operator upsert could trip it on a same-day rewrite; a
   reader who confirms no body does that can add it in unit 6.
8. The reconciliation depends on `utc_day` in the entry matching the day the debit used. Step
   11 reads the day back from the debit's return value, so a midnight between open and settle
   charges and records the same day.

## Next implementation step

Unit 1: write migration 2 with the table, the `preflight` arm, `project_fuel_route` and
`discovery_turn`; write `discovery-metering.ts` and `discovery-turn.ts` with the sentences;
scaffold the suite with `_bind`, `_contract`, `_fixture`, `_live`, `_pending`, the fifty-eight
call sites and `req-004.json`; register `req-004` in `AdapterModules`; add the `AT_CONFIG` entry
and the dotted key; add the catalog row. Drive the definer as the operator at integration for
.01, .08, .47, .49; drive the fixture with a scripted port for .02. The model client and the
route's `act` wait for unit 4; until then `discovery-message` stays a stand-in row and unit 1's
loop fixture calls `open` and `settle` around a scripted answer directly.

## Synthesis decision

(empty)

## Per-unit plan

### Unit 1: allowance metering
Files: `supabase/migrations/20260920120000_discovery_conversation.sql` (table, catalog posture,
`project_fuel_route` stub, `discovery_allowance` with `preflight`, `discovery_turn`);
`supabase/functions/_shared/discovery-metering.ts`, `discovery-turn.ts`;
`tests/at/harness/atconfig.ts` (`discoveryNanoUsdPerCredit`), `config.ts` (dotted key),
`suite-adapters.ts`; `tests/at/suites/req-001/_policy-scan.ts` (catalog row);
`tests/at/suites/req-004/_bind.ts`, `_contract.ts`, `_fixture.ts`, `_live.ts`, `_pending.ts`,
`_source-pins.ts`, `a-metering.test.ts`, `z-later-units.test.ts`; `tests/at/expected/req-004.json`.
Ids: .01, .02, .08, .47, .49. Loop: all green. Integration: .01, .08, .47, .49 green;
.02 red on `ui.discovery-surface`. Lane: hardest tasks.

### Unit 2: funded routing
Files: `discovery-metering.ts` (`billingTargetFor`, `FuelRoute`); `_fixture.ts` (fuel route
map), `_live.ts` (pending seam), `_source-pins.ts` (`fuelRoutePinProblems`),
`b-routing.test.ts`; `write-routes.ts` (`fuel-exhausted` kind); the migration's step 7 already
written in unit 1.
Ids: .04, .05, .06, .48, .09. Loop: all green. Integration: .04, .05, .06, .48 red on
`checkout.project-fuel, billing.funded-turn`; .09 red on `checkout.project-fuel`. Lane: feature.

### Unit 3: zero-credit remedies
Files: `c-remedies.test.ts`; no product change. The sentence is raised by `discovery_allowance`
from `discovery_turn` step 8, and `exhaustedSentenceProblems` already pins both arms.
Ids: .03a, .03b. Loop: green. Integration: red on `ui.discovery-surface`. Lane: feature.

### Unit 4: the conversation
Files: `write-routes.ts` (promoted row, `WriteRouteAct`, `stale-conversation`,
`need-not-in-discovery`, `discovery-disabled` kinds), `edge.ts` (`act` step, `callerReads`
additions), `discovery-model.ts`, `discovery-copy.ts`, `anthropic-messages.ts`,
`supabase/functions/discovery-message/index.ts`, `supabase/config.toml`, `.env.example`;
`tests/at/harness/contracts.ts`, `vendors.ts`, `index.ts`, `vendors.selftest.ts`;
`tests/at/suites/req-004/_script-shelter.ts`, `_oracle-shelter.ts`, `_oracle-shelter.selftest.ts`,
`d-conversation.test.ts`; `tests/at/suites/req-001/_fixture.ts`, `_live.ts`,
`tests/at/expected/req-001.json`; `.claude/skills/verify-ai4good/features/discovery-message.md`
and the README row. Founder gate before this unit: the client (fetch, alternative SDK) and the
model id.
Ids: .10, .11. Loop: green. Integration: .11 green; .10 red on `vendors.anthropic`. Lane:
hardest tasks.

### Unit 5: abuse guardrails
Files: `supabase/migrations/20260920110000_audit_event_kind_discovery.sql` (ordered before
migration 2, which uses the value); the column and `set_organization_discovery` in migration 2;
`org-discovery.ts`; `supabase/functions/set-organization-discovery/index.ts`; `config.toml`;
`write-routes.ts` row; `_source-absences.ts`; `e-guardrails.test.ts`; a verify feature file.
Ids: .41 to .45. Loop: .41 to .44 green, .45 red on `checkout.project-fuel`. Integration: same.
Lane: feature.

### Unit 6: transparency
Files: `viewer_discovery_allowance` in migration 2; `tests/at/suites/req-001/_integration.ts`
(`VIEWER_FUNCTIONS`); `supabase/functions/discovery-conversation/index.ts`; `config.toml`;
`edge.ts` `callerReads` (if not landed in unit 4); `_live.ts` and `_fixture.ts`
(`spendReconciliation`, `readConversation`); `f-transparency.test.ts`.
Ids: .46. Loop: green. Integration: red on `ui.discovery-surface`. Lane: feature.

### Counts
Migrations 2. Routes 3 (one promoted write, one new admin write, one read). Definers 2 new
(`discovery_turn`, `set_organization_discovery`), 1 replaced (`discovery_allowance`), 1 stub
(`project_fuel_route`), 1 viewer helper. `_shared` modules 5 new (`discovery-turn`,
`discovery-metering`, `discovery-model`, `discovery-copy`, `org-discovery`) plus the Deno-only
client, and edits to `write-routes.ts` and `edge.ts`. Stand-ins 1. Suite files 16 plus the
expected file, and 6 files touched in the harness and the auth suite.

### Not done here
- Retire the `debit` action of the `discovery-allowance` route once the NGO profile suite's
  four ids move to `discovery_turn`.
- The NGO notice on a kill switch: no taxonomy row fits.
- Lift `turns` into `discovery_turns` when the Stripe run needs a row to point at.
- Server-sent streaming of the reply, with the SDK client, when the wiring leaf asks for it.

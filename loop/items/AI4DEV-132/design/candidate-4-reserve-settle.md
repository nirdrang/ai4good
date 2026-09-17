# Candidate 4: two-phase turns, reserve then settle

One design for the six units of the credits engine run. Every turn is two database writes with the model call between them. The first write reserves credits for the worst case the turn can cost. The second write records what the turn did cost and gives the difference back. The reservation row is the turn record. Nothing else in the run needs a second ledger, a cron, or a fault seam.

## Problem

The tree holds a daily allowance ledger with one integer per organisation per UTC day and a definer that debits it. Nothing records a turn, calls a model, stores a conversation, routes a funded project to fuel, or switches Discovery off for one NGO. Twenty acceptance ids need those five things, and the ids are strict on three invariants: spend never exceeds the remaining allowance (AT-004.49), every negative delta of the allowance matches one visible turn record or the daily reset (AT-004.46), and a funded project never touches the free pool (AT-004.48).

A turn's cost is only known after the model answers. A design that charges after the call can overspend: two turns from two tabs both pass a preflight on the same remaining credits, and a crash after the model answered leaves a free turn with no record. A design that charges a flat estimate before the call and never refunds over-charges by the unused output cap on every turn, which at ten credits a day is a third of the day's grant. The reservation is the answer to both. It is taken under the row lock before the call, it bounds the call through `max_tokens`, and the settle returns the unused part. A crash between the two writes leaves an open reservation that the next turn on that project settles as abandoned, and the record of that is visible to the NGO.

The run must also honour the forty-four constraints in `loop/items/AI4DEV-132/how/explanation.md`. Two of them shape this design most: the sentence pin in `tests/at/suites/req-002/_source-pins.ts` scans only `public.discovery_allowance`, so the reserve reuses that definer's debit arm instead of copying its sentences; and the wallet scan in `tests/at/suites/req-002/_source-absences.ts` fires on any project-named table with a `state` or `status` column, so the funding seam is a `funded_at` timestamp and the switch is a `discovery_disabled_at` timestamp.

## Usage (caller's view)

The wiring leaf calls three things: the promoted `discovery-message` write route to send a turn, the new `discovery-conversation` read function to load the turns, and the existing `discovery-allowance` read to show remaining credits. A platform admin calls one route, `set-organization-discovery`. Everything else, metering, routing, gating, the reservation, the stand-in, sits behind those four.

The suite binds `bindSuite({ requirement: 'req-004', sut: 'discovery' })`. `sut` composes the intake SUT (`tests/at/suites/req-003/_contract.ts`), so an NGO, a need at `discovery_in_progress`, the allowance read, and the operator ledger writes are inherited. The six unit call sites below are the shape the test files take.

### Unit 1, metering (AT-004.01, .02, .08, .47, .49)

```ts
atTest('AT-004.02', 'each turn charges credits at the pinned ratio under ceiling rounding and records its cost', { surface: 'ui' }, {
  default: async ({ open, h }) => {
    const pins = createConfigRegistry();
    const microsPerCredit = pins.get<number>('req-004.discovery.micros_per_credit');
    const inPrice = pins.get<number>('req-004.discovery.input_micros_per_token');
    const outPrice = pins.get<number>('req-004.discovery.output_micros_per_token');
    const { w, sut } = await open();
    const ngo = await sut.provisionNgo(w.email('ngo-02'), { emailVerified: true });
    const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, GRANT_TRACKER.intake);
    const usages = [{ inputTokens: 900, outputTokens: 400 }, { inputTokens: 2600, outputTokens: 1100 }, { inputTokens: 5200, outputTokens: 40 }];
    h.vendors.anthropic.script(usages.map((usage, i) => ({ kind: 'text', text: `Question ${i + 1}?`, usage })));
    for (const [i, usage] of usages.entries()) {
      const before = await sut.readAllowance(ngo.session, ngo.organizationId);
      const sent = await sut.sendMessage(ngo.session, { organizationId: ngo.organizationId, projectId, message: GRANT_TRACKER.ngoMessages[i] });
      expect(sent.ok).toBe(true);
      if (!sent.ok || !before.ok) return;
      const micros = usage.inputTokens * inPrice + usage.outputTokens * outPrice;
      expect(sent.turn.chargedCredits).toBe(Math.min(sent.turn.reservedCredits, Math.ceil(micros / microsPerCredit)));
      expect(sent.turn.actualMicros).toBe(micros);
      expect(sent.allowance.remaining).toBe(before.allowance.remaining - sent.turn.chargedCredits);
    }
    const rows = await sut.turnRows(projectId);
    expect(rows.map((row) => row.chargedCredits)).toEqual(rows.map((row) => Math.min(row.reservedCredits, Math.ceil(row.actualMicros! / microsPerCredit))));
  },
  integration: async ({ open }) => {
    // operator-driven reserve and settle against the real definers, then the render half is declared
    ...
    throw new CapabilityPending([AWAITED.discoverySurface]);
  },
});
```

`AT-004.49` scripts a reply whose input tokens exceed the estimate, asserts `chargedCredits === reservedCredits`, `overrunMicros > 0`, `spentToday <= dailyGrant`, and that a reserve on one remaining credit either runs with a reduced `maxOutputTokens` or is refused `debit-exceeds-remaining`, never both. `AT-004.47` sends on two unfunded projects of one NGO and reads one ledger row. `AT-004.08` copies `proveUtcReset` through `writeSpendRowAsOperator` and asserts the day's turn list is empty after the reset. `AT-004.01` sends one turn as an unverified-tier NGO and one as a vetted NGO and reads `dailyGrant` from the pins.

### Unit 2, funded routing (AT-004.04, .05, .06, .48, .09)

```ts
atTest('AT-004.48', 'a funded project with no fuel is refused and never draws the free pool', {
  default: async ({ open }) => {
    const { w, sut } = await open();
    const ngo = await sut.provisionNgo(w.email('ngo-48'), { emailVerified: true });
    const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, GRANT_TRACKER.intake);
    await sut.setProjectFundingAsOperator(projectId, { fundedAt: new Date().toISOString(), fuelMicros: 0 });
    const before = await sut.readAllowance(ngo.session, ngo.organizationId);
    const refused = await sut.sendMessage(ngo.session, { organizationId: ngo.organizationId, projectId, message: 'Hello' });
    expect(refused).toMatchObject({ ok: false, kind: 'fuel-exhausted', status: 409 });
    if (refused.ok) return;
    expect(refused.reason).toMatch(/top up project fuel/i);
    const after = await sut.readAllowance(ngo.session, ngo.organizationId);
    expect(after).toEqual(before);
    expect(await sut.turnRows(projectId)).toEqual([]);
  },
  integration: /* the same through the deployed route; the refusal arrives before any model call */ ...,
});
```

`AT-004.05` funds project A with `fuelMicros: 5_000_000` at loop, sends on A and on B, and asserts A's turn has `billing: 'fuel'`, `reservedCredits: 0`, the sim's fuel ledger dropped by `actualMicros`, and the allowance dropped only by B's charge. `AT-004.06` sends one free turn, funds mid-conversation, and asserts the next turn is `billing: 'fuel'` and the one after that too. `AT-004.09` compares `requestSettings` on a free turn and a funded turn field by field, and reads the allowance before and after funding. At integration the four ids prove the refusal and the unchanged allowance, then end in `CapabilityPending(['checkout.project-fuel', 'billing.funded-turn'])` (`.09` on `checkout.project-fuel` alone).

### Unit 3, zero-credit remedies (AT-004.03a, .03b)

```ts
atTest('AT-004.03a', 'an unverified-tier NGO at zero credits is blocked with exactly three remedies', { surface: 'ui' }, {
  default: async ({ open }) => {
    const pins = createConfigRegistry();
    const vettedGrant = pins.get<number>('req-002.discovery.daily_credits.vetted');
    const { w, sut } = await open();
    const ngo = await sut.provisionNgo(w.email('ngo-03a'), { emailVerified: true });
    const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, GRANT_TRACKER.intake);
    await sut.drainAllowance(ngo.session, ngo.organizationId);
    const blocked = await sut.sendMessage(ngo.session, { organizationId: ngo.organizationId, projectId, message: 'Hello' });
    expect(blocked).toMatchObject({ ok: false, kind: 'daily-allowance-exhausted', status: 409 });
    if (blocked.ok) return;
    const remedies = remediesOf(blocked.reason);
    expect(remedies).toHaveLength(3);
    expect(remedies[0]).toMatch(new RegExp(`get vetted \\(daily grant becomes ${vettedGrant}\\)`));
    expect(remedies[1]).toMatch(/fund project fuel/i);
    expect(remedies[2]).toMatch(/wait for the next UTC day/i);
    expect(await sut.turnRows(projectId)).toEqual([]);
  },
  integration: async ({ open }) => { /* the same through the route, then */ throw new CapabilityPending([AWAITED.discoverySurface]); },
});
```

`remediesOf` splits the sentence after the em dash on `, ` and strips a leading `or `. `AT-004.03b` vets the NGO through the admin route first and asserts two remedies and no `get vetted`.

### Unit 4, the conversation (AT-004.10, .11)

```ts
atTest('AT-004.10', 'a recorded Opus elicitation over the grant-tracker intake satisfies its oracle', {
  default: async ({ open, h }) => {
    const { w, sut } = await open();
    const ngo = await sut.provisionNgo(w.email('ngo-10'), { emailVerified: true });
    const admin = await sut.provisionPlatformAdmin(w.email('admin-10'));
    await sut.vetOrganizationAsAdmin(admin, ngo.organizationId);
    const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, GRANT_TRACKER.intake);
    h.vendors.anthropic.script(GRANT_TRACKER.replies);
    let last: DiscoveryMessageOutcome | null = null;
    for (const message of GRANT_TRACKER.ngoMessages) {
      last = await sut.sendMessage(ngo.session, { organizationId: ngo.organizationId, projectId, message });
      expect(last.ok).toBe(true);
      if (!last.ok) return;
    }
    const rows = await sut.turnRows(projectId);
    expect(rows.length).toBeGreaterThanOrEqual(5);
    expect(rows.length).toBeLessThanOrEqual(10);
    expect(last!.ok && last!.turn.elicitation).not.toBeNull();
    expect(grantTrackerOracleProblems(rows.at(-1)!.elicitation!)).toEqual([]);
    const requests = h.vendors.anthropic.requests();
    requests.forEach((request, i) => expect(request.messages).toHaveLength(2 * i + 1));
    expect(requests.every((request) => request.system.includes(GRANT_TRACKER.intake.description))).toBe(true);
    expect(requests.every((request) => request.model === DISCOVERY_REQUEST_SETTINGS.model)).toBe(true);
  },
  integration: awaiting(AWAITED.anthropicLive),
});
```

`AT-004.11` sends three scripted turns, calls `signInAgain`, moves the ledger to the next day with `writeSpendRowAsOperator`, reads the conversation with the new session and asserts the three turns are equal to the rows, then sends a fourth and asserts the fourth request carries six prior messages. At integration the Given is `seedTurnsAsOperator`, the read is the deployed `discovery-conversation`, and the resume proof is `reserveTurnAsOperator` whose returned context carries the six prior messages, settled as failed afterwards.

### Unit 5, abuse guardrails (AT-004.41 to .45)

```ts
atTest('AT-004.42', 'a platform admin switches Discovery off for one NGO and the next message is blocked', async ({ open, h }) => {
  const { w, sut } = await open();
  const admin = await sut.provisionPlatformAdmin(w.email('admin-42'));
  const ngo = await sut.provisionNgo(w.email('ngo-42'), { emailVerified: true });
  const other = await sut.provisionNgo(w.email('ngo-42-other'), { emailVerified: true });
  const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, GRANT_TRACKER.intake);
  const off = await sut.setDiscoverySwitch(admin, { organizationId: ngo.organizationId, enabled: false, reason: 'abuse report 42' });
  expect(off).toMatchObject({ ok: true, discoveryEnabled: false, changed: true });
  const blocked = await sut.sendMessage(ngo.session, { organizationId: ngo.organizationId, projectId, message: 'Hello' });
  expect(blocked).toMatchObject({ ok: false, kind: 'discovery-disabled', status: 409 });
  expect(await sut.turnRows(projectId)).toEqual([]);
  expect((await sut.discoverySwitchAuditEvents(ngo.organizationId)).map((event) => event.detail.enabled)).toEqual([false]);
  // the other NGO is untouched, and the NGO itself is refused, never a platform admin
  expect(await sut.setDiscoverySwitch(ngo.session, { organizationId: ngo.organizationId, enabled: true, reason: 'x' })).toMatchObject({ ok: false, kind: 'not-a-platform-admin', status: 403 });
  ...
});
```

`AT-004.41` provisions an unverified NGO, submits a need, sends, asserts 409 `email-unverified` with a reason matching `/verif/i` and `/email/i`, no turn row and no ledger delta, then verifies the address as the operator and sends again. `AT-004.43` and `AT-004.44` assert `noSupplementalGrantPathProblems()` and `noPlatformBreakerProblems()` are empty at both tiers. `AT-004.45` asserts `discoveryWalletProblems()` and `freeCreditsOutsideMoneyProblems()` are empty, and at integration ends in `CapabilityPending(['checkout.project-fuel'])`.

### Unit 6, transparency (AT-004.46)

```ts
atTest('AT-004.46', 'remaining credits and every turn cost are readable, and every negative delta is one turn record or the reset', { surface: 'ui' }, {
  default: async ({ open, h }) => {
    ...
    const deltas: number[] = [];   // remaining after each observed step minus remaining before it
    // three scripted turns, one attach between them, one abandoned reservation via backdateOpenTurnAsOperator
    const negative = deltas.filter((delta) => delta < 0);
    const rows = await sut.turnRows(projectId);
    expect(negative.map((delta) => -delta).sort()).toEqual(rows.map((row) => row.reservedCredits).sort());
    expect(await sut.spendLedgerInvariantProblems(ngo.organizationId)).toEqual([]);
    const read = await sut.readConversation(ngo.session, projectId);
    expect(read.ok && read.value.conversation.turns.map((turn) => turn.chargedCredits)).toEqual(rows.map((row) => row.chargedCredits));
  },
  integration: async ({ open }) => { /* operator-driven turns, the SQL invariant query, the deployed read, then */ throw new CapabilityPending([AWAITED.discoverySurface]); },
});
```

## Shape

### Tables and columns

One new table, two columns on `projects`, three columns on `organizations`. The spend ledger is unchanged.

```sql
create type public.discovery_turn_status as enum ('open', 'settled', 'failed', 'abandoned');
create type public.discovery_billing as enum ('free', 'fuel');

create table public.discovery_turns (
  id                       uuid primary key default gen_random_uuid(),
  project_id               uuid not null,
  org_id                   uuid not null,
  seq                      integer not null,
  status                   public.discovery_turn_status not null default 'open',
  billing                  public.discovery_billing not null,
  utc_day                  date not null,
  user_message             text not null,
  assistant_message        text,
  elicitation              jsonb,
  request_settings         jsonb not null,
  max_output_tokens        integer not null,
  estimated_input_tokens   integer not null,
  micros_per_credit        integer not null,
  input_micros_per_token   integer not null,
  output_micros_per_token  integer not null,
  reserved_micros          bigint not null,
  reserved_credits         integer not null,
  input_tokens             integer,
  output_tokens            integer,
  stop_reason              text,
  served_model             text,
  actual_micros            bigint,
  charged_credits          integer,
  overrun_micros           bigint,
  opened_at                timestamptz not null,
  settled_at               timestamptz,
  foreign key (project_id, org_id) references public.projects (id, org_id) on delete cascade,
  unique (project_id, seq),
  constraint discovery_turns_open_iff_unsettled check ((status = 'open') = (settled_at is null)),
  constraint discovery_turns_reservation_is_the_bound check (
    reserved_micros = estimated_input_tokens * input_micros_per_token + max_output_tokens * output_micros_per_token),
  constraint discovery_turns_free_reserved_at_ratio check (
    billing <> 'free' or reserved_credits = ceil(reserved_micros::numeric / micros_per_credit)),
  constraint discovery_turns_fuel_touches_no_credits check (
    billing <> 'fuel' or (reserved_credits = 0 and coalesce(charged_credits, 0) = 0)),
  constraint discovery_turns_open_has_no_outcome check (
    status <> 'open' or (assistant_message is null and charged_credits is null and actual_micros is null)),
  constraint discovery_turns_settled_is_measured check (
    status <> 'settled' or (
      input_tokens >= 0 and output_tokens >= 0 and output_tokens <= max_output_tokens and assistant_message is not null
      and actual_micros = input_tokens * input_micros_per_token + output_tokens * output_micros_per_token
      and overrun_micros = greatest(0, actual_micros - reserved_micros)
      and (billing <> 'free' or charged_credits = least(reserved_credits, ceil(actual_micros::numeric / micros_per_credit))))),
  constraint discovery_turns_failed_costs_nothing check (status <> 'failed' or charged_credits = 0),
  constraint discovery_turns_abandoned_keeps_reservation check (status <> 'abandoned' or charged_credits = reserved_credits)
);
create unique index discovery_turns_one_open_per_project on public.discovery_turns (project_id) where status = 'open';
create index discovery_turns_by_org_day on public.discovery_turns (org_id, utc_day);

revoke all on table public.discovery_turns from anon, authenticated, service_role;
alter table public.discovery_turns enable row level security;
grant select on public.discovery_turns to authenticated;
create policy discovery_turns_select_org_member on public.discovery_turns for select to authenticated
  using (public.viewer_is_org_member(org_id));
create policy discovery_turns_select_platform_admin on public.discovery_turns for select to authenticated
  using (public.viewer_is_platform_admin());

alter table public.projects add column funded_at timestamptz;

alter table public.organizations
  add column discovery_disabled_at timestamptz,
  add column discovery_disabled_by uuid references public.accounts (id) on delete restrict,
  add column discovery_disabled_reason text,
  add constraint organizations_discovery_switch_is_whole
    check ((discovery_disabled_at is null) = (discovery_disabled_by is null) and (discovery_disabled_at is null) = (discovery_disabled_reason is null));
```

`TENANT_CATALOG` gains `discovery_turns: 'tenant-isolated'`. The row carries its own prices and ratio, so every ratio invariant is a check over the row's own columns and a price change in a later migration never breaks an in-flight row. `request_settings` is `{ model, max_tokens, effort }`, the exact request the edge sends, with `max_tokens` equal to `max_output_tokens`.

### SQL definers and private functions

```sql
-- the reservation: gates, estimate, bound, debit, turn row, context
create function public.discovery_turn_reserve(
  p_account_id uuid, p_organization_id uuid, p_project_id uuid, p_message text, p_settings jsonb
) returns jsonb language plpgsql security definer set search_path = '';
-- granted to service_role; calls public.assert_account_active

-- the settlement: measure, charge, release
create function public.discovery_turn_settle(
  p_account_id uuid, p_turn_id uuid, p_outcome text,               -- 'completed' | 'failed'
  p_assistant_message text, p_input_tokens integer, p_output_tokens integer,
  p_stop_reason text, p_served_model text, p_elicitation jsonb
) returns jsonb language plpgsql security definer set search_path = '';
-- granted to service_role; calls public.assert_account_active

-- the admin switch, audited
create function public.set_organization_discovery(
  p_account_id uuid, p_organization_id uuid, p_enabled boolean, p_reason text
) returns jsonb language plpgsql security definer set search_path = '';
-- granted to service_role; platform-admin re-check as in set_organization_vetting

-- private: lowers spent by the released part of a reservation; never reachable by a client role
create function public.discovery_spend_release(p_organization_id uuid, p_utc_day date, p_credits integer)
returns void language plpgsql set search_path = '';

-- the fuel seam, a stub until the Stripe fuel top-up requirement lands
create function public.project_fuel_available_micros(p_project_id uuid)
returns bigint language sql stable set search_path = '' as $$ select 0::bigint $$;
```

`discovery_turn_reserve`, in order. Lock order everywhere is organisation (share), project (update), turn (update), spend row (update, inside `discovery_allowance`).

1. `assert_account_active`; organisation `for share` else `23503 no-such-organisation`; membership `for share`, `42501 not-a-member` or `not-an-admin`.
2. `organizations.discovery_disabled_at is not null` raises `P0001 discovery-disabled`. It is read under the share lock; the switch writer takes `for update`, so a send that started before the switch commits sees it or finishes first, never half.
3. `auth.users.email_confirmed_at is null` raises `42501 email-unverified` with the sentence `discoveryMessageAllowed` returns. This is the one HTTP shape: 409 `{ kind: 'email-unverified', reason }`. It runs before routing, so a funded project is gated too.
4. `p_settings` is validated field by field (`model`, `effort`, `max_output_tokens`, `min_output_tokens`, `prompt_overhead_tokens`, `message_max_chars`, `micros_per_credit`, `input_micros_per_token`, `output_micros_per_token`, `turn_deadline_seconds`, every number a positive integer) else `22023 invalid-request`. The message is trimmed, non-empty and at most `message_max_chars` else `22023 invalid-request`.
5. Project `for update` with `org_id = p_organization_id` else `23503 no-such-project`; `need_intakes.stage = 'discovery_in_progress'` else `P0001 need-not-in-discovery`.
6. An open turn on the project older than `turn_deadline_seconds` is settled as `abandoned` in place (`charged_credits = reserved_credits`, `settled_at = clock_timestamp()`, no ledger change). A younger open turn raises `P0001 turn-in-flight`.
7. `v_billing := case when projects.funded_at is null then 'free' else 'fuel' end`.
8. The estimate. `v_prefix` is `input_tokens + output_tokens` of the last settled turn of the project, or for the first turn `ceil((length(description) + length(name) + length(reference file names)) / 2.0) + prompt_overhead_tokens`. `v_est_input := v_prefix + ceil(length(p_message) / 2.0) + 16`.
9. The bound. Free: `v_read := public.discovery_allowance(p_account_id, p_organization_id, 'read', null)`, `v_remaining := (v_read->>'remaining')::int`, `v_affordable := floor((v_remaining * micros_per_credit - v_est_input * in_price) / out_price)`. Fuel: the same with `v_fuel := public.project_fuel_available_micros(p_project_id)` in place of `v_remaining * micros_per_credit`. `v_max_output := least(max_output_tokens, v_affordable)`.
10. The refusal below the floor. Free, `v_max_output < min_output_tokens`: `perform public.discovery_allowance(..., 'debit', v_min_credits)` where `v_min_credits` is the credits for a minimum turn. That call raises `daily-allowance-exhausted` with the tier remedies when nothing remains, or `debit-exceeds-remaining` with the remaining count otherwise. If it does not raise, a concurrent release made the minimum turn affordable, and the run continues with `v_max_output := min_output_tokens` and that debit as the reservation. Fuel, below the floor: `P0001 fuel-exhausted`, sentence `discovery_turn_reserve refuses: project % has no fuel left for this Discovery turn — top up project fuel to continue; free credits are never spent on a funded project`.
11. The reservation. `v_reserved_micros := v_est_input * in_price + v_max_output * out_price`. Free: `v_reserved_credits := ceil(v_reserved_micros / micros_per_credit)` and `perform public.discovery_allowance(..., 'debit', v_reserved_credits)`; its answer supplies `utc_day`. Fuel: `v_reserved_credits := 0`, `utc_day` from `clock_timestamp()`; the Stripe run adds `perform public.project_fuel_reserve(p_project_id, v_reserved_micros, v_turn_id)` here.
12. Insert the turn (`seq := coalesce(max(seq), 0) + 1`, `request_settings := jsonb_build_object('model', ..., 'max_tokens', v_max_output, 'effort', ...)`, the three prices, `opened_at := clock_timestamp()`).
13. Return `{ turn: <row as jsonb>, need: { title, description, urgency, reference_files: [names] }, context: [ { role, content } ... every settled turn in seq order, user then assistant, then the new user message ], allowance: <debit answer or null> }`.

`discovery_turn_settle`: `assert_account_active`; read the turn, lock its project `for update`, lock the turn `for update`, re-check `status = 'open'` else `P0001 turn-not-open`; membership admin re-check on `turn.org_id`. `completed`: `p_output_tokens <= max_output_tokens` and `p_assistant_message is not null` else `22023 invalid-request`; write the measured columns (the checks in the table recompute every ratio); free: `perform public.discovery_spend_release(org_id, utc_day, reserved_credits - charged_credits)` when positive. `failed`: `charged_credits := 0`, release the whole reservation. Fuel on `completed`: nothing in this run; the Stripe run adds `perform public.project_fuel_settle(...)`. Return `{ turn, allowance: <read> }`. The settle never consults the switch or the email: it records what already happened, and blocking it would leave an open reservation.

`discovery_spend_release`: `update public.discovery_spend set spent = spent - p_credits where org_id = ... and utc_day = ... and spent - p_credits >= 0` and raise `P0001 refused` when no row changed. It is a plain function with no execute grant to any role, so only a definer running as owner can call it and the write-gate scan does not apply.

`set_organization_discovery`: the platform-admin template from `set_organization_vetting` lines 187 to 197; `p_reason` trimmed non-empty else `22023 invalid-request`; organisation `for update`; if the state is already what `p_enabled` asks, return `{ organization_id, discovery_enabled, changed: false }` with no audit row; otherwise set the three columns (`null`s when enabling) and `perform public.append_audit_event('org_discovery_switched', p_account_id, null, p_organization_id, p_reason, jsonb_build_object('enabled', p_enabled, 'previously_disabled_at', v_previous))`. The enum value `org_discovery_switched` is its own migration, as constraint 28 requires.

### Edge routes and bodies

`discovery-message`, promoted from the stand-in row. `WRITE_ROUTES['discovery-message'] = { surface: { kind: 'edge', rpc: 'discovery_turn_reserve' }, standing: { kind: 'account-required', admits: ['ngo'] } }`. Request `{ organizationId, projectId, message }`. Success `200 { ok: true, turn: DiscoveryTurnView, reply: string, elicitation: Elicitation | null, allowance: Allowance | null }`. A model failure settles the turn as failed, releases the reservation, and answers `502 { ok: false, reason }`, the frame's word for a vendor outage. Every refusal before the model is `409 { ok: false, kind, reason }` from SQL or `400/403` from TypeScript. Gate order: method, token, body, uuid shapes, standing, deactivated, no-account, not-an-ngo-account, `decide` (organisation named, org admin, projectId uuid, message non-empty and within the cap), then SQL in the order above: active, organisation, membership, kill switch, email, settings, project, need stage, in-flight turn, funding route, allowance bound, then the model, then settle and persist.

`set-organization-discovery`, new. `{ surface: { kind: 'edge', rpc: 'set_organization_discovery' }, standing: { kind: 'account-required', admits: ['platform_admin'] } }`. Request `{ organizationId, enabled: boolean, reason: string }`. Success `200 { ok: true, organizationId, discoveryEnabled, changed, disabledAt: string | null }`.

`discovery-conversation`, a read function shaped like `need-intake/index.ts`. Request `{ projectId }`. Success `200 { ok: true, conversation: { projectId, turns: DiscoveryTurnView[], elicitation: Elicitation | null } }`, the tenant `404` and `502` otherwise. It reads `discovery_turns` as the caller through `callerReads(...).discoveryTurnsOf(projectId)`, so the SELECT policy is the tenant rule and the function holds none.

`discovery-allowance` is unchanged. The screen calls it for the gauge and the send answer refreshes the gauge.

`DiscoveryTurnView` is `{ id, projectId, seq, status, billing, utcDay, userMessage, assistantMessage, elicitation, requestSettings: { model, maxTokens, effort }, maxOutputTokens, estimatedInputTokens, reservedCredits, chargedCredits, reservedMicros, actualMicros, overrunMicros, inputTokens, outputTokens, stopReason, servedModel, openedAt, settledAt }`.

### The write frame's second phase

`WriteRouteSpec` in `supabase/functions/_shared/write-routes.ts` gains one optional member:

```ts
readonly settle?: {
  readonly rpc: string;
  /** I/O between the two writes; it answers a settle argument for every outcome and never throws on a vendor answer */
  readonly act: (reserved: unknown, args: Args) => Promise<{ readonly args: Record<string, unknown>; readonly failure: string | null }>;
};
```

`writeRoute` in `edge.ts`, after the first RPC succeeds: without `settle`, unchanged. With it: `const acted = await spec.settle.act(outcome.value, decision.args)`, then `callDatabaseFunction(spec.settle.rpc, acted.args)`, a refusal mapped exactly as the first RPC's, then `refusal(acted.failure, 502)` when the act failed, else `200 { ok: true, ...spec.render(settled.value) }`. `render` receives the settle answer when `settle` is present. The index file stays one `Deno.serve(writeRoute({...}))`, the bypass scan sees `callDatabaseFunction` only inside `writeRoute`, and a throw out of `act` (a defect, not a vendor answer) becomes the frame's 502 with the reservation left open for the abandon path.

### `_shared` modules and exported signatures

`discovery-metering.ts` (pure, the TypeScript twin of the SQL arithmetic and the one place the knobs live):

```ts
export const DISCOVERY_MICROS_PER_CREDIT = 100_000;                       // $0.10 a credit; provisional
export const DISCOVERY_PRICE_MICROS_PER_TOKEN = { input: 5, output: 25 } as const;   // claude-opus-5 list price
export const DISCOVERY_REQUEST_SETTINGS = { model: 'claude-opus-5', maxOutputTokens: 4096, minOutputTokens: 512, effort: 'low' } as const;
export const DISCOVERY_TURN_DEADLINE_SECONDS = 150;
export const DISCOVERY_MESSAGE_MAX_CHARS = 4000;
export type ModelUsage = { inputTokens: number; outputTokens: number };
export type BillingTarget = { kind: 'free' } | { kind: 'fuel'; projectId: string };
export type FuelState = { availableMicros: number } | null;
export function billingTargetFor(project: { id: string; fundedAt: string | null }): BillingTarget;
export function fuelRouteAllowed(target: BillingTarget, fuel: FuelState, reservedMicros: number): { ok: true } | { ok: false; kind: 'fuel-exhausted'; reason: string };
export function creditsForMicros(micros: number, microsPerCredit?: number): number;   // ceil, minimum 0
export function estimateInputTokens(input: { lastSettled: ModelUsage | null; firstTurnChars: number; messageChars: number; promptOverheadTokens: number }): number;
export function affordableOutputTokens(input: { availableMicros: number; estimatedInputTokens: number }): number;
export function reservationFor(input: { estimatedInputTokens: number; maxOutputTokens: number }): { reservedMicros: number; reservedCredits: number };
export function settlementFor(input: { reservedMicros: number; reservedCredits: number; billing: 'free' | 'fuel'; usage: ModelUsage }): { actualMicros: number; chargedCredits: number; overrunMicros: number };
export function reserveSettings(): DiscoveryReserveSettings;   // the p_settings object, built from the constants above
export function fuelExhaustedReason(projectId: string): string;
```

`discovery-turn.ts` (pure): `decideDiscoveryMessage(input: AccountWriteRouteInput): WriteRouteDecision<DiscoveryReserveArgs>`, `DiscoveryReserveArgs = { p_account_id, p_organization_id, p_project_id, p_message, p_settings }`, `renderReservation(value: unknown): Reservation`, `DiscoveryModelRequest`, `DiscoveryModelAnswer`, `MessagesPort = { create(request: DiscoveryModelRequest): Promise<DiscoveryModelAnswer> }`, `buildModelRequest(reservation: Reservation): DiscoveryModelRequest`, `parseElicitation(toolInput: unknown): Elicitation | null`, `settleArgsFrom(reservation, answer, accountId): { args: DiscoverySettleArgs; failure: string | null }`, `discoveryAct(port: MessagesPort): WriteRouteSpec<...>['settle']['act']`, `renderDiscoveryMessage(value: unknown): { turn; reply; elicitation; allowance }`, `turnViewFromSql(row: DiscoveryTurnSqlRow): DiscoveryTurnView`, `conversationAnswer(reads, projectId)`.

`discovery-prompt.ts` (pure): `DISCOVERY_SYSTEM_PROMPT_TEMPLATE`, `discoverySystemPrompt(need): string`, `RECORD_ELICITATION_TOOL` (name `record_elicitation`, `strict: true`, the JSON schema of `Elicitation`), `DISCOVERY_PROMPT_OVERHEAD_TOKENS = Math.ceil(DISCOVERY_SYSTEM_PROMPT_TEMPLATE.length / 2)`. `Elicitation = { complete: true; facts: string[]; constraints: string[]; userStories: { story: string; acceptanceCriteria: string[] }[]; openQuestions: string[] }`.

`discovery-switch.ts` (pure): `decideOrganizationDiscovery(input): WriteRouteDecision<OrganizationDiscoveryArgs>`, `renderOrganizationDiscovery(value)`.

`write-routes.ts`: the inventory rows above, and `WRITE_REFUSAL_KINDS` gains `discovery-disabled`, `no-such-project`, `need-not-in-discovery`, `turn-in-flight`, `turn-not-open`, `fuel-exhausted`.

`tenant-reads.ts` and `edge.ts`: `DiscoveryReads = { discoveryTurnsOf(projectId): Promise<ReadResult<DiscoveryTurnSqlRow>> }`, added to `callerReads` as one more `restJson` over `discovery_turns` ordered by `seq`.

### The Deno-only model client

`supabase/functions/_shared/anthropic-messages.ts`, imported by `discovery-message/index.ts` and by no test:

```ts
import Anthropic from 'npm:@anthropic-ai/sdk@<the version package.json already pins>';
import { requireEnv } from './edge.ts';
import type { MessagesPort } from './discovery-turn.ts';
export function anthropicMessagesPort(): MessagesPort {
  const client = new Anthropic({ apiKey: requireEnv('ANTHROPIC_API_KEY'), maxRetries: 0, timeout: 120_000 });
  return {
    create: async (request) => {
      try {
        const message = await client.messages.create({
          model: request.model, max_tokens: request.maxTokens, system: request.system,
          messages: request.messages, tools: request.tools, thinking: { type: 'adaptive' },
          output_config: { effort: request.effort },
        });
        const text = message.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
        const tool = message.content.find((b) => b.type === 'tool_use') ?? null;
        return { ok: true, text, toolUse: tool ? { name: tool.name, input: tool.input } : null, stopReason: message.stop_reason ?? 'end_turn',
          usage: { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens }, model: message.model };
      } catch (error) {
        return { ok: false, status: error instanceof Anthropic.APIError ? error.status : null, reason: error instanceof Error ? error.message : String(error) };
      }
    },
  };
}
```

`maxRetries: 0` is load-bearing: the reservation bounds one attempt, and the SDK's default of two retries could run a timed-out request a second time inside one reservation. `.env.example` gains `ANTHROPIC_API_KEY=` with a comment; `childEnv` already drops that name.

### The stand-in: port and sim

`tests/at/harness/contracts.ts`:

```ts
export type ModelUsage = { inputTokens: number; outputTokens: number };
export type ModelRequestRecord = { model: string; maxTokens: number; effort: string; system: string; messages: { role: 'user' | 'assistant'; content: string }[]; tools: { name: string }[] };
export type ScriptedReply =
  | { kind: 'text'; text: string; usage: ModelUsage; stopReason?: 'end_turn' | 'max_tokens' | 'refusal' }
  | { kind: 'tool'; name: string; input: unknown; usage: ModelUsage }
  | { kind: 'error'; status: number; reason: string };
export type AnthropicMessagesSim = {
  /** the next replies, consumed in order; a request past the end of the script throws, because a missing script is a test defect and not a vendor outage */
  script(replies: readonly ScriptedReply[]): void;
  /** every request that reached the seam, in order; recorded by the simulator, not by the SUT */
  requests(): ModelRequestRecord[];
};
export type Vendors<Channel extends string = string> = { email: EmailProviderSim<Channel>; anthropic: AnthropicMessagesSim };
```

`tests/at/harness/vendors.ts`: `AnthropicMessagesPort = { create(request: ModelRequestRecord): Promise<ModelAnswerRecord> }` with `ModelAnswerRecord` structurally equal to the product's `DiscoveryModelAnswer`, and `createAnthropicMessagesSim(): { sim; port }`. The port answers a `text` reply with `output_tokens` capped at `request.maxTokens` and `stopReason: 'max_tokens'` when the script's usage exceeds it, so a scripted overrun on output is impossible, exactly as the real API guarantees; an overrun on input is scripted freely, which is the AT-004.49 case. `index.ts` builds it at loop beside the email sim and hands `{ email, anthropic }` ports to the adapter; at integration the refusing Proxy names `vendors.email` and `vendors.anthropic`. `vendors.selftest.ts` gains the three reply kinds and the past-the-end throw.

### Suite: SUT contract, files, static arms, oracle

`tests/at/suites/req-004/_contract.ts` (aliases; judgement types imported from `discovery-turn.ts`, `discovery-metering.ts`, `discovery-switch.ts`):

```ts
export type DiscoverySut = NeedsSut & {
  provisionPlatformAdmin(email: string): Promise<Session>;
  vetOrganizationAsAdmin(admin: Session, organizationId: string): Promise<void>;
  startDiscoveryNeed(session: Session, organizationId: string, intake: IntakeFixture): Promise<{ projectId: string }>;
  drainAllowance(session: Session, organizationId: string): Promise<void>;
  writeSpendRowAsOperator(row: SpendRow): Promise<void>;
  spendRows(organizationId: string): Promise<SpendRow[]>;
  sendMessage(session: Session | null, request: DiscoveryMessageRequest): Promise<DiscoveryMessageOutcome>;
  readConversation(session: Session | null, projectId: string): Promise<TenantReadOutcome<{ ok: true; conversation: DiscoveryConversationView }>>;
  turnRows(projectId: string): Promise<DiscoveryTurnView[]>;
  setProjectFundingAsOperator(projectId: string, funding: { fundedAt: string | null; fuelMicros: number }): Promise<void>;
  setDiscoverySwitch(session: Session | null, request: { organizationId: string; enabled: boolean; reason: string }): Promise<DiscoverySwitchOutcome>;
  discoverySwitchAuditEvents(organizationId: string): Promise<DiscoverySwitchAuditRow[]>;
  reserveTurnAsOperator(input: { accountId: string; organizationId: string; projectId: string; message: string }): Promise<OperatorReserveOutcome>;
  settleTurnAsOperator(input: { accountId: string; turnId: string; outcome: 'completed' | 'failed'; reply?: string; usage?: ModelUsage }): Promise<OperatorSettleOutcome>;
  backdateOpenTurnAsOperator(turnId: string, openedAt: string): Promise<void>;
  seedTurnsAsOperator(projectId: string, turns: SeededTurn[]): Promise<void>;
  setEmailVerifiedAsOperator(accountId: string, verified: boolean): Promise<void>;
  spendLedgerInvariantProblems(organizationId: string): Promise<string[]>;
};
```

`_fixture.ts` composes `createFixtureAdapter` of req-003, holds `turns: Map<projectId, DiscoveryTurnView[]>`, `funding: Map<projectId, { fundedAt; fuelMicros }>`, `switches: Map<orgId, {...}>`, and drives `writePipeline(SEND_SPEC, ...)` then a `reserve` twin that calls `organizations.debitAllowance` for the free debit and the metering module for the arithmetic, `discoveryAct(vendors.anthropic)` for the act, and a `settle` twin that releases through `organizations.writeSpendRowAsOperator` on today's row. The fuel sim is the `funding` map: the reserve twin checks `fuelMicros >= reservedMicros`, the settle twin subtracts `actualMicros`. `setProjectFundingAsOperator` at integration throws `CapabilityPending(['checkout.project-fuel'])` when `fuelMicros > 0`, because there is nowhere to put fuel; with `fuelMicros: 0` it sets `projects.funded_at`.

`_live.ts` composes the req-003 live adapter; `sendMessage` posts to the deployed route, `readConversation` to the read function, `setDiscoverySwitch` to the admin route; the `*AsOperator` members reach SQL as the operator the way `attemptNeedDefinerAsOperator` does; `spendLedgerInvariantProblems` runs the query in unit 6 below.

`_pending.ts`: `AWAITED = { discoverySurface: 'ui.discovery-surface', projectFuelCheckout: 'checkout.project-fuel', fundedTurnBilling: 'billing.funded-turn', anthropicLive: 'vendors.anthropic', referenceUpload: 'storage.reference-upload', publishFlow: 'publish.flow', triageQueue: 'triage.queue', ... }`, plus `notYet(id)` which throws `AtPending(id, 'sut-missing', 'lands in a later unit of this run')` for ids of units not built yet.

`_source-pins.ts`: `meteringPinProblems()` compares `DISCOVERY_MICROS_PER_CREDIT`, the two prices, `maxOutputTokens`, `minOutputTokens` and `DISCOVERY_TURN_DEADLINE_SECONDS` with the `AT_CONFIG` entries; `sendSentencePinProblems()` extracts the `email-unverified` raise from the last `discovery_turn_reserve` definition and compares it with `discoveryMessageAllowed({ emailVerified: false }).reason`, and the `fuel-exhausted` raise with `fuelExhaustedReason`.

`_source-absences.ts`: `noSupplementalGrantPathProblems()` throws unless it finds `create table public.discovery_spend`, then lists every migration statement that writes `public.discovery_spend` and refuses any writer other than `apply_discovery_grant_mark` (whose `granted` value must be `public.discovery_daily_grant(...)`), `discovery_allowance` (spent only) and `discovery_spend_release` (spent only), any `WRITE_ROUTES` name or rpc naming grant, credit or allowance other than `discovery-allowance`, and any quoted product string naming Discovery credits with grant, bonus, extra, supplement or gift. `noPlatformBreakerProblems()` refuses any route, SQL object, TypeScript declaration, cron or trigger whose name carries circuit, breaker, or platform with cap, limit, pause, halt or disable in a Discovery or allowance context, and asserts the switch columns live on `organizations` and the spend key is `(org_id, utc_day)`. `freeCreditsOutsideMoneyProblems()` refuses any column on `discovery_spend` or `discovery_turns` naming usd, cents, dollars, price, amount, paid, stripe or fuel other than the three `*_micros_per_*` and `*_micros` cost columns, and any foreign key from those tables to a table named with fuel, stripe, payment or checkout.

`fixtures/grant-tracker.ts` exports `GRANT_TRACKER = { intake, ngoMessages, replies, source: 'recorded' | 'handwritten', recordedWith?: { model, date } }` and `fixtures/grant-tracker.oracle.ts` exports `grantTrackerOracleProblems(elicitation: Elicitation): string[]`, which checks the fixture's own facts: the tool tracks funder reporting deadlines, two staff use it, no developer is on staff, reminders before a deadline, a user story per fact with at least one acceptance criterion each, and no story about anything the intake never mentioned. `tests/at/harness/req004-oracle.selftest.ts` drives it with a passing, a missing-fact and an invented-story elicitation.

Test files: `a-metering.test.ts` (01, 02, 08, 47, 49), `b-funded-routing.test.ts` (04, 05, 06, 48, 09), `c-remedies.test.ts` (03a, 03b), `d-conversation.test.ts` (10, 11), `e-guardrails.test.ts` (41 to 45), `f-transparency.test.ts` (46), `z-later-runs.test.ts` (the thirty-eight `awaiting(...)` registrations by section: 12 to 15 `ui.discovery-surface`; 16 to 19 `storage.reference-upload`; 20 to 22, 24, 25, 52, 58 to 60 `ui.discovery-surface`; 26 to 31, 50 `ui.discovery-surface`; 51 `triage.queue`; 32 to 36, 53 to 57 `ui.discovery-surface`; 37 to 39 `ui.discovery-surface`).

### Expected file, both tiers, final state after unit 6

Loop: all twenty green, red `{}` for this run's ids, and the thirty-eight later-run ids red by the names above.

Integration: green `01, 08, 11, 41, 42, 43, 44, 47, 48, 49` (ten). Red (ten): `02`, `03a`, `03b`, `46` on `["ui.discovery-surface"]`; `04`, `05`, `06` on `["checkout.project-fuel", "billing.funded-turn"]`; `09` on `["checkout.project-fuel"]`; `10` on `["vendors.anthropic"]`; `45` on `["checkout.project-fuel"]`; the thirty-eight later-run ids as at loop.

Per unit the file evolves: a unit's ids move from `{ "kind": "pending", "phase": "sut-missing" }` to their final state in the unit's own commit, never before.

### Harness and config edits

`suite-adapters.ts` gains `'req-004'`. `atconfig.ts` gains six entries, all with a source line: `discoveryMicrosPerCredit` (100000, micro-dollars a credit, provisional, founder to pin at the unit 1 gate), `discoveryInputMicrosPerToken` (5) and `discoveryOutputMicrosPerToken` (25) (the `claude-opus-5` list price of $5 and $25 a million tokens, cached in the Claude API reference on 2026-06-24), `discoveryMaxOutputTokens` (4096, provisional), `discoveryMinOutputTokens` (512, provisional), `discoveryTurnDeadlineSeconds` (150, provisional). `config.ts` gains the six dotted keys under `req-004.discovery.*`. `AT_CONFIG` holds numbers only, so the model id is a shipped constant the tests import, not a pin.

`req-001/_policy-scan.ts` gains the catalog row. `config.toml` gains three `[functions.*]` blocks. `.claude/skills/verify-ai4good/features/` gains `discovery-message.md`, `discovery-conversation.md`, `set-organization-discovery.md` and three README rows.

### Refusal kinds and DETAIL strings

| kind | errcode | raised by | when |
|---|---|---|---|
| `discovery-disabled` | P0001 | reserve | the organisation's switch is off |
| `email-unverified` | 42501 | reserve | `email_confirmed_at is null`, the `discoveryMessageAllowed` sentence |
| `no-such-project` | 23503 | reserve | no project with that id in that organisation |
| `need-not-in-discovery` | P0001 | reserve | the need is `draft` |
| `turn-in-flight` | P0001 | reserve | an open turn younger than the deadline |
| `daily-allowance-exhausted` | P0001 | `discovery_allowance` inside reserve | nothing remains today; tier remedies |
| `debit-exceeds-remaining` | P0001 | `discovery_allowance` inside reserve | a minimum turn does not fit |
| `fuel-exhausted` | P0001 | reserve | a funded project cannot afford a minimum turn |
| `turn-not-open` | P0001 | settle | a second settle, or a settle after abandon |
| `invalid-request` | 22023 | both | settings, message, tokens out of shape |
| `not-a-platform-admin` | 42501 | switch | the existing template |

## Decisions

**The turn record.** A turn is one row of `discovery_turns` from the moment it is reserved. The row holds project, organisation, UTC day, both message bodies, the request settings, the estimate, the prices and ratio, the reservation, and after settle the measured usage, the cost and the charge. `discovery_spend.spent` and the turn rows stay equal by construction because the two writes of a turn happen inside one definer transaction under the spend row's lock: the reserve adds `reserved_credits` through the existing debit arm at the moment the row is inserted, and the settle subtracts `reserved_credits - charged_credits` through `discovery_spend_release` at the moment the row is updated. So for every organisation and day, `spent = sum(case status when 'open' then reserved_credits else charged_credits end)` over its free turns. AT-004.46's invariant is that query, run at integration by the live adapter and computed over maps at loop. The one writer outside this identity is the raw `debit` action of `discovery-allowance`, which nothing in the product calls; it is named under open questions.

**The ratio and the rounding rule.** A turn learns its provider cost from the model answer's `usage.input_tokens` and `usage.output_tokens`, priced at the per-token micro-dollar prices stored on the row (5 and 25 for `claude-opus-5`, integers, so the cost is exact). `charged_credits = min(reserved_credits, ceil(actual_micros / micros_per_credit))`, with `micros_per_credit = 100000` so one credit is ten cents. Ceiling is the rounding rule: a turn that ran costs at least one credit, the platform never under-recovers, and AT-004.02 asserts proportionality by computing the same ceiling from the pinned numbers. The ratio and the prices are pinned three ways: `AT_CONFIG`, the shipped constants in `discovery-metering.ts`, and the row's own columns checked by `meteringPinProblems` and by the table's check constraints. An underfunded turn is neither only refused nor only capped: `max_tokens` is derived from what the NGO can still afford, down to a floor of 512 output tokens, and below the floor the turn is refused before it runs. So the last credit of the day is usable at a shorter reply, and AT-004.49's bound holds at both ends. When the model's actual cost exceeds the reservation, which can only happen on the input side because the API never exceeds `max_tokens`, `charged_credits` is capped at `reserved_credits` and the excess is recorded in `overrun_micros`: the platform absorbs it, the NGO is never charged more than the reservation it saw, and the overrun is visible in the row. The estimate over-counts on purpose (two characters a token for new text, the previous turn's exact `input + output` for the prefix), so an overrun is rare and never larger than one message's estimate error.

**The funding seam.** A project's funding state is `projects.funded_at`, null until the first successful fuel checkout, which the Stripe run sets. Fuel availability is `public.project_fuel_available_micros(project_id)`, a stub that answers zero until the Stripe run replaces its body with a read of the fuel ledger. At loop the operator sets `funded_at` and a simulated fuel amount in the fixture's `funding` map; at integration the operator sets `funded_at` only, and asking for fuel above zero throws `CapabilityPending(['checkout.project-fuel'])`. The pure routing function is `billingTargetFor(project: { id; fundedAt }): BillingTarget` with `fuelRouteAllowed(target, fuel, reservedMicros)` beside it, and the SQL reserve applies the same rule from the column and the stub. Loop green: `.04`, `.05`, `.06`, `.48`, `.09`. Integration green: `.48`, because with a funded project and a stub that reports no fuel the criterion's Given holds by construction and the refusal, the untouched free pool and the absent turn row are observed on the real definer. Integration pending: `.04`, `.05`, `.06` on `checkout.project-fuel, billing.funded-turn` and `.09` on `checkout.project-fuel`, each after proving the refusal half. The Stripe run fills in the stub body, sets `funded_at` from checkout, adds `project_fuel_reserve` and `project_fuel_settle` calls at the two marked points in the definers, and deletes nothing: the turn row already carries `reserved_micros` and `actual_micros` for the fuel ledger to reference by `turn_id`.

**The send route.** The existing `discovery-message` row is promoted, not duplicated, because a stand-in that says another requirement owns the route becomes a lie the day this run builds it. Its `admits` narrows to `['ngo']`: only an NGO's org admin can send on the NGO's project, and a volunteer is refused as `not-an-ngo-account` before the email floor, which still sits under every message that reaches SQL. The request is `{ organizationId, projectId, message }` and the answer carries the turn, the reply, the elicitation when the turn produced one, and the allowance. TypeScript gates are the frame's (method, token, body, uuids, standing, lifecycle, type) plus `decide` (org admin, project uuid, message shape). SQL gates are the rest, in the order the reserve lists them: active, organisation, membership, kill switch, email, settings, project, need stage, in-flight turn, funding route, allowance bound. The email refusal is one HTTP shape, 409 `email-unverified`, raised in SQL with the sentence `discoveryMessageAllowed` already renders, so the req-001 fixture's stand-in and the real route say the same words; the pin arm holds them together. The req-001 loop fixture keeps its local spec unchanged, because `writePipeline` reads only the row's standing.

**The conversation store.** The conversation is the ordered turn rows of a project whose need is at `discovery_in_progress`; there is no separate conversation or message table. A turn holds the user message and the assistant reply, so replaying the rows in `seq` order is the full prior context, and the reserve returns exactly that context to the edge, which is how a new session resumes: sign in again, read `discovery-conversation`, send, and the next request carries every earlier message. The rows are tenant-isolated and readable by the organisation's members and by platform admins, the same posture as `need_intakes`, and the later decline record reads them for the ops item. This table is not the audit event: `audit_events` rows written on this path (`org_discovery_switched`) carry reason and metadata only and never a message body, which is the architecture note's rule; the conversation is product data under the tenant rule, not an audit trail, and a future purge of a project's conversation deletes turn rows without touching the audit log. A "fresh Discovery" later needs an `episode` column or an archive; nothing here forecloses either.

**The model client.** The client is `supabase/functions/_shared/anthropic-messages.ts`, Deno-only, imported by the route's index file and by no test, using `npm:@anthropic-ai/sdk` with `maxRetries: 0` and a 120 second timeout, reading `ANTHROPIC_API_KEY` through `requireEnv`. The request settings come from one frozen constant, `DISCOVERY_REQUEST_SETTINGS`, and the request builder has no billing parameter, so funding cannot reach them; `max_tokens` is the reservation's bound, derived by the same rule for free and fuel. AT-004.09 observes this on the rows: `request_settings` of a free turn and a funded turn are compared field by field, and the allowance read before and after `funded_at` is set is equal. The recommendation for the unit 4 gate is the SDK: its typed `usage`, `stop_reason` and error classes are the fields the settle depends on, the Claude API reference this tree follows names the SDK as the default client, and `maxRetries: 0` states the one-attempt rule in the client's own vocabulary. The alternative is `fetch` against `https://api.anthropic.com/v1/messages`, about forty lines, no dependency, and the tree's own precedent for vendor HTTP in `edge.ts`; it loses typed errors and gains nothing the reservation needs. Both keep the key out of the tree.

**The loop-tier stand-in and the oracle.** The Anthropic Messages stand-in has the email stand-in's two faces: the SUT holds `port.create`, the test holds `sim.script` and `sim.requests`. The contract lands in `contracts.ts`, the factory in `vendors.ts`, and `createHarness` hands the port to the adapter and the sim to the test. Controlled provider costs are the `usage` on each scripted reply, and the port caps output tokens at the request's `max_tokens` the way the real API does, so the only scriptable overrun is on input. A five-to-ten-turn conversation is replayed from `fixtures/grant-tracker.ts`: the NGO side is the fixture's `ngoMessages`, the model side is its `replies`, the last of which is a `record_elicitation` tool call. The fixture-specific oracle asserts the elicitation's facts, constraints, user stories and acceptance criteria against the intake's own content, not against emptiness. The transcript file names its `source`: `recorded`, produced once by a script in the item folder against the real route with a key in the local environment, or `handwritten` if no key is available to the writer; the pull request says which. What the loop tier proves is the pipeline end to end and, when recorded, that a real Opus answer to this intake satisfies the oracle. What integration proves without a key is persistence, resume and the reserve's context assembly; what it declares pending is `.10` on `vendors.anthropic`, because CI holds no key and the harness has no integration vendor seam by design.

**The kill switch.** The state is three columns on `organizations`: `discovery_disabled_at`, `discovery_disabled_by`, `discovery_disabled_reason`, whole or absent by a check constraint. The admin route is `set-organization-discovery`, request `{ organizationId, enabled, reason }`, definer `set_organization_discovery`, refusals from the platform-admin template plus `invalid-request` for a blank reason, idempotent with `changed: false` and no audit row when the state already matches, and one `org_discovery_switched` audit event otherwise. The send route reads the column inside the reserve transaction under the organisation's share lock, never from `write_standing` and never from a cached read, and the switch writer takes the organisation `for update`; so after the switch commits, no later reserve can miss it, and a reserve already holding the share lock finishes before the switch lands. A turn already between reserve and settle completes and settles, because the settle records what was already spent. No notification is sent: no taxonomy row fits, and that is a "Not done here" line.

**The two absence arms.** `noSupplementalGrantPathProblems` scans every migration statement that writes `discovery_spend` and every write route: the only writer of `granted` is `apply_discovery_grant_mark` and its value is `discovery_daily_grant(...)`, the only writers of `spent` are `discovery_allowance` and `discovery_spend_release`, no route or rpc names grant, credit or allowance except `discovery-allowance` whose actions are `read` and `debit`, and no product string names Discovery credits with grant, bonus, extra, supplement or gift. `noPlatformBreakerProblems` scans routes, SQL objects, declarations, cron statements and triggers for circuit, breaker, and platform with cap, limit, pause, halt or disable in a Discovery or allowance context, and pins the two per-NGO facts: the switch columns sit on `organizations` and the spend key is `(org_id, utc_day)`. Both throw when they cannot read the tree.

**The transparency read.** Remaining credits come from the existing `discovery-allowance` read and from the `allowance` field of every send answer. Turn records come from `discovery-conversation`, a caller-bound read over the tenant-isolated `discovery_turns`. The SQL that proves the delta invariant, run as the operator at integration and computed over maps at loop:

```sql
select s.org_id, s.utc_day, s.spent,
       coalesce(sum(case t.status when 'open' then t.reserved_credits else t.charged_credits end), 0) as accounted
  from public.discovery_spend s
  left join public.discovery_turns t on t.org_id = s.org_id and t.utc_day = s.utc_day and t.billing = 'free'
 where s.org_id = $1
 group by s.org_id, s.utc_day, s.spent
having s.spent <> coalesce(sum(case t.status when 'open' then t.reserved_credits else t.charged_credits end), 0);
```

A row in the answer is a problem. The daily reset is a new `(org_id, utc_day)` key with no turns, which the query reports as accounted zero against spent zero. A file attach goes through `project-need` and touches neither table, which the test observes as no delta.

**The red set.** At loop: none of the twenty. At integration: `02`, `03a`, `03b`, `46` on `ui.discovery-surface`, because the criterion's "shown to the NGO" half has no screen until the wiring leaf, and each body proves its backend half first; `04`, `05`, `06` on `checkout.project-fuel, billing.funded-turn` and `09` on `checkout.project-fuel`, because a funded turn needs a fuel debit that has no ledger; `10` on `vendors.anthropic`, because a live Opus call needs a key CI cannot hold and a non-deterministic answer the oracle was written for one recording of; `45` on `checkout.project-fuel`, because the money ledger it must be outside of does not exist to inspect, the shape AT-002.10 already takes. Ten green at integration, ten red, all twenty green at loop. `48` and `11` are green at integration on purpose and their honesty edge is stated under risks.

**Lanes.** Units 1 and 4 go to the hardest-tasks lane: unit 1 designs the definer pair, the check set and the fixture twin from this document, and unit 4 designs the prompt, the elicitation tool, the recording and the oracle. Units 2, 3, 5 and 6 go to the feature lane: each applies a fixed contract, the routing function and its tests, two sentence tests, a template-copied admin route with two pattern-copied absence arms, and a read function with a query.

## Tradeoffs accepted

- Two RPCs a turn instead of one, plus the standing read and the auth round trip: five round trips before the model is called. At this scale, ten to thirty turns a day per NGO, the cost is latency in the low tens of milliseconds, and what it buys is the refund, the concurrency bound and the crash record. A single write cannot give all three.
- An abandoned reservation is charged in full. The definer cannot tell whether the crash came before or after the model answered, so it keeps the reservation, which keeps AT-004.49 strict and makes the loss visible as an `abandoned` row with its charge. The retry leaf later makes a retry of an abandoned turn free by inheriting that reservation; until then a crash costs the NGO one reservation, never silently.
- Ceiling rounding at ten cents a credit makes a small turn cost a whole credit. The alternative, fractional credits, breaks the integer ledger and the two pinned grants of ten and thirty. The founder can move the ratio; the rounding rule stays.
- The estimate uses two characters a token for new text. English averages four, so the reservation is roughly double on the new message's share, which the settle gives back. Scripts near one character a token can under-estimate, and the overrun rule then charges the reservation and records the excess.
- `max_tokens` shrinks when the NGO's remaining credits are nearly gone, so a last-credit turn can be cut short with `stop_reason: 'max_tokens'`. The row records it and the reply is still stored. The alternative, refuse below a full turn, wastes the last credit of every day.
- The settle never re-checks the switch or the email. A message already sent to the model is charged and stored even if the admin switched the NGO off in the meantime; the next message is blocked.
- The raw `debit` action of `discovery-allowance` stays, because six ids of the NGO profile suite drive it. It is the one writer that can make the delta invariant false, and nothing in the product calls it.

## Alternatives considered

- **Charge after the call, one write.** Simplest, and rejected: two concurrent turns pass one preflight, and a crash after the model answers is a free turn with no record. Both are exactly what AT-004.49 and AT-004.46 forbid.
- **Charge a flat estimate before the call, never refund.** One write and no crash gap, rejected because the unused output cap is charged on every turn: at 4096 output tokens that is about one credit a turn thrown away, a third to a tenth of the day's grant.
- **Reservations in a separate column, `spent` written only at settle.** Keeps `spent` equal to charged costs only. Rejected because `spent <= granted` would no longer bound the reservations, the bound would move from a check constraint into definer arithmetic across two tables, and `remaining` would stop meaning "what you can still reserve".
- **A `count_tokens` call before the reserve.** Makes the input side of the bound exact and removes the overrun case. Rejected for this run: one more round trip and a second seam on the stand-in for a case the over-estimate already makes rare; named as the first thing to add if overruns appear in the rows.
- **A constant `max_tokens` and refuse below a full turn.** Keeps the request settings identical in every turn without an affordability rule. Rejected because it strands the last credits of every day; the affordability rule is the same for free and fuel, so funding still changes nothing.
- **A conversation table and a message table.** Rejected: a turn is one user message and one reply, so the turn row is the message pair, and two more tables would carry the same rows twice. An `episode` column is enough when a fresh Discovery arrives.
- **A separate switch table.** Rejected: a column on `organizations` needs no catalog row, no policy, and is read under the lock the reserve already holds.
- **A new route name beside the stand-in.** Rejected: the inventory would keep a row whose reason says another requirement owns the route this run built.
- **`fetch` instead of the SDK.** Kept as the founder's alternative at the unit 4 gate, described under the model client decision.
- **A fault point for the crash case.** Rejected: the operator seam (`backdateOpenTurnAsOperator`) states the crash's Given at both tiers without new harness machinery.
- **An integration-tier Anthropic fake reached through a base URL.** Rejected: the harness has no integration vendor seam by design, and it would put test doubles on a production code path.

## Open questions and risks

- **The ratio, the output cap and the floor are provisional.** One credit at ten cents, 4096 and 512 output tokens, and a 150 second deadline are this design's numbers; the founder pins them at the unit 1 gate. The tests read them from `AT_CONFIG`, so a change is one edit in the registry and one in the constants.
- **`.48` green at integration rests on the stub.** The stub reports no fuel, so a funded project's refusal is the criterion's Given by construction. When the Stripe ledger lands, the test keeps its shape and the live adapter drains fuel instead of relying on the stub; the design says so in the test's comment.
- **`.11` green at integration seeds turns as the operator.** The deployed route cannot complete a send without a key, so integration proves persistence, the read, and the reserve's context assembly, and not that a live model received it. That last claim is `.10`'s and is red on `vendors.anthropic`.
- **The recording may be handwritten.** If the writer has no key, `GRANT_TRACKER.source` is `handwritten` and the loop green proves the pipeline only. Recording it once is a ten-minute step with a key in `.env.local`.
- **Prompt caching is not metered.** The architecture note wants cached content discounted; usage carries `cache_read_input_tokens` and `cache_creation_input_tokens`, this run sends no `cache_control`, so both are zero. The caching leaf adds two columns and two prices.
- **The raw `debit` action can break the delta invariant.** Nothing in the product calls it, but a future test or operator could. Retiring it needs the NGO profile suite to drive turns instead, a cross-suite change filed as "Not done here".
- **AT-001.10 stays red at integration on `sut.accounts.sendDiscoveryMessage`.** The req-001 live adapter still cannot complete a send without a model. Renaming its capability to `vendors.anthropic` moves req-001's expected file and is filed as "Not done here".
- **`bun run typecheck` never sees `edge.ts` or the client.** The second phase of `writeRoute` and the SDK call are proven only by serving the function and by the verify skill; the mechanical agent drives it with the founder's key.
- **The Deno edge runtime's wall clock.** The SDK timeout is 120 seconds and the deadline 150; if the hosted runtime kills a worker earlier, the abandon path covers it, but the reply is lost for that turn.
- **A `refusal` stop reason** is settled as completed with its usage, stored, and charged; the wiring leaf decides how to render it.

## Next implementation step

Unit 1, in this order: the migration `..._discovery_turns.sql` (types, table, index, posture, `discovery_spend_release`, `project_fuel_available_micros`, `projects.funded_at`, the three switch columns on `organizations`, `discovery_turn_reserve`, `discovery_turn_settle`); `discovery-metering.ts` and `discovery-turn.ts` without the prompt (a one-line system prompt placeholder and no tool); the two inventory rows' kinds and the `settle` member on `WriteRouteSpec`; the stand-in contract, factory and harness wiring; the suite skeleton with all fifty-eight registrations, `_fixture.ts`, `_live.ts`, `_pending.ts`, `_source-pins.ts`, the catalog row and the six pins; `tests/at/expected/req-004.json` with the five unit 1 ids green at loop, `01`, `08`, `47`, `49` green at integration, `02` red on `ui.discovery-surface`, every other run id `pending sut-missing` and the thirty-eight later-run ids red by name. Then `bun run typecheck`, `at:check req-004`, `at:selftest`, both tiers with `--expect`, and the auth, NGO profile, intake and notifications suites at both tiers.

## Synthesis decision

## Per-unit plan

**Unit 1, allowance metering.** Files: `supabase/migrations/<stamp>_discovery_turns.sql` (the table, both definers, the release function, the fuel stub, `projects.funded_at` and the three switch columns on `organizations`); `supabase/functions/_shared/discovery-metering.ts`, `discovery-turn.ts`; `write-routes.ts` (six kinds, the `settle` member; the `discovery-message` row stays a stand-in until unit 4); `tests/at/harness/contracts.ts`, `vendors.ts`, `vendors.selftest.ts`, `index.ts`, `suite-adapters.ts`, `atconfig.ts`, `config.ts`; `tests/at/suites/req-001/_policy-scan.ts` (catalog row); `tests/at/suites/req-004/_bind.ts`, `_contract.ts`, `_fixture.ts`, `_live.ts`, `_pending.ts`, `_source-pins.ts`, `a-metering.test.ts`, `z-later-runs.test.ts` and the five other test files holding `notYet(id)` bodies; `tests/at/expected/req-004.json`. Ids: 01, 02, 08, 47, 49. Loop: five green. Integration: 01, 08, 47, 49 green through operator-driven reserve and settle; 02 red on `ui.discovery-surface` after its backend proof. Lane: hardest tasks.

**Unit 2, funded routing.** Files: `discovery-metering.ts` (`billingTargetFor`, `fuelRouteAllowed`, `fuelExhaustedReason`); `_fixture.ts` (the `funding` map and the fuel sim); `_live.ts` (`setProjectFundingAsOperator`); `_source-pins.ts` (the `fuel-exhausted` sentence pin); `b-funded-routing.test.ts`; the expected file. No migration: the column, the stub and the SQL branch landed in unit 1. Ids: 04, 05, 06, 48, 09. Loop: five green. Integration: 48 green; 04, 05, 06 red on `checkout.project-fuel, billing.funded-turn`; 09 red on `checkout.project-fuel`, each after its refusal proof. Lane: feature.

**Unit 3, zero-credit remedies.** Files: `c-remedies.test.ts`; `_fixture.ts` and `_live.ts` (`drainAllowance`, `vetOrganizationAsAdmin`); the expected file. No product change: the tier-split sentence already exists in SQL and TypeScript and the reserve raises it through `discovery_allowance`. Ids: 03a, 03b. Loop: two green. Integration: two red on `ui.discovery-surface` after the route proof. Lane: feature.

**Unit 4, the conversation.** Files: `supabase/functions/_shared/discovery-prompt.ts`, `anthropic-messages.ts`, `edge.ts` (the second phase, `discoveryTurnsOf` in `callerReads`); `write-routes.ts` (the row promoted to `edge`, `admits: ['ngo']`); `supabase/functions/discovery-message/index.ts`; `supabase/config.toml`; `.env.example`; `tests/at/harness/contracts.ts` and `vendors.ts` (the `tool` reply kind); `tests/at/suites/req-004/fixtures/grant-tracker.ts`, `fixtures/grant-tracker.oracle.ts`; `tests/at/harness/req004-oracle.selftest.ts`; `d-conversation.test.ts`; `.claude/skills/verify-ai4good/features/discovery-message.md` and the README row; the expected file. The founder's gate decision, SDK or `fetch`, is taken before the client file is written. Ids: 10, 11. Loop: two green. Integration: 11 green through seeded turns, the deployed read and the operator reserve; 10 red on `vendors.anthropic`. Lane: hardest tasks.

**Unit 5, abuse guardrails.** Files: `supabase/migrations/<stamp>_audit_event_kind_discovery_switch.sql`, `<stamp>_organization_discovery_switch.sql`; `supabase/functions/_shared/discovery-switch.ts`; `supabase/functions/set-organization-discovery/index.ts`; `write-routes.ts` (the row); `supabase/config.toml`; `tests/at/suites/req-004/_source-absences.ts`; `e-guardrails.test.ts`; `_fixture.ts` and `_live.ts` (`setDiscoverySwitch`, `discoverySwitchAuditEvents`, `setEmailVerifiedAsOperator`); `.claude/skills/verify-ai4good/features/set-organization-discovery.md` and the README row; the expected file. The three switch columns on `organizations` land in unit 1's migration, because the reserve reads them from its first version; this unit adds only the enum value and the writer. Ids: 41, 42, 43, 44, 45. Loop: five green. Integration: 41, 42, 43, 44 green; 45 red on `checkout.project-fuel` after both arms. Lane: feature.

**Unit 6, transparency.** Files: `supabase/functions/discovery-conversation/index.ts`; `discovery-turn.ts` (`conversationAnswer`, `DiscoveryConversationView`); `supabase/config.toml`; `_live.ts` (`readConversation`, `spendLedgerInvariantProblems`, `backdateOpenTurnAsOperator`); `_fixture.ts` (the same over maps); `f-transparency.test.ts`; `.claude/skills/verify-ai4good/features/discovery-conversation.md` and the README row; the expected file. Ids: 46. Loop: green. Integration: red on `ui.discovery-surface` after the read and the invariant query. Lane: feature.

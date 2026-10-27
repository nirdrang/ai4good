create table public.prd_money_config (
  key text primary key check (key in ('turn-reservation-usd', 'fee-basis-points')),
  value numeric(20,6) not null check (value >= 0),
  placeholder boolean not null,
  note text not null check (length(btrim(note)) > 0)
);

create table public.prd_rate_versions (
  model text not null check (length(btrim(model)) > 0),
  version integer not null check (version >= 1),
  effective_from timestamptz not null,
  rate_card text not null check (rate_card in ('up-to-100k', 'over-100k', 'runtime')),
  category text not null
    check (category in ('input', 'output', 'cache-read', 'cache-write', 'active-hour')),
  usd numeric(20,6) not null check (usd >= 0),
  primary key (model, version, rate_card, category),
  constraint prd_rate_versions_unit check (
    (rate_card = 'runtime' and category = 'active-hour')
    or (rate_card <> 'runtime' and category <> 'active-hour')
  )
);

create table public.prd_fund_credits (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  amount numeric(20,6) not null check (amount > 0),
  note text not null check (length(btrim(note)) > 0),
  created_at timestamptz not null default clock_timestamp()
);

create index prd_fund_credits_project_idx on public.prd_fund_credits (project_id);

create table public.prd_sessions (
  chat_id uuid primary key,
  project_id uuid not null,
  provider_session_id text not null unique check (length(btrim(provider_session_id)) > 0),
  vault_id text,
  credential_generation integer not null default 0 check (credential_generation >= 0),
  runtime_baseline_seconds numeric(20,6) not null default 0 check (runtime_baseline_seconds >= 0),
  event_cursor text,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  foreign key (project_id, chat_id) references public.prd_chats (project_id, id) on delete cascade
);

create table public.prd_reservations (
  turn_id uuid primary key references public.prd_turns (id) on delete cascade,
  project_id uuid not null references public.prd_records (project_id) on delete cascade,
  amount numeric(20,6) not null check (amount >= 0),
  model text not null,
  rate_version integer not null check (rate_version >= 1),
  fee_basis_points numeric(20,6) not null check (fee_basis_points >= 0),
  released_at timestamptz,
  created_at timestamptz not null default clock_timestamp()
);

create index prd_reservations_held_idx
  on public.prd_reservations (project_id)
  where released_at is null;

create table public.prd_provider_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.prd_records (project_id) on delete cascade,
  turn_id uuid not null references public.prd_turns (id) on delete cascade,
  provider_session_id text not null check (length(btrim(provider_session_id)) > 0),
  event_id text not null check (length(btrim(event_id)) > 0),
  kind text not null check (kind in ('model-request')),
  state text not null check (state in ('pending', 'settled')),
  input_tokens bigint,
  output_tokens bigint,
  cache_read_tokens bigint,
  cache_write_tokens bigint,
  created_at timestamptz not null default clock_timestamp(),
  settled_at timestamptz,
  constraint prd_provider_events_once unique (provider_session_id, event_id),
  constraint prd_provider_events_usage check (
    (state = 'pending'
      and input_tokens is null
      and output_tokens is null
      and cache_read_tokens is null
      and cache_write_tokens is null
      and settled_at is null)
    or (state = 'settled'
      and num_nonnulls(input_tokens, output_tokens, cache_read_tokens, cache_write_tokens) = 4
      and least(input_tokens, output_tokens, cache_read_tokens, cache_write_tokens) >= 0
      and settled_at is not null)
  )
);

create index prd_provider_events_turn_idx on public.prd_provider_events (turn_id);

create table public.prd_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.prd_records (project_id) on delete cascade,
  turn_id uuid not null references public.prd_turns (id) on delete cascade,
  component text not null check (component in ('provider', 'fee', 'runtime', 'release', 'adjustment')),
  source_key text not null check (length(btrim(source_key)) > 0),
  amount numeric(20,6) not null check (amount >= 0),
  rate_card text check (rate_card is null or rate_card in ('up-to-100k', 'over-100k')),
  input_tokens bigint,
  output_tokens bigint,
  cache_read_tokens bigint,
  cache_write_tokens bigint,
  runtime_seconds numeric(20,6),
  created_at timestamptz not null default clock_timestamp(),
  constraint prd_ledger_entries_once unique (component, source_key),
  constraint prd_ledger_entries_attribution check (
    (component = 'provider'
      and rate_card is not null
      and num_nonnulls(input_tokens, output_tokens, cache_read_tokens, cache_write_tokens) = 4
      and least(input_tokens, output_tokens, cache_read_tokens, cache_write_tokens) >= 0
      and runtime_seconds is null)
    or (component = 'runtime'
      and rate_card is null
      and num_nonnulls(input_tokens, output_tokens, cache_read_tokens, cache_write_tokens) = 0
      and runtime_seconds is not null
      and runtime_seconds >= 0)
    or (component in ('fee', 'release', 'adjustment')
      and rate_card is null
      and num_nonnulls(input_tokens, output_tokens, cache_read_tokens, cache_write_tokens) = 0
      and runtime_seconds is null)
  )
);

create index prd_ledger_entries_project_idx on public.prd_ledger_entries (project_id);
create index prd_ledger_entries_turn_idx on public.prd_ledger_entries (turn_id);

create table public.prd_turn_settings (
  turn_id uuid primary key references public.prd_turns (id) on delete cascade,
  project_id uuid not null references public.prd_records (project_id) on delete cascade,
  model text not null check (length(btrim(model)) > 0),
  settings jsonb not null check (jsonb_typeof(settings) = 'object'),
  created_at timestamptz not null default clock_timestamp()
);

revoke all on table public.prd_money_config from public, anon, authenticated, service_role;
revoke all on table public.prd_rate_versions from public, anon, authenticated, service_role;
revoke all on table public.prd_fund_credits from public, anon, authenticated, service_role;
revoke all on table public.prd_sessions from public, anon, authenticated, service_role;
revoke all on table public.prd_reservations from public, anon, authenticated, service_role;
revoke all on table public.prd_provider_events from public, anon, authenticated, service_role;
revoke all on table public.prd_ledger_entries from public, anon, authenticated, service_role;
revoke all on table public.prd_turn_settings from public, anon, authenticated, service_role;

alter table public.prd_money_config enable row level security;
alter table public.prd_rate_versions enable row level security;
alter table public.prd_fund_credits enable row level security;
alter table public.prd_sessions enable row level security;
alter table public.prd_reservations enable row level security;
alter table public.prd_provider_events enable row level security;
alter table public.prd_ledger_entries enable row level security;
alter table public.prd_turn_settings enable row level security;

create trigger prd_rate_versions_immutable
  before update or delete on public.prd_rate_versions
  for each row execute function public.prd_row_immutable();

create trigger prd_fund_credits_immutable
  before update or delete on public.prd_fund_credits
  for each row execute function public.prd_row_immutable();

create trigger prd_ledger_entries_immutable
  before update or delete on public.prd_ledger_entries
  for each row execute function public.prd_row_immutable();

create trigger prd_turn_settings_immutable
  before update or delete on public.prd_turn_settings
  for each row execute function public.prd_row_immutable();

insert into public.prd_money_config (key, value, placeholder, note) values
  ('turn-reservation-usd', 0.050000, true,
    'Placeholder. The amount held for every turn that calls the model is a pilot decision.'),
  ('fee-basis-points', 1000, true,
    'Placeholder. The platform fee on model requests is a pilot decision.');

insert into public.prd_rate_versions (model, version, effective_from, rate_card, category, usd) values
  ('claude-haiku-5-5', 1, timestamptz '2026-10-01 00:00:00+00', 'up-to-100k', 'input', 0.100000),
  ('claude-haiku-5-5', 1, timestamptz '2026-10-01 00:00:00+00', 'up-to-100k', 'output', 0.500000),
  ('claude-haiku-5-5', 1, timestamptz '2026-10-01 00:00:00+00', 'up-to-100k', 'cache-read', 0.010000),
  ('claude-haiku-5-5', 1, timestamptz '2026-10-01 00:00:00+00', 'up-to-100k', 'cache-write', 0.125000),
  ('claude-haiku-5-5', 1, timestamptz '2026-10-01 00:00:00+00', 'over-100k', 'input', 0.500000),
  ('claude-haiku-5-5', 1, timestamptz '2026-10-01 00:00:00+00', 'over-100k', 'output', 2.500000),
  ('claude-haiku-5-5', 1, timestamptz '2026-10-01 00:00:00+00', 'over-100k', 'cache-read', 0.050000),
  ('claude-haiku-5-5', 1, timestamptz '2026-10-01 00:00:00+00', 'over-100k', 'cache-write', 0.625000),
  ('claude-haiku-5-5', 1, timestamptz '2026-10-01 00:00:00+00', 'runtime', 'active-hour', 0.080000);

create function public.prd_service_model()
returns text
language sql
immutable
set search_path = ''
as $$
  select 'claude-haiku-5-5'::text;
$$;

create function public.prd_micros(p_amount numeric)
returns bigint
language sql
immutable
set search_path = ''
as $$
  select (coalesce(p_amount, 0) * 1000000)::bigint;
$$;

create function public.prd_money_value(p_key text)
returns numeric
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_value numeric;
begin
  select value into v_value from public.prd_money_config where key = p_key;
  if not found then
    raise exception 'the money setting % is missing', p_key using errcode = '22023', detail = 'invalid-request';
  end if;
  return v_value;
end;
$$;

create function public.prd_rate(p_model text, p_version integer, p_card text, p_category text)
returns numeric
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_usd numeric;
begin
  select usd into v_usd
    from public.prd_rate_versions
   where model = p_model
     and version = p_version
     and rate_card = p_card
     and category = p_category;
  if not found then
    raise exception 'no rate for % % % %', p_model, p_version, p_card, p_category
      using errcode = '22023', detail = 'invalid-request';
  end if;
  return v_usd;
end;
$$;

create function public.prd_turn_spend(p_turn uuid)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(amount), 0)
    from public.prd_ledger_entries
   where turn_id = p_turn
     and component in ('provider', 'fee', 'runtime');
$$;

create function public.prd_funds(p_project uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_credited numeric;
  v_settled numeric;
  v_held numeric;
  v_overrun numeric;
  v_hold numeric;
  v_available numeric;
begin
  select coalesce(sum(amount), 0) into v_credited
    from public.prd_fund_credits
   where project_id = p_project;
  select
      coalesce(sum(amount) filter (where component in ('provider', 'fee', 'runtime')), 0),
      coalesce(sum(amount) filter (where component = 'adjustment'), 0)
    into v_settled, v_overrun
    from public.prd_ledger_entries
   where project_id = p_project;
  select coalesce(sum(greatest(r.amount - public.prd_turn_spend(r.turn_id), 0)), 0) into v_held
    from public.prd_reservations r
   where r.project_id = p_project
     and r.released_at is null;
  v_hold := public.prd_money_value('turn-reservation-usd');
  v_available := v_credited - v_settled - v_held;
  return jsonb_build_object(
    'allocationMicros', public.prd_micros(v_credited),
    'settledMicros', public.prd_micros(v_settled),
    'pendingMicros', public.prd_micros(v_held),
    'replyHoldMicros', public.prd_micros(v_hold),
    'availableMicros', public.prd_micros(v_available),
    'overrunMicros', public.prd_micros(v_overrun),
    'band', case
      when v_credited = 0 then 'red'
      when v_settled * 100 < v_credited * 80 then 'green'
      when v_settled * 100 <= v_credited * 95 then 'yellow'
      else 'red'
    end,
    'replyFunded', v_available >= v_hold
  );
end;
$$;

create function public.prd_funds_admit(p_project uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not coalesce((public.prd_funds(p_project)->>'replyFunded')::boolean, false) then
    raise exception 'there is not enough left for another AI reply'
      using errcode = '22023', detail = 'funds';
  end if;
end;
$$;

create function public.prd_hold(p_project uuid, p_turn uuid)
returns numeric
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_model text := public.prd_service_model();
  v_version integer;
  v_amount numeric := public.prd_money_value('turn-reservation-usd');
begin
  select max(version) into v_version
    from public.prd_rate_versions
   where model = v_model
     and effective_from <= clock_timestamp();
  if v_version is null then
    raise exception 'no rate version is in effect for %', v_model
      using errcode = '22023', detail = 'invalid-request';
  end if;
  insert into public.prd_reservations (turn_id, project_id, amount, model, rate_version, fee_basis_points)
  values (p_turn, p_project, v_amount, v_model, v_version, public.prd_money_value('fee-basis-points'));
  return v_amount;
end;
$$;

create function public.prd_adjust(p_turn uuid, p_key text, p_before numeric, p_after numeric)
returns numeric
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_res public.prd_reservations%rowtype;
  v_over numeric;
begin
  select * into v_res from public.prd_reservations where turn_id = p_turn;
  v_over := greatest(p_after - greatest(v_res.amount, p_before), 0);
  if v_over > 0 then
    insert into public.prd_ledger_entries (project_id, turn_id, component, source_key, amount)
    values (v_res.project_id, p_turn, 'adjustment', p_key, v_over);
  end if;
  return v_over;
end;
$$;

create function public.prd_turn_release(p_turn uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_res public.prd_reservations%rowtype;
  v_state text;
begin
  select * into v_res from public.prd_reservations where turn_id = p_turn for update;
  if not found or v_res.released_at is not null then
    return false;
  end if;
  select state into v_state from public.prd_turns where id = p_turn;
  if v_state is null or v_state not in ('answered', 'rejected') then
    return false;
  end if;
  if exists (
    select 1 from public.prd_provider_events where turn_id = p_turn and state = 'pending'
  ) then
    return false;
  end if;
  insert into public.prd_ledger_entries (project_id, turn_id, component, source_key, amount)
  values (
    v_res.project_id,
    p_turn,
    'release',
    'release:' || p_turn::text,
    greatest(v_res.amount - public.prd_turn_spend(p_turn), 0)
  );
  update public.prd_reservations
     set released_at = clock_timestamp()
   where turn_id = p_turn;
  return true;
end;
$$;

create function public.prd_usage_count(p_usage jsonb, p_key text)
returns bigint
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_value jsonb := p_usage->p_key;
begin
  if v_value is null
     or jsonb_typeof(v_value) is distinct from 'number'
     or (v_value #>> '{}')::numeric < 0
     or (v_value #>> '{}')::numeric <> trunc((v_value #>> '{}')::numeric) then
    raise exception 'usage names % as a whole number', p_key using errcode = '22023', detail = 'invalid-request';
  end if;
  return (v_value #>> '{}')::bigint;
end;
$$;

create function public.prd_event_text(p_event jsonb, p_key text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
begin
  if jsonb_typeof(p_event->p_key) is distinct from 'string' or btrim(p_event->>p_key) = '' then
    raise exception 'an event names its %', p_key using errcode = '22023', detail = 'invalid-request';
  end if;
  return btrim(p_event->>p_key);
end;
$$;

create function public.prd_session_bind(p_project uuid, p_chat uuid, p_session text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_bound text;
begin
  insert into public.prd_sessions (chat_id, project_id, provider_session_id)
  values (p_chat, p_project, p_session)
  on conflict do nothing;
  select provider_session_id into v_bound
    from public.prd_sessions
   where chat_id = p_chat
     for update;
  if v_bound is distinct from p_session then
    raise exception 'that event names another session' using errcode = '22023', detail = 'invalid-request';
  end if;
end;
$$;

create function public.prd_settle_event(
  p_event uuid,
  p_input bigint,
  p_output bigint,
  p_read bigint,
  p_write bigint
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_event public.prd_provider_events%rowtype;
  v_res public.prd_reservations%rowtype;
  v_card text;
  v_cost numeric;
  v_fee numeric;
  v_key text;
  v_before numeric;
begin
  select * into v_event from public.prd_provider_events where id = p_event for update;
  select * into v_res from public.prd_reservations where turn_id = v_event.turn_id;
  v_card := case when p_input + p_read + p_write <= 100000 then 'up-to-100k' else 'over-100k' end;
  v_cost := round(
    (
      p_input * public.prd_rate(v_res.model, v_res.rate_version, v_card, 'input')
      + p_output * public.prd_rate(v_res.model, v_res.rate_version, v_card, 'output')
      + p_read * public.prd_rate(v_res.model, v_res.rate_version, v_card, 'cache-read')
      + p_write * public.prd_rate(v_res.model, v_res.rate_version, v_card, 'cache-write')
    ) / 1000000,
    6
  );
  v_fee := round(v_cost * v_res.fee_basis_points / 10000, 6);
  v_key := 'event:' || v_event.provider_session_id || ':' || v_event.event_id;
  v_before := public.prd_turn_spend(v_event.turn_id);
  insert into public.prd_ledger_entries (
    project_id, turn_id, component, source_key, amount, rate_card,
    input_tokens, output_tokens, cache_read_tokens, cache_write_tokens
  ) values (
    v_event.project_id, v_event.turn_id, 'provider', v_key, v_cost, v_card,
    p_input, p_output, p_read, p_write
  );
  insert into public.prd_ledger_entries (project_id, turn_id, component, source_key, amount)
  values (v_event.project_id, v_event.turn_id, 'fee', v_key, v_fee);
  perform public.prd_adjust(v_event.turn_id, v_key, v_before, v_before + v_cost + v_fee);
  update public.prd_provider_events
     set state = 'settled',
         input_tokens = p_input,
         output_tokens = p_output,
         cache_read_tokens = p_read,
         cache_write_tokens = p_write,
         settled_at = clock_timestamp()
   where id = p_event;
end;
$$;

create function public.prd_event_result(p_event uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'turnId', e.turn_id,
    'kind', 'model-end',
    'eventId', e.event_id,
    'state', e.state,
    'rateCard', provider.rate_card,
    'providerMicros', public.prd_micros(provider.amount),
    'feeMicros', public.prd_micros(fee.amount),
    'overrunMicros', public.prd_micros(adjustment.amount)
  )
    from public.prd_provider_events e
    left join public.prd_ledger_entries provider
      on provider.component = 'provider'
     and provider.source_key = 'event:' || e.provider_session_id || ':' || e.event_id
    left join public.prd_ledger_entries fee
      on fee.component = 'fee'
     and fee.source_key = 'event:' || e.provider_session_id || ':' || e.event_id
    left join public.prd_ledger_entries adjustment
      on adjustment.component = 'adjustment'
     and adjustment.source_key = 'event:' || e.provider_session_id || ':' || e.event_id
   where e.id = p_event;
$$;

create function public.prd_runtime_result(p_turn uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'turnId', p_turn,
    'kind', 'runtime',
    'seconds', runtime.runtime_seconds,
    'runtimeMicros', public.prd_micros(runtime.amount),
    'overrunMicros', public.prd_micros(adjustment.amount)
  )
    from public.prd_ledger_entries runtime
    left join public.prd_ledger_entries adjustment
      on adjustment.component = 'adjustment'
     and adjustment.source_key = runtime.source_key
   where runtime.component = 'runtime'
     and runtime.source_key = 'runtime:' || p_turn::text;
$$;

create function public.prd_end_result(p_turn uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'turnId', t.id,
    'kind', 'end',
    'state', t.state,
    'released', r.released_at is not null,
    'releasedMicros', public.prd_micros(release.amount),
    'pendingEvents', (
      select count(*)
        from public.prd_provider_events e
       where e.turn_id = t.id
         and e.state = 'pending'
    )
  )
    from public.prd_turns t
    join public.prd_reservations r on r.turn_id = t.id
    left join public.prd_ledger_entries release
      on release.component = 'release'
     and release.source_key = 'release:' || t.id::text
   where t.id = p_turn;
$$;

create function public.prd_fund_credit(p_project uuid, p_amount numeric, p_note text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 6) then
    raise exception 'a credit is a positive amount in whole micro-dollars'
      using errcode = '22023', detail = 'invalid-request';
  end if;
  if btrim(coalesce(p_note, '')) = '' then
    raise exception 'a credit carries a note' using errcode = '22023', detail = 'invalid-request';
  end if;
  if not exists (select 1 from public.projects where id = p_project) then
    raise exception 'the project does not exist' using errcode = '22023', detail = 'invalid-request';
  end if;
  perform 1 from public.prd_records where project_id = p_project for update;
  insert into public.prd_fund_credits (project_id, amount, note)
  values (p_project, p_amount, btrim(p_note));
  update public.prd_records
     set snapshot_sequence = snapshot_sequence + 1
   where project_id = p_project;
  return public.prd_funds(p_project);
end;
$$;

create function public.prd_turn_ingest(p_turn uuid, p_event jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_project uuid;
  v_record_state text;
  v_turn public.prd_turns%rowtype;
  v_res public.prd_reservations%rowtype;
  v_kind text;
  v_session text;
  v_event_id text;
  v_event uuid;
  v_event_turn uuid;
  v_event_state text;
  v_usage jsonb;
  v_has_usage boolean;
  v_input bigint;
  v_output bigint;
  v_read bigint;
  v_write bigint;
  v_seconds numeric;
  v_baseline numeric;
  v_amount numeric;
  v_before numeric;
  v_key text;
  v_outcome text;
begin
  if p_event is null or jsonb_typeof(p_event) is distinct from 'object' then
    raise exception 'an event is a record' using errcode = '22023', detail = 'invalid-request';
  end if;
  select project_id into v_project from public.prd_turns where id = p_turn;
  if not found then
    raise exception 'that turn is not open' using errcode = '22023', detail = 'invalid-request';
  end if;
  select state into v_record_state
    from public.prd_records
   where project_id = v_project
     for update;
  perform public.prd_refuse_unready(v_record_state);
  select * into v_turn from public.prd_turns where id = p_turn for update;
  select * into v_res from public.prd_reservations where turn_id = p_turn for update;
  if not found then
    raise exception 'that turn holds no reservation' using errcode = '22023', detail = 'invalid-request';
  end if;
  v_kind := p_event->>'kind';

  if v_kind = 'model-end' then
    v_session := public.prd_event_text(p_event, 'sessionId');
    v_event_id := public.prd_event_text(p_event, 'eventId');
    v_usage := p_event->'usage';
    v_has_usage := v_usage is not null and jsonb_typeof(v_usage) is distinct from 'null';
    if v_has_usage then
      if jsonb_typeof(v_usage) is distinct from 'object' then
        raise exception 'usage is a record' using errcode = '22023', detail = 'invalid-request';
      end if;
      v_input := public.prd_usage_count(v_usage, 'input');
      v_output := public.prd_usage_count(v_usage, 'output');
      v_read := public.prd_usage_count(v_usage, 'cacheRead');
      v_write := public.prd_usage_count(v_usage, 'cacheWrite');
    end if;
    perform public.prd_session_bind(v_project, v_turn.chat_id, v_session);
    select id, turn_id, state into v_event, v_event_turn, v_event_state
      from public.prd_provider_events
     where provider_session_id = v_session
       and event_id = v_event_id
       for update;
    if found then
      if v_event_turn is distinct from p_turn then
        raise exception 'that event belongs to another turn' using errcode = '22023', detail = 'invalid-request';
      end if;
      if v_event_state = 'settled' or not v_has_usage then
        return public.prd_event_result(v_event);
      end if;
    else
      insert into public.prd_provider_events (
        project_id, turn_id, provider_session_id, event_id, kind, state
      ) values (
        v_project, p_turn, v_session, v_event_id, 'model-request', 'pending'
      )
      returning id into v_event;
      if not v_has_usage then
        return public.prd_event_result(v_event);
      end if;
    end if;
    perform public.prd_settle_event(v_event, v_input, v_output, v_read, v_write);
    perform public.prd_turn_release(p_turn);
    update public.prd_records
       set snapshot_sequence = snapshot_sequence + 1
     where project_id = v_project;
    return public.prd_event_result(v_event);
  end if;

  if v_kind = 'runtime' then
    v_session := public.prd_event_text(p_event, 'sessionId');
    if jsonb_typeof(p_event->'activeSeconds') is distinct from 'number'
       or (p_event->>'activeSeconds')::numeric < 0 then
      raise exception 'runtime names the active seconds' using errcode = '22023', detail = 'invalid-request';
    end if;
    v_seconds := round((p_event->>'activeSeconds')::numeric, 6);
    perform public.prd_session_bind(v_project, v_turn.chat_id, v_session);
    v_key := 'runtime:' || p_turn::text;
    if exists (
      select 1 from public.prd_ledger_entries where component = 'runtime' and source_key = v_key
    ) then
      return public.prd_runtime_result(p_turn);
    end if;
    select runtime_baseline_seconds into v_baseline
      from public.prd_sessions
     where chat_id = v_turn.chat_id
       for update;
    if v_seconds < v_baseline then
      raise exception 'active seconds only grow' using errcode = '22023', detail = 'invalid-request';
    end if;
    v_amount := round(
      (v_seconds - v_baseline)
        * public.prd_rate(v_res.model, v_res.rate_version, 'runtime', 'active-hour')
        / 3600,
      6
    );
    v_before := public.prd_turn_spend(p_turn);
    insert into public.prd_ledger_entries (
      project_id, turn_id, component, source_key, amount, runtime_seconds
    ) values (
      v_project, p_turn, 'runtime', v_key, v_amount, v_seconds - v_baseline
    );
    update public.prd_sessions
       set runtime_baseline_seconds = v_seconds,
           updated_at = clock_timestamp()
     where chat_id = v_turn.chat_id;
    perform public.prd_adjust(p_turn, v_key, v_before, v_before + v_amount);
    perform public.prd_turn_release(p_turn);
    update public.prd_records
       set snapshot_sequence = snapshot_sequence + 1
     where project_id = v_project;
    return public.prd_runtime_result(p_turn);
  end if;

  if v_kind = 'end' then
    v_outcome := p_event->>'outcome';
    if v_outcome is null or v_outcome not in ('answered', 'rejected', 'uncertain') then
      raise exception 'a turn ends as answered, rejected, or uncertain'
        using errcode = '22023', detail = 'invalid-request';
    end if;
    if v_turn.state = v_outcome then
      return public.prd_end_result(p_turn);
    end if;
    if v_turn.state in ('answered', 'rejected') then
      raise exception 'that turn already finished' using errcode = '22023', detail = 'stale';
    end if;
    perform public.prd_turn_finish(p_turn, v_outcome);
    return public.prd_end_result(p_turn);
  end if;

  raise exception 'an event names its kind' using errcode = '22023', detail = 'invalid-request';
end;
$$;

create function public.prd_session_budget(p_turn uuid)
returns bigint
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_chat uuid;
  v_amount numeric;
  v_spent numeric;
begin
  select t.chat_id, r.amount into v_chat, v_amount
    from public.prd_turns t
    join public.prd_reservations r on r.turn_id = t.id
   where t.id = p_turn;
  if not found then
    raise exception 'that turn holds no reservation' using errcode = '22023', detail = 'invalid-request';
  end if;
  select coalesce(sum(l.amount), 0) into v_spent
    from public.prd_ledger_entries l
    join public.prd_turns t on t.id = l.turn_id
   where t.chat_id = v_chat
     and l.component in ('provider', 'runtime');
  return ceil((v_spent + v_amount) * 100)::bigint;
end;
$$;

create function public.prd_ledger(p_project uuid, p_turn uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tokens numeric;
  v_runtime numeric;
  v_fee numeric;
  v_overrun numeric;
  v_released numeric;
  v_held numeric;
  v_input bigint;
  v_output bigint;
  v_read bigint;
  v_write bigint;
  v_pending jsonb;
begin
  if p_turn is not null and not exists (
    select 1 from public.prd_turns where id = p_turn and project_id = p_project
  ) then
    raise exception 'that turn is not in this PRD' using errcode = '22023', detail = 'invalid-request';
  end if;
  select
      coalesce(sum(amount) filter (where component = 'provider'), 0),
      coalesce(sum(amount) filter (where component = 'runtime'), 0),
      coalesce(sum(amount) filter (where component = 'fee'), 0),
      coalesce(sum(amount) filter (where component = 'adjustment'), 0),
      coalesce(sum(amount) filter (where component = 'release'), 0),
      coalesce(sum(input_tokens), 0),
      coalesce(sum(output_tokens), 0),
      coalesce(sum(cache_read_tokens), 0),
      coalesce(sum(cache_write_tokens), 0)
    into v_tokens, v_runtime, v_fee, v_overrun, v_released, v_input, v_output, v_read, v_write
    from public.prd_ledger_entries
   where project_id = p_project
     and (p_turn is null or turn_id = p_turn);
  select coalesce(sum(greatest(r.amount - public.prd_turn_spend(r.turn_id), 0)), 0) into v_held
    from public.prd_reservations r
   where r.project_id = p_project
     and r.released_at is null
     and (p_turn is null or r.turn_id = p_turn);
  select coalesce(
      jsonb_agg(jsonb_build_object('turnId', e.turn_id, 'eventId', e.event_id) order by e.created_at),
      '[]'::jsonb
    )
    into v_pending
    from public.prd_provider_events e
   where e.project_id = p_project
     and e.state = 'pending'
     and (p_turn is null or e.turn_id = p_turn);
  return jsonb_build_object(
    'projectId', p_project,
    'turnId', p_turn,
    'providerMicros', public.prd_micros(v_tokens + v_runtime),
    'tokenMicros', public.prd_micros(v_tokens),
    'runtimeMicros', public.prd_micros(v_runtime),
    'feeMicros', public.prd_micros(v_fee),
    'deductedMicros', public.prd_micros(v_tokens + v_runtime + v_fee),
    'overrunMicros', public.prd_micros(v_overrun),
    'releasedMicros', public.prd_micros(v_released),
    'heldMicros', public.prd_micros(v_held),
    'tokens', jsonb_build_object(
      'input', v_input,
      'output', v_output,
      'cacheRead', v_read,
      'cacheWrite', v_write
    ),
    'pending', v_pending
  );
end;
$$;

create function public.prd_turn_settings_record(p_turn uuid, p_model text, p_settings jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_project uuid;
  v_res public.prd_reservations%rowtype;
  v_row public.prd_turn_settings%rowtype;
begin
  if btrim(coalesce(p_model, '')) = '' or jsonb_typeof(p_settings) is distinct from 'object' then
    raise exception 'settings name the model and the service settings'
      using errcode = '22023', detail = 'invalid-request';
  end if;
  select project_id into v_project from public.prd_turns where id = p_turn;
  if not found then
    raise exception 'that turn is not open' using errcode = '22023', detail = 'invalid-request';
  end if;
  perform 1 from public.prd_records where project_id = v_project for update;
  select * into v_res from public.prd_reservations where turn_id = p_turn;
  if not found then
    raise exception 'that turn holds no reservation' using errcode = '22023', detail = 'invalid-request';
  end if;
  if v_res.model is distinct from btrim(p_model) then
    raise exception 'the turn was priced for another model' using errcode = '22023', detail = 'invalid-request';
  end if;
  insert into public.prd_turn_settings (turn_id, project_id, model, settings)
  values (p_turn, v_project, btrim(p_model), p_settings)
  on conflict (turn_id) do nothing;
  select * into v_row from public.prd_turn_settings where turn_id = p_turn;
  if v_row.model is distinct from btrim(p_model) or v_row.settings is distinct from p_settings then
    raise exception 'the settings for that turn were already recorded'
      using errcode = '22023', detail = 'invalid-request';
  end if;
  return jsonb_build_object('turnId', p_turn, 'model', v_row.model, 'settings', v_row.settings);
end;
$$;

create or replace function public.prd_turn_reserve(
  p_actor uuid,
  p_project uuid,
  p_chat_key text,
  p_request_id text,
  p_base_revision bigint,
  p_intent jsonb,
  p_body_hash text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_request text;
  v_hash text;
  v_record public.prd_records%rowtype;
  v_existing public.prd_turns%rowtype;
  v_role text;
  v_gate jsonb;
  v_chat uuid;
  v_question uuid;
  v_kind text;
  v_parts jsonb;
  v_seen bigint;
  v_message uuid;
  v_sequence bigint;
  v_turn uuid;
  v_bumped boolean := false;
  v_qid uuid;
  v_version integer;
  v_body text;
  v_title text;
  v_note text;
  v_given text;
  v_rows jsonb;
  v_ngo_account uuid;
  v_ngo_first text;
  v_ngo_messages bigint;
  v_pick record;
  v_lines text := '';
begin
  perform public.assert_account_active(p_actor);
  if btrim(coalesce(p_request_id, '')) = '' or btrim(coalesce(p_body_hash, '')) = '' then
    raise exception 'a send names its request' using errcode = '22023', detail = 'invalid-request';
  end if;
  v_request := btrim(p_request_id);
  v_hash := btrim(p_body_hash);

  select * into v_record
    from public.prd_records
   where project_id = p_project
     for update;
  if not found then
    raise exception 'the PRD is not open' using errcode = '22023', detail = 'invalid-request';
  end if;
  perform public.prd_refuse_unready(v_record.state);

  select * into v_existing
    from public.prd_turns
   where project_id = p_project
     and request_id = v_request;
  if found then
    if v_existing.actor_id = p_actor and v_existing.body_hash = v_hash then
      return jsonb_build_object(
        'turnId', v_existing.id,
        'messageId', v_existing.message_id,
        'sequence', v_existing.admitted_sequence
      );
    end if;
    raise exception 'that request was already used' using errcode = '22023', detail = 'invalid-request';
  end if;
  if exists (
    select 1 from public.prd_actions
     where project_id = p_project and request_id = v_request
  ) then
    raise exception 'that request was already used' using errcode = '22023', detail = 'invalid-request';
  end if;

  v_role := public.prd_role(p_project, p_actor);
  if v_role is null then
    raise exception 'this account has no role on the PRD'
      using errcode = '42501', detail = 'forbidden';
  end if;

  v_gate := public.prd_send_gate(p_project, v_role, p_chat_key);
  if not coalesce((v_gate->>'ok')::boolean, false) then
    if v_gate->>'detail' = 'forbidden' then
      raise exception 'this account cannot send in this chat'
        using errcode = '42501', detail = 'forbidden';
    end if;
    raise exception 'this send is not valid'
      using errcode = '22023', detail = coalesce(v_gate->>'detail', 'invalid-request');
  end if;
  v_chat := (v_gate->>'chatId')::uuid;
  v_question := (v_gate->>'questionId')::uuid;

  if p_intent is null or jsonb_typeof(p_intent) is distinct from 'object' then
    raise exception 'a send names its intent' using errcode = '22023', detail = 'invalid-request';
  end if;
  v_kind := p_intent->>'kind';
  if v_kind = 'use-answer' and p_chat_key is distinct from 'main' then
    raise exception 'an answer is used in the main chat' using errcode = '22023', detail = 'invalid-request';
  end if;
  if v_kind = 'answers' and left(coalesce(p_chat_key, ''), 6) is distinct from 'topic:' then
    raise exception 'answers belong in a section chat' using errcode = '22023', detail = 'invalid-request';
  end if;

  if v_record.closed_revision is not null then
    raise exception 'the PRD is closed' using errcode = '42501', detail = 'closed';
  end if;
  if v_kind in ('use-answer', 'close-check')
     and p_base_revision is distinct from v_record.current_revision then
    raise exception 'the PRD changed since this was sent' using errcode = '22023', detail = 'stale';
  end if;
  if exists (
    select 1
      from public.prd_turns
     where chat_id = v_chat
       and state in ('admitted', 'uncertain')
  ) then
    raise exception 'the AI is still answering in this chat' using errcode = '22023', detail = 'busy';
  end if;

  if v_kind = 'close-check' then
    raise exception 'that action is not available yet' using errcode = '22023', detail = 'not-yet';
  elsif v_kind = 'text' then
    if jsonb_typeof(p_intent->'text') is distinct from 'string' or btrim(p_intent->>'text') = '' then
      raise exception 'a send carries text' using errcode = '22023', detail = 'invalid-request';
    end if;
    v_parts := jsonb_build_array(jsonb_build_object('type', 'text', 'text', p_intent->>'text'));
  elsif v_kind = 'answers' then
    if jsonb_typeof(p_intent->'picks') is distinct from 'object' then
      raise exception 'answers name their picks' using errcode = '22023', detail = 'invalid-request';
    end if;
    if p_intent ? 'text' and jsonb_typeof(p_intent->'text') is distinct from 'string' then
      raise exception 'answers carry text' using errcode = '22023', detail = 'invalid-request';
    end if;
    for v_pick in
      select key, value
        from jsonb_each(p_intent->'picks')
       order by key
    loop
      if v_pick.key = ''
         or jsonb_typeof(v_pick.value) is distinct from 'string'
         or btrim(v_pick.value #>> '{}') = '' then
        raise exception 'answers name their picks' using errcode = '22023', detail = 'invalid-request';
      end if;
      if v_lines <> '' then
        v_lines := v_lines || E'\n';
      end if;
      v_lines := v_lines || v_pick.key || ': ' || btrim(v_pick.value #>> '{}');
    end loop;
    if btrim(coalesce(p_intent->>'text', '')) <> '' then
      if v_lines <> '' then
        v_lines := v_lines || E'\n';
      end if;
      v_lines := v_lines || btrim(p_intent->>'text');
    end if;
    if v_lines = '' then
      raise exception 'answers name their picks' using errcode = '22023', detail = 'invalid-request';
    end if;
    v_parts := jsonb_build_array(jsonb_build_object('type', 'text', 'text', v_lines));
  elsif v_kind = 'use-answer' then
    if jsonb_typeof(p_intent->'questionId') is distinct from 'string' then
      raise exception 'an answer names its question' using errcode = '22023', detail = 'invalid-request';
    end if;
    if p_intent ? 'note' and jsonb_typeof(p_intent->'note') is distinct from 'string' then
      raise exception 'an answer names its note' using errcode = '22023', detail = 'invalid-request';
    end if;
    if p_intent ? 'answer' and jsonb_typeof(p_intent->'answer') not in ('string', 'null') then
      raise exception 'an answer names its wording' using errcode = '22023', detail = 'invalid-request';
    end if;
    begin
      v_qid := (p_intent->>'questionId')::uuid;
    exception
      when invalid_text_representation then
        raise exception 'an answer names its question' using errcode = '22023', detail = 'invalid-request';
    end;
    select q.body, s.title
      into v_body, v_title
      from public.prd_questions q
      join public.prd_sections s on s.id = q.section_id
     where q.project_id = p_project
       and q.id = v_qid
       and q.audience = 'ngo';
    if not found then
      raise exception 'that is not a question for the NGO' using errcode = '22023', detail = 'invalid-request';
    end if;
    select max(version) into v_version
      from public.prd_answers
     where project_id = p_project and question_id = v_qid;
    select a.body into v_given
      from public.prd_answers a
     where a.project_id = p_project
       and a.question_id = v_qid
       and a.version = v_version;
    v_note := coalesce(p_intent->>'note', '');
    select m.account_id into v_ngo_account
      from public.projects p
      join public.org_memberships m on m.org_id = p.org_id
      join public.accounts a on a.id = m.account_id
     where p.id = p_project
       and a.account_type = 'ngo'
       and a.lifecycle = 'active'
     order by m.account_id
     limit 1;
    v_ngo_first := split_part(public.prd_person_name(v_ngo_account, 'NGO'), ' ', 1);
    select count(*) into v_ngo_messages
      from public.prd_messages m
      join public.prd_chats c on c.id = m.chat_id
     where c.project_id = p_project
       and c.kind = 'side'
       and c.question_id = v_qid
       and m.actor_kind = 'ngo';
    v_rows := jsonb_build_array(
      jsonb_build_object('label', 'Question', 'text', v_body),
      jsonb_build_object('label', v_ngo_first || '’s answer', 'text', v_given)
    );
    if p_intent ? 'answer'
       and jsonb_typeof(p_intent->'answer') = 'string'
       and btrim(p_intent->>'answer') <> ''
       and btrim(p_intent->>'answer') is distinct from v_given then
      v_rows := v_rows || jsonb_build_array(
        jsonb_build_object('label', 'I changed it to', 'text', btrim(p_intent->>'answer'))
      );
    end if;
    v_rows := v_rows || jsonb_build_array(jsonb_build_object(
      'label', 'How the answer was reached',
      'text', 'Settled with the AI in ' || v_ngo_messages::text
        || case when v_ngo_messages = 1 then ' message' else ' messages' end
        || ', then marked complete.'
    ));
    if btrim(v_note) <> '' then
      v_rows := v_rows || jsonb_build_array(
        jsonb_build_object('label', 'My note', 'text', btrim(v_note))
      );
    end if;
    v_parts := jsonb_build_array(
      jsonb_build_object(
        'type', 'text',
        'text', 'I’m using ' || v_ngo_first || '’s answer for ' || v_title || '. Brief:'
      ),
      jsonb_build_object(
        'type', 'data-brief',
        'data', jsonb_build_object('questionId', v_qid, 'rows', v_rows)
      )
    );
    perform public.prd_answer_use(p_actor, p_project, v_qid, v_version, v_note);
    v_bumped := true;
  else
    raise exception 'a send names its intent' using errcode = '22023', detail = 'invalid-request';
  end if;
  perform public.prd_funds_admit(p_project);

  select conversation_revision into v_seen
    from public.prd_chats
   where id = v_chat
     for update;
  v_message := public.prd_insert_message(
    p_project,
    v_chat,
    v_role,
    public.prd_person_name(p_actor, case when v_role = 'dev' then 'Developer' else 'NGO' end),
    p_actor,
    v_parts,
    null
  );
  if v_question is not null and v_role = 'ngo' then
    update public.prd_questions
       set status = 'answering',
           row_revision = row_revision + 1
     where project_id = p_project
       and id = v_question
       and audience = 'ngo'
       and status = 'posted';
  end if;
  if v_bumped then
    select snapshot_sequence into v_sequence
      from public.prd_records
     where project_id = p_project;
  else
    update public.prd_records
       set snapshot_sequence = snapshot_sequence + 1
     where project_id = p_project
     returning snapshot_sequence into v_sequence;
  end if;
  v_turn := public.prd_turn_insert(
    p_project,
    v_chat,
    p_actor,
    v_request,
    v_hash,
    v_record.current_revision,
    v_seen,
    v_sequence,
    'reply',
    v_message
  );
  perform public.prd_hold(p_project, v_turn);
  return jsonb_build_object('turnId', v_turn, 'messageId', v_message, 'sequence', v_sequence);
end;
$$;

create or replace function public.prd_turn_finish(p_turn uuid, p_state text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_project uuid;
  v_state text;
  v_record_state text;
  v_sequence bigint;
begin
  if p_state not in ('answered', 'rejected', 'uncertain') then
    raise exception 'a turn finishes as answered, rejected, or uncertain'
      using errcode = '22023', detail = 'invalid-request';
  end if;
  select project_id into v_project
    from public.prd_turns
   where id = p_turn;
  if not found then
    raise exception 'that turn is not open' using errcode = '22023', detail = 'invalid-request';
  end if;
  select state into v_record_state
    from public.prd_records
   where project_id = v_project
     for update;
  if not found then
    raise exception 'the PRD is not open' using errcode = '22023', detail = 'invalid-request';
  end if;
  perform public.prd_refuse_unready(v_record_state);
  select state into v_state
    from public.prd_turns
   where id = p_turn
     for update;
  if not found then
    raise exception 'that turn is not open' using errcode = '22023', detail = 'invalid-request';
  end if;
  if v_state not in ('admitted', 'uncertain') then
    raise exception 'that turn already finished' using errcode = '22023', detail = 'stale';
  end if;
  update public.prd_turns
     set state = p_state,
         updated_at = clock_timestamp()
   where id = p_turn;
  perform public.prd_turn_release(p_turn);
  update public.prd_records
     set snapshot_sequence = snapshot_sequence + 1
   where project_id = v_project
   returning snapshot_sequence into v_sequence;
  return jsonb_build_object('turnId', p_turn, 'state', p_state, 'sequence', v_sequence);
end;
$$;

create or replace function public.prd_action(
  p_actor uuid,
  p_project uuid,
  p_kind text,
  p_token text,
  p_request_id text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_request text;
  v_token_kind text;
  v_target text;
  v_token_revision bigint;
  v_token_version bigint;
  v_record public.prd_records%rowtype;
  v_role text;
  v_needed text;
  v_action public.prd_actions%rowtype;
  v_question_id uuid;
  v_question public.prd_questions%rowtype;
  v_chat uuid;
  v_seen bigint;
  v_sequence bigint;
  v_turn uuid;
  v_result jsonb;
begin
  perform public.assert_account_active(p_actor);
  if btrim(coalesce(p_request_id, '')) = '' then
    raise exception 'an action names its request' using errcode = '22023', detail = 'invalid-request';
  end if;
  v_request := btrim(p_request_id);
  if p_token is null or p_token !~ '^[^|]+\|[^|]+\|[0-9]+\|[0-9]+$' then
    raise exception 'this action could not be read' using errcode = '22023', detail = 'invalid-request';
  end if;
  v_token_kind := split_part(p_token, '|', 1);
  v_target := split_part(p_token, '|', 2);
  begin
    v_token_revision := split_part(p_token, '|', 3)::bigint;
    v_token_version := split_part(p_token, '|', 4)::bigint;
  exception
    when numeric_value_out_of_range then
      raise exception 'this action could not be read' using errcode = '22023', detail = 'invalid-request';
  end;
  if v_token_kind is distinct from p_kind
     or p_kind not in (
       'post-question', 'complete-answer', 'confirm-topic', 'reopen-topic',
       'close', 'close-anyway', 'keep-working'
     ) then
    raise exception 'this action could not be read' using errcode = '22023', detail = 'invalid-request';
  end if;

  select * into v_record
    from public.prd_records
   where project_id = p_project
     for update;
  if not found then
    raise exception 'the PRD is not open' using errcode = '22023', detail = 'invalid-request';
  end if;
  perform public.prd_refuse_unready(v_record.state);

  v_role := public.prd_role(p_project, p_actor);
  if v_role is null then
    raise exception 'this account has no role on the PRD'
      using errcode = '42501', detail = 'forbidden';
  end if;
  v_needed := case when p_kind = 'complete-answer' then 'ngo' else 'dev' end;
  if v_role is distinct from v_needed then
    raise exception 'this account cannot take that action'
      using errcode = '42501', detail = 'forbidden';
  end if;
  if v_record.closed_revision is not null then
    raise exception 'the PRD is closed' using errcode = '42501', detail = 'closed';
  end if;

  select * into v_action
    from public.prd_actions
   where project_id = p_project
     and request_id = v_request;
  if found then
    if v_action.actor_id is distinct from p_actor or v_action.kind is distinct from p_kind then
      raise exception 'that request was already used' using errcode = '22023', detail = 'invalid-request';
    end if;
    return v_action.result;
  end if;
  if exists (
    select 1 from public.prd_turns
     where project_id = p_project and request_id = v_request
  ) then
    raise exception 'that request was already used' using errcode = '22023', detail = 'invalid-request';
  end if;

  if p_kind = 'post-question' then
    v_question_id := public.prd_question_target(v_target);
    if v_token_revision is distinct from v_record.current_revision then
      raise exception 'the question changed since this was offered'
        using errcode = '22023', detail = 'stale';
    end if;
    v_result := public.prd_question_post(p_actor, p_project, v_question_id, v_token_version);
  elsif p_kind = 'complete-answer' then
    v_question_id := public.prd_question_target(v_target);
    select * into v_question
      from public.prd_questions
     where project_id = p_project
       and id = v_question_id
       and audience = 'ngo'
       for update;
    if not found then
      raise exception 'that is not a question for the NGO' using errcode = '22023', detail = 'invalid-request';
    end if;
    if v_question.status is distinct from 'answering'
       or v_question.row_revision is distinct from v_token_version
       or v_token_revision is distinct from v_record.current_revision then
      raise exception 'the question changed since this was offered'
        using errcode = '22023', detail = 'stale';
    end if;
    if exists (
      select 1
        from public.prd_followups
       where question_id = v_question.id
         and resolving_message is null
    ) then
      raise exception 'a follow-up is still open' using errcode = '22023', detail = 'follow-up-open';
    end if;
    select id, conversation_revision into v_chat, v_seen
      from public.prd_chats
     where project_id = p_project
       and kind = 'side'
       and question_id = v_question.id
       for update;
    if v_chat is null or not exists (
      select 1
        from public.prd_messages
       where chat_id = v_chat
         and actor_kind = 'ngo'
    ) then
      raise exception 'write your answer first' using errcode = '22023', detail = 'invalid-request';
    end if;
    if exists (
      select 1
        from public.prd_turns
       where chat_id = v_chat
         and state in ('admitted', 'uncertain')
    ) then
      raise exception 'the AI is still answering in this chat' using errcode = '22023', detail = 'busy';
    end if;
    perform public.prd_funds_admit(p_project);
    update public.prd_questions
       set row_revision = row_revision + 1
     where id = v_question.id;
    update public.prd_records
       set snapshot_sequence = snapshot_sequence + 1
     where project_id = p_project
     returning snapshot_sequence into v_sequence;
    v_turn := public.prd_turn_insert(
      p_project,
      v_chat,
      p_actor,
      v_request,
      p_token,
      v_record.current_revision,
      v_seen,
      v_sequence,
      'answer-write',
      null
    );
    perform public.prd_hold(p_project, v_turn);
    v_result := jsonb_build_object('turnId', v_turn, 'messageId', null, 'sequence', v_sequence);
  elsif p_kind in ('confirm-topic', 'reopen-topic') then
    v_result := public.prd_section_transition(
      p_project,
      p_kind,
      v_target,
      v_token_revision,
      v_record.current_revision
    );
  else
    raise exception 'that action is not available yet' using errcode = '22023', detail = 'not-yet';
  end if;

  insert into public.prd_actions (project_id, actor_id, request_id, kind, result)
  values (p_project, p_actor, v_request, p_kind, v_result);
  return v_result;
end;
$$;

create or replace function public.prd_facts(p_actor uuid, p_project uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_facts jsonb;
  v_role text;
  v_chat jsonb;
  v_chats jsonb := '[]'::jsonb;
  v_section jsonb;
  v_sections jsonb := '[]'::jsonb;
  v_revision bigint;
  v_closed bigint;
  v_state text;
  v_key text;
  v_deps_ok boolean;
  v_confirm_ok boolean;
  v_reopen_ok boolean;
  v_funds jsonb;
  v_funded boolean;
  v_access jsonb;
  v_question jsonb;
  v_questions jsonb := '[]'::jsonb;
begin
  v_facts := public.prd_record_facts(p_actor, p_project);
  v_role := v_facts #>> '{viewer,role}';
  v_facts := v_facts || public.prd_question_facts(p_project, v_role);
  v_revision := (v_facts->>'revision')::bigint;
  v_closed := (v_facts->>'closedRevision')::bigint;
  for v_section in
    select value
      from jsonb_array_elements(coalesce(v_facts->'sections', '[]'::jsonb)) as value
  loop
    v_key := v_section->>'key';
    v_state := v_section->>'state';
    select not exists (
      select 1
        from public.prd_sections self
        join public.prd_sections dep
          on dep.project_id = self.project_id
         and dep.stable_key = any (self.dependencies)
       where self.project_id = p_project
         and self.stable_key = v_key
         and dep.state not in ('ready', 'confirmed')
    ) into v_deps_ok;
    v_confirm_ok := v_role = 'dev' and v_closed is null and v_state = 'ready' and coalesce(v_deps_ok, false);
    v_reopen_ok := v_role = 'dev' and v_closed is null and v_state = 'confirmed';
    v_sections := v_sections || jsonb_build_array(
      v_section || jsonb_build_object(
        'confirm', jsonb_build_object(
          'allowed', v_confirm_ok,
          'reason', case
            when v_role <> 'dev' then 'forbidden'
            when v_closed is not null then 'closed'
            when v_state is distinct from 'ready' or not coalesce(v_deps_ok, false) then 'not-ready'
            else null
          end,
          'token', case
            when v_confirm_ok
            then 'confirm-topic|topic:' || v_key || '|' || v_revision::text || '|0'
            else null
          end
        ),
        'reopen', jsonb_build_object(
          'allowed', v_reopen_ok,
          'reason', case
            when v_role <> 'dev' then 'forbidden'
            when v_closed is not null then 'closed'
            when v_state is distinct from 'confirmed' then 'not-confirmed'
            else null
          end,
          'token', case
            when v_reopen_ok
            then 'reopen-topic|topic:' || v_key || '|' || v_revision::text || '|0'
            else null
          end
        )
      )
    );
  end loop;
  v_facts := jsonb_set(v_facts, '{sections}', v_sections);
  v_funds := public.prd_funds(p_project);
  v_funded := (v_funds->>'replyFunded')::boolean;
  for v_chat in
    select value
      from jsonb_array_elements(coalesce(v_facts->'chats', '[]'::jsonb)) as value
  loop
    v_access := public.prd_chat_availability(p_project, v_role, v_chat->>'key');
    if not v_funded and coalesce((v_access #>> '{send,allowed}')::boolean, false) then
      v_access := jsonb_set(
        v_access,
        '{send}',
        jsonb_build_object('allowed', false, 'block', 'funds', 'reason', 'funds')
      );
    end if;
    v_chats := v_chats || jsonb_build_array(v_chat || v_access);
  end loop;
  v_facts := jsonb_set(v_facts, '{chats}', v_chats);
  if not v_funded then
    for v_question in
      select value
        from jsonb_array_elements(coalesce(v_facts->'questions', '[]'::jsonb)) as value
    loop
      if coalesce((v_question #>> '{complete,allowed}')::boolean, false) then
        v_question := jsonb_set(
          v_question,
          '{complete}',
          jsonb_build_object('allowed', false, 'reason', 'funds', 'token', null)
        );
      end if;
      if coalesce((v_question #>> '{use,allowed}')::boolean, false) then
        v_question := jsonb_set(
          v_question,
          '{use}',
          jsonb_build_object('allowed', false, 'reason', 'funds')
        );
      end if;
      v_questions := v_questions || jsonb_build_array(v_question);
    end loop;
    v_facts := jsonb_set(v_facts, '{questions}', v_questions);
  end if;
  return v_facts || jsonb_build_object('funds', v_funds);
end;
$$;

revoke execute on function public.prd_service_model()
  from public, anon, authenticated, service_role;
revoke execute on function public.prd_micros(numeric)
  from public, anon, authenticated, service_role;
revoke execute on function public.prd_money_value(text)
  from public, anon, authenticated, service_role;
revoke execute on function public.prd_rate(text, integer, text, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.prd_turn_spend(uuid)
  from public, anon, authenticated, service_role;
revoke execute on function public.prd_funds(uuid)
  from public, anon, authenticated, service_role;
revoke execute on function public.prd_funds_admit(uuid)
  from public, anon, authenticated, service_role;
revoke execute on function public.prd_hold(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke execute on function public.prd_adjust(uuid, text, numeric, numeric)
  from public, anon, authenticated, service_role;
revoke execute on function public.prd_turn_release(uuid)
  from public, anon, authenticated, service_role;
revoke execute on function public.prd_usage_count(jsonb, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.prd_event_text(jsonb, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.prd_session_bind(uuid, uuid, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.prd_settle_event(uuid, bigint, bigint, bigint, bigint)
  from public, anon, authenticated, service_role;
revoke execute on function public.prd_event_result(uuid)
  from public, anon, authenticated, service_role;
revoke execute on function public.prd_runtime_result(uuid)
  from public, anon, authenticated, service_role;
revoke execute on function public.prd_end_result(uuid)
  from public, anon, authenticated, service_role;

revoke execute on function public.prd_fund_credit(uuid, numeric, text)
  from public, anon, authenticated, service_role;
grant execute on function public.prd_fund_credit(uuid, numeric, text) to service_role;
revoke execute on function public.prd_turn_ingest(uuid, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.prd_turn_ingest(uuid, jsonb) to service_role;
revoke execute on function public.prd_session_budget(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.prd_session_budget(uuid) to service_role;
revoke execute on function public.prd_ledger(uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.prd_ledger(uuid, uuid) to service_role;
revoke execute on function public.prd_turn_settings_record(uuid, text, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.prd_turn_settings_record(uuid, text, jsonb) to service_role;

revoke execute on function public.prd_turn_reserve(uuid, uuid, text, text, bigint, jsonb, text)
  from public, anon, authenticated, service_role;
grant execute on function public.prd_turn_reserve(uuid, uuid, text, text, bigint, jsonb, text)
  to service_role;
revoke execute on function public.prd_turn_finish(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.prd_turn_finish(uuid, text) to service_role;
revoke execute on function public.prd_action(uuid, uuid, text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.prd_action(uuid, uuid, text, text, text) to service_role;
revoke execute on function public.prd_facts(uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.prd_facts(uuid, uuid) to service_role;

notify pgrst, 'reload schema';

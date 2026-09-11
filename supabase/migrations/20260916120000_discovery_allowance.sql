-- Discovery spend ledger: one row per organisation per UTC day. granted is the high-water mark.
-- remaining is never stored; it is granted - spent.

create table public.discovery_spend (
  org_id       uuid    not null references public.organizations (id) on delete cascade,
  utc_day      date    not null,
  spent        integer not null default 0,
  granted      integer not null,
  primary key (org_id, utc_day),
  constraint discovery_spend_non_negative check (spent >= 0),
  constraint discovery_spend_granted_positive check (granted > 0),
  constraint discovery_spend_within_grant check (spent <= granted)
);

revoke all on table public.discovery_spend
  from anon, authenticated, service_role;

alter table public.discovery_spend enable row level security;

create function public.discovery_daily_grant(p_vetted boolean)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case when p_vetted then 30 else 10 end;
$$;

revoke execute on function public.discovery_daily_grant(boolean)
  from public, anon, authenticated, service_role;

create function public.apply_discovery_grant_mark(
  p_organization_id uuid,
  p_utc_day date,
  p_vetted boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.discovery_spend (org_id, utc_day, spent, granted)
  values (
    p_organization_id,
    p_utc_day,
    0,
    public.discovery_daily_grant(p_vetted)
  )
  on conflict (org_id, utc_day) do update
    set granted = greatest(public.discovery_spend.granted, excluded.granted);
end;
$$;

revoke execute on function public.apply_discovery_grant_mark(uuid, date, boolean)
  from public, anon, authenticated, service_role;

create function public.discovery_allowance(
  p_account_id uuid,
  p_organization_id uuid,
  p_action text,
  p_credits integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.org_role;
  v_utc_day date;
  v_vetted boolean;
  v_spent integer;
  v_granted integer;
  v_remaining integer;
  v_confirmed timestamptz;
begin
  perform public.assert_account_active(p_account_id);

  -- A share lock is enough: this function does not write the organisation row. Writers of
  -- vetting take FOR UPDATE on the same row and wait. The debit path serialises on the spend row.
  perform 1 from public.organizations where id = p_organization_id for share;
  if not found then
    raise exception 'discovery_allowance refuses %: no such organisation', p_organization_id
      using errcode = '23503', detail = 'no-such-organisation';
  end if;

  select role into v_role
    from public.org_memberships
   where org_id = p_organization_id
     and account_id = p_account_id
     for share;
  if v_role is null then
    raise exception
      'discovery_allowance refuses %: the caller holds no membership in organisation % — membership is held per organisation',
      p_account_id, p_organization_id
      using errcode = '42501', detail = 'not-a-member';
  end if;
  if v_role <> 'admin' then
    raise exception
      'discovery_allowance refuses %: the caller holds the % role in organisation % — the admin role is held per organisation',
      p_account_id, v_role, p_organization_id
      using errcode = '42501', detail = 'not-an-admin';
  end if;

  -- C1: take the UTC day after the organisation row is locked, never from now() and never from
  -- transaction start. A transaction that began before midnight can take its lock after midnight;
  -- now() would then charge the spend to the previous day.
  v_utc_day := (clock_timestamp() at time zone 'utc')::date;

  select vetted into v_vetted from public.org_vetting where org_id = p_organization_id;
  if not found then
    v_vetted := false;
  end if;

  if p_action is distinct from 'read' and p_action is distinct from 'debit' then
    raise exception 'discovery_allowance refuses an action that is not read or debit'
      using errcode = '22023', detail = 'invalid-request';
  end if;

  if p_action = 'read' then
    if p_credits is not null then
      raise exception 'discovery_allowance refuses a read that carries a credit amount'
        using errcode = '22023', detail = 'invalid-request';
    end if;

    select spent, granted into v_spent, v_granted
      from public.discovery_spend
     where org_id = p_organization_id
       and utc_day = v_utc_day;

    if not found then
      v_spent := 0;
      v_granted := public.discovery_daily_grant(v_vetted);
    else
      v_granted := greatest(v_granted, public.discovery_daily_grant(v_vetted));
    end if;

    return jsonb_build_object(
      'organization_id', p_organization_id,
      'utc_day', to_char(v_utc_day, 'YYYY-MM-DD'),
      'vetted', v_vetted,
      'daily_grant', v_granted,
      'spent_today', v_spent,
      'remaining', v_granted - v_spent
    );
  end if;

  select email_confirmed_at into v_confirmed from auth.users where id = p_account_id;
  if v_confirmed is null then
    raise exception 'discovery_allowance refuses %: the caller''s email address is not verified', p_account_id
      using errcode = '42501', detail = 'email-unverified';
  end if;

  if p_credits is null or p_credits <= 0 then
    raise exception 'discovery_allowance refuses a debit that is not a positive whole number of credits'
      using errcode = '22023', detail = 'invalid-credit-amount';
  end if;

  perform public.apply_discovery_grant_mark(p_organization_id, v_utc_day, v_vetted);

  select spent, granted into v_spent, v_granted
    from public.discovery_spend
   where org_id = p_organization_id
     and utc_day = v_utc_day
     for update;

  -- Compare the debit against what remains. Adding spent + credits overflows a 32-bit integer
  -- (a debit of 2147483647 after one credit is spent raises "integer out of range").
  v_remaining := v_granted - v_spent;

  if v_remaining <= 0 then
    if v_vetted then
      -- The get-vetted remedy is dropped for a vetted caller: that caller has already taken it.
      raise exception
        'discovery_allowance refuses: organisation % has no Discovery credits left today — fund project fuel to continue now, or wait for the next UTC day',
        p_organization_id
        using errcode = 'P0001', detail = 'daily-allowance-exhausted';
    else
      raise exception
        'discovery_allowance refuses: organisation % has no Discovery credits left today — get vetted (daily grant becomes %), fund project fuel to continue now, or wait for the next UTC day',
        p_organization_id,
        public.discovery_daily_grant(true)
        using errcode = 'P0001', detail = 'daily-allowance-exhausted';
    end if;
  end if;

  if p_credits > v_remaining then
    raise exception
      'discovery_allowance refuses: organisation % still has % Discovery credits remaining today — this debit is larger than what remains',
      p_organization_id,
      v_remaining
      using errcode = 'P0001', detail = 'debit-exceeds-remaining';
  end if;

  update public.discovery_spend
     set spent = spent + p_credits
   where org_id = p_organization_id
     and utc_day = v_utc_day
   returning spent, granted into v_spent, v_granted;

  return jsonb_build_object(
    'organization_id', p_organization_id,
    'utc_day', to_char(v_utc_day, 'YYYY-MM-DD'),
    'vetted', v_vetted,
    'daily_grant', v_granted,
    'spent_today', v_spent,
    'remaining', v_granted - v_spent
  );
end;
$$;

revoke execute on function public.discovery_allowance(uuid, uuid, text, integer)
  from public, anon, authenticated, service_role;

grant execute on function public.discovery_allowance(uuid, uuid, text, integer)
  to service_role;

notify pgrst, 'reload schema';

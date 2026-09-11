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

-- High-water mark for the day's row: granted := greatest(granted, dailyGrantFor(currentTier)).
-- The first row of a new UTC day is inserted with granted = dailyGrantFor(tier) and spent = 0.
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
  v_confirmed timestamptz;
begin
  perform public.assert_account_active(p_account_id);

  perform 1 from public.organizations where id = p_organization_id for update;
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

  if v_spent + p_credits > v_granted then
    raise exception
      'discovery_allowance refuses: organisation % has no Discovery credits left today — get vetted (daily grant becomes %), fund project fuel to continue now, or wait for the next UTC day',
      p_organization_id,
      public.discovery_daily_grant(true)
      using errcode = 'P0001', detail = 'daily-allowance-exhausted';
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

-- The mark update joins the existing vetting transaction. Insertion, not a rewrite of the action.
create or replace function public.set_organization_vetting(
  p_account_id uuid,
  p_organization_id uuid,
  p_action text,
  p_notice jsonb,
  p_organization_name text default null,
  p_public_reference_url text default null,
  p_contact_name text default null,
  p_contact_title text default null,
  p_authority_attestation text default null,
  p_evidence_type text default null,
  p_note text default null,
  p_registration_received_at timestamptz default null,
  p_registration_document_count integer default null,
  p_registration_copies_deleted boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_type public.account_type;
  v_note text;
  v_name text;
  v_url text;
  v_contact_name text;
  v_contact_title text;
  v_attestation text;
  v_evidence_type text;
  v_previous public.org_vetting;
  v_has_previous boolean;
  v_previous_vetted boolean;
  v_holder uuid;
  v_email text;
  v_current public.org_vetting;
  v_notification_event_id uuid := null;
  v_channels jsonb;
  v_channel text;
  v_deliveries jsonb;
  v_subject text;
  v_body text;
  v_outcome text;
  v_utc_day date;
begin
  perform public.assert_account_active(p_account_id);

  select account_type into v_caller_type from public.accounts where id = p_account_id;
  if v_caller_type is null then
    raise exception 'set_organization_vetting refuses %: no account has completed signup for this user', p_account_id
      using errcode = '42501', detail = 'no-account';
  end if;
  if v_caller_type <> 'platform_admin' then
    raise exception 'set_organization_vetting refuses account type %: only a platform administrator records a vetting action', v_caller_type
      using errcode = '42501', detail = 'not-a-platform-admin';
  end if;

  if p_action is distinct from 'vet' and p_action is distinct from 'unvet' then
    raise exception 'set_organization_vetting refuses an action that is not vet or unvet'
      using errcode = '22023', detail = 'invalid-request';
  end if;

  v_note := btrim(p_note, E' \t\r\n\f');
  if v_note is null or v_note = '' then
    raise exception 'set_organization_vetting refuses a vetting action with no note'
      using errcode = '22023', detail = 'invalid-request';
  end if;

  perform 1 from public.organizations where id = p_organization_id for update;
  if not found then
    raise exception 'set_organization_vetting refuses %: no such organisation', p_organization_id
      using errcode = '23503', detail = 'no-such-organisation';
  end if;

  select * into v_previous
    from public.org_vetting
   where org_id = p_organization_id
     for update;
  v_has_previous := found;
  v_previous_vetted := v_has_previous and v_previous.vetted;

  select account_id into v_holder
    from public.org_memberships
   where org_id = p_organization_id
     for share;
  if v_holder is null then
    raise exception 'set_organization_vetting refuses %: the organisation has no seat holder', p_organization_id
      using errcode = '42501', detail = 'refused';
  end if;

  select email into v_email from auth.users where id = v_holder;
  if v_email is null or btrim(v_email, E' \t\r\n\f') = '' then
    raise exception 'set_organization_vetting refuses %: the seat holder has no email address', v_holder
      using errcode = '42501', detail = 'refused';
  end if;

  if p_action = 'unvet' then
    if not v_previous_vetted then
      return jsonb_build_object(
        'organization_id', p_organization_id,
        'vetted', false,
        'changed', false,
        'notification_event_id', v_notification_event_id
      );
    end if;

    update public.org_vetting
       set vetted = false
     where org_id = p_organization_id
     returning * into v_current;
  else
    v_name := btrim(p_organization_name, E' \t\r\n\f');
    v_url := btrim(p_public_reference_url, E' \t\r\n\f');
    v_contact_name := btrim(p_contact_name, E' \t\r\n\f');
    v_contact_title := btrim(p_contact_title, E' \t\r\n\f');
    v_attestation := btrim(p_authority_attestation, E' \t\r\n\f');
    v_evidence_type := btrim(p_evidence_type, E' \t\r\n\f');

    if v_name is null or v_name = ''
       or v_url is null or v_url = ''
       or v_contact_name is null or v_contact_name = ''
       or v_contact_title is null or v_contact_title = ''
       or v_attestation is null or v_attestation = ''
       or v_evidence_type is null or v_evidence_type = '' then
      raise exception 'set_organization_vetting refuses a vet with a mandated field absent'
        using errcode = '22023', detail = 'invalid-request';
    end if;

    if v_url !~ '^https?://[^[:space:]]+$' then
      raise exception 'set_organization_vetting refuses a public reference link that is not an http or https URL'
        using errcode = '22023', detail = 'invalid-request';
    end if;

    if v_evidence_type not in (
      'public_registry',
      'organization_website',
      'ein',
      'emailed_registration_documents'
    ) then
      raise exception 'set_organization_vetting refuses evidence type %', v_evidence_type
        using errcode = '22023', detail = 'invalid-evidence';
    end if;

    if v_evidence_type = 'emailed_registration_documents' then
      if p_registration_received_at is null
         or p_registration_document_count is null
         or p_registration_document_count <= 0
         or p_registration_copies_deleted is not true then
        raise exception 'set_organization_vetting refuses emailed registration documents without their metadata'
          using errcode = '22023', detail = 'invalid-evidence';
      end if;
    elsif p_registration_received_at is not null
       or p_registration_document_count is not null
       or p_registration_copies_deleted is not null then
      raise exception 'set_organization_vetting refuses registration document metadata on evidence type %', v_evidence_type
        using errcode = '22023', detail = 'invalid-evidence';
    end if;

    insert into public.org_vetting (
      org_id,
      vetted,
      vetted_by_account_id,
      vetted_at,
      organization_name,
      public_reference_url,
      contact_name,
      contact_title,
      authority_attestation,
      evidence_type,
      note,
      registration_received_at,
      registration_document_count,
      registration_copies_deleted
    )
    values (
      p_organization_id,
      true,
      p_account_id,
      now(),
      v_name,
      v_url,
      v_contact_name,
      v_contact_title,
      v_attestation,
      v_evidence_type,
      v_note,
      p_registration_received_at,
      p_registration_document_count,
      p_registration_copies_deleted
    )
    on conflict (org_id) do update
       set vetted = excluded.vetted,
           vetted_by_account_id = excluded.vetted_by_account_id,
           vetted_at = excluded.vetted_at,
           organization_name = excluded.organization_name,
           public_reference_url = excluded.public_reference_url,
           contact_name = excluded.contact_name,
           contact_title = excluded.contact_title,
           authority_attestation = excluded.authority_attestation,
           evidence_type = excluded.evidence_type,
           note = excluded.note,
           registration_received_at = excluded.registration_received_at,
           registration_document_count = excluded.registration_document_count,
           registration_copies_deleted = excluded.registration_copies_deleted
    returning * into v_current;
  end if;

  -- C1: take the UTC day after the organisation row is locked (the FOR UPDATE above), never from
  -- now() and never from transaction start. A transaction that began before midnight can take its
  -- lock after midnight; now() would then charge the spend to the previous day.
  v_utc_day := (clock_timestamp() at time zone 'utc')::date;
  -- The mark takes the HIGHER of the tier before this action and the tier after it. An unvet on a
  -- day with no row yet would otherwise write the unverified grant and take away credits the
  -- organisation already held today, which the founder's ruling of 2026-09-09 forbids.
  perform public.apply_discovery_grant_mark(
    p_organization_id,
    v_utc_day,
    v_previous_vetted or v_current.vetted
  );

  perform public.append_audit_event(
    'org_vetting_changed',
    p_account_id,
    null,
    p_organization_id,
    v_note,
    jsonb_build_object(
      'action', p_action,
      'previous_vetted', v_previous_vetted,
      'current', jsonb_build_object(
        'org_id', v_current.org_id,
        'vetted', v_current.vetted,
        'vetted_by_account_id', v_current.vetted_by_account_id,
        'vetted_at', v_current.vetted_at,
        'organization_name', v_current.organization_name,
        'public_reference_url', v_current.public_reference_url,
        'contact_name', v_current.contact_name,
        'contact_title', v_current.contact_title,
        'authority_attestation', v_current.authority_attestation,
        'evidence_type', v_current.evidence_type,
        'note', v_current.note,
        'registration_received_at', v_current.registration_received_at,
        'registration_document_count', v_current.registration_document_count,
        'registration_copies_deleted', v_current.registration_copies_deleted
      )
    )
  );

  if p_notice is null or jsonb_typeof(p_notice) is distinct from 'object' then
    raise exception 'set_organization_vetting refuses a vetting action with no notification notice'
      using errcode = '22023', detail = 'invalid-request';
  end if;

  v_channels := p_notice->'channels';
  if jsonb_typeof(v_channels) is distinct from 'array' or jsonb_array_length(v_channels) = 0 then
    raise exception 'set_organization_vetting refuses a notice with no delivery channels'
      using errcode = '22023', detail = 'invalid-request';
  end if;

  v_subject := p_notice->'copy'->>'subject';
  v_body := p_notice->'copy'->>'body';
  if v_subject is null or v_body is null then
    raise exception 'set_organization_vetting refuses a notice with no copy'
      using errcode = '22023', detail = 'invalid-request';
  end if;

  v_outcome := case when v_current.vetted then 'vetted' else 'unvetted' end;
  v_deliveries := '[]'::jsonb;
  for v_channel in select jsonb_array_elements_text(v_channels) loop
    v_deliveries := v_deliveries || jsonb_build_object(
      'role', 'ngo',
      'recipientId', v_holder,
      'address', v_email,
      'channel', v_channel,
      'emittedBy', 'notifications.emitter',
      'payload', jsonb_build_object('outcome', v_outcome),
      'subject', v_subject,
      'body', v_body
    );
  end loop;

  if jsonb_array_length(v_deliveries) = 0 then
    raise exception 'set_organization_vetting refuses an empty delivery set'
      using errcode = '22023', detail = 'invalid-request';
  end if;

  v_notification_event_id := public.emit_notification(jsonb_build_object(
    'event', jsonb_build_object(
      'event', 'vetting.outcome',
      'actor', p_account_id,
      'payload', jsonb_build_object('outcome', v_outcome),
      'recipients', jsonb_build_array(jsonb_build_object(
        'role', 'ngo',
        'recipientId', v_holder,
        'address', v_email,
        'channels', v_channels
      ))
    ),
    'deliveries', v_deliveries,
    'opsItem', null
  ));

  return jsonb_build_object(
    'organization_id', p_organization_id,
    'vetted', v_current.vetted,
    'changed', true,
    'notification_event_id', v_notification_event_id
  );
end;
$$;

revoke execute on function public.set_organization_vetting(
  uuid, uuid, text, jsonb, text, text, text, text,
  text, text, text, timestamptz, integer, boolean
) from public, anon, authenticated, service_role;

grant execute on function public.set_organization_vetting(
  uuid, uuid, text, jsonb, text, text, text, text,
  text, text, text, timestamptz, integer, boolean
) to service_role;

notify pgrst, 'reload schema';

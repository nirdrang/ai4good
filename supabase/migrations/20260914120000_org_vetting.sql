-- The vetting aggregate: one row per organisation after the first vet, every mandated field a
-- not-null column with a populated check, and the one platform-admin definer that writes it.

-- The audit writer gains the instant of the action. An action that takes its row lock after
-- midnight must record one instant everywhere: the aggregate, the audit row and the UTC day of
-- the grant mark. Without this argument the audit row would take now(), which is transaction
-- start, and could name the previous day. The argument defaults to null, so every existing
-- six-argument caller keeps its behaviour and none of them changes.
--
-- This is a forward migration. The earlier migration that created this function is merged and
-- is never edited in place.
drop function if exists public.append_audit_event(public.audit_event_kind, uuid, uuid, uuid, text, jsonb);

create function public.append_audit_event(
  p_kind public.audit_event_kind,
  p_actor uuid,
  p_subject_account uuid,
  p_subject_org uuid,
  p_reason text,
  p_detail jsonb,
  p_occurred_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_label text;
begin
  if p_actor is null then
    v_label := 'operator';
  else
    select a.account_type::text || ':' || a.id::text
      into v_label
      from public.accounts a
     where a.id = p_actor;
    if v_label is null then
      v_label := 'operator';
    end if;
  end if;

  insert into public.audit_events
    (event_kind, actor_account_id, actor_label, subject_account_id, subject_org_id, reason, detail, occurred_at)
  values (
    p_kind,
    p_actor,
    v_label,
    p_subject_account,
    p_subject_org,
    p_reason,
    coalesce(p_detail, '{}'::jsonb),
    coalesce(p_occurred_at, now())
  );
end;
$$;
revoke execute on function public.append_audit_event(public.audit_event_kind, uuid, uuid, uuid, text, jsonb, timestamptz) from public;

create table public.org_vetting (
  org_id uuid primary key
    references public.organizations(id) on delete cascade,

  vetted boolean not null,

  vetted_by_account_id uuid not null
    references public.accounts(id) on delete restrict,
  vetted_at timestamptz not null,

  organization_name text not null,
  public_reference_url text not null,
  contact_name text not null,
  contact_title text not null,
  authority_attestation text not null,
  evidence_type text not null,
  note text not null,

  registration_received_at timestamptz,
  registration_document_count integer,
  registration_copies_deleted boolean,

  constraint org_vetting_name_populated
    check (organization_name ~ '[^[:space:]]'),

  constraint org_vetting_reference_url
    check (
      public_reference_url ~ '^https?://[^[:space:]]+$'
    ),

  constraint org_vetting_contact_name_populated
    check (contact_name ~ '[^[:space:]]'),

  constraint org_vetting_contact_title_populated
    check (contact_title ~ '[^[:space:]]'),

  constraint org_vetting_attestation_populated
    check (authority_attestation ~ '[^[:space:]]'),

  constraint org_vetting_evidence_type
    check (
      evidence_type in (
        'public_registry',
        'organization_website',
        'ein',
        'emailed_registration_documents'
      )
    ),

  constraint org_vetting_note_populated
    check (note ~ '[^[:space:]]'),

  -- Rejecting attachments and storing only metadata cannot prove a document was deleted from
  -- the founder's mailbox.
  constraint org_vetting_registration_metadata
    check (
      (
        evidence_type = 'emailed_registration_documents'
        and registration_received_at is not null
        and registration_document_count is not null
        and registration_document_count > 0
        and registration_copies_deleted is true
      )
      or
      (
        evidence_type <> 'emailed_registration_documents'
        and registration_received_at is null
        and registration_document_count is null
        and registration_copies_deleted is null
      )
    )
);

revoke all on table public.org_vetting
  from anon, authenticated, service_role;

alter table public.org_vetting enable row level security;

create function public.set_organization_vetting(
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
  v_authorized jsonb;
  v_channel text;
  v_deliveries jsonb;
  v_subject text;
  v_body text;
  v_outcome text;
  v_org_display_name text;
  v_seat_count integer;
  v_recorded_at timestamptz;
  v_utc_day date;
  v_payload jsonb;
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

  select name into v_org_display_name
    from public.organizations
   where id = p_organization_id
     for update;
  if not found then
    raise exception 'set_organization_vetting refuses %: no such organisation', p_organization_id
      using errcode = '23503', detail = 'no-such-organisation';
  end if;

  -- The action is recorded at this instant: clock_timestamp() taken after the organisation
  -- row lock. now() is transaction start and can be a previous UTC day when the lock is
  -- acquired after midnight. The aggregate's vetted_at, the audit row's occurred_at, and
  -- the grant-mark UTC day all use this value.
  v_recorded_at := clock_timestamp();
  v_utc_day := (v_recorded_at at time zone 'utc')::date;

  select * into v_previous
    from public.org_vetting
   where org_id = p_organization_id
     for update;
  v_has_previous := found;
  v_previous_vetted := v_has_previous and v_previous.vetted;

  perform 1 from public.org_memberships where org_id = p_organization_id for share;
  select count(*) into v_seat_count
    from public.org_memberships
   where org_id = p_organization_id;
  if v_seat_count = 0 then
    raise exception 'set_organization_vetting refuses %: the organisation has no seat holder', p_organization_id
      using errcode = '42501', detail = 'refused';
  end if;
  if v_seat_count > 1 then
    raise exception 'set_organization_vetting refuses %: the organisation has more than one seat holder', p_organization_id
      using errcode = '42501', detail = 'refused';
  end if;
  select account_id into v_holder
    from public.org_memberships
   where org_id = p_organization_id;

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
  end if;

  if p_notice is null or jsonb_typeof(p_notice) is distinct from 'object' then
    raise exception 'set_organization_vetting refuses a vetting action with no notification notice'
      using errcode = '22023', detail = 'invalid-request';
  end if;

  v_subject := p_notice->'copy'->>'subject';
  v_body := p_notice->'copy'->>'body';
  if v_subject is null or v_body is null then
    raise exception 'set_organization_vetting refuses a notice with no copy'
      using errcode = '22023', detail = 'invalid-request';
  end if;

  -- Decision class default, the same set DEFAULT_BY_CLASS.decision names in
  -- notification-taxonomy.ts. The definer derives the delivery set from that default
  -- and refuses a caller list that is not exactly it, before any write.
  v_authorized := '["email", "inapp"]'::jsonb;
  v_channels := p_notice->'channels';
  if jsonb_typeof(v_channels) is distinct from 'array' or jsonb_array_length(v_channels) = 0 then
    raise exception 'set_organization_vetting refuses a notice with no delivery channels'
      using errcode = '22023', detail = 'invalid-request';
  end if;
  if exists (
        select 1 from jsonb_array_elements_text(v_channels) as supplied(channel)
        where supplied.channel not in ('email', 'inapp')
      )
      or exists (
        select 1 from jsonb_array_elements_text(v_authorized) as authorised(channel)
        where not exists (
          select 1 from jsonb_array_elements_text(v_channels) as supplied(channel)
          where supplied.channel = authorised.channel
        )
      ) then
    raise exception 'set_organization_vetting refuses a notice whose channels are not the class default'
      using errcode = '22023', detail = 'invalid-request';
  end if;
  v_channels := v_authorized;

  if p_action = 'unvet' then
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
      v_recorded_at,
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
    ),
    v_recorded_at
  );

  v_outcome := case when v_current.vetted then 'vetted' else 'unvetted' end;
  v_payload := jsonb_build_object(
    'outcome', v_outcome,
    'organizationId', p_organization_id,
    'organizationName', v_org_display_name
  );
  v_deliveries := '[]'::jsonb;
  for v_channel in select jsonb_array_elements_text(v_channels) loop
    v_deliveries := v_deliveries || jsonb_build_object(
      'role', 'ngo',
      'recipientId', v_holder,
      'address', v_email,
      'channel', v_channel,
      'emittedBy', 'notifications.emitter',
      'payload', v_payload,
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
      'payload', v_payload,
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

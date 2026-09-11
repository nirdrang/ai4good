-- The vetting aggregate: one row per organisation after the first vet, every mandated field a
-- not-null column with a populated check, and the one platform-admin definer that writes it.

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

  return jsonb_build_object(
    'organization_id', p_organization_id,
    'vetted', v_current.vetted,
    'changed', true,
    'notification_event_id', v_notification_event_id
  );
end;
$$;

revoke execute on function public.set_organization_vetting(
  uuid, uuid, text, text, text, text, text,
  text, text, text, timestamptz, integer, boolean
) from public, anon, authenticated, service_role;

grant execute on function public.set_organization_vetting(
  uuid, uuid, text, text, text, text, text,
  text, text, text, timestamptz, integer, boolean
) to service_role;

notify pgrst, 'reload schema';

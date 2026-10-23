create table public.prd_records (
  project_id uuid primary key references public.projects (id) on delete cascade,
  discovery_revision bigint not null check (discovery_revision >= 1),
  current_revision bigint not null check (current_revision >= 1),
  snapshot_sequence bigint not null check (snapshot_sequence >= 1),
  closed_revision bigint check (closed_revision is null or closed_revision >= 1),
  foreign key (project_id, discovery_revision)
    references public.brief_revisions (project_id, revision) on delete cascade
);

create table public.prd_revisions (
  project_id uuid not null references public.prd_records (project_id) on delete cascade,
  revision bigint not null check (revision >= 1),
  discovery_revision bigint not null check (discovery_revision >= 1),
  manifest jsonb not null check (jsonb_typeof(manifest) = 'object'),
  created_at timestamptz not null default clock_timestamp(),
  primary key (project_id, revision)
);

create table public.prd_sections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.prd_records (project_id) on delete cascade,
  stable_key text not null check (length(btrim(stable_key)) > 0),
  title text not null check (length(btrim(title)) > 0),
  ordinal integer not null check (ordinal >= 1),
  required boolean not null,
  dependencies text[] not null default '{}',
  state text not null check (state in ('open', 'draft', 'ready', 'confirmed', 'needs-review')),
  confirmed_version uuid,
  changed_since_confirmed text,
  unique (project_id, id),
  unique (project_id, stable_key),
  unique (project_id, ordinal)
);

create table public.prd_section_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  section_id uuid not null,
  document jsonb not null check (jsonb_typeof(document) = 'object'),
  created_at timestamptz not null default clock_timestamp(),
  foreign key (project_id, section_id)
    references public.prd_sections (project_id, id) on delete cascade
);

alter table public.prd_sections
  add constraint prd_sections_confirmed_version_fk
  foreign key (confirmed_version) references public.prd_section_versions (id) on delete set null;

create table public.prd_chats (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.prd_records (project_id) on delete cascade,
  kind text not null check (kind in ('main', 'section', 'side')),
  section_id uuid,
  question_id uuid,
  conversation_revision bigint not null default 0 check (conversation_revision >= 0),
  unique (project_id, id),
  constraint prd_chats_kind_shape check (
    (kind = 'main' and section_id is null and question_id is null)
    or (kind = 'section' and section_id is not null and question_id is null)
    or (kind = 'side' and section_id is null and question_id is not null)
  ),
  foreign key (project_id, section_id) references public.prd_sections (project_id, id)
    deferrable initially deferred
);

create unique index prd_chats_one_main_idx on public.prd_chats (project_id) where kind = 'main';
create unique index prd_chats_one_section_idx on public.prd_chats (section_id) where kind = 'section';
create unique index prd_chats_one_side_idx on public.prd_chats (project_id, question_id) where kind = 'side';

create table public.prd_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  chat_id uuid not null,
  ordinal bigint not null check (ordinal >= 1),
  actor_kind text not null check (actor_kind in ('ai', 'dev', 'ngo', 'system')),
  actor_name text not null,
  actor_id uuid references public.accounts (id) on delete set null,
  parts jsonb not null check (jsonb_typeof(parts) = 'array'),
  for_role text check (for_role is null or for_role in ('dev', 'ngo')),
  created_at timestamptz not null default clock_timestamp(),
  unique (project_id, chat_id, ordinal),
  foreign key (project_id, chat_id) references public.prd_chats (project_id, id) on delete cascade
);

create table public.prd_drafts (
  project_id uuid not null references public.prd_records (project_id) on delete cascade,
  actor_id uuid not null references public.accounts (id) on delete cascade,
  key text not null check (length(btrim(key)) > 0),
  body text not null,
  updated_at timestamptz not null default clock_timestamp(),
  primary key (project_id, actor_id, key)
);

revoke all on table public.prd_records from public, anon, authenticated, service_role;
revoke all on table public.prd_revisions from public, anon, authenticated, service_role;
revoke all on table public.prd_sections from public, anon, authenticated, service_role;
revoke all on table public.prd_section_versions from public, anon, authenticated, service_role;
revoke all on table public.prd_chats from public, anon, authenticated, service_role;
revoke all on table public.prd_messages from public, anon, authenticated, service_role;
revoke all on table public.prd_drafts from public, anon, authenticated, service_role;

alter table public.prd_records enable row level security;
alter table public.prd_revisions enable row level security;
alter table public.prd_sections enable row level security;
alter table public.prd_section_versions enable row level security;
alter table public.prd_chats enable row level security;
alter table public.prd_messages enable row level security;
alter table public.prd_drafts enable row level security;

create function public.prd_row_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'a PRD history row cannot be changed' using errcode = '42501';
end;
$$;

create trigger prd_revisions_immutable
  before update or delete on public.prd_revisions
  for each row execute function public.prd_row_immutable();

create trigger prd_section_versions_immutable
  before update or delete on public.prd_section_versions
  for each row execute function public.prd_row_immutable();

create trigger prd_messages_immutable
  before update or delete on public.prd_messages
  for each row execute function public.prd_row_immutable();

create function public.prd_record_moves_forward()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.project_id is distinct from old.project_id
     or new.discovery_revision is distinct from old.discovery_revision then
    raise exception 'a PRD record keeps its project and Discovery revision' using errcode = '42501';
  end if;
  if new.snapshot_sequence < old.snapshot_sequence
     or new.current_revision < old.current_revision then
    raise exception 'the PRD sequence and revision only move forward' using errcode = '42501';
  end if;
  if old.closed_revision is not null
     and (new.closed_revision is null or new.closed_revision < old.closed_revision) then
    raise exception 'a closed PRD revision only moves forward' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger prd_records_move_forward
  before update on public.prd_records
  for each row execute function public.prd_record_moves_forward();

create function public.prd_chat_keeps_shape()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.project_id is distinct from old.project_id
     or new.kind is distinct from old.kind
     or new.section_id is distinct from old.section_id
     or new.question_id is distinct from old.question_id
     or new.conversation_revision < old.conversation_revision then
    raise exception 'a PRD chat keeps its shape and its conversation revision only moves forward'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger prd_chats_keep_shape
  before update on public.prd_chats
  for each row execute function public.prd_chat_keeps_shape();

create function public.prd_refuse_discovery_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.prd_records where project_id = new.project_id) then
    raise exception 'Discovery is frozen once the PRD is open'
      using errcode = '42501', detail = 'discovery-frozen';
  end if;
  return new;
end;
$$;

create trigger brief_revisions_prd_frozen
  before insert on public.brief_revisions
  for each row execute function public.prd_refuse_discovery_revision();

create function public.prd_role(p_project uuid, p_account uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when exists (
      select 1
        from public.projects p
        join public.accounts a on a.id = p.assigned_volunteer_id
       where p.id = p_project
         and p.assigned_volunteer_id = p_account
         and a.account_type = 'volunteer'
         and a.lifecycle = 'active'
    ) then 'dev'
    when exists (
      select 1
        from public.projects p
        join public.org_memberships m on m.org_id = p.org_id and m.account_id = p_account
        join public.accounts a on a.id = m.account_id
       where p.id = p_project
         and a.account_type = 'ngo'
         and a.lifecycle = 'active'
    ) then 'ngo'
    else null
  end;
$$;

create function public.prd_person_name(p_account uuid, p_fallback text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select a.signer_name
        from public.acknowledgments a
       where a.account_id = p_account
         and a.kind = 'platform_tos_and_promise'
         and btrim(a.signer_name) <> ''
       order by a.acknowledged_at desc
       limit 1
    ),
    p_fallback
  );
$$;

create function public.prd_opening_sections(p_document jsonb, p_revision bigint)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_sections jsonb := '[]'::jsonb;
  v_ready jsonb := '[]'::jsonb;
  v_keys text[] := '{}';
  v_source text := 'Discovery revision ' || p_revision::text;
  v_topics jsonb := '{}'::jsonb;
  v_order jsonb;
  v_elem jsonb;
  v_section jsonb;
  v_topic jsonb;
  v_topic_key text;
  v_text text;
  v_statements jsonb;
  v_fact jsonb;
  v_file_name text;
  v_deps jsonb;
  v_raw_deps jsonb;
  v_dep text;
  v_technical boolean;
  v_required boolean;
  v_document jsonb;
begin
  if jsonb_typeof(p_document) is distinct from 'object' then
    raise exception 'the approved Discovery revision is not a document'
      using errcode = '22023', detail = 'invalid-request';
  end if;
  if jsonb_typeof(p_document->'topics') = 'object' then
    v_topics := p_document->'topics';
  end if;

  v_text := btrim(coalesce(p_document#>>'{usersToday,text}', ''));
  if v_text <> '' then
    v_sections := v_sections || jsonb_build_array(jsonb_build_object(
      'key', 'usersToday',
      'title', 'Who uses it, and what they do today',
      'required', false,
      'technical', false,
      'statements', jsonb_build_array(jsonb_build_object(
        'text', v_text,
        'sources', jsonb_build_array(v_source)
      ))
    ));
    v_keys := v_keys || 'usersToday';
  end if;

  v_text := btrim(coalesce(p_document#>>'{successMeasure,text}', ''));
  if v_text <> '' then
    v_sections := v_sections || jsonb_build_array(jsonb_build_object(
      'key', 'successMeasure',
      'title', 'How you will know it works',
      'required', false,
      'technical', false,
      'statements', jsonb_build_array(jsonb_build_object(
        'text', v_text,
        'sources', jsonb_build_array(v_source)
      ))
    ));
    v_keys := v_keys || 'successMeasure';
  end if;

  v_order := p_document->'topicOrder';
  if jsonb_typeof(v_order) = 'array' then
    for v_elem in select value from jsonb_array_elements(v_order) as value
    loop
      if jsonb_typeof(v_elem) is distinct from 'string' then
        continue;
      end if;
      v_topic_key := btrim(v_elem#>>'{}');
      if v_topic_key = '' or v_topic_key = any (v_keys) then
        continue;
      end if;
      v_topic := v_topics->v_topic_key;
      if jsonb_typeof(v_topic) is distinct from 'object' then
        continue;
      end if;
      v_text := '';
      if v_topic#>>'{state,kind}' = 'agreed' then
        v_text := btrim(coalesce(v_topic#>>'{state,answer}', ''));
      end if;
      v_statements := '[]'::jsonb;
      if v_text <> '' then
        v_statements := jsonb_build_array(jsonb_build_object(
          'text', v_text,
          'sources', jsonb_build_array(v_source)
        ));
      end if;
      v_required := true;
      if jsonb_typeof(v_topic->'required') = 'boolean' then
        v_required := (v_topic->>'required')::boolean;
      end if;
      v_sections := v_sections || jsonb_build_array(jsonb_build_object(
        'key', v_topic_key,
        'title', coalesce(nullif(btrim(coalesce(v_topic->>'title', '')), ''), v_topic_key),
        'required', v_required,
        'technical', v_topic_key = 'technical-scope',
        'statements', v_statements
      ));
      v_keys := v_keys || v_topic_key;
    end loop;
  end if;

  if not ('technical-scope' = any (v_keys)) then
    v_sections := v_sections || jsonb_build_array(jsonb_build_object(
      'key', 'technical-scope',
      'title', 'Technical scope',
      'required', true,
      'technical', true,
      'statements', '[]'::jsonb
    ));
    v_keys := v_keys || 'technical-scope';
  end if;

  for v_section in select value from jsonb_array_elements(v_sections) as value
  loop
    v_statements := coalesce(v_section->'statements', '[]'::jsonb);
    if jsonb_typeof(p_document->'fileFacts') = 'array' then
      for v_fact in select value from jsonb_array_elements(p_document->'fileFacts') as value
      loop
        if jsonb_typeof(v_fact) is distinct from 'object' then
          continue;
        end if;
        if v_fact->>'sectionId' is distinct from v_section->>'key' then
          continue;
        end if;
        v_text := btrim(coalesce(v_fact->>'text', ''));
        if v_text = '' then
          continue;
        end if;
        v_file_name := btrim(coalesce(v_fact#>>'{source,fileName}', ''));
        if v_file_name = '' then
          v_file_name := v_source;
        end if;
        v_statements := v_statements || jsonb_build_array(jsonb_build_object(
          'text', v_text,
          'sources', jsonb_build_array(v_file_name)
        ));
      end loop;
    end if;

    v_deps := '[]'::jsonb;
    v_raw_deps := p_document->'dependsOn'->(v_section->>'key');
    if jsonb_typeof(v_raw_deps) = 'array' then
      for v_elem in select value from jsonb_array_elements(v_raw_deps) as value
      loop
        if jsonb_typeof(v_elem) is distinct from 'string' then
          continue;
        end if;
        v_dep := v_elem#>>'{}';
        if v_dep = any (v_keys) and v_dep is distinct from v_section->>'key' and not (v_deps ? v_dep) then
          v_deps := v_deps || jsonb_build_array(v_dep);
        end if;
      end loop;
    end if;

    v_technical := coalesce((v_section->>'technical')::boolean, false)
      or v_section->>'key' = 'technical-scope';
    v_required := coalesce((v_section->>'required')::boolean, false);
    if v_section->>'key' = 'technical-scope' then
      v_required := true;
    end if;
    v_document := jsonb_build_object(
      'statements', v_statements,
      'decisions', '[]'::jsonb,
      'technicalScope', case
        when v_technical then jsonb_build_object('stories', '[]'::jsonb)
        else null
      end
    );
    v_ready := v_ready || jsonb_build_array(jsonb_build_object(
      'key', v_section->>'key',
      'title', v_section->>'title',
      'required', v_required,
      'dependencies', v_deps,
      'document', v_document
    ));
  end loop;

  return v_ready;
end;
$$;

create function public.prd_facts(p_actor uuid, p_project uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_record public.prd_records%rowtype;
  v_title text;
  v_org_name text;
  v_dev_id uuid;
  v_ngo_id uuid;
  v_people jsonb;
  v_sections jsonb;
  v_chats jsonb;
  v_drafts jsonb;
begin
  v_role := public.prd_role(p_project, p_actor);
  if v_role is null then
    raise exception 'this account has no role on the PRD'
      using errcode = '42501', detail = 'forbidden';
  end if;

  select * into v_record from public.prd_records where project_id = p_project;
  if not found then
    raise exception 'the PRD is not open' using errcode = '22023', detail = 'invalid-request';
  end if;

  select p.name, p.assigned_volunteer_id, o.name
    into v_title, v_dev_id, v_org_name
    from public.projects p
    join public.organizations o on o.id = p.org_id
   where p.id = p_project;
  if not found then
    raise exception 'the project does not exist' using errcode = 'P0002', detail = 'no-such-project';
  end if;

  select m.account_id
    into v_ngo_id
    from public.projects p
    join public.org_memberships m on m.org_id = p.org_id
    join public.accounts a on a.id = m.account_id
   where p.id = p_project
     and a.account_type = 'ngo'
     and a.lifecycle = 'active';

  v_people := jsonb_build_array(jsonb_build_object(
    'role', 'ai',
    'name', 'ai4good AI',
    'label', 'Drafts the PRD and helps both people'
  ));
  if v_dev_id is not null then
    v_people := v_people || jsonb_build_array(jsonb_build_object(
      'role', 'dev',
      'name', public.prd_person_name(v_dev_id, 'Developer'),
      'label', 'Developer · works on the PRD with the AI'
    ));
  end if;
  if v_ngo_id is not null then
    v_people := v_people || jsonb_build_array(jsonb_build_object(
      'role', 'ngo',
      'name', public.prd_person_name(v_ngo_id, 'NGO'),
      'label', 'NGO · ' || v_org_name || ' · answers questions'
    ));
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'key', s.stable_key,
      'title', s.title,
      'required', s.required,
      'state', s.state,
      'dependencies', to_jsonb(s.dependencies),
      'changedSinceConfirmed', s.changed_since_confirmed,
      'document', v.document
    )
    order by s.ordinal
  ), '[]'::jsonb)
    into v_sections
    from public.prd_sections s
    join public.prd_revisions rev
      on rev.project_id = s.project_id
     and rev.revision = v_record.current_revision
    join public.prd_section_versions v
      on v.id = (rev.manifest->>s.stable_key)::uuid
   where s.project_id = p_project;

  select coalesce(jsonb_agg(listed.chat_body order by listed.sort_kind, listed.sort_ordinal, listed.sort_question), '[]'::jsonb)
    into v_chats
    from (
      select
        case c.kind when 'main' then 0 when 'section' then 1 else 2 end as sort_kind,
        coalesce(s.ordinal, 0) as sort_ordinal,
        coalesce(c.question_id::text, '') as sort_question,
        jsonb_build_object(
          'key', case c.kind
            when 'main' then 'main'
            when 'section' then 'topic:' || s.stable_key
            else 'side:' || c.question_id::text
          end,
          'messages', (
            select coalesce(jsonb_agg(
              jsonb_build_object(
                'id', m.id,
                'role', case m.actor_kind
                  when 'ai' then 'assistant'
                  when 'system' then 'system'
                  else 'user'
                end,
                'metadata', jsonb_build_object(
                  'actor', m.actor_kind,
                  'name', m.actor_name,
                  'at', to_char(m.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
                ),
                'parts', m.parts
              )
              order by m.ordinal
            ), '[]'::jsonb)
              from public.prd_messages m
             where m.project_id = c.project_id
               and m.chat_id = c.id
               and (m.for_role is null or m.for_role = v_role)
          )
        ) as chat_body
        from public.prd_chats c
        left join public.prd_sections s on s.id = c.section_id
       where c.project_id = p_project
    ) listed;

  select coalesce(
    (
      select jsonb_object_agg(d.key, d.body)
        from public.prd_drafts d
       where d.project_id = p_project
         and d.actor_id = p_actor
    ),
    '{}'::jsonb
  )
    into v_drafts;

  return jsonb_build_object(
    'sequence', v_record.snapshot_sequence,
    'revision', v_record.current_revision,
    'discoveryRevision', v_record.discovery_revision,
    'closedRevision', v_record.closed_revision,
    'viewer', jsonb_build_object(
      'role', v_role,
      'name', public.prd_person_name(p_actor, case when v_role = 'dev' then 'Developer' else 'NGO' end)
    ),
    'people', v_people,
    'project', jsonb_build_object('title', v_title, 'organizationName', v_org_name),
    'sections', v_sections,
    'chats', v_chats,
    'drafts', v_drafts
  );
end;
$$;

create function public.prd_open(p_actor uuid, p_organization uuid, p_project uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_role text;
  v_exists boolean;
  v_revision bigint;
  v_document jsonb;
  v_sections jsonb;
  v_section jsonb;
  v_section_id uuid;
  v_version_id uuid;
  v_ordinal integer := 0;
  v_manifest jsonb := '{}'::jsonb;
  v_dependencies text[];
begin
  perform public.assert_account_active(p_actor);
  select org_id into v_org
    from public.projects
   where id = p_project
     for update;
  if not found then
    raise exception 'the project does not exist' using errcode = 'P0002', detail = 'no-such-project';
  end if;
  if v_org is distinct from p_organization then
    raise exception 'the project is not in that organisation' using errcode = 'P0002', detail = 'no-such-project';
  end if;

  v_role := public.prd_role(p_project, p_actor);
  if v_role is null then
    raise exception 'this account has no role on the PRD'
      using errcode = '42501', detail = 'forbidden';
  end if;

  select exists(select 1 from public.prd_records where project_id = p_project) into v_exists;
  if v_exists then
    return public.prd_facts(p_actor, p_project);
  end if;
  if v_role is distinct from 'dev' then
    raise exception 'only the developer opens the PRD'
      using errcode = '42501', detail = 'forbidden';
  end if;

  select b.revision, b.document
    into v_revision, v_document
    from public.brief_revisions b
    join public.discovery_confirmations c
      on c.project_id = b.project_id
     and c.revision = b.revision
   where b.project_id = p_project
   order by b.revision desc
   limit 1;
  if not found then
    raise exception 'the project has no approved Discovery revision'
      using errcode = '22023', detail = 'invalid-request';
  end if;

  v_sections := public.prd_opening_sections(v_document, v_revision);
  insert into public.prd_records (project_id, discovery_revision, current_revision, snapshot_sequence)
  values (p_project, v_revision, 1, 1);

  for v_section in select value from jsonb_array_elements(v_sections) as value
  loop
    v_ordinal := v_ordinal + 1;
    select coalesce(array_agg(dep), '{}'::text[])
      into v_dependencies
      from jsonb_array_elements_text(v_section->'dependencies') as dep;
    insert into public.prd_sections (
      project_id, stable_key, title, ordinal, required, dependencies, state
    ) values (
      p_project,
      v_section->>'key',
      v_section->>'title',
      v_ordinal,
      (v_section->>'required')::boolean,
      coalesce(v_dependencies, '{}'::text[]),
      case when jsonb_array_length(v_section->'document'->'statements') > 0 then 'draft' else 'open' end
    )
    returning id into v_section_id;

    insert into public.prd_section_versions (project_id, section_id, document)
    values (p_project, v_section_id, v_section->'document')
    returning id into v_version_id;

    v_manifest := v_manifest || jsonb_build_object(v_section->>'key', v_version_id);
    insert into public.prd_chats (project_id, kind, section_id)
    values (p_project, 'section', v_section_id);
  end loop;

  insert into public.prd_chats (project_id, kind) values (p_project, 'main');
  insert into public.prd_revisions (project_id, revision, discovery_revision, manifest)
  values (p_project, 1, v_revision, v_manifest);

  return public.prd_facts(p_actor, p_project);
end;
$$;

create function public.prd_snapshot(p_actor uuid, p_project uuid, p_since_sequence bigint)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_sequence bigint;
begin
  perform public.assert_account_active(p_actor);
  v_role := public.prd_role(p_project, p_actor);
  if v_role is null then
    raise exception 'this account has no role on the PRD'
      using errcode = '42501', detail = 'forbidden';
  end if;

  select snapshot_sequence into v_sequence
    from public.prd_records
   where project_id = p_project
     for share;
  if not found then
    raise exception 'the PRD is not open' using errcode = '22023', detail = 'invalid-request';
  end if;
  if p_since_sequence is not null and v_sequence <= p_since_sequence then
    return null;
  end if;
  return public.prd_facts(p_actor, p_project);
end;
$$;

create function public.prd_save_draft(p_actor uuid, p_project uuid, p_key text, p_text text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_role text;
begin
  perform public.assert_account_active(p_actor);
  v_role := public.prd_role(p_project, p_actor);
  if v_role is null then
    raise exception 'this account has no role on the PRD'
      using errcode = '42501', detail = 'forbidden';
  end if;
  if not exists (select 1 from public.prd_records where project_id = p_project) then
    raise exception 'the PRD is not open' using errcode = '22023', detail = 'invalid-request';
  end if;
  if p_key is null or btrim(p_key) = '' then
    raise exception 'a draft names its key' using errcode = '22023', detail = 'invalid-request';
  end if;
  if p_text is null then
    raise exception 'a draft carries text' using errcode = '22023', detail = 'invalid-request';
  end if;

  insert into public.prd_drafts (project_id, actor_id, key, body)
  values (p_project, p_actor, btrim(p_key), p_text)
  on conflict (project_id, actor_id, key)
  do update set body = excluded.body, updated_at = clock_timestamp();

  return public.prd_facts(p_actor, p_project);
end;
$$;

create function public.prd_append_message(
  p_project uuid,
  p_chat_key text,
  p_actor_kind text,
  p_actor_name text,
  p_parts jsonb,
  p_for_role text default null,
  p_actor_id uuid default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_sequence bigint;
  v_chat_id uuid;
  v_question uuid;
  v_ordinal bigint;
  v_message_id uuid;
begin
  perform public.assert_account_active(p_actor_id);
  select snapshot_sequence into v_sequence
    from public.prd_records
   where project_id = p_project
     for update;
  if not found then
    raise exception 'the PRD is not open' using errcode = '22023', detail = 'invalid-request';
  end if;
  if p_actor_kind not in ('ai', 'dev', 'ngo', 'system') then
    raise exception 'a message names its actor' using errcode = '22023', detail = 'invalid-request';
  end if;
  if p_actor_kind <> 'system' and btrim(coalesce(p_actor_name, '')) = '' then
    raise exception 'a message names its actor' using errcode = '22023', detail = 'invalid-request';
  end if;
  if p_parts is null or jsonb_typeof(p_parts) is distinct from 'array' then
    raise exception 'a message carries its parts' using errcode = '22023', detail = 'invalid-request';
  end if;
  if p_for_role is not null and p_for_role not in ('dev', 'ngo') then
    raise exception 'a message names who it is for' using errcode = '22023', detail = 'invalid-request';
  end if;

  if p_chat_key = 'main' then
    select id into v_chat_id
      from public.prd_chats
     where project_id = p_project and kind = 'main';
  elsif left(coalesce(p_chat_key, ''), 6) = 'topic:' then
    select c.id into v_chat_id
      from public.prd_chats c
      join public.prd_sections s on s.id = c.section_id
     where c.project_id = p_project
       and c.kind = 'section'
       and s.stable_key = substring(p_chat_key from 7);
  elsif left(coalesce(p_chat_key, ''), 5) = 'side:' then
    begin
      v_question := substring(p_chat_key from 6)::uuid;
    exception
      when invalid_text_representation then
        raise exception 'a side chat key names a question id'
          using errcode = '22023', detail = 'invalid-request';
    end;
    select id into v_chat_id
      from public.prd_chats
     where project_id = p_project
       and kind = 'side'
       and question_id = v_question;
    if v_chat_id is null then
      insert into public.prd_chats (project_id, kind, question_id)
      values (p_project, 'side', v_question)
      returning id into v_chat_id;
    end if;
  else
    raise exception 'a message names its chat' using errcode = '22023', detail = 'invalid-request';
  end if;
  if v_chat_id is null then
    raise exception 'that chat is not open' using errcode = '22023', detail = 'invalid-request';
  end if;

  select coalesce(max(ordinal), 0) + 1 into v_ordinal
    from public.prd_messages
   where chat_id = v_chat_id;
  insert into public.prd_messages (
    project_id, chat_id, ordinal, actor_kind, actor_name, actor_id, parts, for_role
  ) values (
    p_project,
    v_chat_id,
    v_ordinal,
    p_actor_kind,
    coalesce(p_actor_name, ''),
    p_actor_id,
    p_parts,
    p_for_role
  )
  returning id into v_message_id;

  update public.prd_chats
     set conversation_revision = conversation_revision + 1
   where id = v_chat_id;
  update public.prd_records
     set snapshot_sequence = snapshot_sequence + 1
   where project_id = p_project
   returning snapshot_sequence into v_sequence;

  return jsonb_build_object('id', v_message_id, 'sequence', v_sequence);
end;
$$;

revoke execute on function public.prd_row_immutable() from public, anon, authenticated, service_role;
revoke execute on function public.prd_record_moves_forward() from public, anon, authenticated, service_role;
revoke execute on function public.prd_chat_keeps_shape() from public, anon, authenticated, service_role;
revoke execute on function public.prd_refuse_discovery_revision() from public, anon, authenticated, service_role;
revoke execute on function public.prd_person_name(uuid, text) from public, anon, authenticated, service_role;
revoke execute on function public.prd_opening_sections(jsonb, bigint) from public, anon, authenticated, service_role;
revoke execute on function public.prd_facts(uuid, uuid) from public, anon, authenticated, service_role;

revoke execute on function public.prd_role(uuid, uuid) from public, anon, authenticated, service_role;
grant execute on function public.prd_role(uuid, uuid) to service_role;

revoke execute on function public.prd_open(uuid, uuid, uuid) from public, anon, authenticated, service_role;
grant execute on function public.prd_open(uuid, uuid, uuid) to service_role;

revoke execute on function public.prd_snapshot(uuid, uuid, bigint) from public, anon, authenticated, service_role;
grant execute on function public.prd_snapshot(uuid, uuid, bigint) to service_role;

revoke execute on function public.prd_save_draft(uuid, uuid, text, text) from public, anon, authenticated, service_role;
grant execute on function public.prd_save_draft(uuid, uuid, text, text) to service_role;

revoke execute on function public.prd_append_message(uuid, text, text, text, jsonb, text, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.prd_append_message(uuid, text, text, text, jsonb, text, uuid)
  to service_role;

notify pgrst, 'reload schema';

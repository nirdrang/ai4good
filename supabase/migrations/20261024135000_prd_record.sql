create table public.prd_records (
  project_id uuid primary key references public.projects (id) on delete cascade,
  discovery_revision bigint not null check (discovery_revision >= 1),
  state text not null default 'pending' check (state in ('pending', 'open', 'closed', 'diverged')),
  current_revision bigint not null check (current_revision >= 0),
  snapshot_sequence bigint not null check (snapshot_sequence >= 0),
  closed_revision bigint check (closed_revision is null or closed_revision >= 1),
  repo_name text not null,
  repo_id bigint,
  repo_url text,
  head_commit text check (head_commit is null or head_commit ~ '^[0-9a-f]{40}$'),
  synced_at timestamptz,
  constraint prd_records_revision_ready check (
    (state = 'pending' and current_revision = 0)
    or (state <> 'pending' and current_revision >= 1)
  ),
  foreign key (project_id, discovery_revision)
    references public.brief_revisions (project_id, revision) on delete cascade
);

create table public.prd_revisions (
  project_id uuid not null references public.prd_records (project_id) on delete cascade,
  revision bigint not null check (revision >= 1),
  discovery_revision bigint not null check (discovery_revision >= 1),
  manifest jsonb not null check (jsonb_typeof(manifest) = 'object'),
  commit_sha text not null check (commit_sha ~ '^[0-9a-f]{40}$'),
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
  file_path text not null,
  unique (project_id, id),
  unique (project_id, stable_key),
  unique (project_id, ordinal),
  unique (project_id, file_path)
);

create table public.prd_section_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  section_id uuid not null,
  commit_sha text not null check (commit_sha ~ '^[0-9a-f]{40}$'),
  blob_sha text check (blob_sha is null or blob_sha ~ '^[0-9a-f]{40}$'),
  author_kind text not null check (author_kind in ('open', 'ai', 'repository')),
  author_login text,
  variant text not null check (variant in ('readable', 'unreadable', 'missing')),
  document jsonb,
  raw_text text,
  parse_error text,
  created_at timestamptz not null default clock_timestamp(),
  constraint prd_section_versions_variant check (
    (variant = 'readable'
      and document is not null
      and jsonb_typeof(document) = 'object'
      and blob_sha is not null
      and raw_text is null
      and parse_error is null)
    or (variant = 'unreadable'
      and document is null
      and blob_sha is not null
      and raw_text is not null
      and parse_error is not null)
    or (variant = 'missing'
      and document is null
      and blob_sha is null
      and raw_text is null
      and parse_error is null)
  ),
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

create table public.prd_git_ops (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.prd_records (project_id) on delete cascade,
  kind text not null check (kind in ('open', 'turn', 'close-tag')),
  base_commit text check (base_commit is null or base_commit ~ '^[0-9a-f]{40}$'),
  sections jsonb,
  commit_sha text check (commit_sha is null or commit_sha ~ '^[0-9a-f]{40}$'),
  status text not null check (status in ('prepared', 'written', 'published', 'finalized', 'failed')),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);

create unique index prd_git_ops_one_unfinished_open_idx
  on public.prd_git_ops (project_id)
  where kind = 'open' and status not in ('finalized', 'failed');

create table public.prd_unknown_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.prd_records (project_id) on delete cascade,
  commit_sha text not null check (commit_sha ~ '^[0-9a-f]{40}$'),
  file_path text not null check (length(btrim(file_path)) > 0),
  blob_sha text not null check (blob_sha ~ '^[0-9a-f]{40}$'),
  reason text not null check (length(btrim(reason)) > 0),
  created_at timestamptz not null default clock_timestamp(),
  unique (project_id, commit_sha, file_path)
);

revoke all on table public.prd_records from public, anon, authenticated, service_role;
revoke all on table public.prd_revisions from public, anon, authenticated, service_role;
revoke all on table public.prd_sections from public, anon, authenticated, service_role;
revoke all on table public.prd_section_versions from public, anon, authenticated, service_role;
revoke all on table public.prd_chats from public, anon, authenticated, service_role;
revoke all on table public.prd_messages from public, anon, authenticated, service_role;
revoke all on table public.prd_drafts from public, anon, authenticated, service_role;
revoke all on table public.prd_git_ops from public, anon, authenticated, service_role;
revoke all on table public.prd_unknown_files from public, anon, authenticated, service_role;

alter table public.prd_records enable row level security;
alter table public.prd_revisions enable row level security;
alter table public.prd_sections enable row level security;
alter table public.prd_section_versions enable row level security;
alter table public.prd_chats enable row level security;
alter table public.prd_messages enable row level security;
alter table public.prd_drafts enable row level security;
alter table public.prd_git_ops enable row level security;
alter table public.prd_unknown_files enable row level security;

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
  if old.repo_id is not null and new.repo_id is distinct from old.repo_id then
    raise exception 'a PRD repository id never changes' using errcode = '42501';
  end if;
  if old.state is distinct from 'pending' and new.state = 'pending' then
    raise exception 'a PRD does not return to pending' using errcode = '42501';
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
    v_keys := v_keys || 'usersToday'::text;
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
    v_keys := v_keys || 'successMeasure'::text;
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
    v_keys := v_keys || 'technical-scope'::text;
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
      'decisions', '[]'::jsonb
    );
    if v_technical then
      v_document := v_document || jsonb_build_object('technicalScope', '{}'::jsonb);
    end if;
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

create function public.prd_file_path(p_key text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when btrim(lower(regexp_replace(coalesce(p_key, ''), '[^a-zA-Z0-9]+', '-', 'g')), '-') = '' then null
    else 'prd/' || btrim(lower(regexp_replace(coalesce(p_key, ''), '[^a-zA-Z0-9]+', '-', 'g')), '-') || '.md'
  end;
$$;

create function public.prd_repo_name(p_name text, p_project uuid)
returns text
language sql
immutable
set search_path = ''
as $$
  select
    coalesce(
      nullif(
        btrim(
          left(
            btrim(lower(regexp_replace(coalesce(p_name, ''), '[^a-zA-Z0-9]+', '-', 'g')), '-'),
            60
          ),
          '-'
        ),
        ''
      ),
      'project'
    )
    || '-'
    || left(replace(lower(p_project::text), '-', ''), 12);
$$;

create function public.prd_refuse_unready(p_state text)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_state = 'pending' then
    raise exception 'the PRD is still being set up'
      using errcode = '22023', detail = 'not-yet';
  end if;
  if p_state = 'diverged' then
    raise exception 'the repository diverged and an operator has to repair it'
      using errcode = '22023', detail = 'not-yet';
  end if;
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
  perform public.prd_refuse_unready(v_record.state);

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
      'document', case
        when v.variant = 'readable' then v.document
        else jsonb_build_object('statements', '[]'::jsonb, 'decisions', '[]'::jsonb)
      end,
      'variant', v.variant,
      'problem', case
        when v.variant = 'missing' then 'the file was removed from the repository'
        when v.variant = 'unreadable' then v.parse_error
        else null
      end
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

create function public.prd_open_publish(p_project uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'kind', 'publish',
    'op', jsonb_build_object(
      'projectId', r.project_id,
      'id', o.id,
      'repoName', r.repo_name,
      'repoId', r.repo_id,
      'baseCommit', o.base_commit,
      'commitSha', o.commit_sha,
      'status', o.status,
      'sections', o.sections
    )
  )
    from public.prd_records r
    join public.prd_git_ops o on o.project_id = r.project_id
   where r.project_id = p_project
     and o.kind = 'open'
     and o.status not in ('finalized', 'failed')
   order by o.created_at
   limit 1;
$$;

create function public.prd_commit_known(
  p_project uuid,
  p_sha text,
  p_head text,
  p_commits jsonb
)
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
  v_cursor text;
  v_parent text;
  v_guard integer := 0;
begin
  if exists (
    select 1 from public.prd_revisions where project_id = p_project and commit_sha = p_sha
  ) or exists (
    select 1 from public.prd_section_versions where project_id = p_project and commit_sha = p_sha
  ) or exists (
    select 1 from public.prd_unknown_files where project_id = p_project and commit_sha = p_sha
  ) or p_sha is not distinct from p_head then
    return true;
  end if;

  v_cursor := p_head;
  while v_cursor is not null and v_guard < 1000 loop
    v_guard := v_guard + 1;
    select lower(c->'parents'->>0) into v_parent
      from jsonb_array_elements(p_commits) c
     where lower(c->>'sha') = v_cursor
     limit 1;
    if v_parent is null or v_parent = v_cursor then
      return false;
    end if;
    if v_parent = p_sha then
      return true;
    end if;
    v_cursor := v_parent;
  end loop;
  return false;
end;
$$;

create function public.prd_open_begin(p_actor uuid, p_organization uuid, p_project uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_name text;
  v_role text;
  v_record public.prd_records%rowtype;
  v_revision bigint;
  v_document jsonb;
  v_sections jsonb;
  v_section jsonb;
  v_section_id uuid;
  v_ordinal integer := 0;
  v_dependencies text[];
  v_path text;
  v_base text;
  v_candidate text;
  v_suffix integer;
  v_publish jsonb := '[]'::jsonb;
  v_result jsonb;
begin
  perform public.assert_account_active(p_actor);
  select org_id, name into v_org, v_name
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

  select * into v_record from public.prd_records where project_id = p_project;
  if found then
    if v_record.state is distinct from 'pending' then
      return jsonb_build_object('kind', 'facts', 'facts', public.prd_facts(p_actor, p_project));
    end if;
    if v_role is distinct from 'dev' then
      raise exception 'only the developer opens the PRD'
        using errcode = '42501', detail = 'forbidden';
    end if;
    v_result := public.prd_open_publish(p_project);
    if v_result is null then
      raise exception 'the opening operation is missing'
        using errcode = 'P0002', detail = 'invalid-request';
    end if;
    return v_result;
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
  insert into public.prd_records (
    project_id, discovery_revision, state, current_revision, snapshot_sequence, repo_name
  ) values (
    p_project, v_revision, 'pending', 0, 0, public.prd_repo_name(v_name, p_project)
  );

  for v_section in select value from jsonb_array_elements(v_sections) as value
  loop
    v_ordinal := v_ordinal + 1;
    select coalesce(array_agg(dep), '{}'::text[])
      into v_dependencies
      from jsonb_array_elements_text(v_section->'dependencies') as dep;
    v_path := public.prd_file_path(v_section->>'key');
    if v_path is null then
      raise exception 'the section key has no file name'
        using errcode = '22023', detail = 'invalid-request';
    end if;
    v_base := regexp_replace(v_path, '\.md$', '');
    v_candidate := v_path;
    v_suffix := 2;
    while exists (
      select 1 from public.prd_sections
       where project_id = p_project and file_path = v_candidate
    ) loop
      v_candidate := v_base || '-' || v_suffix::text || '.md';
      v_suffix := v_suffix + 1;
    end loop;
    insert into public.prd_sections (
      project_id, stable_key, title, ordinal, required, dependencies, state, file_path
    ) values (
      p_project,
      v_section->>'key',
      v_section->>'title',
      v_ordinal,
      (v_section->>'required')::boolean,
      coalesce(v_dependencies, '{}'::text[]),
      case when jsonb_array_length(v_section->'document'->'statements') > 0 then 'draft' else 'open' end,
      v_candidate
    )
    returning id into v_section_id;
    v_publish := v_publish || jsonb_build_array(jsonb_build_object(
      'key', v_section->>'key',
      'title', v_section->>'title',
      'path', v_candidate,
      'document', v_section->'document'
    ));
    insert into public.prd_chats (project_id, kind, section_id)
    values (p_project, 'section', v_section_id);
  end loop;

  insert into public.prd_chats (project_id, kind) values (p_project, 'main');
  insert into public.prd_git_ops (project_id, kind, sections, status)
  values (p_project, 'open', v_publish, 'prepared');

  v_result := public.prd_open_publish(p_project);
  if v_result is null then
    raise exception 'the opening operation is missing'
      using errcode = 'P0002', detail = 'invalid-request';
  end if;
  return v_result;
end;
$$;

create function public.prd_git_bind_repo(p_project uuid, p_repo_id bigint, p_repo_url text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_record public.prd_records%rowtype;
begin
  if p_repo_id is null or btrim(coalesce(p_repo_url, '')) = '' then
    raise exception 'a repository binding names its id and url'
      using errcode = '22023', detail = 'invalid-request';
  end if;
  select * into v_record
    from public.prd_records
   where project_id = p_project
     for update;
  if not found then
    raise exception 'the PRD is not open' using errcode = '22023', detail = 'invalid-request';
  end if;
  if v_record.repo_id is not null then
    if v_record.repo_id = p_repo_id then
      return;
    end if;
    raise exception 'a PRD repository id never changes'
      using errcode = '22023', detail = 'invalid-request';
  end if;
  update public.prd_records
     set repo_id = p_repo_id,
         repo_url = p_repo_url
   where project_id = p_project;
end;
$$;

create function public.prd_git_op_written(p_op uuid, p_base text, p_sha text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_project uuid;
  v_record public.prd_records%rowtype;
  v_op public.prd_git_ops%rowtype;
  v_base text := lower(p_base);
  v_sha text := lower(p_sha);
begin
  if v_base is null or v_base !~ '^[0-9a-f]{40}$' or v_sha is null or v_sha !~ '^[0-9a-f]{40}$' then
    raise exception 'a commit names its sha' using errcode = '22023', detail = 'invalid-request';
  end if;
  select project_id into v_project from public.prd_git_ops where id = p_op;
  if not found then
    raise exception 'the git operation does not exist' using errcode = 'P0002', detail = 'invalid-request';
  end if;
  select * into v_record
    from public.prd_records
   where project_id = v_project
     for update;
  if not found then
    raise exception 'the PRD is not open' using errcode = '22023', detail = 'invalid-request';
  end if;
  select * into v_op from public.prd_git_ops where id = p_op for update;

  if v_op.commit_sha is not null then
    if not (
      v_op.status = 'written'
      and v_record.head_commit is distinct from v_op.base_commit
      and v_base is not distinct from v_record.head_commit
      and v_sha is distinct from v_op.commit_sha
    ) then
      return v_op.commit_sha;
    end if;
  end if;

  update public.prd_git_ops
     set commit_sha = v_sha,
         base_commit = v_base,
         status = 'written',
         updated_at = clock_timestamp()
   where id = p_op;
  if v_record.head_commit is null then
    update public.prd_records
       set head_commit = v_base
     where project_id = v_project;
  end if;
  return v_sha;
end;
$$;

create function public.prd_git_op_published(p_op uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_op public.prd_git_ops%rowtype;
  v_project uuid;
begin
  select project_id into v_project from public.prd_git_ops where id = p_op;
  if not found then
    raise exception 'the git operation does not exist' using errcode = 'P0002', detail = 'invalid-request';
  end if;
  perform 1 from public.prd_records where project_id = v_project for update;
  select * into v_op from public.prd_git_ops where id = p_op for update;
  if v_op.status in ('published', 'finalized') then
    return;
  end if;
  if v_op.status is distinct from 'written' or v_op.commit_sha is null then
    raise exception 'the opening commit is not written yet'
      using errcode = '22023', detail = 'invalid-request';
  end if;
  update public.prd_git_ops
     set status = 'published',
         updated_at = clock_timestamp()
   where id = p_op;
end;
$$;

create function public.prd_git_sync_state(p_project uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'state', r.state,
    'repoName', r.repo_name,
    'repoId', r.repo_id,
    'repoUrl', r.repo_url,
    'headCommit', r.head_commit,
    'opId', o.id,
    'baseCommit', o.base_commit,
    'commitSha', o.commit_sha,
    'status', o.status,
    'sections', o.sections
  )
    from public.prd_records r
    left join public.prd_git_ops o
      on o.project_id = r.project_id
     and o.kind = 'open'
     and o.status not in ('finalized', 'failed')
   where r.project_id = p_project;
$$;

create function public.prd_mark_diverged(p_project uuid, p_reason text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_record public.prd_records%rowtype;
begin
  select * into v_record
    from public.prd_records
   where project_id = p_project
     for update;
  if not found then
    raise exception 'the PRD is not open' using errcode = '22023', detail = 'invalid-request';
  end if;
  if v_record.state = 'diverged' then
    return;
  end if;
  if v_record.state = 'pending' or v_record.current_revision < 1 then
    raise exception 'the PRD has no revision to mark diverged'
      using errcode = '22023', detail = 'invalid-request';
  end if;
  update public.prd_records
     set state = 'diverged'
   where project_id = p_project;
  if p_reason is null then
    return;
  end if;
end;
$$;

create function public.prd_reconcile(p_project uuid, p_expected_head text, p_commits jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_record public.prd_records%rowtype;
  v_op public.prd_git_ops%rowtype;
  v_section public.prd_sections%rowtype;
  v_commit jsonb;
  v_change jsonb;
  v_added jsonb;
  v_applied integer := 0;
  v_visible boolean := false;
  v_state text;
  v_revision bigint;
  v_sequence bigint;
  v_tip text;
  v_sha text;
  v_login text;
  v_changes jsonb;
  v_manifest jsonb := '{}'::jsonb;
  v_document jsonb;
  v_seen text[] := '{}';
  v_used_removed text[] := '{}';
  v_used_added text[] := '{}';
  v_rename_section uuid[] := '{}';
  v_rename_dest text[] := '{}';
  v_dest text;
  v_path text;
  v_kind text;
  v_index integer;
  v_owned boolean;
  v_write boolean;
  v_variant text;
  v_blob text;
  v_raw text;
  v_error text;
  v_version_id uuid;
  v_old_blob text;
  v_note text;
  v_changed boolean;
  v_reason text;
  v_key text;
begin
  if p_commits is null or jsonb_typeof(p_commits) is distinct from 'array' then
    raise exception 'a reconcile lists commits' using errcode = '22023', detail = 'invalid-request';
  end if;
  if p_expected_head is not null and lower(p_expected_head) !~ '^[0-9a-f]{40}$' then
    raise exception 'a reconcile names the expected head' using errcode = '22023', detail = 'invalid-request';
  end if;

  select * into v_record
    from public.prd_records
   where project_id = p_project
     for update;
  if not found then
    raise exception 'the PRD is not open' using errcode = '22023', detail = 'invalid-request';
  end if;
  if v_record.head_commit is distinct from lower(p_expected_head) then
    return jsonb_build_object('stale', true);
  end if;

  v_state := v_record.state;
  v_revision := v_record.current_revision;
  if v_revision >= 1 then
    select manifest into v_manifest
      from public.prd_revisions
     where project_id = p_project
       and revision = v_revision;
  end if;

  for v_commit in select value from jsonb_array_elements(p_commits) as value
  loop
    if jsonb_typeof(v_commit) is distinct from 'object' then
      raise exception 'a commit is a record' using errcode = '22023', detail = 'invalid-request';
    end if;
    v_sha := lower(v_commit->>'sha');
    if v_sha is null or v_sha !~ '^[0-9a-f]{40}$' then
      raise exception 'a commit names its sha' using errcode = '22023', detail = 'invalid-request';
    end if;
    if jsonb_typeof(v_commit->'parents') is distinct from 'array' then
      raise exception 'a commit names its parents' using errcode = '22023', detail = 'invalid-request';
    end if;
    if v_commit ? 'login' and jsonb_typeof(v_commit->'login') not in ('string', 'null') then
      raise exception 'a commit names its author' using errcode = '22023', detail = 'invalid-request';
    end if;
    v_tip := v_sha;
    if v_sha = any (v_seen) or public.prd_commit_known(p_project, v_sha, v_record.head_commit, p_commits) then
      continue;
    end if;
    v_seen := v_seen || v_sha;
    v_login := nullif(v_commit->>'login', '');
    v_changes := v_commit->'changes';

    select * into v_op
      from public.prd_git_ops
     where project_id = p_project
       and kind = 'open'
       and commit_sha = v_sha
       and status in ('written', 'published');
    if found then
      if v_state is distinct from 'pending' then
        raise exception 'the opening commit does not match the record'
          using errcode = '22023', detail = 'invalid-request';
      end if;
      if jsonb_typeof(v_changes) is distinct from 'array' then
        raise exception 'a commit lists its changes' using errcode = '22023', detail = 'invalid-request';
      end if;
      v_manifest := '{}'::jsonb;
      for v_section in
        select * from public.prd_sections where project_id = p_project order by ordinal
      loop
        select value into v_change
          from jsonb_array_elements(v_changes) as value
         where value->>'path' = v_section.file_path
           and value->>'change' in ('added', 'modified')
         limit 1;
        if v_change is null then
          raise exception 'the opening commit is missing a section file'
            using errcode = '22023', detail = 'invalid-request';
        end if;
        v_blob := lower(v_change->>'blobSha');
        if v_blob is null or v_blob !~ '^[0-9a-f]{40}$' then
          raise exception 'the opening commit is missing a blob sha'
            using errcode = '22023', detail = 'invalid-request';
        end if;
        select value->'document' into v_document
          from jsonb_array_elements(coalesce(v_op.sections, '[]'::jsonb)) as value
         where value->>'key' = v_section.stable_key
         limit 1;
        if v_document is null or jsonb_typeof(v_document) is distinct from 'object' then
          raise exception 'the opening operation is missing a section document'
            using errcode = '22023', detail = 'invalid-request';
        end if;
        insert into public.prd_section_versions (
          project_id, section_id, commit_sha, blob_sha, author_kind, variant, document
        ) values (
          p_project, v_section.id, v_sha, v_blob, 'open', 'readable', v_document
        )
        returning id into v_version_id;
        v_manifest := v_manifest || jsonb_build_object(v_section.stable_key, v_version_id);
      end loop;
      insert into public.prd_revisions (
        project_id, revision, discovery_revision, manifest, commit_sha
      ) values (
        p_project, 1, v_record.discovery_revision, v_manifest, v_sha
      );
      update public.prd_git_ops
         set status = 'finalized',
             updated_at = clock_timestamp()
       where id = v_op.id;
      v_state := 'open';
      v_revision := 1;
      v_visible := true;
      v_applied := v_applied + 1;
      continue;
    end if;

    if v_state = 'pending' then
      v_applied := v_applied + 1;
      continue;
    end if;

    if jsonb_typeof(v_changes) is distinct from 'array' then
      raise exception 'a commit lists its changes' using errcode = '22023', detail = 'invalid-request';
    end if;
    v_used_removed := '{}';
    v_used_added := '{}';
    v_rename_section := '{}';
    v_rename_dest := '{}';
    v_changed := false;
    for v_section in
      select s.*
        from public.prd_sections s
        join jsonb_array_elements(v_changes) c on c->>'path' = s.file_path and c->>'change' = 'removed'
       where s.project_id = p_project
       order by s.ordinal
    loop
      v_dest := null;
      for v_added in select value from jsonb_array_elements(v_changes) as value
      loop
        if v_added->>'change' is distinct from 'added' then
          continue;
        end if;
        if v_added->'file'->>'variant' is distinct from 'readable' then
          continue;
        end if;
        if v_added->'file'->>'key' is distinct from v_section.stable_key then
          continue;
        end if;
        if v_added->>'path' = any (v_used_added) then
          continue;
        end if;
        if exists (
          select 1 from public.prd_sections other
           where other.project_id = p_project
             and other.file_path = v_added->>'path'
             and other.id is distinct from v_section.id
        ) then
          continue;
        end if;
        v_dest := v_added->>'path';
        exit;
      end loop;
      if v_dest is not null then
        v_used_removed := v_used_removed || v_section.file_path;
        v_used_added := v_used_added || v_dest;
        v_rename_section := v_rename_section || v_section.id;
        v_rename_dest := v_rename_dest || v_dest;
      end if;
    end loop;

    for v_change in select value from jsonb_array_elements(v_changes) as value
    loop
      v_path := v_change->>'path';
      v_kind := v_change->>'change';
      if v_path is null or btrim(v_path) = '' or v_kind not in ('added', 'modified', 'removed') then
        raise exception 'a change names its path' using errcode = '22023', detail = 'invalid-request';
      end if;
      if v_path = any (v_used_removed) then
        continue;
      end if;
      v_write := false;
      v_index := array_position(v_used_added, v_path);
      if v_index is not null then
        select * into v_section from public.prd_sections where id = v_rename_section[v_index];
        update public.prd_sections set file_path = v_path where id = v_section.id;
        v_section.file_path := v_path;
        v_owned := true;
      else
        select * into v_section
          from public.prd_sections
         where project_id = p_project
           and file_path = v_path;
        v_owned := found;
      end if;

      if v_index is not null or (v_owned and v_kind in ('added', 'modified') and v_change->'file'->>'variant' = 'readable' and v_change->'file'->>'key' = v_section.stable_key) then
        if jsonb_typeof(v_change->'file') is distinct from 'object' then
          raise exception 'a change carries its file' using errcode = '22023', detail = 'invalid-request';
        end if;
        v_blob := lower(v_change->>'blobSha');
        v_document := v_change->'file'->'document';
        if v_blob is null or v_blob !~ '^[0-9a-f]{40}$' or jsonb_typeof(v_document) is distinct from 'object' then
          raise exception 'a readable file names its blob and document'
            using errcode = '22023', detail = 'invalid-request';
        end if;
        v_variant := 'readable';
        v_raw := null;
        v_error := null;
        v_write := true;
      elsif v_kind = 'removed' then
        if not v_owned then
          continue;
        end if;
        v_variant := 'missing';
        v_blob := null;
        v_document := null;
        v_raw := null;
        v_error := null;
        v_write := true;
      elsif v_kind in ('added', 'modified') and v_change->'file'->>'variant' = 'unreadable' then
        if jsonb_typeof(v_change->'file') is distinct from 'object' then
          raise exception 'a change carries its file' using errcode = '22023', detail = 'invalid-request';
        end if;
        v_blob := lower(v_change->>'blobSha');
        v_raw := v_change->'file'->>'raw';
        v_error := v_change->'file'->>'error';
        if v_blob is null or v_blob !~ '^[0-9a-f]{40}$' or v_raw is null or v_error is null or btrim(v_error) = '' then
          raise exception 'an unreadable file names its blob, text, and error'
            using errcode = '22023', detail = 'invalid-request';
        end if;
        if not v_owned then
          insert into public.prd_unknown_files (project_id, commit_sha, file_path, blob_sha, reason)
          values (p_project, v_sha, v_path, v_blob, 'the file could not be read');
          continue;
        end if;
        v_variant := 'unreadable';
        v_document := null;
        v_write := true;
      elsif v_kind in ('added', 'modified') then
        if jsonb_typeof(v_change->'file') is distinct from 'object' then
          raise exception 'a change carries its file' using errcode = '22023', detail = 'invalid-request';
        end if;
        if v_change->'file'->>'variant' is distinct from 'readable' then
          raise exception 'a change names its variant' using errcode = '22023', detail = 'invalid-request';
        end if;
        v_key := v_change->'file'->>'key';
        v_blob := lower(v_change->>'blobSha');
        if v_key is null or btrim(v_key) = '' or v_blob is null or v_blob !~ '^[0-9a-f]{40}$' then
          raise exception 'a readable file names its key and blob'
            using errcode = '22023', detail = 'invalid-request';
        end if;
        if exists (
          select 1 from public.prd_sections
           where project_id = p_project and stable_key = v_key
        ) then
          v_reason := 'the file key belongs to another section';
        else
          v_reason := 'the file key is not a section';
        end if;
        insert into public.prd_unknown_files (project_id, commit_sha, file_path, blob_sha, reason)
        values (p_project, v_sha, v_path, v_blob, v_reason);
        continue;
      else
        raise exception 'a change names its path' using errcode = '22023', detail = 'invalid-request';
      end if;

      if v_write then
        insert into public.prd_section_versions (
          project_id, section_id, commit_sha, blob_sha, author_kind, author_login,
          variant, document, raw_text, parse_error
        ) values (
          p_project, v_section.id, v_sha, v_blob, 'repository', v_login,
          v_variant, v_document, v_raw, v_error
        )
        returning id into v_version_id;
        if v_section.state = 'confirmed' then
          select blob_sha into v_old_blob
            from public.prd_section_versions
           where id = nullif(v_manifest->>v_section.stable_key, '')::uuid;
          if v_variant is distinct from 'readable' or v_blob is distinct from v_old_blob then
            v_note := case
              when v_variant = 'missing' then 'the file was removed from the repository'
              when v_variant = 'unreadable' then 'the file in the repository could not be read'
              else 'the file changed in the repository'
            end;
            update public.prd_sections
               set state = 'needs-review',
                   changed_since_confirmed = v_note
             where id = v_section.id;
            v_visible := true;
          end if;
        end if;
        v_manifest := v_manifest || jsonb_build_object(v_section.stable_key, v_version_id);
        v_changed := true;
      end if;
    end loop;

    if v_changed then
      v_revision := v_revision + 1;
      insert into public.prd_revisions (
        project_id, revision, discovery_revision, manifest, commit_sha
      ) values (
        p_project, v_revision, v_record.discovery_revision, v_manifest, v_sha
      );
      v_visible := true;
    end if;
    v_applied := v_applied + 1;
  end loop;

  if v_applied = 0 then
    return jsonb_build_object(
      'stale', false,
      'applied', 0,
      'head', v_record.head_commit,
      'sequence', v_record.snapshot_sequence,
      'revision', v_record.current_revision
    );
  end if;

  update public.prd_records
     set head_commit = v_tip,
         synced_at = clock_timestamp(),
         state = v_state,
         current_revision = v_revision,
         snapshot_sequence = snapshot_sequence + case when v_visible then 1 else 0 end
   where project_id = p_project
   returning snapshot_sequence, current_revision into v_sequence, v_revision;
  return jsonb_build_object(
    'stale', false,
    'applied', v_applied,
    'head', v_tip,
    'sequence', v_sequence,
    'revision', v_revision
  );
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
  v_state text;
begin
  perform public.assert_account_active(p_actor);
  v_role := public.prd_role(p_project, p_actor);
  if v_role is null then
    raise exception 'this account has no role on the PRD'
      using errcode = '42501', detail = 'forbidden';
  end if;

  select snapshot_sequence, state into v_sequence, v_state
    from public.prd_records
   where project_id = p_project
     for share;
  if not found then
    raise exception 'the PRD is not open' using errcode = '22023', detail = 'invalid-request';
  end if;
  perform public.prd_refuse_unready(v_state);
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
  v_state text;
begin
  perform public.assert_account_active(p_actor);
  v_role := public.prd_role(p_project, p_actor);
  if v_role is null then
    raise exception 'this account has no role on the PRD'
      using errcode = '42501', detail = 'forbidden';
  end if;
  select state into v_state from public.prd_records where project_id = p_project;
  if not found then
    raise exception 'the PRD is not open' using errcode = '22023', detail = 'invalid-request';
  end if;
  perform public.prd_refuse_unready(v_state);
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
  v_state text;
  v_chat_id uuid;
  v_question uuid;
  v_ordinal bigint;
  v_message_id uuid;
begin
  perform public.assert_account_active(p_actor_id);
  select snapshot_sequence, state into v_sequence, v_state
    from public.prd_records
   where project_id = p_project
     for update;
  if not found then
    raise exception 'the PRD is not open' using errcode = '22023', detail = 'invalid-request';
  end if;
  perform public.prd_refuse_unready(v_state);
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
revoke execute on function public.prd_file_path(text) from public, anon, authenticated, service_role;
revoke execute on function public.prd_repo_name(text, uuid) from public, anon, authenticated, service_role;
revoke execute on function public.prd_refuse_unready(text) from public, anon, authenticated, service_role;
revoke execute on function public.prd_open_publish(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.prd_commit_known(uuid, text, text, jsonb) from public, anon, authenticated, service_role;
revoke execute on function public.prd_facts(uuid, uuid) from public, anon, authenticated, service_role;

revoke execute on function public.prd_role(uuid, uuid) from public, anon, authenticated, service_role;
grant execute on function public.prd_role(uuid, uuid) to service_role;

revoke execute on function public.prd_open_begin(uuid, uuid, uuid) from public, anon, authenticated, service_role;
grant execute on function public.prd_open_begin(uuid, uuid, uuid) to service_role;

revoke execute on function public.prd_git_bind_repo(uuid, bigint, text) from public, anon, authenticated, service_role;
grant execute on function public.prd_git_bind_repo(uuid, bigint, text) to service_role;

revoke execute on function public.prd_git_op_written(uuid, text, text) from public, anon, authenticated, service_role;
grant execute on function public.prd_git_op_written(uuid, text, text) to service_role;

revoke execute on function public.prd_git_op_published(uuid) from public, anon, authenticated, service_role;
grant execute on function public.prd_git_op_published(uuid) to service_role;

revoke execute on function public.prd_git_sync_state(uuid) from public, anon, authenticated, service_role;
grant execute on function public.prd_git_sync_state(uuid) to service_role;

revoke execute on function public.prd_mark_diverged(uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.prd_mark_diverged(uuid, text) to service_role;

revoke execute on function public.prd_reconcile(uuid, text, jsonb) from public, anon, authenticated, service_role;
grant execute on function public.prd_reconcile(uuid, text, jsonb) to service_role;

revoke execute on function public.prd_snapshot(uuid, uuid, bigint) from public, anon, authenticated, service_role;
grant execute on function public.prd_snapshot(uuid, uuid, bigint) to service_role;

revoke execute on function public.prd_save_draft(uuid, uuid, text, text) from public, anon, authenticated, service_role;
grant execute on function public.prd_save_draft(uuid, uuid, text, text) to service_role;

revoke execute on function public.prd_append_message(uuid, text, text, text, jsonb, text, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.prd_append_message(uuid, text, text, text, jsonb, text, uuid)
  to service_role;

notify pgrst, 'reload schema';

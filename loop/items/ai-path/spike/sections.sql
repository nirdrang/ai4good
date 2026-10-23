create table spike.sections (
  project_id text not null,
  section_id text not null,
  revision integer not null default 0,
  body text not null default '',
  state text not null default 'open' check (state in ('open', 'draft', 'ready', 'confirmed', 'needs_review')),
  depends_on text[] not null default '{}',
  confirmed_body text,
  changed_since_confirmed text,
  primary key (project_id, section_id)
);

create table spike.section_writes (
  project_id text not null,
  section_id text not null,
  revision integer not null,
  body text not null,
  sources text[] not null,
  written_by text not null,
  written_at timestamptz not null default clock_timestamp(),
  primary key (project_id, section_id, revision)
);

create function spike.write_section(p_project text, p_section text, p_expected_revision integer,
  p_body text, p_sources text[], p_change text, p_writer text) returns jsonb
language plpgsql as $$
declare
  v_current spike.sections;
begin
  select * into v_current from spike.sections where project_id = p_project and section_id = p_section for update;
  if v_current is null then raise exception 'unknown section %', p_section; end if;
  if v_current.revision <> p_expected_revision then
    return jsonb_build_object('ok', false, 'reason', 'stale', 'revision', v_current.revision, 'body', v_current.body);
  end if;
  update spike.sections set revision = revision + 1, body = p_body,
    state = case when state in ('confirmed', 'needs_review') then 'needs_review' else 'draft' end,
    changed_since_confirmed = case when state in ('confirmed', 'needs_review') then p_change else null end
  where project_id = p_project and section_id = p_section;
  insert into spike.section_writes values (p_project, p_section, p_expected_revision + 1, p_body, p_sources, p_writer);
  update spike.sections set state = 'needs_review', changed_since_confirmed = 'Depends on ' || p_section || ': ' || p_change
  where project_id = p_project and p_section = any(depends_on) and state = 'confirmed';
  return jsonb_build_object('ok', true, 'revision', p_expected_revision + 1);
end $$;

create function spike.apply_turn(p_project text, p_updates jsonb, p_writer text) returns jsonb
language plpgsql as $$
declare
  v_update jsonb;
  v_stale jsonb := '[]';
  v_current spike.sections;
  v_applied jsonb := '[]';
begin
  for v_update in select value from jsonb_array_elements(p_updates) order by value->>'section' loop
    select * into v_current from spike.sections
    where project_id = p_project and section_id = v_update->>'section' for update;
    if v_current is null or v_current.revision <> (v_update->>'base_revision')::integer then
      v_stale := v_stale || jsonb_build_object('section', v_update->>'section', 'revision', v_current.revision, 'body', v_current.body);
    end if;
  end loop;
  if jsonb_array_length(v_stale) > 0 then
    return jsonb_build_object('ok', false, 'stale', v_stale);
  end if;
  for v_update in select value from jsonb_array_elements(p_updates) order by value->>'section' loop
    v_applied := v_applied || spike.write_section(p_project, v_update->>'section', (v_update->>'base_revision')::integer,
      v_update->>'body', array(select jsonb_array_elements_text(v_update->'sources')), coalesce(v_update->>'change', ''), p_writer);
  end loop;
  return jsonb_build_object('ok', true, 'applied', v_applied);
end $$;

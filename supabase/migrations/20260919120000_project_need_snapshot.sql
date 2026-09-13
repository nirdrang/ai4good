create or replace function public.need_intake_submit(v_need public.need_intakes, p_account_id uuid)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_submitted_at timestamptz;
begin
  if v_need.stage = 'discovery_in_progress' then return false; end if;
  if btrim(coalesce(v_need.description, ''), E' \t\r\n\f' || chr(160)) = '' then
    raise exception 'project_need refuses submission of %: the problem description is missing', v_need.project_id
      using errcode = 'P0001', detail = 'missing-description';
  end if;
  v_submitted_at := clock_timestamp();
  update public.need_intakes set stage = 'discovery_in_progress', submitted_at = v_submitted_at
   where project_id = v_need.project_id;
  perform public.append_audit_event(
    'need_intake_submitted', p_account_id, null, v_need.org_id, 'need intake submitted',
    jsonb_build_object(
      'project_id', v_need.project_id, 'org_id', v_need.org_id,
      'title', (select name from public.projects where id = v_need.project_id),
      'description', v_need.description, 'urgency', v_need.urgency,
      'reference_files', v_need.reference_files, 'submitted_at', v_submitted_at
    ), v_submitted_at
  );
  return true;
end;
$$;
revoke execute on function public.need_intake_submit(public.need_intakes, uuid) from public, anon, authenticated, service_role;

create unique index audit_events_need_intake_snapshot_once on public.audit_events
  ((detail->>'project_id')) where event_kind = 'need_intake_submitted';

notify pgrst, 'reload schema';

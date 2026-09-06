-- REQ-001, D6 leaf 3: role changes reach the audit table from a trigger on org_memberships
-- (AT-001.33). The transfer definer already writes its own transfer row; this object writes the
-- org_role_changed row for every membership insert and for every update that changes the account
-- or the role.
--
-- THE ACTOR IS A TRANSACTION-LOCAL SETTING (R9). A product definer sets
-- `app.actor_account_id` to the caller before it inserts a membership; `append_audit_event`
-- then labels the row as account_type || ':' || id from public.accounts. The operator path leaves
-- the setting unset, so the actor is null and the label is `operator`. An UPDATE that changes
-- neither account nor role writes nothing. A DELETE writes `membership removed` with the old values.

create function public.org_membership_role_change_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_actor_text text;
  v_reason text;
begin
  v_actor_text := current_setting('app.actor_account_id', true);
  if v_actor_text is not null and btrim(v_actor_text) <> '' then
    v_actor := v_actor_text::uuid;
  end if;

  if tg_op = 'INSERT' then
    perform public.append_audit_event(
      'org_role_changed',
      v_actor,
      new.account_id,
      new.org_id,
      'membership granted',
      jsonb_build_object(
        'old_role', null,
        'new_role', new.role::text,
        'old_account_id', null,
        'new_account_id', new.account_id
      )
    );
    return new;
  end if;

  if tg_op = 'DELETE' then
    perform public.append_audit_event(
      'org_role_changed',
      v_actor,
      old.account_id,
      old.org_id,
      'membership removed',
      jsonb_build_object(
        'old_role', old.role::text,
        'new_role', null,
        'old_account_id', old.account_id,
        'new_account_id', null
      )
    );
    return old;
  end if;

  if new.account_id is not distinct from old.account_id
     and new.role is not distinct from old.role then
    return new;
  end if;

  if new.account_id is distinct from old.account_id then
    v_reason := 'seat repointed';
  else
    v_reason := 'role changed';
  end if;

  perform public.append_audit_event(
    'org_role_changed',
    v_actor,
    new.account_id,
    new.org_id,
    v_reason,
    jsonb_build_object(
      'old_role', old.role::text,
      'new_role', new.role::text,
      'old_account_id', old.account_id,
      'new_account_id', new.account_id
    )
  );
  return new;
end;
$$;

comment on function public.org_membership_role_change_audit() is
  'Writes one org_role_changed audit row for a membership insert, for an update that changes the account or the role, or for a delete. A missing app.actor_account_id records the operator (REQ-001, AT-001.33, R9).';

revoke execute on function public.org_membership_role_change_audit() from public;

create trigger org_memberships_role_change_audit
after insert or update or delete on public.org_memberships
for each row
execute function public.org_membership_role_change_audit();

notify pgrst, 'reload schema';

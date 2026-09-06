-- A BEFORE DELETE trigger on auth.identities keeps the identity row and Auth stays
-- healthy for the user (unlink-trigger-probe.txt). The WHEN clause sees depth 0 for a
-- direct delete, while a cascade and the function body see depth 1 or more
-- (unlink-depth-probe.txt). The refusal reaches the caller as GoTrue's 500; a product
-- surface must not offer unlink to a completed volunteer.

create function public.github_identity_is_permanent_for_volunteers()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.provider = 'github'
     and exists (
       select 1
         from public.accounts as account
        where account.id = old.user_id
          and account.account_type = 'volunteer'
     )
  then
    raise exception 'a volunteer may not unlink the GitHub identity after signup (REQ-001, AT-001.41)'
      using errcode = '42501', detail = 'github-unlink-refused';
  end if;
  return old;
end;
$$;

comment on function public.github_identity_is_permanent_for_volunteers() is
  'Refuses a direct delete of a volunteer GitHub identity (REQ-001, AT-001.41). A cascade from an admin user delete is admitted by WHEN (pg_trigger_depth() = 0).';

revoke execute on function public.github_identity_is_permanent_for_volunteers() from public;

create trigger volunteer_github_identity_is_permanent
before delete on auth.identities
for each row
when (pg_trigger_depth() = 0)
execute function public.github_identity_is_permanent_for_volunteers();

notify pgrst, 'reload schema';

-- REQ-016, the fixture producers that stand in for the real ones.
--
-- Eleven guarded taxonomy rows accompany a ledger or state transition that no requirement in this
-- tree has built yet. There is no payment definer, no key revocation definer and no completion
-- definer to call `public.emit_notification` from. This file is the stand-in: a one-row transition
-- ledger keyed by the acceptance world that fired it, and one definer that performs the transition,
-- reaches the fault point, and then calls the emitter, in that order and in one transaction. It is
-- the same shape a real producer takes, with a one-row upsert where the ledger statements will be.
--
-- IT IS IN ITS OWN FILE so that dropping it later is one new migration that names this table and
-- this function, and touches nothing in the outbox schema.
--
-- THE FAULT POINT IS AN ARGUMENT OF THE CALL. Nothing in product SQL reads a control table or a
-- session setting to decide whether to fail. The acceptance adapter that arms the fault passes
-- `p_induce_fault`, so the arming lives in the binding and the product owns only the raise. The
-- sequence value taken before the raise is the one thing the rollback cannot undo, which is what
-- lets the adapter prove the point was reached.

create table public.notification_fixture_transitions (
  scope_id  text not null,
  event     text not null references public.notification_event_types (event),
  committed boolean not null default false,
  primary key (scope_id, event)
);

comment on table public.notification_fixture_transitions is
  'The stand-in ledger for the guarded rows of REQ-016 until their real producers exist (AT-016.09).';

revoke all on table public.notification_fixture_transitions from anon, authenticated;
revoke all on table public.notification_fixture_transitions from service_role;
alter table public.notification_fixture_transitions enable row level security;

create function public.fixture_commit_transition_and_emit(
  p_scope text,
  p_write jsonb,
  p_induce_fault boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- (1) THE TRANSITION COMMITS FIRST.
  insert into public.notification_fixture_transitions (scope_id, event, committed)
  values (p_scope, p_write->'event'->>'event', true)
  on conflict (scope_id, event) do update set committed = true;

  -- (2) THE FAULT POINT, notifications.between_transition_and_event_write.
  if p_induce_fault then
    perform nextval('public.notification_fault_triggers');
    raise exception 'induced fault: crash at notifications.between_transition_and_event_write'
      using errcode = 'P0001',
            detail = 'induced-fault:notifications.between_transition_and_event_write';
  end if;

  -- (3) THE EVENT WRITE, and everything that belongs to it.
  return public.emit_notification(p_write);
end;
$$;
revoke execute on function public.fixture_commit_transition_and_emit(text, jsonb, boolean) from public;

comment on function public.fixture_commit_transition_and_emit(text, jsonb, boolean) is
  'Fixture producer: transition, fault point, emit, as one transaction (REQ-016, AT-016.09).';

notify pgrst, 'reload schema';

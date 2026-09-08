-- REQ-016 D1.L1, the notification outbox and the one emitter that writes it.
--
-- WHAT THIS FILE LANDS. The forty-eight wire names as a closed set, the event row every
-- notification becomes, the delivery row every recipient-channel pair becomes, the ops item three
-- rows raise, one sequence, and the two functions that write and update those rows. The taxonomy's
-- recipients, channels, class and copy are NOT here. They live in
-- `supabase/functions/_shared/notification-taxonomy.ts`, and the database holds only the names,
-- as a foreign key target, so an event nobody registered fails on the key rather than on a rule
-- somebody has to remember. A static oracle in the acceptance suite proves the two name lists equal.
--
-- WHY THE WRITE IS ONE FUNCTION. The whole write set for one event, the event row with its
-- recipients frozen, every delivery row, and the ops item, arrives as one jsonb document and is
-- inserted by one call. A producer's own definer performs its ledger or state transition and then
-- calls `public.emit_notification` in the same transaction, so the two commit together or roll back
-- together. Nothing in this tree commits a transition in one round trip and a notification in
-- another, and this file keeps it that way. The fixture producer that stands in for the real ones
-- while they do not exist is in its own migration file beside this one.
--
-- WHO CAN CALL WHAT. No client role holds anything on these tables, and neither does the service
-- role. The two functions are security definer with execute revoked from public and granted to
-- nobody, so only the owner and another definer running as the owner can reach them. That is the
-- privilege half of "the emitter is the sole writer". The schema half is the check on `emitted_by`
-- and the two unique constraints on deliveries. The type half is in the TypeScript core.
--
-- THE ONE EXCEPTION TO "NO CLIENT ROLE" is `notification_deliveries`, which takes the tenant
-- isolated posture. A recipient reads their own in-app rows as the caller, through the policy on
-- the rows, never through a service-role read in an edge function. Nothing reads the policy yet;
-- it belongs with the table it governs, and it lands here so the rule is encoded where a later
-- reader will find it.
--
-- `accepted_at` and `provider_receipt` make the provider's acceptance a durable fact. They are
-- written by `apply_delivery_results` in the same statement that marks a delivery sent, so a crash
-- after acceptance and before the sent mark leaves something to recover from. They are not a way
-- to skip the provider on a retry. A retry must reach the provider again, and the provider's own
-- idempotency on the key is what stops a duplicate.

/* ============================================================== the closed vocabularies ==== */

create type public.notification_state as enum ('pending', 'retrying', 'sent', 'failed');
create type public.notification_channel as enum ('email', 'inapp');
create type public.notification_role as enum ('ngo', 'volunteer', 'ex_volunteer', 'platform_admin');

/* ================================================================== the event type set ==== */

-- One row per wire name. The shape check pins the `<domain>.<name>` grammar the suite fixes.
create table public.notification_event_types (
  event text primary key,
  constraint notification_event_types_shape check (event ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$')
);

comment on table public.notification_event_types is
  'The forty-eight wire names REQ-016 registers, seeded here and immutable in v1 (AT-016.02). Recipients and channels live in the TypeScript taxonomy.';

insert into public.notification_event_types (event) values
  ('triage.approved'),
  ('triage.returned_to_scoped'),
  ('triage.declined_terminal'),
  ('vetting.outcome'),
  ('discovery.fit_declined'),
  ('discovery.fit_decline_review'),
  ('discovery.decline_overturned'),
  ('candidacy.marked'),
  ('match.created'),
  ('match.consented'),
  ('match.declined_or_expired'),
  ('open_project.unmatched_aging'),
  ('abandonment.reminder_14d'),
  ('abandonment.released'),
  ('abandonment.rematch_available'),
  ('funding.pre_deadline_reminder'),
  ('funding.deadline_expired'),
  ('payment.succeeded'),
  ('payment.failed'),
  ('fuel.threshold_20'),
  ('fuel.threshold_5'),
  ('fuel.depleted'),
  ('leftover.released'),
  ('chargeback.opened'),
  ('access.key_issued'),
  ('access.key_revoked'),
  ('gateway.watchdog_failed_closed'),
  ('prd_gate.below_threshold_gap_report'),
  ('prd_gate.passed'),
  ('backlog.live'),
  ('reconciliation.large_drift'),
  ('reconciliation.undecidable_drift'),
  ('pm_item.status_changed'),
  ('pm_item.completed'),
  ('requirement.comment'),
  ('thread.comment'),
  ('blocker.raised'),
  ('blocker.resolved'),
  ('blocker.aging_48h'),
  ('blocker.aging_7d'),
  ('pm_item.status_auto_reverted'),
  ('project.completed'),
  ('provisioning.failed'),
  ('lovable.setup_reminder'),
  ('lovable.credits_low'),
  ('lovable.credits_blocked'),
  ('lovable.setup_pending_raised'),
  ('lovable.setup_complete');

/* ========================================================================== the outbox ==== */

-- `recipients` is the resolution frozen at creation (AT-016.10). It is written once by the emitter
-- and never recomputed; a role that changes hands afterwards changes nothing here.
create table public.notification_events (
  id               uuid primary key default gen_random_uuid(),
  event            text not null references public.notification_event_types (event),
  actor_account_id uuid,
  payload          jsonb not null default '{}'::jsonb,
  recipients       jsonb not null,
  state            public.notification_state not null default 'pending',
  attempts         integer not null default 0,
  created_at       timestamptz not null default now(),
  constraint notification_events_recipients_frozen
    check (jsonb_typeof(recipients) = 'array' and jsonb_array_length(recipients) > 0)
);

comment on table public.notification_events is
  'One logical notification per committed producer event, recipients resolved at creation (REQ-016, AT-016.07, AT-016.10).';

-- Two unique constraints, on purpose. The pair is what the acceptance tests count, the key is what
-- the provider sees. If the two ever disagree the database refuses the row rather than sending
-- twice. `emitted_by` can hold one value only, so a row claiming another writer cannot exist.
create table public.notification_deliveries (
  id                   uuid primary key default gen_random_uuid(),
  event_id             uuid not null references public.notification_events (id) on delete cascade,
  event                text not null,
  role                 public.notification_role not null,
  recipient_id         uuid not null,
  recipient_address    text,
  channel              public.notification_channel not null,
  state                public.notification_state not null default 'pending',
  emitted_by           text not null,
  delivered_by_process text,
  payload              jsonb not null default '{}'::jsonb,
  subject              text not null,
  body                 text not null,
  idempotency_key      text not null,
  accepted_at          timestamptz,
  provider_receipt     jsonb,
  created_at           timestamptz not null default now(),
  constraint notification_deliveries_one_per_pair unique (event_id, recipient_id, channel),
  constraint notification_deliveries_one_per_key unique (idempotency_key),
  constraint notification_deliveries_emitter_only check (emitted_by = 'notifications.emitter'),
  constraint notification_deliveries_email_has_address check (channel <> 'email' or recipient_address is not null)
);

comment on table public.notification_deliveries is
  'One delivery per recipient-channel pair of an event, marked sent only on provider acceptance (REQ-016, AT-016.07, AT-016.11).';

create index notification_deliveries_by_recipient_idx on public.notification_deliveries (recipient_id, channel);
create index notification_deliveries_unsent_idx on public.notification_deliveries (created_at) where state <> 'sent';

create table public.notification_ops_items (
  id              uuid primary key default gen_random_uuid(),
  kind            text not null,
  linked_event_id uuid references public.notification_events (id) on delete cascade,
  detail          jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  constraint notification_ops_items_one_per_event unique (linked_event_id)
);

comment on table public.notification_ops_items is
  'Exactly one operations item per event whose taxonomy row raises one (REQ-016, AT-016.03).';

-- A sequence, not a table, because `nextval` is outside transactional control. A value taken
-- immediately before a `raise exception` survives the rollback that erases everything else the
-- function wrote, which is what lets a fault injected inside the transaction be counted afterwards.
create sequence public.notification_fault_triggers;

/* ========================================================================== the posture ==== */

revoke all on table public.notification_event_types, public.notification_events,
                    public.notification_deliveries, public.notification_ops_items
  from anon, authenticated;
revoke all on table public.notification_event_types, public.notification_events,
                    public.notification_deliveries, public.notification_ops_items
  from service_role;
revoke all on sequence public.notification_fault_triggers from anon, authenticated, service_role;

alter table public.notification_event_types enable row level security;
alter table public.notification_events enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.notification_ops_items enable row level security;

grant select on table public.notification_deliveries to authenticated;

create policy notification_deliveries_own_inapp on public.notification_deliveries
  for select to authenticated
  using (recipient_id = (select auth.uid()) and channel = 'inapp');

/* ========================================================================== the emitter ==== */

-- The write set arrives whole. `event.recipients` is the frozen resolution, `deliveries` is one
-- entry per recipient-channel pair with its rendered copy, and `opsItem` is present only for the
-- rows that raise one. The idempotency key is derived here, from the row's own identity, so the
-- worker never computes it and cannot compute it differently on a retry.
create function public.emit_notification(p_write jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_id uuid;
  v_event text := p_write->'event'->>'event';
  v_delivery jsonb;
begin
  insert into public.notification_events (event, actor_account_id, payload, recipients)
  values (
    v_event,
    nullif(p_write->'event'->>'actor', '')::uuid,
    coalesce(p_write->'event'->'payload', '{}'::jsonb),
    p_write->'event'->'recipients'
  )
  returning id into v_event_id;

  for v_delivery in select value from jsonb_array_elements(coalesce(p_write->'deliveries', '[]'::jsonb)) loop
    insert into public.notification_deliveries
      (event_id, event, role, recipient_id, recipient_address, channel, emitted_by, payload, subject, body, idempotency_key)
    values (
      v_event_id,
      v_event,
      (v_delivery->>'role')::public.notification_role,
      (v_delivery->>'recipientId')::uuid,
      v_delivery->>'address',
      (v_delivery->>'channel')::public.notification_channel,
      v_delivery->>'emittedBy',
      coalesce(v_delivery->'payload', '{}'::jsonb),
      v_delivery->>'subject',
      v_delivery->>'body',
      'ntf:' || v_event_id::text || ':' || (v_delivery->>'recipientId') || ':' || (v_delivery->>'channel')
    );
  end loop;

  if jsonb_typeof(p_write->'opsItem') = 'object' then
    insert into public.notification_ops_items (kind, linked_event_id, detail)
    values (p_write->'opsItem'->>'kind', v_event_id, coalesce(p_write->'opsItem'->'detail', '{}'::jsonb));
  end if;

  return v_event_id;
end;
$$;
revoke execute on function public.emit_notification(jsonb) from public;

comment on function public.emit_notification(jsonb) is
  'The one writer of the notification outbox. Called by a producer definer inside its own transaction (REQ-016, AT-016.01, AT-016.09).';

/* =========================================================================== the worker ==== */

-- One worker pass, applied as one unit. `accepted` marks the row sent, and the first send owns the
-- process stamp, so a delivery completed before a restart keeps the identity of the process that
-- performed it. Anything else leaves the row retrying, because the sender cannot tell a lost
-- acknowledgment from silence and must not pretend it can. Every event the pass touched counts one
-- attempt and derives its state from its own deliveries.
create function public.apply_delivery_results(p_results jsonb, p_epoch text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
  v_event_id uuid;
  v_touched uuid[] := '{}'::uuid[];
begin
  for v_result in select value from jsonb_array_elements(coalesce(p_results, '[]'::jsonb)) loop
    v_event_id := null;
    if v_result->>'outcome' = 'accepted' then
      update public.notification_deliveries
         set state = 'sent',
             delivered_by_process = coalesce(delivered_by_process, p_epoch),
             accepted_at = coalesce(accepted_at, now()),
             provider_receipt = coalesce(nullif(v_result->'receipt', 'null'::jsonb), provider_receipt)
       where id = (v_result->>'id')::uuid
       returning event_id into v_event_id;
    else
      update public.notification_deliveries
         set state = 'retrying'
       where id = (v_result->>'id')::uuid
       returning event_id into v_event_id;
    end if;
    if v_event_id is not null and not (v_event_id = any(v_touched)) then
      v_touched := v_touched || v_event_id;
    end if;
  end loop;

  update public.notification_events e
     set attempts = e.attempts + 1,
         state = case
           when exists (select 1 from public.notification_deliveries d where d.event_id = e.id and d.state <> 'sent')
             then 'retrying'::public.notification_state
           else 'sent'::public.notification_state
         end
   where e.id = any(v_touched);
end;
$$;
revoke execute on function public.apply_delivery_results(jsonb, text) from public;

comment on function public.apply_delivery_results(jsonb, text) is
  'Applies one delivery worker pass as one transaction: sent on acceptance, retrying otherwise, attempts counted per event (REQ-016, AT-016.07, AT-016.11).';

notify pgrst, 'reload schema';

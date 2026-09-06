-- The escalation-contact audit kind. PostgreSQL refuses a new enum value in the same transaction
-- that writes it, so this file adds the value and the next migration recreates the definer that
-- uses it.
alter type public.audit_event_kind add value 'org_escalation_contact_recorded';

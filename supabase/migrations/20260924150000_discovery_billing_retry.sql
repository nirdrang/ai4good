-- a new enum value cannot be used in the transaction that adds it
alter type public.discovery_billing add value 'retry';

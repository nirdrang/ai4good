import { decideEscalationContact } from '../_shared/admin-operations.ts';
import { writeRoute } from '../_shared/edge.ts';
import { organizationIdField } from '../_shared/write-routes.ts';

Deno.serve(writeRoute({
  name: 'set-escalation-contact',
  target: organizationIdField,
  decide: decideEscalationContact,
  render: (value) => ({ organizationId: (value as { organization_id?: string } | null)?.organization_id ?? null }),
}));

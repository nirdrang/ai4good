import { decideContactTransfer, fromAccountIdField, subjectAccountIdField } from '../_shared/admin-operations.ts';
import { writeRoute } from '../_shared/edge.ts';
import { organizationIdField } from '../_shared/write-routes.ts';

Deno.serve(writeRoute({
  name: 'transfer-organization-contact',
  target: organizationIdField,
  subject: subjectAccountIdField,
  from: fromAccountIdField,
  decide: decideContactTransfer,
  render: (value) => ({ organizationId: (value as { organization_id?: string } | null)?.organization_id ?? null }),
}));

import { decideOrganizationCreation } from '../_shared/accounts.ts';
import { writeRoute } from '../_shared/edge.ts';

Deno.serve(writeRoute({
  name: 'create-organization',
  decide: decideOrganizationCreation,
  render: (value) => ({ organizationId: (value as { organization_id?: string } | null)?.organization_id ?? null }),
}));

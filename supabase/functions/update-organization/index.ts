import { writeRoute } from '../_shared/edge.ts';
import { decideOrganizationRename } from '../_shared/memberships.ts';
import { organizationIdField } from '../_shared/write-routes.ts';

Deno.serve(writeRoute({
  name: 'update-organization',
  target: organizationIdField,
  decide: decideOrganizationRename,
  render: (value) => {
    const result = value as { organization_id?: string; name?: string } | null;
    return { organizationId: result?.organization_id ?? null, name: result?.name ?? null };
  },
}));

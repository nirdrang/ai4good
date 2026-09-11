import { decideOrganizationVetting, renderOrganizationVetting } from '../_shared/org-vetting.ts';
import { writeRoute } from '../_shared/edge.ts';
import { organizationIdField } from '../_shared/write-routes.ts';

Deno.serve(writeRoute({
  name: 'set-organization-vetting',
  target: organizationIdField,
  decide: decideOrganizationVetting,
  render: renderOrganizationVetting,
}));

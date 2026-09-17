import { decideOrganizationDiscovery, renderDiscoverySwitch } from '../_shared/discovery-switch.ts';
import { writeRoute } from '../_shared/edge.ts';
import { organizationIdField } from '../_shared/write-routes.ts';

Deno.serve(writeRoute({
  name: 'set-organization-discovery',
  target: organizationIdField,
  decide: decideOrganizationDiscovery,
  render: renderDiscoverySwitch,
}));

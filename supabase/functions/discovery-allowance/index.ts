import { decideDiscoveryAllowance, renderDiscoveryAllowance } from '../_shared/discovery-allowance.ts';
import { writeRoute } from '../_shared/edge.ts';
import { organizationIdField } from '../_shared/write-routes.ts';

Deno.serve(writeRoute({
  name: 'discovery-allowance',
  target: organizationIdField,
  decide: decideDiscoveryAllowance,
  render: renderDiscoveryAllowance,
}));

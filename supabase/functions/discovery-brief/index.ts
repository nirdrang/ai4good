import { decideDiscoveryBrief, prepareDiscoveryBrief, renderDiscoveryBrief } from '../_shared/discovery-brief-write.ts';
import { writeRoute } from '../_shared/edge.ts';
import { organizationIdField } from '../_shared/write-routes.ts';

Deno.serve(writeRoute({
  name: 'discovery-brief',
  target: organizationIdField,
  decide: decideDiscoveryBrief,
  prepare: prepareDiscoveryBrief,
  render: renderDiscoveryBrief,
}));

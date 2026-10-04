import { writeRoute } from '../_shared/edge.ts';
import { DISCOVERY_SKILLS } from '../_shared/discovery-skills/index.ts';
import { organizationIdField } from '../_shared/write-routes.ts';
import { decideDiscoveryScope, scopeAct, renderDiscoveryScope } from '../_shared/scope.ts';
import { discoveryModelPort } from '../_shared/discovery-model.ts';

const port = discoveryModelPort();
Deno.serve(writeRoute({
  name: 'discovery-scope', target: organizationIdField, decide: decideDiscoveryScope,
  settle: { rpc: 'discovery_scope_commit', act: scopeAct(port, DISCOVERY_SKILLS) },
  render: renderDiscoveryScope,
}));

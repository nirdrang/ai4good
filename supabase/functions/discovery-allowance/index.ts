/**
 * `discovery-allowance` — read today's remaining Discovery credits, or debit them.
 *
 * This is the contract the Discovery agent calls per turn. It creates no conversation, no agent
 * response and no funded turn. Publishing and funding are not this route.
 */

import { decideDiscoveryAllowance, renderDiscoveryAllowance } from '../_shared/discovery-allowance.ts';
import { writeRoute } from '../_shared/edge.ts';
import { organizationIdField } from '../_shared/write-routes.ts';

Deno.serve(writeRoute({
  name: 'discovery-allowance',
  target: organizationIdField,
  decide: decideDiscoveryAllowance,
  render: renderDiscoveryAllowance,
}));

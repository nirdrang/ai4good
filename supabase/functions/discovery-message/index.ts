import { writeRoute } from '../_shared/edge.ts';
import { organizationIdField } from '../_shared/write-routes.ts';
import { decideDiscoveryMessage, discoveryPrepare, discoveryAct, renderDiscoveryMessage } from '../_shared/discovery-turn.ts';
import { anthropicMessagesPort } from '../_shared/anthropic-messages.ts';

const port = anthropicMessagesPort();
Deno.serve(writeRoute({
  name: 'discovery-message', target: organizationIdField, decide: decideDiscoveryMessage,
  prepare: discoveryPrepare(port), settle: { rpc: 'discovery_turn_settle', act: discoveryAct(port) },
  render: renderDiscoveryMessage,
}));

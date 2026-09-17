import { writeRoute } from '../_shared/edge.ts';
import { DISCOVERY_SKILLS } from '../_shared/discovery-skills/index.ts';
import { organizationIdField } from '../_shared/write-routes.ts';
import { decideDiscoveryMessage, discoveryPrepare, discoveryAct, discoveryStream, renderDiscoveryMessage } from '../_shared/discovery-turn.ts';
import { anthropicMessagesPort } from '../_shared/anthropic-messages.ts';

const port = anthropicMessagesPort();
Deno.serve(writeRoute({
  name: 'discovery-message', target: organizationIdField, decide: decideDiscoveryMessage,
  prepare: discoveryPrepare(port, DISCOVERY_SKILLS),
  settle: { rpc: 'discovery_turn_settle', act: discoveryAct(port), stream: discoveryStream(port) },
  render: renderDiscoveryMessage,
}));

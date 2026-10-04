import { writeRoute } from '../_shared/edge.ts';
import { DISCOVERY_SKILLS } from '../_shared/discovery-skills/index.ts';
import { organizationIdField } from '../_shared/write-routes.ts';
import { decideDiscoveryMessage, discoveryPrepare, discoveryAct, discoveryStream, replyStreamHead, renderDiscoveryMessage } from '../_shared/discovery-turn.ts';
import { discoveryModelPort } from '../_shared/discovery-model.ts';

const port = discoveryModelPort();
Deno.serve(writeRoute({
  name: 'discovery-message', target: organizationIdField, decide: decideDiscoveryMessage,
  prepare: discoveryPrepare(port, DISCOVERY_SKILLS),
  settle: {
    rpc: 'discovery_turn_settle', act: discoveryAct(port), stream: discoveryStream(port), streamHead: replyStreamHead,
  },
  render: renderDiscoveryMessage,
}));

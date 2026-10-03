import { writeRoute } from '../_shared/edge.ts';
import { DISCOVERY_SKILLS } from '../_shared/discovery-skills/index.ts';
import { organizationIdField } from '../_shared/write-routes.ts';
import { decideDiscoveryMessage, discoveryPrepare, discoveryAct, discoveryStream, replyStreamHead, renderDiscoveryMessage } from '../_shared/discovery-turn.ts';
import { anthropicMessagesPort } from '../_shared/anthropic-messages.ts';
import { openaiCompatiblePort } from '../_shared/openai-compatible-messages.ts';

function discoveryPort() {
  const provider = Deno.env.get('DISCOVERY_PROVIDER');
  if (provider === undefined || provider === '' || provider === 'anthropic') return anthropicMessagesPort();
  if (provider === 'openai-compatible') return openaiCompatiblePort();
  throw new Error(`DISCOVERY_PROVIDER ${provider} is not anthropic or openai-compatible`);
}

const port = discoveryPort();
Deno.serve(writeRoute({
  name: 'discovery-message', target: organizationIdField, decide: decideDiscoveryMessage,
  prepare: discoveryPrepare(port, DISCOVERY_SKILLS),
  settle: {
    rpc: 'discovery_turn_settle', act: discoveryAct(port), stream: discoveryStream(port), streamHead: replyStreamHead,
  },
  render: renderDiscoveryMessage,
}));

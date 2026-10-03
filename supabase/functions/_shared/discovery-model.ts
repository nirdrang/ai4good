import { anthropicMessagesPort } from './anthropic-messages.ts';
import { openaiCompatiblePort } from './openai-compatible-messages.ts';

export function discoveryModelPort() {
  const provider = Deno.env.get('DISCOVERY_PROVIDER');
  if (provider === undefined || provider === '' || provider === 'anthropic') return anthropicMessagesPort();
  if (provider === 'openai-compatible') return openaiCompatiblePort();
  throw new Error(`DISCOVERY_PROVIDER ${provider} is not anthropic or openai-compatible`);
}

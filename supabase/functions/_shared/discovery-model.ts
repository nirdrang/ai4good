import { anthropicMessagesPort } from './anthropic-messages.ts';
import { openaiCompatiblePort } from './openai-compatible-messages.ts';
import { openaiResponsesPort } from './openai-responses-messages.ts';

export function discoveryModelPort() {
  const provider = Deno.env.get('DISCOVERY_PROVIDER');
  if (provider === undefined || provider === '' || provider === 'anthropic') return anthropicMessagesPort();
  if (provider === 'openai-compatible') return openaiCompatiblePort();
  if (provider === 'openai-responses') return openaiResponsesPort();
  throw new Error(`DISCOVERY_PROVIDER ${provider} is not anthropic, openai-compatible or openai-responses`);
}

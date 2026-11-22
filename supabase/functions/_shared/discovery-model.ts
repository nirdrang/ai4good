import { anthropicMessagesPort } from './anthropic-messages.ts';
import { requireEnv } from './env.ts';
import { openaiCompatiblePort } from './openai-compatible-messages.ts';
import { openaiResponsesPort } from './openai-responses-messages.ts';

const discoveryResponsesUrl = (): string => {
  const base = requireEnv('DISCOVERY_BASE_URL').replace(/\/$/, '');
  return base.endsWith('/responses') ? base : `${base}/responses`;
};

export function discoveryModelPort() {
  const provider = Deno.env.get('DISCOVERY_PROVIDER');
  if (provider === undefined || provider === '' || provider === 'anthropic') return anthropicMessagesPort();
  if (provider === 'openai-compatible') return openaiCompatiblePort();
  if (provider === 'openai-responses') return openaiResponsesPort({
    url: discoveryResponsesUrl, apiKey: () => requireEnv('DISCOVERY_API_KEY'), model: requireEnv('DISCOVERY_MODEL'),
    effort: Deno.env.get('DISCOVERY_REASONING_EFFORT'),
  });
  throw new Error(`DISCOVERY_PROVIDER ${provider} is not anthropic, openai-compatible or openai-responses`);
}

export function fileReadModelPort() {
  return openaiResponsesPort({ url: () => 'https://api.openai.com/v1/responses', apiKey: () => requireEnv('OPENAI_API_KEY'), model: requireEnv('FILE_READ_MODEL') });
}

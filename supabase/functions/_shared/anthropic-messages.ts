import Anthropic from 'npm:@anthropic-ai/sdk@0.115.0';
import { requireEnv } from './edge.ts';
import type { MessagesPort } from './discovery-turn.ts';

export const DISCOVERY_CLIENT_MODEL = 'claude-opus-5';
export function anthropicMessagesPort(): MessagesPort {
  return {
    create: async (request) => {
      try {
        const client = new Anthropic({ apiKey: requireEnv('ANTHROPIC_API_KEY'), maxRetries: 0, timeout: 120_000 });
        const message = await client.beta.messages.create({
          model: DISCOVERY_CLIENT_MODEL, max_tokens: request.maxTokens, system: request.system, messages: request.messages,
          output_config: { effort: request.effort }, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',
        });
        return { ok: true, text: message.content.filter((block) => block.type === 'text').map((block) => block.text).join(''),
          stopReason: message.stop_reason ?? 'end_turn', model: message.model,
          usage: { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens } };
      } catch (error) {
        return { ok: false, status: error instanceof Anthropic.APIError ? error.status ?? null : null,
          reason: error instanceof Error ? error.message : String(error) };
      }
    },
    countTokens: async (request) => {
      const client = new Anthropic({ apiKey: requireEnv('ANTHROPIC_API_KEY'), maxRetries: 0, timeout: 120_000 });
      const count = await client.messages.countTokens({ model: DISCOVERY_CLIENT_MODEL, system: request.system, messages: request.messages });
      return count.input_tokens;
    },
  };
}

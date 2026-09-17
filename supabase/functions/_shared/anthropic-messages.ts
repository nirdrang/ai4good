import Anthropic from 'npm:@anthropic-ai/sdk@0.115.0';
import { requireEnv } from './edge.ts';
import type { DiscoveryModelAnswer, DiscoveryModelRequest, MessagesPort } from './discovery-turn.ts';

export const DISCOVERY_CLIENT_MODEL = 'claude-opus-5';
const clientForCall = () => new Anthropic({ apiKey: requireEnv('ANTHROPIC_API_KEY'), maxRetries: 0, timeout: 120_000 });
const systemFor = (request: DiscoveryModelRequest) => request.system.map((block) => ({
  type: 'text' as const, text: block.text,
  ...(block.cached ? { cache_control: { type: 'ephemeral' as const } } : {}),
}));
const paramsFor = (request: DiscoveryModelRequest) => ({
  model: DISCOVERY_CLIENT_MODEL, max_tokens: request.maxTokens, system: systemFor(request),
  messages: request.messages, tools: request.tools, output_config: { effort: request.effort },
  betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const,
});
const failure = (error: unknown): DiscoveryModelAnswer => ({
  ok: false, status: error instanceof Anthropic.APIError ? error.status ?? null : null,
  reason: error instanceof Error ? error.message : String(error),
});
function answerFrom(message: Anthropic.Beta.Messages.BetaMessage): DiscoveryModelAnswer {
  const tool = message.content.find((block) => block.type === 'tool_use');
  return { ok: true, text: message.content.filter((block) => block.type === 'text').map((block) => block.text).join(''),
    stopReason: message.stop_reason ?? 'end_turn', model: message.model,
    usage: { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens },
    toolUse: tool ? { name: tool.name, input: tool.input } : null };
}
export function anthropicMessagesPort(): MessagesPort {
  return {
    create: async (request) => {
      try { return answerFrom(await clientForCall().beta.messages.create(paramsFor(request))); }
      catch (error) { return failure(error); }
    },
    countTokens: async (request) => {
      const count = await clientForCall().messages.countTokens({
        model: DISCOVERY_CLIENT_MODEL, system: systemFor(request), messages: request.messages, tools: request.tools,
      });
      return count.input_tokens;
    },
    stream: async (request, onDelta, signal) => {
      let text = '';
      let model = request.model;
      let usage = { inputTokens: 0, outputTokens: 0 };
      let sawDelta = false;
      let sawStart = false;
      const stopped = (): DiscoveryModelAnswer => ({ ok: true, text, model, stopReason: 'user_stopped',
        usage: { ...usage, outputTokens: sawDelta ? usage.outputTokens : request.maxTokens }, toolUse: null });
      const observe = (event: Anthropic.Beta.Messages.BetaRawMessageStreamEvent) => {
        if (event.type === 'message_start') {
          sawStart = true;
          model = event.message.model;
          usage = { inputTokens: event.message.usage.input_tokens, outputTokens: event.message.usage.output_tokens };
        } else if (event.type === 'message_delta') {
          sawDelta = true;
          usage = { inputTokens: event.usage.input_tokens ?? usage.inputTokens, outputTokens: event.usage.output_tokens };
        } else if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          text += event.delta.text;
          onDelta(event.delta.text);
        }
      };
      try {
        if (signal.aborted) return stopped();
        const client = clientForCall();
        const params = paramsFor(request);
        if (typeof client.beta.messages.stream === 'function') {
          try {
            const stream = client.beta.messages.stream(params, { signal });
            stream.on('streamEvent', observe);
            const message = await stream.finalMessage();
            return signal.aborted ? stopped() : answerFrom(message);
          } catch (error) {
            if (signal.aborted) return stopped();
            // Only a helper parameter rejection before generation permits a second transport call.
            const incompatible = !sawStart && error instanceof Error && /betas|fallbacks/i.test(error.message) &&
              (error instanceof TypeError || (error instanceof Anthropic.APIError && error.status === 400));
            if (!incompatible) throw error;
          }
        }
        const stream = await client.beta.messages.create({ ...params, stream: true }, { signal });
        let stopReason = 'end_turn';
        let ended = false;
        let tool: { name: string; input: unknown; index: number; json: string } | null = null;
        for await (const event of stream) {
          observe(event);
          if (event.type === 'content_block_start' && event.content_block.type === 'tool_use' && tool === null) {
            tool = { name: event.content_block.name, input: event.content_block.input, index: event.index, json: '' };
          } else if (event.type === 'content_block_delta' && event.delta.type === 'input_json_delta' && tool?.index === event.index) {
            tool.json += event.delta.partial_json;
          } else if (event.type === 'message_delta') stopReason = event.delta.stop_reason ?? stopReason;
          else if (event.type === 'message_stop') ended = true;
        }
        if (signal.aborted) return stopped();
        if (!ended) throw new Error('the provider stream ended without a final message');
        if (tool?.json) {
          try { tool.input = JSON.parse(tool.json); }
          catch { tool.input = null; }
        }
        return { ok: true, text, model, usage, stopReason, toolUse: tool ? { name: tool.name, input: tool.input } : null };
      } catch (error) {
        return signal.aborted ? stopped() : failure(error);
      }
    },
  };
}

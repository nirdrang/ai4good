import Anthropic from 'npm:@anthropic-ai/sdk@0.115.0';
import { requireEnv } from './edge.ts';
import type { DiscoveryModelAnswer, DiscoveryModelRequest, MessagesPort } from './discovery-turn.ts';

export const DISCOVERY_CLIENT_MODEL = 'claude-opus-5';
const clientForCall = () => new Anthropic({ apiKey: requireEnv('ANTHROPIC_API_KEY'), maxRetries: 0, timeout: 120_000 });
const systemFor = (request: DiscoveryModelRequest) => request.system.map((block) => ({
  type: 'text' as const, text: block.text,
  ...(block.cached ? { cache_control: { type: 'ephemeral' as const } } : {}),
}));
const servedModel = () => Deno.env.get('DISCOVERY_MODEL') ?? DISCOVERY_CLIENT_MODEL;
const paramsFor = (request: DiscoveryModelRequest) => ({
  model: servedModel(), max_tokens: request.maxTokens, system: systemFor(request),
  messages: request.messages, tools: request.tools,
  ...(request.toolChoice ? { tool_choice: request.toolChoice } : {}),
  ...(servedModel() === DISCOVERY_CLIENT_MODEL ? { output_config: { effort: request.effort } } : {}),
  betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const,
});
const failure = (error: unknown): DiscoveryModelAnswer => ({
  ok: false, status: error instanceof Anthropic.APIError ? error.status ?? null : null,
  reason: error instanceof Error ? error.message : String(error),
});
type UsageFields = {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
};
function foldedInputTokens(usage: UsageFields, fallback = 0): number {
  if (usage.input_tokens == null && usage.cache_creation_input_tokens == null && usage.cache_read_input_tokens == null) {
    return fallback;
  }
  return (usage.input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0);
}
function answerFrom(message: Anthropic.Beta.Messages.BetaMessage): DiscoveryModelAnswer {
  const tool = message.content.find((block) => block.type === 'tool_use');
  return { ok: true, text: message.content.filter((block) => block.type === 'text').map((block) => block.text).join(''),
    stopReason: message.stop_reason ?? 'end_turn', model: message.model,
    usage: { inputTokens: foldedInputTokens(message.usage), outputTokens: message.usage.output_tokens },
    toolUse: tool ? { name: tool.name, input: tool.input } : null };
}
export function anthropicMessagesPort(): MessagesPort {
  return {
    model: servedModel(),
    create: async (request) => {
      try { return answerFrom(await clientForCall().beta.messages.create(paramsFor(request))); }
      catch (error) { return failure(error); }
    },
    countTokens: async (request) => {
      const count = await clientForCall().messages.countTokens({
        model: servedModel(), system: systemFor(request), messages: request.messages, tools: request.tools,
        ...(request.toolChoice ? { tool_choice: request.toolChoice } : {}),
      });
      return count.input_tokens;
    },
    stream: async (request, onDelta, signal) => {
      let text = '';
      let model = request.model;
      let inputTokens = 0;
      let sawStart = false;
      const cancelledBeforeAnswer = (): DiscoveryModelAnswer => ({
        ok: false, status: 499, reason: 'the client cancelled before the provider answered',
      });
      const countedOutput = async (client: Anthropic): Promise<number | null> => {
        try {
          const count = await client.messages.countTokens({
            model, messages: [{ role: 'assistant', content: text }],
          });
          return Number.isSafeInteger(count.input_tokens) && count.input_tokens >= 0 ? count.input_tokens : null;
        } catch {
          return null;
        }
      };
      const stopped = async (client: Anthropic): Promise<DiscoveryModelAnswer> => ({
        ok: true, text, model, stopReason: 'user_stopped',
        usage: { inputTokens, outputTokens: await countedOutput(client) ?? request.maxTokens }, toolUse: null,
      });
      const observe = (event: Anthropic.Beta.Messages.BetaRawMessageStreamEvent) => {
        if (event.type === 'message_start') {
          sawStart = true;
          model = event.message.model;
          inputTokens = foldedInputTokens(event.message.usage);
        } else if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          text += event.delta.text;
          onDelta(event.delta.text);
        }
      };
      try {
        if (signal.aborted) return cancelledBeforeAnswer();
        const client = clientForCall();
        const stream = client.beta.messages.stream(paramsFor(request), { signal });
        stream.on('streamEvent', observe);
        const message = await stream.finalMessage();
        return signal.aborted ? (sawStart ? await stopped(client) : cancelledBeforeAnswer()) : answerFrom(message);
      } catch (error) {
        return signal.aborted ? (sawStart ? await stopped(clientForCall()) : cancelledBeforeAnswer()) : failure(error);
      }
    },
  };
}

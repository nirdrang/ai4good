import { requireEnv } from './edge.ts';
import { conversationId, responsesBody } from './openai-responses-request.ts';
import { JsonTextFieldDecoder } from './json-text-decoder.ts';
import type { DiscoveryModelAnswer, DiscoveryModelRequest, MessagesPort } from './discovery-turn.ts';

const responsesUrl = (): string => {
  const base = requireEnv('DISCOVERY_BASE_URL').replace(/\/$/, '');
  return base.endsWith('/responses') ? base : `${base}/responses`;
};

const servedModel = (): string => requireEnv('DISCOVERY_MODEL');

async function post(request: DiscoveryModelRequest, stream: boolean, signal?: AbortSignal): Promise<Response> {
  return fetch(responsesUrl(), {
    method: 'POST',
    headers: {
      authorization: `Bearer ${requireEnv('DISCOVERY_API_KEY')}`,
      'content-type': 'application/json',
      'user-agent': 'ai4good-discovery/1.0',
      'x-opencode-session': await conversationId(request),
    },
    body: JSON.stringify(responsesBody(request, stream, servedModel(), Deno.env.get('DISCOVERY_REASONING_EFFORT') || request.effort)),
    signal: signal ?? AbortSignal.timeout(120_000),
  });
}

type ResponseItem = { type?: unknown; name?: unknown; arguments?: unknown };
type ResponseBody = { model?: unknown; status?: unknown; usage?: { input_tokens?: unknown; output_tokens?: unknown }; output?: ResponseItem[] };

const tokens = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

function toolUse(item: ResponseItem | undefined): { name: string; input: unknown } | null {
  if (item === undefined || typeof item.arguments !== 'string' || item.arguments.trim() === '') return null;
  try {
    return { name: typeof item.name === 'string' ? item.name : 'reply', input: JSON.parse(item.arguments) };
  } catch {
    return null;
  }
}

function answerFrom(body: ResponseBody, fallbackModel: string): DiscoveryModelAnswer {
  return {
    ok: true,
    text: '',
    stopReason: body.status === 'incomplete' ? 'max_tokens' : 'stop',
    model: typeof body.model === 'string' ? body.model : fallbackModel,
    usage: { inputTokens: tokens(body.usage?.input_tokens), outputTokens: tokens(body.usage?.output_tokens) },
    toolUse: toolUse(body.output?.find((item) => item.type === 'function_call')),
  };
}

export function openaiResponsesPort(): MessagesPort {
  return {
    model: servedModel(),
    create: async (request) => {
      try {
        const response = await post(request, false);
        if (!response.ok) return { ok: false, status: response.status, reason: `the provider answered ${response.status}` };
        return answerFrom(await response.json() as ResponseBody, request.model);
      } catch (error) {
        return { ok: false, status: null, reason: error instanceof Error ? error.message : String(error) };
      }
    },
    stream: async (request, onDelta, signal) => {
      const decoder = new JsonTextFieldDecoder('text');
      let completed: ResponseBody | null = null;
      let sawChunk = false;
      const failed = (status: number | null, reason: string): DiscoveryModelAnswer => ({ ok: false, status, reason });
      try {
        if (signal.aborted) return failed(499, 'the client cancelled before the provider answered');
        const response = await post(request, true, signal);
        if (!response.ok || response.body === null) return failed(response.status, `the provider answered ${response.status}`);
        const reader = response.body.getReader();
        const textDecoder = new TextDecoder();
        let buffer = '';
        for (;;) {
          const step = await reader.read();
          if (step.done) break;
          sawChunk = true;
          buffer += textDecoder.decode(step.value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const event = JSON.parse(trimmed.slice(5).trim()) as { type?: unknown; delta?: unknown; response?: ResponseBody };
            if (event.type === 'response.function_call_arguments.delta' && typeof event.delta === 'string') {
              const decoded = decoder.push(event.delta);
              if (decoded.length > 0) onDelta(decoded);
            }
            if ((event.type === 'response.completed' || event.type === 'response.incomplete') && event.response) completed = event.response;
          }
        }
        if (signal.aborted) return failed(499, sawChunk ? 'the client cancelled the reply' : 'the client cancelled before the provider answered');
        if (completed === null) return failed(null, 'the provider stream ended without a completed response');
        return answerFrom(completed, request.model);
      } catch (error) {
        if (signal.aborted) return failed(499, sawChunk ? 'the client cancelled the reply' : 'the client cancelled before the provider answered');
        return failed(null, error instanceof Error ? error.message : String(error));
      }
    },
  };
}

import { requireEnv } from './edge.ts';
import { JsonTextFieldDecoder } from './json-text-decoder.ts';
import type { DiscoveryModelAnswer, DiscoveryModelRequest, MessagesPort } from './discovery-turn.ts';

const completionsUrl = (): string => {
  const base = requireEnv('DISCOVERY_BASE_URL').replace(/\/$/, '');
  return base.endsWith('/chat/completions') ? base : `${base}/chat/completions`;
};

const servedModel = (): string => requireEnv('DISCOVERY_MODEL');

function requestBody(request: DiscoveryModelRequest, stream: boolean): Record<string, unknown> {
  return {
    model: servedModel(),
    messages: [
      { role: 'system', content: request.system.map((block) => block.text).join('\n\n') },
      ...request.messages.map((message, index) => index === request.messages.length - 1 && request.images?.length
        ? { role: message.role, content: [
            { type: 'text', text: message.content },
            ...request.images.map((image) => ({ type: 'image_url', image_url: { url: `data:${image.mediaType};base64,${image.data}` } })),
          ] }
        : message),
    ],
    max_tokens: request.maxTokens,
    tools: request.tools.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.input_schema,
      },
    })),
    ...(request.toolChoice ? { tool_choice: { type: 'function', function: { name: request.toolChoice.name } } } : {}),
    reasoning_effort: Deno.env.get('DISCOVERY_REASONING_EFFORT') || request.effort,
    ...(stream ? { stream: true, stream_options: { include_usage: true } } : {}),
  };
}

async function post(request: DiscoveryModelRequest, stream: boolean, signal?: AbortSignal): Promise<Response> {
  return fetch(completionsUrl(), {
    method: 'POST',
    headers: {
      authorization: `Bearer ${requireEnv('DISCOVERY_API_KEY')}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(requestBody(request, stream)),
    signal: signal ?? AbortSignal.timeout(120_000),
  });
}

function usageOf(value: unknown, fallbackOutput: number): { inputTokens: number; outputTokens: number } {
  const usage = value !== null && typeof value === 'object' ? value as { prompt_tokens?: unknown; completion_tokens?: unknown } : {};
  const inputTokens = typeof usage.prompt_tokens === 'number' && Number.isFinite(usage.prompt_tokens) ? usage.prompt_tokens : 0;
  const outputTokens = typeof usage.completion_tokens === 'number' && Number.isFinite(usage.completion_tokens) ? usage.completion_tokens : fallbackOutput;
  return { inputTokens, outputTokens };
}

function toolFromArguments(name: string, raw: unknown): { name: string; input: unknown } | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  try {
    return { name, input: JSON.parse(raw) };
  } catch {
    return null;
  }
}

function answerFromPayload(payload: unknown, fallbackModel: string): DiscoveryModelAnswer {
  if (payload === null || typeof payload !== 'object') return { ok: false, status: null, reason: 'the provider returned no message' };
  const body = payload as {
    model?: unknown;
    usage?: unknown;
    choices?: { finish_reason?: unknown; message?: { tool_calls?: { function?: { name?: unknown; arguments?: unknown } }[] } }[];
  };
  const choice = body.choices?.[0];
  const call = choice?.message?.tool_calls?.[0];
  const name = typeof call?.function?.name === 'string' ? call.function.name : 'reply';
  return {
    ok: true,
    text: '',
    stopReason: typeof choice?.finish_reason === 'string' ? choice.finish_reason : 'stop',
    model: typeof body.model === 'string' ? body.model : fallbackModel,
    usage: usageOf(body.usage, 0),
    toolUse: toolFromArguments(name, call?.function?.arguments),
  };
}

export function openaiCompatiblePort(): MessagesPort {
  return {
    model: servedModel(),
    create: async (request) => {
      try {
        const response = await post(request, false);
        const text = await response.text();
        if (!response.ok) return { ok: false, status: response.status, reason: `the provider answered ${response.status}` };
        return answerFromPayload(JSON.parse(text), request.model);
      } catch (error) {
        return { ok: false, status: null, reason: error instanceof Error ? error.message : String(error) };
      }
    },
    stream: async (request, onDelta, signal) => {
      const decoder = new JsonTextFieldDecoder('text');
      let argumentsText = '';
      let toolName = 'reply';
      let model = request.model;
      let usage: unknown = null;
      let sawChunk = false;
      const failed = (status: number | null, reason: string): DiscoveryModelAnswer => ({ ok: false, status, reason });
      try {
        if (signal.aborted) return failed(499, 'the client cancelled before the provider answered');
        const response = await post(request, true, signal);
        if (!response.ok || response.body === null) {
          return failed(response.status, `the provider answered ${response.status}`);
        }
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
            const data = trimmed.slice(5).trim();
            if (data === '' || data === '[DONE]') continue;
            const event = JSON.parse(data) as {
              model?: unknown;
              usage?: unknown;
              choices?: { delta?: { tool_calls?: { function?: { name?: unknown; arguments?: unknown } }[] } }[];
            };
            if (typeof event.model === 'string') model = event.model;
            if (event.usage) usage = event.usage;
            const call = event.choices?.[0]?.delta?.tool_calls?.[0];
            if (typeof call?.function?.name === 'string' && call.function.name.length > 0) toolName = call.function.name;
            if (typeof call?.function?.arguments === 'string' && (toolName === 'reply' || request.toolChoice?.name === 'reply')) {
              argumentsText += call.function.arguments;
              const decoded = decoder.push(call.function.arguments);
              if (decoded.length > 0) onDelta(decoded);
            }
          }
        }
        if (signal.aborted) {
          return sawChunk
            ? { ok: false, status: 499, reason: 'the client cancelled the reply' }
            : failed(499, 'the client cancelled before the provider answered');
        }
        return {
          ok: true, text: '', stopReason: 'stop', model, usage: usageOf(usage, 0),
          toolUse: toolFromArguments(toolName, argumentsText),
        };
      } catch (error) {
        if (signal.aborted) return failed(499, sawChunk ? 'the client cancelled the reply' : 'the client cancelled before the provider answered');
        return failed(null, error instanceof Error ? error.message : String(error));
      }
    },
  };
}

import { afterEach, expect, it, vi } from 'vitest';
import { requestBody } from '../../../supabase/functions/_shared/openai-compatible-request.ts';
import { openaiCompatiblePort } from '../../../supabase/functions/_shared/openai-compatible-messages.ts';
import { replyTool } from '../../../supabase/functions/_shared/discovery-reply.ts';
import type { DiscoveryModelRequest } from '../../../supabase/functions/_shared/discovery-turn.ts';

it('preserves the strict reply schema and asks for the reply tool in the system message', () => {
  const tool = replyTool(['priority', 'booking']);
  const body = requestBody({ model: 'real-model', maxTokens: 4096, effort: 'low', system: [], messages: [],
    tools: [tool], toolChoice: { type: 'tool', name: 'reply' } }, true, 'real-model', 'low');
  expect(body.tools).toEqual([{ type: 'function', function: { name: 'reply', description: tool.description, parameters: tool.input_schema, strict: true } }]);
  expect(body.tool_choice).toBe('auto');
  expect(body.messages).toEqual([{ role: 'system', content: '\n\nAnswer with exactly one call to the reply tool and nothing else.' }]);
  expect(body).toMatchObject({ stream: true, stream_options: { include_usage: true } });
});

const ENV: Record<string, string> = { DISCOVERY_BASE_URL: 'https://provider.test/v1', DISCOVERY_MODEL: 'real-model', DISCOVERY_API_KEY: 'test-key' };
const REPLY = { text: 'Noted, name and phone only.', questions: [], agreed: [], openQuestions: [] };
const USAGE = { prompt_tokens: 2000, completion_tokens: 300 };
const REQUEST: DiscoveryModelRequest = {
  model: 'real-model', maxTokens: 4096, effort: 'low', system: [{ text: 'Call the reply tool.', cached: true }],
  messages: [{ role: 'user', content: 'We keep each volunteer name and phone number.' }],
  tools: [replyTool(['booking'])], toolChoice: { type: 'tool', name: 'reply' },
};

const plainText = { finish_reason: 'stop', message: { role: 'assistant', content: 'Noted, name and phone only. Next, how booking should work.' } };
const toolCall = { finish_reason: 'tool_calls', message: { role: 'assistant', content: '',
  tool_calls: [{ index: 0, type: 'function', function: { name: 'reply', arguments: JSON.stringify(REPLY) } }] } };

function completion(choice: unknown): Response {
  return new Response(JSON.stringify({ model: 'real-model', usage: USAGE, choices: [choice] }), { status: 200 });
}

function completionStream(choice: typeof plainText | typeof toolCall): Response {
  const chunks = [
    { choices: [{ index: 0, delta: { role: 'assistant', reasoning_content: 'The NGO answered the data question.' } }] },
    { choices: [{ index: 0, delta: 'tool_calls' in choice.message
      ? { tool_calls: choice.message.tool_calls }
      : { content: choice.message.content } }] },
    { choices: [{ index: 0, finish_reason: choice.finish_reason, delta: {} }] },
    { model: 'real-model', choices: [], usage: USAGE },
  ];
  return new Response(`${chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join('')}data: [DONE]\n\n`, { status: 200 });
}

function provider(...responses: (() => Response)[]) {
  const fetch = vi.fn(async () => responses.shift()!());
  vi.stubGlobal('Deno', { env: { get: (name: string) => ENV[name] } });
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

afterEach(() => { vi.unstubAllGlobals(); });

it('asks once more when the model answers in plain text with no reply tool call', async () => {
  const fetch = provider(() => completion(plainText), () => completion(toolCall));
  const answer = await openaiCompatiblePort().create(REQUEST);
  expect(answer).toMatchObject({ ok: true, toolUse: { name: 'reply', input: REPLY }, usage: { inputTokens: 4000, outputTokens: 600 } });
  expect(fetch).toHaveBeenCalledTimes(2);
});

it('asks once more on a streamed plain-text answer and streams only the reply tool text', async () => {
  const fetch = provider(() => completionStream(plainText), () => completionStream(toolCall));
  const deltas: string[] = [];
  const answer = await openaiCompatiblePort().stream(REQUEST, (delta) => deltas.push(delta), new AbortController().signal);
  expect(answer).toMatchObject({ ok: true, toolUse: { name: 'reply', input: REPLY }, usage: { inputTokens: 4000, outputTokens: 600 } });
  expect(deltas.join('')).toBe(REPLY.text);
  expect(fetch).toHaveBeenCalledTimes(2);
});

it('makes one call when the first answer calls the reply tool', async () => {
  const fetch = provider(() => completion(toolCall));
  expect(await openaiCompatiblePort().create(REQUEST)).toMatchObject({ ok: true, toolUse: { name: 'reply', input: REPLY } });
  expect(fetch).toHaveBeenCalledTimes(1);
});

it('stops after the one retry when the model answers in plain text twice', async () => {
  const fetch = provider(() => completion(plainText), () => completion(plainText), () => completion(toolCall));
  expect(await openaiCompatiblePort().create(REQUEST)).toMatchObject({ ok: true, toolUse: null });
  expect(fetch).toHaveBeenCalledTimes(2);
});
